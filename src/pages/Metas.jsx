import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Modal, EmptyState, ConfirmDialog, formatDate, getToday } from '../components/shared';
import { Plus, Edit2, Trash2, Target } from 'lucide-react';

const AREAS = ['Financeiro', 'Saúde', 'Carreira', 'Relacionamento', 'Educação', 'Pessoal'];
const STATUS = ['Em andamento', 'Concluída', 'Pausada'];

export default function Metas() {
  const { state, addItem, updateItem, deleteItem } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [filtroArea, setFiltroArea] = useState('Todas');
  const [filtroStatus, setFiltroStatus] = useState('Em andamento');

  const [formData, setFormData] = useState({
    nome: '',
    area: 'Pessoal',
    descricao: '',
    valorAlvo: '',
    progressoAtingido: '',
    dataPrazo: getToday(),
    status: 'Em andamento'
  });

  const metas = state.metas || [];

  const handleOpenModal = (m = null) => {
    if (m) {
      setEditingId(m.id);
      setFormData({
        nome: m.nome,
        area: m.area,
        descricao: m.descricao || '',
        valorAlvo: m.valorAlvo || '',
        progressoAtingido: m.progressoAtingido || '',
        dataPrazo: m.dataPrazo,
        status: m.status
      });
    } else {
      setEditingId(null);
      setFormData({
        nome: '',
        area: 'Pessoal',
        descricao: '',
        valorAlvo: '',
        progressoAtingido: '',
        dataPrazo: getToday(),
        status: 'Em andamento'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nome) return;

    if (editingId) {
      updateItem('metas', editingId, formData);
    } else {
      addItem('metas', formData);
    }
    setIsModalOpen(false);
  };

  const handleUpdateProgressInline = (id, newProgress) => {
    updateItem('metas', id, { progressoAtingido: newProgress });
  };

  const handleDeleteRequest = (id) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteItem('metas', itemToDelete);
    }
    setIsConfirmOpen(false);
    setItemToDelete(null);
  };

  const filteredMetas = metas.filter(m => {
    if (filtroArea !== 'Todas' && m.area !== filtroArea) return false;
    if (filtroStatus !== 'Todos' && m.status !== filtroStatus) return false;
    return true;
  });

  // Calculate generic progress (supports numbers or text, if text, we just ask for a number anyway in the UI, or fallback to % manually)
  const getProgressPercentage = (alvo, atual) => {
    const a = parseFloat(alvo);
    const c = parseFloat(atual);
    if (!isNaN(a) && !isNaN(c) && a > 0) {
      return Math.min(100, Math.round((c / a) * 100));
    }
    return 0; // If text-based or non-numeric, progress is manual? Let's just assume numbers or manual 0-100 logic.
  };

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>🎯 Metas de Vida</h1>
          <p>O que você quer conquistar em cada área</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nova Meta
        </button>
      </div>

      <div className="filters-bar">
        <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)}>
          <option value="Todas">🌍 Todas as Áreas</option>
          {AREAS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="Todos">📦 Qualquer Status</option>
          {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {filteredMetas.length === 0 ? (
        <EmptyState 
          icon={<Target size={48} className="text-muted" />} 
          title="Nenhuma meta encontrada" 
          description="Defina objetivos claros e de longo prazo para guiar sua vida."
        />
      ) : (
        <div className="card-grid">
          {filteredMetas.map(meta => {
            const isTextGoal = isNaN(parseFloat(meta.valorAlvo));
            let percent = 0;
            
            if (meta.status === 'Concluída') {
              percent = 100;
            } else if (!isTextGoal) {
              percent = getProgressPercentage(meta.valorAlvo, meta.progressoAtingido);
            } else {
              // Manual percent if alvo is text like "Ler 12 livros", user might input "5" as progress and expect math, but we can't if they write text. Let's try to extract numbers
              const numAlvo = parseFloat(meta.valorAlvo.replace(/[^0-9.]/g, ''));
              const numAtual = parseFloat(meta.progressoAtingido.toString().replace(/[^0-9.]/g, ''));
              if (!isNaN(numAlvo) && !isNaN(numAtual) && numAlvo > 0) {
                percent = Math.min(100, Math.round((numAtual/numAlvo)*100));
              }
            }

            return (
              <div key={meta.id} className="card flex-col justify-between" style={{ opacity: meta.status === 'Pausada' ? 0.7 : 1 }}>
                <div>
                  <div className="card-header mb-sm text-mono">
                    <span className="badge badge-muted">{meta.area}</span>
                    <div className="flex gap-sm">
                      <button className="btn-icon" onClick={() => handleOpenModal(meta)}><Edit2 size={16} /></button>
                      <button className="btn-icon" onClick={() => handleDeleteRequest(meta.id)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{meta.nome}</h3>
                  <p className="text-muted" style={{ fontSize: '0.88rem', minHeight: '42px' }}>{meta.descricao}</p>
                  
                  <div className="flex justify-between items-center mt-md text-mono text-muted" style={{ fontSize: '0.75rem' }}>
                    <span>Prazo: {formatDate(meta.dataPrazo)}</span>
                    <span className={`badge ${meta.status === 'Concluída' ? 'badge-green' : meta.status === 'Pausada' ? 'badge-yellow' : 'badge-accent'}`}>
                      {meta.status}
                    </span>
                  </div>
                </div>

                <div className="mt-lg pt-md" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="flex justify-between items-end mb-sm">
                    <span className="text-muted text-mono" style={{ fontSize: '0.8rem' }}>Meta: {meta.valorAlvo}</span>
                    <span className="font-bold">{percent}%</span>
                  </div>
                  
                  <div className="progress-bar mb-sm">
                    <div className={`progress-bar-fill ${percent >= 100 ? 'green' : 'pink'}`} style={{ width: `${percent}%` }}></div>
                  </div>

                  <div className="flex items-center gap-sm mt-md">
                    <input 
                      type="text" 
                      value={meta.progressoAtingido}
                      onChange={(e) => handleUpdateProgressInline(meta.id, e.target.value)}
                      placeholder="Progresso atual"
                      style={{ 
                        flex: 1, 
                        background: 'var(--bg)', 
                        border: '1px solid var(--border)', 
                        padding: '6px 12px', 
                        borderRadius: '4px',
                        color: 'var(--text)',
                        fontSize: '0.85rem'
                      }}
                    />
                    {percent >= 100 ? (
                      <button className="btn btn-sm btn-ghost" disabled>Concluído</button>
                    ) : (
                      <button 
                        className="btn btn-sm btn-ghost"
                        onClick={() => updateItem('metas', meta.id, { status: 'Concluída', progressoAtingido: meta.valorAlvo })}
                      >
                        ✓ Fechar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Meta' : 'Nova Meta'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Qual é a sua meta?</label>
            <input 
              type="text" 
              required 
              value={formData.nome} 
              onChange={e => setFormData({...formData, nome: e.target.value})} 
              placeholder="Ex: Aprender React, Juntar 10k, Correr 5km..."
            />
          </div>
          
          <div className="form-group">
            <label>Por que isso é importante? (Opcional)</label>
            <textarea 
              value={formData.descricao} 
              onChange={e => setFormData({...formData, descricao: e.target.value})} 
              style={{ minHeight: '60px' }}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Área da Vida</label>
              <select 
                value={formData.area} 
                onChange={e => setFormData({...formData, area: e.target.value})}
              >
                {AREAS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Data Limite (Prazo)</label>
              <input 
                type="date" 
                required
                value={formData.dataPrazo} 
                onChange={e => setFormData({...formData, dataPrazo: e.target.value})} 
              />
            </div>
          </div>

          <div className="form-row mt-sm">
            <div className="form-group">
              <label>O que define o sucesso? (Valor Alvo)</label>
              <input 
                type="text" 
                required
                value={formData.valorAlvo} 
                onChange={e => setFormData({...formData, valorAlvo: e.target.value})} 
                placeholder="Ex: 10000, 12 livros, 80kg..."
              />
            </div>
            <div className="form-group">
              <label>Qual o marco atual?</label>
              <input 
                type="text" 
                value={formData.progressoAtingido} 
                onChange={e => setFormData({...formData, progressoAtingido: e.target.value})} 
                placeholder="Ex: 5000, 3 livros, 85kg..."
              />
            </div>
          </div>

          <div className="form-group mt-sm">
            <label>Status</label>
            <select 
              value={formData.status} 
              onChange={e => setFormData({...formData, status: e.target.value})}
            >
              {STATUS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          
          <div className="form-actions mt-lg" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar Meta</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="Excluir Meta"
        message="Tem certeza que deseja desistir e excluir esta meta?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
