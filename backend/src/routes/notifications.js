const express = require("express");
const webpush = require("web-push");
const pool    = require("../db/pool");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:rodrigoprofissional07@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Retorna a chave pública VAPID para o frontend
router.get("/vapid-public-key", (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

// Salva subscription do dispositivo
router.post("/subscribe", authenticate, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: "Subscription inválida" });

  try {
    await pool.query(
      `INSERT INTO push_subscriptions (organization_id, user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE SET updated_at = NOW()`,
      [
        req.user.organizationId,
        req.user.id,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
      ]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("subscribe error:", e);
    res.status(500).json({ error: "Erro ao salvar subscription" });
  }
});

// Remove subscription
router.post("/unsubscribe", authenticate, async (req, res) => {
  const { endpoint } = req.body;
  await pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
  res.json({ ok: true });
});

// Cron endpoint — chamado pelo Vercel Cron às 8h BRT (11h UTC)
// Protegido por secret header para evitar chamadas externas
router.post("/send-daily", async (req, res) => {
  const secret = req.headers["x-cron-secret"];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const today    = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    // Busca lançamentos vencidos hoje ou vencendo amanhã, agrupados por organização
    const { rows: txRows } = await pool.query(`
      SELECT t.organization_id,
             COUNT(*) FILTER (WHERE t.date = $1 AND t.status IN ('pendente','vencido') AND t.type='expense') AS hoje_exp,
             SUM(t.amount) FILTER (WHERE t.date = $1 AND t.status IN ('pendente','vencido') AND t.type='expense') AS hoje_val,
             COUNT(*) FILTER (WHERE t.date = $2 AND t.status = 'pendente' AND t.type='expense') AS amanha_exp,
             SUM(t.amount) FILTER (WHERE t.date = $2 AND t.status = 'pendente' AND t.type='expense') AS amanha_val,
             COUNT(*) FILTER (WHERE t.date = $1 AND t.status = 'pendente' AND t.type='income') AS hoje_inc,
             SUM(t.amount) FILTER (WHERE t.date = $1 AND t.status = 'pendente' AND t.type='income') AS hoje_inc_val
      FROM transactions t
      WHERE t.date IN ($1, $2)
        AND t.status IN ('pendente', 'vencido')
      GROUP BY t.organization_id
    `, [today, tomorrow]);

    if (txRows.length === 0) return res.json({ sent: 0 });

    // Busca todas as subscriptions das organizações relevantes
    const orgIds = txRows.map(r => r.organization_id);
    const { rows: subs } = await pool.query(
      `SELECT * FROM push_subscriptions WHERE organization_id = ANY($1)`,
      [orgIds]
    );

    const fmt = (v) => new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format(v || 0);

    let sent = 0;
    const toDelete = [];

    for (const sub of subs) {
      const orgData = txRows.find(r => r.organization_id === sub.organization_id);
      if (!orgData) continue;

      const lines = [];
      if (parseInt(orgData.hoje_exp) > 0)
        lines.push(`💸 A pagar hoje: ${fmt(orgData.hoje_val)} (${orgData.hoje_exp} lanç.)`);
      if (parseInt(orgData.amanha_exp) > 0)
        lines.push(`⏰ Vence amanhã: ${fmt(orgData.amanha_val)} (${orgData.amanha_exp} lanç.)`);
      if (parseInt(orgData.hoje_inc) > 0)
        lines.push(`💰 A receber hoje: ${fmt(orgData.hoje_inc_val)}`);

      if (lines.length === 0) continue;

      const payload = JSON.stringify({
        title: "FINOVO — Resumo do dia",
        body: lines.join("\n"),
        url: "/",
        tag: "finovo-daily",
      });

      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(pushSub, payload);
        sent++;
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          toDelete.push(sub.endpoint);
        } else {
          console.error("push error:", e.message);
        }
      }
    }

    // Remove subscriptions expiradas
    if (toDelete.length > 0) {
      await pool.query("DELETE FROM push_subscriptions WHERE endpoint = ANY($1)", [toDelete]);
    }

    res.json({ sent, deleted: toDelete.length });
  } catch (e) {
    console.error("send-daily error:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
