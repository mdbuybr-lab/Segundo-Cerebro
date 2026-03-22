import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Modal, EmptyState, ConfirmDialog, formatCurrency, formatDate, getToday } from '../components/shared';
import { Plus, Edit2, Trash2, ArrowUpCircle } from 'lucide-react';

const CATEGORIAS_SAIDA = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer', 'Roupas', 'Assinaturas', 'Outros'];

export default function Saidas() {
  const { state, addItem, updateItem, deleteItem } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    data: getToday(),
    categoria: 'Alimentação',
    contaOrigem: ''
  });

  const saidas = state.saidas || [];
  const contas = state.contas || [];

  const handleOpenModal = (saida = null) => {
    if (saida) {
      setEditingId(saida.id);
      setFormData({
        descricao: saida.descricao,
        valor: saida.valor,
        data: saida.data,
        categoria: saida.categoria,
        contaOrigem: saida.contaOrigem
      });
    } else {
      setEditingId(null);
      setFormData({
        descricao: '',
        valor: '',
        data: getToday(),
        categoria: 'Alimentação',
        contaOrigem: contas.length > 0 ? contas[0].id : ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.descricao || !formData.valor || !formData.contaOrigem) return;

    if (editingId) {
      updateItem('saidas', editingId, formData);
    } else {
      addItem('saidas', formData);
    }
    setIsModalOpen(false);
  };

  const handleDeleteRequest = (id) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteItem('saidas', itemToDelete);
    }
    setIsConfirmOpen(false);
    setItemToDelete(null);
  };

  const totalSaidas = saidas.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>⬆️ Saídas</h1>
          <p>Controle seus gastos e despesas</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()} disabled={contas.length === 0}>
          <Plus size={18} /> Nova Saída
        </button>
      </div>

      {contas.length === 0 && (
        <div className="mb-md" style={{ padding: '16px', background: 'var(--red-glow)', color: 'var(--red)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--red)' }}>
          ⚠️ Você precisa registrar pelo menos uma Conta Bancária antes de adicionar saídas.
        </div>
      )}

      <div className="summary-card mb-md">
        <div className="summary-label">TOTAL GASTO</div>
        <div className="summary-value text-red">{formatCurrency(totalSaidas)}</div>
      </div>

      {saidas.length === 0 ? (
        <EmptyState 
          icon={<ArrowUpCircle size={48} className="text-red" />} 
          title="Nenhuma saída registrada" 
          description="Adicione aqui as suas despesas e gastos para manter o controle."
        />
      ) : (
        <div className="table-container card p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Conta Origem</th>
                <th>Valor</th>
                <th style={{ width: '80px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {saidas.sort((a,b) => new Date(b.data) - new Date(a.data)).map(saida => {
                const conta = contas.find(c => c.id === Number(saida.contaOrigem) || c.id === saida.contaOrigem);
                return (
                  <tr key={saida.id}>
                    <td className="text-mono text-muted">{formatDate(saida.data)}</td>
                    <td style={{ fontWeight: 600 }}>{saida.descricao}</td>
                    <td><span className="badge badge-muted">{saida.categoria}</span></td>
                    <td>{conta ? conta.nome : 'Desconhecida'}</td>
                    <td className="text-red text-mono font-bold" style={{ fontWeight: 700 }}>
                      - {formatCurrency(saida.valor)}
                    </td>
                    <td>
                      <div className="table-actions justify-end" style={{ justifyContent: 'flex-end', display: 'flex' }}>
                        <button className="btn-icon" onClick={() => handleOpenModal(saida)}><Edit2 size={16} /></button>
                        <button className="btn-icon" onClick={() => handleDeleteRequest(saida.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Saída' : 'Nova Saída'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Descrição</label>
            <input 
              type="text" 
              required 
              value={formData.descricao} 
              onChange={e => setFormData({...formData, descricao: e.target.value})} 
              placeholder="Ex: Aluguel, Supermercado..."
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
                {CATEGORIAS_SAIDA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div className="form-group">
              <label>Conta Origem</label>
              <select 
                required
                value={formData.contaOrigem} 
                onChange={e => setFormData({...formData, contaOrigem: e.target.value})}
              >
                <option value="">Selecione...</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>
          
          <div className="form-actions mt-lg" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ background: 'var(--red)' }}>Registrar Saída</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="Excluir Saída"
        message="Tem certeza que deseja excluir esta saída? O saldo da conta vinculada será recalculado."
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
