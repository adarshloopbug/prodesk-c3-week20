const fs = require('fs');
const path = require('path');
const os = require('os');

// Ensure vault directory exists for generated receipts (safe for Vercel/Lambda read-only filesystems)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;
const VAULT_DIR = isServerless
  ? path.join(os.tmpdir(), 'vault', 'invoices')
  : path.join(__dirname, '..', 'vault', 'invoices');

try {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
  }
} catch (err) {
  // Silent fallback for restricted environments
}

// Initial seed data
const initialUsers = [
  {
    id: 'usr_admin_croft',
    username: 'cfo_croft',
    name: 'Evelyn Croft',
    role: 'Admin',
    email: 'evelyn.croft@nexuscorporateservices.com',
    title: 'Chief Financial Officer',
    organization: 'Nexus Corporate Services LLC'
  },
  {
    id: 'client_apex',
    username: 'client_apex',
    name: 'Marcus Vance',
    role: 'Client',
    email: 'marcus.vance@apextechnologies.io',
    title: 'VP of Technology & Infrastructure',
    organization: 'Apex Technologies Inc.',
    address: '450 Lexington Ave, 18th Floor, New York, NY 10017',
    taxId: 'US-EIN-12-9847291'
  },
  {
    id: 'client_meridian',
    username: 'client_meridian',
    name: 'Elena Rostova',
    role: 'Client',
    email: 'e.rostova@meridianglobal.com',
    title: 'Managing Director of Operations',
    organization: 'Meridian Global Logistics',
    address: '747 3rd Ave, 22nd Floor, New York, NY 10017',
    taxId: 'US-EIN-45-8172943'
  },
  {
    id: 'client_vanguard',
    username: 'client_vanguard',
    name: 'David Chen',
    role: 'Client',
    email: 'david.chen@vanguardfintech.com',
    title: 'Chief Risk Officer',
    organization: 'Vanguard Financial Analytics',
    address: '200 West St, New York, NY 10282',
    taxId: 'US-EIN-88-2940182'
  }
];

