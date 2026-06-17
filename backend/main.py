from datetime import datetime
from typing import Union
import json
from database import init_db, get_connection
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import math

def calculate_distance(desc1, desc2):
    return math.sqrt(
        sum((a - b) ** 2 for a, b in zip(desc1, desc2))
    )


def get_best_distance(stored_descriptors, incoming_descriptor):
    best_distance = float("inf")

    for stored in stored_descriptors:
        if not stored or len(stored) != len(incoming_descriptor):
            continue

        distance = calculate_distance(stored, incoming_descriptor)
        if distance < best_distance:
            best_distance = distance

    return best_distance

app = FastAPI()

init_db()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"]
)

class FaceUploadRequest(BaseModel):
    email: str
    first_name: Union[str, None] = None
    last_name: Union[str, None] = None
    descriptor: Union[list[float], list[list[float]]]
    created_at: Union[str, None] = None


class RemoveUserRequest(BaseModel):
    email: str


@app.get("/", response_model=dict)
def read_root():
    return {"message": "Backend Running"}


@app.post("/upload-face", response_model=dict)
def upload_face(request: FaceUploadRequest):
    descriptors = (
        request.descriptor
        if request.descriptor and isinstance(request.descriptor[0], list)
        else [request.descriptor]
    )

    descriptor_length = len(descriptors)
    profile_descriptor = descriptors[0] if descriptors else []
    created_at = request.created_at or datetime.utcnow().isoformat()

    conn = get_connection()
    cursor = conn.execute(
        "SELECT created_at, first_name, last_name FROM users WHERE email = ?",
        (request.email,)
    )
    row = cursor.fetchone()
    if row:
        if row[0]:
            created_at = row[0]
        if not request.first_name and row[1]:
            request.first_name = row[1]
        if not request.last_name and row[2]:
            request.last_name = row[2]

    print(f"Received {descriptor_length} descriptor samples")
    print(f"Stored user: {request.email}")

    descriptor_json = json.dumps(profile_descriptor)
    descriptors_json = json.dumps(descriptors)
    conn.execute(
        "INSERT OR REPLACE INTO users (email, descriptor, descriptors, created_at, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)",
        (
            request.email,
            descriptor_json,
            descriptors_json,
            created_at,
            request.first_name,
            request.last_name,
        ),
    )
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": "Face descriptors stored",
        "descriptorLength": descriptor_length,
        "created_at": created_at,
    }


class LoginRequest(BaseModel):
    email: str
    descriptor: list[float]


@app.post("/login", response_model=dict)
def login(request: LoginRequest):
    conn = get_connection()
    cursor = conn.execute(
        "SELECT descriptors, first_name, last_name FROM users WHERE email = ?",
        (request.email,)
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {
            "success": False,
            "message": "User not found",
            "bestDistance": None,
        }

    stored_descriptors = json.loads(row[0]) if row[0] else []
    if not isinstance(stored_descriptors, list):
        stored_descriptors = [stored_descriptors]

    best_distance = get_best_distance(stored_descriptors, request.descriptor)

    print(f"Best distance: {best_distance}")

    THRESHOLD = 0.6
    if best_distance < THRESHOLD:
        return {
            "success": True,
            "message": "Login successful",
            "bestDistance": round(best_distance, 4),
            "first_name": row[1] or "",
            "last_name": row[2] or "",
        }

    return {
        "success": False,
        "message": "Face verification failed",
        "bestDistance": round(best_distance, 4),
    }


@app.get("/users", response_model=dict)
def get_users():
    """Return all registered users stored in SQLite."""
    conn = get_connection()
    cursor = conn.execute("SELECT email, descriptor, descriptors, created_at, first_name, last_name FROM users")
    rows = cursor.fetchall()
    conn.close()

    def parse_descriptors(value):
        if not value:
            return []
        result = json.loads(value)
        return result if isinstance(result, list) else [result]

    return {
        email: {
            "descriptor": json.loads(descriptor_json),
            "descriptors": parse_descriptors(descriptors_json),
            "created_at": created_at,
            "first_name": first_name,
            "last_name": last_name,
            "sample_count": len(parse_descriptors(descriptors_json)),
        }
        for email, descriptor_json, descriptors_json, created_at, first_name, last_name in rows
    }


@app.get("/user", response_model=dict)
def get_user(email: str):
    conn = get_connection()
    cursor = conn.execute(
        "SELECT email, descriptors, created_at, first_name, last_name FROM users WHERE email = ?",
        (email,)
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    def parse_descriptors(value):
        if not value:
            return []
        result = json.loads(value)
        return result if isinstance(result, list) else [result]

    email, descriptors_json, created_at, first_name, last_name = row
    descriptors = parse_descriptors(descriptors_json)

    return {
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "created_at": created_at,
        "sample_count": len(descriptors),
        "status": "Registered",
    }


@app.delete("/user", response_model=dict)
def delete_user(email: str):
    conn = get_connection()
    cursor = conn.execute(
        "SELECT email FROM users WHERE email = ?",
        (email,)
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    conn.execute("DELETE FROM users WHERE email = ?", (email,))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": "Registration deleted",
    }

