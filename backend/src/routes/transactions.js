const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function toApi(row) {
  return {
    id: row.id,
    desc: row.desc,
    amount: parseFloat(row.amount),
    type: row.type,
    category: row.category,
    date: row.date instanceof Date ? row.date.toISOString().split("T")[0] : row.date,
    status: row.status,
    paidAt: row.paid_at ? (row.paid_at instanceof Date ? row.paid_at.toISOString().split("T")[0] : row.paid_at) : null,
    accountId: row.account_id,
    contactId: row.contact_id,
    costCenterId: row.cost_center_id,
    recurrence: row.recurrence,
    recurrenceGroupId: row.recurrence_group_id,
    recurrenceGroupName: row.recurrence_group_name,
    recurrenceIndex: row.recurrence_index,
    recurrenceTotal: row.recurrence_total,
    recurrenceMode: row.recurrence_mode,
    recurrenceFreq: row.recurrence_freq,
    notes: row.notes,
    source: row.source,
    attachment: row.attachment,
    attachmentName: row.attachment_name,
    importBatchId: row.import_batch_id,
  };
}

// ── GET /api/transactions ─────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM transactions WHERE organization_id = $1 ORDER BY date DESC`,
      [req.user.organizationId]
    );
    res.json(result.rows.map(toApi));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar transações." });
  }
});

function addMonthsClamped(date, monthsToAdd) {
  const d = new Date(date);
  const originalDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + monthsToAdd);
  const lastDayOfTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return d;
}

