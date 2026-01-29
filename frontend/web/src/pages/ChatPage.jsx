import { useEffect, useState, useRef, useCallback } from 'react';
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

function TypingIndicator({ typingUsers }) {
  if (typingUsers.length === 0) return null;
  
  const text = typingUsers.length === 1
    ? `${typingUsers[0]} печатает...`
    : `${typingUsers.slice(0, 2).join(', ')} печатают...`;
  
  return (
    <div className="typing-indicator">
      <span className="typing-dots">
        <span></span><span></span><span></span>
      </span>
      {text}
    </div>
  );
}

export default function ChatPage() {
  const { user, socket } = useOutletContext();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const inputRef = useRef();
  const endRef = useRef();
  const typingTimeoutRef = useRef(null);

  // Load messages on mount
  useEffect(() => {
    messagesApi.list('general', 50).then(msgs => {
      setMessages(msgs);
      setLoading(false);
    });
  }, []);

  // Listen for Socket.IO events
  useEffect(() => {
    if (!socket) return;

    socket.emit('join_room', { room: 'general' });

    const handleNewMessage = (m) => {
      setMessages(prev => [...prev, m]);
      // Remove sender from typing list
      setTypingUsers(prev => prev.filter(u => u !== m.sender_username));
    };

    const handleUserTyping = (data) => {
      const username = data.username || `User ${data.user_id}`;
      setTypingUsers(prev => {
        if (!prev.includes(username)) {
          return [...prev, username];
        }
        return prev;
      });
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u !== username));
      }, 3000);
    };

    const handleUserOnline = (data) => {
      setOnlineUsers(prev => {
        if (!prev.find(u => u.id === data.user_id)) {
          return [...prev, { id: data.user_id, username: data.username }];
        }
        return prev;
      });
    };

    const handleUserOffline = (data) => {
      setOnlineUsers(prev => prev.filter(u => u.id !== data.user_id));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, [socket]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingUsers]);

  const emitTyping = useCallback(() => {
    if (!socket) return;
    socket.emit('typing', { room: 'general' });
  }, [socket]);

  function handleInputChange() {
    // Emit typing event (throttled)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(emitTyping, 300);
  }

  function send() {
    const content = (inputRef.current.value || '').trim();
    if (!content || !socket) return;

    socket.emit('send_message', { content, room: 'general' });
    inputRef.current.value = '';
  }

  return (
    <div className="chat-page">
      {onlineUsers.length > 0 && (
        <div className="online-bar">
          <span className="online-label">Онлайн:</span>
          {onlineUsers.map(u => (
            <span key={u.id} className="online-user">
              {u.username}
            </span>
          ))}
        </div>
      )}
      
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
          <TypingIndicator typingUsers={typingUsers} />
          <div ref={endRef} />
        </div>

        <div className="composer">
          <input 
            ref={inputRef} 
            placeholder="Написать сообщение..." 
            onKeyDown={e => { if (e.key === 'Enter') send(); }}
            onChange={handleInputChange}
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
