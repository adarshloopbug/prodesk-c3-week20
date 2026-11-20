# VaultPay Financial Core
### Nexus Corporate Services LLC — Strategic Financial Portal & Document Vault
**Client**: Evelyn Croft, Chief Financial Officer  
**Location**: One World Trade Center, Suite 8400, New York, NY 10007, USA  
**Project Code Name**: `VaultPay Financial Core`  
**Target Contract Value**: $5,000 to $50,000 per engagement  

---

## Executive Summary & Problem Resolution

| Previous Manual Process | The Business Problem | VaultPay Financial Core Resolution |
| :--- | :--- | :--- |
| Manual Word PDF drafting & email dispatch | Human error, missing line-item records | Automated dynamic PDF generation with official **PAID** seal |
| Waiting on manual bank wire transfers | **45-day average delay in accounts receivable (AR)** | Instant settlement via corporate credit card through Stripe |
| Decentralized spreadsheets | No central portal for past invoices & receipts | Role-based portal with Document Vault & native downloads |
| Unverified client notifications | Spoofable client payment claims | **Cryptographically verified Stripe Webhooks** as single source of truth |
| Risk of cross-client data exposure | Insecure Direct Object Reference (IDOR) | **Zero-Trust API Guard** returning HTTP 403 Forbidden |

---

## Architecture Blueprint

```
                      ┌──────────────────────────────────────────────┐
                      │    VaultPay Financial Core Web Portal        │
                      │  (React / Next.js / Vite / Tailwind Design)  │
                      └───────┬──────────────────────────────▲───────┘
                              │                              │
                  Bearer JWT  │                 Native PDF   │ Instant UI
                 Auth / REST  │                 Stream (Blob)│ Updates
                              ▼                              │
┌────────────────────────────────────────────────────────────┴──────────────────────┐
│                            VaultPay Zero-Trust Express API                        │
│                                                                                   │
│  [JWT Authenticator] ──> [RBAC Route Guard] ──> [IDOR Ownership Interceptor]       │
│                                                          │                        │
│                                           403 Forbidden if Client A               │
│                                            attempts to query Client B             │
└───────────────▲──────────────────────────────────────────┬────────────────────────┘
                │                                          │
    Cryptographic Signature                                │ Triggers Dynamic
     HMAC-SHA256 (Raw Buffer)                              │ Generation & Delivery
                │                                          │
┌───────────────┴───────────────┐          ┌───────────────▼────────────────────────┐
│     Stripe Webhook Gateway    │          │  PDFKit Vault & Nodemailer Dispatcher  │
│  (stripe.webhooks.construct)  │          │  • High-Fidelity "PAID" Stamp Badge    │
│  • payment_intent.succeeded   │          │  • Executive Signatory (Evelyn Croft)  │
│  • Idempotent DB state change │          │  • Automated Email Attachment Delivery │
└───────────────────────────────┘          └────────────────────────────────────────┘
```

---

## Requirements Verification Matrix

### TRACK A: FRONTEND ENGINEERS (React / Next.js)

#### 1. Strict RBAC (Role-Based Access Control) UI
- **Admin View**:
  - Master Treasury Dashboard displaying total volume billed ($138,000+), revenue collected ($32,500+), and pending receivables ($105,500+).
  - Cross-client ledger with real-time status badges (`✓ PAID` vs `⏳ OUTSTANDING`).
  - Invoice creation modal for high-value B2B contracts ($5,000 to $50,000) with dynamic line items and automated tax calculation.
- **Client View**:
  - Filtered exclusively to the authenticated client's invoices (`Apex Technologies Inc.` or `Meridian Global Logistics`).
  - Shows outstanding balance requiring action vs. settled invoices.
- **The Security Guard (Route Guard)**:
  - If a Client user attempts to navigate directly to `/admin/dashboard`, `RouteGuard.jsx` intercepts the transition and kicks them out to `/403` (Unauthorized / Forbidden page).
  - Dedicated `/403` screen displays the security violation and provides safe navigation back to the Client portal or credential elevation.

#### 2. The Checkout Flow (Idiot-Proofing)
- **Immediate Action Lock**: Upon clicking "Pay Invoice" or "Confirm & Pay", the button enters an unclickable `disabled` state with a high-visibility animated spinner.
- **Double-Click Defense**: A mutable memory ref lock (`lockRef.current = true`) executes synchronously before any asynchronous event loop tick. Rapid repeated clicks are discarded instantly, preventing duplicate Stripe charge attempts.
- **Network Latency Handling**: Multi-stage state machine guides the user through secure TLS handshake, bank authorization, and webhook verification without freezing.

#### 3. The Document Vault
- **Invoice Detail View**: Clean corporate invoice dossier featuring Nexus Corporate Services seal, client billing address, itemized deliverables, payment terms, and CFO Evelyn Croft signature block.
- **Native Browser Download**: "Download Official PDF" button issues an authenticated request to `GET /api/invoices/:id/pdf` and streams the binary blob directly into the browser's native download manager.
- **Authentic "PAID" Watermark**: When status transitions to `Paid`, the document displays an angled green rubber stamp with settlement timestamp and Stripe transaction reference.

---

### TRACK B: FULLSTACK ENGINEERS (Node.js / Express / Stripe)

