# FINOVO — Sistema de Gestão Financeira

Sistema completo de gestão financeira multi-empresa, com login de usuário e senha,
isolamento de dados por organização, e backend próprio em Node.js + PostgreSQL.

## Estrutura do projeto

```
FINOVO/
├── backend/          → API em Node.js + Express + PostgreSQL
├── frontend/          → Interface em React + Vite
└── docker-compose.yml → Banco de dados PostgreSQL (rodando em container)
```

## Pré-requisitos

- **Node.js** 18 ou mais recente ([nodejs.org](https://nodejs.org))
- **Docker Desktop** instalado e aberto ([docker.com](https://www.docker.com/products/docker-desktop))
  *(usado apenas para rodar o banco de dados PostgreSQL — não precisa instalar Postgres manualmente)*

Se preferir não usar Docker, veja a seção **"Sem Docker"** mais abaixo.

---

## 1. Subir o banco de dados

Na pasta raiz do projeto (`FINOVO/`), rode:

```bash
docker compose up -d
```

Isso cria um banco PostgreSQL rodando em `localhost:5432`, com usuário `finovo`, senha `finovo123` e banco `finovo`.

Para parar o banco depois: `docker compose down` (os dados continuam salvos).
Para apagar todos os dados e começar do zero: `docker compose down -v`.

---

## 2. Configurar e iniciar o backend

```bash
cd backend
npm install
cp .env.example .env
```

Abra o arquivo `.env` que foi criado e **troque o valor de `JWT_SECRET`** por uma string aleatória longa
(é o que assina os logins — pode usar qualquer gerador de senha forte).

Depois, crie as tabelas no banco:

```bash
npm run migrate
```

Crie o primeiro usuário administrador (e a primeira organização/empresa):

```bash
npm run seed
```

Isso vai imprimir no terminal o email e senha do primeiro acesso. Por padrão:
- Email: `admin@finovo.local`
- Senha: `admin123`

Você pode customizar esses valores assim:

```bash
ORG_NAME="Minha Empresa" ADMIN_NAME="Seu Nome" ADMIN_EMAIL="voce@empresa.com" ADMIN_PASSWORD="suasenha123" npm run seed
```

Agora inicie o servidor:

```bash
npm run dev
```

A API estará rodando em **http://localhost:4000**.

---

## 3. Configurar e iniciar o frontend

Em outro terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

O sistema estará disponível em **http://localhost:5173**. Acesse e faça login com o usuário criado no passo anterior.

---

## Como funciona o sistema multi-empresa

- Cada **organização** (empresa) tem seus próprios dados completamente isolados — transações, contas, contatos, centros de custo e categorias de uma organização nunca aparecem para outra.
- Cada **usuário** pertence a exatamente uma organização.
- Existem dois papéis (`role`):
  - **admin** — pode criar, editar e remover outros usuários da mesma organização, além de usar todo o sistema normalmente.
  - **member** — usa o sistema normalmente, mas não pode gerenciar outros usuários.
- **Não há cadastro público.** Novos usuários só podem ser criados por um admin (pela tela de usuários, quando disponível) ou diretamente no backend rodando o script de seed para criar uma nova organização.

### Criando uma segunda empresa (outra "versão" do sistema)

Para ter uma segunda empresa com seus próprios dados, rode o seed novamente com um nome de organização diferente:

```bash
cd backend
ORG_NAME="Outra Empresa" ADMIN_EMAIL="admin@outraempresa.com" ADMIN_PASSWORD="senha456" npm run seed
```

Isso cria uma nova organização isolada com seu próprio admin. Os dados de uma não aparecem na outra.

### Criando mais usuários dentro da mesma empresa

Use a API diretamente (ou aguarde a tela de gerenciamento de usuários no frontend), autenticado como admin:

```bash
curl -X POST http://localhost:4000/api/users \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"name":"Novo Usuário","email":"novo@empresa.com","password":"senha123","role":"member"}'
```

O `SEU_TOKEN_AQUI` é o token retornado no login (visível em `localStorage.finovo_token` no navegador, ou na resposta de `/api/auth/login`).

---

## Sem Docker (Postgres instalado manualmente)

Se preferir instalar o PostgreSQL diretamente na sua máquina em vez de usar Docker:

1. Instale o PostgreSQL 14+ ([postgresql.org/download](https://www.postgresql.org/download/))
2. Crie o banco e usuário:
   ```sql
   CREATE USER finovo WITH PASSWORD 'finovo123';
   CREATE DATABASE finovo OWNER finovo;
   ```
3. No `backend/.env`, ajuste `DATABASE_URL` se necessário (porta, host, etc.)
4. Siga normalmente a partir do passo 2 do guia principal (`npm run migrate`, `npm run seed`, `npm run dev`)

---

## Rodando em produção / outro computador

- O backend pode rodar em qualquer serviço que suporte Node.js + PostgreSQL (Railway, Render, uma VPS própria, etc.)
- Lembre-se de:
  - Trocar `JWT_SECRET` por um valor seguro
  - Ajustar `FRONTEND_URL` no backend para a URL real do frontend (usado para CORS)
  - Ajustar `VITE_API_URL` no frontend para a URL real da API
  - Fazer backup do banco de dados regularmente

---

## Principais funcionalidades

- Login com email e senha, dados isolados por empresa
- Lançamentos (receitas e despesas) com categoria, conta, centro de custo, contato e anexo (NF/boleto)
- Recorrência automática: ao criar um lançamento, é possível gerar várias parcelas futuras de uma vez (semanal, quinzenal, mensal, bimestral, trimestral, semestral, anual)
- Duplicar lançamento existente para criar um novo rapidamente
- Edição em massa de lançamentos selecionados
- Importação de extratos (CSV/Excel/PDF) com edição em massa antes de confirmar
- Contas bancárias, contatos, centros de custo e categorias totalmente customizáveis
- Dashboard, fluxo de caixa e relatórios
