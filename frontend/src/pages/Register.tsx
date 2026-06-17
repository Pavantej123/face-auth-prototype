import { useEffect, useRef, useState } from "react";
import {
  getFaceDescriptor,
  getFaceSampleInstruction,
  getFaceSampleName,
  getSamplePoseStatus,
} from "../services/faceRecognitionService";

export default function Register() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [email, setEmail] = useState<string>("");
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [descriptorSamples, setDescriptorSamples] = useState<number[][]>([]);
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [samplePoseStatus, setSamplePoseStatus] = useState<{
    ready: boolean;
    message: string;
  }>({ ready: false, message: "No face detected" });
  const [profile, setProfile] = useState<{
    email: string;
    created_at: string;
    sample_count: number;
    status: "Registered" | "Not Registered";
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const sampleNumber = Math.min(descriptorSamples.length + 1, 5);
  const currentPoseName = getFaceSampleName(sampleNumber);
  const [messageType, setMessageType] = useState<
    "success" | "warning" | "error"
  >("success");

  const showMessage = (
    text: string,
    type: "success" | "warning" | "error" = "success"
  ) => {
    setMessage(text);
    setMessageType(type);
  };

  const fetchUserProfile = async (emailAddress: string) => {
    if (!emailAddress) {
      setProfile(null);
      return;
    }

    setProfileLoading(true);
    try {
      const resp = await fetch(
        `http://127.0.0.1:8000/user?email=${encodeURIComponent(emailAddress)}`
      );
      if (resp.status === 404) {
        setProfile({
          email: emailAddress,
          created_at: "",
          sample_count: 0,
          status: "Not Registered",
        });
        return;
      }

      if (!resp.ok) {
        setProfile(null);
        return;
      }

      const data = await resp.json();
      setProfile({
        email: data.email,
        created_at: data.created_at,
        sample_count: data.sample_count,
        status: data.status,
      });
    } catch (error) {
      console.error("Profile load failed:", error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleDeleteRegistration = async () => {
    if (!email) {
      showMessage("Enter the registered email first.", "warning");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(
        `http://127.0.0.1:8000/user?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      if (!resp.ok) {
        const err = await resp.json();
        showMessage(err.detail || "Unable to delete registration.", "error");
        return;
      }

      setProfile({
        email,
        created_at: "",
        sample_count: 0,
        status: "Not Registered",
      });
      setDescriptorSamples([]);
      setCapturedImage("");
      showMessage("Registration deleted.", "success");
    } catch (error) {
      console.error("Delete failed:", error);
      showMessage("Unable to delete registration.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSamples = async () => {
    setDescriptorSamples([]);
    setCapturedImage("");
    showMessage("You can now capture new face samples.", "success");
  };

  const getMessageColor = () => {
    if (messageType === "success") return "#1a7f37";
    if (messageType === "warning") return "#b06500";
    return "#c92a2a";
  };

  useEffect(() => {
    let stream: MediaStream | null = null;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        showMessage("Unable to access camera.", "error");
        console.error(err);
      }
    };

    start();

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
        const sampleNumber = Math.min(descriptorSamples.length + 1, 5);
        const status = await getSamplePoseStatus(sampleNumber, videoRef.current);
        setSamplePoseStatus(status);
      } catch (err) {
        console.error("Face position error:", err);
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [descriptorSamples.length]);

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
    setMessage("");

    if (!samplePoseStatus.ready) {
      showMessage(samplePoseStatus.message, "warning");
      return;
    }

    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");

    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      showMessage("Unable to capture image.", "error");
      return;
    }

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

      console.log(
        "Descriptor Length:",
        faceDescriptor.length
      );

      const nextSamples = [
        ...descriptorSamples,
        Array.from(faceDescriptor),
      ];
      setDescriptorSamples(nextSamples);

      if (nextSamples.length < 5) {
        showMessage(
          `Sample ${nextSamples.length} of 5 captured. Please slightly change angle or distance.`,
          "success"
        );
      } else {
        showMessage(
          "All samples collected. Click Register.",
          "success"
        );
      }
    } catch (error) {
      console.error("Face descriptor error:", error);
      setMessage("No face detected");
    }
  };

  const handleRegister = async () => {
    setMessage("");

    if (!email) {
      showMessage("Please enter an email.", "warning");
      return;
    }

    if (descriptorSamples.length < 5) {
      showMessage("Please capture 5 face samples before registering.", "warning");
      return;
    }

    setLoading(true);

    try {
      const resp = await fetch(
        "http://127.0.0.1:8000/upload-face",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            descriptor: descriptorSamples,
            created_at: profile?.created_at || undefined,
          }),
        }
      );

      if (!resp.ok) {
        throw new Error(`Server ${resp.status}`);
      }

      const data = await resp.json();

      if (data.success) {
        setDescriptorSamples([]);
        setCapturedImage("");
        fetchUserProfile(email);
        showMessage("Face registered successfully.", "success");
      } else {
        showMessage(
          data.message || "Registration failed",
          "error"
        );
      }
    } catch (err) {
      console.error(err);
      showMessage("Registration failed", "error");
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
        <h2 style={{ margin: 0, fontSize: 28 }}>Register</h2>
        <p style={{ marginTop: 8, color: "#6b7280" }}>
          Capture your face and register with email-based face login.
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
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              onBlur={() => fetchUserProfile(email)}
              placeholder="Enter your email"
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
              position: "relative",
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
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  zIndex: 2,
                  background: "rgba(255,255,255,0.88)",
                  borderRadius: 999,
                  padding: "8px 12px",
                  fontSize: 12,
                  color: "#111827",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: samplePoseStatus.ready ? "#16a34a" : "#dc2626",
                  }}
                />
                Sample {sampleNumber} of 5 · {currentPoseName}
              </div>

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "62%",
                    height: "72%",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50% / 40%",
                      border: `3px solid ${samplePoseStatus.ready ? "#16a34a" : "#dc2626"}`,
                      boxSizing: "border-box",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: "14%",
                      borderRadius: "50% / 40%",
                      border: `1px dashed ${samplePoseStatus.ready ? "#16a34a" : "#dc2626"}`,
                    }}
                  />
                </div>
              </div>

            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={handleCapture}
              disabled={!samplePoseStatus.ready || descriptorSamples.length >= 5}
              style={{
                flex: 1,
                minWidth: 120,
                padding: "12px 16px",
                borderRadius: 12,
                border: "none",
                cursor:
                  samplePoseStatus.ready && descriptorSamples.length < 5
                    ? "pointer"
                    : "not-allowed",
                background:
                  samplePoseStatus.ready && descriptorSamples.length < 5
                    ? "#2563eb"
                    : "#93c5fd",
                color: "#ffffff",
                fontWeight: 600,
              }}
            >
              {descriptorSamples.length < 5
                ? `Capture sample ${descriptorSamples.length + 1} of 5`
                : "Capture complete"}
            </button>
            <button
              onClick={handleRegister}
              disabled={loading || descriptorSamples.length < 5}
              style={{
                flex: 1,
                minWidth: 120,
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: descriptorSamples.length < 5 ? "#f8fafc" : "#ffffff",
                color: descriptorSamples.length < 5 ? "#6b7280" : "#111827",
                cursor:
                  loading || descriptorSamples.length < 5
                    ? "not-allowed"
                    : "pointer",
                fontWeight: 600,
              }}
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </div>
          <p
            style={{
              marginTop: 10,
              color: "#374151",
              fontSize: 14,
            }}
          >
            Samples captured: {descriptorSamples.length} of 5
          </p>
          <p
            style={{
              marginTop: 10,
              color: "#1f2937",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {getFaceSampleInstruction(
              Math.min(descriptorSamples.length + 1, 5)
            )}
          </p>
          <p
            style={{
              marginTop: 14,
              color: getMessageColor(),
              minHeight: 24,
              fontWeight: 600,
            }}
          >
            {message || samplePoseStatus.message}
          </p>
          <p style={{ marginTop: 4, color: "#6b7280" }}>
            {descriptorSamples.length < 5
              ? "Please capture a mix of angles and distances for better recognition."
              : "All samples captured. Ready to register."}
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
            Registration Profile
          </h3>
          <div
            style={{
              marginBottom: 20,
              padding: 18,
              borderRadius: 16,
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
            }}
          >
            <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
              Status
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700 }}>
              {profileLoading ? "Loading..." : profile?.status || "Not Registered"}
            </p>
          </div>
          <div
            style={{
              marginBottom: 16,
              padding: 18,
              borderRadius: 16,
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
            }}
          >
            <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
              Registered email
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 600 }}>
              {profile?.email || "None"}
            </p>
            <p style={{ margin: "12px 0 0", color: "#6b7280", fontSize: 14 }}>
              Registered on
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 15 }}>
              {profile?.created_at ? new Date(profile.created_at).toLocaleString() : "-"}
            </p>
            <p style={{ margin: "12px 0 0", color: "#6b7280", fontSize: 14 }}>
              Samples stored
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 15 }}>
              {profile?.sample_count ?? 0}
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={handleDeleteRegistration}
              disabled={loading || !profile || profile.status !== "Registered"}
              style={{
                flex: 1,
                minWidth: 120,
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #dc2626",
                background: profile?.status === "Registered" ? "#fee2e2" : "#f8fafc",
                color: profile?.status === "Registered" ? "#991b1b" : "#6b7280",
                cursor:
                  loading || !profile || profile.status !== "Registered"
                    ? "not-allowed"
                    : "pointer",
                fontWeight: 600,
              }}
            >
              Delete registration
            </button>
            <button
              onClick={handleResetSamples}
              disabled={loading}
              style={{
                flex: 1,
                minWidth: 120,
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #2563eb",
                background: "#eff6ff",
                color: "#1d4ed8",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              Re-register samples
            </button>
          </div>
        </div>

        <div
          style={{
            flex: "1 1 320px",
            minWidth: 320,
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
  );
}
