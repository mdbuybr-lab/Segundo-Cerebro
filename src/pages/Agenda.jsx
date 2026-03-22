import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Modal, EmptyState, ConfirmDialog, formatDate, getToday } from '../components/shared';
import { Plus, Edit2, Trash2, CalendarDays } from 'lucide-react';

const TIPOS = ['Compromisso', 'Reunião', 'Lembrete', 'Evento', 'Médico', 'Pessoal'];
const REPETICOES = ['Não repete', 'Diário', 'Semanal', 'Mensal'];

export default function Agenda() {
  const { state, addItem, updateItem, deleteItem } = useApp();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [view, setView] = useState('Mensal'); // Mensal, Lista, Hoje
  const [currentDate, setCurrentDate] = useState(new Date());

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    data: getToday(),
    horaInicio: '09:00',
    horaFim: '10:00',
    tipo: 'Compromisso',
    repeticao: 'Não repete'
  });

  const agenda = state.agenda || [];

  const handleOpenModal = (evt = null) => {
    if (evt) {
      setEditingId(evt.id);
      setFormData({
        titulo: evt.titulo,
        descricao: evt.descricao,
        data: evt.data,
        horaInicio: evt.horaInicio,
        horaFim: evt.horaFim,
        tipo: evt.tipo,
        repeticao: evt.repeticao
      });
    } else {
      setEditingId(null);
      setFormData({
        titulo: '',
        descricao: '',
        data: getToday(),
        horaInicio: '09:00',
        horaFim: '10:00',
        tipo: 'Compromisso',
        repeticao: 'Não repete'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.titulo || !formData.data) return;

    if (editingId) {
      updateItem('agenda', editingId, formData);
    } else {
      addItem('agenda', formData);
    }
    setIsModalOpen(false);
  };

  const handleDeleteRequest = (id) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteItem('agenda', itemToDelete);
    }
    setIsConfirmOpen(false);
    setItemToDelete(null);
  };

  // Funções do Calendário
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    const todayStr = getToday();

    // Headers
    const headers = weekdays.map(day => (
      <div key={day} className="calendar-header-cell">{day}</div>
    ));

    // Empty cells before start
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-cell other-month"></div>);
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      
      const dayEvents = agenda.filter(e => e.data === dateStr);
      
      days.push(
        <div key={dateStr} className={`calendar-cell ${isToday ? 'today' : ''}`} onClick={() => {
          setFormData({...formData, data: dateStr});
          setIsModalOpen(true);
        }}>
          <div className="calendar-day-number">{d}</div>
          <div className="flex-col" style={{ gap: 2 }}>
            {dayEvents.map(evt => (
              <div 
                key={evt.id} 
                className="calendar-event-dot"
                onClick={(e) => { e.stopPropagation(); handleOpenModal(evt); }}
                title={evt.titulo}
              >
                {evt.horaInicio} {evt.titulo}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="card p-0 mt-md">
        <div className="flex justify-between items-center p-md" style={{ padding: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>
            {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
          </h2>
          <div className="flex gap-sm">
            <button className="btn btn-ghost btn-sm" onClick={goToToday}>Hoje</button>
            <button className="btn btn-ghost btn-sm" onClick={prevMonth}>&lt;</button>
            <button className="btn btn-ghost btn-sm" onClick={nextMonth}>&gt;</button>
          </div>
        </div>
        <div className="calendar-grid" style={{ padding: '0 16px 16px' }}>
          {headers}
          {days}
        </div>
      </div>
    );
  };

  const renderList = () => {
    let list = [...agenda].sort((a,b) => new Date(`${a.data}T${a.horaInicio}`) - new Date(`${b.data}T${b.horaInicio}`));
    
    if (view === 'Hoje') {
      const today = getToday();
      list = list.filter(e => e.data === today);
    } else {
      // Filtering out past events for normal list view
      const today = getToday();
      list = list.filter(e => e.data >= today);
    }

    if (list.length === 0) {
      return (
        <EmptyState 
          icon={<CalendarDays size={48} className="text-muted" />} 
          title="Nenhum evento futuro" 
          description="Sua agenda está livre."
        />
      );
    }

    return (
      <div className="flex-col gap-sm mt-md">
        {list.map(evt => (
          <div key={evt.id} className="card flex justify-between items-center" style={{ padding: '16px' }}>
            <div className="flex gap-md items-center">
              <div className="text-center" style={{ minWidth: '80px', borderRight: '1px solid var(--border)', paddingRight: '16px' }}>
                <div className="text-mono font-bold">{formatDate(evt.data).slice(0,5)}</div>
                <div className="text-muted text-mono" style={{ fontSize: '0.75rem' }}>{evt.horaInicio}</div>
              </div>
              
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '2px' }}>{evt.titulo}</div>
                {(evt.descricao || evt.tipo) && (
                  <div className="flex gap-sm items-center">
                    <span className="badge badge-muted">{evt.tipo}</span>
                    <span className="text-muted" style={{ fontSize: '0.82rem' }}>{evt.descricao}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-sm">
              <button className="btn-icon" onClick={() => handleOpenModal(evt)}><Edit2 size={16} /></button>
              <button className="btn-icon" onClick={() => handleDeleteRequest(evt.id)}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>🗓️ Agenda</h1>
          <p>Seus compromissos e eventos</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Novo Evento
        </button>
      </div>

      <div className="tabs">
        <button className={`tab ${view === 'Mensal' ? 'active' : ''}`} onClick={() => setView('Mensal')}>Visão Mensal</button>
        <button className={`tab ${view === 'Lista' ? 'active' : ''}`} onClick={() => setView('Lista')}>Próximos Eventos</button>
        <button className={`tab ${view === 'Hoje' ? 'active' : ''}`} onClick={() => setView('Hoje')}>Eventos de Hoje</button>
      </div>

      {view === 'Mensal' ? renderCalendar() : renderList()}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Evento' : 'Novo Evento'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Título do Evento</label>
            <input 
              type="text" 
              required 
              value={formData.titulo} 
              onChange={e => setFormData({...formData, titulo: e.target.value})} 
              placeholder="Ex: Reunião com Cliente, Médico..."
            />
          </div>
          
          <div className="form-group">
            <label>Descrição Opcional</label>
            <textarea 
              value={formData.descricao} 
              onChange={e => setFormData({...formData, descricao: e.target.value})} 
              placeholder="Local, links p/ reunião, etc..."
              style={{ minHeight: '60px' }}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data</label>
              <input 
                type="date" 
                required
                value={formData.data} 
                onChange={e => setFormData({...formData, data: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>Hora Início</label>
              <input 
                type="time" 
                required
                value={formData.horaInicio} 
                onChange={e => setFormData({...formData, horaInicio: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>Hora Fim</label>
              <input 
                type="time" 
                required
                value={formData.horaFim} 
                onChange={e => setFormData({...formData, horaFim: e.target.value})} 
              />
            </div>
          </div>

          <div className="form-row mt-sm">
            <div className="form-group">
              <label>Tipo</label>
              <select 
                value={formData.tipo} 
                onChange={e => setFormData({...formData, tipo: e.target.value})}
              >
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Repetição</label>
              <select 
                value={formData.repeticao} 
                onChange={e => setFormData({...formData, repeticao: e.target.value})}
              >
                {REPETICOES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          
          <div className="form-actions mt-lg" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar Evento</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="Excluir Evento"
        message="Tem certeza que deseja cancelar e excluir este evento da sua agenda?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
