import { useEffect, useRef, useState } from "react";
import type { FaceQualityStatus } from "../services/faceRecognitionService";
import {
  getFaceDescriptor,
  getFaceQualityStatus,
} from "../services/faceRecognitionService";

export default function Login() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [email, setEmail] = useState("");
  const [capturedImage, setCapturedImage] = useState("");
  const [descriptor, setDescriptor] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [faceStatus, setFaceStatus] = useState<FaceQualityStatus>(
    "No face detected"
  );
  const [messageType, setMessageType] = useState<
    "success" | "warning" | "error"
  >("success");
  const loginEnabled = email.trim().length > 0 && faceStatus === "Face ready" && !loading;

  const showMessage = (
    text: string,
    type: "success" | "warning" | "error" = "success"
  ) => {
    setMessage(text);
    setMessageType(type);
  };

  const getMessageColor = () => {
    if (messageType === "success") return "#1a7f37";
    if (messageType === "warning") return "#b06500";
    return "#c92a2a";
  };

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
        showMessage("Unable to access camera", "error");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      if (!videoRef.current || !videoRef.current.videoWidth) {
        return;
      }

      try {
        const status = await getFaceQualityStatus(videoRef.current);
        setFaceStatus(status);
      } catch (err) {
        console.error("Face position error:", err);
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, []);

  const getStatusMessage = () => {
    if (message) return message;
    return faceStatus;
  };

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
    if (faceStatus !== "Face ready") {
      showMessage(faceStatus, "warning");
      return;
    }

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
        showMessage("No face detected", "error");
        return;
      }

      setDescriptor(Array.from(faceDescriptor));

      showMessage("Face detected successfully", "success");
    } catch (error) {
      console.error(error);
      setMessage("Face detection failed");
    }
  };

  const handleLogin = async () => {
    if (!email) {
      showMessage("Please enter email", "warning");
      return;
    }

    if (descriptor.length === 0) {
      showMessage("Please capture your face", "warning");
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

      showMessage(
        data.message,
        data.success ? "success" : "error"
      );

      if (data.success) {
        // login succeeded
      }
    } catch (error) {
      console.error(error);
      showMessage("Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "1.5rem auto",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#111827",
        padding: "0 1rem",
      }}
    >
      <div
        style={{
          marginBottom: 24,
          padding: 24,
          borderRadius: 20,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 28 }}>Login</h2>
        <p style={{ marginTop: 8, color: "#6b7280" }}>
          Use your email and face capture to verify login.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 18,
        }}
      >
        <div
          style={{
            flex: "1 1 320px",
            minWidth: 320,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 20,
            padding: 20,
            boxShadow: "0 16px 40px rgba(15, 23, 42, 0.05)",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>
            Live Camera
          </h3>

          <label
            style={{
              display: "block",
              marginBottom: 14,
              color: "#374151",
              fontWeight: 600,
            }}
          >
            Email address
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                marginTop: 8,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#f9fafb",
                color: "#111827",
              }}
            />
          </label>

          <div
            style={{
              borderRadius: 16,
              overflow: "hidden",
              background: "#f3f4f6",
              height: 240,
              marginBottom: 16,
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={handleCapture}
              disabled={faceStatus !== "Face ready"}
              style={{
                flex: 1,
                minWidth: 120,
                padding: "12px 16px",
                borderRadius: 12,
                border: "none",
                cursor: faceStatus === "Face ready" ? "pointer" : "not-allowed",
                background:
                  faceStatus === "Face ready"
                    ? "#2563eb"
                    : "#93c5fd",
                color: "#ffffff",
                fontWeight: 600,
              }}
            >
              Capture Face
            </button>
            <button
              onClick={handleLogin}
              disabled={!loginEnabled}
              style={{
                flex: 1,
                minWidth: 120,
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: loginEnabled ? "#ffffff" : "#f8fafc",
                color: loginEnabled ? "#111827" : "#6b7280",
                cursor: loginEnabled ? "pointer" : "not-allowed",
                fontWeight: 600,
              }}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>

          <p
            style={{
              marginTop: 14,
              color: getMessageColor(),
              minHeight: 24,
              fontWeight: 600,
            }}
          >
            {getStatusMessage()}
          </p>
        </div>

        <div
          style={{
            flex: "1 1 320px",
            minWidth: 320,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 20,
            padding: 20,
            boxShadow: "0 16px 40px rgba(15, 23, 42, 0.05)",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>
            Captured Preview
          </h3>
          <div
            style={{
              minHeight: 240,
              borderRadius: 16,
              border: "1px solid #d1d5db",
              background: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="captured preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <span style={{ color: "#6b7280" }}>
                Preview will appear here after capture.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
