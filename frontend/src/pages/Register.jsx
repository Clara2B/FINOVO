import { useState } from "react";
import { api } from "../api/client";

const C = {
  navy: "#0f1e3d",
  orange: "#f26522",
  teal: "#0ea882",
  blue: "#3b9fd4",
  border: "#e3e7ef",
  text: "#1a2236",
  muted: "#6b7488",
};

const inputStyle = {
  width: "100%", marginTop: 6, padding: "10px 14px", borderRadius: 9,
  border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit",
  boxSizing: "border-box", outline: "none", color: C.text, background: "#fff",
};

function EyeIcon({ visible }) {
  return visible ? (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function PasswordInput({ value, onChange, placeholder = "••••••••", required }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{ ...inputStyle, paddingRight: 42 }}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer", color: C.muted,
          display: "flex", alignItems: "center", padding: 0,
        }}
      >
        <EyeIcon visible={show} />
      </button>
    </div>
  );
}

export default function Register({ onBack }) {
  const [form, setForm] = useState({
    nomeEmpresa: "", senhaEmpresa: "",
    nomeAdmin: "", emailAdmin: "", senhaAdmin: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const result = await api.registrar(form);
      setSuccess(result.message || "Empresa cadastrada! Faça login para continuar.");
    } catch (err) {
      setError(err.message || "Erro ao cadastrar empresa.");
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginTop: 14 };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(135deg, ${C.navy} 0%, #142a52 100%)`,
      fontFamily: "'Poppins', sans-serif", padding: "24px 16px",
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, padding: "40px 36px", width: "100%", maxWidth: 420,
        boxShadow: "0 20px 60px rgba(0,0,0,.35)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, justifyContent: "center" }}>
          <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="14" r="9" fill={C.orange} />
            <circle cx="14" cy="30" r="9" fill={C.teal} />
            <circle cx="34" cy="30" r="9" fill={C.blue} />
          </svg>
          <div>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 22, color: C.navy, letterSpacing: "0.02em" }}>FINOVO</div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: "0.04em" }}>GESTÃO FINANCEIRA</div>
          </div>
        </div>

        <h1 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4, textAlign: "center" }}>Cadastrar nova empresa</h1>
        <p style={{ fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 24 }}>Crie a conta da sua empresa e do administrador</p>

        {success ? (
          <div>
            <div style={{ background: "#e8f9f4", color: C.teal, borderRadius: 10, padding: "16px 14px", fontSize: 14, fontWeight: 600, textAlign: "center", marginBottom: 20 }}>
              ✅ {success}
            </div>
            <button onClick={onBack} style={{
              width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.navy}, #1e3a6e)`,
              color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
            }}>
              Ir para o login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Dados da empresa */}
            <div style={{ background: "#f8f9fc", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.navy, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                🏢 Dados da Empresa
              </div>

              <label style={labelStyle}>Nome da Empresa</label>
              <input
                type="text" required value={form.nomeEmpresa}
                onChange={e => set("nomeEmpresa", e.target.value)}
                placeholder="Ex: Minha Empresa Ltda"
                style={inputStyle}
              />

              <label style={labelStyle}>Senha da Empresa</label>
              <PasswordInput
                value={form.senhaEmpresa}
                onChange={e => set("senhaEmpresa", e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            {/* Dados do admin */}
            <div style={{ background: "#f8f9fc", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.navy, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                👤 Administrador
              </div>

              <label style={labelStyle}>Nome completo</label>
              <input
                type="text" required value={form.nomeAdmin}
                onChange={e => set("nomeAdmin", e.target.value)}
                placeholder="Seu nome"
                style={inputStyle}
              />

              <label style={labelStyle}>Email</label>
              <input
                type="email" required value={form.emailAdmin}
                onChange={e => set("emailAdmin", e.target.value)}
                placeholder="admin@empresa.com"
                style={inputStyle}
              />

              <label style={labelStyle}>Senha do administrador</label>
              <PasswordInput
                value={form.senhaAdmin}
                onChange={e => set("senhaAdmin", e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            {error && (
              <div style={{ marginTop: 14, background: "#fde8e8", color: "#c0392b", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              marginTop: 22, width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
              background: loading ? "#f5b08a" : `linear-gradient(135deg, ${C.orange}, #e05510)`,
              color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "default" : "pointer",
              fontFamily: "inherit", boxShadow: "0 4px 14px rgba(242,101,34,.35)",
            }}>
              {loading ? "Cadastrando..." : "Criar conta"}
            </button>
          </form>
        )}

        <div style={{ marginTop: 18, textAlign: "center", fontSize: 13, color: C.muted }}>
          Já tem conta?{" "}
          <button onClick={onBack} style={{ background: "none", border: "none", color: C.orange, fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            Fazer login
          </button>
        </div>
      </div>
    </div>
  );
}
