const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function toApi(row) {
  return {
    id: row.id,
    name: row.name,
    bank: row.bank,
    type: row.type,
    balance: parseFloat(row.balance),
    color: row.color,
  };
}

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM accounts WHERE organization_id=$1 ORDER BY created_at ASC",
      [req.user.organizationId]
    );
    res.json(result.rows.map(toApi));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar contas." });
  }
});

router.post("/", async (req, res) => {
  const { name, bank, type, balance, color } = req.body;
  if (!name || !bank) return res.status(400).json({ error: "Informe nome e banco." });
  try {
    const result = await pool.query(
      `INSERT INTO accounts (organization_id, name, bank, type, balance, color)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.organizationId, name, bank, type || "corrente", balance || 0, color || "#6c63ff"]
    );
    res.status(201).json(toApi(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar conta." });
  }
});

router.put("/:id", async (req, res) => {
  const { name, bank, type, balance, color } = req.body;
  try {
    const result = await pool.query(
      `UPDATE accounts SET name=$1, bank=$2, type=$3, balance=$4, color=$5
       WHERE id=$6 AND organization_id=$7 RETURNING *`,
      [name, bank, type, balance, color, req.params.id, req.user.organizationId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Conta não encontrada." });
    res.json(toApi(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar conta." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM accounts WHERE id=$1 AND organization_id=$2 RETURNING id",
      [req.params.id, req.user.organizationId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Conta não encontrada." });
    res.json({ message: "Conta removida." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao remover conta." });
  }
});

module.exports = router;
