/**
 * Roda o schema.sql contra o banco configurado em DATABASE_URL.
 * Uso: npm run migrate
 */
const fs = require("fs");
const path = require("path");
const pool = require("./pool");

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  console.log("→ Executando schema.sql ...");
  try {
    await pool.query(sql);
    console.log("✓ Migração concluída com sucesso.");
  } catch (err) {
    console.error("✗ Erro ao migrar:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
