import React, { useState, useEffect, useRef } from 'react';
import { imagingAPI, diagnosticsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function MedicalImaging() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef(null);

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(null); // image id being analyzed
  const [reports, setReports] = useState({}); // { imageId: reportText }
  const [patientContext, setPatientContext] = useState('');
  const [showContextModal, setShowContextModal] = useState(null); // imageUrl to analyze

  const userId = user?._id || user?.id;

  useEffect(() => {
    if (userId) fetchImages();
  }, [user]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await imagingAPI.getUserImages(userId);
      setImages(res.data || []);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await imagingAPI.upload(userId, file);
      addToast(`"${file.name}" uploaded to Azure Blob Storage & saved to PostgreSQL! 🎉`, 'success');
      fetchImages();
    } catch (err) {
      addToast('Upload failed. Ensure the imaging service is running.', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAnalyze = async (image) => {
    setAnalyzing(image.id);
    try {
      const userName = user?.name || 'Patient';
      const contextUserId = user?._id || user?.id || 'Unknown';
      const userTypedContext = patientContext.trim();

      // Build a rich context the AI agent can use
      const enrichedContext = [
        `Patient Name: ${userName}`,
        `Patient ID: ${contextUserId}`,
        `Image File: ${image.filename}`,
        `Upload Date: ${new Date(image.uploaded_at).toLocaleString()}`,
        `Storage URL: ${image.blob_url}`,
        userTypedContext ? `Clinical Notes: ${userTypedContext}` : 'Clinical Notes: No additional context provided.',
      ].join('\n');

      const res = await diagnosticsAPI.analyze(image.blob_url, enrichedContext);
      const report = res.data.report;
      setReports(prev => ({ ...prev, [image.id]: report }));
      await imagingAPI.updateStatus(image.id, 'Analyzed', report);
      fetchImages();
      addToast('Diagnostic Agent analysis complete! 🧠', 'success');
      setShowContextModal(null);
      setPatientContext('');
    } catch {
      addToast('Diagnostic Agent failed. Ensure the diagnostic-agent-service is running.', 'error');
    } finally {
      setAnalyzing(null);
    }
  };

  const statusColor = (status) => {
    if (status === 'Analyzed') return 'var(--accent-emerald, #10b981)';
    if (status === 'Failed') return 'var(--accent-rose, #f43f5e)';
    return 'var(--accent-amber, #f59e0b)';
  };

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Medical Imaging</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Upload scans to <strong style={{ color: 'var(--accent-cyan)' }}>Azure Blob Storage</strong> &amp; analyze with the{' '}
            <strong style={{ color: 'var(--accent-purple, #a855f7)' }}>Azure AI Foundry Diagnostic Agent</strong>.
            Metadata stored in <strong style={{ color: 'var(--accent-teal)' }}>PostgreSQL</strong>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(168,85,247,0.1)', padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid rgba(168,85,247,0.2)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '0.8rem', color: '#a855f7', fontWeight: '600' }}>Agent 2 — Diagnostic AI</span>
          </div>
          <button
            className="btn-submit"
            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? '⏳ Uploading...' : '📤 Upload Scan'}
          </button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }}
            onChange={handleUpload} accept=".jpg,.jpeg,.png,.pdf,.dcm" />
        </div>
      </div>

      {/* ── Service Architecture Badge ── */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { label: '☁️ Azure Blob Storage', color: '#0078d4', desc: 'Image Files' },
          { label: '🐘 PostgreSQL', color: '#336791', desc: 'Image Metadata' },
          { label: '🧠 Azure AI Foundry', color: '#a855f7', desc: 'Diagnostic Agent 2' },
          { label: '⚡ FastAPI', color: '#009485', desc: 'Python Microservices' },
        ].map(b => (
          <div key={b.label} style={{ background: `rgba(255,255,255,0.03)`, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: '10px', padding: '0.6rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ fontWeight: '700', fontSize: '0.85rem', color: b.color }}>{b.label}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{b.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Upload Drop Zone ── */}
      <div className="widget-glass" style={{ textAlign: 'center', padding: '2.5rem', borderStyle: 'dashed', marginBottom: '2rem', cursor: 'pointer' }}
        onClick={() => fileInputRef.current?.click()}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🩻</div>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>Drop your medical scan here</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Supports JPG, PNG, PDF, DICOM. Files are stored in Azure Blob Storage; metadata saved to PostgreSQL.
        </p>
      </div>

      {/* ── Image Records Table ── */}
      <div className="widget-glass">
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🩻 Uploaded Scans — {images.length} records (PostgreSQL)
          </h3>
          <button onClick={fetchImages} style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>⏳ Loading from PostgreSQL...</div>
        ) : images.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🩻</div>
            No medical images uploaded yet. Upload your first scan above!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {images.map((img) => (
              <div key={img.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderLeft: '4px solid #a855f7', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: '1.5rem', padding: '1.25rem', alignItems: 'center' }}>
                  <div style={{ fontSize: '2rem' }}>🩻</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', marginBottom: '0.25rem' }}>{img.filename}</h4>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span>🆔 ID: {img.id}</span>
                      <span>👤 Patient: {img.user_id}</span>
                      <span>📅 {new Date(img.uploaded_at).toLocaleString()}</span>
                      <span style={{ color: statusColor(img.status), fontWeight: 600 }}>● {img.status}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {img.blob_url && (
                      <a href={img.blob_url} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', textDecoration: 'none', padding: '0.4rem 0.8rem', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '6px' }}>
                        ☁️ View in Blob
                      </a>
                    )}
                    <button
                      onClick={() => setShowContextModal(img)}
                      disabled={analyzing === img.id}
                      style={{ background: analyzing === img.id ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7', padding: '0.4rem 0.9rem', borderRadius: '6px', cursor: analyzing === img.id ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      {analyzing === img.id ? '🧠 Analyzing...' : '🔬 Run Diagnostic Agent'}
                    </button>
                  </div>
                </div>
                {/* Diagnostic Report */}
                {reports[img.id] && (
                  <div style={{ borderTop: '1px solid var(--border-glass)', padding: '1.25rem', background: 'rgba(168,85,247,0.05)' }}>
                    <p style={{ fontSize: '0.75rem', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: '700' }}>
                      🧠 Azure AI Foundry Diagnostic Report
                    </p>
                    <pre style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.7', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', margin: 0 }}>
                      {reports[img.id]}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Patient Context Modal ── */}
      {showContextModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="widget-glass" style={{ width: '100%', maxWidth: '520px', padding: '2rem' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>🔬 Run Diagnostic Agent</h2>
              <button onClick={() => setShowContextModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Analyzing: <strong style={{ color: '#fff' }}>{showContextModal.filename}</strong><br />
              The <strong style={{ color: '#a855f7' }}>Azure AI Foundry Diagnostic Agent</strong> will analyze this image. Optionally add patient context below:
            </p>
            <textarea
              rows="4"
              className="input-field"
              placeholder="e.g. Patient has a history of pneumonia. Doctor suspects fluid in the lungs. Looking for consolidation in lower lobe..."
              style={{ resize: 'vertical', marginBottom: '1.25rem', width: '100%', boxSizing: 'border-box' }}
              value={patientContext}
              onChange={e => setPatientContext(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowContextModal(null)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                className="btn-submit"
                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                onClick={() => handleAnalyze(showContextModal)}
                disabled={analyzing !== null}
              >
                {analyzing ? '🧠 Analyzing...' : '🚀 Analyze Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
