/**
 * Cria a primeira organização e o primeiro usuário admin.
 * Uso: npm run seed
 *
 * Pode customizar via variáveis de ambiente antes de rodar, ex:
 *   ORG_NAME="Minha Empresa" ADMIN_NAME="Maria" ADMIN_EMAIL="maria@x.com" ADMIN_PASSWORD="senha123" npm run seed
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("./pool");

async function seed() {
  const orgName      = process.env.ORG_NAME      || "Minha Empresa";
  const adminName     = process.env.ADMIN_NAME     || "Administrador";
  const adminEmail    = process.env.ADMIN_EMAIL    || "admin@finovo.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query("SELECT id FROM users WHERE email = $1", [adminEmail]);
    if (existing.rows.length > 0) {
      console.log(`⚠ Usuário com email "${adminEmail}" já existe. Nada foi criado.`);
      await client.query("ROLLBACK");
      return;
    }

    const orgRes = await client.query(
      "INSERT INTO organizations (name) VALUES ($1) RETURNING id",
      [orgName]
    );
    const orgId = orgRes.rows[0].id;

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await client.query(
      `INSERT INTO users (organization_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin')`,
      [orgId, adminName, adminEmail, passwordHash]
    );

    // Centros de custo padrão para a nova organização
    const defaultCC = [
      ["Administrativo", "🏢"],
      ["Comercial", "💼"],
      ["Operacional", "⚙️"],
      ["Marketing", "📣"],
    ];
    for (const [name, icon] of defaultCC) {
      await client.query(
        "INSERT INTO cost_centers (organization_id, name, icon) VALUES ($1,$2,$3)",
        [orgId, name, icon]
      );
    }

    await client.query("COMMIT");
    console.log("✓ Organização e usuário admin criados com sucesso!");
    console.log("──────────────────────────────────────────────");
    console.log(`  Organização : ${orgName}`);
    console.log(`  Email       : ${adminEmail}`);
    console.log(`  Senha       : ${adminPassword}`);
    console.log("──────────────────────────────────────────────");
    console.log("  Troque a senha após o primeiro login.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("✗ Erro ao criar seed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
