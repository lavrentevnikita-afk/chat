import { useState, useEffect } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import { apiRequest } from '../api';
import './Admin.css';

function StatsCard({ title, value, subtitle }) {
  return (
    <div className="stats-card">
      <div className="stats-value">{value}</div>
      <div className="stats-title">{title}</div>
      {subtitle && <div className="stats-subtitle">{subtitle}</div>}
    </div>
  );
}

function UserRow({ user, onUpdate, onDelete }) {
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);

  const handleRoleChange = async (newRole) => {
    setRole(newRole);
    setSaving(true);
    try {
      await apiRequest(`/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      onUpdate();
    } catch (e) {
      console.error(e);
      setRole(user.role);
    }
    setSaving(false);
  };

  return (
    <tr>
      <td>{user.id}</td>
      <td>{user.username}</td>
      <td>
        <select 
          value={role} 
          onChange={(e) => handleRoleChange(e.target.value)}
          disabled={saving}
          className="role-select"
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
      </td>
      <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</td>
      <td>
        <button 
          className="delete-btn"
          onClick={() => onDelete(user.id)}
        >
          🗑️
        </button>
      </td>
    </tr>
  );
}

export default function AdminPage() {
  const { user } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [broadcast, setBroadcast] = useState('');
  const [sending, setSending] = useState(false);

  // Redirect if not admin
  if (user && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const fetchData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        apiRequest('/admin/stats'),
        apiRequest('/admin/users'),
      ]);
      
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (e) {
      console.error('Admin fetch error:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteUser = async (userId) => {
    if (!confirm('Удалить пользователя?')) return;
    try {
      await apiRequest(`/admin/users/${userId}`, { method: 'DELETE' });
      setUsers(users.filter(u => u.id !== userId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcast.trim()) return;
    setSending(true);
    try {
      await apiRequest('/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({ message: broadcast }),
      });
      setBroadcast('');
      alert('Сообщение отправлено!');
    } catch (e) {
      console.error(e);
    }
    setSending(false);
  };

  if (loading) {
    return <div className="admin-page"><div className="loading">Загрузка...</div></div>;
  }

  return (
    <div className="admin-page">
      <h2>🛠️ Панель администратора</h2>

      {/* Stats Grid */}
      {stats && (
        <div className="stats-grid">
          <StatsCard 
            title="Пользователи" 
            value={stats.users.total}
            subtitle={`+${stats.users.new_this_week} за неделю`}
          />
          <StatsCard 
            title="Задачи" 
            value={stats.tasks.total}
            subtitle={`${stats.tasks.open} открыто / ${stats.tasks.done} завершено`}
          />
          <StatsCard 
            title="Сообщения" 
            value={stats.messages.total}
            subtitle={`${stats.messages.this_week} за неделю`}
          />
          <StatsCard 
            title="Файлы" 
            value={stats.files.total}
            subtitle={`${stats.files.total_size_mb} MB`}
          />
        </div>
      )}

      {/* Broadcast */}
      <section className="admin-section">
        <h3>📢 Broadcast сообщение</h3>
        <div className="broadcast-form">
          <input
            type="text"
            value={broadcast}
            onChange={(e) => setBroadcast(e.target.value)}
            placeholder="Сообщение для всех пользователей..."
          />
          <button onClick={handleBroadcast} disabled={sending}>
            {sending ? '...' : 'Отправить'}
          </button>
        </div>
      </section>

      {/* Users Table */}
      <section className="admin-section">
        <h3>👥 Пользователи ({users.length})</h3>
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Роль</th>
              <th>Создан</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <UserRow 
                key={u.id} 
                user={u} 
                onUpdate={fetchData}
                onDelete={handleDeleteUser}
              />
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
