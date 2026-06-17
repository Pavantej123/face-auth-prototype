from datetime import datetime
from typing import Union
import json
from database import init_db, get_connection
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import math

def calculate_distance(desc1, desc2):
    if not desc1 or not desc2 or len(desc1) != len(desc2):
        return float("inf")

    return math.sqrt(sum((a - b) ** 2 for a, b in zip(desc1, desc2)))


def normalize_descriptor(descriptor):
    norm = math.sqrt(sum(x * x for x in descriptor))
    if norm == 0:
        return descriptor
    return [x / norm for x in descriptor]


def get_best_distance(stored_descriptors, incoming_descriptor):
    incoming_descriptor = normalize_descriptor(incoming_descriptor)
    best_distance = float("inf")

    for stored in stored_descriptors:
        if not stored or len(stored) != len(incoming_descriptor):
            continue

        stored_normalized = normalize_descriptor(stored)
        distance = calculate_distance(stored_normalized, incoming_descriptor)
        if distance < best_distance:
            best_distance = distance

    return best_distance


def get_average_descriptor(stored_descriptors):
    if not stored_descriptors:
        return []

    length = len(stored_descriptors[0])
    if any(len(descriptor) != length for descriptor in stored_descriptors):
        return []

    average = [0.0] * length
    for descriptor in stored_descriptors:
        for i, value in enumerate(descriptor):
            average[i] += value

    return [value / len(stored_descriptors) for value in average]

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
    profile_descriptor = get_average_descriptor(descriptors)
    if not profile_descriptor and descriptors:
        profile_descriptor = descriptors[0]

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

    all_cursor = conn.execute("SELECT email, descriptors FROM users")
    all_rows = all_cursor.fetchall()
    conn.close()

    if not row:
        return {
            "success": False,
            "message": "User not found",
            "bestDistance": None,
            "bestMatchEmail": None,
            "bestMatchDistance": None,
        }

    stored_descriptors = json.loads(row[0]) if row[0] else []
    if not isinstance(stored_descriptors, list):
        stored_descriptors = [stored_descriptors]

    if len(stored_descriptors) < 3:
        return {
            "success": False,
            "message": "Insufficient registration samples for reliable login.",
            "bestDistance": None,
            "bestMatchEmail": None,
            "bestMatchDistance": None,
        }

    normalized_incoming = normalize_descriptor(request.descriptor)
    best_distance = get_best_distance(stored_descriptors, request.descriptor)
    average_descriptor = get_average_descriptor(stored_descriptors)
    average_distance = float("inf")
    if average_descriptor:
        average_distance = calculate_distance(
            normalize_descriptor(average_descriptor),
            normalized_incoming,
        )

    best_match_email = None
    best_match_distance = float("inf")
    for email, descriptors_json in all_rows:
        other_descriptors = json.loads(descriptors_json) if descriptors_json else []
        if not isinstance(other_descriptors, list):
            other_descriptors = [other_descriptors]

        if not other_descriptors:
            continue

        other_average = get_average_descriptor(other_descriptors)
        if not other_average:
            continue

        candidate_distance = calculate_distance(
            normalize_descriptor(other_average),
            normalized_incoming,
        )

        if candidate_distance < best_match_distance:
            best_match_distance = candidate_distance
            best_match_email = email

    print(f"Best distance: {best_distance}")
    print(f"Average distance: {average_distance}")
    print(f"Best match email: {best_match_email}")
    print(f"Best match distance: {best_match_distance}")

    THRESHOLD_BEST = 0.45
    THRESHOLD_AVG = 0.48

    if best_match_email != request.email:
        return {
            "success": False,
            "message": "Face does not match the requested account.",
            "bestDistance": round(best_distance, 4),
            "averageDistance": round(average_distance, 4),
            "bestMatchEmail": best_match_email,
            "bestMatchDistance": round(best_match_distance, 4),
        }

    if best_distance < THRESHOLD_BEST and average_distance < THRESHOLD_AVG:
        return {
            "success": True,
            "message": "Login successful",
            "bestDistance": round(best_distance, 4),
            "averageDistance": round(average_distance, 4),
            "bestMatchEmail": best_match_email,
            "bestMatchDistance": round(best_match_distance, 4),
            "first_name": row[1] or "",
            "last_name": row[2] or "",
        }

    return {
        "success": False,
        "message": "Face verification failed",
        "bestDistance": round(best_distance, 4),
        "averageDistance": round(average_distance, 4),
        "bestMatchEmail": best_match_email,
        "bestMatchDistance": round(best_match_distance, 4),
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

