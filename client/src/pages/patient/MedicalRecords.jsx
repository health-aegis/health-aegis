import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { historyAPI } from '../../services/api';

export default function MedicalRecords() {
  const { addToast } = useToast();
  const fileInputRef = useRef(null);
  const [records, setRecords] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedDoc, setExpandedDoc] = useState(null);

  const [formData, setFormData] = useState({ date: '', category: 'Diagnosis', title: '', description: '', notes: '' });

  useEffect(() => {
    fetchRecords();
    fetchDocuments();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await historyAPI.getAll();
      setRecords(res.data);
    } catch {
      addToast('Failed to load medical records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setDocsLoading(true);
      const res = await historyAPI.getDocuments();
      setDocuments(res.data || []);
    } catch {
      // Cosmos DB not configured — fail silently
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleOpenModal = (record = null) => {
    if (record) {
      setEditingId(record._id);
      setFormData({
        date: record.date || new Date().toISOString().split('T')[0],
        category: record.category,
        title: record.title,
        description: record.description,
        notes: record.notes || ''
      });
    } else {
      setEditingId(null);
      setFormData({ date: new Date().toISOString().split('T')[0], category: 'Diagnosis', title: '', description: '', notes: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, date: formData.date || new Date().toISOString().split('T')[0] };
      if (editingId) {
        await historyAPI.update(editingId, payload);
        addToast('Medical record updated successfully.', 'success');
      } else {
        await historyAPI.create(payload);
        addToast('Medical record added successfully.', 'success');
      }
      setShowModal(false);
      fetchRecords();
    } catch {
      addToast(editingId ? 'Failed to update record.' : 'Failed to add record.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this medical record?')) return;
    try {
      await historyAPI.delete(id);
      addToast('Record deleted.', 'info');
      fetchRecords();
    } catch {
      addToast('Failed to delete record.', 'error');
    }
  };

  const handleFileUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', `Uploaded Document: ${file.name}`);
      fd.append('category', 'Lab Report');
      fd.append('date', new Date().toISOString().split('T')[0]);

      try {
        setUploading(true);
        await historyAPI.upload(fd);
        addToast(`"${file.name}" uploaded! You'll receive an email once OCR processing is complete. 📧`, 'success');
        fetchRecords();
      } catch (error) {
        addToast('Failed to upload document.', 'error');
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    }
  };

  const categoryColors = {
    Diagnosis: 'var(--accent-rose)',
    Allergy: 'var(--accent-amber)',
    'Lab Report': 'var(--accent-cyan)',
    Prescription: 'var(--accent-teal)',
    Surgery: 'var(--accent-purple)',
  };

  const statusBadge = (status) => {
    const map = {
      processed: { color: 'var(--accent-emerald)', label: '✅ Processed' },
      pending:   { color: 'var(--accent-amber)',   label: '⏳ Pending' },
      failed:    { color: 'var(--accent-rose)',     label: '❌ Failed' },
      empty:     { color: 'var(--text-muted)',      label: '📄 Empty' },
    };
    const s = map[status] || map['pending'];
    return <span style={{ color: s.color, fontSize: '0.8rem', fontWeight: 600 }}>{s.label}</span>;
  };

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Medical Records</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Your complete health history and documents.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>
            {uploading ? '⏳ Uploading...' : '📎 Upload Document'}
          </button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload}
            accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx" />
          <button className="btn-submit" style={{ padding: '0.6rem 1.2rem', borderRadius: '8px' }}
            onClick={() => handleOpenModal()}>
            + Add Record
          </button>
        </div>
      </div>

      <div className="widget-grid">

        {/* ── Section 1: Manual Health Timeline ── */}
        <div className="widget-glass" style={{ gridColumn: 'span 12' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
            📋 Health Timeline — {records.length} Records
          </h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>⏳ Loading records...</div>
          ) : records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No medical records yet. Add your first record above.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {records.map((r) => (
                <div key={r._id} style={{ display: 'flex', gap: '1.5rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderLeft: `4px solid ${categoryColors[r.category] || 'var(--accent-cyan)'}`, borderRadius: '8px', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: '80px', textAlign: 'center', paddingTop: '0.25rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', color: categoryColors[r.category] || 'var(--accent-cyan)', background: `rgba(0,229,255,0.1)`, padding: '0.2rem 0.5rem', borderRadius: '8px' }}>{r.category}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{r.date}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', marginBottom: '0.25rem' }}>{r.title}</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{r.description}</p>
                    {r.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic', borderLeft: '2px solid var(--border-glass)', paddingLeft: '0.5rem' }}>Note: {r.notes}</p>}
                    {r.blobUrl && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
                        <a href={r.blobUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>📄 View Original Document</a>
                        <span style={{ marginLeft: '1rem', color: 'var(--text-muted)' }}>
                          OCR Status: {statusBadge(r.processingStatus)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button onClick={() => handleOpenModal(r)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                    <button onClick={() => handleDelete(r._id)} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--accent-rose)', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 2: OCR-Processed Documents from Cosmos DB ── */}
        <div className="widget-glass" style={{ gridColumn: 'span 12' }}>
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🤖 AI-Processed Documents — {documents.length} Files
            </h3>
            <button onClick={fetchDocuments} style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>
              🔄 Refresh
            </button>
          </div>
          {docsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>⏳ Checking processed documents...</div>
          ) : documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤖</div>
              No AI-processed documents yet. Upload a PDF or image above to get started.<br/>
              <span style={{ fontSize: '0.8rem' }}>After upload, the Azure Function will process it and send you an email. Click Refresh to check status.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {documents.map((doc) => (
                <div key={doc.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderLeft: '4px solid var(--accent-cyan)', borderRadius: '8px', overflow: 'hidden' }}>
                  {/* Doc Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', cursor: 'pointer' }}
                    onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}>
                    <div style={{ fontSize: '1.5rem' }}>📄</div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fff', margin: 0 }}>{doc.title}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                        Processed: {doc.processedAt ? new Date(doc.processedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {statusBadge(doc.processingStatus)}
                      {doc.blobUrl && (
                        <a href={doc.blobUrl} target="_blank" rel="noopener noreferrer"
                          style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', textDecoration: 'none' }}
                          onClick={e => e.stopPropagation()}>
                          View File ↗
                        </a>
                      )}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {expandedDoc === doc.id ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>
                  {/* Extracted Text Accordion */}
                  {expandedDoc === doc.id && (
                    <div style={{ borderTop: '1px solid var(--border-glass)', padding: '1.25rem', background: 'rgba(0,0,0,0.2)' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Extracted Text
                      </p>
                      <pre style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.7', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', maxHeight: '300px', overflowY: 'auto', margin: 0, fontFamily: 'monospace' }}>
                        {doc.extractedText || 'No text could be extracted from this document.'}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Upload Drop Zone ── */}
        <div className="widget-glass" style={{ gridColumn: 'span 12', textAlign: 'center', padding: '2.5rem 2rem', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>☁️</div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>Upload to Azure Blob Storage</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            PDFs, Images (JPG/PNG), Word Documents or Text files. Max 10MB.<br/>
            The Azure Function will automatically run OCR and send you an email when done.
          </p>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload}
            accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx" />
          <button className="btn-submit" style={{ padding: '0.6rem 2rem', borderRadius: '8px' }}
            onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? '⏳ Uploading...' : 'Browse & Upload'}
          </button>
        </div>
      </div>

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="widget-glass" style={{ width: '100%', maxWidth: '500px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{editingId ? 'Edit Record' : 'New Record'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Category *</label>
                  <select className="input-field" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                    {['Diagnosis', 'Allergy', 'Lab Report', 'Prescription', 'Surgery'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date *</label>
                  <input required type="date" className="input-field" style={{ colorScheme: 'dark' }}
                    value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Title *</label>
                <input required type="text" className="input-field" placeholder="e.g. Stage I Hypertension"
                  value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Description *</label>
                <textarea required rows="3" className="input-field" placeholder="Detailed description..." style={{ resize: 'vertical' }}
                  value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Notes (optional)</label>
                <input type="text" className="input-field" placeholder="Optional notes"
                  value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-submit" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px' }}>
                  {editingId ? 'Save Changes' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
