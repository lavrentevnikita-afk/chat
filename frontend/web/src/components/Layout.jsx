import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { io } from 'socket.io-client';
import Navigation from './Navigation';
import { authApi } from '../api';

export default function Layout() {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

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

    setSocket(sio);

    return () => {
      sio.disconnect();
    };
  }, []);

  return (
    <div className="layout">
      <Navigation user={user} connected={connected} />
      <main className="layout-main">
        <Outlet context={{ user, socket, connected }} />
      </main>
      <div className="version-badge">v0.0.7</div>
    </div>
  );
}
