import { useState, useEffect } from 'react';
import { tasksApi, authApi } from '../api';
import './Tasks.css';

const STATUS_LABELS = {
  open: 'Открыта',
  in_progress: 'В работе',
  done: 'Завершена',
};

const STATUS_COLORS = {
  open: '#2196f3',
  in_progress: '#ff9800',
  done: '#4caf50',
};

function TaskCard({ task, currentUser, onStatusChange, onDelete }) {
  const isAssignedToMe = task.assigned_to === currentUser?.id;
  const isAdmin = currentUser?.role === 'admin';
  const canChangeStatus = isAssignedToMe || isAdmin;
  
  const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('ru') : null;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  
  const handleStatusClick = async (newStatus) => {
    if (!canChangeStatus) return;
    await onStatusChange(task.id, newStatus);
  };

  return (
    <div className={`task-card ${isOverdue ? 'overdue' : ''}`}>
      <div className="task-header">
        <h3 className="task-title">{task.title}</h3>
        {isAdmin && (
          <button className="task-delete" onClick={() => onDelete(task.id)}>×</button>
        )}
      </div>
      
      {task.description && (
        <p className="task-description">{task.description}</p>
      )}
      
      <div className="task-meta">
        {dueDate && (
          <span className={`task-due ${isOverdue ? 'overdue' : ''}`}>
            📅 {dueDate}
          </span>
        )}
        {task.assigned_to && (
          <span className="task-assigned">
            👤 ID: {task.assigned_to}
          </span>
        )}
      </div>
      
      <div className="task-status-bar">
        {['open', 'in_progress', 'done'].map(status => (
          <button
            key={status}
            className={`status-btn ${task.status === status ? 'active' : ''}`}
            style={{ 
              '--status-color': STATUS_COLORS[status],
              opacity: canChangeStatus ? 1 : 0.6,
              cursor: canChangeStatus ? 'pointer' : 'default'
            }}
            onClick={() => handleStatusClick(status)}
            disabled={!canChangeStatus}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>
    </div>
  );
}

function CreateTaskModal({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setLoading(true);
    await onCreate({
      title: title.trim(),
      description: description.trim(),
      assigned_to: assignedTo ? parseInt(assignedTo) : null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Новая задача</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Название *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Название задачи"
              required
              autoFocus
            />
          </div>
          
          <div className="form-field">
            <label>Описание</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Описание задачи"
              rows={3}
            />
          </div>
          
          <div className="form-row">
            <div className="form-field">
              <label>Назначить (ID)</label>
              <input
                type="number"
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                placeholder="ID пользователя"
              />
            </div>
            
            <div className="form-field">
              <label>Срок</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-create" disabled={loading}>
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.getMe().then(u => setUser(u));
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    const data = await tasksApi.list();
    setTasks(data);
    setLoading(false);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    const response = await tasksApi.update(taskId, { status: newStatus });
    if (response.ok) {
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
    }
  };

  const handleDelete = async (taskId) => {
    if (!confirm('Удалить задачу?')) return;
    const success = await tasksApi.delete(taskId);
    if (success) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  const handleCreate = async (taskData) => {
    const response = await tasksApi.create(taskData);
    if (response.ok) {
      const newTask = await response.json();
      setTasks(prev => [newTask, ...prev]);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'my') return t.assigned_to === user?.id;
    return t.status === filter;
  });

  const isAdmin = user?.role === 'admin';

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <h1>Задачи</h1>
        {isAdmin && (
          <button className="btn-add" onClick={() => setShowModal(true)}>
            + Новая задача
          </button>
        )}
      </div>

      <div className="tasks-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Все
        </button>
        <button 
          className={`filter-btn ${filter === 'my' ? 'active' : ''}`}
          onClick={() => setFilter('my')}
        >
          Мои
        </button>
        <button 
          className={`filter-btn ${filter === 'open' ? 'active' : ''}`}
          onClick={() => setFilter('open')}
        >
          Открытые
        </button>
        <button 
          className={`filter-btn ${filter === 'in_progress' ? 'active' : ''}`}
          onClick={() => setFilter('in_progress')}
        >
          В работе
        </button>
        <button 
          className={`filter-btn ${filter === 'done' ? 'active' : ''}`}
          onClick={() => setFilter('done')}
        >
          Завершенные
        </button>
      </div>

      {loading ? (
        <div className="tasks-loading">Загрузка...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="tasks-empty">Нет задач</div>
      ) : (
        <div className="tasks-grid">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              currentUser={user}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateTaskModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
