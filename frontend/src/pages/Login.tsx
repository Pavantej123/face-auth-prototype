import React, { useEffect, useRef, useState } from "react";
import { getFaceDescriptor } from "../services/faceRecognitionService";

export default function Login() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [email, setEmail] = useState("");
  const [capturedImage, setCapturedImage] = useState("");
  const [descriptor, setDescriptor] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error(error);
        setMessage("Unable to access camera");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const createImageElement = (
    dataUrl: string
  ): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });

  const handleCapture = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.drawImage(
      videoRef.current,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const dataUrl = canvas.toDataURL("image/png");

    setCapturedImage(dataUrl);

    try {
      const imageElement = await createImageElement(dataUrl);

      const faceDescriptor = await getFaceDescriptor(
        imageElement
      );

      if (!faceDescriptor) {
        setMessage("No face detected");
        return;
      }

      setDescriptor(Array.from(faceDescriptor));

      setMessage("Face detected successfully");
    } catch (error) {
      console.error(error);
      setMessage("Face detection failed");
    }
  };

  const handleLogin = async () => {
    if (!email) {
      setMessage("Please enter email");
      return;
    }

    if (descriptor.length === 0) {
      setMessage("Please capture your face");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            descriptor,
          }),
        }
      );

      const data = await response.json();

      setMessage(data.message);
    } catch (error) {
      console.error(error);
      setMessage("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "1rem auto" }}>
      <h2>Login</h2>

      <input
        type="email"
        placeholder="Enter email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px",
        }}
      />

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          borderRadius: "8px",
        }}
      />

      <div style={{ marginTop: "10px" }}>
        <button
          onClick={handleCapture}
          style={{ marginRight: "10px" }}
        >
          Capture Face
        </button>

        <button
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>

      {message && (
        <p style={{ marginTop: "10px" }}>
          {message}
        </p>
      )}

      {capturedImage && (
        <img
          src={capturedImage}
          alt="captured"
          style={{
            width: "100%",
            marginTop: "10px",
            borderRadius: "8px",
          }}
        />
      )}
    </div>
  );
}