import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Modal, EmptyState, ConfirmDialog, formatCurrency, formatDate, getToday, isOverdue } from '../components/shared';
import { Plus, Edit2, Trash2, CalendarClock } from 'lucide-react';

const RECORRENCIAS = ['Única', 'Semanal', 'Mensal', 'Anual'];
const STATUS = ['Pendente', 'Pago'];

export default function Programacoes() {
  const { state, addItem, updateItem, deleteItem } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    vencimento: getToday(),
    recorrencia: 'Mensal',
    status: 'Pendente'
  });

  const programacoes = state.programacoes || [];

  const handleOpenModal = (prog = null) => {
    if (prog) {
      setEditingId(prog.id);
      setFormData({
        descricao: prog.descricao,
        valor: prog.valor,
        vencimento: prog.vencimento,
        recorrencia: prog.recorrencia,
        status: prog.status
      });
    } else {
      setEditingId(null);
      setFormData({
        descricao: '',
        valor: '',
        vencimento: getToday(),
        recorrencia: 'Mensal',
        status: 'Pendente'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.descricao || !formData.valor) return;

    if (editingId) {
      updateItem('programacoes', editingId, formData);
    } else {
      addItem('programacoes', formData);
    }
    setIsModalOpen(false);
  };

  const handleDeleteRequest = (id) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteItem('programacoes', itemToDelete);
    }
    setIsConfirmOpen(false);
    setItemToDelete(null);
  };

  const toggleStatus = (prog) => {
    const newStatus = prog.status === 'Pago' ? 'Pendente' : 'Pago';
    updateItem('programacoes', prog.id, { status: newStatus });
  };

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>📅 Programações</h1>
          <p>Contas a pagar e previsões de gastos</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nova Programação
        </button>
      </div>

      {programacoes.length === 0 ? (
        <EmptyState 
          icon={<CalendarClock size={48} className="text-yellow" />} 
          title="Nenhuma programação encontrada" 
          description="Agende suas contas e compromissos fixos aqui."
        />
      ) : (
        <div className="table-container card p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Recorrência</th>
                <th>Status</th>
                <th style={{ width: '80px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {programacoes.sort((a,b) => new Date(a.vencimento) - new Date(b.vencimento)).map(prog => {
                const isLate = prog.status === 'Pendente' && isOverdue(prog.vencimento);
                
                return (
                  <tr key={prog.id} className={isLate ? 'overdue' : ''}>
                    <td className="text-mono font-bold" style={{ color: isLate ? 'var(--red)' : 'var(--text-secondary)' }}>
                      {formatDate(prog.vencimento)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{prog.descricao}</td>
                    <td className="text-mono">{formatCurrency(prog.valor)}</td>
                    <td><span className="badge badge-muted">{prog.recorrencia}</span></td>
                    <td>
                      <button 
                        className={`badge ${prog.status === 'Pago' ? 'badge-green' : isLate ? 'badge-red' : 'badge-yellow'}`}
                        style={{ border: 'none', cursor: 'pointer' }}
                        onClick={() => toggleStatus(prog)}
                      >
                        {prog.status === 'Pago' ? 'Pago' : isLate ? 'Atrasado' : 'Pendente'}
                      </button>
                    </td>
                    <td>
                      <div className="table-actions justify-end" style={{ justifyContent: 'flex-end', display: 'flex' }}>
                        <button className="btn-icon" onClick={() => handleOpenModal(prog)}><Edit2 size={16} /></button>
                        <button className="btn-icon" onClick={() => handleDeleteRequest(prog.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Programação' : 'Nova Programação'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Descrição da Conta/Compromisso</label>
            <input 
              type="text" 
              required 
              value={formData.descricao} 
              onChange={e => setFormData({...formData, descricao: e.target.value})} 
              placeholder="Ex: Conta de Luz, Aluguel, IPTU..."
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Valor Previsto (R$)</label>
              <input 
                type="number" 
                step="0.01"
                required 
                value={formData.valor} 
                onChange={e => setFormData({...formData, valor: e.target.value})} 
                placeholder="0.00"
              />
            </div>
            
            <div className="form-group">
              <label>Data de Vencimento</label>
              <input 
                type="date" 
                required 
                value={formData.vencimento} 
                onChange={e => setFormData({...formData, vencimento: e.target.value})} 
              />
            </div>
          </div>

          <div className="form-row mt-md" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Recorrência</label>
              <select 
                value={formData.recorrencia} 
                onChange={e => setFormData({...formData, recorrencia: e.target.value})}
              >
                {RECORRENCIAS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
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
            <button type="submit" className="btn btn-primary">Salvar Agendamento</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="Excluir Programação"
        message="Tem certeza que deseja excluir esta programação futura?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
