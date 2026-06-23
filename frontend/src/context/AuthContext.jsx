import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, setToken, setEmpresaToken, getEmpresaToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [authStep, setAuthStep] = useState("empresa"); // 'empresa' | 'usuario'
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me);
      setAuthStep("usuario");
    } catch {
      setUser(null);
      // Verifica se há token de empresa salvo
      const savedEmpresa = localStorage.getItem("finovo_empresa");
      if (savedEmpresa) {
        try {
          setEmpresa(JSON.parse(savedEmpresa));
          setAuthStep("usuario");
        } catch {
          setEmpresa(null);
          setAuthStep("empresa");
        }
      } else {
        setAuthStep("empresa");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("finovo_token");
    const empresaToken = getEmpresaToken();

    if (token) {
      loadMe();
    } else if (empresaToken) {
      const savedEmpresa = localStorage.getItem("finovo_empresa");
      if (savedEmpresa) {
        try {
          setEmpresa(JSON.parse(savedEmpresa));
          setAuthStep("usuario");
        } catch {
          setAuthStep("empresa");
        }
      }
      setLoading(false);
    } else {
      setLoading(false);
    }

    const onUnauthorized = () => {
      setToken(null);
      setUser(null);
      // Mantém empresa step se tiver token de empresa
      if (getEmpresaToken()) {
        setAuthStep("usuario");
      } else {
        setAuthStep("empresa");
      }
    };
    window.addEventListener("finovo:unauthorized", onUnauthorized);
    return () => window.removeEventListener("finovo:unauthorized", onUnauthorized);
  }, [loadMe]);

  const loginEmpresa = async (nome, senha) => {
    const result = await api.loginEmpresa(nome, senha);
    setEmpresaToken(result.token);
    localStorage.setItem("finovo_empresa", JSON.stringify(result.empresa));
    setEmpresa(result.empresa);
    setAuthStep("usuario");
    return result.empresa;
  };

  const loginUsuario = async (email, senha) => {
    const empresaToken = getEmpresaToken();
    const result = await api.loginUsuario(email, senha, empresaToken);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  };

  const logout = () => {
    setToken(null);
    setEmpresaToken(null);
    localStorage.removeItem("finovo_empresa");
    setUser(null);
    setEmpresa(null);
    setAuthStep("empresa");
  };

  const voltarEmpresa = () => {
    setToken(null);
    setEmpresaToken(null);
    localStorage.removeItem("finovo_empresa");
    setUser(null);
    setEmpresa(null);
    setAuthStep("empresa");
  };

  return (
    <AuthContext.Provider value={{
      user, empresa, authStep, loading,
      loginEmpresa, loginUsuario, logout, voltarEmpresa,
      refresh: loadMe,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
