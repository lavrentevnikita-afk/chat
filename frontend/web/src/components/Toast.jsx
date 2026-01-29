import { useState, useEffect, useCallback } from 'react';
import './Toast.css';

let toastId = 0;

// Global toast state
let globalToasts = [];
let globalSetToasts = null;

export function showToast(message, type = 'info', duration = 4000) {
  const id = ++toastId;
  const toast = { id, message, type, duration };
  
  if (globalSetToasts) {
    globalSetToasts(prev => [...prev, toast]);
  }
  
  return id;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  
  useEffect(() => {
    globalSetToasts = setToasts;
    return () => {
      globalSetToasts = null;
    };
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast 
          key={toast.id} 
          toast={toast} 
          onClose={() => removeToast(toast.id)} 
        />
      ))}
    </div>
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  return (
    <div className={`toast toast-${toast.type}`} onClick={onClose}>
      <div className="toast-icon">
        {toast.type === 'success' && '✓'}
        {toast.type === 'error' && '✕'}
        {toast.type === 'warning' && '⚠'}
        {toast.type === 'info' && 'ℹ'}
        {toast.type === 'task' && '📋'}
        {toast.type === 'message' && '💬'}
      </div>
      <div className="toast-message">{toast.message}</div>
    </div>
  );
}
