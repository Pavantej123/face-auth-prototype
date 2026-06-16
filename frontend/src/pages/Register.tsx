import React, { useEffect, useRef, useState } from "react";

export default function Register() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [email, setEmail] = useState<string>("");
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        setMessage("Unable to access camera. Please allow camera permissions.");
        console.error(err);
      }
    };

    start();

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleCapture = () => {
    setMessage("");
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setMessage("Unable to capture image.");
      return;
    }

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    setCapturedImage(dataUrl);
  };

  const handleRegister = async () => {
    setMessage("");
    if (!email) {
      setMessage("Please enter an email.");
      return;
    }
    if (!capturedImage) {
      setMessage("Please capture a face image first.");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("http://127.0.0.1:8000/upload-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, image: capturedImage }),
      });

      if (!resp.ok) throw new Error(`Server ${resp.status}`);
      const data = await resp.json();
      setMessage(data.message ? `Registered: ${data.message}` : "Registered successfully.");
    } catch (err) {
      console.error(err);
      setMessage("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "1rem auto", fontFamily: "Arial, sans-serif" }}>
      <h2>Register</h2>

      <label style={{ display: "block", marginBottom: 8 }}>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: "block", width: "100%", padding: "8px", marginTop: 6 }}
        />
      </label>

      <div style={{ marginTop: 12 }}>
        <div style={{ width: "100%", height: 320, background: "#000", borderRadius: 8, overflow: "hidden" }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>

        <div style={{ marginTop: 8 }}>
          <button onClick={handleCapture} style={{ marginRight: 8 }}>
            Capture
          </button>
          <button onClick={handleRegister} disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </div>
      </div>

      {message && <p style={{ marginTop: 12, color: "#111" }}>{message}</p>}

      {capturedImage && (
        <div style={{ marginTop: 12 }}>
          <h4>Captured Image</h4>
          <img src={capturedImage} alt="captured" style={{ width: "100%", borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}
