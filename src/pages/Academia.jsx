import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Modal, EmptyState, ConfirmDialog, formatDate, getToday, Checkbox } from '../components/shared';
import { Plus, Edit2, Trash2, Activity, Play, Calendar, CheckCircle2 } from 'lucide-react';

export default function Academia() {
  const { state, addItem, updateItem, deleteItem } = useApp();
  const [tab, setTab] = useState('Planos'); // Planos, Treinos, Historico
  
  // States (Planos)
  const [isOpenPlano, setIsOpenPlano] = useState(false);
  const [editingPlanoId, setEditingPlanoId] = useState(null);
  const [planoForm, setPlanoForm] = useState({ nome: '', exercicios: [] });
  const [exercicioForm, setExercicioForm] = useState({ nome: '', series: '3', reps: '10-12', carga: '', obs: '' });

  // States (Registrar Treino)
  const [planoSelecionado, setPlanoSelecionado] = useState('');
  const [treinoIniciado, setTreinoIniciado] = useState(null);
  
  // Confirms
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // {id, type: 'plano'|'treino'}

  const planos = state.academia?.planos || [];
  const treinos = state.academia?.treinos || [];

  // ========== PLANOS ==========
  const openPlanoModal = (plano = null) => {
    if (plano) {
      setEditingPlanoId(plano.id);
      setPlanoForm(JSON.parse(JSON.stringify(plano)));
    } else {
      setEditingPlanoId(null);
      setPlanoForm({ nome: '', exercicios: [] });
    }
    setIsOpenPlano(true);
  };

  const addExercicioNaLista = () => {
    if (!exercicioForm.nome) return;
    setPlanoForm({
      ...planoForm,
      exercicios: [...planoForm.exercicios, { ...exercicioForm, id: Date.now() }]
    });
    setExercicioForm({ nome: '', series: '3', reps: '10-12', carga: '', obs: '' });
  };

  const removeExercicioDaLista = (id) => {
    setPlanoForm({
      ...planoForm,
      exercicios: planoForm.exercicios.filter(e => e.id !== id)
    });
  };

  const savePlano = (e) => {
    e.preventDefault();
    if (!planoForm.nome) return;

    if (editingPlanoId) {
      updateItem('planos', editingPlanoId, planoForm);
    } else {
      addItem('planos', planoForm);
    }
    setIsOpenPlano(false);
  };

  // ========== TREINOS ==========
  const iniciarTreino = () => {
    if (!planoSelecionado) return;
    const planoRef = planos.find(p => String(p.id) === String(planoSelecionado));
    if (!planoRef) return;

    // Gerar objeto de estado do treino em tempo real
    setTreinoIniciado({
      planoId: planoRef.id,
      planoNome: planoRef.nome,
      data: getToday(),
      fimDate: null,
      observacoes: '',
      exercicios: planoRef.exercicios.map(ex => ({
        ...ex,
        seriesFeitas: Array(parseInt(ex.series) || 3).fill(false),
        cargaUsada: ex.carga || ''
      }))
    });
  };

  const toggleSerie = (exIndex, sIndex) => {
    const newEx = [...treinoIniciado.exercicios];
    newEx[exIndex].seriesFeitas[sIndex] = !newEx[exIndex].seriesFeitas[sIndex];
    setTreinoIniciado({...treinoIniciado, exercicios: newEx});
  };

  const updateCargaUsada = (exIndex, val) => {
    const newEx = [...treinoIniciado.exercicios];
    newEx[exIndex].cargaUsada = val;
    setTreinoIniciado({...treinoIniciado, exercicios: newEx});
  };

  const finalizarTreino = () => {
    const treinoFinal = {
      ...treinoIniciado,
      fimDate: new Date().toISOString()
    };
    addItem('treinos', treinoFinal);
    setTreinoIniciado(null);
    setTab('Historico');
  };

  // ========== APAGAR ==========
  const confirmDelete = () => {
    if (itemToDelete) {
      deleteItem(itemToDelete.type === 'plano' ? 'planos' : 'treinos', itemToDelete.id);
    }
    setIsConfirmOpen(false);
    setItemToDelete(null);
  };

  // ========== RENDERIZAÇÕES ==========
  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>💪 Academia</h1>
          <p>Seus treinos, cargas e evolução física</p>
        </div>
        {tab === 'Planos' && (
          <button className="btn btn-primary" onClick={() => openPlanoModal()}>
            <Plus size={18} /> Criar Plano
          </button>
        )}
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'Planos' ? 'active' : ''}`} onClick={() => setTab('Planos')}>Planos de Treino</button>
        <button className={`tab ${tab === 'Treinos' ? 'active' : ''}`} onClick={() => setTab('Treinos')}>Registrar Treino</button>
        <button className={`tab ${tab === 'Historico' ? 'active' : ''}`} onClick={() => setTab('Historico')}>Histórico</button>
        <button className={`tab ${tab === 'Estatísticas' ? 'active' : ''}`} onClick={() => setTab('Estatísticas')}>Estatísticas</button>
      </div>

      {/* PLANOS */}
      {tab === 'Planos' && (
        <>
          {planos.length === 0 ? (
            <EmptyState 
              icon={<Activity size={48} className="text-muted" />} 
              title="Sem planos de treino" 
              description="Crie seu primeiro plano de treino para começar a registrar cargas e séries."
            />
          ) : (
            <div className="card-grid">
              {planos.map(p => (
                <div key={p.id} className="card">
                  <div className="card-header">
                    <h3>{p.nome}</h3>
                    <div className="flex gap-sm">
                      <button className="btn-icon" onClick={() => openPlanoModal(p)}><Edit2 size={16} /></button>
                      <button className="btn-icon" onClick={() => { setItemToDelete({id: p.id, type: 'plano'}); setIsConfirmOpen(true); }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="text-muted mb-md">{p.exercicios.length} exercícios cadastrados</div>
                  
                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {p.exercicios.map((ex, i) => (
                      <div key={ex.id || i} className="flex justify-between items-center mb-sm" style={{ padding: '8px', background: 'var(--surface2)', borderRadius: '4px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ex.nome}</span>
                        <span className="text-mono text-muted" style={{ fontSize: '0.75rem' }}>
                          {ex.series}x{ex.reps} | {ex.carga || '-'}kg
                        </span>
                      </div>
                    ))}
                  </div>

                  <button 
                    className="btn btn-primary w-100 mt-md" 
                    style={{ width: '100%' }}
                    onClick={() => { setPlanoSelecionado(p.id); setTab('Treinos'); }}
                  >
                    Iniciar Treino
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* REGISTRAR TREINO */}
      {tab === 'Treinos' && (
        <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
          {!treinoIniciado ? (
            <div className="text-center p-md py-lg" style={{ padding: '40px 0' }}>
              <Activity size={64} className="text-accent mb-md" style={{ margin: '0 auto' }} />
              <h2>Hora do Show</h2>
              <p className="text-muted mb-lg" style={{ maxWidth: 400, margin: '8px auto 24px' }}>
                Selecione um plano de treino para começar a gravar suas séries e evoluções de carga em tempo real.
              </p>
              
              <div className="flex gap-md" style={{ justifyContent: 'center' }}>
                <select 
                  className="form-group"
                  value={planoSelecionado}
                  onChange={e => setPlanoSelecionado(e.target.value)}
                  style={{ width: 250, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', border: '1px solid var(--border)' }}
                >
                  <option value="">Selecione um Plano...</option>
                  {planos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <button className="btn btn-primary" disabled={!planoSelecionado} onClick={iniciarTreino}>
                  <Play size={18} fill="currentColor" /> INICIAR
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-lg">
                <div>
                  <h2 className="text-accent flex items-center gap-sm">
                    <Activity size={24} /> Treino em Progresso
                  </h2>
                  <p className="text-muted">{treinoIniciado.planoNome} • {formatDate(treinoIniciado.data)}</p>
                </div>
                <button className="btn btn-ghost btn-sm text-red" onClick={() => setTreinoIniciado(null)}>
                  Abortar
                </button>
              </div>

              <div className="flex-col gap-lg overflow-y-auto" style={{ maxHeight: '60vh', paddingRight: '8px' }}>
                {treinoIniciado.exercicios.map((ex, i) => (
                  <div key={i} className="card p-0" style={{ overflow: 'hidden' }}>
                    <div style={{ background: 'var(--surface2)', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{ex.nome}</div>
                      <div className="text-muted font-mono" style={{ fontSize: '0.8rem' }}>Meta: {ex.series}séries de {ex.reps} recs • Carga base: {ex.carga || '-'}kg</div>
                    </div>
                    
                    <div className="p-md" style={{ padding: '16px' }}>
                      <div className="flex gap-md mb-md wrap">
                        {ex.seriesFeitas.map((feita, sIndex) => (
                          <div 
                            key={sIndex}
                            onClick={() => toggleSerie(i, sIndex)}
                            style={{ 
                              width: 48, height: 48, 
                              borderRadius: '8px', 
                              border: feita ? '2px solid var(--green)' : '2px dashed var(--border)',
                              background: feita ? 'var(--green-glow)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer',
                              fontWeight: 700,
                              color: feita ? 'var(--green)' : 'var(--text-secondary)',
                              transition: 'all 0.15s'
                            }}
                          >
                            {sIndex + 1}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-sm items-center">
                        <label className="text-muted text-mono" style={{ fontSize: '0.8rem' }}>Carga Usada (kg):</label>
                        <input 
                          type="text" 
                          value={ex.cargaUsada}
                          onChange={(e) => updateCargaUsada(i, e.target.value)}
                          style={{ width: '80px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px', color: 'var(--text)' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-group mt-lg">
                <label>Observações do Treino</label>
                <textarea 
                  value={treinoIniciado.observacoes}
                  onChange={e => setTreinoIniciado({...treinoIniciado, observacoes: e.target.value})}
                  placeholder="Ex: Senti dor no ombro, estava sem energia..."
                  style={{ minHeight: '60px' }}
                />
              </div>

              <button className="btn btn-primary w-100 mt-md" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }} onClick={finalizarTreino}>
                <CheckCircle2 size={20} /> FINALIZAR TREINO
              </button>
            </div>
          )}
        </div>
      )}

      {/* HISTÓRICO */}
      {tab === 'Historico' && (
        <>
          {treinos.length === 0 ? (
            <EmptyState 
              icon={<Calendar size={48} className="text-muted" />} 
              title="Ainda não há treinos" 
              description="Quando você finalizar um treino, ele aparecerá aqui."
            />
          ) : (
            <div className="flex-col gap-md">
              {treinos.sort((a,b) => new Date(b.data) - new Date(a.data)).map(t => {
                const totalSeries = t.exercicios.reduce((acc, curr) => acc + curr.seriesFeitas.length, 0);
                const seriesCompletas = t.exercicios.reduce((acc, curr) => acc + curr.seriesFeitas.filter(v=>v).length, 0);
                const perc = totalSeries > 0 ? Math.round((seriesCompletas / totalSeries) * 100) : 0;
                
                return (
                  <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="flex justify-between items-start mb-md">
                      <div>
                        <h3>{t.planoNome}</h3>
                        <div className="text-muted flex items-center gap-sm mt-sm text-mono">
                          <Calendar size={14} /> {formatDate(t.data)}
                        </div>
                      </div>
                      <button className="btn-icon" onClick={() => { setItemToDelete({id: t.id, type: 'treino'}); setIsConfirmOpen(true); }}>
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="progress-bar mb-sm">
                      <div className="progress-bar-fill green" style={{ width: `${perc}%` }}></div>
                    </div>
                    <div className="text-right text-muted text-mono mb-md" style={{ fontSize: '0.75rem' }}>
                      Conclusão: {perc}%
                    </div>

                    <div className="flex gap-sm wrap">
                      {t.exercicios.map((ex, i) => {
                        const completas = ex.seriesFeitas.filter(v=>v).length;
                        return (
                          <span key={i} className="badge badge-muted" style={{ padding: '6px 10px' }}>
                            {ex.nome}: <span className={completas === ex.seriesFeitas.length ? 'text-green' : 'text-yellow'}> {completas}/{ex.seriesFeitas.length}</span> s • {ex.cargaUsada || 0}kg
                          </span>
                        );
                      })}
                    </div>

                    {t.observacoes && (
                      <div className="mt-md pt-sm" style={{ borderTop: '1px solid var(--border)', fontSize: '0.85rem' }}>
                        <strong className="text-muted">Obs:</strong> {t.observacoes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ESTATÍSTICAS */}
      {tab === 'Estatísticas' && (
        <div className="card-grid">
          <div className="summary-card">
            <div className="summary-label">TOTAL DE TREINOS</div>
            <div className="summary-value text-accent">{treinos.length}</div>
          </div>

          <div className="summary-card">
            <div className="summary-label">SÉRIES COMPLETADAS</div>
            <div className="summary-value text-green">
              {treinos.reduce((acc, t) => acc + t.exercicios.reduce((acc2, curr) => acc2 + curr.seriesFeitas.filter(v=>v).length, 0), 0)}
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-label">ÚLTIMO TREINO</div>
            <div className="summary-value text-mono" style={{ fontSize: '1.2rem' }}>
              {treinos.length > 0 ? formatDate([...treinos].sort((a,b) => new Date(b.data) - new Date(a.data))[0].data) : 'Nenhum'}
            </div>
          </div>
        </div>
      )}

      {/* PLANO MODAL */}
      <Modal isOpen={isOpenPlano} onClose={() => setIsOpenPlano(false)} title={editingPlanoId ? 'Editar Plano' : 'Novo Plano'} large>
        <form onSubmit={savePlano}>
          <div className="form-group mb-lg">
            <label>Nome do Plano</label>
            <input 
              type="text" 
              required 
              value={planoForm.nome} 
              onChange={e => setPlanoForm({...planoForm, nome: e.target.value})} 
              placeholder="Ex: Treino A - Peito e Tríceps"
            />
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '24px', background: 'var(--surface2)' }}>
            <h4 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Adicionar Exercício</h4>
            <div className="form-row">
              <div className="form-group" style={{ flex: '2 1 150px' }}>
                <input 
                  type="text" placeholder="Nome (Ex: Supino Reto)" 
                  value={exercicioForm.nome} onChange={e => setExercicioForm({...exercicioForm, nome: e.target.value})}
                />
              </div>
              <div className="form-group" style={{ flex: '1 1 80px' }}>
                <input 
                  type="number" placeholder="Séries" 
                  value={exercicioForm.series} onChange={e => setExercicioForm({...exercicioForm, series: e.target.value})}
                />
              </div>
              <div className="form-group" style={{ flex: '1 1 80px' }}>
                <input 
                  type="text" placeholder="Reps (Ex: 10-12)" 
                  value={exercicioForm.reps} onChange={e => setExercicioForm({...exercicioForm, reps: e.target.value})}
                />
              </div>
              <div className="form-group" style={{ flex: '1 1 80px' }}>
                <input 
                  type="number" placeholder="Carga Base (kg)" 
                  value={exercicioForm.carga} onChange={e => setExercicioForm({...exercicioForm, carga: e.target.value})}
                />
              </div>
              <div className="form-group flex items-end">
                <button type="button" className="btn btn-ghost w-100" style={{ height: '42px', width: '100%' }} onClick={addExercicioNaLista}>
                  <Plus size={16} /> Adicionar
                </button>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Exercício</th>
                  <th>Séries</th>
                  <th>Repetições</th>
                  <th>Carga</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {planoForm.exercicios.map((ex, i) => (
                  <tr key={ex.id || i}>
                    <td style={{ fontWeight: 600 }}>{ex.nome}</td>
                    <td className="text-mono">{ex.series}</td>
                    <td className="text-mono">{ex.reps}</td>
                    <td className="text-mono">{ex.carga ? ex.carga+'kg' : '-'}</td>
                    <td>
                      <button type="button" className="btn-icon" onClick={() => removeExercicioDaLista(ex.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {planoForm.exercicios.length === 0 && (
                  <tr><td colSpan="5" className="text-center text-muted" style={{ padding: '24px 0' }}>Nenhum exercício adicionado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="form-actions mt-lg" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsOpenPlano(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={planoForm.exercicios.length === 0}>Salvar Plano</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="Excluir Registro"
        message="Tem certeza que apagar este registro? Esta ação é irreversível."
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
