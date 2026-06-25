const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getToken() {
  return localStorage.getItem("finovo_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("finovo_token", token);
  else localStorage.removeItem("finovo_token");
}

export function getEmpresaToken() {
  return localStorage.getItem("finovo_empresa_token");
}

export function setEmpresaToken(token) {
  if (token) localStorage.setItem("finovo_empresa_token", token);
  else localStorage.removeItem("finovo_empresa_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // Sessão expirada ou inválida — força novo login
  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new CustomEvent("finovo:unauthorized"));
  }

  let data = null;
  try { data = await res.json(); } catch { /* resposta sem corpo */ }

  if (!res.ok) {
    throw new Error(data?.error || `Erro na requisição (${res.status})`);
  }
  return data;
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────
  loginEmpresa: (nome, senha) =>
    request("/auth/empresa", { method: "POST", body: JSON.stringify({ nome, senha }) }),
  loginUsuario: (email, senha, empresaToken) =>
    request("/auth/usuario", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
      headers: { Authorization: `Bearer ${empresaToken}` },
    }),
  registrar: (payload) =>
    request("/auth/registrar", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),
  changePassword: (currentPassword, newPassword) =>
    request("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),

  // ── Users (admin) ─────────────────────────────────────────────────────
  listUsers: () => request("/users"),
  createUser: (payload) => request("/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (id, payload) => request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),

  // ── Transactions ──────────────────────────────────────────────────────
  listTransactions: () => request("/transactions"),
  createTransaction: (payload) => request("/transactions", { method: "POST", body: JSON.stringify(payload) }),
  updateTransaction: (id, payload) => request(`/transactions/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  markTransactionPaid: (id) => request(`/transactions/${id}/pay`, { method: "PATCH" }),
  duplicateTransaction: (id) => request(`/transactions/${id}/duplicate`, { method: "POST" }),
  bulkEditTransactions: (ids, changes) =>
    request("/transactions/bulk", { method: "PATCH", body: JSON.stringify({ ids, changes }) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: "DELETE" }),
  deleteImportBatch: (batchId) => request(`/transactions/batch/${batchId}`, { method: "DELETE" }),
  deleteRecurrenceGroup: (groupId) => request(`/transactions/group/${groupId}`, { method: "DELETE" }),
  updateRecurrenceFrom: (groupId, txId, changes) =>
    request(`/transactions/group/${groupId}/from/${txId}`, { method: "PATCH", body: JSON.stringify(changes) }),
  updateRecurrenceAll: (groupId, changes) =>
    request(`/transactions/group/${groupId}/all`, { method: "PATCH", body: JSON.stringify(changes) }),
  importTransactions: (rows, batchId) =>
    request("/transactions/import", { method: "POST", body: JSON.stringify({ rows, batchId }) }),

  // ── Accounts ──────────────────────────────────────────────────────────
  listAccounts: () => request("/accounts"),
  createAccount: (payload) => request("/accounts", { method: "POST", body: JSON.stringify(payload) }),
  updateAccount: (id, payload) => request(`/accounts/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteAccount: (id) => request(`/accounts/${id}`, { method: "DELETE" }),

  // ── Contacts ──────────────────────────────────────────────────────────
  listContacts: () => request("/contacts"),
  createContact: (payload) => request("/contacts", { method: "POST", body: JSON.stringify(payload) }),
  updateContact: (id, payload) => request(`/contacts/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteContact: (id) => request(`/contacts/${id}`, { method: "DELETE" }),

  // ── Cost Centers ──────────────────────────────────────────────────────
  listCostCenters: () => request("/cost-centers"),
  createCostCenter: (payload) => request("/cost-centers", { method: "POST", body: JSON.stringify(payload) }),
  updateCostCenter: (id, payload) => request(`/cost-centers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCostCenter: (id) => request(`/cost-centers/${id}`, { method: "DELETE" }),

  // ── Categories ────────────────────────────────────────────────────────
  listCategories: () => request("/categories"),
  createCategory: (payload) => request("/categories", { method: "POST", body: JSON.stringify(payload) }),
  updateCategory: (id, payload) => request(`/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: "DELETE" }),
};
