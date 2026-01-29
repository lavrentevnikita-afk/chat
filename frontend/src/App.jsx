import React, { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'

// connect explicitly to backend socket.io (dev: backend on 5000)
const socket = io(typeof window !== 'undefined' ? (window.__BACKEND_URL__ || 'http://localhost:5000') : 'http://localhost:5000');

export default function App(){
  const [username, setUsername] = useState('')
  const [messages, setMessages] = useState([])
  const [tasks, setTasks] = useState([])
  const msgRef = useRef()
  const messagesEndRef = useRef()
  const titleRef = useRef()
  const assignedRef = useRef()
  const descRef = useRef()

  useEffect(()=>{
    fetch('/api/messages').then(r=>r.json()).then(d=> setMessages(d.reverse()))
    fetch('/api/tasks').then(r=>r.json()).then(d=> setTasks(d))

    socket.on('new_message', (m)=>{
      setMessages(prev => [...prev, m])
    })
    socket.on('task_created', ()=>{
      fetch('/api/tasks').then(r=>r.json()).then(d=> setTasks(d))
    })
    socket.on('task_updated', ()=>{
      fetch('/api/tasks').then(r=>r.json()).then(d=> setTasks(d))
    })

    return ()=>{ socket.off('new_message'); socket.off('task_created'); socket.off('task_updated') }
  }, [])

  function sendMessage(){
    const content = msgRef.current.value.trim()
    if(!content) return
    socket.emit('send_message', {sender: username || 'Я', content})
    msgRef.current.value=''
  }

  async function createTask(){
    const title = titleRef.current.value.trim()
    if(!title) return alert('Введите название задачи')
    const payload = { title, description: descRef.current.value, assigned_to: assignedRef.current.value, creator: username||'Anon' }
    await fetch('/api/tasks', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)})
    titleRef.current.value=''; assignedRef.current.value=''; descRef.current.value=''
  }

  async function toggleTaskStatus(id, status){
    const newStatus = status === 'done' ? 'open' : 'done'
    await fetch(`/api/tasks/${id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status:newStatus})})
  }

  return (
    <div className="container">
      <header>
        <h1>Team Messenger</h1>
        <input className="name-input" placeholder="Ваше имя" value={username} onChange={e=>setUsername(e.target.value)} />
      </header>

      <main>
        <section className="panel chat">
          <div className="chat-header">Чат</div>
          <div className="messages" id="messagesBox">
            {messages.map(m=>{
              const isMe = (m.sender === (username || 'Я'))
              const time = m.created_at ? new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''
              return (
                <div key={m.id || Math.random()} className={`bubble ${isMe? 'me':'them'}`}>
                  {!isMe && <div className="avatar">{(m.sender||'?')[0]}</div>}
                  <div className="bubble-body">
                    {!isMe && <div className="bubble-sender">{m.sender}</div>}
                    <div className="bubble-text">{m.content}</div>
                    <div className="bubble-time">{time}</div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="composer">
            <input ref={msgRef} placeholder="Написать сообщение..." onKeyDown={(e)=>{ if(e.key==='Enter') sendMessage() }} />
            <button onClick={sendMessage}>→</button>
          </div>
        </section>

        <section className="panel tasks">
          <h2>Задачи</h2>
          <div className="box tasks-list">
            {tasks.map(t=> (
              <div key={t.id} className="task">
                <div className="row"><strong>{t.title}</strong> <span className="meta">[{t.status}]</span></div>
                <div>{t.description}</div>
                <div className="meta">Назначен: {t.assigned_to||'-'} | Создал: {t.creator||'-'}</div>
                <div className="task-actions">
                  <button onClick={()=>toggleTaskStatus(t.id, t.status)}>{t.status==='done' ? 'Открыть' : 'Отметить выполненной'}</button>
                </div>
              </div>
            ))}
          </div>

          <h3>Создать задачу</h3>
          <input ref={titleRef} placeholder="Краткое название" />
          <input ref={assignedRef} placeholder="Назначить (имя)" />
          <textarea ref={descRef} placeholder="Описание" />
          <button onClick={createTask}>Создать</button>
        </section>
      </main>
    </div>
  )
}

// auto-scroll to bottom when messages update
export function scrollToBottom(ref){ if(ref && ref.current) ref.current.scrollIntoView({behavior:'smooth'}) }

