import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api';
import './Auth.css';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    
    if (password.length < 4) {
      setError('Пароль должен быть минимум 4 символа');
      return;
    }
    
    setLoading(true);
    
    const response = await authApi.register(username, password);
    
    if (response.ok) {
      // Auto-login after registration
      const loginResult = await authApi.login(username, password);
      setLoading(false);
      if (loginResult.success) {
        navigate('/');
      } else {
        navigate('/login');
      }
    } else {
      const data = await response.json().catch(() => ({ detail: 'Ошибка регистрации' }));
      setError(data.detail || 'Ошибка регистрации');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Регистрация</h1>
        
        {error && <div className="auth-error">{error}</div>}
        
        <div className="auth-field">
          <label htmlFor="username">Логин</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Придумайте логин"
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
            placeholder="Придумайте пароль"
            required
          />
        </div>
        
        <div className="auth-field">
          <label htmlFor="confirmPassword">Повторите пароль</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Повторите пароль"
            required
          />
        </div>
        
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
        
        <p className="auth-switch">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  );
}
