import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Modal, EmptyState, ConfirmDialog, formatDate, getToday } from '../components/shared';
import { Plus, Edit2, Trash2, StickyNote, Search, Eye } from 'lucide-react';

const CATEGORIAS = ['Ideia', 'Reflexão', 'Aprendizado', 'Projeto', 'Pessoal', 'Trabalho'];

export default function Anotacoes() {
  const { state, addItem, updateItem, deleteItem } = useApp();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOpenViewModal, setIsOpenViewModal] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [viewingAnotacao, setViewingAnotacao] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [ordem, setOrdem] = useState('Recentes');

  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    tags: '',
    categoria: 'Ideia',
    dataCriacao: new Date().toISOString()
  });

  const anotacoes = state.anotacoes || [];

  const handleOpenModal = (note = null) => {
    if (note) {
      setEditingId(note.id);
      setFormData({
        titulo: note.titulo,
        conteudo: note.conteudo,
        tags: note.tags,
        categoria: note.categoria,
        dataCriacao: note.dataCriacao
      });
      setIsOpenViewModal(false);
    } else {
      setEditingId(null);
      setFormData({
        titulo: '',
        conteudo: '',
        tags: '',
        categoria: 'Ideia',
        dataCriacao: new Date().toISOString()
      });
    }
    setIsModalOpen(true);
  };

  const handleView = (note) => {
    setViewingAnotacao(note);
    setIsOpenViewModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.titulo) return;

    if (editingId) {
      updateItem('anotacoes', editingId, { ...formData, dataAtualizacao: new Date().toISOString() });
    } else {
      addItem('anotacoes', { ...formData, dataAtualizacao: new Date().toISOString() });
    }
    setIsModalOpen(false);
  };

  const handleDeleteRequest = (id) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
    setIsOpenViewModal(false);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteItem('anotacoes', itemToDelete);
    }
    setIsConfirmOpen(false);
    setItemToDelete(null);
  };

  // Funções Utilitárias
  const getWordCount = (text) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  const getPreview = (text) => {
    if (!text) return '';
    return text.length > 120 ? text.substring(0, 120) + '...' : text;
  };

  // Filtragem e Ordenação
  const filteredAnotacoes = anotacoes.filter(a => {
    if (filtroCategoria !== 'Todas' && a.categoria !== filtroCategoria) return false;
    
    if (busca) {
      const q = busca.toLowerCase();
      const matchTitle = a.titulo.toLowerCase().includes(q);
      const matchContent = a.conteudo.toLowerCase().includes(q);
      const matchTags = a.tags && a.tags.toLowerCase().includes(q);
      return matchTitle || matchContent || matchTags;
    }
    
    return true;
  }).sort((a,b) => {
    const d1 = new Date(a.dataAtualizacao || a.dataCriacao).getTime();
    const d2 = new Date(b.dataAtualizacao || b.dataCriacao).getTime();
    return ordem === 'Recentes' ? d2 - d1 : d1 - d2;
  });

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>📝 Anotações</h1>
          <p>O seu segundo cérebro em texto: docs, reflexões e ideias</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nova Nota
        </button>
      </div>

      <div className="filters-bar" style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) auto auto', gap: '16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} className="text-muted" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input 
            type="text" 
            placeholder="Buscar nas anotações..." 
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ width: '100%', paddingLeft: 36, height: 40 }}
          />
        </div>
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ height: 40 }}>
          <option value="Todas">📚 Todas as Categorias</option>
          {CATEGORIAS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={ordem} onChange={e => setOrdem(e.target.value)} style={{ height: 40 }}>
          <option value="Recentes">Mais Recentes</option>
          <option value="Antigas">Mais Antigas</option>
        </select>
      </div>

      {filteredAnotacoes.length === 0 ? (
        <EmptyState 
          icon={<StickyNote size={48} className="text-muted" />} 
          title={busca ? "Nenhum resultado encontrado" : "Nenhuma anotação criada"} 
          description={busca ? "Tente buscar usando termos diferentes." : "Liberte sua mente e escreva aqui as suas ideias e pensamentos."}
        />
      ) : (
        <div className="card-grid">
          {filteredAnotacoes.map(nota => {
            const tagsList = nota.tags ? nota.tags.split(',').map(t=>t.trim()).filter(Boolean) : [];
            const wc = getWordCount(nota.conteudo);

            return (
              <div 
                key={nota.id} 
                className="card" 
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                onClick={() => handleView(nota)}
              >
                <div className="flex justify-between items-start mb-sm">
                  <span className="badge badge-accent">{nota.categoria}</span>
                  <div className="flex gap-sm">
                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleOpenModal(nota); }}><Edit2 size={16} /></button>
                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleDeleteRequest(nota.id); }}><Trash2 size={16} /></button>
                  </div>
                </div>
                
                <h3 style={{ fontSize: '1.15rem', marginBottom: '8px', lineHeight: 1.3 }}>{nota.titulo}</h3>
                
                <p className="text-muted" style={{ fontSize: '0.88rem', flex: 1, whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
                  {getPreview(nota.conteudo) || <span style={{opacity: 0.5}}>Vazio...</span>}
                </p>

                {tagsList.length > 0 && (
                  <div className="tags-container mb-md">
                    {tagsList.slice(0,3).map(t => <span key={t} className="tag">#{t}</span>)}
                    {tagsList.length > 3 && <span className="tag">+{tagsList.length-3}</span>}
                  </div>
                )}

                <div className="mt-sm pt-sm flex justify-between items-center text-mono text-muted" style={{ borderTop: '1px solid var(--border)', fontSize: '0.72rem' }}>
                  <span>{formatDate(nota.dataAtualizacao || nota.dataCriacao)}</span>
                  <span>{wc} {wc === 1 ? 'palavra' : 'palavras'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Anotação' : 'Criar Anotação'} large>
        <form onSubmit={handleSubmit}>
          <div className="form-group mb-sm">
            <input 
              type="text" 
              required 
              value={formData.titulo} 
              onChange={e => setFormData({...formData, titulo: e.target.value})} 
              placeholder="Título da Anotação"
              style={{ fontSize: '1.4rem', fontWeight: 700, padding: '16px', background: 'transparent', border: '1px solid var(--border)' }}
            />
          </div>
          
          <div className="form-group">
            <textarea 
              value={formData.conteudo} 
              onChange={e => setFormData({...formData, conteudo: e.target.value})} 
              placeholder="Escreva seu texto aqui..."
              style={{ minHeight: '350px', fontSize: '1rem', lineHeight: 1.6, padding: '16px', fontFamily: 'var(--font-body)' }}
              autoFocus={!editingId}
            />
          </div>

          <div className="flex justify-between items-center text-mono text-muted mb-md pl-sm" style={{ fontSize: '0.8rem' }}>
            <span>{getWordCount(formData.conteudo)} palavras</span>
          </div>

          <div className="form-row mt-sm" style={{ background: 'var(--surface2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
            <div className="form-group mb-0">
              <label>Categoria</label>
              <select 
                value={formData.categoria} 
                onChange={e => setFormData({...formData, categoria: e.target.value})}
              >
                {CATEGORIAS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div className="form-group mb-0">
              <label>Tags separadas por vírgula</label>
              <input 
                type="text" 
                value={formData.tags} 
                onChange={e => setFormData({...formData, tags: e.target.value})} 
                placeholder="Ex: tutorial, python, receita..."
              />
            </div>
          </div>
          
          <div className="form-actions mt-lg" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar Documento</button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      {viewingAnotacao && (
        <Modal isOpen={isOpenViewModal} onClose={() => setIsOpenViewModal(false)} title="Lendo Anotação" large>
          <div className="flex justify-between items-start mb-lg">
            <div>
              <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{viewingAnotacao.titulo}</h1>
              <div className="flex gap-sm items-center text-mono text-muted" style={{ fontSize: '0.8rem' }}>
                <span className="badge badge-accent">{viewingAnotacao.categoria}</span>
                <span>• {formatDate(viewingAnotacao.dataAtualizacao || viewingAnotacao.dataCriacao)}</span>
                <span>• {getWordCount(viewingAnotacao.conteudo)} palavras</span>
              </div>
            </div>
          </div>

          <div className="markdown-body" style={{ 
            background: 'var(--surface2)', 
            padding: '24px', 
            borderRadius: 'var(--radius)', 
            minHeight: '200px',
            maxHeight: '50vh',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.7,
            fontSize: '1rem',
            color: 'var(--text)'
          }}>
            {viewingAnotacao.conteudo || <span className="text-muted italic">Anotação vazia.</span>}
          </div>

          {viewingAnotacao.tags && (
            <div className="tags-container mt-md">
              {viewingAnotacao.tags.split(',').filter(t=>t.trim()).map(t => (
                <span key={t} className="tag">#{t.trim()}</span>
              ))}
            </div>
          )}

          <div className="form-actions mt-lg" style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', justifyContent: 'space-between' }}>
            <button className="btn btn-ghost text-red" onClick={() => handleDeleteRequest(viewingAnotacao.id)}>Excluir Mota</button>
            <div className="flex gap-md">
              <button className="btn btn-ghost" onClick={() => setIsOpenViewModal(false)}>Fechar Janela</button>
              <button className="btn btn-primary" onClick={() => handleOpenModal(viewingAnotacao)}>Editar Documento</button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="Excluir Anotação"
        message="Tem certeza que deseja apagar permanentemente este documento?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
