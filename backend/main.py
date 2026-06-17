from turtle import distance
import json
from database import init_db, get_connection
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import math

def calculate_distance(desc1, desc2):
    return math.sqrt(
        sum((a - b) ** 2 for a, b in zip(desc1, desc2))
    )

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
    descriptor: list[float]

# Simple in-memory store for registered users (email -> metadata)
users: dict = {}


@app.get("/", response_model=dict)
def read_root():
    return {"message": "Backend Running"}


@app.post("/upload-face", response_model=dict)
def upload_face(request: FaceUploadRequest):
    descriptor_length = len(request.descriptor)
    print(f"Received descriptor length: {descriptor_length}")
    print(f"Stored user: {request.email}")

    descriptor_json = json.dumps(request.descriptor)
    conn = get_connection()
    conn.execute(
        "INSERT OR REPLACE INTO users (email, descriptor) VALUES (?, ?)",
        (request.email, descriptor_json),
    )
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": "Face descriptor stored",
        "descriptorLength": descriptor_length,
    }


class LoginRequest(BaseModel):
    email: str
    descriptor: list[float]


@app.post("/login", response_model=dict)
def login(request: LoginRequest):
    conn = get_connection()
    cursor = conn.execute(
        "SELECT descriptor FROM users WHERE email = ?",
        (request.email,)
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {
            "success": False,
            "message": "User not found"
        }

    stored_descriptor = json.loads(row[0])
    distance = calculate_distance(stored_descriptor, request.descriptor)

    print(f"Distance: {distance}")

    THRESHOLD = 0.6
    if distance < THRESHOLD:
        return {
            "success": True,
            "message": "Face matched. Login successful",
            "distance": round(distance, 2)
        }

    return {
        "success": False,
        "message": "Face verification failed",
        "distance": round(distance, 2)
    }


@app.get("/users", response_model=dict)
def get_users():
    """Return all registered users stored in SQLite."""
    conn = get_connection()
    cursor = conn.execute("SELECT email, descriptor FROM users")
    rows = cursor.fetchall()
    conn.close()

    return {
        email: {"descriptor": json.loads(descriptor_json)}
        for email, descriptor_json in rows
    }

