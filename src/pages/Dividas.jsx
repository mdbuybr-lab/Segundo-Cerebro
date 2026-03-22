import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Modal, EmptyState, ConfirmDialog, formatCurrency, formatDate, getToday } from '../components/shared';
import { Plus, Edit2, Trash2, Landmark } from 'lucide-react';

export default function Dividas() {
  const { state, addItem, updateItem, deleteItem } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    credor: '',
    descricao: '',
    valorTotal: '',
    valorPago: '0',
    juros: '0',
    vencimentoFinal: getToday()
  });

  const dividas = state.dividas || [];

  const handleOpenModal = (div = null) => {
    if (div) {
      setEditingId(div.id);
      setFormData({
        credor: div.credor,
        descricao: div.descricao,
        valorTotal: div.valorTotal,
        valorPago: div.valorPago,
        juros: div.juros,
        vencimentoFinal: div.vencimentoFinal
      });
    } else {
      setEditingId(null);
      setFormData({
        credor: '',
        descricao: '',
        valorTotal: '',
        valorPago: '0',
        juros: '0',
        vencimentoFinal: getToday()
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.credor || !formData.valorTotal) return;

    if (editingId) {
      updateItem('dividas', editingId, formData);
    } else {
      addItem('dividas', formData);
    }
    setIsModalOpen(false);
  };

  const handleDeleteRequest = (id) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteItem('dividas', itemToDelete);
    }
    setIsConfirmOpen(false);
    setItemToDelete(null);
  };

  const totalDevido = dividas.reduce((acc, curr) => acc + (parseFloat(curr.valorTotal) - parseFloat(curr.valorPago || 0)), 0);

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>💸 Dívidas</h1>
          <p>Acompanhe empréstimos, financiamentos e parcelamentos</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nova Dívida
        </button>
      </div>

      <div className="summary-card mb-md">
        <div className="summary-label">VALOR RESTANTE TOTAL</div>
        <div className="summary-value text-red">{formatCurrency(totalDevido)}</div>
      </div>

      {dividas.length === 0 ? (
        <EmptyState 
          icon={<Landmark size={48} className="text-muted" />} 
          title="Nenhuma dívida cadastrada" 
          description="Você não possui dívidas pendentes. Parabéns pela saúde financeira!"
        />
      ) : (
        <div className="card-grid">
          {dividas.map(divida => {
            const vTotal = parseFloat(divida.valorTotal || 0);
            const vPago = parseFloat(divida.valorPago || 0);
            const restante = vTotal - vPago;
            const progress = (vTotal > 0) ? Math.min(100, Math.round((vPago / vTotal) * 100)) : 0;
            const isQuitada = progress >= 100;
            
            return (
              <div key={divida.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{ marginBottom: '8px' }}>
                  <div>
                    <h3>{divida.credor}</h3>
                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>{divida.descricao}</div>
                  </div>
                  <div className="flex gap-sm">
                    <button className="btn-icon" onClick={() => handleOpenModal(divida)}><Edit2 size={16} /></button>
                    <button className="btn-icon" onClick={() => handleDeleteRequest(divida.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
                
                <div className="flex gap-md mb-md wrap">
                  <span className="badge badge-muted">Juros: {divida.juros}% a.m.</span>
                  <span className="badge badge-muted">Vence: {formatDate(divida.vencimentoFinal)}</span>
                </div>
                
                <div style={{ flex: 1 }}></div>

                <div className="mt-md pt-md" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div className="flex justify-between items-end mb-sm" style={{ marginBottom: '8px' }}>
                    <div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>Falta Pagar</div>
                      <div className={isQuitada ? "text-green" : "text-red"} style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                        {formatCurrency(restante)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>Total: {formatCurrency(vTotal)}</div>
                    </div>
                  </div>

                  <div className="progress-bar">
                    <div 
                      className={`progress-bar-fill ${isQuitada ? 'green' : 'pink'}`} 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="progress-info">
                    <span>{progress}% Pago</span>
                    <span>{formatCurrency(vPago)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Dívida' : 'Nova Dívida'}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Instituição / Credor</label>
              <input 
                type="text" 
                required 
                value={formData.credor} 
                onChange={e => setFormData({...formData, credor: e.target.value})} 
                placeholder="Ex: Caixa, Itaú, Nubank..."
              />
            </div>
            <div className="form-group">
              <label>Descrição</label>
              <input 
                type="text" 
                value={formData.descricao} 
                onChange={e => setFormData({...formData, descricao: e.target.value})} 
                placeholder="Ex: Financiamento Carro..."
              />
            </div>
          </div>
          
          <div className="form-row mt-md" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Valor Total (R$)</label>
              <input 
                type="number" 
                step="0.01"
                required 
                value={formData.valorTotal} 
                onChange={e => setFormData({...formData, valorTotal: e.target.value})} 
              />
            </div>
            
            <div className="form-group">
              <label>Valor já Pago (R$)</label>
              <input 
                type="number" 
                step="0.01"
                required 
                value={formData.valorPago} 
                onChange={e => setFormData({...formData, valorPago: e.target.value})} 
              />
            </div>
          </div>

          <div className="form-row mt-md" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Juros (% ao mês)</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.juros} 
                onChange={e => setFormData({...formData, juros: e.target.value})} 
              />
            </div>
            
            <div className="form-group">
              <label>Vencimento Final da Dívida</label>
              <input 
                type="date" 
                required 
                value={formData.vencimentoFinal} 
                onChange={e => setFormData({...formData, vencimentoFinal: e.target.value})} 
              />
            </div>
          </div>
          
          <div className="form-actions mt-lg" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ background: 'var(--red)' }}>Salvar Dívida</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="Excluir Dívida"
        message="Tem certeza que deseja excluir esta dívida dos seus registros?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
