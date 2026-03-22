import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Modal, EmptyState, ConfirmDialog, formatDate, getToday } from '../components/shared';
import { Plus, Edit2, Trash2, FolderGit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STATUS = ['Planejamento', 'Em andamento', 'Pausado', 'Concluído'];

export default function Projetos() {
  const { state, addItem, updateItem, deleteItem } = useApp();
  const navigate = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    status: 'Planejamento',
    dataInicio: getToday(),
    dataFim: '',
    cor: '#7c6aff'
  });

  const projetos = state.projetos || [];
  const tarefas = state.tarefas || [];

  const handleOpenModal = (proj = null) => {
    if (proj) {
      setEditingId(proj.id);
      setFormData({
        nome: proj.nome,
        descricao: proj.descricao,
        status: proj.status,
        dataInicio: proj.dataInicio,
        dataFim: proj.dataFim || '',
        cor: proj.cor
      });
    } else {
      setEditingId(null);
      setFormData({
        nome: '',
        descricao: '',
        status: 'Planejamento',
        dataInicio: getToday(),
        dataFim: '',
        cor: '#7c6aff'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nome) return;

    if (editingId) {
      updateItem('projetos', editingId, formData);
    } else {
      addItem('projetos', formData);
    }
    setIsModalOpen(false);
  };

  const handleDeleteRequest = (id) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteItem('projetos', itemToDelete);
      // Auto-unlink tasks from this project
      tarefas.forEach(t => {
        if (String(t.projetoId) === String(itemToDelete)) {
          updateItem('tarefas', t.id, { projetoId: '' });
        }
      });
    }
    setIsConfirmOpen(false);
    setItemToDelete(null);
  };

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>📁 Projetos</h1>
          <p>Gerencie seus projetos e grandes objetivos</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Novo Projeto
        </button>
      </div>

      {projetos.length === 0 ? (
        <EmptyState 
          icon={<FolderGit2 size={48} className="text-muted" />} 
          title="Nenhum projeto ainda" 
          description="Crie projetos para agrupar tarefas relacionadas e acompanhar o progresso global."
        />
      ) : (
        <div className="card-grid">
          {projetos.map(projeto => {
            const projTasks = tarefas.filter(t => String(t.projetoId) === String(projeto.id));
            const tasksTotal = projTasks.length;
            const tasksConcluidas = projTasks.filter(t => t.status === 'Concluída').length;
            
            // Auto calculate progress
            let progress = 0;
            if (projeto.status === 'Concluído') {
              progress = 100;
            } else if (tasksTotal > 0) {
              progress = Math.round((tasksConcluidas / tasksTotal) * 100);
            }

            return (
              <div key={projeto.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="project-color-bar" style={{ background: projeto.cor }}></div>
                
                <div className="card-header" style={{ marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem' }}>{projeto.nome}</h3>
                    <span className="badge badge-muted mt-sm">{projeto.status}</span>
                  </div>
                  <div className="flex gap-sm">
                    <button className="btn-icon" onClick={() => handleOpenModal(projeto)}><Edit2 size={16} /></button>
                    <button className="btn-icon" onClick={() => handleDeleteRequest(projeto.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
                
                <p className="text-muted" style={{ fontSize: '0.88rem', flex: 1, marginBottom: '16px' }}>
                  {projeto.descricao || 'Sem descrição'}
                </p>
                
                <div className="flex gap-md mb-md wrap">
                  <span className="text-mono text-muted" style={{ fontSize: '0.75rem' }}>
                    De: {formatDate(projeto.dataInicio)}
                  </span>
                  {projeto.dataFim && (
                    <span className="text-mono text-muted" style={{ fontSize: '0.75rem' }}>
                      Até: {formatDate(projeto.dataFim)}
                    </span>
                  )}
                </div>

                <div className="mt-md pt-md" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div className="flex justify-between items-end mb-sm" style={{ marginBottom: '8px' }}>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Progresso</div>
                    <div className="text-mono font-bold">{progress}%</div>
                  </div>

                  <div className="progress-bar mb-sm" style={{ height: 6 }}>
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${progress}%`, background: projeto.cor }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-md">
                    <div className="text-muted text-mono" style={{ fontSize: '0.75rem' }}>
                      {tasksConcluidas} / {tasksTotal} tarefas
                    </div>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => navigate('/tarefas')}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Ver Tarefas
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Projeto' : 'Novo Projeto'}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group" style={{ flex: '1 1 70%' }}>
              <label>Nome do Projeto</label>
              <input 
                type="text" 
                required 
                value={formData.nome} 
                onChange={e => setFormData({...formData, nome: e.target.value})} 
                placeholder="Ex: Reforma da Casa, Lançamento App..."
              />
            </div>
            <div className="form-group" style={{ flex: '1 1 20%' }}>
              <label>Cor Identidade</label>
              <input 
                type="color" 
                required 
                value={formData.cor} 
                onChange={e => setFormData({...formData, cor: e.target.value})} 
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Descrição Opcional</label>
            <textarea 
              value={formData.descricao} 
              onChange={e => setFormData({...formData, descricao: e.target.value})} 
              placeholder="Objetivos e contexto do projeto..."
              style={{ minHeight: '80px' }}
            />
          </div>

          <div className="form-row mt-sm">
            <div className="form-group">
              <label>Data de Início</label>
              <input 
                type="date" 
                required
                value={formData.dataInicio} 
                onChange={e => setFormData({...formData, dataInicio: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>Data Prevista Fim</label>
              <input 
                type="date" 
                value={formData.dataFim} 
                onChange={e => setFormData({...formData, dataFim: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select 
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                {STATUS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          
          <div className="form-actions mt-lg" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar Projeto</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="Excluir Projeto"
        message="Tem certeza que deseja excluir este projeto? Suas tarefas não serão excluídas, mas ficarão sem projeto vinculado."
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
