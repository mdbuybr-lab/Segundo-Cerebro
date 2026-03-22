import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Modal, EmptyState, ConfirmDialog, formatCurrency } from '../components/shared';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const TIPOS_CONTA = ['Conta Corrente', 'Poupança', 'Carteira', 'Investimento', 'Outro'];

export default function ContasBancarias() {
  const { state, addItem, updateItem, deleteItem } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'Conta Corrente',
    saldoInicial: ''
  });

  const contas = state.contas || [];
  const entradas = state.entradas || [];
  const saidas = state.saidas || [];

  const getSaldoAtual = (contaId, saldoInicial) => {
    const totalEntradas = entradas
      .filter(e => e.contaDestino === contaId)
      .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
      
    const totalSaidas = saidas
      .filter(s => s.contaOrigem === contaId)
      .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
      
    return parseFloat(saldoInicial || 0) + totalEntradas - totalSaidas;
  };

  const handleOpenModal = (conta = null) => {
    if (conta) {
      setEditingId(conta.id);
      setFormData({
        nome: conta.nome,
        tipo: conta.tipo,
        saldoInicial: conta.saldoInicial
      });
    } else {
      setEditingId(null);
      setFormData({
        nome: '',
        tipo: 'Conta Corrente',
        saldoInicial: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.saldoInicial) return;

    if (editingId) {
      updateItem('contas', editingId, formData);
    } else {
      addItem('contas', formData);
    }
    setIsModalOpen(false);
  };

  const handleDeleteRequest = (id) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteItem('contas', itemToDelete);
    }
    setIsConfirmOpen(false);
    setItemToDelete(null);
  };

  const saldoTotal = contas.reduce((acc, conta) => acc + getSaldoAtual(conta.id, conta.saldoInicial), 0);

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>🏦 Contas Bancárias</h1>
          <p>Gerencie suas contas e saldos</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nova Conta
        </button>
      </div>

      <div className="summary-card mb-md">
        <div className="summary-label">SALDO TOTAL</div>
        <div className="summary-value text-accent">{formatCurrency(saldoTotal)}</div>
      </div>

      {contas.length === 0 ? (
        <EmptyState 
          icon="🏦" 
          title="Nenhuma conta registrada" 
          description="Adicione sua primeira conta bancária para começar a controlar suas finanças."
        />
      ) : (
        <div className="card-grid">
          {contas.map(conta => {
            const saldoAtual = getSaldoAtual(conta.id, conta.saldoInicial);
            return (
              <div key={conta.id} className="card">
                <div className="card-header">
                  <div>
                    <h3>{conta.nome}</h3>
                    <span className="badge badge-muted mt-sm">{conta.tipo}</span>
                  </div>
                  <div className="flex gap-sm">
                    <button className="btn-icon" onClick={() => handleOpenModal(conta)}><Edit2 size={16} /></button>
                    <button className="btn-icon" onClick={() => handleDeleteRequest(conta.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
                
                <div className="mt-md">
                  <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Saldo Atual</div>
                  <div className={`summary-value ${saldoAtual >= 0 ? 'text-green' : 'text-red'}`} style={{ fontSize: '1.4rem' }}>
                    {formatCurrency(saldoAtual)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Conta' : 'Nova Conta'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome do Banco / Conta</label>
            <input 
              type="text" 
              required 
              value={formData.nome} 
              onChange={e => setFormData({...formData, nome: e.target.value})} 
              placeholder="Ex: Nubank, Itaú..."
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Tipo de Conta</label>
              <select 
                value={formData.tipo} 
                onChange={e => setFormData({...formData, tipo: e.target.value})}
              >
                {TIPOS_CONTA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div className="form-group">
              <label>Saldo Inicial (R$)</label>
              <input 
                type="number" 
                step="0.01"
                required 
                value={formData.saldoInicial} 
                onChange={e => setFormData({...formData, saldoInicial: e.target.value})} 
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="form-actions mt-md" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="Excluir Conta"
        message="Tem certeza que deseja excluir esta conta? O histórico atrelado a ela ficará órfão."
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
