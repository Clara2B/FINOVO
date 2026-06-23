const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function toApi(row) {
  return { id: row.id, name: row.name, type: row.type, icon: row.icon, color: row.color };
}

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM categories WHERE organization_id=$1 ORDER BY created_at ASC",
      [req.user.organizationId]
    );
    res.json(result.rows.map(toApi));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar categorias." });
  }
});

router.post("/", async (req, res) => {
  const { name, type, icon, color } = req.body;
  if (!name || !type) return res.status(400).json({ error: "Informe nome e tipo." });
  if (!["expense", "income"].includes(type)) {
    return res.status(400).json({ error: "Tipo deve ser 'expense' ou 'income'." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO categories (organization_id, name, type, icon, color)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.organizationId, name, type, icon || "🏷️", color || ""]
    );
    res.status(201).json(toApi(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar categoria." });
  }
});

router.put("/:id", async (req, res) => {
  const { name, icon, color } = req.body;
  try {
    const result = await pool.query(
      `UPDATE categories SET name=$1, icon=$2, color=$3
       WHERE id=$4 AND organization_id=$5 RETURNING *`,
      [name, icon, color, req.params.id, req.user.organizationId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Categoria não encontrada." });
    res.json(toApi(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar categoria." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM categories WHERE id=$1 AND organization_id=$2 RETURNING id",
      [req.params.id, req.user.organizationId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Categoria não encontrada." });
    res.json({ message: "Categoria removida." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao remover categoria." });
  }
});

module.exports = router;
