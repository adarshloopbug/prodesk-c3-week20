const API_BASE = '/api';

class ApiService {
  getToken() {
    return localStorage.getItem('vaultpay_jwt_token');
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('vaultpay_jwt_token', token);
    } else {
      localStorage.removeItem('vaultpay_jwt_token');
    }
  }

  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async handleResponse(response) {
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/pdf')) {
      return response.blob();
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.error || `HTTP ${response.status} Request Failed`);
      error.status = response.status;
      error.code = data.code;
      error.details = data.details || data;
      throw error;
    }

    return data;
  }

  // Auth
  async login(username, userId) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, userId })
    });
    return this.handleResponse(res);
  }

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  async getDemoAccounts() {
    const res = await fetch(`${API_BASE}/auth/demo-accounts`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  // Invoices
  async getInvoices() {
    const res = await fetch(`${API_BASE}/invoices`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  async getInvoiceById(id) {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  async createInvoice(invoiceData) {
    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(invoiceData)
    });
    return this.handleResponse(res);
  }

  /**
   * Requirement 3 (Document Vault):
   * Fetches the generated PDF binary from backend and triggers native browser download
   */
  async downloadInvoicePdf(id, filename = `invoice_${id}.pdf`) {
    const res = await fetch(`${API_BASE}/invoices/${id}/pdf`, {
      headers: this.getHeaders({
        'Accept': 'application/pdf'
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const error = new Error(errData.error || `Failed to download PDF (${res.status})`);
      error.status = res.status;
      error.code = errData.code;
      throw error;
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    return true;
  }

  async createPaymentIntent(id) {
    const res = await fetch(`${API_BASE}/invoices/${id}/create-payment-intent`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  async simulatePayment(id) {
    const res = await fetch(`${API_BASE}/invoices/${id}/pay`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  async simulateWebhook(invoiceId, tamper = false) {
    const res = await fetch(`${API_BASE}/webhooks/simulate-webhook`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ invoiceId, tamperSignature: tamper })
    });
    return this.handleResponse(res);
  }

  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/invoices/admin/audit-logs`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }
}

export const api = new ApiService();
export default api;
