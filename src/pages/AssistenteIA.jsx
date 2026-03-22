import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Groq from "groq-sdk";
import { Send, Bot, User, BrainCircuit, Key, Loader2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AssistenteIA() {
  const { state } = useApp();
  const apiKey = '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';
  
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('segundo-cerebro-chat');
    return saved ? JSON.parse(saved) : [
      { role: 'assistant', content: 'Olá! Sou seu assistente de Segundo Cérebro. Tenho acesso aos seus dados financeiros, tarefas, saúde e metas. Como posso ajudar você hoje?' }
    ];
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Salvar chat no localStorage separado (para não sujar o state global rápido já que cresce)
  useEffect(() => {
    localStorage.setItem('segundo-cerebro-chat', JSON.stringify(messages));
  }, [messages]);

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'Chat reiniciado. Em que posso ajudar?' }]);
  };

  const parseStateForContext = () => {
    // Clonamos o estado mas omitimos configurações sensíveis/irrelevantes para o LLM
    const { config, ...dadosRelevantes } = state;
    
    // Podemos formatar um pouco melhor ou só jogar o JSON stringificado.
    return JSON.stringify(dadosRelevantes, null, 2);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !apiKey) return;

    const userText = input.trim();
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const groq = new Groq({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

      const systemPrompt = `Você é o "Assistente IA" do "Segundo Cérebro", um aplicativo de produtividade pessoal e finanças.
O usuário te deu acesso total e local aos dados dele. Ajude-o a analisar suas finanças, lembrar de tarefas, recomendar focar em metas, e responder perguntas com base nos dados.

DADOS ATUAIS DO USUÁRIO (Formato JSON):
\`\`\`json
${parseStateForContext()}
\`\`\`

REGRAS:
1. Responda sempre em PT-BR de forma amigável, concisa e direta.
2. Formate dados monetários como "R$ X.XXX,XX".
3. Se um dado não estiver no JSON acima, diga que não encontrou a informação.
4. Você pode usar Markdown na sua resposta livremente.`;

      const chatHistory = messages.filter(m => m.content).map(m => ({
        role: m.role,
        content: m.content
      }));

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 2048,
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
          { role: "user", content: userText }
        ]
      });

      const botReply = completion.choices[0].message.content;
      setMessages(prev => [...prev, { role: 'assistant', content: botReply }]);
      
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ **Ocorreu um erro:** ${error.message || 'Falha ao contatar a API do Groq. Verifique sua chave API ou conexão.'}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!apiKey) {
    return (
      <div className="card p-xl flex-col items-center justify-center text-center mt-xl" style={{ maxWidth: 600, margin: '40px auto' }}>
        <Key size={64} className="text-muted mb-md" />
        <h2>API Key Necessária</h2>
        <p className="text-muted mb-lg" style={{ lineHeight: 1.6 }}>
          Configure sua API Key do Groq em ⚙️ Configurações. Obtenha gratuitamente em console.groq.com
        </p>
        <Link to="/configuracoes" className="btn btn-primary">
          <Key size={18} /> Configurar API Key
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div className="page-header flex justify-between items-center mb-0" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="flex items-center gap-sm"><BrainCircuit className="text-accent" /> Assistente IA</h1>
          <p>Seu assistente pessoal com contexto total da sua vida</p>
        </div>
        <button className="btn btn-ghost btn-sm text-muted" onClick={clearChat} title="Limpar Histórico">
          <Trash2 size={16} /> Limpar
        </button>
      </div>

      <div className="chat-container flex-col p-md" style={{ flex: 1, overflowY: 'auto', gap: '24px' }}>
        {messages.map((msg, i) => {
          const isBot = msg.role === 'assistant';
          return (
            <div key={i} className={`flex gap-md ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}>
              <div 
                className="flex items-center justify-center" 
                style={{ 
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: isBot ? 'var(--surface2)' : 'var(--accent)',
                  color: isBot ? 'var(--accent)' : '#fff',
                  border: isBot ? '1px solid var(--border)' : 'none'
                }}
              >
                {isBot ? <Bot size={20} /> : <User size={20} />}
              </div>
              
              <div 
                className={`markdown-body ${isBot ? 'bot-bubble' : 'user-bubble'}`}
                style={{
                  maxWidth: '75%',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  borderTopLeftRadius: isBot ? 4 : 16,
                  borderTopRightRadius: !isBot ? 4 : 16,
                  background: isBot ? 'var(--surface)' : 'rgba(124, 106, 255, 0.15)',
                  border: isBot ? '1px solid var(--border)' : '1px solid rgba(124, 106, 255, 0.3)',
                  color: 'var(--text)',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {/* Aqui poderíamos usar um ReactMarkdown, porém para manter simples sem libs extra, renderizamos texto puro. O Markdown básico será meio texto puro, mas espaçado. */}
                {msg.content}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex gap-md items-start">
             <div className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface2)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                <Bot size={20} />
             </div>
             <div className="bot-bubble flex items-center" style={{ padding: '16px 24px', borderRadius: '16px', borderTopLeftRadius: 4, background: 'var(--surface)', border: '1px solid var(--border)' }}>
               <Loader2 size={20} className="spin text-accent" />
               <span className="ml-sm text-muted ml-sm" style={{ marginLeft: '8px' }}>Pensando...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form 
        onSubmit={handleSend} 
        className="chat-input-area" 
        style={{ 
          padding: '16px', 
          borderTop: '1px solid var(--border)',
          background: 'var(--bg)',
          position: 'sticky',
          bottom: 0
        }}
      >
        <div className="flex items-center gap-sm" style={{ background: 'var(--surface)', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Pergunte algo sobre seus dados, tarefas atrasadas, saldos..."
            style={{ flex: 1, background: 'transparent', border: 'none', padding: '8px 16px', fontSize: '1rem', color: 'var(--text)', outline: 'none' }}
          />
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isLoading || !input.trim()}
            style={{ width: 44, height: 44, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
