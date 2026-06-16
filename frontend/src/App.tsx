import { useState } from "react";
import Register from "./pages/Register";
import Login from "./pages/Login";

function App() {
  const [page, setPage] = useState<"register" | "login">("register");

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setPage("register")}>
          Register
        </button>

        <button
          onClick={() => setPage("login")}
          style={{ marginLeft: "10px" }}
        >
          Login
        </button>

      </div>

      {page === "register" ? <Register /> : <Login />}
    </div>
  );
}

export default App;