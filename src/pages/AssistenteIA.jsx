import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { callClaude } from '../utils/claudeApi';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, BrainCircuit, Loader2, Trash2 } from 'lucide-react';

const MD_COMPONENTS = {
  p: ({ children }) => <p style={{ marginBottom: 8 }}>{children}</p>,
  strong: ({ children }) => <strong style={{ color: '#eeeef5' }}>{children}</strong>,
  ul: ({ children }) => <ul style={{ paddingLeft: 16, marginBottom: 8 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 16, marginBottom: 8 }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
  h1: ({ children }) => <h3 style={{ color: '#7c6aff', marginBottom: 8 }}>{children}</h3>,
  h2: ({ children }) => <h4 style={{ color: '#7c6aff', marginBottom: 8 }}>{children}</h4>,
  h3: ({ children }) => <h5 style={{ color: '#7c6aff', marginBottom: 6 }}>{children}</h5>,
  code: ({ children }) => <code style={{ background: 'rgba(124,106,255,0.15)', padding: '2px 6px', borderRadius: 4, fontSize: '0.85em' }}>{children}</code>,
};

export default function AssistenteIA() {
  const { state } = useApp();
  const apiKey = state.config?.claudeApiKey || '';

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('segundo-cerebro-chat');
    return saved ? JSON.parse(saved) : [
      { role: 'assistant', content: 'Olá! Sou seu assistente de **Segundo Cérebro**, powered by Claude. Tenho acesso aos seus dados financeiros, tarefas, saúde e metas. Como posso ajudar você hoje?' }
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('segundo-cerebro-chat', JSON.stringify(messages));
  }, [messages]);

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'Chat reiniciado. Em que posso ajudar?' }]);
  };

  const parseStateForContext = () => {
    const { config, ...dadosRelevantes } = state;
    return JSON.stringify(dadosRelevantes, null, 2);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'user', content: input.trim() }, { role: 'assistant', content: '❌ **API Key não configurada.** Vá em ⚙️ Configurações e adicione sua API Key da Anthropic (Claude).' }]);
      setInput('');
      return;
    }

    const userText = input.trim();
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = `Você é o "Assistente IA" do "Segundo Cérebro", um app de produtividade pessoal e finanças.
O usuário te deu acesso total e local aos dados dele. Ajude-o a analisar finanças, lembrar de tarefas, recomendar focar em metas, e responder perguntas com base nos dados.

DADOS ATUAIS DO USUÁRIO (Formato JSON):
\`\`\`json
${parseStateForContext()}
\`\`\`

REGRAS:
1. Responda sempre em PT-BR de forma amigável, concisa e direta.
2. Formate dados monetários como "R$ X.XXX,XX".
3. Se um dado não estiver no JSON acima, diga que não encontrou a informação.
4. Use Markdown na sua resposta (negrito, listas, etc).`;

      const chatHistory = newMessages.slice(-20).map(m => ({ role: m.role, content: m.content }));
      const responseText = await callClaude(systemPrompt, chatHistory, apiKey);
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Erro: ${err.message}` }]);
    }
    setIsLoading(false);
  };

  return (
    <div>
      <style>{`
        .ai-container { max-width: 900px; margin: 0 auto; }
        .ai-header { margin-bottom: 24px; }
        .ai-header h1 { display: flex; align-items: center; gap: 12px; }
        .ai-chat-area { display: flex; flex-direction: column; height: calc(100vh - 220px); background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
        .ai-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .ai-messages::-webkit-scrollbar { width: 4px; }
        .ai-messages::-webkit-scrollbar-thumb { background: #252538; border-radius: 4px; }
        .ai-msg { max-width: 82%; display: flex; gap: 12px; }
        .ai-msg.user { align-self: flex-end; flex-direction: row-reverse; }
        .ai-msg.assistant { align-self: flex-start; }
        .ai-avatar { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ai-avatar.user { background: linear-gradient(135deg, var(--accent), var(--accent2)); }
        .ai-avatar.assistant { background: var(--surface2); border: 1px solid var(--border); }
        .ai-bubble { padding: 14px 18px; border-radius: 16px; font-size: 0.9rem; line-height: 1.6; }
        .ai-bubble.user { background: linear-gradient(135deg, var(--accent), #5a4fd4); color: #fff; border-bottom-right-radius: 4px; }
        .ai-bubble.assistant { background: var(--surface2); border-bottom-left-radius: 4px; }
        .ai-input-bar { display: flex; gap: 8px; padding: 16px; border-top: 1px solid var(--border); background: var(--surface); }
        .ai-input-bar input { flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; color: var(--text); font-size: 0.9rem; outline: none; }
        .ai-input-bar input:focus { border-color: var(--accent); }
        .ai-send-btn { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, var(--accent), var(--accent2)); border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.15s; }
        .ai-send-btn:hover { transform: scale(1.05); }
        .ai-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .no-key-banner { padding: 16px; background: rgba(255,106,155,0.1); border: 1px solid var(--accent2); border-radius: 12px; margin-bottom: 16px; font-size: 0.85rem; }
        @media (max-width: 768px) { .ai-chat-area { height: calc(100vh - 280px); } .ai-msg { max-width: 92%; } }
      `}</style>

      <div className="ai-container">
        <div className="ai-header">
          <h1><BrainCircuit size={28} className="text-accent" /> Assistente IA</h1>
          <p className="text-muted">Powered by Claude — Analise seus dados, planeje e organize</p>
        </div>

        {!apiKey && (
          <div className="no-key-banner">
            ⚠️ <strong>API Key não configurada.</strong> Vá em ⚙️ Configurações e adicione sua API Key da Anthropic para usar o assistente.
          </div>
        )}

        <div className="ai-chat-area">
          <div className="ai-messages">
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role}`}>
                <div className={`ai-avatar ${m.role}`}>
                  {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`ai-bubble ${m.role}`}>
                  {m.role === 'assistant' ? (
                    <ReactMarkdown components={MD_COMPONENTS}>{m.content}</ReactMarkdown>
                  ) : m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="ai-msg assistant">
                <div className="ai-avatar assistant"><Bot size={16} /></div>
                <div className="ai-bubble assistant flex items-center gap-sm">
                  <Loader2 size={16} className="spin" /> Claude está pensando...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form className="ai-input-bar" onSubmit={handleSend}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Pergunte ao Claude..." disabled={isLoading} />
            <button type="submit" className="ai-send-btn" disabled={isLoading || !input.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>

        <button className="btn btn-ghost mt-sm" style={{ fontSize: '0.8rem' }} onClick={clearChat}>
          <Trash2 size={14} /> Limpar chat
        </button>
      </div>
    </div>
  );
}
