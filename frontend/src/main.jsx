import { useState } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import App from "./App";

function Root() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState("login"); // 'login' | 'register'

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", fontFamily:"'Poppins',sans-serif", color:"#6b7488" }}>
        Carregando...
      </div>
    );
  }

  if (user) return <App />;

  if (page === "register") {
    return <Register onBack={() => setPage("login")} />;
  }

  return <Login onRegister={() => setPage("register")} />;
}

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <Root />
  </AuthProvider>
);
