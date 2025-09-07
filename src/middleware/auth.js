export const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) return res.status(401).json({ status: 'error', message: 'No autenticado' });
    if (!allowedRoles.length) return next();
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ status:'error', message:'Forbidden. Rol insuficiente' });
    }
    next();
  };