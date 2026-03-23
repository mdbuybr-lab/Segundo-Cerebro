import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, addDoc, collection, updateDoc, serverTimestamp } from 'firebase/firestore';
import Groq from 'groq-sdk';
import ReactMarkdown from 'react-markdown';
import { Send, Droplets, Plus, Minus, Loader2, Trash2, UtensilsCrossed } from 'lucide-react';

const TABS = ['🤖 Nutricionista IA', '🍽️ Plano Alimentar', '💧 Hidratação'];

const QUICK_MSGS = [
  'Criar meu plano alimentar',
  'Analisar minha alimentação de hoje',
  'Quanto devo beber de água?',
  'Calcular minhas calorias',
  'Sugestão para pré-treino',
  'O que comer para emagrecer?',
];

const MD_COMPONENTS = {
  p: ({ children }) => <p style={{ marginBottom: 8 }}>{children}</p>,
  strong: ({ children }) => <strong style={{ color: '#eeeef5' }}>{children}</strong>,
  ul: ({ children }) => <ul style={{ paddingLeft: 16, marginBottom: 8 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 16, marginBottom: 8 }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
  h1: ({ children }) => <h3 style={{ color: '#00e676', marginBottom: 8 }}>{children}</h3>,
  h2: ({ children }) => <h4 style={{ color: '#00e676', marginBottom: 8 }}>{children}</h4>,
  h3: ({ children }) => <h5 style={{ color: '#00e676', marginBottom: 6 }}>{children}</h5>,
  code: ({ children }) => <code style={{ background: 'rgba(0,230,118,0.1)', padding: '2px 6px', borderRadius: 4, fontSize: '0.85em' }}>{children}</code>,
};

function getContextoNutricao(user, metricas, plano, refeicoes, hidratacao) {
  const ult = metricas[0] || {};
  const hoje = new Date().toISOString().split('T')[0];
  const refHoje = refeicoes.filter(r => r.data === hoje);
  const hidHoje = hidratacao.find(h => h.data === hoje)?.ml || 0;

  return `Você é Nara, nutricionista virtual do app Segundo Cérebro.
Seja empática, motivadora e extremamente profissional.

PERFIL DO USUÁRIO:
- Nome: ${user?.displayName || 'Usuário'}
- Peso: ${ult.peso || 'não informado'} kg
- Altura: ${ult.altura || 'não informado'} cm
- IMC: ${ult.imc || 'não calculado'}
- % Gordura: ${ult.gordura || 'não informado'}%
- Massa Muscular: ${ult.massa || 'não informado'} kg
- Objetivo: ${ult.objetivo || 'não informado'}
- Restrições: ${ult.restricoes || 'nenhuma'}

HOJE (${hoje}):
- Refeições registradas: ${refHoje.length > 0 ? refHoje.map(r => r.desc).join(', ') : 'nenhuma ainda'}
- Hidratação: ${hidHoje}ml
- Plano atual: ${plano ? plano.nome || 'Plano ativo' : 'nenhum plano definido'}

Suas capacidades: criar planos alimentares, calcular calorias/macros, sugerir substituições, analisar refeições, ajustar plano.
Quando criar um plano, estruture: objetivo calórico, macros em g e %, refeição por refeição com horário, lista de recomendados/evitar.
Sempre pergunte objetivo, restrições, peso, altura e rotina antes de criar um plano.
Responda SEMPRE em português brasileiro. Seja direta e prática. Use Markdown.

REGRA OBRIGATÓRIA: Quando o usuário pedir para criar um plano alimentar completo, você DEVE incluir no final da sua resposta um bloco JSON entre as tags <SALVAR_PLANO_NUTRICAO> e </SALVAR_PLANO_NUTRICAO> com esta estrutura exata:

<SALVAR_PLANO_NUTRICAO>
{
  "nome": "Plano Alimentar - [Objetivo]",
  "objetivo": "Emagrecimento/Ganho de massa/etc",
  "caloriasAlvo": 2000,
  "proteinas": 150,
  "carboidratos": 200,
  "gorduras": 65,
  "refeicoes": [
    {
      "nome": "Café da manhã",
      "horario": "07:00",
      "calorias": 450,
      "alimentos": [
        { "nome": "Ovos mexidos", "quantidade": "2 unidades", "calorias": 140 }
      ]
    }
  ]
}
</SALVAR_PLANO_NUTRICAO>

Inclua TODAS as refeições do dia com TODOS os alimentos no JSON.
NÃO inclua esse bloco se o usuário não está pedindo para criar um plano completo.`;
}

export default function Nutricao() {
  const { state, addItem } = useApp();
  const { user } = useAuth();
  const [tab, setTab] = useState(0);

  const apiKey = state.config?.groqApiKey || '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';
  const metricas = state.academia?.metricas || [];
  const plano = state.nutricao?.plano;
  const refeicoes = state.nutricao?.refeicoes || [];
  const hidratacao = state.nutricao?.hidratacao || [];
  const hojeStr = new Date().toISOString().split('T')[0];

  // === CHAT ===
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('sc-nutri-chat');
    return saved ? JSON.parse(saved) : [{ role: 'assistant', content: 'Olá! Sou a **Nara**, sua nutricionista virtual 🥗. Posso criar planos alimentares, calcular suas calorias e macros, sugerir substituições saudáveis e muito mais! Como posso te ajudar hoje?' }];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { localStorage.setItem('sc-nutri-chat', JSON.stringify(messages)); }, [messages]);

  const sendMsg = async (text) => {
    if (!text?.trim()) return;
    const newMsgs = [...messages, { role: 'user', content: text.trim() }];
    setMessages(newMsgs);
    setInput('');
    setIsLoading(true);
    try {
      const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
      const systemPrompt = getContextoNutricao(user, metricas, plano, refeicoes, hidratacao);
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, ...newMsgs.slice(-20).map(m => ({ role: m.role, content: m.content }))],
        temperature: 0.7, max_tokens: 4096,
      });
      const responseText = completion.choices[0]?.message?.content || 'Sem resposta.';

      // Auto-save plan if detected
      const match = responseText.match(/<SALVAR_PLANO_NUTRICAO>([\s\S]*?)<\/SALVAR_PLANO_NUTRICAO>/);
      let cleanText = responseText;
      let saved = false;

      if (match && user) {
        try {
          const planoData = JSON.parse(match[1].trim());
          // Format conteudo from structured data for display
          let conteudo = '';
          if (planoData.refeicoes) {
            conteudo = planoData.refeicoes.map(r =>
              `**${r.nome}** — ${r.horario || ''} (${r.calorias || '?'} kcal)\n` +
              (r.alimentos || []).map(a => `  • ${a.nome} (${a.quantidade || ''}) — ${a.calorias || '?'} kcal`).join('\n')
            ).join('\n\n');
          }
          await setDoc(doc(db, `users/${user.uid}/nutricao_plano`, 'atual'), {
            ...planoData,
            conteudo,
            criadoPorIA: true,
            atualizadoEm: serverTimestamp(),
          });
          saved = true;
        } catch (e) { console.error('Erro ao salvar plano nutricao:', e); }
        cleanText = responseText.replace(/<SALVAR_PLANO_NUTRICAO>[\s\S]*?<\/SALVAR_PLANO_NUTRICAO>/, '').trim();
      }

      setMessages(prev => {
        const updated = [...prev, { role: 'assistant', content: cleanText }];
        if (saved) updated.push({ role: 'sistema', content: '✅ Plano alimentar salvo automaticamente! Acesse **Nutrição → Plano Alimentar** para ver.' });
        return updated;
      });
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Erro: ${err.message}` }]);
    }
    setIsLoading(false);
  };

  // === HIDRATAÇÃO ===
  const hidHoje = hidratacao.find(h => h.data === hojeStr);
  const mlHoje = hidHoje?.ml || 0;
  const metaAgua = 2000;
  const copos = Math.floor(mlHoje / 250);
  const pctAgua = Math.min((mlHoje / metaAgua) * 100, 100);

  const addCopo = async () => {
    if (!user) return;
    if (hidHoje) {
      await updateDoc(doc(db, `users/${user.uid}/nutricao_hidratacao`, hidHoje.id), { ml: mlHoje + 250 });
    } else {
      await addDoc(collection(db, `users/${user.uid}/nutricao_hidratacao`), { data: hojeStr, ml: 250, criadoEm: serverTimestamp() });
    }
  };
  const removeCopo = async () => {
    if (!user || mlHoje <= 0 || !hidHoje) return;
    await updateDoc(doc(db, `users/${user.uid}/nutricao_hidratacao`, hidHoje.id), { ml: Math.max(0, mlHoje - 250) });
  };

  return (
    <div>
      <style>{`
        .nutri-tabs { display: flex; gap: 4px; background: var(--surface); border-radius: 12px; padding: 4px; margin-bottom: 24px; overflow-x: auto; }
        .nutri-tab { padding: 10px 20px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; background: transparent; border: none; color: var(--text-secondary); transition: all 0.2s; white-space: nowrap; }
        .nutri-tab.active { background: var(--green); color: #000; }
        .nutri-tab:hover:not(.active) { background: var(--surface2); }
        .chat-area { display: flex; flex-direction: column; height: calc(100vh - 220px); background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
        .chat-msgs { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .chat-msgs::-webkit-scrollbar { width: 4px; } .chat-msgs::-webkit-scrollbar-thumb { background: #252538; border-radius: 4px; }
        .chat-bubble { max-width: 80%; padding: 14px 18px; border-radius: 16px; font-size: 0.9rem; line-height: 1.6; }
        .chat-bubble.user { align-self: flex-end; background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; border-bottom-right-radius: 4px; }
        .chat-bubble.assistant { align-self: flex-start; background: var(--surface2); border-bottom-left-radius: 4px; }
        .chat-input-bar { display: flex; gap: 8px; padding: 16px; border-top: 1px solid var(--border); background: var(--surface); }
        .chat-input-bar input { flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; color: var(--text); font-size: 0.9rem; outline: none; }
        .chat-input-bar input:focus { border-color: var(--green); }
        .chat-send { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, var(--green), #00c853); border: none; color: #000; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .quick-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
        .quick-chip { padding: 8px 14px; border-radius: 20px; font-size: 0.78rem; background: var(--surface2); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
        .quick-chip:hover { border-color: var(--green); color: var(--text); background: rgba(0,230,118,0.08); }
        .sys-msg { background: rgba(0,230,118,0.08); border: 1px solid rgba(0,230,118,0.2); border-radius: 10px; padding: 10px 16px; font-size: 0.82rem; color: #00e676; text-align: center; margin: 8px 0; align-self: center; max-width: 85%; }
        .water-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 32px; text-align: center; max-width: 500px; margin: 0 auto; }
        .water-circle { width: 180px; height: 180px; border-radius: 50%; margin: 24px auto; position: relative; display: flex; align-items: center; justify-content: center; }
        .water-btn { width: 64px; height: 64px; border-radius: 50%; border: none; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .water-btn:hover { transform: scale(1.1); }
        .meal-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
        .meal-card h4 { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .meal-item { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.03); }
        @media (max-width: 768px) { .chat-area { height: calc(100vh - 280px); } .chat-bubble { max-width: 92%; } }
      `}</style>

      <div className="page-header mb-md">
        <h1>🥗 Nutrição</h1>
        <p className="text-muted">Nara, sua nutricionista virtual</p>
      </div>

      <div className="nutri-tabs">
        {TABS.map((t, i) => <button key={i} className={`nutri-tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>)}
      </div>

      {/* TAB 0: Chat */}
      {tab === 0 && (
        <>
          <div className="quick-chips">
            {QUICK_MSGS.map((msg, i) => <button key={i} className="quick-chip" onClick={() => sendMsg(msg)}>{msg}</button>)}
          </div>
          <div className="chat-area">
            <div className="chat-msgs">
              {messages.map((m, i) => (
                m.role === 'sistema' ? (
                  <div key={i} className="sys-msg"><ReactMarkdown components={MD_COMPONENTS}>{m.content}</ReactMarkdown></div>
                ) : (
                  <div key={i} className={`chat-bubble ${m.role}`}>
                    {m.role === 'assistant' ? <ReactMarkdown components={MD_COMPONENTS}>{m.content}</ReactMarkdown> : m.content}
                  </div>
                )
              ))}
              {isLoading && <div className="chat-bubble assistant flex items-center gap-sm"><Loader2 size={16} className="spin" /> Nara está pensando...</div>}
              <div ref={endRef} />
            </div>
            <form className="chat-input-bar" onSubmit={e => { e.preventDefault(); sendMsg(input); }}>
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="Pergunte à Nara..." disabled={isLoading} />
              <button type="submit" className="chat-send" disabled={isLoading || !input.trim()}><Send size={18} /></button>
            </form>
          </div>
          <button className="btn btn-ghost mt-sm" style={{ fontSize: '0.8rem' }} onClick={() => setMessages([{ role: 'assistant', content: 'Chat reiniciado. Em que posso ajudar?' }])}>
            <Trash2 size={14} /> Limpar chat
          </button>
        </>
      )}

      {/* TAB 1: Plano Alimentar */}
      {tab === 1 && (
        <div>
          {plano ? (
            <div>
              <div className="card mb-md">
                <div className="flex justify-between items-center mb-md">
                  <h2>{plano.nome || 'Meu Plano Alimentar'}</h2>
                  {plano.criadoPorIA && <span className="badge badge-accent" style={{ fontSize: '0.75rem' }}>Criado pela Nara ✨</span>}
                </div>
                {plano.caloriasAlvo && (
                  <div className="flex gap-lg mb-md" style={{ flexWrap: 'wrap' }}>
                    <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>Calorias</span><div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--green)' }}>{plano.caloriasAlvo} kcal</div></div>
                    {plano.proteinas && <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>Proteínas</span><div className="font-mono">{plano.proteinas}g</div></div>}
                    {plano.carboidratos && <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>Carbos</span><div className="font-mono">{plano.carboidratos}g</div></div>}
                    {plano.gorduras && <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>Gorduras</span><div className="font-mono">{plano.gorduras}g</div></div>}
                  </div>
                )}
              </div>

              {/* Refeições estruturadas */}
              {plano.refeicoes && plano.refeicoes.length > 0 ? (
                plano.refeicoes.map((ref, i) => (
                  <div key={i} className="meal-card">
                    <h4>
                      <span>{ref.nome} {ref.horario ? `— ${ref.horario}` : ''}</span>
                      <span className="font-mono text-muted" style={{ fontSize: '0.85rem' }}>{ref.calorias || '?'} kcal</span>
                    </h4>
                    {ref.alimentos?.map((al, j) => (
                      <div key={j} className="meal-item">
                        <span>{al.nome} <span className="text-muted">({al.quantidade})</span></span>
                        <span className="font-mono text-muted">{al.calorias} kcal</span>
                      </div>
                    ))}
                  </div>
                ))
              ) : plano.conteudo ? (
                <div className="card">
                  <div style={{ lineHeight: 1.7, fontSize: '0.9rem' }}>
                    <ReactMarkdown components={MD_COMPONENTS}>{plano.conteudo}</ReactMarkdown>
                  </div>
                </div>
              ) : null}

              <button className="btn btn-ghost mt-lg" onClick={() => { setTab(0); sendMsg('Ajustar meu plano alimentar atual'); }}>
                Pedir ajuste à Nara →
              </button>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <UtensilsCrossed size={48} className="text-muted" style={{ marginBottom: 16 }} />
              <h3>Nenhum plano alimentar definido</h3>
              <p className="text-muted mt-sm">Peça à Nara para criar um plano personalizado!</p>
              <button className="btn btn-primary mt-lg" style={{ background: 'var(--green)', color: '#000' }} onClick={() => { setTab(0); sendMsg('Criar meu plano alimentar'); }}>
                🤖 Falar com Nara
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Hidratação */}
      {tab === 2 && (
        <div className="water-card">
          <Droplets size={32} style={{ color: 'var(--accent3)', marginBottom: 8 }} />
          <h2 style={{ fontSize: '1.3rem' }}>Hidratação de Hoje</h2>
          <p className="text-muted mt-xs">Meta: {metaAgua}ml ({metaAgua / 250} copos)</p>
          <div className="water-circle" style={{ background: `conic-gradient(var(--accent3) ${pctAgua * 3.6}deg, var(--surface2) ${pctAgua * 3.6}deg)` }}>
            <div style={{ width: 150, height: 150, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>{mlHoje}</span>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>ml ({copos} copos)</span>
            </div>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: pctAgua >= 100 ? 'var(--green)' : 'var(--accent3)', marginBottom: 24 }}>
            {Math.round(pctAgua)}% da meta {pctAgua >= 100 && ' ✅ Meta atingida!'}
          </div>
          <div className="flex items-center justify-center gap-lg">
            <button className="water-btn" style={{ background: 'var(--surface2)', color: 'var(--red)' }} onClick={removeCopo}><Minus size={28} /></button>
            <button className="water-btn" style={{ background: 'linear-gradient(135deg, var(--accent3), var(--accent))', color: '#fff', width: 80, height: 80, boxShadow: '0 4px 20px rgba(0,212,255,0.3)' }} onClick={addCopo}><Plus size={32} /></button>
            <button className="water-btn" style={{ background: 'var(--surface2)', color: 'var(--text-secondary)' }} disabled><span style={{ fontSize: '0.7rem' }}>250ml</span></button>
          </div>
          <div className="mt-xl">
            <h3 className="text-muted mb-md" style={{ fontSize: '0.85rem' }}>Últimos 7 dias</h3>
            <div className="flex justify-center gap-sm">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (6 - i));
                const key = d.toISOString().split('T')[0];
                const h = hidratacao.find(x => x.data === key);
                const ml = h?.ml || 0;
                const pct = Math.min((ml / metaAgua) * 100, 100);
                return (
                  <div key={i} className="flex-col items-center gap-xs" style={{ fontSize: '0.72rem' }}>
                    <div style={{ width: 28, height: 60, background: 'var(--surface2)', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${pct}%`, background: pct >= 100 ? 'var(--green)' : 'var(--accent3)', borderRadius: '0 0 6px 6px', transition: 'height 0.3s' }} />
                    </div>
                    <span className="text-muted">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
