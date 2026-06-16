import { useEffect, useRef, useState } from "react";

export default function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [image, setImage] = useState<string>("");

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Camera error:", error);
      }
    }

    startCamera();
  }, []);

  const captureImage = () => {
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

    const imageData = canvas.toDataURL("image/png");
    setImage(imageData);
  };

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        width="500"
      />

      <br />

      <button onClick={captureImage}>
        Capture
      </button>

      {image && (
        <div>
          <h3>Captured Image</h3>

          <img
            src={image}
            alt="captured"
            width="500"
          />
        </div>
      )}
    </div>
  );
}
