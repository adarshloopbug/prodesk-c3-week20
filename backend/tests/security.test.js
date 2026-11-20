const request = require('supertest');
const assert = require('assert');
const { app } = require('../server');
const store = require('../db/store');
const stripeService = require('../services/stripeService');
const config = require('../config');

async function runSecurityTestSuite() {
  console.log('====================================================');
  console.log('  VAULTPAY ZERO-TRUST & RBAC SECURITY TEST SUITE    ');
  console.log('  Target: Nexus Corporate Services Financial Core   ');
  console.log('====================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function pass(msg) {
    console.log(`  [PASS] ✓ ${msg}`);
    passedTests++;
  }

  function fail(msg, err) {
    console.error(`  [FAIL] ✗ ${msg}:`, err ? (err.message || err) : '');
    failedTests++;
  }

  // Reset store to known baseline
  store.reset();

  try {
    // -------------------------------------------------------------------
    // 1. AUTHENTICATION & TOKEN ACQUISITION
    // -------------------------------------------------------------------
    console.log('[STAGE 1] Testing JWT Authentication & Identity Issuance...');

    // Admin Login (Evelyn Croft)
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'cfo_croft' });
    assert.strictEqual(adminRes.status, 200);
    assert.ok(adminRes.body.token);
    assert.strictEqual(adminRes.body.user.role, 'Admin');
    const adminToken = adminRes.body.token;
    pass('Admin (Evelyn Croft) successfully authenticated with signed JWT');

    // Client A Login (Marcus Vance - Apex Technologies)
    const clientARes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'client_apex' });
    assert.strictEqual(clientARes.status, 200);
    assert.ok(clientARes.body.token);
    assert.strictEqual(clientARes.body.user.id, 'client_apex');
    const clientAToken = clientARes.body.token;
    pass('Client A (Apex Technologies) authenticated with signed JWT');

    // Client B Login (Elena Rostova - Meridian Global)
    const clientBRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'client_meridian' });
    assert.strictEqual(clientBRes.status, 200);
    assert.ok(clientBRes.body.token);
    assert.strictEqual(clientBRes.body.user.id, 'client_meridian');
    const clientBToken = clientBRes.body.token;
    pass('Client B (Meridian Global) authenticated with signed JWT');

    // -------------------------------------------------------------------
    // 2. IDOR PREVENTION (Track B - Requirement 1)
    // -------------------------------------------------------------------
    console.log('\n[STAGE 2] Testing Zero-Trust IDOR Prevention Guard...');

    // Client A accessing Client A's own invoice (inv_apex_101) -> Should SUCCEED
    const clientAOwnRes = await request(app)
      .get('/api/invoices/inv_apex_101')
      .set('Authorization', `Bearer ${clientAToken}`);
    assert.strictEqual(clientAOwnRes.status, 200);
    assert.strictEqual(clientAOwnRes.body.invoice.id, 'inv_apex_101');
    assert.strictEqual(clientAOwnRes.body.invoice.clientId, 'client_apex');
    pass('Client A successfully viewed their own invoice (inv_apex_101)');

    // IDOR ATTACK: Client A attempting to access Client B's invoice (inv_meridian_201)
    const idorAttackRes = await request(app)
      .get('/api/invoices/inv_meridian_201')
      .set('Authorization', `Bearer ${clientAToken}`);
    
    assert.strictEqual(
      idorAttackRes.status,
      403,
      `Expected HTTP 403 Forbidden for IDOR attempt, got ${idorAttackRes.status}`
    );
    assert.strictEqual(idorAttackRes.body.code, 'IDOR_ACCESS_DENIED');
    pass('IDOR ATTACK INTERCEPTED: Client A received HTTP 403 Forbidden when requesting Client B invoice (inv_meridian_201)');

    // IDOR ATTACK VIA PDF DOWNLOAD: Client A attempting to download Client B's PDF
    const idorPdfRes = await request(app)
      .get('/api/invoices/inv_meridian_201/pdf')
      .set('Authorization', `Bearer ${clientAToken}`);
    assert.strictEqual(idorPdfRes.status, 403);
    pass('IDOR ATTACK ON PDF VAULT INTERCEPTED: Client A blocked from streaming Client B PDF');

    // Admin Clearance: Admin should be able to access any invoice
    const adminInvoiceRes = await request(app)
      .get('/api/invoices/inv_meridian_201')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(adminInvoiceRes.status, 200);
    assert.strictEqual(adminInvoiceRes.body.accessGrantedAs, 'Admin');
    pass('Admin Clearance: Evelyn Croft successfully viewed invoice inv_meridian_201 across accounts');

    // -------------------------------------------------------------------
    // 3. STRICT RBAC CHECKS (Track A - Requirement 1)
    // -------------------------------------------------------------------
    console.log('\n[STAGE 3] Testing Strict RBAC Enforcement...');

    // Client A trying to create an invoice (Admin-only action)
    const unauthorizedCreateRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${clientAToken}`)
      .send({
        clientId: 'client_apex',
        items: [{ description: 'Unauthorized Invoice', quantity: 1, unitPrice: 5000, amount: 5000 }]
      });
    assert.strictEqual(unauthorizedCreateRes.status, 403);
    assert.strictEqual(unauthorizedCreateRes.body.code, 'RBAC_FORBIDDEN');
    pass('RBAC BLOCKED: Client denied permission to create invoices (HTTP 403)');

    // Admin creating a legitimate high-value contract invoice ($38,500)
    const adminCreateRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        clientId: 'client_vanguard',
        organization: 'Vanguard Financial Analytics',
        clientName: 'David Chen',
        clientEmail: 'david.chen@vanguardfintech.com',
        description: 'B2B Capital Adequacy Stress Testing',
        items: [
          { description: 'Monte Carlo Portfolio Stress Test Simulation', quantity: 1, unitPrice: 28500, amount: 28500 },
          { description: 'Regulatory Capital Ratio Filing Dossier', quantity: 1, unitPrice: 10000, amount: 10000 }
        ],
        dueDate: '2026-12-15'
      });
    assert.strictEqual(adminCreateRes.status, 201);
    assert.strictEqual(adminCreateRes.body.invoice.totalAmount, 41916.88); // With NYC Tax
    pass(`Admin successfully generated high-value contract invoice (${adminCreateRes.body.invoice.invoiceNumber})`);

    // Zero-Trust Data Isolation on List Endpoint
    const clientListRes = await request(app)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${clientAToken}`);
    assert.strictEqual(clientListRes.status, 200);
    assert.ok(clientListRes.body.invoices.every(inv => inv.clientId === 'client_apex'));
    pass('Data Isolation Verified: Client listing is 100% scoped to own records');

    // -------------------------------------------------------------------
    // 4. STRIPE WEBHOOKS CRYPTOGRAPHIC INTEGRITY (Track B - Requirement 2)
    // -------------------------------------------------------------------
    console.log('\n[STAGE 4] Testing Stripe Webhook Cryptographic Verification...');

    const targetInvoice = store.getInvoiceById('inv_apex_101');
    assert.strictEqual(targetInvoice.status, 'Outstanding');

    // Webhook test payload string
    const webhookEvent = {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_3N8xYz7AbC123',
          object: 'payment_intent',
          amount: Math.round(targetInvoice.totalAmount * 100),
          currency: 'usd',
          status: 'succeeded',
          charges: {
            data: [{ id: 'ch_test_998877665544' }]
          },
          metadata: {
            invoiceId: targetInvoice.id,
            invoiceNumber: targetInvoice.invoiceNumber,
            clientId: targetInvoice.clientId
          }
        }
      }
    };

    const payloadString = JSON.stringify(webhookEvent);

    // Subtest 4a: Webhook with missing signature header -> Must fail with 400
    const noSigRes = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .send(payloadString);
    assert.strictEqual(noSigRes.status, 400);
    assert.strictEqual(noSigRes.body.code, 'MISSING_SIGNATURE');
    pass('Missing stripe-signature header rejected with HTTP 400');

    // Subtest 4b: Webhook with forged / tampered HMAC signature -> Must fail with 400
    const forgedSigHeader = `t=${Math.floor(Date.now() / 1000)},v1=00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff`;
    const forgedRes = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', forgedSigHeader)
      .send(payloadString);
    assert.strictEqual(forgedRes.status, 400);
    assert.strictEqual(forgedRes.body.code, 'INVALID_SIGNATURE');
    pass('Forged HMAC signature mathematically rejected with HTTP 400');

    // Subtest 4c: Webhook with AUTHENTIC HMAC-SHA256 signature -> Must succeed with 200
    const { signatureHeader } = stripeService.createSignedWebhookPayload(
      payloadString,
      config.stripeWebhookSecret
    );

    const validWebhookRes = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signatureHeader)
      .send(payloadString);

    assert.strictEqual(validWebhookRes.status, 200);
    assert.strictEqual(validWebhookRes.body.received, true);
    assert.strictEqual(validWebhookRes.body.processed, true);
    pass('Cryptographically authentic Stripe Webhook verified and processed (HTTP 200)');

    // Verify database state change
    const updatedInvoice = store.getInvoiceById('inv_apex_101');
    assert.strictEqual(updatedInvoice.status, 'Paid');
    assert.ok(updatedInvoice.paidAt);
    assert.strictEqual(updatedInvoice.stripeChargeId, 'ch_test_998877665544');
    pass('Invoice status transitioned from Outstanding -> Paid in database');

    // -------------------------------------------------------------------
    // 5. AUTOMATED PDF RECEIPT & EMAIL DELIVERY (Track B - Requirement 3)
    // -------------------------------------------------------------------
    console.log('\n[STAGE 5] Testing Dynamic PDF Generation & Email Dispatch...');

    assert.ok(updatedInvoice.pdfFilename, 'Invoice should have pdfFilename populated');
    assert.ok(updatedInvoice.emailReceiptSentAt, 'Invoice should have emailReceiptSentAt populated');
    pass(`Dynamic PDF receipt generated: ${updatedInvoice.pdfFilename}`);
    pass(`Automated email receipt dispatched to: ${updatedInvoice.clientEmail}`);

    // Native PDF Stream download test
    const pdfDownloadRes = await request(app)
      .get(`/api/invoices/${updatedInvoice.id}/pdf`)
      .set('Authorization', `Bearer ${clientAToken}`);

    assert.strictEqual(pdfDownloadRes.status, 200);
    assert.strictEqual(pdfDownloadRes.header['content-type'], 'application/pdf');
    assert.ok(pdfDownloadRes.header['content-disposition'].includes('attachment'));
    // Check PDF magic bytes '%PDF-'
    const magicBytes = pdfDownloadRes.body.slice(0, 4).toString('utf8');
    assert.strictEqual(magicBytes, '%PDF', 'Returned binary stream must be a valid PDF document');
    pass('Native browser PDF download stream verified with valid PDF magic bytes');

    // -------------------------------------------------------------------
    // 6. IDIOT-PROOFING & CONCURRENCY PROTECTION (Track A - Requirement 2)
    // -------------------------------------------------------------------
    console.log('\n[STAGE 6] Testing Idiot-Proofing & Double-Charge Protection...');

    // Attempting to pay an already settled invoice
    const duplicatePayRes = await request(app)
      .post(`/api/invoices/${updatedInvoice.id}/create-payment-intent`)
      .set('Authorization', `Bearer ${clientAToken}`);

    assert.strictEqual(duplicatePayRes.status, 400);
    assert.strictEqual(duplicatePayRes.body.code, 'INVOICE_ALREADY_PAID');
    pass('Double-Charge Protection: Prevented initializing payment for already settled invoice');

    console.log('\n====================================================');
    console.log(`  ALL TESTS COMPLETED: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('====================================================\n');

    return { passedTests, failedTests };
  } catch (err) {
    fail('Critical test execution error', err);
    return { passedTests, failedTests };
  }
}

// Run if called directly
if (require.main === module) {
  runSecurityTestSuite().then(({ failedTests }) => {
    process.exit(failedTests > 0 ? 1 : 0);
  });
}

module.exports = { runSecurityTestSuite };
