const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// ── POST /api/auth/empresa ────────────────────────────────────────────────────
router.post("/empresa", async (req, res) => {
  const { nome, senha } = req.body;
  if (!nome || !senha) {
    return res.status(400).json({ error: "Informe o nome da empresa e a senha." });
  }

  try {
    const result = await pool.query(
      "SELECT id, nome, senha_hash FROM empresas WHERE LOWER(nome) = LOWER($1)",
      [nome.trim()]
    );

    const empresa = result.rows[0];
    if (!empresa) {
      return res.status(401).json({ error: "Empresa ou senha inválidos." });
    }

    const valid = await bcrypt.compare(senha, empresa.senha_hash);
    if (!valid) {
      return res.status(401).json({ error: "Empresa ou senha inválidos." });
    }

    const token = jwt.sign(
      { empresa_id: empresa.id, nome: empresa.nome, etapa: "empresa" },
      process.env.JWT_SECRET,
      { expiresIn: "4h" }
    );

    res.json({ token, empresa: { id: empresa.id, nome: empresa.nome } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao processar login da empresa." });
  }
});

// ── POST /api/auth/usuario ────────────────────────────────────────────────────
router.post("/usuario", async (req, res) => {
  const header = req.headers.authorization || "";
  const empresaToken = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!empresaToken) {
    return res.status(401).json({ error: "Token da empresa não enviado." });
  }

  let empresaPayload;
  try {
    empresaPayload = jwt.verify(empresaToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Token da empresa inválido ou expirado." });
  }

  if (empresaPayload.etapa !== "empresa") {
    return res.status(401).json({ error: "Token inválido para esta etapa." });
  }

  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: "Informe email e senha." });
  }

  try {
    const result = await pool.query(
      "SELECT id, nome, email, senha_hash, tipo FROM usuarios WHERE empresa_id = $1 AND LOWER(email) = LOWER($2)",
      [empresaPayload.empresa_id, email.trim()]
    );

    const usuario = result.rows[0];
    if (!usuario) {
      return res.status(401).json({ error: "Email ou senha inválidos." });
    }

    const valid = await bcrypt.compare(senha, usuario.senha_hash);
    if (!valid) {
      return res.status(401).json({ error: "Email ou senha inválidos." });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        organizationId: empresaPayload.empresa_id,
        role: usuario.tipo,
        email: usuario.email,
        name: usuario.nome,
        etapa: "usuario",
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: {
        id: usuario.id,
        name: usuario.nome,
        email: usuario.email,
        role: usuario.tipo,
        organizationId: empresaPayload.empresa_id,
        organizationName: empresaPayload.nome,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao processar login do usuário." });
  }
});

// ── POST /api/auth/registrar ──────────────────────────────────────────────────
router.post("/registrar", async (req, res) => {
  const { nomeEmpresa, senhaEmpresa, nomeAdmin, emailAdmin, senhaAdmin } = req.body;

  if (!nomeEmpresa || !senhaEmpresa || !nomeAdmin || !emailAdmin || !senhaAdmin) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }
  if (senhaEmpresa.length < 6 || senhaAdmin.length < 6) {
    return res.status(400).json({ error: "Senhas precisam ter pelo menos 6 caracteres." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verifica se empresa já existe
    const exists = await client.query(
      "SELECT id FROM empresas WHERE LOWER(nome) = LOWER($1)",
      [nomeEmpresa.trim()]
    );
    if (exists.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Já existe uma empresa com este nome." });
    }

    const empresaSenhaHash = await bcrypt.hash(senhaEmpresa, 10);
    const adminSenhaHash = await bcrypt.hash(senhaAdmin, 10);

    // Cria empresa
    const empresaRes = await client.query(
      "INSERT INTO empresas (nome, senha_hash) VALUES ($1, $2) RETURNING id, nome",
      [nomeEmpresa.trim(), empresaSenhaHash]
    );
    const empresa = empresaRes.rows[0];

    // Cria organization espelhada (para compatibilidade com o resto do app)
    await client.query(
      "INSERT INTO organizations (id, name) VALUES ($1::UUID, $2)",
      [empresa.id, empresa.nome]
    );

    // Cria usuario admin
    const usuarioRes = await client.query(
      "INSERT INTO usuarios (empresa_id, nome, email, senha_hash, tipo) VALUES ($1, $2, $3, $4, 'dono') RETURNING id",
      [empresa.id, nomeAdmin.trim(), emailAdmin.toLowerCase().trim(), adminSenhaHash]
    );

    // Cria user espelhado (para compatibilidade com rotas existentes)
    await client.query(
      "INSERT INTO users (id, organization_id, name, email, password_hash, role) VALUES ($1::UUID, $2::UUID, $3, $4, $5, 'admin') ON CONFLICT DO NOTHING",
      [usuarioRes.rows[0].id, empresa.id, nomeAdmin.trim(), emailAdmin.toLowerCase().trim(), adminSenhaHash]
    );

    // Cria configurações
    await client.query(
      "INSERT INTO configuracoes (empresa_id) VALUES ($1)",
      [empresa.id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Empresa cadastrada com sucesso! Faça login para continuar.",
      empresa: { id: empresa.id, nome: empresa.nome },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email ou nome de empresa já cadastrado." });
    }
    res.status(500).json({ error: "Erro ao cadastrar empresa." });
  } finally {
    client.release();
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nome AS name, u.email, u.tipo AS role, u.empresa_id AS "organizationId",
              e.nome AS "organizationName"
       FROM usuarios u JOIN empresas e ON e.id = u.empresa_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar usuário." });
  }
});

// ── POST /api/auth/change-password ────────────────────────────────────────────
router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Informe a senha atual e a nova senha." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres." });
  }

  try {
    const result = await pool.query("SELECT senha_hash FROM usuarios WHERE id = $1", [req.user.id]);
    const usuario = result.rows[0];
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });

    const valid = await bcrypt.compare(currentPassword, usuario.senha_hash);
    if (!valid) return res.status(401).json({ error: "Senha atual incorreta." });

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE usuarios SET senha_hash = $1 WHERE id = $2", [newHash, req.user.id]);

    res.json({ message: "Senha alterada com sucesso." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao alterar senha." });
  }
});

module.exports = router;
