import { Card, PageShell, PrimaryButton, SectionHeading } from "../components/UI";

type DashboardProps = {
  user: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
  onLogout: () => void;
};

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  return (
    <PageShell>
      <Card>
        <SectionHeading
          title="Welcome back"
          subtitle="You are signed in with face verification."
        />

        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Signed in as</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>
              {fullName}
            </p>
            <p style={{ margin: 0, color: "#475569", fontSize: 15 }}>{user.email}</p>
          </div>

          <div style={{ padding: "20px", borderRadius: 18, background: "#eef2ff" }}>
            <p style={{ margin: 0, color: "#334155", fontSize: 14, fontWeight: 600 }}>
              Face verification status
            </p>
            <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 15 }}>
              Your login was verified from stored face data.
            </p>
          </div>

          <PrimaryButton onClick={onLogout}>Logout</PrimaryButton>
        </div>
      </Card>
    </PageShell>
  );
}
