import { useState } from "react";
import { useAuth } from "../context/AuthContext";

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

function PasswordInput({ value, onChange, placeholder = "••••••••" }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
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

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, justifyContent: "center" }}>
      <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="14" r="9" fill={C.orange} />
        <circle cx="14" cy="30" r="9" fill={C.teal} />
        <circle cx="34" cy="30" r="9" fill={C.blue} />
      </svg>
      <div>
        <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 22, color: C.navy, letterSpacing: "0.02em" }}>
          FINOVO
        </div>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: "0.04em" }}>
          GESTÃO FINANCEIRA
        </div>
      </div>
    </div>
  );
}

// ── Passo 1: Login da Empresa ─────────────────────────────────────────────────
function StepEmpresa({ onRegister }) {
  const { loginEmpresa } = useAuth();
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginEmpresa(nome, senha);
    } catch (err) {
      setError(err.message || "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(135deg, ${C.navy} 0%, #142a52 100%)`,
      fontFamily: "'Poppins', sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, padding: "40px 36px", width: 380,
        boxShadow: "0 20px 60px rgba(0,0,0,.35)",
      }}>
        <Logo />

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, justifyContent: "center" }}>
          <StepDot active label="1" />
          <div style={{ width: 40, height: 2, background: C.border }} />
          <StepDot active={false} label="2" />
        </div>

        <h1 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4, textAlign: "center" }}>
          Acesso da Empresa
        </h1>
        <p style={{ fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 24 }}>
          Informe o nome e senha da sua empresa
        </p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Nome da Empresa</label>
          <input
            type="text" required autoFocus value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Minha Empresa Ltda"
            style={inputStyle}
          />

          <label style={{ ...labelStyle, marginTop: 14, display: "block" }}>Senha da Empresa</label>
          <PasswordInput value={senha} onChange={e => setSenha(e.target.value)} />

          {error && <ErrorBox msg={error} />}

          <button type="submit" disabled={loading} style={submitBtn(loading)}>
            {loading ? "Verificando..." : "Continuar →"}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: C.muted }}>
          Primeira vez aqui?{" "}
          <button onClick={onRegister} style={{ background: "none", border: "none", color: C.orange, fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            Cadastrar empresa
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Passo 2: Login do Usuário ─────────────────────────────────────────────────
function StepUsuario() {
  const { loginUsuario, voltarEmpresa, empresa } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginUsuario(email, senha);
    } catch (err) {
      setError(err.message || "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(135deg, ${C.navy} 0%, #142a52 100%)`,
      fontFamily: "'Poppins', sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, padding: "40px 36px", width: 380,
        boxShadow: "0 20px 60px rgba(0,0,0,.35)",
      }}>
        <Logo />

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, justifyContent: "center" }}>
          <StepDot active label="1" done />
          <div style={{ width: 40, height: 2, background: C.orange }} />
          <StepDot active label="2" />
        </div>

        {empresa && (
          <div style={{ background: "#f0faf7", border: `1px solid ${C.teal}33`, borderRadius: 9, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, color: C.teal, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Empresa selecionada</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 2 }}>{empresa.nome}</div>
            </div>
            <button onClick={voltarEmpresa} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 12, fontFamily: "inherit", fontWeight: 600 }}>
              Trocar
            </button>
          </div>
        )}

        <h1 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4, textAlign: "center" }}>
          Acesso do Usuário
        </h1>
        <p style={{ fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 24 }}>
          Informe seu email e senha pessoal
        </p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Email</label>
          <input
            type="email" required autoFocus value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            style={inputStyle}
          />

          <label style={{ ...labelStyle, marginTop: 14, display: "block" }}>Senha</label>
          <PasswordInput value={senha} onChange={e => setSenha(e.target.value)} />

          {error && <ErrorBox msg={error} />}

          <button type="submit" disabled={loading} style={submitBtn(loading)}>
            {loading ? "Entrando..." : "Entrar no sistema"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function StepDot({ active, done, label }) {
  const bg = done ? C.teal : active ? C.orange : C.border;
  return (
    <div style={{
      width: 28, height: 28, borderRadius: "50%", background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 800, color: active || done ? "#fff" : C.muted,
    }}>
      {done ? "✓" : label}
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{
      marginTop: 14, background: "#fde8e8", color: "#c0392b", borderRadius: 8,
      padding: "10px 12px", fontSize: 13, fontWeight: 600,
    }}>
      {msg}
    </div>
  );
}

const labelStyle = { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" };

const submitBtn = (loading) => ({
  marginTop: 22, width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
  background: loading ? "#f5b08a" : `linear-gradient(135deg, ${C.orange}, #e05510)`,
  color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "default" : "pointer",
  fontFamily: "inherit", boxShadow: "0 4px 14px rgba(242,101,34,.35)",
});

// ── Export ────────────────────────────────────────────────────────────────────
export default function Login({ onRegister }) {
  const { authStep } = useAuth();

  if (authStep === "usuario") return <StepUsuario />;
  return <StepEmpresa onRegister={onRegister} />;
}
