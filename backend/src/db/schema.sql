-- ════════════════════════════════════════════════════════════════════════
-- FINOVO — Schema do banco de dados (PostgreSQL)
-- Multi-empresa: toda tabela de dados tem organization_id para isolamento
-- ════════════════════════════════════════════════════════════════════════

-- Extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Auth em 2 etapas ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empresas (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  nome       TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  criado_em  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  email      TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  tipo       TEXT NOT NULL DEFAULT 'usuario',
  criado_em  TIMESTAMP DEFAULT NOW(),
  UNIQUE(empresa_id, email)
);

CREATE TABLE IF NOT EXISTS configuracoes (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  empresa_id TEXT NOT NULL UNIQUE REFERENCES empresas(id) ON DELETE CASCADE
);

-- ── Organizações (empresas/contas) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Usuários ────────────────────────────────────────────────────────────────
-- Cada usuário pertence a UMA organização e tem um papel (role)
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);

-- ── Contas bancárias ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  bank            TEXT,
  type            TEXT NOT NULL DEFAULT 'corrente',
  balance         NUMERIC(14,2) NOT NULL DEFAULT 0,
  color           TEXT DEFAULT '#6c63ff',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_accounts_org ON accounts(organization_id);

-- ── Contatos (clientes/fornecedores) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT DEFAULT 'outro',
  email           TEXT,
  phone           TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(organization_id);

-- ── Centros de custo ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cost_centers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  icon            TEXT DEFAULT '🏷️',
  color           TEXT DEFAULT '#6c63ff',
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_costcenters_org ON cost_centers(organization_id);

-- ── Categorias personalizadas (categorias padrão ficam só no frontend) ───
CREATE TABLE IF NOT EXISTS categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('expense','income')),
  icon            TEXT DEFAULT '🏷️',
  color           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categories_org ON categories(organization_id);

-- ── Transações (lançamentos) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "desc"                  TEXT NOT NULL,
  amount                  NUMERIC(14,2) NOT NULL,
  type                    TEXT NOT NULL CHECK (type IN ('expense','income')),
  category                TEXT NOT NULL,
  date                    DATE NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','vencido','cancelado')),
  paid_at                 DATE,
  account_id              UUID REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id              UUID REFERENCES contacts(id) ON DELETE SET NULL,
  cost_center_id          UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  recurrence              TEXT DEFAULT 'none',
  recurrence_group_id     UUID,
  recurrence_group_name   TEXT,
  recurrence_index        INTEGER,
  recurrence_total        INTEGER,
  recurrence_mode         TEXT,
  recurrence_freq         TEXT,
  notes                   TEXT,
  source                  TEXT DEFAULT 'manual',
  attachment              TEXT,            -- base64 data URL
  attachment_name         TEXT,
  import_batch_id         UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tx_org        ON transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_tx_org_date   ON transactions(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_tx_org_type   ON transactions(organization_id, type);
CREATE INDEX IF NOT EXISTS idx_tx_recurrence ON transactions(recurrence_group_id);
CREATE INDEX IF NOT EXISTS idx_tx_batch      ON transactions(import_batch_id);
