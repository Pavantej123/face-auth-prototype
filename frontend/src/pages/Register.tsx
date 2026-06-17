import { useEffect, useRef, useState } from "react";
import { getFaceDescriptor, getFaceQualityStatus } from "../services/faceRecognitionService";
import {
  Card,
  PageShell,
  PrimaryButton,
  StatusMessage,
  TextInput,
  SecondaryButton,
} from "../components/UI";

type RegisterProps = {
  onRegistrationComplete: () => void;
  onCancel: () => void;
};

const sampleInstructions = [
  "Look directly at the camera.",
  "Slightly turn left.",
  "Slightly turn right.",
  "Look slightly up.",
  "Look slightly down.",
];

export default function Register({ onRegistrationComplete, onCancel }: RegisterProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [email, setEmail] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [descriptorSamples, setDescriptorSamples] = useState<number[][]>([]);
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState<boolean>(false);
  const [faceReady, setFaceReady] = useState(false);
  const [registrationStarted, setRegistrationStarted] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const currentSample = Math.min(descriptorSamples.length + 1, 5);
  const samplesComplete = descriptorSamples.length >= 5;

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage(text);
    setMessageType(type);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!registrationStarted) {
      return;
    }

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
  }, [registrationStarted]);

  const createImageElement = (dataUrl: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });

  const captureSample = async () => {
    console.log("Capture button clicked");
    setMessage("");

    if (!videoRef.current) {
      showMessage("Camera unavailable.", "error");
      return;
    }

    if (!faceReady) {
      showMessage("Please align your face in the frame.", "error");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      showMessage("Unable to capture image.", "error");
      return;
    }

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageElement = await createImageElement(canvas.toDataURL("image/png"));
    const descriptor = await getFaceDescriptor(imageElement);

    console.log("Descriptor generated", descriptor);

    if (!descriptor) {
      showMessage("Face not detected. Try again.", "error");
      return;
    }

    setDescriptorSamples((current) => {
      const next = [...current, Array.from(descriptor)];
      console.log("Sample added", next.length);
      showMessage(`Captured sample ${next.length} of 5.`, "success");
      return next;
    });
  };

  const startFaceRegistration = async () => {
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      showMessage("Enter your email and full name before starting face registration.", "error");
      return;
    }

    setDescriptorSamples([]);
    setFaceReady(false);
    console.log("Face registration started");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log("Camera stream started", stream);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // Some browsers may require user interaction for autoplay; muted video should still work.
        }
      }
      setRegistrationStarted(true);
      showMessage("Face registration started. Capture 5 samples.", "success");
    } catch (error) {
      console.error("Camera initialization failed", error);
      showMessage("Unable to access camera.", "error");
    }
  };

  const registerUser = async () => {
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      showMessage("Enter your email and full name.", "error");
      return;
    }

    if (!samplesComplete) {
      showMessage("Capture 5 face samples before registering.", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/upload-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          descriptor: descriptorSamples,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        showMessage(data.message || "Registration failed.", "error");
        return;
      }

      showMessage("Registration Successful.", "success");
      setTimeout(() => {
        setDescriptorSamples([]);
        onRegistrationComplete();
      }, 900);
    } catch {
      showMessage("Registration failed.", "error");
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
              <h1 style={{ fontSize: 34, margin: 0, color: "#111827" }}>Register</h1>
              <p style={{ marginTop: 12, color: "#475569", lineHeight: 1.7 }}>
                Create a face login profile with your email, name, and a few camera samples.
              </p>
            </div>

            <TextInput
              placeholder="First name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
            <TextInput
              placeholder="Last name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
            <TextInput
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <div style={{ display: "grid", gap: 10, padding: 18, borderRadius: 18, background: "#f8fafc" }}>
              <p style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>Registration instructions</p>
              <p style={{ margin: 0, color: "#475569", fontSize: 14, lineHeight: 1.7 }}>
                Enter your name and email, then proceed to face registration to capture 5 samples.
              </p>
            </div>

            {!registrationStarted ? (
              <PrimaryButton onClick={startFaceRegistration} disabled={loading}>
                Proceed to Face Registration
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={registerUser} disabled={!samplesComplete || loading}>
                {loading ? "Registering..." : "Complete Registration"}
              </PrimaryButton>
            )}

            <SecondaryButton onClick={onCancel} disabled={loading}>
              Back to login
            </SecondaryButton>

            {message && <StatusMessage message={message} type={messageType} />}
          </div>

          <div style={{ flex: "0 0 320px", minWidth: 280, display: "grid", gap: 16 }}>
            <div
              style={{
                borderRadius: 24,
                background: "#f8fafc",
                padding: 16,
                boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
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
                  position: "relative",
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
                    display: registrationStarted ? "block" : "none",
                  }}
                />
                {!registrationStarted && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#e2e8f0",
                      padding: 16,
                      textAlign: "center",
                    }}
                  >
                    <span>Start face registration to show live camera.</span>
                  </div>
                )}
              </div>
            </div>

            {registrationStarted ? (
              <div
                style={{
                  borderRadius: 24,
                  background: "#ffffff",
                  padding: 18,
                  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.06)",
                  border: "1px solid #e2e8f0",
                  display: "grid",
                  gap: 12,
                }}
              >
                <p style={{ margin: 0, color: "#334155", fontWeight: 700 }}>Face registration progress</p>
                <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
                  {descriptorSamples.length} of 5 samples captured.
                </p>
                <p style={{ margin: 0, color: "#475569", fontSize: 14, fontWeight: 600 }}>
                  {sampleInstructions[currentSample - 1]}
                </p>
                <div
                  style={{
                    marginTop: 8,
                    height: 10,
                    borderRadius: 999,
                    background: "#e2e8f0",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(descriptorSamples.length / 5) * 100}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: "#2563eb",
                      transition: "width 0.25s ease",
                    }}
                  />
                </div>

                <PrimaryButton onClick={captureSample} disabled={samplesComplete || loading}>
                  {samplesComplete ? "Samples complete" : `Capture sample ${currentSample}`}
                </PrimaryButton>
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 24,
                  background: "#f8fafc",
                  padding: 18,
                  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.06)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <p style={{ margin: 0, color: "#334155", fontWeight: 700 }}>Ready to begin</p>
                <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 14 }}>
                  Complete the form on the left and proceed to face registration.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
