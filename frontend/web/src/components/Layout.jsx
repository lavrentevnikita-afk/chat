import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import Navigation from './Navigation';
import { ToastContainer, showToast } from './Toast';
import { authApi } from '../api';

export default function Layout() {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const location = useLocation();

  useEffect(() => {
    authApi.getMe().then(u => {
      if (u) setUser(u);
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const sio = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    sio.on('connect', () => setConnected(true));
    sio.on('disconnect', () => setConnected(false));

    // Task notifications
    sio.on('task_created', (data) => {
      showToast(`Новая задача: ${data.title}`, 'task');
    });

    sio.on('task_assigned', (data) => {
      showToast(`Вам назначена задача: ${data.title}`, 'task');
    });

    sio.on('task_updated', (data) => {
      showToast(`Задача обновлена (статус: ${data.status})`, 'info');
    });

    // New message notification (only when not on chat page)
    sio.on('new_message', (m) => {
      if (location.pathname !== '/') {
        showToast(`${m.sender_username}: ${m.content.slice(0, 50)}...`, 'message');
      }
    });

    setSocket(sio);

    return () => {
      sio.disconnect();
    };
  }, [location.pathname]);

  return (
    <div className="layout">
      <Navigation user={user} connected={connected} />
      <main className="layout-main">
        <Outlet context={{ user, socket, connected }} />
      </main>
      <ToastContainer />
      <div className="version-badge">v0.1.3</div>
    </div>
  );
}
