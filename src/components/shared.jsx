import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

/* ========== MODAL ========== */
export function Modal({ isOpen, onClose, title, children, large }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${large ? 'modal-lg' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ========== EMPTY STATE ========== */
export function EmptyState({ icon, title, description }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

/* ========== CONFIRM DIALOG ========== */
export function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title || 'Confirmar'}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-danger" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

/* ========== TOAST ========== */
export function Toast({ message }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, []);
  if (!visible || !message) return null;
  return <div className="toast">{message}</div>;
}

/* ========== TOAST HOOK ========== */
export function useToast() {
  const [toast, setToast] = useState(null);
  const showToast = (msg) => {
    setToast(null);
    setTimeout(() => setToast(msg), 10);
  };
  const ToastComponent = toast ? <Toast message={toast} key={toast + Date.now()} /> : null;
  return { showToast, ToastComponent };
}

/* ========== CHECKBOX ========== */
export function Checkbox({ checked, onChange }) {
  return (
    <div className="checkbox-wrapper" onClick={() => onChange && onChange(!checked)}>
      <div className={`custom-checkbox ${checked ? 'checked' : ''}`}>
        {checked && <Check size={14} />}
      </div>
    </div>
  );
}

/* ========== HELPERS ========== */
export function formatCurrency(value) {
  const num = parseFloat(value) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

export function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr + 'T23:59:59') < new Date();
}

export function getToday() {
  return new Date().toISOString().split('T')[0];
}
