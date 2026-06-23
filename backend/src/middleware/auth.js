const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Token de autenticação não enviado." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Token de empresa não pode acessar rotas de aplicação
    if (payload.etapa === "empresa") {
      return res.status(401).json({ error: "Complete o login com seu usuário para acessar esta área." });
    }

    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin" && req.user?.role !== "dono") {
    return res.status(403).json({ error: "Apenas administradores podem realizar esta ação." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
