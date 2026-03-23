import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Wallet, Target, Activity, Zap, BrainCircuit, 
  CheckSquare, ListTodo, Square, Check,
  TrendingUp, Calendar as CalendarIcon, FolderKanban, Plus, AlertTriangle, Upload
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const formatCurrency = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const getToday = () => new Date().toISOString().split('T')[0];

function calcularStreak(treinosOrdenados) {
  if (!treinosOrdenados.length) return 0;
  let streak = 0;
  const hoje = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (treinosOrdenados.some(t => t.data === key)) {
      streak++;
    } else if (i > 0) break;
  }
  return streak;
}

function gerarDadosGrafico(entradas, saidas, periodo) {
  const dados = {};
  const hoje = new Date();

  if (periodo === 'semana') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
      dados[key] = { label, entradas: 0, saidas: 0 };
    }
    entradas.forEach(e => { if (e.data && dados[e.data]) dados[e.data].entradas += (parseFloat(e.valor) || 0); });
    saidas.forEach(s => { if (s.data && dados[s.data]) dados[s.data].saidas += (parseFloat(s.valor) || 0); });
  } else if (periodo === 'mes') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dados[key] = { label, entradas: 0, saidas: 0 };
    }
    entradas.forEach(e => { if (e.data && dados[e.data]) dados[e.data].entradas += (parseFloat(e.valor) || 0); });
    saidas.forEach(s => { if (s.data && dados[s.data]) dados[s.data].saidas += (parseFloat(s.valor) || 0); });
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      dados[key] = { label, entradas: 0, saidas: 0 };
    }
    entradas.forEach(e => {
      if (!e.data) return;
      const key = e.data.substring(0, 7);
      if (dados[key]) dados[key].entradas += (parseFloat(e.valor) || 0);
    });
    saidas.forEach(s => {
      if (!s.data) return;
      const key = s.data.substring(0, 7);
      if (dados[key]) dados[key].saidas += (parseFloat(s.valor) || 0);
    });
  }

  return Object.values(dados);
}

function gerarHeatmap(entradas, saidas, tarefas, treinos) {
  const heatmap = [];
  const hoje = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    let total = 0;
    total += entradas.filter(e => e.data === key).length;
    total += saidas.filter(s => s.data === key).length;
    total += treinos.filter(t => t.data === key).length;
    total += tarefas.filter(t => {
      if (!t.concluidoEm) return false;
      try {
        const dt = t.concluidoEm?.toDate?.()?.toISOString().split('T')[0];
        return dt === key;
      } catch { return false; }
    }).length;
    const intensity = total === 0 ? 0 : total <= 2 ? 1 : total <= 5 ? 2 : 3;
    heatmap.push({ id: key, intensity, total, label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) });
  }
  return heatmap;
}

