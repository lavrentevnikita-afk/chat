import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api';
import './Auth.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await authApi.login(username, password);
    setLoading(false);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Ошибка входа');
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Вход</h1>
        
        {error && <div className="auth-error">{error}</div>}
        
        <div className="auth-field">
          <label htmlFor="username">Логин</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Введите логин"
            required
            autoFocus
          />
        </div>
        
        <div className="auth-field">
          <label htmlFor="password">Пароль</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            required
          />
        </div>
        
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
        
        <p className="auth-switch">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </form>
    </div>
  );
}
