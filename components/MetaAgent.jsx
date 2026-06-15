'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot } from 'lucide-react';

const QUICK_PROMPTS = [
  '¿Cómo puedo bajar el CPL este mes?',
  '¿Qué sucursal debería escalar y cuál pausar?',
  'Analizá la tendencia de los últimos días',
  'Comparame este mes con el anterior',
  '¿Mis leads WhatsApp vs formulario están balanceados?',
];

function buildContext(metaData, variations) {
  const { current, prev, sucursales = [], daily = [] } = metaData;
  return {
    currentRange: current.range?.label || 'mes actual',
    prevRange: prev.range?.label || 'mes anterior',
    spend: current.spend,
    totalLeads: current.totalLeads,
    cpl: current.cpl,
    waLeads: current.waLeads,
    formLeads: current.formLeads,
    impressions: current.impressions,
    clicks: current.clicks,
    ctr: current.ctr,
    prevSpend: prev.spend,
    prevTotalLeads: prev.totalLeads,
    prevCpl: prev.cpl,
    variations,
    sucursales,
    recentTrend: daily.slice(-7),
  };
}

function MessageBubble({ msg, isStreaming }) {
  const isUser = msg.role === 'user';
  const isEmpty = !msg.content && isStreaming;

  // Render simple markdown: **bold** and newlines
  function renderContent(text) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      return <span key={i}>{parts}{i < text.split('\n').length - 1 && <br />}</span>;
    });
  }

  return (
    <div className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#E91E8C] flex items-center justify-center flex-shrink-0 mt-1">
          <Sparkles size={13} color="white" />
        </div>
      )}
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-[#003B5C] text-white rounded-tr-sm'
            : 'bg-gray-50 text-gray-800 rounded-tl-sm border border-gray-100'
        }`}
      >
        {isEmpty ? (
          <span className="inline-flex gap-1 items-center">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        ) : (
          renderContent(msg.content)
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
          <User size={13} color="#555" />
        </div>
      )}
    </div>
  );
}

export default function MetaAgent({ metaData, variations }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text) {
    if (!text.trim() || isLoading) return;
    const userMsg = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/meta-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          metaContext: buildContext(metaData, variations),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: accumulated };
          return updated;
        });
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: `No pude procesar la consulta: ${err.message}` };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: '680px' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B5C] to-[#005580] text-white px-5 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 bg-[#E91E8C] rounded-full flex items-center justify-center">
          <Sparkles size={17} />
        </div>
        <div>
          <div className="font-bold text-sm">IA Estratega — Meta Ads</div>
          <div className="text-xs opacity-60">Analizá y optimizá tus campañas con inteligencia artificial</div>
        </div>
      </div>

      {/* Quick prompts — solo cuando no hay mensajes */}
      {messages.length === 0 && (
        <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-400 font-medium mb-2">Preguntas frecuentes:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                disabled={isLoading}
                className="text-xs bg-gray-50 hover:bg-pink-50 hover:text-[#E91E8C] border border-gray-200 hover:border-pink-200 rounded-full px-3 py-1.5 transition-colors text-gray-600 disabled:opacity-40"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 select-none">
            <Bot size={40} className="mb-3" />
            <p className="text-sm">Haceme una pregunta sobre tus campañas</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            msg={msg}
            isStreaming={isLoading && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Preguntá sobre tus campañas..."
          disabled={isLoading}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C] disabled:opacity-50 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-[#E91E8C] text-white rounded-xl px-4 py-2.5 hover:bg-[#c4166f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
