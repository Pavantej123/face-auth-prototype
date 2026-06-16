from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"]
)

class FaceUploadRequest(BaseModel):
    email: str
    image: str

# Simple in-memory store for registered users (email -> metadata)
users: dict = {}


@app.get("/", response_model=dict)
def read_root():
    return {"message": "Backend Running"}


@app.post("/upload-face", response_model=dict)
def upload_face(request: FaceUploadRequest):
    image_length = len(request.image)
    print(f"Received image length: {image_length}")

    # store minimal user info in memory using email as key
    users[request.email] = {"imageLength": image_length}

    return {
        "success": True,
        "message": "Image received",
        "imageLength": image_length,
    }


class LoginRequest(BaseModel):
    email: str


@app.post("/login", response_model=dict)
def login(request: LoginRequest):
    if request.email in users:
        return {"success": True, "message": "User found"}
    return {"success": False, "message": "User not found"}


@app.get("/users", response_model=dict)
def get_users():
    """Return all registered users stored in memory."""
    return users
