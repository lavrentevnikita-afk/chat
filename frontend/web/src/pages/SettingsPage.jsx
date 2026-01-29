import PushSettings from '../components/PushSettings';

export default function SettingsPage() {
  return (
    <div className="settings-page">
      <h2>⚙️ Настройки</h2>
      
      <section className="settings-section">
        <h3>Уведомления</h3>
        <PushSettings />
      </section>
      
      <section className="settings-section">
        <h3>Аккаунт</h3>
        <div className="setting-item">
          <span>Сменить пароль</span>
          <button disabled className="settings-btn">Скоро</button>
        </div>
      </section>
      
      <section className="settings-section">
        <h3>Тема</h3>
        <div className="setting-item">
          <span>Тёмная тема</span>
          <span style={{ color: '#4ade80' }}>✓ Включена</span>
        </div>
      </section>
      
      <style>{`
        .settings-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .settings-page h2 {
          margin-bottom: 24px;
          color: #fff;
        }
        .settings-section {
          margin-bottom: 24px;
        }
        .settings-section h3 {
          color: #888;
          font-size: 14px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: #1e1e2e;
          border-radius: 8px;
          margin-bottom: 8px;
        }
        .settings-btn {
          padding: 8px 16px;
          background: #374151;
          color: #9ca3af;
          border: none;
          border-radius: 6px;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
