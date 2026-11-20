import React, { useState } from 'react';
import { Plus, Trash2, X, DollarSign, Building, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CreateInvoiceModal({ isOpen, onClose, onSuccess, clients }) {
  const { notify } = useAuth();

  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [description, setDescription] = useState('Enterprise Strategic Advisory Contract');
  const [projectCode, setProjectCode] = useState(`PRJ-${Math.floor(1000 + Math.random() * 9000)}`);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  const [items, setItems] = useState([
    { description: 'Executive Technology Infrastructure & Security Audit', quantity: 1, unitPrice: 20000, amount: 20000 },
    { description: 'Regulatory Governance & Compliance Mapping Dossier', quantity: 1, unitPrice: 15000, amount: 15000 }
  ]);

  const [notes, setNotes] = useState('Standard 30-day corporate terms. Instant settlement available via VaultPay corporate credit card.');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 5000, amount: 5000 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      const q = parseFloat(updated[index].quantity) || 0;
      const p = parseFloat(updated[index].unitPrice) || 0;
      updated[index].amount = parseFloat((q * p).toFixed(2));
    }
    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const tax = parseFloat((subtotal * 0.08875).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClientId) {
      notify('Validation Error', 'Please select a corporate client.', 'danger');
      return;
    }

    try {
      setSubmitting(true);
      const targetClient = clients.find(c => c.id === selectedClientId);

      await api.createInvoice({
        clientId: selectedClientId,
        organization: targetClient?.organization,
        clientName: targetClient?.name,
        clientEmail: targetClient?.email,
        clientAddress: targetClient?.address,
        description,
        projectCode,
        dueDate,
        notes,
        taxRate: 0.08875,
        items
      });

      notify('Invoice Created', `Commercial contract generated ($${total.toLocaleString()}).`, 'success');
      onSuccess();
    } catch (err) {
      notify('Creation Error', err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '660px', border: '1px solid rgba(255, 107, 0, 0.35)' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Issue High-Value Commercial Invoice</h3>
            <p style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Nexus B2B Strategic Services ($5,000 to $50,000)</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Client Selector */}
            <div className="form-group">
              <label className="form-label">Client Enterprise Account</label>
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className="form-select"
                required
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.organization} ({c.name} — {c.email})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Deliverable Scope</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            {/* Line Items */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Itemized Deliverable Breakdown</label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="btn btn-sm btn-outline-orange"
                  style={{ fontSize: '0.75rem' }}
                >
                  <Plus size={14} /> Add Deliverable
                </button>
              </div>

              {items.map((item, index) => (
                <div key={index} style={{
                  display: 'grid',
                  gridTemplateColumns: '3fr 1fr 1.5fr auto',
                  gap: '0.5rem',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.45)',
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <input
                    type="text"
                    placeholder="Deliverable description"
                    value={item.description}
                    onChange={e => handleItemChange(index, 'description', e.target.value)}
                    className="form-input"
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                    className="form-input mono"
                    required
                  />
                  <input
                    type="number"
                    min="100"
                    step="100"
                    placeholder="Rate ($)"
                    value={item.unitPrice}
                    onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                    className="form-input mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length <= 1}
                    style={{ background: 'transparent', border: 'none', color: items.length <= 1 ? '#52525b' : '#f87171', cursor: 'pointer', padding: '0.25rem' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Financial Totals */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.6)',
              padding: '1.25rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.8125rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', marginBottom: '0.35rem' }}>
                <span>Subtotal:</span>
                <span className="mono" style={{ color: '#ffffff', fontWeight: 600 }}>
                  ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', marginBottom: '0.65rem' }}>
                <span>NYC Corporate Tax (8.875%):</span>
                <span className="mono" style={{ color: '#ffffff', fontWeight: 600 }}>
                  ${tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem' }}>
                <span style={{ color: '#ffffff' }}>Total Contract Value:</span>
                <span className="mono" style={{ color: '#ff9933' }}>
                  ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                </span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Generating Invoice...' : 'Issue Commercial Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