#### 1. Zero-Trust API (IDOR Prevention)
- **Every route validates JWT** via `authenticateJWT` middleware (`Authorization: Bearer <token>`).
- **`requireInvoiceOwnership` Middleware**:
  - Client A (`client_apex`) sending `GET /api/invoices/inv_meridian_201` (Client B's invoice) is intercepted.
  - The server checks `invoice.clientId === req.user.id`.
  - Since ownership fails, the server responds with **HTTP 403 Forbidden** (`code: IDOR_ACCESS_DENIED`).
  - An entry is logged to the immutable security audit trail.
  - The frontend never receives cross-tenant data.

#### 2. Stripe Webhooks (The Source of Truth)
- Endpoint: `POST /api/webhooks/stripe`.
- Configured with `express.raw({ type: '*/*' })` to preserve the exact binary payload bytes.
- Signature verification executes:
  ```javascript
  const event = stripe.webhooks.constructEvent(
    rawBody,
    req.headers['stripe-signature'],
    process.env.STRIPE_WEBHOOK_SECRET
  );
  ```
- Any altered or forged signature is mathematically rejected with **HTTP 400 Bad Request**.
- Valid `payment_intent.succeeded` events trigger an idempotent database update setting `status: 'Paid'`, recording the charge ID and settlement timestamp.

#### 3. Automated PDF Generation & Delivery
- Dynamic PDF generation via `pdfkit` in `pdfService.js`:
  - Vector crest and Navy/Gold corporate color scheme.
  - Client billing address, itemized rate tables, tax breakdown, and terms.
  - Rotated double-line **"PAID"** rubber stamp watermark with timestamp and Stripe charge ID.
- Automated email dispatch via `nodemailer` in `emailService.js`:
  - Dispatches an executive HTML email to the client's registered address.
  - Attaches the newly generated PDF receipt (`NEX-2026-xxx_PAID.pdf`).
  - Records delivery in the audit trail.

---

## Automated Security Test Suite

The system includes an automated test suite in `backend/tests/security.test.js`:

```powershell
npm test
```

### Verified Test Results (18/18 Passing):
```
====================================================
  VAULTPAY ZERO-TRUST & RBAC SECURITY TEST SUITE    
  Target: Nexus Corporate Services Financial Core   
====================================================

[STAGE 1] Testing JWT Authentication & Identity Issuance...
  [PASS] ✓ Admin (Evelyn Croft) successfully authenticated with signed JWT
  [PASS] ✓ Client A (Apex Technologies) authenticated with signed JWT
  [PASS] ✓ Client B (Meridian Global) authenticated with signed JWT

[STAGE 2] Testing Zero-Trust IDOR Prevention Guard...
  [PASS] ✓ Client A successfully viewed their own invoice (inv_apex_101)
  [PASS] ✓ IDOR ATTACK INTERCEPTED: Client A received HTTP 403 Forbidden when requesting Client B invoice (inv_meridian_201)
  [PASS] ✓ IDOR ATTACK ON PDF VAULT INTERCEPTED: Client A blocked from streaming Client B PDF
  [PASS] ✓ Admin Clearance: Evelyn Croft successfully viewed invoice inv_meridian_201 across accounts

[STAGE 3] Testing Strict RBAC Enforcement...
  [PASS] ✓ RBAC BLOCKED: Client denied permission to create invoices (HTTP 403)
  [PASS] ✓ Admin successfully generated high-value contract invoice (NEX-2026-410)
  [PASS] ✓ Data Isolation Verified: Client listing is 100% scoped to own records

[STAGE 4] Testing Stripe Webhook Cryptographic Verification...
  [PASS] ✓ Missing stripe-signature header rejected with HTTP 400
  [PASS] ✓ Forged HMAC signature mathematically rejected with HTTP 400
  [PASS] ✓ Cryptographically authentic Stripe Webhook verified and processed (HTTP 200)
  [PASS] ✓ Invoice status transitioned from Outstanding -> Paid in database

[STAGE 5] Testing Dynamic PDF Generation & Email Dispatch...
  [PASS] ✓ Dynamic PDF receipt generated: NEX-2026-101_PAID_...pdf
  [PASS] ✓ Automated email receipt dispatched to: marcus.vance@apextechnologies.io
  [PASS] ✓ Native browser PDF download stream verified with valid PDF magic bytes

[STAGE 6] Testing Idiot-Proofing & Double-Charge Protection...
  [PASS] ✓ Double-Charge Protection: Prevented initializing payment for already settled invoice

====================================================
  ALL TESTS COMPLETED: 18 PASSED, 0 FAILED
====================================================
```

---

## Pre-Configured Demo Accounts for Evaluation

| User / Role | Identity | Organization | Access Level |
| :--- | :--- | :--- | :--- |
| **Evelyn Croft** (Admin) | `cfo_croft` | Nexus Corporate Services LLC | Full Master Treasury & Invoice Generation |
| **Marcus Vance** (Client A) | `client_apex` | Apex Technologies Inc. | Scoped to Apex Invoices (`inv_apex_101`, `102`) |
| **Elena Rostova** (Client B) | `client_meridian` | Meridian Global Logistics | Scoped to Meridian Invoices (`inv_meridian_201`, `202`) |
| **David Chen** (Client C) | `client_vanguard` | Vanguard Financial Analytics | Scoped to Vanguard Invoices (`inv_vanguard_301`) |

---

## How to Run

### 1. Unified Production Full-Stack Mode
```powershell
npm start
```
Starts the full-stack server on `http://localhost:5000`. The Express server serves both the REST API, the Stripe Webhook receiver, and the built React SPA frontend.

### 2. Run Test Suite
```powershell
npm test
```
Runs the 18 automated security and verification checks.
