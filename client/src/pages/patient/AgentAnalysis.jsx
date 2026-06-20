import React, { useState, useRef, useEffect } from 'react';
import { runAgentAnalysis } from '../../api/api';

// ── Pre-built query suggestions ─────────────────────────────────────────────
const SUGGESTIONS = [
  'Summarize my recent imaging results and how they relate to my medical history.',
  'What do my uploaded lab reports show? Are there any concerns?',
  'Give me an overview of my current health status based on all my records.',
  'How do my medications relate to my recent diagnoses?',
  'Are there any patterns in my medical history I should be aware of?',
];

// ── Agent Status Step ────────────────────────────────────────────────────────
function AgentStep({ icon, label, status }) {
  const styles = {
    idle: { color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)' },
    running: { color: 'var(--accent-cyan)', background: 'rgba(0,229,255,0.07)', animation: 'pulse 1.5s infinite' },
    done: { color: 'var(--accent-emerald)', background: 'rgba(16,185,129,0.08)' },
    error: { color: 'var(--accent-rose)', background: 'rgba(244,63,94,0.08)' },
  };
  const s = styles[status] || styles.idle;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)',
      border: `1px solid ${status === 'running' ? 'rgba(0,229,255,0.2)' : status === 'done' ? 'rgba(16,185,129,0.2)' : 'var(--border-glass)'}`,
      background: s.background, color: s.color,
      transition: 'all 0.4s ease', fontSize: '0.88rem', fontWeight: 500,
    }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {status === 'running' && (
        <span style={{ display: 'flex', gap: '3px' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-cyan)',
              animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
            }} />
          ))}
        </span>
      )}
      {status === 'done' && <span>✓</span>}
      {status === 'error' && <span>✗</span>}
    </div>
  );
}

// ── Source Badge ─────────────────────────────────────────────────────────────
function SourceBadge({ label, count, color }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.3rem 0.75rem', borderRadius: '20px',
      background: `rgba(${color}, 0.1)`, border: `1px solid rgba(${color}, 0.25)`,
      color: `rgb(${color})`, fontSize: '0.78rem', fontWeight: 600,
    }}>
      {label}: <strong>{count}</strong>
    </div>
  );
}