function buildSeriesDates(startDate, recurrence, installments) {
  const n = Math.max(1, Math.min(parseInt(installments) || 1, 120));
  const start = new Date(startDate + "T12:00:00");
  const dates = [];
  for (let i = 0; i < n; i++) {
    let d;
    if (recurrence === "weekly")      { d = new Date(start); d.setDate(d.getDate() + i * 7); }
    else if (recurrence === "biweekly")   { d = new Date(start); d.setDate(d.getDate() + i * 14); }
    else if (recurrence === "monthly")    d = addMonthsClamped(start, i);
    else if (recurrence === "bimonthly")  d = addMonthsClamped(start, i * 2);
    else if (recurrence === "quarterly")  d = addMonthsClamped(start, i * 3);
    else if (recurrence === "semiannual") d = addMonthsClamped(start, i * 6);
    else if (recurrence === "yearly")     { d = new Date(start); d.setFullYear(d.getFullYear() + i); }
    else d = new Date(start);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

// ── POST /api/transactions ────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const tx = req.body;
  if (!tx.desc || tx.amount === undefined || tx.amount === null) {
    return res.status(400).json({ error: "Informe descrição e valor." });
  }

  const installments = parseInt(tx.installments) || 1;
  const isRecurring = tx.recurrence && tx.recurrence !== "none" && installments > 1;

  try {
    if (isRecurring) {
      const dates = buildSeriesDates(tx.date, tx.recurrence, installments);
      const groupId = require("crypto").randomUUID();
      const client = await pool.connect();
      const created = [];
      try {
        await client.query("BEGIN");
        for (let i = 0; i < dates.length; i++) {
          const result = await client.query(
            `INSERT INTO transactions
              (organization_id, "desc", amount, type, category, date, status, paid_at,
               account_id, contact_id, cost_center_id, recurrence,
               recurrence_group_id, recurrence_group_name, recurrence_index, recurrence_total,
               recurrence_mode, recurrence_freq, notes, source)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
             RETURNING *`,
            [
              req.user.organizationId,
              `${tx.desc} (${i + 1}/${dates.length})`,
              tx.amount,
              tx.type,
              tx.category,
              dates[i],
              i === 0 ? tx.status : "pendente",
              i === 0 ? (tx.paidAt || null) : null,
              tx.accountId || null,
              tx.contactId || null,
              tx.costCenterId || null,
              tx.recurrence,
              groupId,
              tx.desc,
              i + 1,
              dates.length,
              "installments",
              tx.recurrence,
              tx.notes || null,
              tx.source || "manual",
            ]
          );
          created.push(result.rows[0]);
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
      return res.status(201).json({ created: created.map(toApi) });
    }

    // Transação única
    const result = await pool.query(
      `INSERT INTO transactions
        (organization_id, "desc", amount, type, category, date, status, paid_at,
         account_id, contact_id, cost_center_id, recurrence, notes, source,
         attachment, attachment_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        req.user.organizationId,
        tx.desc,
        tx.amount,
        tx.type,
        tx.category,
        tx.date,
        tx.status || "pendente",
        tx.paidAt || null,
        tx.accountId || null,
        tx.contactId || null,
        tx.costCenterId || null,
        tx.recurrence || "none",
        tx.notes || null,
        tx.source || "manual",
        tx.attachment || null,
        tx.attachmentName || null,
      ]
    );
    res.status(201).json(toApi(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar transação." });
  }
});

// ── PUT /api/transactions/:id ─────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const tx = req.body;
  try {
    const result = await pool.query(
      `UPDATE transactions SET
        "desc"=$1, amount=$2, type=$3, category=$4, date=$5, status=$6, paid_at=$7,
        account_id=$8, contact_id=$9, cost_center_id=$10, recurrence=$11, notes=$12,
        attachment=$13, attachment_name=$14, updated_at=now()
       WHERE id=$15 AND organization_id=$16
       RETURNING *`,
      [
        tx.desc, tx.amount, tx.type, tx.category, tx.date, tx.status, tx.paidAt || null,
        tx.accountId || null, tx.contactId || null, tx.costCenterId || null,
        tx.recurrence || "none", tx.notes || null,
        tx.attachment || null, tx.attachmentName || null,
        id, req.user.organizationId,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Transação não encontrada." });
    res.json(toApi(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar transação." });
  }
});

// ── PATCH /api/transactions/:id/pay ──────────────────────────────────────────
router.patch("/:id/pay", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE transactions SET status='pago', paid_at=COALESCE(paid_at, CURRENT_DATE), updated_at=now()
       WHERE id=$1 AND organization_id=$2 RETURNING *`,
      [id, req.user.organizationId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Transação não encontrada." });
    res.json(toApi(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao marcar como pago." });
  }
});

// ── POST /api/transactions/:id/duplicate ─────────────────────────────────────
router.post("/:id/duplicate", async (req, res) => {
  const { id } = req.params;
  try {
    const orig = await pool.query(
      "SELECT * FROM transactions WHERE id=$1 AND organization_id=$2",
      [id, req.user.organizationId]
    );
    if (!orig.rows[0]) return res.status(404).json({ error: "Transação não encontrada." });
    const t = orig.rows[0];
    const result = await pool.query(
      `INSERT INTO transactions
        (organization_id, "desc", amount, type, category, date, status,
         account_id, contact_id, cost_center_id, recurrence, notes, source)
       VALUES ($1,$2,$3,$4,$5,$6,'pendente',$7,$8,$9,'none',$10,$11)
       RETURNING *`,
      [
        req.user.organizationId, t.desc, t.amount, t.type, t.category, t.date,
        t.account_id, t.contact_id, t.cost_center_id, t.notes, t.source,
      ]
    );
    res.status(201).json(toApi(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao duplicar transação." });
  }
});

// ── PATCH /api/transactions/bulk ──────────────────────────────────────────────
router.patch("/bulk", async (req, res) => {
  const { ids, changes } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Informe a lista de ids." });
  }
  const map = {
    date: "date", status: "status", type: "type", category: "category",
    accountId: "account_id", costCenterId: "cost_center_id",
  };
  const fields = [];
  const values = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    if (changes[key] !== undefined) {
      if (changes[key] === "__clear__") {
        fields.push(`${col} = NULL`);
      } else {
        fields.push(`${col} = $${i++}`);
        values.push(changes[key]);
      }
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: "Nada para atualizar." });
  values.push(ids, req.user.organizationId);
  try {
    const result = await pool.query(
      `UPDATE transactions SET ${fields.join(", ")}, updated_at=now()
       WHERE id = ANY($${i++}) AND organization_id = $${i}
       RETURNING *`,
      values
    );
    res.json(result.rows.map(toApi));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro na edição em massa." });
  }
});

// ── PATCH /api/transactions/group/:groupId/from/:txId — este e futuros ────────
router.patch("/group/:groupId/from/:txId", async (req, res) => {
  const { groupId, txId } = req.params;
  const changes = req.body;
  try {
    const pivot = await pool.query(
      "SELECT date FROM transactions WHERE id=$1 AND organization_id=$2",
      [txId, req.user.organizationId]
    );
    if (!pivot.rows[0]) return res.status(404).json({ error: "Lançamento não encontrado." });
    const pivotDate = pivot.rows[0].date;

    const result = await pool.query(
      `UPDATE transactions SET
        "desc"=COALESCE($1,"desc"), amount=COALESCE($2,amount), type=COALESCE($3,type),
        category=COALESCE($4,category), status=COALESCE($5,status),
        account_id=COALESCE($6,account_id), contact_id=COALESCE($7,contact_id),
        cost_center_id=COALESCE($8,cost_center_id), notes=COALESCE($9,notes),
        updated_at=now()
       WHERE recurrence_group_id=$10 AND organization_id=$11 AND date >= $12
       RETURNING *`,
      [
        changes.desc || null, changes.amount || null, changes.type || null,
        changes.category || null, changes.status || null,
        changes.accountId || null, changes.contactId || null,
        changes.costCenterId || null, changes.notes || null,
        groupId, req.user.organizationId, pivotDate,
      ]
    );
    res.json(result.rows.map(toApi));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar série de recorrência." });
  }
});

// ── PATCH /api/transactions/group/:groupId/all — todos da série ───────────────
router.patch("/group/:groupId/all", async (req, res) => {
  const { groupId } = req.params;
  const changes = req.body;
  try {
    const result = await pool.query(
      `UPDATE transactions SET
        "desc"=COALESCE($1,"desc"), amount=COALESCE($2,amount), type=COALESCE($3,type),
        category=COALESCE($4,category), status=COALESCE($5,status),
        account_id=COALESCE($6,account_id), contact_id=COALESCE($7,contact_id),
        cost_center_id=COALESCE($8,cost_center_id), notes=COALESCE($9,notes),
        updated_at=now()
       WHERE recurrence_group_id=$10 AND organization_id=$11
       RETURNING *`,
      [
        changes.desc || null, changes.amount || null, changes.type || null,
        changes.category || null, changes.status || null,
        changes.accountId || null, changes.contactId || null,
        changes.costCenterId || null, changes.notes || null,
        groupId, req.user.organizationId,
      ]
    );
    res.json(result.rows.map(toApi));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar todos os lançamentos da série." });
  }
});

// ── DELETE /api/transactions/:id ──────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM transactions WHERE id=$1 AND organization_id=$2 RETURNING id",
      [req.params.id, req.user.organizationId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Transação não encontrada." });
    res.json({ message: "Transação removida." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao remover transação." });
  }
});

// ── DELETE /api/transactions/batch/:batchId ───────────────────────────────────
router.delete("/batch/:batchId", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM transactions WHERE import_batch_id=$1 AND organization_id=$2 RETURNING id",
      [req.params.batchId, req.user.organizationId]
    );
    res.json({ message: `${result.rows.length} transações removidas.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao desfazer importação." });
  }
});

// ── DELETE /api/transactions/group/:groupId ───────────────────────────────────
router.delete("/group/:groupId", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM transactions WHERE recurrence_group_id=$1 AND organization_id=$2 RETURNING id",
      [req.params.groupId, req.user.organizationId]
    );
    res.json({ message: `${result.rows.length} transações removidas.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao remover série de recorrência." });
  }
});

// ── POST /api/transactions/import ─────────────────────────────────────────────
router.post("/import", async (req, res) => {
  const { rows, batchId } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "Nenhuma linha para importar." });
  }
  const finalBatchId = batchId || require("crypto").randomUUID();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const created = [];
    for (const r of rows) {
      const result = await client.query(
        `INSERT INTO transactions
          (organization_id, "desc", amount, type, category, date, status,
           account_id, cost_center_id, notes, source, import_batch_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'import',$11)
         RETURNING *`,
        [
          req.user.organizationId, r.desc, r.amount, r.type, r.category, r.date,
          r.status || "pendente", r.accountId || null, r.costCenterId || null,
          r.notes || null, finalBatchId,
        ]
      );
      created.push(result.rows[0]);
    }
    await client.query("COMMIT");
    res.status(201).json({ batchId: finalBatchId, created: created.map(toApi) });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Erro ao importar transações." });
  } finally {
    client.release();
  }
});

module.exports = router;
