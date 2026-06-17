import { useEffect, useRef, useState } from "react";
import {
  getFaceDescriptor,
  getFaceQualityStatus,
} from "../services/faceRecognitionService";
import { verifyBlinkWithMediaPipe } from "../services/mediapipeBlinkService";
import {
  Card,
  LinkText,
  PageShell,
  PrimaryButton,
  StatusMessage,
  TextInput,
} from "../components/UI";

type User = {
  firstName: string;
  lastName: string;
  email: string;
};

type LoginProps = {
  onLoginSuccess: (user: User) => void;
  onNavigateToRegister: () => void;
};

export default function Login({
  onLoginSuccess,
  onNavigateToRegister,
}: LoginProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [faceReady, setFaceReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage(text);
    setMessageType(type);
  };

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        showMessage("Login Failed", "error");
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
        setFaceReady(false);
        return;
      }

      try {
        const status = await getFaceQualityStatus(videoRef.current);
        setFaceReady(status === "Face ready");
      } catch {
        setFaceReady(false);
      }
    }, 500);

    return () => window.clearInterval(interval);
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

  const getDescriptor = async (): Promise<number[] | null> => {
    if (!videoRef.current || !faceReady) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageElement = await createImageElement(canvas.toDataURL("image/png"));
    const descriptor = await getFaceDescriptor(imageElement);
    return descriptor ? Array.from(descriptor) : null;
  };

  const handleLogin = async () => {
    setMessage("");

    if (!email.trim() || !faceReady) {
      showMessage("Login Failed", "error");
      return;
    }

    setLoading(true);
    try {
      if (!videoRef.current) {
        showMessage("Camera unavailable.", "error");
        return;
      }

      const blinkVerified = await verifyBlinkWithMediaPipe(videoRef.current, 6, 250);
      if (!blinkVerified) {
        showMessage("Please blink slowly to confirm liveness.", "error");
        return;
      }

      const descriptor = await getDescriptor();
      if (!descriptor) {
        showMessage("Login Failed", "error");
        return;
      }

      const response = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, descriptor }),
      });

      const data = await response.json();
      if (data.success) {
        showMessage("Login Successful", "success");
        onLoginSuccess({
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          email,
        });
      } else {
        showMessage("Login Failed", "error");
      }
    } catch {
      showMessage("Login Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <Card>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            alignItems: "stretch",
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: "1 1 540px", minWidth: 280, display: "grid", gap: 20 }}>
            <div>
              <h1 style={{ fontSize: 34, margin: 0, color: "#111827" }}>Face Login</h1>
              <p style={{ marginTop: 12, color: "#475569", lineHeight: 1.7 }}>
                Sign in with your email and a quick camera scan for secure face authentication.
              </p>
            </div>

            <label style={{ display: "grid", gap: 10, color: "#334155" }}>
              Email address
              <TextInput
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <div style={{ display: "grid", gap: 16 }}>
              <PrimaryButton
                onClick={handleLogin}
                disabled={loading || !email.trim() || !faceReady}
              >
                {loading ? "Logging in..." : "Login"}
              </PrimaryButton>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ color: "#64748b", fontSize: 14 }}>
                  New user?
                </span>
                <LinkText onClick={onNavigateToRegister}>Register</LinkText>
              </div>
            </div>

            {message && <StatusMessage message={message} type={messageType} />}
          </div>

          <div style={{ flex: "0 0 320px", minWidth: 280 }}>
            <div
              style={{
                borderRadius: 24,
                background: "#f8fafc",
                padding: 16,
                boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
                minHeight: 225,
              }}
            >
              <p style={{ margin: 0, marginBottom: 12, color: "#334155", fontSize: 15, fontWeight: 700 }}>
                Camera preview
              </p>
              <div
                style={{
                  width: "100%",
                  height: 225,
                  borderRadius: 18,
                  overflow: "hidden",
                  background: "#111827",
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