export default function Dashboard() {
  const { state, updateItem } = useApp();
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState('mes');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const hojeStr = getToday();
  const mesAtual = hojeStr.substring(0, 7);

  // Data from AppContext (already real-time via onSnapshot)
  const contas = state.contasBancarias || state.contas || [];
  const entradas = state.entradas || [];
  const saidas = state.saidas || [];
  const tarefas = state.tarefas || [];
  const projetos = state.projetos || [];
  const agenda = state.agenda || [];
  const metas = state.metas || [];
  const treinos = state.academia?.treinos || [];
  const anotacoes = state.anotacoes || [];

  // === CARD 1: Patrimônio ===
  const patrimonioTotal = contas.reduce((sum, c) => sum + (Number(c.saldo) || 0), 0);

  const entradasMes = entradas.filter(e => e.data?.startsWith(mesAtual)).reduce((s, e) => s + (parseFloat(e.valor) || 0), 0);
  const saidasMes = saidas.filter(s => s.data?.startsWith(mesAtual)).reduce((s, e) => s + (parseFloat(e.valor) || 0), 0);
  const variacaoMes = entradasMes - saidasMes;

  // === CARD 2: Metas ===
  const metasConcluidas = metas.filter(m => m.status === 'Concluída').length;
  const metasTotais = metas.length;

  // === CARD 3: Treinos ===
  const treinosOrdenados = [...treinos].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const ultimoTreino = treinosOrdenados[0];
  const streakTreinos = calcularStreak(treinosOrdenados);
  const diasDesdeUltimo = ultimoTreino ? Math.floor((new Date() - new Date(ultimoTreino.data)) / 86400000) : null;

  // === CARD 4: Foco ===
  const tarefasPendentes = tarefas.filter(t => t.status !== 'Concluída');
  const tarefasHoje = tarefasPendentes.filter(t => t.vencimento === hojeStr);
  const tarefasAtrasadas = tarefasPendentes.filter(t => t.vencimento && t.vencimento < hojeStr);
  const focoHoje = [...tarefasAtrasadas, ...tarefasHoje].slice(0, 6);

  // === CHART ===
  const chartData = useMemo(() => gerarDadosGrafico(entradas, saidas, periodo), [entradas, saidas, periodo]);
  const hasChartData = chartData.some(d => d.entradas > 0 || d.saidas > 0);

  // === AGENDA ===
  const eventosHoje = agenda.filter(e => e.data === hojeStr).sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''));

  // === PROJETOS ===
  const projetosAtivos = useMemo(() => {
    return projetos.filter(p => p.status === 'Em Andamento' || p.status === 'Em andamento').map(p => {
      const vinculadas = tarefas.filter(t => t.projeto === p.id || t.projeto === p.nome);
      const concluidas = vinculadas.filter(t => t.status === 'Concluída').length;
      const total = vinculadas.length;
      return { ...p, tarefasTotal: total, tarefasConcluidas: concluidas, progressoReal: total > 0 ? Math.round((concluidas / total) * 100) : (p.progresso || 0) };
    }).slice(0, 4);
  }, [projetos, tarefas]);

  // === HEATMAP ===
  const heatmapData = useMemo(() => gerarHeatmap(entradas, saidas, tarefas, treinos), [entradas, saidas, tarefas, treinos]);

  // === MÉTRICAS ===
  const maiorStreak = calcularStreak(treinosOrdenados);
  const anotacoesMes = anotacoes.filter(a => {
    try { return a.criadoEm?.toDate?.()?.toISOString().startsWith(mesAtual); } catch { return false; }
  }).length;
  const transacoesMes = [...entradas, ...saidas].filter(t => t.data?.startsWith(mesAtual)).length;
  const treinosMes = treinos.filter(t => t.data?.startsWith(mesAtual)).length;

  // === CONCLUIR TAREFA ===
  const concluirTarefa = async (tarefaId) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/tarefas`, tarefaId), {
        status: 'Concluída',
        concluidoEm: serverTimestamp()
      });
    } catch (e) { console.error('Erro ao concluir tarefa:', e); }
  };

  // === FINANCE ANALYSIS ===
  const CAT_COLORS = { 'Alimentação': '#ff6b6b', 'Transporte': '#4ecdc4', 'Moradia': '#45b7d1', 'Saúde': '#96ceb4', 'Lazer': '#ffeaa7', 'Educação': '#a29bfe', 'Assinaturas': '#fd79a8', 'Outros': '#636e72', 'Compras': '#e17055' };

  const gastosPorCategoria = useMemo(() => {
    const agrupado = {};
    saidas.filter(s => s.data?.startsWith(mesAtual)).forEach(s => {
      const cat = s.cat || 'Outros';
      agrupado[cat] = (agrupado[cat] || 0) + (Number(s.valor) || 0);
    });
    return Object.entries(agrupado).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [saidas, mesAtual]);

  const totalGastosMes = gastosPorCategoria.reduce((s, c) => s + c.value, 0);

  const top5Gastos = useMemo(() => {
    return saidas.filter(s => s.data?.startsWith(mesAtual))
      .sort((a, b) => Number(b.valor) - Number(a.valor))
      .slice(0, 5)
      .map(s => ({ name: (s.desc || 'Sem descrição').slice(0, 22), value: Number(s.valor) || 0 }));
  }, [saidas, mesAtual]);

  const comparativo6m = useMemo(() => {
    const hoje = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoje); d.setMonth(d.getMonth() - (5 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const ent = entradas.filter(e => e.data?.startsWith(key)).reduce((s, e) => s + (Number(e.valor) || 0), 0);
      const sai = saidas.filter(s => s.data?.startsWith(key)).reduce((s, e) => s + (Number(e.valor) || 0), 0);
      return { label, entradas: ent, saidas: sai };
    });
  }, [entradas, saidas]);

  const maiorGastoMes = saidas.filter(s => s.data?.startsWith(mesAtual)).sort((a, b) => Number(b.valor) - Number(a.valor))[0];
  const catTop = gastosPorCategoria[0];
  const melhorMes = comparativo6m.reduce((best, m) => (m.entradas - m.saidas) > (best.entradas - best.saidas) ? m : best, comparativo6m[0] || { label: '-', entradas: 0, saidas: 0 });
  const diasNoMes = new Date().getDate();
  const mediaDiariaGastos = diasNoMes > 0 ? saidasMes / diasNoMes : 0;

  return (
    <div className="dashboard-neural" style={{ paddingBottom: '40px' }}>
      <style>{`
        .dash-header {
          position: relative;
          padding: 32px 40px;
          margin: -32px -40px 32px -40px;
          background: linear-gradient(180deg, rgba(124,106,255,0.05) 0%, transparent 100%);
          border-bottom: 1px solid rgba(124,106,255,0.1);
          overflow: hidden;
        }
        .neural-bg {
          position: absolute; top: -20px; right: -50px;
          opacity: 0.15; z-index: 0; pointer-events: none;
        }
        .neural-path {
          stroke-dasharray: 1000;
          animation: neuralPulseBg 8s infinite linear;
        }
        @keyframes neuralPulseBg {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        .dash-title {
          font-family: var(--font-heading);
          font-size: 2.2rem; font-weight: 800;
          margin-bottom: 8px; position: relative; z-index: 10;
        }
        .dash-subtitle { color: var(--text-secondary); font-size: 1rem; position: relative; z-index: 10; }

        .stat-card {
          background: linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%);
          border: 1px solid var(--border); border-radius: 16px;
          padding: 24px; position: relative; overflow: hidden;
          display: flex; flex-direction: column; gap: 12px;
          transition: all 0.2s ease;
        }
        .stat-card:hover { transform: translateY(-2px); }
        .stat-card::after {
          content: ''; position: absolute; top: -20px; right: -20px;
          width: 80px; height: 80px; border-radius: 50%;
          filter: blur(40px); opacity: 0.2; z-index: 0;
        }
        .stat-card.green::after { background: var(--green); }
        .stat-card.pink::after { background: var(--accent2); }
        .stat-card.lime::after { background: #a2ff00; }
        .stat-card.blue::after { background: var(--accent3); }
        .stat-card.green { border-top: 2px solid var(--green); }
        .stat-card.pink { border-top: 2px solid var(--accent2); }
        .stat-card.lime { border-top: 2px solid #a2ff00; }
        .stat-card.blue { border-top: 2px solid var(--accent3); }

        .stat-value {
          font-family: var(--font-heading); font-size: 1.8rem;
          font-weight: 700; z-index: 1;
        }

        .dash-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; }
        .dash-grid-2 { display: grid; grid-template-columns: 60% calc(40% - 20px); gap: 20px; margin-bottom: 24px; }
        .dash-grid-50 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 24px; }

        @media (max-width: 1200px) {
          .dash-grid-4 { grid-template-columns: repeat(2, 1fr); }
          .dash-grid-2, .dash-grid-50 { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .dash-header { padding: 20px 16px; margin: -16px -12px 24px -12px; padding-top: 68px; }
          .dash-title { font-size: 1.5rem; }
          .dash-subtitle { font-size: 0.88rem; }
          .neural-bg { display: none; }
          .dash-grid-4 { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .stat-card { padding: 16px; border-radius: 12px; }
          .stat-value { font-size: 1.3rem; }
          .panel { padding: 16px; border-radius: 12px; }
          .panel-title { font-size: 0.95rem; }
          .heatmap-grid { grid-template-columns: repeat(10, 1fr); gap: 3px; }
          .quick-btn { padding: 12px 16px; font-size: 0.82rem; flex: 1 1 calc(50% - 8px); }
        }
        @media (max-width: 480px) {
          .dash-grid-4 { grid-template-columns: 1fr; gap: 12px; }
          .dash-header { flex-direction: column; align-items: flex-start; gap: 16px; }
          .quick-btn { flex: 1 1 100%; }
        }

        .panel {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; padding: 24px;
        }
        .panel-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 20px;
        }
        .panel-title {
          font-family: var(--font-heading); font-size: 1.1rem;
          font-weight: 700; display: flex; align-items: center; gap: 10px;
        }

        .heatmap-grid { display: grid; grid-template-columns: repeat(15, 1fr); gap: 4px; margin-top: 16px; }
        .heat-cell { aspect-ratio: 1; border-radius: 4px; transition: all 0.2s; cursor: pointer; }
        .heat-cell:hover { transform: scale(1.2); z-index: 10; }
        .heat-0 { background: var(--surface2); }
        .heat-1 { background: rgba(124,106,255,0.3); }
        .heat-2 { background: rgba(124,106,255,0.6); }
        .heat-3 { background: rgba(124,106,255,1); box-shadow: 0 0 10px rgba(124,106,255,0.5); }

        .quick-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 20px; background: var(--surface2);
          border: 1px solid var(--border); border-radius: 12px;
          color: var(--text); font-weight: 600; font-size: 0.9rem;
          cursor: pointer; transition: all 0.2s; text-decoration: none;
        }
        .quick-btn:hover {
          border-color: var(--accent); background: rgba(124,106,255,0.05);
          box-shadow: 0 4px 15px rgba(124,106,255,0.15);
        }

        .task-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px; border-radius: 8px; background: transparent;
          transition: background 0.2s; border-bottom: 1px solid var(--border);
        }
        .task-item:hover { background: var(--surface2); }
        .task-item.done { opacity: 0.5; text-decoration: line-through; }

        .task-check {
          width: 22px; height: 22px; border-radius: 6px;
          border: 2px solid var(--border); display: flex;
          align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s; background: transparent;
          color: transparent; flex-shrink: 0;
        }
        .task-check:hover { border-color: var(--accent); background: rgba(124,106,255,0.1); color: var(--accent); }

        .periodo-toggle {
          display: flex; gap: 4px; background: var(--surface2);
          border-radius: 8px; padding: 2px;
        }
        .periodo-btn {
          padding: 4px 12px; border-radius: 6px; font-size: 0.75rem;
          font-weight: 600; cursor: pointer; transition: all 0.2s;
          background: transparent; border: none; color: var(--text-secondary);
        }
        .periodo-btn.active {
          background: var(--accent); color: #fff;
        }

        .empty-msg {
          text-align: center; padding: 32px 16px;
          color: var(--text-secondary); font-style: italic;
        }
      `}</style>

      {/* HEADER */}
      <div className="dash-header flex justify-between items-center">
        <div>
          <h1 className="dash-title">
            {hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌙'} {greeting}, {user?.displayName?.split(' ')[0] || 'Mestre'}!
          </h1>
          <p className="dash-subtitle">Aqui está o pulso do seu Segundo Cérebro.</p>
        </div>
        <Link to="/assistente" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)', border: 'none', height: 44, borderRadius: 12, padding: '0 24px', zIndex: 10 }}>
          <Zap size={18} /> Falar com IA
        </Link>
        <svg className="neural-bg" width="600" height="200" viewBox="0 0 600 200" fill="none">
          <path className="neural-path" d="M0,100 Q50,150 100,100 T200,100 T300,50 T400,100 T500,150 T600,100" stroke="var(--accent)" strokeWidth="2" fill="none" />
          <path className="neural-path" d="M100,200 Q150,150 200,180 T300,120 T400,160 T500,80 T600,120" stroke="var(--accent3)" strokeWidth="2" fill="none" style={{ animationDelay: '1s' }} />
        </svg>
      </div>

      {/* ROW 1: Quick Stats */}
      <div className="dash-grid-4">
        <div className="stat-card green">
          <div className="flex justify-between items-center text-muted text-sm" style={{ fontWeight: 600 }}>PATRIMÔNIO ATUAL
            <Wallet size={18} style={{ color: 'var(--green)', filter: 'drop-shadow(0 0 8px var(--green))' }} />
          </div>
          <div className="stat-value">{formatCurrency(patrimonioTotal)}</div>
          <div className="font-mono flex items-center gap-xs" style={{ fontSize: '0.8rem', color: variacaoMes >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {variacaoMes >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(variacaoMes))} <span className="text-muted" style={{ fontSize: '0.7rem' }}>neste mês</span>
          </div>
        </div>

        <div className="stat-card pink">
          <div className="flex justify-between items-center text-muted text-sm" style={{ fontWeight: 600 }}>METAS DO MÊS
            <Target size={18} style={{ color: 'var(--accent2)', filter: 'drop-shadow(0 0 8px var(--accent2))' }} />
          </div>
          <div className="stat-value">{metasConcluidas} <span className="text-muted" style={{ fontSize: '1.2rem' }}>/ {metasTotais || 0}</span></div>
          <div className="progress-bar mt-xs" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="progress-bar-fill" style={{ width: metasTotais ? `${(metasConcluidas / metasTotais) * 100}%` : '0%', background: 'var(--accent2)' }}></div>
          </div>
        </div>

        <div className="stat-card lime">
          <div className="flex justify-between items-center text-muted text-sm" style={{ fontWeight: 600 }}>SAÚDE & TREINOS
            <Activity size={18} style={{ color: '#a2ff00', filter: 'drop-shadow(0 0 8px #a2ff00)' }} />
          </div>
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>🔥 {streakTreinos} dia{streakTreinos !== 1 ? 's' : ''} seguido{streakTreinos !== 1 ? 's' : ''}</div>
          <div className="text-muted font-mono mt-xs" style={{ fontSize: '0.8rem' }}>
            Último: {diasDesdeUltimo !== null ? (diasDesdeUltimo === 0 ? 'Hoje' : `Há ${diasDesdeUltimo} dia${diasDesdeUltimo > 1 ? 's' : ''}`) : 'Nenhum recente'}
          </div>
        </div>

        <div className="stat-card blue">
          <div className="flex justify-between items-center text-muted text-sm" style={{ fontWeight: 600 }}>FOCO DE HOJE
            <BrainCircuit size={18} style={{ color: 'var(--accent3)', filter: 'drop-shadow(0 0 8px var(--accent3))' }} />
          </div>
          <div className="stat-value" style={{ color: 'var(--accent3)' }}>{tarefasHoje.length + tarefasAtrasadas.length} pendentes</div>
          <div className="font-mono mt-xs flex items-center gap-xs" style={{ fontSize: '0.8rem', color: tarefasAtrasadas.length > 0 ? 'var(--red)' : 'var(--green)' }}>
            {tarefasAtrasadas.length > 0 ? <><AlertTriangle size={14} /> {tarefasAtrasadas.length} atrasada{tarefasAtrasadas.length > 1 ? 's' : ''}!</> : 'Tudo em dia! ✨'}
          </div>
        </div>
      </div>

      {/* ROW 2: Chart + Agenda */}
      <div className="dash-grid-2">
        <div className="panel flex-col">
          <div className="panel-header">
            <h2 className="panel-title"><TrendingUp size={20} className="text-green" /> Fluxo de Caixa</h2>
            <div className="periodo-toggle">
              {['semana', 'mes', 'ano'].map(p => (
                <button key={p} className={`periodo-btn ${periodo === p ? 'active' : ''}`} onClick={() => setPeriodo(p)}>
                  {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mês' : 'Ano'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 250 }}>
            {hasChartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e676" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00e676" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff4757" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ff4757" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252538" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v}`} />
                  <Tooltip contentStyle={{ background: '#1e1e30', border: '1px solid #7c6aff', borderRadius: 8, color: '#fff' }} formatter={(value) => [formatCurrency(value), '']} />
                  <Legend />
                  <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#00e676" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEntradas)" />
                  <Area type="monotone" dataKey="saidas" name="Saídas" stroke="#ff4757" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSaidas)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-msg">📊 Adicione entradas e saídas para ver seu fluxo de caixa</div>
            )}
          </div>
        </div>

        <div className="panel flex-col">
          <div className="panel-header">
            <h2 className="panel-title"><CalendarIcon size={20} className="text-accent" /> Agenda de Hoje</h2>
            <Link to="/agenda" className="text-muted" style={{ fontSize: '0.85rem', textDecoration: 'none' }}>Ver mês →</Link>
          </div>
          <div className="flex-col gap-sm" style={{ flex: 1, overflowY: 'auto' }}>
            {eventosHoje.length === 0 ? (
              <div className="empty-msg"><span style={{ fontSize: '2rem' }}>🎉</span><p className="mt-sm">Dia livre — aproveite!</p></div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 16, borderLeft: '2px solid var(--border)', marginLeft: 8 }}>
                {eventosHoje.map(evt => (
                  <div key={evt.id} style={{ position: 'relative', marginBottom: 20 }}>
                    <div style={{ position: 'absolute', left: -22, top: 4, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--surface)' }}></div>
                    <div className="text-mono text-muted mb-xs" style={{ fontSize: '0.75rem' }}>{evt.horaInicio}</div>
                    <div className="p-sm" style={{ background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 600 }}>{evt.titulo}</div>
                      <div className="text-muted mt-xs" style={{ fontSize: '0.75rem' }}>{evt.tipo}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 2.5: Finance Analysis */}
      {(gastosPorCategoria.length > 0 || top5Gastos.length > 0) && (
        <div className="mb-lg">
          <h3 className="text-muted uppercase mb-md font-mono" style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>📊 Análise Financeira do Mês</h3>
          <div className="dash-grid-2">
            {/* Pie Chart - Gastos por Categoria */}
            <div className="panel">
              <div className="panel-header"><h2 className="panel-title">Gastos por Categoria</h2></div>
              {gastosPorCategoria.length > 0 ? (
                <div className="flex items-center" style={{ gap: 24, flexWrap: 'wrap' }}>
                  <div style={{ width: 200, height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={gastosPorCategoria} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                          {gastosPorCategoria.map((entry, i) => <Cell key={i} fill={CAT_COLORS[entry.name] || '#636e72'} />)}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: '#1e1e30', border: '1px solid #7c6aff', borderRadius: 8, color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-col gap-xs" style={{ flex: 1 }}>
                    {gastosPorCategoria.slice(0, 6).map((c, i) => (
                      <div key={i} className="flex items-center gap-sm" style={{ fontSize: '0.82rem' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: CAT_COLORS[c.name] || '#636e72', flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{c.name}</span>
                        <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{totalGastosMes > 0 ? Math.round(c.value / totalGastosMes * 100) : 0}%</span>
                        <span className="font-mono">{formatCurrency(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div className="empty-msg">📊 Sem gastos este mês</div>}
            </div>

            {/* Bar Chart - Top 5 Maiores Gastos */}
            <div className="panel">
              <div className="panel-header"><h2 className="panel-title">Top 5 Maiores Gastos</h2></div>
              {top5Gastos.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={top5Gastos} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#252538" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#7a7a9a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#bbb', fontSize: 11 }} width={100} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: '#1e1e30', border: '1px solid #7c6aff', borderRadius: 8, color: '#fff' }} />
                    <Bar dataKey="value" fill="url(#barGrad)" radius={[0, 6, 6, 0]} barSize={18}>
                      <defs><linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="var(--accent)" /><stop offset="100%" stopColor="var(--accent2)" /></linearGradient></defs>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="empty-msg">📊 Sem dados</div>}
            </div>
          </div>

          {/* Comparativo 6 meses + Resumo */}
          <div className="dash-grid-2 mt-md">
            <div className="panel">
              <div className="panel-header"><h2 className="panel-title">Comparativo Últimos 6 Meses</h2></div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={comparativo6m} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252538" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#7a7a9a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#7a7a9a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: '#1e1e30', border: '1px solid #7c6aff', borderRadius: 8, color: '#fff' }} />
                  <Legend />
                  <Bar dataKey="entradas" name="Entradas" fill="#00e676" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="saidas" name="Saídas" fill="#ff4757" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Card Resumo Financeiro */}
            <div className="panel flex-col gap-md">
              <h2 className="panel-title">Resumo do Mês</h2>
              <div className="flex-col gap-md" style={{ fontSize: '0.88rem' }}>
                <div className="flex items-center gap-sm">
                  <span style={{ fontSize: '1.3rem' }}>💰</span>
                  <span className="text-muted">Maior gasto:</span>
                  <span className="font-mono" style={{ flex: 1, textAlign: 'right' }}>{maiorGastoMes ? `${(maiorGastoMes.desc || '').slice(0, 20)} — ${formatCurrency(Number(maiorGastoMes.valor))}` : 'Nenhum'}</span>
                </div>
                <div className="flex items-center gap-sm">
                  <span style={{ fontSize: '1.3rem' }}>📦</span>
                  <span className="text-muted">Categoria top:</span>
                  <span className="font-mono" style={{ flex: 1, textAlign: 'right' }}>{catTop ? `${catTop.name} — ${formatCurrency(catTop.value)}` : 'Nenhuma'}</span>
                </div>
                <div className="flex items-center gap-sm">
                  <span style={{ fontSize: '1.3rem' }}>📈</span>
                  <span className="text-muted">Melhor mês (6m):</span>
                  <span className="font-mono" style={{ flex: 1, textAlign: 'right', color: 'var(--green)' }}>{melhorMes ? `${melhorMes.label} — saldo ${formatCurrency(melhorMes.entradas - melhorMes.saidas)}` : '-'}</span>
                </div>
                <div className="flex items-center gap-sm">
                  <span style={{ fontSize: '1.3rem' }}>⚡</span>
                  <span className="text-muted">Média diária gastos:</span>
                  <span className="font-mono" style={{ flex: 1, textAlign: 'right', color: 'var(--red)' }}>{formatCurrency(mediaDiariaGastos)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROW 3: Tasks + Projects */}
      <div className="dash-grid-50">
        <div className="panel flex-col">
          <div className="panel-header">
            <h2 className="panel-title">
              <ListTodo size={20} className="text-accent3" /> Foco de Hoje
              {focoHoje.length > 0 && <span className="badge badge-accent ml-sm">{focoHoje.length}</span>}
            </h2>
          </div>
          <div className="flex-col">
            {focoHoje.length === 0 ? (
              <div className="empty-msg">✅ Nenhuma tarefa urgente para hoje!</div>
            ) : (
              focoHoje.map(t => (
                <div key={t.id} className="task-item">
                  <button className="task-check" onClick={() => concluirTarefa(t.id)} title="Marcar como concluída">
                    <Check size={14} />
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: t.vencimento && t.vencimento < hojeStr ? 'var(--red)' : 'var(--text)' }}>
                      {t.titulo}
                    </div>
                    <div className="flex gap-xs mt-xs" style={{ fontSize: '0.75rem' }}>
                      {t.prioridade === 'Alta' && <span className="badge badge-red" style={{ transform: 'scale(0.85)', transformOrigin: 'left' }}>Urgente</span>}
                      {t.vencimento && t.vencimento < hojeStr && <span className="text-red font-mono">Atrasada</span>}
                      {t.projeto && <span className="text-muted font-mono">{t.projeto}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
            <Link to="/tarefas" className="btn btn-ghost mt-md w-100 flex items-center justify-center gap-xs">
              <Plus size={16} /> Nova tarefa rápida
            </Link>
          </div>
        </div>

        <div className="panel flex-col">
          <div className="panel-header">
            <h2 className="panel-title"><FolderKanban size={20} className="text-yellow" /> Projetos em Andamento</h2>
            <Link to="/projetos" className="text-muted" style={{ fontSize: '0.85rem', textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          <div className="flex-col gap-md">
            {projetosAtivos.length === 0 ? (
              <div className="empty-msg">📁 Nenhum projeto em andamento</div>
            ) : (
              projetosAtivos.map(p => (
                <div key={p.id} className="p-sm" style={{ background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div className="flex justify-between items-center mb-xs">
                    <div className="flex items-center gap-xs" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.cor || 'var(--accent)' }}></div>
                      {p.nome}
                    </div>
                    <span className="text-muted font-mono" style={{ fontSize: '0.75rem' }}>{p.tarefasConcluidas}/{p.tarefasTotal} tarefas</span>
                  </div>
                  <div className="flex justify-between text-muted mb-xs" style={{ fontSize: '0.75rem' }}>
                    <span>Progresso</span>
                    <span>{p.progressoReal}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 6 }}>
                    <div className="progress-bar-fill" style={{ width: `${p.progressoReal}%`, background: p.cor || 'var(--accent)' }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ROW 4: Neural Activity Heatmap */}
      <div className="panel mb-lg">
        <div className="panel-header" style={{ marginBottom: 8 }}>
          <h2 className="panel-title"><BrainCircuit size={20} className="text-accent" /> Atividade Neural</h2>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>Últimos 30 dias</span>
        </div>

        <div className="heatmap-grid pb-md" style={{ borderBottom: '1px solid var(--border)' }}>
          {heatmapData.map(day => (
            <div key={day.id} className={`heat-cell heat-${day.intensity}`} title={`${day.label} — ${day.total} atividade${day.total !== 1 ? 's' : ''}`}></div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-md" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div className="flex items-center gap-sm" style={{ fontSize: '0.85rem' }}><span style={{ fontSize: '1.2rem' }}>🔥</span> <span className="text-muted">Maior sequência:</span> <strong className="font-mono">{maiorStreak} dias</strong></div>
          <div className="flex items-center gap-sm" style={{ fontSize: '0.85rem' }}><span style={{ fontSize: '1.2rem' }}>📝</span> <span className="text-muted">Anotações mês:</span> <strong className="font-mono">{anotacoesMes}</strong></div>
          <div className="flex items-center gap-sm" style={{ fontSize: '0.85rem' }}><span style={{ fontSize: '1.2rem' }}>💰</span> <span className="text-muted">Transações mês:</span> <strong className="font-mono">{transacoesMes}</strong></div>
          <div className="flex items-center gap-sm" style={{ fontSize: '0.85rem' }}><span style={{ fontSize: '1.2rem' }}>💪</span> <span className="text-muted">Treinos mês:</span> <strong className="font-mono">{treinosMes}</strong></div>
        </div>
      </div>

      {/* ROW 5: Quick Actions */}
      <div>
        <h3 className="text-muted uppercase mb-md font-mono" style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>Acesso Rápido Neural</h3>
        <div className="flex" style={{ flexWrap: 'wrap', gap: 16 }}>
          <Link to="/entradas" className="quick-btn"><Wallet className="text-green" size={18} /> Registrar Entrada</Link>
          <Link to="/saidas" className="quick-btn"><Upload className="text-red" size={18} style={{ transform: 'rotate(180deg)' }} /> Registrar Gasto</Link>
          <Link to="/importar-ofx" className="quick-btn"><Upload className="text-accent3" size={18} /> Importar OFX</Link>
          <Link to="/tarefas" className="quick-btn"><CheckSquare className="text-accent3" size={18} /> Nova Tarefa</Link>
          <Link to="/anotacoes" className="quick-btn"><ListTodo size={18} /> Nova Anotação</Link>
        </div>
      </div>
    </div>
  );
}