const initialInvoices = [
  {
    id: 'inv_apex_101',
    invoiceNumber: 'NEX-2026-101',
    clientId: 'client_apex',
    clientName: 'Marcus Vance',
    clientEmail: 'marcus.vance@apextechnologies.io',
    organization: 'Apex Technologies Inc.',
    clientAddress: '450 Lexington Ave, 18th Floor, New York, NY 10017',
    issueDate: '2026-11-01',
    dueDate: '2026-11-30',
    status: 'Outstanding', // 'Outstanding' | 'Paid' | 'Processing'
    currency: 'USD',
    subtotal: 26000.00,
    taxRate: 0.08875, // NYC Tax
    taxAmount: 2500.00,
    totalAmount: 28500.00,
    projectCode: 'APEX-CORE-Q4',
    description: 'Q4 Enterprise Cloud Infrastructure & SOC2 Governance Advisory',
    items: [
      {
        description: 'Multi-Region Distributed Cloud Architecture Security Audit',
        quantity: 1,
        unitPrice: 15000.00,
        amount: 15000.00
      },
      {
        description: 'SOC2 Type II Compliance Readiness Strategy & Policy Drafting',
        quantity: 1,
        unitPrice: 8500.00,
        amount: 8500.00
      },
      {
        description: 'Executive Risk Assessment & Board Deliverables Dossier',
        quantity: 1,
        unitPrice: 2500.00,
        amount: 2500.00
      }
    ],
    notes: 'Payment terms: Due within 30 days. Late wire transfers incur 1.5% monthly penalty. Instant settlement available via VaultPay corporate credit portal.',
    stripePaymentIntentId: null,
    stripeChargeId: null,
    paidAt: null,
    pdfFilename: null,
    emailReceiptSentAt: null
  },
  {
    id: 'inv_apex_102',
    invoiceNumber: 'NEX-2026-092',
    clientId: 'client_apex',
    clientName: 'Marcus Vance',
    clientEmail: 'marcus.vance@apextechnologies.io',
    organization: 'Apex Technologies Inc.',
    clientAddress: '450 Lexington Ave, 18th Floor, New York, NY 10017',
    issueDate: '2026-09-15',
    dueDate: '2026-10-15',
    status: 'Paid',
    currency: 'USD',
    subtotal: 13000.00,
    taxRate: 0.0769,
    taxAmount: 1000.00,
    totalAmount: 14000.00,
    projectCode: 'APEX-FIN-01',
    description: 'B2B Payment Orchestration Blueprint',
    items: [
      {
        description: 'Payment Gateway Evaluation & Latency Optimization',
        quantity: 1,
        unitPrice: 13000.00,
        amount: 13000.00
      }
    ],
    notes: 'Paid in full via VaultPay Portal. Transaction verified.',
    stripePaymentIntentId: 'pi_3M4Pz7LkdIwHu7ix04XyZ9a8',
    stripeChargeId: 'ch_3M4Pz7LkdIwHu7ix04XyZ9a8',
    paidAt: '2026-10-14T16:45:00.000Z',
    pdfFilename: 'NEX-2026-092_RECEIPT_PAID.pdf',
    emailReceiptSentAt: '2026-10-14T16:45:05.000Z'
  },
  {
    id: 'inv_meridian_201',
    invoiceNumber: 'NEX-2026-201',
    clientId: 'client_meridian',
    clientName: 'Elena Rostova',
    clientEmail: 'e.rostova@meridianglobal.com',
    organization: 'Meridian Global Logistics',
    clientAddress: '747 3rd Ave, 22nd Floor, New York, NY 10017',
    issueDate: '2026-11-05',
    dueDate: '2026-12-05',
    status: 'Outstanding',
    currency: 'USD',
    subtotal: 41300.00,
    taxRate: 0.0895,
    taxAmount: 3700.00,
    totalAmount: 45000.00,
    projectCode: 'MGL-SUPPLY-NAV',
    description: 'Global Supply Chain Optimization & Customs Protocol Overhaul',
    items: [
      {
        description: 'Trans-Atlantic Freight Route Topology & Cost Re-engineering',
        quantity: 1,
        unitPrice: 25000.00,
        amount: 25000.00
      },
      {
        description: 'Automated Regulatory Customs Clearance Protocol Implementation',
        quantity: 1,
        unitPrice: 13000.00,
        amount: 13000.00
      },
      {
        description: 'CFO Level Risk Matrix & Executive Workshop',
        quantity: 1,
        unitPrice: 3300.00,
        amount: 3300.00
      }
    ],
    notes: 'Net 30. Payment strictly managed under Nexus Corporate Master Services Agreement.',
    stripePaymentIntentId: null,
    stripeChargeId: null,
    paidAt: null,
    pdfFilename: null,
    emailReceiptSentAt: null
  },
  {
    id: 'inv_meridian_202',
    invoiceNumber: 'NEX-2026-180',
    clientId: 'client_meridian',
    clientName: 'Elena Rostova',
    clientEmail: 'e.rostova@meridianglobal.com',
    organization: 'Meridian Global Logistics',
    clientAddress: '747 3rd Ave, 22nd Floor, New York, NY 10017',
    issueDate: '2026-08-01',
    dueDate: '2026-08-31',
    status: 'Paid',
    currency: 'USD',
    subtotal: 17000.00,
    taxRate: 0.0882,
    taxAmount: 1500.00,
    totalAmount: 18500.00,
    projectCode: 'MGL-AUDIT-08',
    description: 'Q3 Vendor Performance & SLA Audit',
    items: [
      {
        description: 'Vendor SLA Diagnostic & Contract Renegotiation Playbook',
        quantity: 1,
        unitPrice: 17000.00,
        amount: 17000.00
      }
    ],
    notes: 'Settled electronically.',
    stripePaymentIntentId: 'pi_3L7Yk1BcdExWv8jy12AzB1c2',
    stripeChargeId: 'ch_3L7Yk1BcdExWv8jy12AzB1c2',
    paidAt: '2026-08-28T11:20:00.000Z',
    pdfFilename: 'NEX-2026-180_RECEIPT_PAID.pdf',
    emailReceiptSentAt: '2026-08-28T11:20:06.000Z'
  },
  {
    id: 'inv_vanguard_301',
    invoiceNumber: 'NEX-2026-301',
    clientId: 'client_vanguard',
    clientName: 'David Chen',
    clientEmail: 'david.chen@vanguardfintech.com',
    organization: 'Vanguard Financial Analytics',
    clientAddress: '200 West St, New York, NY 10282',
    issueDate: '2026-11-10',
    dueDate: '2026-12-10',
    status: 'Outstanding',
    currency: 'USD',
    subtotal: 29500.00,
    taxRate: 0.0847,
    taxAmount: 2500.00,
    totalAmount: 32000.00,
    projectCode: 'VFA-ALGO-GOV',
    description: 'Algorithmic Financial Risk Modeling Governance',
    items: [
      {
        description: 'Quantitative Risk Framework Model Validation',
        quantity: 1,
        unitPrice: 20000.00,
        amount: 20000.00
      },
      {
        description: 'Federal Reserve Supervisory Letter Compliance Mapping',
        quantity: 1,
        unitPrice: 9500.00,
        amount: 9500.00
      }
    ],
    notes: 'High-priority institutional engagement.',
    stripePaymentIntentId: null,
    stripeChargeId: null,
    paidAt: null,
    pdfFilename: null,
    emailReceiptSentAt: null
  }
];

