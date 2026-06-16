import { useEffect, useRef, useState } from "react";

export default function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [image, setImage] = useState<string>("");
  const [backendMessage, setBackendMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (cameraError) {
        setError("Unable to open the camera. Please allow camera access.");
        console.error("Camera error:", cameraError);
      }
    }

    startCamera();
  }, []);

  const captureImage = () => {
    setError("");
    setBackendMessage("");

    if (!videoRef.current) {
      setError("Video feed is not ready yet.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Cannot capture the image right now.");
      return;
    }

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/png");
    setImage(imageData);
  };

  const sendToBackend = async () => {
    setError("");
    setBackendMessage("");

    if (!image) {
      setError("Please capture an image before sending.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/upload-face", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      setBackendMessage(data.message || "Image sent successfully.");
    } catch (sendError) {
      setError("Failed to send image to backend.");
      console.error("Send error:", sendError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "1rem", fontFamily: "Arial, sans-serif" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        width="100%"
        style={{ borderRadius: 8, backgroundColor: "#000" }}
      />

      <div style={{ marginTop: "1rem" }}>
        <button onClick={captureImage} style={{ marginRight: "0.75rem" }}>
          Capture
        </button>
        <button onClick={sendToBackend} disabled={loading || !image}>
          {loading ? "Sending..." : "Send To Backend"}
        </button>
      </div>

      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}
      {backendMessage && <p style={{ color: "green", marginTop: "1rem" }}>{backendMessage}</p>}

      {image && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Captured Image</h3>
          <img src={image} alt="captured" width="100%" style={{ borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}
