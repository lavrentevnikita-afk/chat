import { NavLink } from 'react-router-dom';
import { authApi } from '../api';
import './Navigation.css';

export default function Navigation({ user, connected }) {
  return (
    <header className="nav-header">
      <div className="nav-left">
        <span className="nav-logo">Team Messenger</span>
        <nav className="nav-links">
          <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} end>
            💬 Чат
          </NavLink>
          <NavLink to="/tasks" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            📋 Задачи
          </NavLink>
        </nav>
      </div>
      
      <div className="nav-right">
        <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
        <span className="nav-username">{user?.username || 'Загрузка...'}</span>
        {user?.role === 'admin' && <span className="admin-badge">Admin</span>}
        <button className="nav-logout" onClick={() => authApi.logout()}>
          Выйти
        </button>
      </div>
    </header>
  );
}
