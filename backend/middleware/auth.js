const jwt = require('jsonwebtoken');
const config = require('../config');
const store = require('../db/store');

/**
 * Verifies JWT from Authorization: Bearer <token>
 * Attaches authenticated user object to req.user
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or malformed authorization header. Bearer token required.',
      code: 'AUTH_MISSING_TOKEN'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = store.getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized: User account associated with token no longer exists.',
        code: 'AUTH_USER_NOT_FOUND'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized: Token has expired. Please log in again.',
        code: 'AUTH_TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      error: 'Unauthorized: Cryptographic token validation failed.',
      code: 'AUTH_TOKEN_INVALID'
    });
  }
}

/**
 * Role-Based Access Control (RBAC) middleware
 * Ensures current user has one of the required roles
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized: Authentication required before role verification.',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      store.logAudit('RBAC_VIOLATION_BLOCKED', `User ${req.user.id} (${req.user.role}) denied access to ${req.originalUrl}. Required: [${allowedRoles.join(', ')}]`);
      return res.status(403).json({
        error: `Forbidden: Access denied. Role '${req.user.role}' is not authorized to access this resource. Required: [${allowedRoles.join(', ')}].`,
        code: 'RBAC_FORBIDDEN',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
}

module.exports = {
  authenticateJWT,
  requireRole
};
