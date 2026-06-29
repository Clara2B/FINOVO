require("dotenv").config();
const pool = require("./pool");

async function run() {
  const client = await pool.connect();
  try {
    // Remove constraint UNIQUE de email na tabela users (permite mesmo email em orgs diferentes)
    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
    `);
    // Garante que a unicidade seja apenas por (organization_id, email)
    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_org_email_unique;
    `);
    await client.query(`
      ALTER TABLE users ADD CONSTRAINT users_org_email_unique UNIQUE (organization_id, email);
    `);
    console.log("Migração concluída: email agora é único por empresa, não global.");
  } catch(e) {
    console.error("Erro:", e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
run();
