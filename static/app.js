const socket = io();

function el(id){return document.getElementById(id)}

function renderMessage(m){
  const d = document.createElement('div');
  d.className = 'msg';
  d.textContent = `[${m.created_at}] ${m.sender}: ${m.content}`;
  return d;
}

function renderTask(t){
  const d = document.createElement('div');
  d.className = 'task';
  d.innerHTML = `<strong>${t.title}</strong> <span class="meta">[${t.status}]</span><div>${t.description||''}</div><div class="meta">Назначен: ${t.assigned_to||'-'} | Создал: ${t.creator||'-'}</div>`;
  const btn = document.createElement('button');
  btn.textContent = t.status === 'done' ? 'Открыть' : 'Отметить выполненной';
  btn.onclick = ()=>{
    const newStatus = t.status === 'done' ? 'open' : 'done';
    fetch(`/api/tasks/${t.id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status:newStatus})});
  };
  d.appendChild(btn);
  return d;
}

async function loadMessages(){
  const res = await fetch('/api/messages');
  const data = await res.json();
  const box = el('messages'); box.innerHTML='';
  data.reverse().forEach(m=> box.appendChild(renderMessage(m)));
}

async function loadTasks(){
  const res = await fetch('/api/tasks');
  const data = await res.json();
  const box = el('tasks'); box.innerHTML='';
  data.forEach(t=> box.appendChild(renderTask(t)));
}

document.addEventListener('DOMContentLoaded', ()=>{
  loadMessages();
  loadTasks();

  el('sendBtn').onclick = ()=>{
    const sender = el('username').value || 'Anon';
    const content = el('messageInput').value;
    if(!content) return;
    socket.emit('send_message', {sender, content});
    el('messageInput').value='';
  };

  el('createTaskBtn').onclick = async ()=>{
    const title = el('taskTitle').value;
    const description = el('taskDesc').value;
    const assigned_to = el('taskAssigned').value;
    const creator = el('username').value || 'Anon';
    if(!title) return alert('Введите название');
    await fetch('/api/tasks', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title, description, assigned_to, creator})});
    el('taskTitle').value=''; el('taskDesc').value=''; el('taskAssigned').value='';
  };
});

socket.on('new_message', (m)=>{
  const box = el('messages');
  box.appendChild(renderMessage(m));
});

socket.on('task_created', (t)=>{
  loadTasks();
});

socket.on('task_updated', (t)=>{
  loadTasks();
});
