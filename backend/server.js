const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const webhookRoutes = require('./routes/webhooks');
const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoices');
const store = require('./db/store');

const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
  exposedHeaders: ['Content-Disposition', 'X-Invoice-Number', 'X-Invoice-Status']
}));

// Webhook routes mounted FIRST before global json parser (preserves raw buffer)
app.use(['/api/webhooks', '/webhooks'], webhookRoutes);

// JSON parser for all remaining API endpoints
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'VaultPay Financial Core',
    firm: config.company.name,
    cfo: config.company.cfo,
    timestamp: new Date().toISOString()
  });
});

// Mount API Routes (support both /api and root prefixes for Vercel proxies)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/invoices', invoiceRoutes);

// Serve Static Frontend if built
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA Fallback for client-side routing
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[VaultPay Server Error]:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'SERVER_ERROR'
  });
});

// Start listener if executed directly
let server = null;
if (require.main === module) {
  server = app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`  VAULTPAY FINANCIAL CORE - NEXUS CORPORATE SERVICES`);
    console.log(`  CFO Evelyn Croft Direct Portal`);
    console.log(`  Unified Full-Stack Listening on: http://localhost:${config.port}`);
    console.log(`  Stripe Webhook: POST http://localhost:${config.port}/api/webhooks/stripe`);
    console.log(`====================================================`);
  });
}

// Export app directly for Vercel Serverless / Service compatibility
module.exports = app;
module.exports.app = app;
module.exports.server = server;
