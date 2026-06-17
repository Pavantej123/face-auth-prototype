import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

const sharedCardStyles = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 24,
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.08)",
  padding: "32px",
};

const sharedButtonStyles = {
  borderRadius: 14,
  padding: "14px 20px",
  fontWeight: 700,
  transition: "background-color 0.2s ease, transform 0.2s ease",
};

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        maxWidth: 1120,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
      }}
    >
      <div style={{ width: "100%" }}>{children}</div>
    </div>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <div style={sharedCardStyles}>{children}</div>;
}

export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ margin: 0, fontSize: 32, color: "#111827" }}>{title}</h1>
      {subtitle ? (
        <p style={{ marginTop: 10, color: "#6b7280", lineHeight: 1.6 }}>{subtitle}</p>
      ) : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "14px 16px",
        borderRadius: 14,
        border: "1px solid #d1d5db",
        background: "#f9fafb",
        color: "#111827",
        fontSize: 16,
        outline: "none",
      }}
    />
  );
}

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        ...sharedButtonStyles,
        width: "100%",
        border: "none",
        color: "#ffffff",
        background: props.disabled ? "#cbd5e1" : "#2563eb",
        cursor: props.disabled ? "not-allowed" : "pointer",
      }}
    />
  );
}

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        ...sharedButtonStyles,
        width: "100%",
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        color: "#334155",
        cursor: props.disabled ? "not-allowed" : "pointer",
      }}
    />
  );
}

export function LinkText({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        padding: 0,
        fontSize: 14,
        color: "#2563eb",
        background: "transparent",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function StatusMessage({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: "14px 16px",
        borderRadius: 16,
        background: type === "success" ? "#ecfdf5" : "#fff1f2",
        color: type === "success" ? "#166534" : "#991b1b",
        border: type === "success" ? "1px solid #d1fae5" : "1px solid #fecaca",
      }}
    >
      {message}
    </div>
  );
}
