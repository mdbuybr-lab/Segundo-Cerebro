import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Wallet, Target, Activity, Zap, BrainCircuit, 
  ArrowRight, CheckSquare, ListTodo,
  TrendingUp, Calendar as CalendarIcon, FolderKanban, Plus, AlertTriangle, Upload
} from 'lucide-react';
import { formatCurrency, formatDate, getToday, isOverdue } from '../components/shared';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { state } = useApp();
  const { user } = useAuth();
  
  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  
  // Finanças
  const contas = state.contasBancarias || [];
  const entradas = state.entradas || [];
  const saidas = state.saidas || [];
  
  const totalBanco = contas.reduce((acc, c) => acc + (parseFloat(c.saldoInicial || 0) + parseFloat(c.historicoEntradas || 0) - parseFloat(c.historicoSaidas || 0)), 0);
  
  // Recharts Mock/Real Data for Cashflow (Last 7 days)
  const chartData = useMemo(() => {
    return [
      { name: 'Seg', entradas: 4000, saidas: 2400 },
      { name: 'Ter', entradas: 3000, saidas: 1398 },
      { name: 'Qua', entradas: 2000, saidas: 9800 },
      { name: 'Qui', entradas: 2780, saidas: 3908 },
      { name: 'Sex', entradas: 1890, saidas: 4800 },
      { name: 'Sáb', entradas: 2390, saidas: 3800 },
      { name: 'Dom', entradas: 3490, saidas: 4300 },
    ];
  }, []);

  // Tarefas
  const tarefas = state.tarefas || [];
  const tarefasHoje = tarefas.filter(t => t.status !== 'Concluída' && t.vencimento === getToday());
  const tarefasAtrasadas = tarefas.filter(t => t.status !== 'Concluída' && isOverdue(t.vencimento));
  const focoHoje = [...tarefasAtrasadas, ...tarefasHoje].slice(0, 6);
  
  // Projetos
  const projetos = state.projetos || [];
  const projetosAtivos = projetos.filter(p => p.status === 'Em Andamento').slice(0, 4);

  // Agenda
  const agenda = state.agenda || [];
  const eventosHoje = agenda.filter(e => e.data === getToday()).sort((a,b) => a.horaInicio.localeCompare(b.horaInicio));

  // Metas & Planos
  const metas = state.metas || [];
  const metasConcluidas = metas.filter(m => m.status === 'Concluída').length;
  const metasTotais = metas.length;

  const treinos = state.academia?.treinos || [];
  const ultimoTreino = treinos.sort((a,b) => new Date(b.data) - new Date(a.data))[0];

  // Neural Activity Mock (30 days)
  const activityDays = Array.from({length: 30}, (_, i) => ({
    id: i,
    intensity: Math.floor(Math.random() * 4) // 0 to 3
  }));

  return (
    <div className="dashboard-neural" style={{ paddingBottom: '40px' }}>
      <style>{`
        /* Local Override Styles for Neural Dashboard */
        .dash-header {
          position: relative;
          padding: 32px 40px;
          margin: -32px -40px 32px -40px;
          background: linear-gradient(180deg, rgba(124,106,255,0.05) 0%, transparent 100%);
          border-bottom: 1px solid rgba(124,106,255,0.1);
          overflow: hidden;
        }

        .neural-bg {
          position: absolute;
          top: -20px;
          right: -50px;
          opacity: 0.15;
          z-index: 0;
          pointer-events: none;
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
          font-size: 2.2rem;
          font-weight: 800;
          margin-bottom: 8px;
          position: relative;
          z-index: 10;
        }

        .dash-subtitle {
          color: var(--text-secondary);
          font-size: 1rem;
          position: relative;
          z-index: 10;
        }

        /* Stats Cards - Row 1 */
        .stat-card {
          background: linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.2s ease;
        }

        .stat-card:hover { transform: translateY(-2px); }

        .stat-card::after {
          content: '';
          position: absolute;
          top: -20px; right: -20px;
          width: 80px; height: 80px;
          border-radius: 50%;
          filter: blur(40px);
          opacity: 0.2;
          z-index: 0;
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
          font-family: var(--font-heading);
          font-size: 1.8rem;
          font-weight: 700;
          z-index: 1;
        }

        /* Grid Layouts */
        .dash-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; }
        .dash-grid-2 { display: grid; grid-template-columns: 60% calc(40% - 20px); gap: 20px; margin-bottom: 24px; }
        .dash-grid-50 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 24px; }

        @media (max-width: 1200px) {
          .dash-grid-4 { grid-template-columns: repeat(2, 1fr); }
          .dash-grid-2, .dash-grid-50 { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .dash-header {
            padding: 20px 16px;
            margin: -16px -12px 24px -12px;
            padding-top: 68px; /* space for hamburger */
          }

          .dash-title {
            font-size: 1.5rem;
          }

          .dash-subtitle {
            font-size: 0.88rem;
          }

          .neural-bg { display: none; }

          .dash-grid-4 {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .stat-card {
            padding: 16px;
            border-radius: 12px;
          }

          .stat-value {
            font-size: 1.3rem;
          }

          .panel {
            padding: 16px;
            border-radius: 12px;
          }

          .panel-title {
            font-size: 0.95rem;
          }

          .heatmap-grid {
            grid-template-columns: repeat(10, 1fr);
            gap: 3px;
          }

          .quick-btn {
            padding: 12px 16px;
            font-size: 0.82rem;
            flex: 1 1 calc(50% - 8px);
          }
        }

        @media (max-width: 480px) {
          .dash-grid-4 {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .dash-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .quick-btn {
            flex: 1 1 100%;
          }
        }

        .panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .panel-title {
          font-family: var(--font-heading);
          font-size: 1.1rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Heatmap */
        .heatmap-grid {
          display: grid;
          grid-template-columns: repeat(15, 1fr);
          gap: 4px;
          margin-top: 16px;
        }

        .heat-cell {
          aspect-ratio: 1;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .heat-cell:hover { transform: scale(1.2); z-index: 10; cursor: pointer; }
        .heat-0 { background: var(--surface2); }
        .heat-1 { background: rgba(124,106,255,0.3); }
        .heat-2 { background: rgba(124,106,255,0.6); }
        .heat-3 { background: rgba(124,106,255,1); box-shadow: 0 0 10px rgba(124,106,255,0.5); }

        /* Quick Act */
        .quick-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }
        .quick-btn:hover {
          border-color: var(--accent);
          background: rgba(124,106,255,0.05);
          box-shadow: 0 4px 15px rgba(124,106,255,0.15);
        }

        .task-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          background: transparent;
          transition: background 0.2s;
        }
        .task-item:hover { background: var(--surface2); }
      `}</style>

      {/* HEADER */}
      <div className="dash-header flex justify-between items-center">
        <div>
          <h1 className="dash-title">
            {hour < 18 ? (hour < 12 ? '☀️' : '🌤️') : '🌙'} {greeting}, {user?.displayName?.split(' ')[0] || 'Mestre'}!
          </h1>
          <p className="dash-subtitle">Aqui está o pulso do seu Segundo Cérebro.</p>
        </div>
        
        <Link to="/assistente" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)', border: 'none', height: 44, borderRadius: 12, padding: '0 24px', zIndex: 10 }}>
          <Zap size={18} /> Falar com IA
        </Link>

        {/* Neural SVG Decoration */}
        <svg className="neural-bg" width="600" height="200" viewBox="0 0 600 200" fill="none">
          <path className="neural-path" d="M0,100 Q50,150 100,100 T200,100 T300,50 T400,100 T500,150 T600,100" stroke="var(--accent)" strokeWidth="2" fill="none" />
          <path className="neural-path" d="M100,200 Q150,150 200,180 T300,120 T400,160 T500,80 T600,120" stroke="var(--accent3)" strokeWidth="2" fill="none" style={{ animationDelay: '1s' }} />
          <circle cx="100" cy="100" r="4" fill="var(--accent)" />
          <circle cx="200" cy="100" r="4" fill="var(--accent)" />
          <circle cx="300" cy="50" r="4" fill="var(--accent)" />
          <circle cx="400" cy="100" r="4" fill="var(--accent)" />
        </svg>
      </div>

      {/* ROW 1: Quick Stats */}
      <div className="dash-grid-4">
        <div className="stat-card green">
          <div className="flex justify-between items-center text-muted text-sm" style={{ fontWeight: 600 }}>
            PATRIMÔNIO ATUAL
            <Wallet size={18} className="text-green" style={{ filter: 'drop-shadow(0 0 8px var(--green))' }} />
          </div>
          <div className="stat-value">{formatCurrency(totalBanco)}</div>
          <div className="text-green font-mono flex items-center gap-xs" style={{ fontSize: '0.8rem' }}>
            ▲ +R$1.250,00 <span className="text-muted" style={{ fontSize: '0.7rem' }}>neste mês</span>
          </div>
        </div>

        <div className="stat-card pink">
          <div className="flex justify-between items-center text-muted text-sm" style={{ fontWeight: 600 }}>
            METAS DO MÊS
            <Target size={18} className="text-pink" style={{ filter: 'drop-shadow(0 0 8px var(--accent2))' }} />
          </div>
          <div className="stat-value">{metasConcluidas} <span className="text-muted" style={{ fontSize: '1.2rem' }}>/ {metasTotais || 1}</span></div>
          <div className="progress-bar mt-xs" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="progress-bar-fill pink" style={{ width: metasTotais ? `${(metasConcluidas/metasTotais)*100}%` : '0%' }}></div>
          </div>
        </div>

        <div className="stat-card lime">
          <div className="flex justify-between items-center text-muted text-sm" style={{ fontWeight: 600 }}>
            SAÚDE & TREINOS
            <Activity size={18} style={{ color: '#a2ff00', filter: 'drop-shadow(0 0 8px #a2ff00)' }} />
          </div>
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>🔥 3 dias seguidos</div>
          <div className="text-muted font-mono mt-xs" style={{ fontSize: '0.8rem' }}>
            Último: {ultimoTreino ? 'Há 1 dia' : 'Nenhum recente'}
          </div>
        </div>

        <div className="stat-card blue">
          <div className="flex justify-between items-center text-muted text-sm" style={{ fontWeight: 600 }}>
            FOCO DE HOJE
            <BrainCircuit size={18} className="text-accent3" style={{ filter: 'drop-shadow(0 0 8px var(--accent3))' }} />
          </div>
          <div className="stat-value text-accent3">{tarefasHoje.length + tarefasAtrasadas.length} pendentes</div>
          <div className="text-red font-mono mt-xs flex items-center gap-xs" style={{ fontSize: '0.8rem' }}>
            {tarefasAtrasadas.length > 0 ? <><AlertTriangle size={14}/> {tarefasAtrasadas.length} atrasadas!</> : 'Tudo em dia! ✨'}
          </div>
        </div>
      </div>

      {/* ROW 2: Recharts + Agenda */}
      <div className="dash-grid-2">
        <div className="panel flex-col">
          <div className="panel-header">
            <h2 className="panel-title"><TrendingUp size={20} className="text-green" /> Fluxo de Caixa</h2>
            <div className="flex gap-xs">
              <span className="badge badge-accent">Mês</span>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 250, position: 'relative' }}>
             <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--green)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--green)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--red)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--red)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#252538" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface3)', borderColor: 'var(--accent)', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="entradas" stroke="var(--green)" strokeWidth={3} fillOpacity={1} fill="url(#colorEntradas)" />
                <Area type="monotone" dataKey="saidas" stroke="var(--red)" strokeWidth={3} fillOpacity={1} fill="url(#colorSaidas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel flex-col">
          <div className="panel-header">
            <h2 className="panel-title"><CalendarIcon size={20} className="text-accent" /> Agenda de Hoje</h2>
            <Link to="/agenda" className="text-muted hover:text-accent" style={{ fontSize: '0.85rem', textDecoration: 'none' }}>Ver mês →</Link>
          </div>
          <div className="flex-col gap-sm" style={{ flex: 1, overflowY: 'auto' }}>
            {eventosHoje.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <span style={{ fontSize: '2rem' }}>🎉</span>
                <p className="mt-sm">Dia livre — aproveite!</p>
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: '16px', borderLeft: '2px solid var(--border)', marginLeft: '8px' }}>
                {eventosHoje.map(evt => (
                  <div key={evt.id} style={{ position: 'relative', marginBottom: '20px' }}>
                    <div style={{ position: 'absolute', left: '-22px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--surface)' }}></div>
                    <div className="text-mono text-muted mb-xs" style={{ fontSize: '0.75rem' }}>{evt.horaInicio}</div>
                    <div className="p-sm" style={{ background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
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

      {/* ROW 3: Tasks + Projects */}
      <div className="dash-grid-50">
        <div className="panel flex-col">
          <div className="panel-header">
            <h2 className="panel-title">
              <ListTodo size={20} className="text-accent3" /> Foco de Hoje
              <span className="badge badge-accent ml-sm">{focoHoje.length} pendentes</span>
            </h2>
          </div>
          <div className="flex-col">
            {focoHoje.length === 0 ? (
              <p className="text-muted italic text-center py-md">Nenhuma tarefa urgente hoje.</p>
            ) : (
              focoHoje.map(t => (
                <div key={t.id} className="task-item" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckSquare size={14} className="text-surface2" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: isOverdue(t.vencimento) ? 'var(--red)' : 'var(--text)' }}>
                      {t.titulo}
                    </div>
                    {t.prioridade === 'Alta' && <span className="badge badge-red mt-xs inline-block" style={{ transform: 'scale(0.8)', transformOrigin: 'left' }}>Urgente</span>}
                  </div>
                </div>
              ))
            )}
            <Link to="/tarefas" className="btn btn-ghost mt-md w-100 flex items-center justify-center gap-xs">
              <Plus size={16}/> Nova tarefa rápida
            </Link>
          </div>
        </div>

        <div className="panel flex-col">
          <div className="panel-header">
            <h2 className="panel-title"><FolderKanban size={20} className="text-yellow" /> Projetos em Andamento</h2>
            <Link to="/projetos" className="text-muted hover:text-accent" style={{ fontSize: '0.85rem', textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          <div className="flex-col gap-md">
            {projetosAtivos.length === 0 ? (
              <p className="text-muted italic text-center py-md">Nenhum projeto ativo no momento.</p>
            ) : (
              projetosAtivos.map(p => (
                <div key={p.id} className="p-sm" style={{ background: 'var(--surface2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div className="flex justify-between items-center mb-xs">
                    <div className="flex items-center gap-xs" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.cor || 'var(--accent)' }}></div>
                      {p.nome}
                    </div>
                    <span className="badge badge-accent" style={{ background: p.cor ? `${p.cor}22` : '', color: p.cor || 'var(--accent)' }}>Em Andamento</span>
                  </div>
                  <div className="flex justify-between text-muted mb-xs" style={{ fontSize: '0.75rem' }}>
                    <span>Progresso</span>
                    <span>{p.progresso || 0}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 6 }}>
                    <div className="progress-bar-fill" style={{ width: `${p.progresso || 0}%`, background: p.cor || 'var(--accent)' }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ROW 4: Neural Activity */}
      <div className="panel mb-lg">
        <div className="panel-header" style={{ marginBottom: 8 }}>
          <h2 className="panel-title"><BrainCircuit size={20} className="text-accent" /> Atividade Neural</h2>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>Sua produtividade nos últimos 30 dias</span>
        </div>
        
        <div className="heatmap-grid pb-md" style={{ borderBottom: '1px solid var(--border)' }}>
          {activityDays.map(day => (
            <div key={day.id} className={`heat-cell heat-${day.intensity}`} title={`Dia ${30 - day.id} - Nível ${day.intensity}`}></div>
          ))}
          {/* duplicating for dense visual (60 cells matching github's dense look) */}
          {activityDays.map(day => (
            <div key={`dup-${day.id}`} className={`heat-cell heat-${Math.floor(Math.random()*4)}`} title="Atividade simulada"></div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-md" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div className="flex items-center gap-sm" style={{ fontSize: '0.85rem' }}><span style={{ fontSize: '1.2rem' }}>🔥</span> <span className="text-muted">Maior sequência:</span> <strong className="font-mono">12 dias</strong></div>
          <div className="flex items-center gap-sm" style={{ fontSize: '0.85rem' }}><span style={{ fontSize: '1.2rem' }}>📝</span> <span className="text-muted">Anotações mês:</span> <strong className="font-mono">{state.anotacoes ? state.anotacoes.length : 0}</strong></div>
          <div className="flex items-center gap-sm" style={{ fontSize: '0.85rem' }}><span style={{ fontSize: '1.2rem' }}>💰</span> <span className="text-muted">Transações var:</span> <strong className="font-mono">{entradas.length + saidas.length}</strong></div>
          <div className="flex items-center gap-sm" style={{ fontSize: '0.85rem' }}><span style={{ fontSize: '1.2rem' }}>💪</span> <span className="text-muted">Treinos mês:</span> <strong className="font-mono">{treinos.length}</strong></div>
        </div>
      </div>

      {/* ROW 5: Quick Act */}
      <div>
        <h3 className="text-muted uppercase mb-md font-mono" style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>Acesso Rápido Neural</h3>
        <div className="flex" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <Link to="/entradas" className="quick-btn"><Wallet className="text-green" size={18}/> Registrar Entrada</Link>
          <Link to="/saidas" className="quick-btn"><Upload className="text-red" size={18} style={{ transform: 'rotate(180deg)' }}/> Registrar Gasto</Link>
          <Link to="/importar-ofx" className="quick-btn"><Upload className="text-accent3" size={18}/> Importar OFX</Link>
          <Link to="/tarefas" className="quick-btn"><CheckSquare className="text-accent3" size={18}/> Nova Tarefa</Link>
          <Link to="/anotacoes" className="quick-btn"><ListTodo className="text-text" size={18}/> Nova Anotação</Link>
        </div>
      </div>

    </div>
  );
}
