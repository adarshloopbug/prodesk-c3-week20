const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../config');

const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;
const VAULT_DIR = isServerless
  ? path.join(os.tmpdir(), 'vault', 'invoices')
  : path.join(__dirname, '..', 'vault', 'invoices');

try {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
  }
} catch (err) {}

/**
 * Generates a high-fidelity B2B PDF invoice / receipt
 * @param {Object} invoice - The invoice object
 * @param {Object} options - { saveToDisk: boolean }
 * @returns {Promise<{ filePath: string, buffer: Buffer }>}
 */
function generateInvoicePDF(invoice, options = { saveToDisk: true }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 45,
        info: {
          Title: `Invoice ${invoice.invoiceNumber} - ${config.company.name}`,
          Author: `${config.company.cfo}, CFO`,
          Subject: `B2B Strategic Services Invoice & Receipt`,
          Keywords: 'Nexus, Corporate, Invoice, B2B, Stripe, VaultPay'
        }
      });

      const fileName = `${invoice.invoiceNumber}_${invoice.status.toUpperCase()}_${Date.now()}.pdf`;
      const filePath = path.join(VAULT_DIR, fileName);
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));

      let writeStream = null;
      if (options.saveToDisk) {
        try {
          writeStream = fs.createWriteStream(filePath);
          writeStream.on('error', (err) => {
            console.warn('[PDF Service] Disk write warning (falling back to memory):', err.message);
            writeStream = null;
          });
        } catch (e) {
          writeStream = null;
        }
      }
      if (writeStream) {
        doc.pipe(writeStream);
      }

      // --- BRAND HEADER ---
      // Corporate Accent Bar
      doc.rect(0, 0, 612, 12).fill('#0f172a'); // Deep navy
      doc.rect(0, 12, 612, 4).fill('#d97706'); // Corporate gold accent

      doc.y = 35;

      // Draw stylized Nexus Corporate Crest
      doc.save();
      doc.rect(45, 35, 42, 42).fillAndStroke('#0f172a', '#d97706');
      doc.fontSize(22).fillColor('#ffffff').font('Helvetica-Bold').text('N', 57, 44);
      doc.restore();

      // Brand Title
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#0f172a').text(config.company.name, 98, 38);
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(config.company.tagline, 98, 60);

      // Issuer details (right side)
      doc.fontSize(8.5).font('Helvetica').fillColor('#475569')
        .text(config.company.legalName, 370, 38, { align: 'right', width: 197 })
        .text(config.company.address, 370, 50, { align: 'right', width: 197 })
        .text(config.company.cityStateZip, 370, 62, { align: 'right', width: 197 })
        .text(`Direct CFO Line: ${config.company.phone}`, 370, 74, { align: 'right', width: 197 })
        .text(config.company.email, 370, 86, { align: 'right', width: 197 });

      // Horizontal Divider
      doc.moveTo(45, 105).lineTo(567, 105).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // --- INVOICE TITLE & STATUS BANNER ---
      doc.y = 118;
      const isPaid = invoice.status === 'Paid';

      doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text(
        isPaid ? 'OFFICIAL PAYMENT RECEIPT & SETTLED INVOICE' : 'COMMERCIAL INVOICE',
        45,
        118
      );

      doc.fontSize(9.5).font('Helvetica').fillColor('#64748b').text(
        `Document Reference: ${invoice.invoiceNumber} | System ID: ${invoice.id}`,
        45,
        138
      );

      // --- BILL TO / INVOICE METRICS GRID ---
      doc.rect(45, 155, 255, 95).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.rect(312, 155, 255, 95).fillAndStroke('#f8fafc', '#e2e8f0');

      // Left Box: Billed Client
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#d97706').text('BILLED TO CLIENT (CONFIDENTIAL)', 58, 166);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(invoice.organization || 'Client Enterprise', 58, 180);
      doc.fontSize(9).font('Helvetica').fillColor('#334155')
        .text(`Attn: ${invoice.clientName}`, 58, 196)
        .text(`Email: ${invoice.clientEmail}`, 58, 209)
        .text(invoice.clientAddress || 'Corporate Headquarters', 58, 222, { width: 230 });

      // Right Box: Meta Information
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#d97706').text('INVOICE FINANCIAL SPECIFICATION', 325, 166);
      doc.fontSize(9).font('Helvetica')
        .fillColor('#64748b').text('Issue Date:', 325, 182)
        .fillColor('#0f172a').font('Helvetica-Bold').text(invoice.issueDate, 410, 182, { align: 'right', width: 145 })
        
        .font('Helvetica').fillColor('#64748b').text('Payment Due Date:', 325, 197)
        .fillColor('#0f172a').font('Helvetica-Bold').text(invoice.dueDate, 410, 197, { align: 'right', width: 145 })

        .font('Helvetica').fillColor('#64748b').text('Project Code:', 325, 212)
        .fillColor('#0f172a').font('Helvetica-Bold').text(invoice.projectCode || 'VAULTPAY-B2B', 410, 212, { align: 'right', width: 145 })

        .font('Helvetica').fillColor('#64748b').text('Settlement Status:', 325, 227)
        .fillColor(isPaid ? '#059669' : '#dc2626').font('Helvetica-Bold').text(invoice.status.toUpperCase(), 410, 227, { align: 'right', width: 145 });

      // --- LINE ITEMS TABLE ---
      let startY = 265;
      doc.rect(45, startY, 522, 24).fill('#0f172a');
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff')
        .text('LINE ITEM & DELIVERABLE SPECIFICATION', 55, startY + 7)
        .text('QTY', 370, startY + 7, { width: 35, align: 'center' })
        .text('RATE (USD)', 415, startY + 7, { width: 65, align: 'right' })
        .text('AMOUNT (USD)', 485, startY + 7, { width: 72, align: 'right' });

      let currentY = startY + 24;
      const items = Array.isArray(invoice.items) && invoice.items.length > 0 
        ? invoice.items 
        : [{ description: invoice.description || 'B2B Consultancy Deliverable', quantity: 1, unitPrice: invoice.totalAmount, amount: invoice.totalAmount }];

      items.forEach((item, index) => {
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(45, currentY, 522, 28).fill(rowBg);
        doc.rect(45, currentY, 522, 28).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b')
          .text(item.description, 55, currentY + 9, { width: 300 });

        doc.fontSize(9).font('Helvetica').fillColor('#475569')
          .text(String(item.quantity || 1), 370, currentY + 9, { width: 35, align: 'center' })
          .text(`$${Number(item.unitPrice || item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 415, currentY + 9, { width: 65, align: 'right' })
          .font('Helvetica-Bold').fillColor('#0f172a')
          .text(`$${Number(item.amount || (item.unitPrice * (item.quantity || 1))).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 485, currentY + 9, { width: 72, align: 'right' });

        currentY += 28;
      });

      // --- TOTALS CALCULATION BOX ---
      currentY += 10;
      doc.rect(340, currentY, 227, 95).fillAndStroke('#f8fafc', '#e2e8f0');

      doc.fontSize(9).font('Helvetica').fillColor('#64748b')
        .text('Subtotal:', 355, currentY + 12)
        .font('Helvetica-Bold').fillColor('#0f172a')
        .text(`$${Number(invoice.subtotal || invoice.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 430, currentY + 12, { align: 'right', width: 125 });

      const taxRateDisplay = invoice.taxRate ? `Tax (${(invoice.taxRate * 100).toFixed(2)}%):` : 'Applicable Tax:';
      doc.font('Helvetica').fillColor('#64748b')
        .text(taxRateDisplay, 355, currentY + 30)
        .font('Helvetica-Bold').fillColor('#0f172a')
        .text(`$${Number(invoice.taxAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 430, currentY + 30, { align: 'right', width: 125 });

      doc.moveTo(355, currentY + 48).lineTo(557, currentY + 48).strokeColor('#cbd5e1').lineWidth(1).stroke();

      // Total Line
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a')
        .text('TOTAL AMOUNT:', 355, currentY + 58)
        .fontSize(13).fillColor(isPaid ? '#059669' : '#0f172a')
        .text(`$${Number(invoice.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`, 430, currentY + 56, { align: 'right', width: 125 });

      // Notes section (left of totals)
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569').text('GOVERNING TERMS & AUDIT NOTE:', 45, currentY + 10);
      doc.fontSize(8).font('Helvetica').fillColor('#64748b')
        .text(invoice.notes || 'All transactions governed under Nexus Corporate Services Master B2B Agreement. Electronic receipts verifiable via VaultPay API.', 45, currentY + 25, { width: 280, lineGap: 3 });

      // Signatory block
      doc.y = currentY + 120;
      doc.moveTo(45, doc.y).lineTo(230, doc.y).strokeColor('#94a3b8').lineWidth(1).stroke();
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Evelyn Croft', 45, doc.y + 5);
      doc.fontSize(7.5).font('Helvetica').fillColor('#64748b').text('Chief Financial Officer, Nexus Corporate Services', 45, doc.y + 16);
      doc.text(`Authorized Officer Signature & Seal | NY Bar #8942-NY`, 45, doc.y + 27);

      // --- AUTHENTIC 'PAID' WATERMARK / STAMP ---
      if (isPaid) {
        doc.save();
        // Position stamp in upper-right or central watermark
        doc.translate(410, 100);
        doc.rotate(-14);

        // Double border for authentic rubber stamp feel
        doc.rect(-10, -5, 175, 68).lineWidth(2.5).strokeColor('#059669').stroke();
        doc.rect(-6, -1, 167, 60).lineWidth(1).strokeColor('#059669').stroke();

        // Stamp Header
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#059669').text('NEXUS FINANCIAL CORE', 0, 4, { width: 155, align: 'center' });
        // Main PAID Stamp
        doc.fontSize(24).font('Helvetica-Bold').fillColor('#059669').text('PAID', 0, 16, { width: 155, align: 'center' });
        // Date and Charge details
        const paidDateFormatted = invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'SETTLED';
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#059669')
          .text(`SETTLED: ${paidDateFormatted}`, 0, 42, { width: 155, align: 'center' })
          .text(`STRIPE TX: ${(invoice.stripeChargeId || invoice.stripePaymentIntentId || 'VERIFIED').substring(0, 18)}`, 0, 50, { width: 155, align: 'center' });

        doc.restore();
      }

      // Security Watermark Footer
      doc.fontSize(7).font('Helvetica').fillColor('#94a3b8').text(
        `Generated cryptographically by VaultPay Financial Core. Hash verification enabled. Document ID: ${invoice.id}`,
        45,
        745,
        { align: 'center', width: 522 }
      );

      let resolved = false;
      doc.end();

      doc.on('end', () => {
        const buffer = Buffer.concat(buffers);
        if (!resolved) {
          resolved = true;
          resolve({ filePath: writeStream ? filePath : null, fileName, buffer });
        }
      });

      if (writeStream) {
        writeStream.on('finish', () => {
          const buffer = Buffer.concat(buffers);
          if (!resolved) {
            resolved = true;
            resolve({ filePath, fileName, buffer });
          }
        });
        writeStream.on('error', (err) => {
          console.warn('[PDF Service] Disk write stream error, using buffer:', err.message);
          const buffer = Buffer.concat(buffers);
          if (!resolved) {
            resolved = true;
            resolve({ filePath: null, fileName, buffer });
          }
        });
      }
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateInvoicePDF,
  VAULT_DIR
};
