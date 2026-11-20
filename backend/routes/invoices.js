const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const { requireInvoiceOwnership } = require('../middleware/idorGuard');
const pdfService = require('../services/pdfService');
const stripeService = require('../services/stripeService');
const emailService = require('../services/emailService');

/**
 * GET /api/invoices
 * Lists invoices based on RBAC:
 * - Admin: Sees all invoices across the firm + revenue summaries
 * - Client: Sees ONLY their own invoices (strictly filtered by req.user.id)
 */
router.get('/', authenticateJWT, (req, res) => {
  if (req.user.role === 'Admin') {
    const allInvoices = store.getAllInvoices();
    const clients = store.getAllClients();

    // Financial Metrics for CFO Evelyn Croft
    const totalRevenueBilled = allInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalRevenueCollected = allInvoices
      .filter(inv => inv.status === 'Paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalOutstanding = allInvoices
      .filter(inv => inv.status !== 'Paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    return res.json({
      role: 'Admin',
      invoices: allInvoices,
      clients,
      metrics: {
        totalRevenueBilled,
        totalRevenueCollected,
        totalOutstanding,
        paidCount: allInvoices.filter(inv => inv.status === 'Paid').length,
        outstandingCount: allInvoices.filter(inv => inv.status !== 'Paid').length,
        totalInvoices: allInvoices.length,
        averageContractValue: allInvoices.length ? Math.round(totalRevenueBilled / allInvoices.length) : 0
      }
    });
  }

  // Client view: Zero-Trust filtering
  const clientInvoices = store.getInvoicesByClientId(req.user.id);
  const totalBilled = clientInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = clientInvoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalDue = clientInvoices.filter(inv => inv.status !== 'Paid').reduce((sum, inv) => sum + inv.totalAmount, 0);

  return res.json({
    role: 'Client',
    client: {
      id: req.user.id,
      name: req.user.name,
      organization: req.user.organization,
      email: req.user.email
    },
    invoices: clientInvoices,
    metrics: {
      totalBilled,
      totalPaid,
      totalDue,
      outstandingCount: clientInvoices.filter(inv => inv.status !== 'Paid').length
    }
  });
});

/**
 * POST /api/invoices
 * Admin only: Create a new corporate invoice
 */
router.post('/', authenticateJWT, requireRole('Admin'), (req, res) => {
  const {
    clientId,
    organization,
    clientName,
    clientEmail,
    clientAddress,
    items,
    dueDate,
    description,
    notes,
    projectCode,
    taxRate
  } = req.body;

  if (!clientId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'Invalid invoice payload. Client selection and at least one line item are required.',
      code: 'INVALID_INVOICE_DATA'
    });
  }

  // Lookup client if name/email not provided
  const targetClient = store.getUserById(clientId);

  const newInvoice = store.createInvoice({
    clientId,
    organization: organization || (targetClient ? targetClient.organization : 'Corporate Client'),
    clientName: clientName || (targetClient ? targetClient.name : 'Authorized Signatory'),
    clientEmail: clientEmail || (targetClient ? targetClient.email : 'billing@client.com'),
    clientAddress: clientAddress || (targetClient ? targetClient.address : 'Corporate Address'),
    items,
    dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    description: description || 'Professional Strategic Consultancy',
    notes: notes || 'Due within 30 days. Payable via VaultPay instant payment portal.',
    projectCode: projectCode || `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
    taxRate: typeof taxRate === 'number' ? taxRate : 0.08875
  });

  return res.status(201).json({
    message: `Invoice ${newInvoice.invoiceNumber} successfully created.`,
    invoice: newInvoice
  });
});

/**
 * GET /api/invoices/:id
 * Protected by JWT + requireInvoiceOwnership (IDOR Guard)
 * If Client A queries Client B's invoice -> Returns 403 Forbidden
 */
router.get('/:id', authenticateJWT, requireInvoiceOwnership, (req, res) => {
  // req.invoice is set by requireInvoiceOwnership
  return res.json({
    invoice: req.invoice,
    accessGrantedAs: req.user.role,
    ownershipVerified: true
  });
});

/**
 * GET /api/invoices/:id/pdf
 * Dynamically generates and streams the invoice / receipt PDF
 * Protected by JWT + requireInvoiceOwnership
 */
router.get('/:id/pdf', authenticateJWT, requireInvoiceOwnership, async (req, res) => {
  try {
    const invoice = req.invoice;
    const { buffer, fileName } = await pdfService.generateInvoicePDF(invoice, { saveToDisk: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}_${invoice.status.toUpperCase()}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('X-Invoice-Number', invoice.invoiceNumber);
    res.setHeader('X-Invoice-Status', invoice.status);

    return res.end(buffer);
  } catch (err) {
    console.error('[InvoicesRoute] PDF generation error:', err);
    return res.status(500).json({
      error: 'Failed to generate PDF document.',
      details: err.message
    });
  }
});

/**
 * POST /api/invoices/:id/create-payment-intent
 * Creates a Stripe Payment Intent for paying this invoice
 * Protected by JWT + requireInvoiceOwnership
 */
router.post('/:id/create-payment-intent', authenticateJWT, requireInvoiceOwnership, async (req, res) => {
  try {
    const invoice = req.invoice;

    if (invoice.status === 'Paid') {
      return res.status(400).json({
        error: `Invoice ${invoice.invoiceNumber} is already settled in full.`,
        code: 'INVOICE_ALREADY_PAID'
      });
    }

    const intentData = await stripeService.createPaymentIntent(invoice);

    return res.json({
      message: 'Payment intent initialized.',
      ...intentData
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Unable to initialize Stripe payment.',
      details: err.message
    });
  }
});

/**
 * POST /api/invoices/:id/pay
 * Simulates completing payment and invokes the settlement workflow
 * (Also available for frontends using test/simulation checkout)
 * Protected by JWT + requireInvoiceOwnership
 */
router.post('/:id/pay', authenticateJWT, requireInvoiceOwnership, async (req, res) => {
  try {
    const invoice = req.invoice;

    if (invoice.status === 'Paid') {
      return res.status(400).json({
        error: `Invoice ${invoice.invoiceNumber} is already paid.`,
        code: 'ALREADY_PAID'
      });
    }

    // Synthesize verified payment success event matching Stripe's payload
    const mockChargeId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const syntheticEvent = {
      id: `evt_${Date.now()}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: invoice.stripePaymentIntentId || `pi_${Date.now()}`,
          amount: Math.round(invoice.totalAmount * 100),
          currency: 'usd',
          charges: {
            data: [{ id: mockChargeId }]
          },
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            clientId: invoice.clientId
          }
        }
      }
    };

    const settlementResult = await stripeService.processPaymentSuccessEvent(syntheticEvent);

    return res.json({
      message: `Payment successful! Invoice ${invoice.invoiceNumber} marked as PAID.`,
      result: settlementResult
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Payment processing failed.',
      details: err.message
    });
  }
});

/**
 * GET /api/invoices/admin/audit-logs
 * Admin only: View security & transaction audit trails
 */
router.get('/admin/audit-logs', authenticateJWT, requireRole('Admin'), (req, res) => {
  return res.json({
    logs: store.getAuditLogs(),
    recentEmails: emailService.getRecentSentEmails()
  });
});

module.exports = router;
