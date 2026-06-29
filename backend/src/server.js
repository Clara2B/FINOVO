require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const transactionsRoutes = require("./routes/transactions");
const accountsRoutes = require("./routes/accounts");
const contactsRoutes = require("./routes/contacts");
const costCentersRoutes = require("./routes/costCenters");
const categoriesRoutes = require("./routes/categories");
const notificationsRoutes = require("./routes/notifications");
const adminRoutes         = require("./routes/admin");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json({ limit: "15mb" })); // limite maior por causa dos anexos em base64

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/cost-centers", costCentersRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/admin",         adminRoutes);

// Rota de migração única — remover após executar
app.post("/api/migrate/email-unique", async (req, res) => {
  if (req.headers["x-migrate-secret"] !== "finovo-migrate-2026") {
    return res.status(401).json({ error: "Não autorizado" });
  }
  const pool = require("./db/pool");
  const client = await pool.connect();
  try {
    await client.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key");
    await client.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_org_email_unique");
    await client.query("ALTER TABLE users ADD CONSTRAINT users_org_email_unique UNIQUE (organization_id, email)");
    client.release();
    res.json({ ok: true, msg: "Migração concluída." });
  } catch(e) {
    client.release();
    res.status(500).json({ error: e.message });
  }
});

// Handler genérico de erro (fallback)
app.use((err, req, res, next) => {
  console.error("Erro não tratado:", err);
  res.status(500).json({ error: "Erro interno do servidor." });
});

app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 FINOVO API rodando em http://localhost:${PORT}`);
});
