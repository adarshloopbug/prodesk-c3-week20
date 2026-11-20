const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripeService');
const store = require('../db/store');
const config = require('../config');
const { authenticateJWT } = require('../middleware/auth');
const { requireInvoiceOwnership } = require('../middleware/idorGuard');

/**
 * POST /api/webhooks/stripe
 * Public webhook endpoint called directly by Stripe's servers.
 *
 * CRITICAL SECURITY REQUIREMENT:
 * Uses stripe.webhooks.constructEvent to mathematically verify the HMAC-SHA256
 * cryptographic signature from the 'stripe-signature' header against the raw body.
 * If signature verification fails, the request is REJECTED with 400 Bad Request.
 * If signature is valid, updates invoice to status: 'Paid', generates PDF, and sends email.
 */
router.post('/stripe', express.raw({ type: '*/*' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    store.logAudit('WEBHOOK_REJECTED', 'Webhook request received without stripe-signature header.');
    return res.status(400).json({
      error: 'Missing required stripe-signature header.',
      code: 'MISSING_SIGNATURE'
    });
  }

  let event;
  try {
    // req.body is the raw Buffer from express.raw
    const payload = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '', 'utf8');
    event = stripeService.verifyWebhookSignature(payload, sig);
  } catch (err) {
    store.logAudit('WEBHOOK_SIGNATURE_FAILED', `Cryptographic verification failed: ${err.message}`);
    console.error(`[Webhook] Signature verification failed: ${err.message}`);
    return res.status(400).json({
      error: `Webhook Error: Cryptographic signature verification failed: ${err.message}`,
      code: 'INVALID_SIGNATURE'
    });
  }

  // Handle relevant event types
  store.logAudit('WEBHOOK_EVENT_VERIFIED', `Cryptographically verified Stripe event: ${event.type} (ID: ${event.id})`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'checkout.session.completed':
      case 'charge.succeeded': {
        const result = await stripeService.processPaymentSuccessEvent(event);
        return res.status(200).json({
          received: true,
          processed: true,
          eventId: event.id,
          invoiceId: result.invoice ? result.invoice.id : null,
          invoiceStatus: result.invoice ? result.invoice.status : null,
          pdfGenerated: result.pdfGenerated || null,
          emailSent: result.emailSent || false
        });
      }

      default:
        // Acknowledge receipt of other events
        return res.status(200).json({
          received: true,
          processed: false,
          ignoredEventType: event.type
        });
    }
  } catch (err) {
    console.error('[Webhook] Error executing post-payment tasks:', err);
    return res.status(500).json({
      error: 'Error processing webhook event actions.',
      details: err.message
    });
  }
});

/**
 * POST /api/webhooks/simulate-webhook
 * Demo / test runner endpoint:
 * Takes an invoiceId, synthesizes an authentic Stripe payment_intent.succeeded event,
 * cryptographically hashes it with HMAC-SHA256 using the real STRIPE_WEBHOOK_SECRET,
 * and passes it directly through the verifyWebhookSignature pipeline!
 */
router.post('/simulate-webhook', express.json(), authenticateJWT, requireInvoiceOwnership, async (req, res) => {
  const { invoiceId, tamperSignature } = req.body;
  const invoice = req.invoice || store.getInvoiceById(invoiceId);
  if (!invoice) {
    return res.status(404).json({ error: `Invoice ${invoiceId} not found.` });
  }

  // Build authentic Stripe Event structure
  const eventPayload = {
    id: `evt_sim_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: `pi_sim_${Date.now()}`,
        object: 'payment_intent',
        amount: Math.round(invoice.totalAmount * 100),
        currency: 'usd',
        status: 'succeeded',
        charges: {
          data: [{ id: `ch_sim_${Date.now()}` }]
        },
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientId: invoice.clientId,
          clientEmail: invoice.clientEmail,
          organization: invoice.organization
        }
      }
    }
  };

  const payloadString = JSON.stringify(eventPayload);
  const { rawBody, signatureHeader } = stripeService.createSignedWebhookPayload(
    payloadString,
    config.stripeWebhookSecret
  );

  const testHeader = tamperSignature ? `${signatureHeader}_TAMPERED_HASH` : signatureHeader;

  try {
    // Perform mathematical cryptographic verification
    const verifiedEvent = stripeService.verifyWebhookSignature(rawBody, testHeader);
    const result = await stripeService.processPaymentSuccessEvent(verifiedEvent);

    return res.json({
      success: true,
      message: 'Webhook signature cryptographically verified and processed successfully!',
      verifiedEventId: verifiedEvent.id,
      invoice: result.invoice,
      pdfGenerated: result.pdfGenerated,
      emailSent: result.emailSent
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: `Cryptographic Signature Verification Blocked: ${err.message}`,
      simulatedTamperDetected: !!tamperSignature
    });
  }
});

module.exports = router;
