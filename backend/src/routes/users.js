const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// ── GET /api/users — lista usuários da organização do admin logado ───────
router.get("/", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, active, created_at
       FROM users WHERE organization_id = $1 ORDER BY created_at ASC`,
      [req.user.organizationId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar usuários." });
  }
});

// ── POST /api/users — cria novo usuário na mesma organização ──────────────
router.post("/", requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Informe nome, email e senha." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
  }
  if (role && !["admin", "member"].includes(role)) {
    return res.status(400).json({ error: "Papel inválido." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (organization_id, name, email, password_hash, role)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name, email, role, active, created_at`,
      [req.user.organizationId, name, email.toLowerCase().trim(), passwordHash, role || "member"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Já existe um usuário com esse email." });
    }
    console.error(err);
    res.status(500).json({ error: "Erro ao criar usuário." });
  }
});

// ── PATCH /api/users/:id — edita usuário (nome, papel, ativo, senha) ──────
router.patch("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, role, active, password } = req.body;

  try {
    const check = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND organization_id = $2",
      [id, req.user.organizationId]
    );
    if (!check.rows[0]) return res.status(404).json({ error: "Usuário não encontrado." });

    const fields = [];
    const values = [];
    let i = 1;

    if (name !== undefined)   { fields.push(`name = $${i++}`);   values.push(name); }
    if (role !== undefined)   { fields.push(`role = $${i++}`);   values.push(role); }
    if (active !== undefined) { fields.push(`active = $${i++}`); values.push(active); }
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
      const hash = await bcrypt.hash(password, 10);
      fields.push(`password_hash = $${i++}`);
      values.push(hash);
    }
    if (fields.length === 0) return res.status(400).json({ error: "Nada para atualizar." });

    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${i} RETURNING id, name, email, role, active, created_at`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar usuário." });
  }
});

// ── DELETE /api/users/:id — remove usuário da organização ────────────────
router.delete("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) {
    return res.status(400).json({ error: "Você não pode remover seu próprio usuário." });
  }
  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 AND organization_id = $2 RETURNING id",
      [id, req.user.organizationId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json({ message: "Usuário removido." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao remover usuário." });
  }
});

module.exports = router;
