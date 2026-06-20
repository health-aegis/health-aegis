import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { aiAPI } from '../../services/api';

export default function AiMonitor() {
  const { addToast } = useToast();
  const [query, setQuery] = useState('');
  const [conversation, setConversation] = useState([
    { role: 'ai', text: 'Aegis AI Engine online. Connected to MongoDB patient records and Gemini Pro API. Submit a diagnostic query to begin.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const msg = query;
    setConversation(prev => [...prev, { role: 'user', text: msg }]);
    setQuery('');
    setIsLoading(true);
    setConversation(prev => [...prev, { role: 'ai', text: '...', isTyping: true }]);

    try {
      const res = await aiAPI.chat(msg);
      setConversation(prev => [
        ...prev.filter(m => !m.isTyping),
        { role: 'ai', text: res.data.reply }
      ]);
    } catch {
      setConversation(prev => [
        ...prev.filter(m => !m.isTyping),
        { role: 'ai', text: '⚠️ AI Engine Error: Could not reach the Gemini API. Ensure GEMINI_API_KEY is configured in the backend .env file.' }
      ]);
      addToast('AI Engine unreachable.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const diagnosticPrompts = [
    "Summarize the patient's overall health status.",
    "List all medications with their current adherence status.",
    "Are there any critical alerts that need attention?",
    "What is the risk level based on current data?",
    "Generate a health report for the caregiver.",
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>AI Engine Monitor</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Direct interface to the Aegis AI engine with live patient data.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(16,185,129,0.1)', padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)', animation: 'pulse 2s infinite' }}></div>
          <span style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', fontWeight: '600' }}>Gemini Pro Connected</span>
        </div>
      </div>

      <div className="widget-grid">
        {/* System Info */}
        {[
          { icon: '🧠', label: 'AI Model', value: 'Gemini 1.5 Flash', color: 'var(--accent-cyan)' },
          { icon: '🗄️', label: 'Data Source', value: 'MongoDB Live', color: 'var(--accent-teal)' },
          { icon: '⚡', label: 'Mode', value: 'Real-Time', color: 'var(--accent-amber)' },
          { icon: '🔒', label: 'Context', value: 'Patient Records', color: 'var(--accent-purple)' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="widget-glass" style={{ gridColumn: 'span 3', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{icon}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{label}</div>
          </div>
        ))}

        {/* Query Suggestions */}
        <div className="widget-glass" style={{ gridColumn: 'span 12' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Diagnostic Prompts</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {diagnosticPrompts.map((p, i) => (
              <button key={i} onClick={() => setQuery(p)}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Console */}
        <div className="widget-glass" style={{ gridColumn: 'span 12', padding: 0, overflow: 'hidden' }}>
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-rose)' }}></div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-amber)' }}></div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-emerald)' }}></div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontFamily: 'monospace' }}>aegis-ai-monitor ~ gemini-1.5-flash</span>
          </div>

          <div style={{ height: '350px', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: 'monospace' }}>
            {conversation.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ color: msg.role === 'user' ? 'var(--accent-cyan)' : 'var(--accent-teal)', fontWeight: '700', flexShrink: 0 }}>
                  {msg.role === 'user' ? '> ADMIN' : '[ AEGIS ]'}
                </span>
                {msg.isTyping ? (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', paddingTop: '4px' }}>
                    {[0, 1, 2].map(d => <div key={d} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', animation: `bounce 1.2s ${d * 0.2}s infinite` }} />)}
                  </div>
                ) : (
                  <span style={{ color: msg.role === 'user' ? '#fff' : 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                    {msg.text}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)' }}>
            <form onSubmit={handleQuery} style={{ display: 'flex', gap: '0.75rem' }}>
              <span style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace', lineHeight: '44px', fontWeight: '700' }}>{'>'}</span>
              <input type="text" value={query} onChange={e => setQuery(e.target.value)} disabled={isLoading}
                placeholder={isLoading ? 'AI is processing...' : 'Enter diagnostic query...'}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontFamily: 'monospace', fontSize: '0.9rem', height: '44px' }} />
              <button type="submit" disabled={isLoading || !query.trim()} className="btn-submit"
                style={{ padding: '0.5rem 1.5rem', opacity: isLoading || !query.trim() ? 0.5 : 1 }}>
                {isLoading ? 'Processing...' : 'Execute'}
              </button>
            </form>
          </div>
        </div>
      </div>
      <style>{`@keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-8px); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
