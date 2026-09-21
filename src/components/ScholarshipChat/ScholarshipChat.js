import React, { useState, useRef, useEffect } from "react";
import { askSGPBrain } from '../LocalAI/sgpBrain';
import "./ScholarshipChat.css";

function RobotIcon({ fab = false }) {
  if (fab) {
    return (
      <span className="sc-fab-robot-wrap">
        <img
          src="/robot.png"
          alt="SGP AI"
          className="sc-robot-img sc-robot-img-fab"
          style={{
            width: "92px",
            height: "116px",
            objectFit: "contain",
            animation: "scRobotFloat 3s ease-in-out infinite",
          }}
        />
      </span>
    );
  }
  return (
    <img
      src="/robot.png"
      alt="SGP AI"
      className="sc-robot-img"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        filter: "drop-shadow(0 0 6px rgba(59,130,246,0.8))",
      }}
    />
  );
}

const QUICK_QUESTIONS = [
  "I AM STUDENT",
  "How to Apply?",
  "Check Eligibility",
  "Documents Needed",
  "Bank Not Linked",
  "Aadhaar Mismatch",
  "Why Rejected?",
  "Scheme Closing Date",
];

function TypingDots() {
  return (
    <div className="sc-typing-dots">
      <span></span><span></span><span></span>
    </div>
  );
}

// FIX 1: Guard against undefined/null text
function renderText(text) {
  if (text == null || typeof text !== "string") return null;
  return text.split("\n").map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    );
    return <span key={i}>{parts}<br /></span>;
  });
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  // FIX 2: Never pass undefined to renderText
  const text = msg?.content ?? "";
  return (
    <div className={`sc-msg ${isUser ? "sc-msg-user" : "sc-msg-ai"}`}>
      {!isUser && (
        <div className="sc-ai-avatar"><RobotIcon /></div>
      )}
      <div className={`sc-bubble ${isUser ? "sc-bubble-user" : "sc-bubble-ai"}`}>
        {renderText(text)}
      </div>
      {isUser && <div className="sc-user-avatar">👤</div>}
    </div>
  );
}

export default function ScholarshipChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Welcome to Virtual Assistant!\n\nI run 100% locally — no internet needed.\n\nAsk me about scholarships, documents, DBT, eligibility, or how to apply:",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, messages]);

  // FIX 3: async/await — askSGPBrain is async, must be awaited
  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");
    setLoading(true);

    setMessages(prev => [...prev, { role: "user", content: userText }]);

    try {
      await new Promise(res => setTimeout(res, 600));

      const result = await askSGPBrain(userText);

      // FIX 4: Always produce a safe string for content
      const safeContent =
        result?.response && typeof result.response === "string" && result.response.trim()
          ? result.response
          : "🤔 I couldn't process that. Please try again or type \"help\".";

      setMessages(prev => [...prev, { role: "assistant", content: safeContent }]);
    } catch (err) {
      console.error("SGP chat error:", err);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "⚠️ Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    setMessages([{ role: "assistant", content: "👋 Chat cleared! How can I help you today?" }]);
  };

  return (
    <>
      {isOpen && (
        <div className="sc-window">

          {/* Header */}
          <div className="sc-header">
            <div className="sc-header-left">
              <div className="sc-header-robot"><RobotIcon /></div>
              <div>
                <div className="sc-header-title">Virtual Assistant</div>
                <div className="sc-header-sub">
                  <span className="sc-online-dot"></span> Local AI • No internet needed
                </div>
              </div>
            </div>
            <div className="sc-header-actions">
              <button className="sc-btn-clear" onClick={clearChat} title="Clear">🗑</button>
              <button className="sc-btn-close" onClick={() => setIsOpen(false)}>✕</button>
            </div>
          </div>

          {/* Scrolling disclaimer */}
          <div className="sc-disclaimer-bar">
            <div className="sc-disclaimer-track">
              ⚠️ Do not share personal information like Name, Phone Number, Aadhaar, Bank Account, Password or OTP &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; ⚠️ Do not share personal information like Name, Phone Number, Aadhaar, Bank Account, Password or OTP &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; ⚠️ Do not share personal information like Name, Phone Number, Aadhaar, Bank Account, Password or OTP
            </div>
          </div>

          {/* Quick options */}
          <div className="sc-quick-row">
            {QUICK_QUESTIONS.map((q, i) => (
              <button key={i} className="sc-quick-btn" onClick={() => sendMessage(q)}>{q}</button>
            ))}
          </div>

          {/* Messages */}
          <div className="sc-messages">
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {loading && (
              <div className="sc-msg sc-msg-ai">
                <div className="sc-ai-avatar"><RobotIcon /></div>
                <div className="sc-bubble sc-bubble-ai"><TypingDots /></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="sc-input-row">
            <textarea
              ref={inputRef}
              className="sc-input"
              placeholder="Ask about scholarships, DBT, documents..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
            />
            <button
              className={`sc-send ${loading || !input.trim() ? "sc-send-off" : ""}`}
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >➤</button>
          </div>

          {/* Local AI badge */}
          <div className="sc-local-badge">
            🔒 Powered by SGP Local AI — 100% offline, no API key
          </div>

        </div>
      )}

      {/* Floating robot button */}
      <div className="sc-fab-wrapper">
        {!isOpen && <div className="sc-fab-label">Virtual Assistant</div>}
        <button className="sc-fab" onClick={() => setIsOpen(prev => !prev)}>
          <RobotIcon fab={true} />
          {!isOpen && <div className="sc-fab-pulse"></div>}
        </button>
      </div>
    </>
  );
}
