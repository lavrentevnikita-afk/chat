import React, { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { authApi, messagesApi } from './api'
import './styles.css'

function MessageBubble({ m, currentUserId }) {
  const isMe = m.sender_id === currentUserId
  const time = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  
  return (
    <div className={`bubble ${isMe ? 'me' : 'them'}`}>
      {!isMe && <div className="avatar">{(m.sender_username || '?')[0].toUpperCase()}</div>}
      <div className="bubble-body">
        {!isMe && <div className="sender">{m.sender_username}</div>}
        <div className="text">{m.content}</div>
        <div className="time">{time}</div>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const inputRef = useRef()
  const endRef = useRef()

  // Load user info
  useEffect(() => {
    authApi.getMe().then(u => {
      if (u) setUser(u)
    })
  }, [])

  // Connect Socket.IO with JWT
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const sio = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    sio.on('connect', () => {
      setConnected(true)
      sio.emit('join_room', { room: 'general' })
    })

    sio.on('disconnect', () => setConnected(false))

    sio.on('new_message', (m) => {
      setMessages(prev => [...prev, m])
    })

    sio.on('user_online', (data) => {
      console.log('User online:', data.username)
    })

    setSocket(sio)

    return () => {
      sio.disconnect()
    }
  }, [])

  // Load messages on mount
  useEffect(() => {
    messagesApi.list('general', 50).then(msgs => {
      setMessages(msgs)
    })
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  function send() {
    const content = (inputRef.current.value || '').trim()
    if (!content || !socket) return

    socket.emit('send_message', { content, room: 'general' })
    inputRef.current.value = ''
  }

  function handleLogout() {
    authApi.logout()
  }

  return (
    <div className="tm-container">
      <header className="tm-header">
        <div className="title">Team Messenger</div>
        <div className="header-right">
          <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
          <span className="username">{user?.username || 'Загрузка...'}</span>
          <button className="logout-btn" onClick={handleLogout}>Выйти</button>
        </div>
      </header>

      <main className="tm-main">
        <section className="chat">
          <div className="messages">
            {messages.map(m => (
              <MessageBubble 
                key={m.id || Math.random()} 
                m={m} 
                currentUserId={user?.id} 
              />
            ))}
            <div ref={endRef} />
          </div>

          <div className="composer">
            <input 
              ref={inputRef} 
              placeholder="Написать сообщение..." 
              onKeyDown={e => { if (e.key === 'Enter') send() }} 
            />
            <button className="send" onClick={send}>→</button>
          </div>
        </section>
      </main>
      <div className="version-badge">v0.0.6</div>
    </div>
  )
}
