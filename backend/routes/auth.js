const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const config = require('../config');
const store = require('../db/store');
const { authenticateJWT } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Log in or switch user identity for demonstration
 */
router.post('/login', (req, res) => {
  const { username, userId } = req.body || {};

  let user = null;
  if (userId) {
    user = store.getUserById(userId);
  } else if (username) {
    user = store.getUserByUsername(username);
  }

  if (!user) {
    return res.status(401).json({
      error: 'Invalid credentials. User not found in Nexus directory.',
      code: 'AUTH_FAILED'
    });
  }

  // Generate signed JWT
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      organization: user.organization
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  store.logAudit('USER_LOGIN', `User ${user.name} (${user.role}) authenticated successfully.`);

  return res.json({
    message: `Authentication successful. Welcome, ${user.name}.`,
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      title: user.title,
      organization: user.organization,
      address: user.address
    }
  });
});

/**
 * GET /api/auth/me
 * Get currently authenticated user details
 */
router.get('/me', authenticateJWT, (req, res) => {
  res.json({
    user: req.user
  });
});

/**
 * GET /api/auth/demo-accounts
 * List all available pre-configured accounts for seamless role-switching evaluation
 */
router.get('/demo-accounts', (req, res) => {
  res.json({
    accounts: store.users.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      email: u.email,
      title: u.title,
      organization: u.organization
    }))
  });
});

module.exports = router;
