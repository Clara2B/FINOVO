const express = require("express");
const bcrypt  = require("bcryptjs");
const pool    = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const SUPER_EMAIL = "claracg008@gmail.com";

// Só a Clara pode usar estas rotas
const requireSuper = (req, res, next) => {
  if ((req.user.email || "").toLowerCase() !== SUPER_EMAIL) {
    return res.status(403).json({ error: "Acesso restrito." });
  }
  next();
};
router.use(requireSuper);

// ── GET /api/admin/company — dados da empresa ──────────────────────────────
router.get("/company", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nome FROM empresas WHERE id = $1",
      [req.user.organizationId]
    );
    res.json(rows[0] || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/admin/company — renomeia empresa e/ou altera senha ──────────
router.patch("/company", async (req, res) => {
  const { nome, senha } = req.body;
  if (!nome?.trim() && !senha) return res.status(400).json({ error: "Informe nome ou senha." });
  if (senha && senha.length < 6) return res.status(400).json({ error: "Senha precisa ter pelo menos 6 caracteres." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (nome?.trim()) {
      await client.query("UPDATE empresas      SET nome = $1 WHERE id = $2", [nome.trim(), req.user.organizationId]);
      await client.query("UPDATE organizations SET name = $1 WHERE id = $2::UUID", [nome.trim(), req.user.organizationId]);
    }
    if (senha) {
      const bcrypt = require("bcryptjs");
      const hash = await bcrypt.hash(senha, 10);
      await client.query("UPDATE empresas SET senha_hash = $1 WHERE id = $2", [hash, req.user.organizationId]);
    }
    await client.query("COMMIT");
    res.json({ ok: true, nome: nome?.trim() });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── GET /api/admin/users — lista todos os usuários da empresa ──────────────
router.get("/users", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nome, email, tipo, criado_em FROM usuarios WHERE empresa_id = $1 ORDER BY criado_em ASC",
      [req.user.organizationId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/admin/users — cria usuário ──────────────────────────────────
router.post("/users", async (req, res) => {
  const { nome, email, senha, tipo = "usuario" } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ error: "Nome, email e senha são obrigatórios." });
  if (senha.length < 6) return res.status(400).json({ error: "Senha precisa ter pelo menos 6 caracteres." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const hash = await bcrypt.hash(senha, 10);

    const { rows } = await client.query(
      "INSERT INTO usuarios (empresa_id, nome, email, senha_hash, tipo) VALUES ($1,$2,$3,$4,$5) RETURNING id, nome, email, tipo, criado_em",
      [req.user.organizationId, nome.trim(), email.toLowerCase().trim(), hash, tipo]
    );
    const u = rows[0];

    // Espelha na tabela users
    await client.query(
      "INSERT INTO users (id, organization_id, name, email, password_hash, role) VALUES ($1::UUID, $2::UUID, $3, $4, $5, $6) ON CONFLICT DO NOTHING",
      [u.id, req.user.organizationId, nome.trim(), email.toLowerCase().trim(), hash, tipo === "dono" ? "admin" : "member"]
    );

    await client.query("COMMIT");
    res.status(201).json(u);
  } catch (e) {
    await client.query("ROLLBACK");
    if (e.code === "23505") return res.status(409).json({ error: "Email já cadastrado." });
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── PATCH /api/admin/users/:id — edita usuário ────────────────────────────
router.patch("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, tipo } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const fields1 = [], vals1 = [];
    let i = 1;
    if (nome)  { fields1.push(`nome = $${i++}`);  vals1.push(nome.trim()); }
    if (email) { fields1.push(`email = $${i++}`); vals1.push(email.toLowerCase().trim()); }
    if (tipo)  { fields1.push(`tipo = $${i++}`);  vals1.push(tipo); }
    let hash;
    if (senha) {
      if (senha.length < 6) { await client.query("ROLLBACK"); return res.status(400).json({ error: "Senha precisa ter 6+ caracteres." }); }
      hash = await bcrypt.hash(senha, 10);
      fields1.push(`senha_hash = $${i++}`);
      vals1.push(hash);
    }
    if (fields1.length === 0) { await client.query("ROLLBACK"); return res.status(400).json({ error: "Nada para atualizar." }); }
    vals1.push(id, req.user.organizationId);

    const { rows } = await client.query(
      `UPDATE usuarios SET ${fields1.join(",")} WHERE id = $${i++} AND empresa_id = $${i} RETURNING id, nome, email, tipo, criado_em`,
      vals1
    );
    if (!rows[0]) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Usuário não encontrado." }); }

    // Espelha na tabela users
    const fields2 = [], vals2 = [];
    let j = 1;
    if (nome)  { fields2.push(`name = $${j++}`);           vals2.push(nome.trim()); }
    if (email) { fields2.push(`email = $${j++}`);          vals2.push(email.toLowerCase().trim()); }
    if (tipo)  { fields2.push(`role = $${j++}`);           vals2.push(tipo === "dono" ? "admin" : "member"); }
    if (hash)  { fields2.push(`password_hash = $${j++}`);  vals2.push(hash); }
    if (fields2.length > 0) {
      vals2.push(id);
      await client.query(`UPDATE users SET ${fields2.join(",")} WHERE id = $${j}::UUID`, vals2);
    }

    await client.query("COMMIT");
    res.json(rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── DELETE /api/admin/users/:id — remove usuário ─────────────────────────
router.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) return res.status(400).json({ error: "Você não pode remover seu próprio usuário." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "DELETE FROM usuarios WHERE id = $1 AND empresa_id = $2 RETURNING id",
      [id, req.user.organizationId]
    );
    if (!rows[0]) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Usuário não encontrado." }); }
    await client.query("DELETE FROM users WHERE id = $1::UUID", [id]);
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

module.exports = router;
