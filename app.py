from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import sqlite3
from contextlib import closing
import os

DATABASE = os.path.join(os.path.dirname(__file__), 'data.db')

app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev'
socketio = SocketIO(app)

def init_db():
    if not os.path.exists(DATABASE):
        with closing(sqlite3.connect(DATABASE)) as db:
            cur = db.cursor()
            cur.execute('''CREATE TABLE tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                description TEXT,
                assigned_to TEXT,
                creator TEXT,
                status TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )''')
            cur.execute('''CREATE TABLE messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender TEXT,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )''')
            db.commit()

def query_db(query, args=(), one=False):
    con = sqlite3.connect(DATABASE)
    con.row_factory = sqlite3.Row
    cur = con.execute(query, args)
    rv = cur.fetchall()
    con.commit()
    con.close()
    return (rv[0] if rv else None) if one else rv

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    rows = query_db('SELECT * FROM tasks ORDER BY created_at DESC')
    tasks = [dict(row) for row in rows]
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.json
    title = data.get('title')
    desc = data.get('description','')
    assigned = data.get('assigned_to','')
    creator = data.get('creator','')
    con = sqlite3.connect(DATABASE)
    cur = con.cursor()
    cur.execute('INSERT INTO tasks (title, description, assigned_to, creator, status) VALUES (?,?,?,?,?)',
                (title, desc, assigned, creator, 'open'))
    task_id = cur.lastrowid
    con.commit()
    row = con.execute('SELECT * FROM tasks WHERE id=?', (task_id,)).fetchone()
    con.close()
    task = dict(row)
    socketio.emit('task_created', task, broadcast=True)
    return jsonify(task), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    status = data.get('status')
    assigned = data.get('assigned_to')
    con = sqlite3.connect(DATABASE)
    cur = con.cursor()
    if status is not None:
        cur.execute('UPDATE tasks SET status=? WHERE id=?', (status, task_id))
    if assigned is not None:
        cur.execute('UPDATE tasks SET assigned_to=? WHERE id=?', (assigned, task_id))
    con.commit()
    row = con.execute('SELECT * FROM tasks WHERE id=?', (task_id,)).fetchone()
    con.close()
    task = dict(row)
    socketio.emit('task_updated', task, broadcast=True)
    return jsonify(task)

@app.route('/api/messages', methods=['GET'])
def get_messages():
    rows = query_db('SELECT * FROM messages ORDER BY created_at DESC LIMIT 100')
    msgs = [dict(row) for row in rows]
    return jsonify(msgs)

@socketio.on('send_message')
def handle_message(data):
    sender = data.get('sender')
    content = data.get('content')
    con = sqlite3.connect(DATABASE)
    cur = con.cursor()
    cur.execute('INSERT INTO messages (sender, content) VALUES (?,?)', (sender, content))
    con.commit()
    msg_id = cur.lastrowid
    row = con.execute('SELECT * FROM messages WHERE id=?', (msg_id,)).fetchone()
    con.close()
    msg = dict(row)
    emit('new_message', msg, broadcast=True)

if __name__ == '__main__':
    init_db()
    socketio.run(app, host='0.0.0.0', port=5000)
