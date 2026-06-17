import {  useEffect,useState } from "react";
import Register from "./pages/Register";
import Login from "./pages/Login";
import { loadModels } from "./services/faceApiService";

function App() {
  const [page, setPage] = useState<"register" | "login">("register");

  useEffect(() => {
  const initializeModels = async () => {
    const success = await loadModels();

    if (success) {
      console.log("Models loaded successfully");
    } else {
      console.error("Model loading failed");
    }
  };

  initializeModels();
}, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Face Login Prototype</h1>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => setPage("register")}
          style={{ marginRight: "10px" }}
        >
          Register
        </button>

        <button onClick={() => setPage("login")}>
          Login
        </button>
      </div>

      {page === "register" ? <Register /> : <Login />}
    </div>
  );
}

export default App;