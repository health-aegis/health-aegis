import React, { useState, useEffect, useRef } from 'react';
import { aiAPI, historyAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function ChatAssistant() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! I am **Aegis**, your AI Health Assistant powered by **Azure AI Foundry**.\n\nI have access to your live health records, medications, and appointments. Ask me anything about your health today!', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { sender: 'user', text: input, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    const sentText = input;
    setInput('');
    setIsLoading(true);

    // Typing indicator
    setMessages(prev => [...prev, { sender: 'ai', text: '...', time: '', isTyping: true }]);

    try {
      const res = await aiAPI.chat(sentText);
      setMessages(prev => [
        ...prev.filter(m => !m.isTyping),
        { sender: 'ai', text: res.data.reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } catch {
      setMessages(prev => [
        ...prev.filter(m => !m.isTyping),
        { sender: 'ai', text: '⚠️ Sorry, I was unable to reach the AI engine. Please ensure the backend server is running and the AI service is configured.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', `Chat Document: ${file.name}`);
      formData.append('category', 'Lab Report');
      formData.append('date', new Date().toISOString().split('T')[0]);
      
      try {
        setIsLoading(true);
        // Show file in chat
        setMessages(prev => [...prev, { sender: 'user', text: `📎 Uploaded Document: ${file.name}\n\nPlease read this document.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        setMessages(prev => [...prev, { sender: 'ai', text: '...', time: '', isTyping: true }]);
        
        await historyAPI.upload(formData);
        
        // Wait a little for async processing then let AI reply (mock AI reply since actual extraction is async)
        const res = await aiAPI.chat(`I have uploaded a document: ${file.name}. Can you acknowledge it?`);
        
        setMessages(prev => [
          ...prev.filter(m => !m.isTyping),
          { sender: 'ai', text: `I have received the document "${file.name}". Our background processors are currently extracting its contents. Once processed, it will be added to your Medical Records and I'll be able to answer questions about it.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
        
        addToast(`Document "${file.name}" sent to AI.`, 'success');
      } catch (error) {
        addToast('Failed to upload document.', 'error');
        setMessages(prev => [
          ...prev.filter(m => !m.isTyping),
          { sender: 'ai', text: '⚠️ Failed to process the document upload.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const suggestions = [
    "What medications do I have today?",
    "Are there any missed medications?",
    "When is my next appointment?",
    "Show my recent health history.",
    "Has my caregiver been alerted?",
  ];

  // Simple markdown bold renderer
  const renderText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part
    );
  };

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>AI Health Assistant</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Agent 1 — Powered by Azure AI with live access to your health data.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(20, 184, 166, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid rgba(20, 184, 166, 0.2)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-teal)', animation: 'pulse 2s infinite' }}></div>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-teal)', fontWeight: '600' }}>Azure AI Active</span>
        </div>
      </div>

      <div className="widget-glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        {/* Chat History */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              {msg.sender === 'ai' && (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                  🧠
                </div>
              )}
              <div style={{
                background: msg.sender === 'user' ? 'linear-gradient(135deg, var(--accent-blue), #6366f1)' : 'rgba(255,255,255,0.05)',
                border: msg.sender === 'ai' ? '1px solid var(--border-glass)' : 'none',
                padding: '1rem 1.25rem', borderRadius: '12px',
                borderTopRightRadius: msg.sender === 'user' ? 0 : '12px',
                borderTopLeftRadius: msg.sender === 'ai' ? 0 : '12px',
                maxWidth: '100%'
              }}>
                {msg.isTyping ? (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '0.25rem 0' }}>
                    {[0, 1, 2].map(d => (
                      <div key={d} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', animation: `bounce 1.2s ease-in-out ${d * 0.2}s infinite` }} />
                    ))}
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#fff', whiteSpace: 'pre-wrap' }}>
                      {msg.text.split('\n').map((line, li) => (
                        <span key={li}>{renderText(line)}{li < msg.text.split('\n').length - 1 && <br />}</span>
                      ))}
                    </p>
                    {msg.time && (
                      <div style={{ fontSize: '0.7rem', color: msg.sender === 'user' ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', marginTop: '0.5rem', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                        {msg.time}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
            {suggestions.map((sug, i) => (
              <button key={i} onClick={() => setInput(sug)}
                style={{ whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                {sug}
              </button>
            ))}
          </div>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1 }}>
              📎
            </button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
            <input
              type="text" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? 'Aegis is thinking...' : 'Ask me anything about your health...'}
              disabled={isLoading}
              style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', borderRadius: '24px', padding: '0 1.5rem', color: '#fff', fontSize: '0.95rem', outline: 'none', height: '48px' }}
            />
            <button type="submit" className="btn-submit" disabled={isLoading || !input.trim()}
              style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', opacity: isLoading || !input.trim() ? 0.5 : 1 }}>
              ➤
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-8px); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
