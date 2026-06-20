import React, { useState, useRef, useEffect } from 'react';
import { Activity, Send } from 'lucide-react';
import { sendChatMessage } from '../api/api.js';

function ChatWindow({ medications, appointments, history }) {
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am Aegis, your AI Health Agent. I monitor your medical history, schedule appointments, and trace your daily medication routines. Ask me anything about your current health status or schedules.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChatMessages((prev) => [...prev, { sender: 'user', text: userMsg, timestamp }]);
    setChatInput('');
    setIsAiTyping(true);

    try {
      const data = await sendChatMessage(userMsg);
      setIsAiTyping(false);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: data.reply || 'I processed your query, but could not produce a valid reply.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setIsAiTyping(false);
      setTimeout(() => {
        const lowerMsg = userMsg.toLowerCase();
        let replyText =
          'I encountered an error connecting to the API Gateway. Analyzing local state:\n\n';
        if (lowerMsg.includes('medication') || lowerMsg.includes('dose') || lowerMsg.includes('pill')) {
          replyText += `You have ${medications.length} configured medications. Ensure you complete your schedules today.`;
        } else if (lowerMsg.includes('history') || lowerMsg.includes('record')) {
          replyText += `You have logged ${history.length} medical history entries.`;
        } else if (lowerMsg.includes('appointment')) {
          replyText += `You have ${appointments.filter((a) => a.status === 'Scheduled').length} upcoming appointments.`;
        } else {
          replyText += 'Running in offline mode. Check that api-gateway and MongoDB containers are active.';
        }
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: replyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }, 800);
    }
  };

  return (
    <div className="glass-card chat-window">
      <div className="card-header">
        <Activity className="card-icon" size={20} />
        <h2 className="card-title">Aegis AI Health Assistant</h2>
      </div>
      <div className="chat-history">
        {chatMessages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.sender}`}>
            <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
            <span className="meta">{msg.timestamp}</span>
          </div>
        ))}
        {isAiTyping && (
          <div className="chat-message ai">
            <p>Thinking...</p>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSend} className="chat-input-bar">
        <input
          id="chat-input"
          type="text"
          className="chat-input"
          placeholder="Ask about medications, allergies, missed routines or upcoming checks..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          disabled={isAiTyping}
        />
        <button type="submit" className="btn-send" disabled={isAiTyping}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

export default ChatWindow;