// ── Markdown-lite renderer ───────────────────────────────────────────────────
function ResponseText({ text }) {
  const lines = text.split('\n');
  return (
    <div style={{ lineHeight: 1.75, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h3 key={i} style={{ color: 'var(--accent-cyan)', margin: '1rem 0 0.4rem', fontSize: '1rem', fontWeight: 700 }}>{line.slice(3)}</h3>;
        if (line.startsWith('# ')) return <h2 key={i} style={{ color: 'var(--accent-cyan)', margin: '1rem 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>{line.slice(2)}</h2>;
        if (line.startsWith('- ') || line.startsWith('• ')) {
          const content = line.replace(/^[-•]\s/, '');
          return (
            <div key={i} style={{ display: 'flex', gap: '0.6rem', margin: '0.3rem 0' }}>
              <span style={{ color: 'var(--accent-cyan)', marginTop: '0.15rem', flexShrink: 0 }}>▸</span>
              <span dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          );
        }
        if (line.startsWith('⚕️') || line.includes('consult your physician')) {
          return (
            <div key={i} style={{
              marginTop: '1.25rem', padding: '0.75rem 1rem',
              background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)',
              borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--text-secondary)',
              fontStyle: 'italic',
            }}>{line}</div>
          );
        }
        if (line.trim() === '') return <div key={i} style={{ height: '0.5rem' }} />;
        return <p key={i} style={{ margin: '0.3rem 0' }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />;
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AgentAnalysis() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [agentSteps, setAgentSteps] = useState({
    coordinator: 'idle',
    imageAgent: 'idle',
    historyAgent: 'idle',
    gemini: 'idle',
  });
  const responseRef = useRef(null);

  // Auto-scroll to result
  useEffect(() => {
    if (result && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  const resetSteps = () =>
    setAgentSteps({ coordinator: 'idle', imageAgent: 'idle', historyAgent: 'idle', gemini: 'idle' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setResult(null);
    setError(null);

    // Animate agent steps
    setAgentSteps({ coordinator: 'running', imageAgent: 'idle', historyAgent: 'idle', gemini: 'idle' });
    await new Promise(r => setTimeout(r, 600));

    setAgentSteps({ coordinator: 'running', imageAgent: 'running', historyAgent: 'running', gemini: 'idle' });

    try {
      const data = await runAgentAnalysis(query.trim());

      // Mark specialist agents done, start Gemini step
      setAgentSteps({ coordinator: 'running', imageAgent: 'done', historyAgent: 'done', gemini: 'running' });
      await new Promise(r => setTimeout(r, 500));

      setAgentSteps({ coordinator: 'done', imageAgent: 'done', historyAgent: 'done', gemini: 'done' });
      setResult(data);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Analysis failed. Please try again.';
      setError(msg);
      setAgentSteps({ coordinator: 'error', imageAgent: 'error', historyAgent: 'error', gemini: 'idle' });
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (s) => {
    setQuery(s);
    resetSteps();
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setQuery('');
    setResult(null);
    setError(null);
    resetSteps();
  };

  return (
    <div className="dashboard-content animate-fade-in" style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{
            fontSize: '2rem', padding: '0.4rem',
            background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(37,99,235,0.15))',
            borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,229,255,0.2)',
          }}>🤖</span>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}
                className="text-gradient">
              Multi-Agent Analysis
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.15rem' }}>
              Powered by Image Analysis Agent · Patient History Agent · Gemini AI
            </p>
          </div>
        </div>

        {/* Architecture pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
          background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
          color: 'var(--accent-purple)',
        }}>
          <span>⚡</span>
          <span>Coordinator → Image Agent + History Agent → Gemini Synthesis</span>
        </div>
      </div>

      {/* ── Query Form ───────────────────────────────────────────────────── */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <span className="card-icon">🔍</span>
          <span className="card-title">Ask the Agent Network</span>
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            id="agent-query-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. What do my recent scan results show? How does my imaging relate to my current medications?"
            disabled={loading}
            rows={3}
            style={{
              width: '100%', resize: 'vertical', minHeight: 80,
              background: 'rgba(0,0,0,0.3)', border: `1px solid ${loading ? 'var(--border-glass)' : 'rgba(0,229,255,0.2)'}`,
              borderRadius: 'var(--radius-sm)', color: '#fff', padding: '0.85rem 1rem',
              fontFamily: 'inherit', fontSize: '0.95rem', lineHeight: 1.5,
              transition: 'border-color 0.2s', outline: 'none', marginBottom: '1rem',
            }}
            onFocus={e => { if (!loading) e.target.style.borderColor = 'var(--accent-cyan)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(0,229,255,0.2)'; }}
          />

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            {result && (
              <button type="button" onClick={handleReset}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)',
                  color: 'var(--text-secondary)', padding: '0.65rem 1.25rem',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'inherit',
                  fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                }}>
                ↩ New Query
              </button>
            )}
            <button
              id="run-agent-analysis-btn"
              type="submit"
              disabled={loading || !query.trim()}
              style={{
                background: loading || !query.trim()
                  ? 'rgba(0,229,255,0.15)'
                  : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                color: loading || !query.trim() ? 'var(--text-muted)' : 'var(--bg-primary)',
                border: 'none', borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 1.75rem', fontFamily: 'inherit',
                fontWeight: 700, fontSize: '0.95rem', cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.25s', display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
              {loading ? '⏳ Analysing...' : '🚀 Run Multi-Agent Analysis'}
            </button>
          </div>
        </form>

        {/* Suggestions */}
        {!result && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quick suggestions
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => handleSuggestion(s)} disabled={loading}
                  style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
                    color: 'var(--text-secondary)', padding: '0.35rem 0.75rem',
                    borderRadius: '20px', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '0.8rem', transition: 'all 0.2s', textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-glass)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Agent Pipeline Status ────────────────────────────────────────── */}
      {(loading || result || error) && (
        <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <span className="card-icon">⚙️</span>
            <span className="card-title">Agent Pipeline</span>
            {(result || error) && (
              <span style={{
                marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem',
                borderRadius: '20px',
                background: error ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)',
                border: error ? '1px solid rgba(244,63,94,0.3)' : '1px solid rgba(16,185,129,0.3)',
                color: error ? 'var(--accent-rose)' : 'var(--accent-emerald)',
              }}>
                {error ? 'Failed' : 'Complete'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <AgentStep icon="🎯" label="Coordinator Agent — routing request to specialist agents" status={agentSteps.coordinator} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <AgentStep icon="🩻" label="Image Analysis Agent — reading scan & OCR results from Cosmos DB" status={agentSteps.imageAgent} />
              </div>
              <div style={{ flex: 1 }}>
                <AgentStep icon="📋" label="Patient History Agent — loading records from Cosmos DB & PostgreSQL" status={agentSteps.historyAgent} />
              </div>
            </div>
            <AgentStep icon="✨" label="Gemini AI — synthesising findings into patient-friendly response" status={agentSteps.gemini} />
          </div>
        </div>
      )}

      {/* ── Error State ──────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          padding: '1.25rem', borderRadius: 'var(--radius-md)',
          background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.25)',
          color: 'var(--accent-rose)', marginBottom: '1.5rem',
          display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div>
            <strong>Analysis failed</strong>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{error}</p>
          </div>
        </div>
      )}

      {/* ── Result ───────────────────────────────────────────────────────── */}
      {result && (
        <div ref={responseRef} className="glass-card animate-fade-in">
          <div className="card-header">
            <span className="card-icon">🧠</span>
            <span className="card-title">Agent Synthesis</span>
            {/* Source badges */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <SourceBadge label="📁 Records" count={result.sources?.record_count ?? 0} color="0,229,255" />
              <SourceBadge label="🩻 Images" count={result.sources?.image_count ?? 0} color="139,92,246" />
              <SourceBadge label="💊 Meds" count={result.sources?.medication_count ?? 0} color="16,185,129" />
            </div>
          </div>

          {/* Agents used tags */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {(result.agents_used || []).map(agent => (
              <span key={agent} style={{
                fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.7rem',
                borderRadius: '20px', background: 'rgba(0,229,255,0.08)',
                border: '1px solid rgba(0,229,255,0.2)', color: 'var(--accent-cyan)',
              }}>
                ✓ {agent}
              </span>
            ))}
            <span style={{
              fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.7rem',
              borderRadius: '20px', background: 'rgba(139,92,246,0.08)',
              border: '1px solid rgba(139,92,246,0.2)', color: 'var(--accent-purple)',
            }}>
              ✓ {result.model || 'gemini'}
            </span>
          </div>

          {/* Response text */}
          <div style={{
            background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)',
            padding: '1.25rem', border: '1px solid var(--border-glass)',
          }}>
            <ResponseText text={result.response} />
          </div>

          {/* Partial-failure warnings */}
          {(result.sources?.image_agent_error || result.sources?.history_agent_error) && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)',
              background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
              fontSize: '0.8rem', color: 'var(--accent-amber)',
            }}>
              ⚠️ One or more agents returned partial data. Results may be incomplete.
            </div>
          )}
        </div>
      )}

      {/* Bounce keyframe */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