class Store {
  constructor() {
    this.users = [...initialUsers];
    this.invoices = JSON.parse(JSON.stringify(initialInvoices));
    this.auditLogs = [];
  }

  // Reset to initial seed state (useful for tests)
  reset() {
    this.users = [...initialUsers];
    this.invoices = JSON.parse(JSON.stringify(initialInvoices));
    this.auditLogs = [];
  }

  // User operations
  getUserById(id) {
    return this.users.find(u => u.id === id);
  }

  getUserByUsername(username) {
    return this.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  getAllClients() {
    return this.users.filter(u => u.role === 'Client');
  }

  // Invoice operations
  getAllInvoices() {
    return this.invoices;
  }

  getInvoiceById(id) {
    return this.invoices.find(inv => inv.id === id);
  }

  getInvoicesByClientId(clientId) {
    return this.invoices.filter(inv => inv.clientId === clientId);
  }

  createInvoice(invoiceData) {
    const newInvoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      invoiceNumber: `NEX-2026-${Math.floor(100 + Math.random() * 900)}`,
      issueDate: new Date().toISOString().split('T')[0],
      status: 'Outstanding',
      currency: 'USD',
      stripePaymentIntentId: null,
      stripeChargeId: null,
      paidAt: null,
      pdfFilename: null,
      emailReceiptSentAt: null,
      ...invoiceData
    };

    // Calculate subtotal and tax if not calculated
    if (!newInvoice.subtotal && Array.isArray(newInvoice.items)) {
      newInvoice.subtotal = newInvoice.items.reduce((sum, item) => sum + (item.amount || item.unitPrice * item.quantity), 0);
    }
    if (newInvoice.taxRate && !newInvoice.taxAmount) {
      newInvoice.taxAmount = parseFloat((newInvoice.subtotal * newInvoice.taxRate).toFixed(2));
    }
    if (!newInvoice.totalAmount) {
      newInvoice.totalAmount = parseFloat(((newInvoice.subtotal || 0) + (newInvoice.taxAmount || 0)).toFixed(2));
    }

    this.invoices.unshift(newInvoice);
    this.logAudit('INVOICE_CREATED', `Invoice ${newInvoice.invoiceNumber} created for ${newInvoice.organization} ($${newInvoice.totalAmount})`);
    return newInvoice;
  }

  updateInvoice(id, updates) {
    const index = this.invoices.findIndex(inv => inv.id === id);
    if (index === -1) return null;

    this.invoices[index] = {
      ...this.invoices[index],
      ...updates
    };

    return this.invoices[index];
  }

  markInvoicePaid(id, paymentDetails = {}) {
    const invoice = this.getInvoiceById(id);
    if (!invoice) return null;

    const updated = this.updateInvoice(id, {
      status: 'Paid',
      paidAt: paymentDetails.paidAt || new Date().toISOString(),
      stripePaymentIntentId: paymentDetails.paymentIntentId || invoice.stripePaymentIntentId,
      stripeChargeId: paymentDetails.chargeId || paymentDetails.paymentIntentId || `ch_${Date.now()}`,
      pdfFilename: paymentDetails.pdfFilename || invoice.pdfFilename,
      emailReceiptSentAt: paymentDetails.emailReceiptSentAt || invoice.emailReceiptSentAt
    });

    this.logAudit('PAYMENT_CONFIRMED', `Invoice ${invoice.invoiceNumber} ($${invoice.totalAmount}) settled via Stripe. Status updated to PAID.`);
    return updated;
  }

  // Audit trail
  logAudit(action, description, meta = {}) {
    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      description,
      meta
    };
    this.auditLogs.unshift(entry);
    return entry;
  }

  getAuditLogs() {
    return this.auditLogs.slice(0, 50);
  }
}

const storeInstance = new Store();
module.exports = storeInstance;
