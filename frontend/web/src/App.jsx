import React, { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import './styles.css'

const socket = io('http://localhost:8000')

function MessageBubble({m, me}){
  const time = m.created_at ? new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''
  return (
    <div className={`bubble ${me? 'me':'them'}`}>
      {!me && <div className="avatar">{(m.sender||'?')[0]}</div>}
      <div className="bubble-body">
        {!me && <div className="sender">{m.sender}</div>}
        <div className="text">{m.content}</div>
        <div className="time">{time}</div>
      </div>
    </div>
  )
}

export default function App(){
  const [username, setUsername] = useState('')
  const [messages, setMessages] = useState([])
  const inputRef = useRef()
  const endRef = useRef()

  useEffect(()=>{
    fetch('/api/v1/messages').then(r=> r.ok ? r.json() : []).then(d=> setMessages(d || []))
    socket.on('new_message', m=> setMessages(prev=> [...prev, m]))
    return ()=>{ socket.off('new_message') }
  },[])

  useEffect(()=>{ if(endRef.current) endRef.current.scrollIntoView({behavior:'smooth'}) }, [messages])

  function send(){
    const content = (inputRef.current.value || '').trim()
    if(!content) return
    socket.emit('send_message', { sender: username || 'Вы', content })
    inputRef.current.value = ''
  }

  return (
    <div className="tm-container">
      <header className="tm-header">
        <div className="title">Team Messenger</div>
        <input className="name" placeholder="Ваше имя" value={username} onChange={e=>setUsername(e.target.value)} />
      </header>

      <main className="tm-main">
        <section className="chat">
          <div className="messages">
            {messages.map(m=> <MessageBubble key={m.id || Math.random()} m={m} me={(m.sender === (username || 'Вы'))} />)}
            <div ref={endRef} />
          </div>

          <div className="composer">
            <input ref={inputRef} placeholder="Написать сообщение..." onKeyDown={e=> { if(e.key === 'Enter') send() }} />
            <button className="send" onClick={send}>→</button>
          </div>
        </section>
      </main>
      <div className="version-badge">v0.0.5</div>
    </div>
  )
}
