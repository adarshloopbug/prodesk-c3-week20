const nodemailer = require('nodemailer');
const config = require('../config');
const store = require('../db/store');

class EmailService {
  constructor() {
    this.transporter = null;
    this.sentEmails = [];
    this.initTransporter();
  }

  async initTransporter() {
    try {
      // In production or test environment, configure standard transport
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
      } else {
        // Fallback to jsonTransport or Ethereal for zero-dependency local testing
        this.transporter = nodemailer.createTransport({
          jsonTransport: true
        });
      }
    } catch (err) {
      console.error('[EmailService] Error initializing transporter:', err);
    }
  }

  /**
   * Sends payment receipt PDF to client
   * @param {Object} invoice
   * @param {Buffer} pdfBuffer
   * @param {string} pdfFilename
   */
  async sendPaymentReceiptEmail(invoice, pdfBuffer, pdfFilename) {
    if (!this.transporter) {
      await this.initTransporter();
    }

    const clientEmail = invoice.clientEmail || 'client@corporate.example.com';
    const amountFormatted = `$${Number(invoice.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    const paidDate = invoice.paidAt ? new Date(invoice.paidAt).toUTCString() : new Date().toUTCString();

    const mailOptions = {
      from: `"${config.company.name} VaultPay" <${config.company.email}>`,
      to: clientEmail,
      subject: `[CONFIDENTIAL] Official Receipt: Settled Invoice ${invoice.invoiceNumber} - ${amountFormatted} USD`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: #0f172a; padding: 28px; color: #ffffff; border-bottom: 4px solid #d97706; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
            .header p { margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; }
            .content { padding: 32px; }
            .badge { display: inline-block; background-color: #ecfdf5; color: #059669; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-bottom: 16px; }
            .table-box { background: #f8fafc; border-radius: 6px; padding: 18px; border: 1px solid #e2e8f0; margin: 20px 0; }
            .table-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px solid #e2e8f0; }
            .table-row:last-child { border-bottom: none; font-weight: bold; font-size: 16px; color: #0f172a; margin-top: 6px; }
            .label { color: #64748b; }
            .value { font-weight: 600; color: #0f172a; }
            .footer { background: #f1f5f9; padding: 20px 32px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${config.company.name}</h1>
              <p>VaultPay Corporate Financial Core • Automated Settlement System</p>
            </div>
            <div class="content">
              <span class="badge">✓ PAYMENT VERIFIED & SETTLED</span>
              <p>Dear <strong>${invoice.clientName}</strong>,</p>
              <p>We confirm receipt of full settlement for contract invoice <strong>${invoice.invoiceNumber}</strong>. Your payment has cleared via corporate credit card through Stripe.</p>
              
              <div class="table-box">
                <div class="table-row">
                  <span class="label">Invoice Number</span>
                  <span class="value">${invoice.invoiceNumber}</span>
                </div>
                <div class="table-row">
                  <span class="label">Client Organization</span>
                  <span class="value">${invoice.organization}</span>
                </div>
                <div class="table-row">
                  <span class="label">Settlement Date</span>
                  <span class="value">${paidDate}</span>
                </div>
                <div class="table-row">
                  <span class="label">Stripe Transaction ID</span>
                  <span class="value">${invoice.stripeChargeId || invoice.stripePaymentIntentId || 'TX_VERIFIED'}</span>
                </div>
                <div class="table-row">
                  <span class="label">Amount Settled</span>
                  <span class="value" style="color: #059669;">${amountFormatted} USD</span>
                </div>
              </div>

              <p style="font-size: 13px; color: #475569;">
                An official, legally sealed PDF receipt carrying the corporate <strong>"PAID"</strong> verification stamp is attached to this transmission for your accounting records.
              </p>
              <p style="margin-top: 24px; font-size: 13px;">
                Sincerely,<br>
                <strong>Evelyn Croft</strong><br>
                <em>Chief Financial Officer</em><br>
                ${config.company.name}
              </p>
            </div>
            <div class="footer">
              This message contains proprietary financial information. VaultPay Cryptographic Audit Hash: ${invoice.id}<br>
              ${config.company.address}, ${config.company.cityStateZip}
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: pdfFilename || `${invoice.invoiceNumber}_PAID_RECEIPT.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      const deliveryRecord = {
        id: `email_${Date.now()}`,
        sentAt: new Date().toISOString(),
        to: clientEmail,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        subject: mailOptions.subject,
        messageId: info.messageId,
        attachmentName: pdfFilename,
        status: 'DELIVERED'
      };

      this.sentEmails.unshift(deliveryRecord);
      store.logAudit('RECEIPT_EMAIL_DISPATCHED', `Official PDF receipt for ${invoice.invoiceNumber} emailed to ${clientEmail}`, {
        to: clientEmail,
        messageId: info.messageId
      });

      return {
        success: true,
        deliveryRecord,
        info
      };
    } catch (err) {
      console.error('[EmailService] Failed to send email:', err);
      store.logAudit('RECEIPT_EMAIL_ERROR', `Failed to send email receipt for ${invoice.invoiceNumber} to ${clientEmail}: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }

  getRecentSentEmails() {
    return this.sentEmails;
  }
}

const emailServiceInstance = new EmailService();
module.exports = emailServiceInstance;
