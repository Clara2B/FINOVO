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
