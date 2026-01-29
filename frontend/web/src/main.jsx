import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { authApi } from './api'

function ProtectedRoute({ children }) {
  if (!authApi.isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AuthRoute({ children }) {
  if (authApi.isAuthenticated()) {
    return <Navigate to="/" replace />
  }
  return children
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
      <Route path="/*" element={<ProtectedRoute><App /></ProtectedRoute>} />
    </Routes>
  </BrowserRouter>
)

