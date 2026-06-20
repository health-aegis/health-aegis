import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── decorative floating orbs ───────────────────────────── */
const Orb = ({ size, top, left, color, delay = 0 }) => (
  <div style={{
    position: 'absolute', borderRadius: '50%',
    width: size, height: size, top, left,
    background: color, filter: 'blur(80px)',
    opacity: 0.15,
    animation: `floatOrb 8s ease-in-out ${delay}s infinite alternate`,
    pointerEvents: 'none',
  }} />
);

const features = [
  { icon: '🧠', title: 'AI-Powered Chat',      desc: 'Get instant answers and health summaries powered by Gemini Pro.' },
  { icon: '💊', title: 'Medication Tracking', desc: 'Monitor adherence with dynamic scheduling and scoring.' },
  { icon: '🔔', title: 'Real-time Alerts',   desc: 'Instant notifications sent to caregivers when assistance is needed.' },
  { icon: '🛡️', title: 'HIPAA Compliant',     desc: 'End-to-end encryption ensuring your medical data remains private.' },
];

const stats = [
  { value: '99.9%', label: 'Uptime' },
  { value: '256-bit', label: 'Encryption' },
  { value: '< 20ms', label: 'AI latency' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'patient' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await register(formData.name, formData.email, formData.password, formData.role);
    if (result.success) {
      navigate(`/${result.role}`);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        @keyframes floatOrb {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, -40px) scale(1.12); }
        }
        .login-split { display: flex; min-height: 100vh; background: var(--bg-primary); }

        /* ── LEFT PANEL ── */
        .login-left {
          flex: 1.15; position: relative; overflow: hidden;
          background: linear-gradient(145deg, #050B14 0%, #081121 40%, #040910 100%);
          display: flex; flex-direction: column; justify-content: space-between;
          padding: 52px 56px; border-right: 1px solid rgba(255,255,255,0.05);
        }
        .login-brand { display: flex; align-items: center; gap: 14px; }
        .login-brand-icon {
          width: 46px; height: 46px; border-radius: 14px;
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; box-shadow: 0 4px 20px rgba(0, 229, 255, 0.3);
        }
        .login-brand-name { font-size: 1.25rem; font-weight: 800; color: #fff; letter-spacing: -0.02em; }
        .login-hero { margin: 60px 0 40px; }
        .login-hero h2 {
          font-size: 2.6rem; font-weight: 900; line-height: 1.15;
          letter-spacing: -0.05em; color: #fff; margin-bottom: 16px;
          background: linear-gradient(135deg, #fff 0%, var(--accent-cyan) 50%, var(--accent-purple) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .login-hero p { font-size: 1rem; color: var(--text-secondary); max-width: 380px; line-height: 1.65; }
        
        .feature-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 48px; }
        .feature-item {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 14px 18px; border-radius: 12px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          transition: all 0.2s ease;
        }
        .feature-item:hover { background: rgba(0,229,255,0.05); border-color: rgba(0,229,255,0.2); }
        .feature-icon {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          background: rgba(0,229,255,0.1); border: 1px solid rgba(0,229,255,0.2);
          display: flex; align-items: center; justify-content: center; font-size: 17px;
        }
        .feature-title { font-size: 0.875rem; font-weight: 700; color: #fff; margin-bottom: 2px; }
        .feature-desc  { font-size: 0.78rem;  color: var(--text-muted); line-height: 1.4; }
        
        .stats-row { display: flex; gap: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); }
        .stat-num  { font-size: 1.4rem; font-weight: 900; color: var(--accent-cyan); letter-spacing: -0.04em; }
        .stat-lbl  { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }

        /* ── RIGHT PANEL ── */
        .login-right {
          width: 500px; flex-shrink: 0;
          background: rgba(3, 7, 14, 0.98);
          display: flex; align-items: center; justify-content: center;
          padding: 48px 40px; position: relative;
        }
        .login-form-wrap { width: 100%; max-width: 360px; animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .login-form-title {
          font-size: 1.75rem; font-weight: 800; letter-spacing: -0.04em;
          color: #fff; margin-bottom: 6px;
        }
        .login-form-sub { font-size: 0.875rem; color: var(--text-muted); margin-bottom: 32px; }
        
        .input-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .input-group label { font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
        .input {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: #fff; font-size: 0.9rem; padding: 12px 14px;
          width: 100%; transition: all 0.2s; outline: none; font-family: inherit;
        }
        .input:focus { border-color: var(--accent-cyan); box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.15); background: rgba(0, 229, 255, 0.03); }
        
        .pw-wrap { position: relative; }
        .pw-toggle {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: var(--text-muted);
          font-size: 1rem; padding: 4px; transition: color 0.2s;
        }
        .pw-toggle:hover { color: var(--accent-cyan); }
        
        .login-submit {
          width: 100%; padding: 14px; border: none; border-radius: 10px;
          font-size: 0.95rem; font-weight: 700; cursor: pointer; margin-top: 12px;
          font-family: inherit; background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
          color: #fff; box-shadow: 0 4px 24px rgba(0, 229, 255, 0.3); transition: all 0.2s ease;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .login-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0, 229, 255, 0.4); }
        .login-submit:active:not(:disabled) { transform: translateY(0); }
        .login-submit:disabled { opacity: 0.7; cursor: wait; }
        
        .divider-line { display: flex; align-items: center; gap: 12px; margin: 24px 0; }
        .divider-line::before, .divider-line::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
        .divider-line span { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; }
        
        .login-footer { text-align: center; font-size: 0.85rem; color: var(--text-secondary); }
        .login-footer a { color: var(--accent-cyan); text-decoration: none; font-weight: 600; }
        .login-footer a:hover { text-decoration: underline; }
        
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        
        @media (max-width: 900px) {
          .login-left { display: none; }
          .login-right { width: 100%; border-left: none; }
        }
      `}</style>

      <div className="login-split">

        {/* ═══════════════ LEFT PANEL ═══════════════ */}
        <div className="login-left">
          {/* decorative orbs */}
          <Orb size="450px" top="-100px" left="-100px" color="var(--accent-cyan)" delay={0} />
          <Orb size="350px" top="40%"    left="40%"   color="var(--accent-purple)" delay={2} />
          <Orb size="250px" top="80%"    left="-50px" color="var(--accent-blue)" delay={4} />

          {/* brand */}
          <div className="login-brand" style={{ position: 'relative', zIndex: 1 }}>
            <div className="login-brand-icon">⚕️</div>
            <span className="login-brand-name">Aegis Health</span>
          </div>

          {/* hero */}
          <div className="login-hero" style={{ position: 'relative', zIndex: 1 }}>
            <h2>Intelligent care.<br />Everywhere.</h2>
            <p>Join thousands of users managing their health and medications intelligently.</p>
          </div>

          {/* features */}
          <div className="feature-list" style={{ position: 'relative', zIndex: 1 }}>
            {features.map((f) => (
              <div key={f.title} className="feature-item">
                <div className="feature-icon">{f.icon}</div>
                <div>
                  <div className="feature-title">{f.title}</div>
                  <div className="feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════ RIGHT PANEL ═══════════════ */}
        <div className="login-right">
          <div className="login-form-wrap">
            <p className="login-form-title">Create an Account</p>
            <p className="login-form-sub">Sign up for free and secure your health data</p>

            <form onSubmit={handleRegister}>
              <div className="input-group">
                <label>Full Name</label>
                <input
                  className="input" type="text" placeholder="John Doe"
                  value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required autoFocus
                />
              </div>

              <div className="input-group">
                <label>Email address</label>
                <input
                  className="input" type="email" placeholder="you@example.com"
                  value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label>Password</label>
                <div className="pw-wrap">
                  <input
                    className="input" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                    value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}>
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              
              <div className="input-group">
                <label>Account Type</label>
                <select className="input" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                  <option value="patient" style={{ color: '#000' }}>Patient</option>
                  <option value="caregiver" style={{ color: '#000' }}>Caregiver</option>
                  <option value="admin" style={{ color: '#000' }}>System Administrator</option>
                </select>
              </div>

              {error && (
                <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--accent-rose)', marginBottom: '0.5rem' }}>
                  {error}
                </div>
              )}

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? 'Creating Account...' : 'Register Account'}
              </button>
            </form>

            <div className="divider-line"><span>or</span></div>

            <div className="login-footer">
              Already have an account?{' '}
              <Link to="/login">Sign In here →</Link>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
