const stripePackage = require('stripe');
const crypto = require('crypto');
const config = require('../config');
const store = require('../db/store');
const pdfService = require('./pdfService');
const emailService = require('./emailService');

// Initialize Stripe instance
let stripe = null;
try {
  stripe = stripePackage(config.stripeSecretKey);
} catch (err) {
  console.warn('[StripeService] Stripe initialization notice:', err.message);
}

class StripeService {
  /**
   * Creates a Stripe Payment Intent for an invoice
   * @param {Object} invoice
   * @returns {Promise<Object>}
   */
  async createPaymentIntent(invoice) {
    if (invoice.status === 'Paid') {
      throw new Error(`Invoice ${invoice.invoiceNumber} is already settled in full.`);
    }

    const amountInCents = Math.round(invoice.totalAmount * 100);

    if (config.stripeSecretKey.startsWith('sk_test_51Mock') || !stripe) {
      const mockIntentId = `pi_${invoice.id}_${Date.now()}`;
      const mockClientSecret = `${mockIntentId}_secret_${Math.random().toString(36).substring(2, 10)}`;

      store.updateInvoice(invoice.id, {
        stripePaymentIntentId: mockIntentId
      });

      return {
        clientSecret: mockClientSecret,
        paymentIntentId: mockIntentId,
        amount: invoice.totalAmount,
        currency: 'usd',
        isMockMode: true
      };
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientId: invoice.clientId,
          clientEmail: invoice.clientEmail,
          organization: invoice.organization
        },
        description: `Nexus Corporate Services Contract: ${invoice.invoiceNumber} - ${invoice.organization}`
      });

      store.updateInvoice(invoice.id, {
        stripePaymentIntentId: paymentIntent.id
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: invoice.totalAmount,
        currency: 'usd',
        isMockMode: false
      };
    } catch (err) {
      console.error('[StripeService] Stripe API createPaymentIntent error:', err);
      throw err;
    }
  }

  /**
   * Mathematically verifies the cryptographic signature of the webhook payload
   * using stripe.webhooks.constructEvent.
   *
   * @param {Buffer|string} rawBody - Raw request body
   * @param {string} signatureHeader - The 'stripe-signature' HTTP header
   * @returns {Object} Verified Stripe Event object
   */
  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!signatureHeader) {
      throw new Error('Missing stripe-signature header.');
    }

    // Call official Stripe SDK constructEvent
    const event = stripePackage.webhooks.constructEvent(
      rawBody,
      signatureHeader,
      config.stripeWebhookSecret
    );

    return event;
  }

  /**
   * Orchestrates the post-payment settlement flow:
   * 1. Updates invoice in DB to 'Paid'
   * 2. Generates dynamic PDF with PAID stamp & Nexus branding
   * 3. Dispatches PDF receipt to client via Nodemailer
   * 4. Logs cryptographic audit record
   *
   * @param {Object} event - Verified Stripe event
   * @returns {Promise<Object>}
   */
  async processPaymentSuccessEvent(event) {
    const paymentObject = event.data.object;
    const invoiceId = paymentObject.metadata ? paymentObject.metadata.invoiceId : null;

    if (!invoiceId) {
      store.logAudit('WEBHOOK_WARNING', 'Received payment_intent.succeeded with missing metadata.invoiceId', paymentObject);
      return { skipped: true, reason: 'Missing invoiceId in metadata' };
    }

    const invoice = store.getInvoiceById(invoiceId);
    if (!invoice) {
      store.logAudit('WEBHOOK_ERROR', `Invoice not found for ID: ${invoiceId}`);
      throw new Error(`Invoice ${invoiceId} not found in database.`);
    }

    // Idempotency: If already paid, do not re-process or duplicate email
    if (invoice.status === 'Paid') {
      return {
        success: true,
        invoice,
        alreadyProcessed: true,
        message: `Invoice ${invoice.invoiceNumber} was already marked as Paid.`
      };
    }

    // Step 1: Mark invoice as Paid
    const chargeId = paymentObject.charges && paymentObject.charges.data && paymentObject.charges.data.length > 0
      ? paymentObject.charges.data[0].id
      : (paymentObject.id || `ch_${Date.now()}`);

    const updatedInvoice = store.markInvoicePaid(invoiceId, {
      paidAt: new Date().toISOString(),
      paymentIntentId: paymentObject.id,
      chargeId: chargeId
    });

    // Step 2: Dynamic PDF Generation with Nexus Logo & PAID stamp
    const { filePath, fileName, buffer } = await pdfService.generateInvoicePDF(updatedInvoice, { saveToDisk: true });

    store.updateInvoice(invoiceId, {
      pdfFilename: fileName
    });
    updatedInvoice.pdfFilename = fileName;

    // Step 3: Automated Email Delivery via Nodemailer
    const emailResult = await emailService.sendPaymentReceiptEmail(updatedInvoice, buffer, fileName);

    store.updateInvoice(invoiceId, {
      emailReceiptSentAt: new Date().toISOString()
    });
    updatedInvoice.emailReceiptSentAt = new Date().toISOString();

    return {
      success: true,
      invoice: updatedInvoice,
      pdfGenerated: fileName,
      emailSent: emailResult.success
    };
  }

  /**
   * Helper utility for testing & simulated triggers:
   * Generates genuine Stripe signature header using official Stripe SDK
   */
  createSignedWebhookPayload(eventPayload, secret = config.stripeWebhookSecret) {
    const payloadString = typeof eventPayload === 'string' ? eventPayload : JSON.stringify(eventPayload);
    const signatureHeader = stripePackage.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret: secret
    });

    return {
      rawBody: Buffer.from(payloadString, 'utf8'),
      signatureHeader: signatureHeader
    };
  }
}

const stripeServiceInstance = new StripeService();
module.exports = stripeServiceInstance;
