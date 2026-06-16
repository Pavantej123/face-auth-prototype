import React, { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = async () => {
    setMessage("");
    if (!email) {
      setMessage("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(`Server error ${response.status}`);
      }

      const data = await response.json();
      setMessage(data.message || "Login completed.");
    } catch (error) {
      console.error(error);
      setMessage("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "2rem auto", fontFamily: "Arial, sans-serif" }}>
      <h2>Login</h2>

      <label style={{ display: "block", marginBottom: 12 }}>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: "block", width: "100%", padding: "10px", marginTop: 8 }}
        />
      </label>

      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>

      {message && <p style={{ marginTop: 16, color: "#222" }}>{message}</p>}
    </div>
  );
}
