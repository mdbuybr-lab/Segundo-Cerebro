import { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { serverTimestamp } from 'firebase/firestore';
import { callClaude, extractPlan } from '../utils/claudeApi';
import ReactMarkdown from 'react-markdown';
import { Modal, EmptyState, ConfirmDialog, formatDate, getToday, Checkbox } from '../components/shared';
import { Plus, Edit2, Trash2, Activity, Play, CheckCircle2, Send, Loader2, Dumbbell, Save } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const TABS = ['🤖 Personal IA', '📏 Métricas', '📋 Planos', '💪 Registrar Treino', '📊 Estatísticas'];

const QUICK_MSGS = [
  'Criar meu plano de treino',
  'Treino de hoje',
  'Como executar supino?',
  'Sugira progressão de carga',
  'Treino para emagrecer',
  'Treino em casa',
];

const MD_COMPONENTS = {
  p: ({ children }) => <p style={{ marginBottom: 8 }}>{children}</p>,
  strong: ({ children }) => <strong style={{ color: '#eeeef5' }}>{children}</strong>,
  ul: ({ children }) => <ul style={{ paddingLeft: 16, marginBottom: 8 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 16, marginBottom: 8 }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
  h1: ({ children }) => <h3 style={{ color: '#a2ff00', marginBottom: 8 }}>{children}</h3>,
  h2: ({ children }) => <h4 style={{ color: '#a2ff00', marginBottom: 8 }}>{children}</h4>,
  h3: ({ children }) => <h5 style={{ color: '#a2ff00', marginBottom: 6 }}>{children}</h5>,
  code: ({ children }) => <code style={{ background: 'rgba(162,255,0,0.1)', padding: '2px 6px', borderRadius: 4, fontSize: '0.85em' }}>{children}</code>,
};

function calcularStreak(treinosOrdenados) {
  if (!treinosOrdenados.length) return 0;
  let streak = 0;
  const hoje = new Date();
  for (let i = 0; i < 120; i++) {
    const d = new Date(hoje); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (treinosOrdenados.some(t => t.data === key)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function getContextoAcademia(user, metricas, planos, treinos) {
  const ult = metricas[0] || {};
  const treinosOrd = [...treinos].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const ultimo = treinosOrd[0];
  const streak = calcularStreak(treinosOrd);
  const planoAtivo = planos.find(p => p.ativo) || planos[0];

  return `Você é Max, personal trainer virtual do app Segundo Cérebro.
Seja motivador, técnico e focado em resultados seguros e sustentáveis.

PERFIL DO USUÁRIO:
- Nome: ${user?.displayName || 'Atleta'}
- Peso: ${ult.peso || 'não informado'} kg
- Altura: ${ult.altura || 'não informado'} cm
- % Gordura: ${ult.gordura || 'não informado'}%
- Massa Muscular: ${ult.massa || 'não informado'} kg
- Objetivo: ${ult.objetivo || 'não informado'}
- Nível: ${ult.nivel || 'não informado'}
- Limitações: ${ult.limitacoes || 'nenhuma'}

HISTÓRICO:
- Total de treinos: ${treinos.length}
- Streak atual: ${streak} dias
- Último treino: ${ultimo ? ultimo.data + ' — ' + (ultimo.planoNome || 'livre') : 'nenhum ainda'}
- Plano ativo: ${planoAtivo ? planoAtivo.nome : 'nenhum'}

Suas capacidades: criar programas de treino, sugerir progressão, explicar exercícios, adaptar para limitações, calcular volume/intensidade, analisar histórico, motivar.
Quando criar plano: divisão de treino, exercícios/séries/reps/carga/descanso por dia, aquecimento/alongamento, dicas de execução.
Pergunte sobre objetivo, nível, dias disponíveis e limitações antes de criar plano.
Responda SEMPRE em português brasileiro. Seja motivador e técnico. Use Markdown.

INSTRUÇÃO ESPECIAL — CRIAÇÃO DE PLANOS DE TREINO:
Quando o usuário pedir para criar um plano de treino, SEMPRE inclua no FINAL da mensagem um bloco JSON entre as tags <PLANO_TREINO> e </PLANO_TREINO>:
<PLANO_TREINO>
{
  "nome": "Nome do Plano",
  "objetivo": "Hipertrofia/Emagrecimento/etc",
  "nivel": "Iniciante/Intermediário/Avançado",
  "diasPorSemana": 3,
  "exercicios": [
    { "nome": "Supino reto", "series": "3", "reps": "8-12", "carga": "", "obs": "Foco na contração" },
    { "nome": "Crucifixo", "series": "3", "reps": "10-15", "carga": "", "obs": "" }
  ]
}
</PLANO_TREINO>`;
}

export default function Academia() {
  const { state, addItem, updateItem, deleteItem } = useApp();
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const apiKey = state.config?.claudeApiKey || '';

  const planos = state.academia?.planos || [];
  const treinos = state.academia?.treinos || [];
  const metricas = state.academia?.metricas || [];
  const treinosOrd = useMemo(() => [...treinos].sort((a, b) => (b.data || '').localeCompare(a.data || '')), [treinos]);
  const streak = useMemo(() => calcularStreak(treinosOrd), [treinosOrd]);

  // ============ TAB 0: CHAT ============
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('sc-personal-chat');
    return saved ? JSON.parse(saved) : [{ role: 'assistant', content: 'E aí! Sou o **Max**, seu personal trainer virtual 💪. Posso criar treinos personalizados, sugerir progressão de carga, explicar exercícios e muito mais. Bora treinar? 🔥' }];
  });
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { localStorage.setItem('sc-personal-chat', JSON.stringify(messages)); }, [messages]);

  const sendChat = async (text) => {
    if (!text?.trim()) return;
    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'user', content: text.trim() }, { role: 'assistant', content: '❌ **API Key não configurada.** Vá em ⚙️ Configurações e adicione sua API Key da Anthropic.' }]);
      setChatInput('');
      return;
    }
    const newMsgs = [...messages, { role: 'user', content: text.trim() }];
    setMessages(newMsgs); setChatInput(''); setChatLoading(true);
    try {
      const systemPrompt = getContextoAcademia(user, metricas, planos, treinos);
      const chatHistory = newMsgs.slice(-20).map(m => ({ role: m.role, content: m.content }));
      const responseText = await callClaude(systemPrompt, chatHistory, apiKey);

      const { cleanText, planData } = extractPlan(responseText, 'PLANO_TREINO');
      if (planData) setPendingPlan(planData);
      setMessages(prev => [...prev, { role: 'assistant', content: cleanText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Erro: ${err.message}` }]);
    }
    setChatLoading(false);
  };

  const savePlanFromAI = async () => {
    if (!pendingPlan) return;
    try {
      await addItem('planos', { ...pendingPlan, criadoPorIA: true });
      setMessages(prev => [...prev, { role: 'assistant', content: '✅ **Plano salvo com sucesso!** Acesse a aba "📋 Planos" para visualizar.' }]);
      setPendingPlan(null);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Erro ao salvar plano: ' + e.message }]);
    }
  };

  // ============ TAB 1: MÉTRICAS ============
  const [metForm, setMetForm] = useState({ peso: '', altura: '', gordura: '', massa: '', cintura: '', quadril: '', peito: '', braco: '', coxa: '', objetivo: '', nivel: '', limitacoes: '', data: getToday() });
  const [showMetForm, setShowMetForm] = useState(false);
  const ultMetrica = metricas[0] || {};
  const imc = metForm.peso && metForm.altura ? (Number(metForm.peso) / ((Number(metForm.altura) / 100) ** 2)).toFixed(1) : '';

  const saveMetrica = async (e) => {
    e.preventDefault();
    if (!metForm.peso) return;
    await addItem('metricas', { ...metForm, imc: imc || '' });
    setShowMetForm(false);
    setMetForm({ peso: '', altura: '', gordura: '', massa: '', cintura: '', quadril: '', peito: '', braco: '', coxa: '', objetivo: '', nivel: '', limitacoes: '', data: getToday() });
  };

  const pesoData = useMemo(() => [...metricas].reverse().filter(m => m.peso).map(m => ({
    label: m.data || '', peso: Number(m.peso), gordura: Number(m.gordura) || 0, massa: Number(m.massa) || 0
  })), [metricas]);

  // ============ TAB 2: PLANOS ============
  const [isOpenPlano, setIsOpenPlano] = useState(false);
  const [editingPlanoId, setEditingPlanoId] = useState(null);
  const [planoForm, setPlanoForm] = useState({ nome: '', exercicios: [] });
  const [exercicioForm, setExercicioForm] = useState({ nome: '', series: '3', reps: '10-12', carga: '', obs: '' });

  const openPlanoModal = (plano = null) => {
    if (plano) { setEditingPlanoId(plano.id); setPlanoForm(JSON.parse(JSON.stringify(plano))); }
    else { setEditingPlanoId(null); setPlanoForm({ nome: '', exercicios: [] }); }
    setIsOpenPlano(true);
  };
  const addExercicio = () => { if (!exercicioForm.nome) return; setPlanoForm({ ...planoForm, exercicios: [...planoForm.exercicios, { ...exercicioForm, id: Date.now() }] }); setExercicioForm({ nome: '', series: '3', reps: '10-12', carga: '', obs: '' }); };
  const removeExercicio = (id) => { setPlanoForm({ ...planoForm, exercicios: planoForm.exercicios.filter(e => e.id !== id) }); };
  const savePlano = (e) => { e.preventDefault(); if (!planoForm.nome) return; if (editingPlanoId) updateItem('planos', editingPlanoId, planoForm); else addItem('planos', planoForm); setIsOpenPlano(false); };

  // ============ TAB 3: REGISTRAR TREINO ============
  const [planoSel, setPlanoSel] = useState('');
  const [treinoAtivo, setTreinoAtivo] = useState(null);

  const iniciarTreino = () => {
    const pl = planos.find(p => String(p.id) === String(planoSel));
    if (!pl) return;
    setTreinoAtivo({
      planoId: pl.id, planoNome: pl.nome, data: getToday(), observacoes: '',
      exercicios: pl.exercicios.map(ex => ({ ...ex, seriesFeitas: 0, cargaReal: ex.carga || '', concluido: false }))
    });
  };

  const finalizarTreino = async () => {
    if (!treinoAtivo) return;
    await addItem('treinos', { ...treinoAtivo, finalizado: true });
    setTreinoAtivo(null);
  };

  // ============ TAB 4: ESTATÍSTICAS ============
  const treinosPorSemana = useMemo(() => {
    const hoje = new Date(); const result = [];
    for (let i = 7; i >= 0; i--) {
      const semStart = new Date(hoje); semStart.setDate(semStart.getDate() - (i * 7 + semStart.getDay()));
      const semEnd = new Date(semStart); semEnd.setDate(semEnd.getDate() + 6);
      const count = treinos.filter(t => { const d = t.data; return d >= semStart.toISOString().split('T')[0] && d <= semEnd.toISOString().split('T')[0]; }).length;
      result.push({ label: `S${8 - i}`, treinos: count });
    }
    return result;
  }, [treinos]);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  return (
    <div>
      <style>{`
        .acad-tabs { display: flex; gap: 4px; background: var(--surface); border-radius: 12px; padding: 4px; margin-bottom: 24px; overflow-x: auto; }
        .acad-tab { padding: 10px 16px; border-radius: 8px; font-size: 0.82rem; font-weight: 600; cursor: pointer; background: transparent; border: none; color: var(--text-secondary); transition: all 0.2s; white-space: nowrap; }
        .acad-tab.active { background: #a2ff00; color: #000; }
        .acad-tab:hover:not(.active) { background: var(--surface2); }

        .chat-area { display: flex; flex-direction: column; height: calc(100vh - 220px); background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
        .chat-msgs { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .chat-msgs::-webkit-scrollbar { width: 4px; } .chat-msgs::-webkit-scrollbar-thumb { background: #252538; border-radius: 4px; }
        .chat-bubble { max-width: 80%; padding: 14px 18px; border-radius: 16px; font-size: 0.9rem; line-height: 1.6; }
        .chat-bubble.user { align-self: flex-end; background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; border-bottom-right-radius: 4px; }
        .chat-bubble.assistant { align-self: flex-start; background: var(--surface2); border-bottom-left-radius: 4px; }
        .chat-input-bar { display: flex; gap: 8px; padding: 16px; border-top: 1px solid var(--border); background: var(--surface); }
        .chat-input-bar input { flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; color: var(--text); font-size: 0.9rem; outline: none; }
        .chat-input-bar input:focus { border-color: #a2ff00; }
        .chat-send { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #a2ff00, #00e676); border: none; color: #000; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .quick-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
        .quick-chip { padding: 8px 14px; border-radius: 20px; font-size: 0.78rem; background: var(--surface2); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
        .quick-chip:hover { border-color: #a2ff00; color: var(--text); }

        .save-plan-card { background: rgba(162,255,0,0.08); border: 1px solid #a2ff00; border-radius: 12px; padding: 16px; margin: 12px 0; display: flex; align-items: center; gap: 12px; align-self: flex-start; max-width: 80%; }
        .save-plan-btn { padding: 8px 20px; border-radius: 8px; background: #a2ff00; color: #000; border: none; cursor: pointer; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; }

        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
        .metric-input label { font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 4px; }
        .metric-input input, .metric-input select { width: 100%; padding: 10px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 0.9rem; }

        .no-key-banner { padding: 16px; background: rgba(255,106,155,0.1); border: 1px solid var(--accent2); border-radius: 12px; margin-bottom: 16px; font-size: 0.85rem; }

        @media (max-width: 768px) {
          .chat-area { height: calc(100vh - 280px); }
          .chat-bubble, .save-plan-card { max-width: 92%; }
          .metric-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="page-header mb-md">
        <h1>💪 Academia</h1>
        <p className="text-muted">Powered by Claude — Max, seu personal trainer virtual</p>
      </div>

      {!apiKey && (
        <div className="no-key-banner">
          ⚠️ <strong>API Key não configurada.</strong> Vá em ⚙️ Configurações e adicione sua API Key da Anthropic (Claude).
        </div>
      )}

      <div className="acad-tabs">
        {TABS.map((t, i) => (
          <button key={i} className={`acad-tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {/* TAB 0: Personal IA */}
      {tab === 0 && (
        <>
          <div className="quick-chips">
            {QUICK_MSGS.map((msg, i) => <button key={i} className="quick-chip" onClick={() => sendChat(msg)}>{msg}</button>)}
          </div>
          <div className="chat-area">
            <div className="chat-msgs">
              {messages.map((m, i) => (
                <div key={i} className={`chat-bubble ${m.role}`}>
                  {m.role === 'assistant' ? (
                    <ReactMarkdown components={MD_COMPONENTS}>{m.content}</ReactMarkdown>
                  ) : m.content}
                </div>
              ))}
              {pendingPlan && (
                <div className="save-plan-card">
                  <span>💪 Max criou um plano de treino para você!</span>
                  <button className="save-plan-btn" onClick={savePlanFromAI}><Save size={16} /> Salvar Plano</button>
                </div>
              )}
              {chatLoading && <div className="chat-bubble assistant flex items-center gap-sm"><Loader2 size={16} className="spin" /> Max está pensando...</div>}
              <div ref={endRef} />
            </div>
            <form className="chat-input-bar" onSubmit={e => { e.preventDefault(); sendChat(chatInput); }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Fale com o Max..." disabled={chatLoading} />
              <button type="submit" className="chat-send" disabled={chatLoading || !chatInput.trim()}><Send size={18} /></button>
            </form>
          </div>
          <button className="btn btn-ghost mt-sm" style={{ fontSize: '0.8rem' }} onClick={() => { setMessages([{ role: 'assistant', content: 'Chat reiniciado. Bora treinar! 💪' }]); setPendingPlan(null); }}>
            <Trash2 size={14} /> Limpar chat
          </button>
        </>
      )}

      {/* TAB 1: Métricas */}
      {tab === 1 && (
        <div>
          {metricas.length > 0 && (
            <div className="card mb-lg flex items-center gap-lg" style={{ flexWrap: 'wrap' }}>
              <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>Última medição</span><div className="font-mono">{ultMetrica.data || '-'}</div></div>
              <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>Peso</span><div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700 }}>{ultMetrica.peso || '-'} kg</div></div>
              <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>Gordura</span><div className="font-mono">{ultMetrica.gordura || '-'}%</div></div>
              <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>Músculo</span><div className="font-mono">{ultMetrica.massa || '-'} kg</div></div>
              <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>IMC</span><div className="font-mono">{ultMetrica.imc || '-'}</div></div>
              {metricas.length > 1 && (() => {
                const diff = Number(metricas[0].peso) - Number(metricas[metricas.length - 1].peso);
                return <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>Evolução</span><div className="font-mono" style={{ color: diff <= 0 ? 'var(--green)' : 'var(--red)' }}>{diff > 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(1)} kg</div></div>;
              })()}
            </div>
          )}

          <button className="btn btn-primary mb-lg" onClick={() => setShowMetForm(!showMetForm)}>
            <Plus size={16} /> {showMetForm ? 'Cancelar' : 'Nova Medição'}
          </button>

          {showMetForm && (
            <form className="card mb-lg" onSubmit={saveMetrica}>
              <h3 className="mb-md">📏 Registrar Medição</h3>
              <div className="metric-grid">
                <div className="metric-input"><label>Data</label><input type="date" value={metForm.data} onChange={e => setMetForm({ ...metForm, data: e.target.value })} /></div>
                <div className="metric-input"><label>Peso (kg)</label><input type="number" step="0.1" value={metForm.peso} onChange={e => setMetForm({ ...metForm, peso: e.target.value })} required /></div>
                <div className="metric-input"><label>Altura (cm)</label><input type="number" value={metForm.altura} onChange={e => setMetForm({ ...metForm, altura: e.target.value })} /></div>
                <div className="metric-input"><label>% Gordura</label><input type="number" step="0.1" value={metForm.gordura} onChange={e => setMetForm({ ...metForm, gordura: e.target.value })} /></div>
                <div className="metric-input"><label>Massa Muscular (kg)</label><input type="number" step="0.1" value={metForm.massa} onChange={e => setMetForm({ ...metForm, massa: e.target.value })} /></div>
                <div className="metric-input"><label>IMC (auto)</label><input type="text" value={imc} readOnly style={{ opacity: 0.6 }} /></div>
                <div className="metric-input"><label>Cintura (cm)</label><input type="number" value={metForm.cintura} onChange={e => setMetForm({ ...metForm, cintura: e.target.value })} /></div>
                <div className="metric-input"><label>Quadril (cm)</label><input type="number" value={metForm.quadril} onChange={e => setMetForm({ ...metForm, quadril: e.target.value })} /></div>
                <div className="metric-input"><label>Peito (cm)</label><input type="number" value={metForm.peito} onChange={e => setMetForm({ ...metForm, peito: e.target.value })} /></div>
                <div className="metric-input"><label>Braço D. (cm)</label><input type="number" value={metForm.braco} onChange={e => setMetForm({ ...metForm, braco: e.target.value })} /></div>
                <div className="metric-input"><label>Coxa (cm)</label><input type="number" value={metForm.coxa} onChange={e => setMetForm({ ...metForm, coxa: e.target.value })} /></div>
                <div className="metric-input"><label>Objetivo</label>
                  <select value={metForm.objetivo} onChange={e => setMetForm({ ...metForm, objetivo: e.target.value })}>
                    <option value="">Selecione...</option><option>Hipertrofia</option><option>Emagrecimento</option><option>Condicionamento</option><option>Força</option><option>Saúde geral</option>
                  </select>
                </div>
                <div className="metric-input"><label>Nível</label>
                  <select value={metForm.nivel} onChange={e => setMetForm({ ...metForm, nivel: e.target.value })}>
                    <option value="">Selecione...</option><option>Iniciante</option><option>Intermediário</option><option>Avançado</option>
                  </select>
                </div>
                <div className="metric-input"><label>Limitações</label><input type="text" value={metForm.limitacoes} onChange={e => setMetForm({ ...metForm, limitacoes: e.target.value })} placeholder="Ex: dor no joelho direito" /></div>
              </div>
              <button type="submit" className="btn btn-primary mt-lg">Salvar Medição</button>
            </form>
          )}

          {pesoData.length > 1 && (
            <div className="card">
              <h3 className="mb-md">📈 Evolução Corporal</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={pesoData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252538" />
                  <XAxis dataKey="label" tick={{ fill: '#7a7a9a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#7a7a9a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e1e30', border: '1px solid #7c6aff', borderRadius: 8, color: '#fff' }} />
                  <Legend />
                  <Area type="monotone" dataKey="peso" name="Peso (kg)" stroke="#00e676" fill="rgba(0,230,118,0.15)" />
                  <Area type="monotone" dataKey="gordura" name="Gordura (%)" stroke="#ff4757" fill="rgba(255,71,87,0.1)" />
                  <Area type="monotone" dataKey="massa" name="Massa (kg)" stroke="var(--accent3)" fill="rgba(0,212,255,0.1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {metricas.length > 0 && (
            <div className="mt-lg">
              <h3 className="mb-md text-muted">Histórico de Medições</h3>
              <div className="table-wrapper"><table className="table"><thead><tr><th>Data</th><th>Peso</th><th>Gordura</th><th>Músculo</th><th>IMC</th></tr></thead>
              <tbody>{metricas.map(m => <tr key={m.id}><td>{m.data}</td><td>{m.peso} kg</td><td>{m.gordura || '-'}%</td><td>{m.massa || '-'} kg</td><td>{m.imc || '-'}</td></tr>)}</tbody></table></div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Planos */}
      {tab === 2 && (
        <div>
          <div className="flex justify-between items-center mb-lg">
            <h3>{planos.length} plano{planos.length !== 1 ? 's' : ''} cadastrado{planos.length !== 1 ? 's' : ''}</h3>
            <div className="flex gap-sm">
              <button className="btn btn-ghost" onClick={() => { setTab(0); sendChat('Criar meu plano de treino'); }}>🤖 Pedir ao Max</button>
              <button className="btn btn-primary" onClick={() => openPlanoModal()}><Plus size={16} /> Novo plano</button>
            </div>
          </div>

          {planos.length === 0 ? (
            <EmptyState icon={<Dumbbell size={48} />} message="Nenhum plano de treino. Peça ao Max ou crie manualmente!" />
          ) : (
            <div className="flex-col gap-md">
              {planos.map(p => (
                <div key={p.id} className="card">
                  <div className="flex justify-between items-center mb-sm">
                    <div>
                      <h3>{p.nome}</h3>
                      {p.criadoPorIA && <span className="badge badge-accent ml-sm" style={{ fontSize: '0.7rem' }}>🤖 Criado por IA</span>}
                    </div>
                    <div className="flex gap-xs">
                      <button className="btn-icon" onClick={() => openPlanoModal(p)}><Edit2 size={16} /></button>
                      <button className="btn-icon text-red" onClick={() => { setItemToDelete({ id: p.id, type: 'plano' }); setIsConfirmOpen(true); }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  {p.objetivo && <p className="text-muted mb-sm" style={{ fontSize: '0.82rem' }}>🎯 {p.objetivo} {p.nivel ? `• ${p.nivel}` : ''}</p>}
                  <p className="text-muted">{p.exercicios?.length || 0} exercícios</p>
                  {p.exercicios?.map((ex, i) => (
                    <div key={i} className="flex items-center gap-sm mt-xs" style={{ fontSize: '0.85rem', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                      <Dumbbell size={14} className="text-accent" />
                      <span style={{ flex: 1 }}>{ex.nome}</span>
                      <span className="font-mono text-muted">{ex.series}x{ex.reps}</span>
                      {ex.carga && <span className="font-mono text-accent3">{ex.carga}kg</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {isOpenPlano && (
            <Modal isOpen={isOpenPlano} onClose={() => setIsOpenPlano(false)} title={editingPlanoId ? 'Editar Plano' : 'Novo Plano'}>
              <form onSubmit={savePlano}>
                <input className="input mb-md" placeholder="Nome do plano" value={planoForm.nome} onChange={e => setPlanoForm({ ...planoForm, nome: e.target.value })} required />
                <h4 className="mb-sm">Exercícios ({planoForm.exercicios.length})</h4>
                {planoForm.exercicios.map((ex, i) => (
                  <div key={i} className="flex items-center gap-xs mb-xs" style={{ fontSize: '0.85rem' }}>
                    <span style={{ flex: 1 }}>{ex.nome}</span>
                    <span className="text-muted">{ex.series}x{ex.reps}</span>
                    <button type="button" className="btn-icon text-red" onClick={() => removeExercicio(ex.id)}><Trash2 size={14} /></button>
                  </div>
                ))}
                <div className="flex gap-xs mt-sm mb-md" style={{ flexWrap: 'wrap' }}>
                  <input className="input" style={{ flex: 2 }} placeholder="Nome do exercício" value={exercicioForm.nome} onChange={e => setExercicioForm({ ...exercicioForm, nome: e.target.value })} />
                  <input className="input" style={{ width: 60 }} placeholder="Séries" value={exercicioForm.series} onChange={e => setExercicioForm({ ...exercicioForm, series: e.target.value })} />
                  <input className="input" style={{ width: 70 }} placeholder="Reps" value={exercicioForm.reps} onChange={e => setExercicioForm({ ...exercicioForm, reps: e.target.value })} />
                  <input className="input" style={{ width: 60 }} placeholder="Carga" value={exercicioForm.carga} onChange={e => setExercicioForm({ ...exercicioForm, carga: e.target.value })} />
                  <button type="button" className="btn btn-ghost" onClick={addExercicio}><Plus size={16} /></button>
                </div>
                <button type="submit" className="btn btn-primary w-100">Salvar</button>
              </form>
            </Modal>
          )}
        </div>
      )}

      {/* TAB 3: Registrar Treino */}
      {tab === 3 && (
        <div>
          {!treinoAtivo ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <Play size={48} className="text-accent" style={{ marginBottom: 16 }} />
              <h3>Iniciar Treino</h3>
              <p className="text-muted mt-sm mb-lg">Selecione um plano para começar</p>
              <select className="input mb-md" value={planoSel} onChange={e => setPlanoSel(e.target.value)} style={{ maxWidth: 300, margin: '0 auto' }}>
                <option value="">Escolha um plano...</option>
                {planos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <br />
              <button className="btn btn-primary mt-md" onClick={iniciarTreino} disabled={!planoSel}><Play size={16} /> Começar</button>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-lg">
                <h3>🏋️ {treinoAtivo.planoNome}</h3>
                <button className="btn btn-primary" onClick={finalizarTreino}><CheckCircle2 size={16} /> Finalizar</button>
              </div>
              {treinoAtivo.exercicios.map((ex, i) => (
                <div key={i} className="card mb-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-sm">
                      <Checkbox checked={ex.concluido} onChange={() => {
                        const updated = { ...treinoAtivo };
                        updated.exercicios[i].concluido = !ex.concluido;
                        setTreinoAtivo({ ...updated });
                      }} />
                      <span style={{ textDecoration: ex.concluido ? 'line-through' : 'none', opacity: ex.concluido ? 0.5 : 1 }}>{ex.nome}</span>
                    </div>
                    <span className="font-mono text-muted">{ex.series}x{ex.reps}</span>
                  </div>
                  <div className="flex gap-sm mt-sm">
                    <input className="input" style={{ width: 80 }} placeholder="Carga" value={ex.cargaReal} onChange={e => {
                      const upd = { ...treinoAtivo };
                      upd.exercicios[i].cargaReal = e.target.value;
                      setTreinoAtivo({ ...upd });
                    }} />
                    <span className="text-muted flex items-center" style={{ fontSize: '0.8rem' }}>kg</span>
                  </div>
                </div>
              ))}
              <textarea className="input mt-md" placeholder="Observações do treino..." value={treinoAtivo.observacoes} onChange={e => setTreinoAtivo({ ...treinoAtivo, observacoes: e.target.value })} rows={3} style={{ width: '100%', resize: 'vertical' }} />
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Estatísticas */}
      {tab === 4 && (
        <div>
          <div className="flex gap-md mb-lg" style={{ flexWrap: 'wrap' }}>
            <div className="card" style={{ flex: 1, minWidth: 150, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>{treinos.length}</div>
              <div className="text-muted">Total de treinos</div>
            </div>
            <div className="card" style={{ flex: 1, minWidth: 150, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--accent)' }}>🔥 {streak}</div>
              <div className="text-muted">Streak atual</div>
            </div>
            <div className="card" style={{ flex: 1, minWidth: 150, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--green)' }}>{treinosOrd[0]?.data || '-'}</div>
              <div className="text-muted">Último treino</div>
            </div>
          </div>

          <div className="card mb-lg">
            <h3 className="mb-md">📊 Treinos por Semana (últimas 8 semanas)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={treinosPorSemana} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252538" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#7a7a9a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#7a7a9a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1e1e30', border: '1px solid #7c6aff', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="treinos" name="Treinos" fill="#a2ff00" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {treinos.length > 0 && (
            <div className="mt-lg">
              <h3 className="mb-md text-muted">Últimos 10 treinos</h3>
              <div className="table-wrapper"><table className="table"><thead><tr><th>Data</th><th>Plano</th><th>Exercícios</th></tr></thead>
              <tbody>{treinosOrd.slice(0, 10).map(t => <tr key={t.id}><td>{t.data}</td><td>{t.planoNome || '-'}</td><td>{t.exercicios?.length || 0}</td></tr>)}</tbody></table></div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={() => {
        if (itemToDelete) deleteItem(itemToDelete.type === 'plano' ? 'planos' : 'treinos', itemToDelete.id);
        setIsConfirmOpen(false);
      }} message="Tem certeza que deseja deletar este item?" />
    </div>
  );
}
