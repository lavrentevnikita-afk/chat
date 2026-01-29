import { useEffect, useState, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { messagesApi } from '../api';
import './Chat.css';

function MessageBubble({ m, currentUserId }) {
  const isMe = m.sender_id === currentUserId;
  const time = m.created_at 
    ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    : '';
  
  return (
    <div className={`bubble ${isMe ? 'me' : 'them'}`}>
      {!isMe && (
        <div className="avatar">
          {(m.sender_username || '?')[0].toUpperCase()}
        </div>
      )}
      <div className="bubble-body">
        {!isMe && <div className="sender">{m.sender_username}</div>}
        <div className="text">{m.content}</div>
        <div className="time">{time}</div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user, socket } = useOutletContext();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef();
  const endRef = useRef();

  // Load messages on mount
  useEffect(() => {
    messagesApi.list('general', 50).then(msgs => {
      setMessages(msgs);
      setLoading(false);
    });
  }, []);

  // Listen for new messages via Socket.IO
  useEffect(() => {
    if (!socket) return;

    socket.emit('join_room', { room: 'general' });

    const handleNewMessage = (m) => {
      setMessages(prev => [...prev, m]);
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  function send() {
    const content = (inputRef.current.value || '').trim();
    if (!content || !socket) return;

    socket.emit('send_message', { content, room: 'general' });
    inputRef.current.value = '';
  }

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="messages">
          {loading ? (
            <div className="chat-loading">Загрузка сообщений...</div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">Нет сообщений. Начните разговор!</div>
          ) : (
            messages.map(m => (
              <MessageBubble 
                key={m.id || Math.random()} 
                m={m} 
                currentUserId={user?.id} 
              />
            ))
          )}
          <div ref={endRef} />
        </div>

        <div className="composer">
          <input 
            ref={inputRef} 
            placeholder="Написать сообщение..." 
            onKeyDown={e => { if (e.key === 'Enter') send(); }} 
          />
          <button className="send" onClick={send}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
