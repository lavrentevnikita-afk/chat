# Frontend (React + Vite)

Quick React frontend that connects to the Flask backend via Socket.IO and REST APIs.

Run (from `frontend`):

```bash
npm install
npm run dev
```

Then open the shown dev URL (or visit http://localhost:5173) — the frontend expects the backend at the same origin (http://localhost:5000). For development you can run both: backend on 5000 and the frontend with a proxy or use full URLs in the fetch/socket calls.
