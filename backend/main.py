from turtle import distance

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import math

def calculate_distance(desc1, desc2):
    return math.sqrt(
        sum((a - b) ** 2 for a, b in zip(desc1, desc2))
    )

app = FastAPI()

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
    # store minimal user info in memory using email as key
    users[request.email] = {"descriptor": request.descriptor}

    return {
        "success": True,
        "message": "Face descriptor stored",
        "descriptorLength": descriptor_length,
    }


class LoginRequest(BaseModel):
    email: str
    descriptor: list[float]


@app.post("/login", response_model=dict)
@app.post("/login")
def login(request: LoginRequest):

    if request.email not in users:
        return {
            "success": False,
            "message": "User not found"
        }

    stored_descriptor = users[request.email]["descriptor"]

    distance = calculate_distance(
        stored_descriptor,
        request.descriptor
    )

    print(f"Distance: {distance}")

    THRESHOLD = 0.6
    confidence = max(0, min(100, round((1 - distance) * 100, 2)))
    if distance < THRESHOLD:
        return {
            "success": True,
            "message": "Face matched. Login successful",
            "distance": round(distance, 2),
            "confidence": confidence
        }
    
    return {
        "success": False,
        "message": "Face does not match",
        "distance": round(distance, 2),
        "confidence": confidence
    }


@app.get("/users", response_model=dict)
def get_users():
    """Return all registered users stored in memory."""
    return users
