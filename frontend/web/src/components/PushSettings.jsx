import { useState, useEffect } from 'react';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  sendSubscriptionToServer,
} from '../utils/push';

export default function PushSettings() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      const isSupported = await isPushSupported();
      setSupported(isSupported);
      
      if (isSupported) {
        const perm = await getNotificationPermission();
        setPermission(perm);
        
        // Check if already subscribed
        if (perm === 'granted') {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          setSubscribed(!!sub);
        }
      }
    }
    init();
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      // Request permission first
      const perm = await requestNotificationPermission();
      setPermission(perm);
      
      if (perm === 'granted') {
        // Subscribe to push
        const subscription = await subscribeToPush();
        if (subscription) {
          // Send to server
          const ok = await sendSubscriptionToServer(subscription);
          setSubscribed(ok);
        }
      }
    } catch (e) {
      console.error('Failed to enable push:', e);
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await unsubscribeFromPush();
      
      // Remove from server
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch('/api/v1/push/subscribe', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
      
      setSubscribed(false);
    } catch (e) {
      console.error('Failed to disable push:', e);
    }
    setLoading(false);
  };

  if (!supported) {
    return (
      <div className="push-settings">
        <p style={{ color: '#888' }}>
          Push-уведомления не поддерживаются этим браузером
        </p>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="push-settings">
        <p style={{ color: '#ff6b6b' }}>
          ❌ Уведомления заблокированы. Разрешите их в настройках браузера.
        </p>
      </div>
    );
  }

  return (
    <div className="push-settings">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>🔔 Push-уведомления</span>
        
        {subscribed ? (
          <button 
            onClick={handleDisable} 
            disabled={loading}
            className="push-btn push-btn-disable"
          >
            {loading ? '...' : 'Отключить'}
          </button>
        ) : (
          <button 
            onClick={handleEnable} 
            disabled={loading}
            className="push-btn push-btn-enable"
          >
            {loading ? '...' : 'Включить'}
          </button>
        )}
        
        {subscribed && <span style={{ color: '#4ade80' }}>✓ Активно</span>}
      </div>
      
      <style>{`
        .push-settings {
          padding: 16px;
          background: #1e1e2e;
          border-radius: 8px;
          margin: 8px 0;
        }
        .push-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        .push-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .push-btn-enable {
          background: #3b82f6;
          color: white;
        }
        .push-btn-enable:hover:not(:disabled) {
          background: #2563eb;
        }
        .push-btn-disable {
          background: #374151;
          color: #9ca3af;
        }
        .push-btn-disable:hover:not(:disabled) {
          background: #4b5563;
        }
      `}</style>
    </div>
  );
}
