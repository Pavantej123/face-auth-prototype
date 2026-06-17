import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard.tsx";
import { loadModels } from "./services/faceApiService";

type Page = "login" | "register" | "dashboard";
type User = {
  email: string;
  firstName?: string;
  lastName?: string;
};

function App() {
  const [page, setPage] = useState<Page>("login");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setPage("dashboard");
  };

  const handleRegistrationComplete = () => {
    setPage("login");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPage("login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#eef2ff" }}>
      {page === "login" && (
        <Login
          onNavigateToRegister={() => setPage("register")}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {page === "register" && (
        <Register
          onRegistrationComplete={handleRegistrationComplete}
          onCancel={() => setPage("login")}
        />
      )}

      {page === "dashboard" && currentUser && (
        <Dashboard user={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;