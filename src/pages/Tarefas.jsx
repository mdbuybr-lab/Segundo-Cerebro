import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Modal, EmptyState, ConfirmDialog, formatDate, getToday, isOverdue, Checkbox } from '../components/shared';
import { Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';

const PRIORIDADES = ['Baixa', 'Média', 'Alta'];
const STATUS = ['A fazer', 'Em progresso', 'Concluída'];

export default function Tarefas() {
  const { state, addItem, updateItem, deleteItem } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState('Todas');
  const [filtroProjeto, setFiltroProjeto] = useState('Todos');

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'Média',
    status: 'A fazer',
    vencimento: getToday(),
    projetoId: '',
    tags: ''
  });

  const tarefas = state.tarefas || [];
  const projetos = state.projetos || [];

  // Counters
  const countAtrasadas = tarefas.filter(t => t.status !== 'Concluída' && isOverdue(t.vencimento)).length;
  const countAFazer = tarefas.filter(t => t.status === 'A fazer').length;
  const countProgresso = tarefas.filter(t => t.status === 'Em progresso').length;
  const countConcluidas = tarefas.filter(t => t.status === 'Concluída').length;

  const handleOpenModal = (tar = null) => {
    if (tar) {
      setEditingId(tar.id);
      setFormData({
        titulo: tar.titulo,
        descricao: tar.descricao,
        prioridade: tar.prioridade,
        status: tar.status,
        vencimento: tar.vencimento,
        projetoId: tar.projetoId,
        tags: tar.tags
      });
    } else {
      setEditingId(null);
      setFormData({
        titulo: '',
        descricao: '',
        prioridade: 'Média',
        status: 'A fazer',
        vencimento: getToday(),
        projetoId: '',
        tags: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.titulo) return;

    if (editingId) {
      updateItem('tarefas', editingId, formData);
    } else {
      addItem('tarefas', formData);
    }
    setIsModalOpen(false);
  };

  const handleDeleteRequest = (id) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteItem('tarefas', itemToDelete);
    }
    setIsConfirmOpen(false);
    setItemToDelete(null);
  };

  const toggleConcluida = (tar) => {
    const newStatus = tar.status === 'Concluída' ? 'A fazer' : 'Concluída';
    updateItem('tarefas', tar.id, { status: newStatus });
  };

  // Filter and sort
  const filteredTarefas = tarefas.filter(t => {
    if (filtroStatus !== 'Todos' && t.status !== filtroStatus) return false;
    if (filtroPrioridade !== 'Todas' && t.prioridade !== filtroPrioridade) return false;
    if (filtroProjeto !== 'Todos' && String(t.projetoId) !== String(filtroProjeto)) return false;
    return true;
  }).sort((a, b) => {
    if (a.status === 'Concluída' && b.status !== 'Concluída') return 1;
    if (b.status === 'Concluída' && a.status !== 'Concluída') return -1;
    return new Date(a.vencimento) - new Date(b.vencimento);
  });

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>✅ Tarefas</h1>
          <p>Organize seu dia a dia e seus to-dos</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nova Tarefa
        </button>
      </div>

      <div className="status-counters">
        <div className="status-counter" style={{ borderColor: countAtrasadas > 0 ? 'var(--red)' : 'var(--border)' }}>
          <span className="count text-red">{countAtrasadas}</span> <span className="text-muted">Atrasadas</span>
        </div>
        <div className="status-counter">
          <span className="count text-accent">{countAFazer}</span> <span className="text-muted">A Fazer</span>
        </div>
        <div className="status-counter">
          <span className="count text-yellow">{countProgresso}</span> <span className="text-muted">Em Progresso</span>
        </div>
        <div className="status-counter">
          <span className="count text-green">{countConcluidas}</span> <span className="text-muted">Concluídas</span>
        </div>
      </div>

      <div className="filters-bar">
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="Todos">📦 Todos os Status</option>
          {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)}>
          <option value="Todas">🔥 Todas as Prioridades</option>
          {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filtroProjeto} onChange={e => setFiltroProjeto(e.target.value)}>
          <option value="Todos">📁 Todos os Projetos</option>
          {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>

      {filteredTarefas.length === 0 ? (
        <EmptyState 
          icon={<CheckCircle2 size={48} className="text-muted" />} 
          title="Nenhuma tarefa encontrada" 
          description="Você não tem tarefas aqui! Hora de criar algumas ou descansar."
        />
      ) : (
        <div className="flex-col gap-sm">
          {filteredTarefas.map(tarefa => {
            const isLate = tarefa.status !== 'Concluída' && isOverdue(tarefa.vencimento);
            const isDone = tarefa.status === 'Concluída';
            const projeto = projetos.find(p => String(p.id) === String(tarefa.projetoId));
            const tags = tarefa.tags ? tarefa.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
            
            return (
              <div 
                key={tarefa.id} 
                className="card flex items-center gap-md" 
                style={{ 
                  padding: '16px', 
                  opacity: isDone ? 0.6 : 1,
                  borderLeft: isLate ? '4px solid var(--red)' : '',
                  background: isDone ? 'var(--bg)' : 'var(--surface)'
                }}
              >
                <Checkbox checked={isDone} onChange={() => toggleConcluida(tarefa)} />
                
                <div style={{ flex: 1, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--text-secondary)' : 'var(--text)' }}>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '4px' }}>{tarefa.titulo}</div>
                  
                  <div className="flex gap-sm items-center flex-wrap">
                    {tarefa.vencimento && (
                      <span className="text-mono" style={{ fontSize: '0.75rem', color: isLate ? 'var(--red)' : 'var(--text-secondary)' }}>
                        📅 {formatDate(tarefa.vencimento)}
                      </span>
                    )}
                    
                    {tarefa.prioridade && (
                      <span className={`badge ${
                        tarefa.prioridade === 'Alta' ? 'badge-red' : 
                        tarefa.prioridade === 'Média' ? 'badge-yellow' : 'badge-muted'
                      }`}>
                        {tarefa.prioridade}
                      </span>
                    )}

                    {!isDone && tarefa.status !== 'A fazer' && (
                      <span className="badge badge-accent">{tarefa.status}</span>
                    )}

                    {projeto && (
                      <span className="badge badge-muted flex items-center gap-sm">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: projeto.cor || '#888' }}></span>
                        {projeto.nome}
                      </span>
                    )}

                    {tags.length > 0 && tags.map(tag => (
                      <span key={tag} className="tag">#{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-sm">
                  <button className="btn-icon" onClick={() => handleOpenModal(tarefa)}><Edit2 size={16} /></button>
                  <button className="btn-icon" onClick={() => handleDeleteRequest(tarefa.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Tarefa' : 'Nova Tarefa'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>O que precisa ser feito?</label>
            <input 
              type="text" 
              required 
              value={formData.titulo} 
              onChange={e => setFormData({...formData, titulo: e.target.value})} 
              placeholder="Ex: Pagar boleto X, Enviar email..."
            />
          </div>
          
          <div className="form-group">
            <label>Descrição Opcional</label>
            <textarea 
              value={formData.descricao} 
              onChange={e => setFormData({...formData, descricao: e.target.value})} 
              placeholder="Mais detalhes sobre a tarefa..."
              style={{ minHeight: '80px' }}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data de Vencimento</label>
              <input 
                type="date" 
                value={formData.vencimento} 
                onChange={e => setFormData({...formData, vencimento: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>Prioridade</label>
              <select 
                value={formData.prioridade} 
                onChange={e => setFormData({...formData, prioridade: e.target.value})}
              >
                {PRIORIDADES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row mt-sm">
            <div className="form-group">
              <label>Status</label>
              <select 
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                {STATUS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div className="form-group">
              <label>Projeto Vinculado</label>
              <select 
                value={formData.projetoId} 
                onChange={e => setFormData({...formData, projetoId: e.target.value})}
              >
                <option value="">Nenhum</option>
                {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group mt-sm">
            <label>Etiquetas (separadas por vírgula)</label>
            <input 
              type="text" 
              value={formData.tags} 
              onChange={e => setFormData({...formData, tags: e.target.value})} 
              placeholder="estudo, trabalho, viagem..."
            />
          </div>
          
          <div className="form-actions mt-lg" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar Tarefa</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="Excluir Tarefa"
        message="Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita."
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
