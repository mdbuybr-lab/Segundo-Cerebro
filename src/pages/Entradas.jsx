import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Modal, EmptyState, ConfirmDialog, formatCurrency, formatDate, getToday } from '../components/shared';
import { Plus, Edit2, Trash2, ArrowDownCircle } from 'lucide-react';

const CATEGORIAS_ENTRADA = ['Salário', 'Freelance', 'Investimento', 'Presente', 'Aluguel Recebido', 'Outros'];

export default function Entradas() {
  const { state, addItem, updateItem, deleteItem } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    data: getToday(),
    categoria: 'Salário',
    contaDestino: ''
  });

  const entradas = state.entradas || [];
  const contas = state.contas || [];

  const handleOpenModal = (entrada = null) => {
    if (entrada) {
      setEditingId(entrada.id);
      setFormData({
        descricao: entrada.descricao,
        valor: entrada.valor,
        data: entrada.data,
        categoria: entrada.categoria,
        contaDestino: entrada.contaDestino
      });
    } else {
      setEditingId(null);
      setFormData({
        descricao: '',
        valor: '',
        data: getToday(),
        categoria: 'Salário',
        contaDestino: contas.length > 0 ? contas[0].id : ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.descricao || !formData.valor || !formData.contaDestino) return;

    if (editingId) {
      updateItem('entradas', editingId, formData);
    } else {
      addItem('entradas', formData);
    }
    setIsModalOpen(false);
  };

  const handleDeleteRequest = (id) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteItem('entradas', itemToDelete);
    }
    setIsConfirmOpen(false);
    setItemToDelete(null);
  };

  const totalEntradas = entradas.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>⬇️ Entradas</h1>
          <p>Registre seus recebimentos e ganhos</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()} disabled={contas.length === 0}>
          <Plus size={18} /> Nova Entrada
        </button>
      </div>

      {contas.length === 0 && (
        <div className="mb-md" style={{ padding: '16px', background: 'var(--red-glow)', color: 'var(--red)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--red)' }}>
          ⚠️ Você precisa registrar pelo menos uma Conta Bancária antes de adicionar entradas.
        </div>
      )}

      <div className="summary-card mb-md">
        <div className="summary-label">TOTAL RECEBIDO</div>
        <div className="summary-value text-green">{formatCurrency(totalEntradas)}</div>
      </div>

      {entradas.length === 0 ? (
        <EmptyState 
          icon={<ArrowDownCircle size={48} className="text-green" />} 
          title="Nenhuma entrada registrada" 
          description="Adicione seus ganhos, como salário ou freelancer."
        />
      ) : (
        <div className="table-container card p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Conta Destino</th>
                <th>Valor</th>
                <th style={{ width: '80px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {entradas.sort((a,b) => new Date(b.data) - new Date(a.data)).map(entrada => {
                const conta = contas.find(c => c.id === Number(entrada.contaDestino) || c.id === entrada.contaDestino);
                return (
                  <tr key={entrada.id}>
                    <td className="text-mono text-muted">{formatDate(entrada.data)}</td>
                    <td style={{ fontWeight: 600 }}>{entrada.descricao}</td>
                    <td><span className="badge badge-muted">{entrada.categoria}</span></td>
                    <td>{conta ? conta.nome : 'Desconhecida'}</td>
                    <td className="text-green text-mono font-bold" style={{ fontWeight: 700 }}>
                      + {formatCurrency(entrada.valor)}
                    </td>
                    <td>
                      <div className="table-actions justify-end" style={{ justifyContent: 'flex-end', display: 'flex' }}>
                        <button className="btn-icon" onClick={() => handleOpenModal(entrada)}><Edit2 size={16} /></button>
                        <button className="btn-icon" onClick={() => handleDeleteRequest(entrada.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Entrada' : 'Nova Entrada'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Descrição</label>
            <input 
              type="text" 
              required 
              value={formData.descricao} 
              onChange={e => setFormData({...formData, descricao: e.target.value})} 
              placeholder="Ex: Salário, Pagamento Freelance..."
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Valor (R$)</label>
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
              <label>Data</label>
              <input 
                type="date" 
                required 
                value={formData.data} 
                onChange={e => setFormData({...formData, data: e.target.value})} 
              />
            </div>
          </div>

          <div className="form-row mt-md" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Categoria</label>
              <select 
                value={formData.categoria} 
                onChange={e => setFormData({...formData, categoria: e.target.value})}
              >
                {CATEGORIAS_ENTRADA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div className="form-group">
              <label>Conta Destino</label>
              <select 
                required
                value={formData.contaDestino} 
                onChange={e => setFormData({...formData, contaDestino: e.target.value})}
              >
                <option value="">Selecione...</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>
          
          <div className="form-actions mt-lg" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ background: 'var(--green)' }}>Adicionar Entrada</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="Excluir Entrada"
        message="Tem certeza que deseja excluir esta entrada? O saldo da conta vinculada será recalculado."
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
