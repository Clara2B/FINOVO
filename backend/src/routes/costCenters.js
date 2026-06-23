const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function toApi(row) {
  return { id: row.id, name: row.name, icon: row.icon, color: row.color, active: row.active };
}

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM cost_centers WHERE organization_id=$1 ORDER BY created_at ASC",
      [req.user.organizationId]
    );
    res.json(result.rows.map(toApi));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar centros de custo." });
  }
});

router.post("/", async (req, res) => {
  const { name, icon, color } = req.body;
  if (!name) return res.status(400).json({ error: "Informe o nome." });
  try {
    const result = await pool.query(
      `INSERT INTO cost_centers (organization_id, name, icon, color)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.organizationId, name, icon || "🏷️", color || "#6c63ff"]
    );
    res.status(201).json(toApi(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar centro de custo." });
  }
});

router.put("/:id", async (req, res) => {
  const { name, icon, color, active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE cost_centers SET name=$1, icon=$2, color=$3, active=$4
       WHERE id=$5 AND organization_id=$6 RETURNING *`,
      [name, icon, color, active, req.params.id, req.user.organizationId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Centro de custo não encontrado." });
    res.json(toApi(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar centro de custo." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM cost_centers WHERE id=$1 AND organization_id=$2 RETURNING id",
      [req.params.id, req.user.organizationId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Centro de custo não encontrado." });
    res.json({ message: "Centro de custo removido." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao remover centro de custo." });
  }
});

module.exports = router;
