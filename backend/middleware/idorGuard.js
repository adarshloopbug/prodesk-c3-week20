const store = require('../db/store');

/**
 * Zero-Trust IDOR (Insecure Direct Object Reference) Prevention Guard
 *
 * Verifies that the authenticated user either:
 * 1. Has 'Admin' role (Nexus CFO Evelyn Croft or authorized finance admin)
 * 2. Has 'Client' role AND explicitly owns the target invoice (invoice.clientId === req.user.id)
 *
 * If Client A (ID: client_apex) attempts to query an invoice belonging to Client B
 * (e.g. inv_meridian_201), the server intercepts this and returns HTTP 403 Forbidden.
 */
function requireInvoiceOwnership(req, res, next) {
  const invoiceId = req.params.id || req.params.invoiceId;

  if (!invoiceId) {
    return res.status(400).json({
      error: 'Bad Request: Missing invoice identifier.',
      code: 'MISSING_INVOICE_ID'
    });
  }

  const invoice = store.getInvoiceById(invoiceId);

  if (!invoice) {
    return res.status(404).json({
      error: `Invoice '${invoiceId}' was not found in the VaultPay ledger.`,
      code: 'INVOICE_NOT_FOUND'
    });
  }

  // Admins have organization-wide clearance to all records
  if (req.user.role === 'Admin') {
    req.invoice = invoice;
    return next();
  }

  // Zero-Trust verification: Verify client identity against invoice ownership
  if (invoice.clientId !== req.user.id) {
    // Record security violation in audit log
    store.logAudit(
      'IDOR_ATTEMPT_INTERCEPTED',
      `SECURITY ALERT: Client ${req.user.name} (${req.user.id}) attempted unauthorized access to invoice ${invoiceId} (owned by ${invoice.organization} / ${invoice.clientId})`,
      {
        attackerId: req.user.id,
        attackerName: req.user.name,
        targetInvoiceId: invoiceId,
        legitimateOwnerId: invoice.clientId,
        route: req.originalUrl,
        method: req.method,
        ip: req.ip
      }
    );

    return res.status(403).json({
      error: 'Forbidden: Access denied. You do not have permission to access or operate on this invoice.',
      code: 'IDOR_ACCESS_DENIED',
      details: {
        securityViolation: 'Insecure Direct Object Reference (IDOR) prevented by Zero-Trust API Guard.',
        requestedInvoiceId: invoiceId,
        userClientId: req.user.id
      }
    });
  }

  // User is verified owner of this invoice
  req.invoice = invoice;
  next();
}

module.exports = {
  requireInvoiceOwnership
};
