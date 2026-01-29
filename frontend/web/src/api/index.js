const API_BASE = '/api/v1';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  
  // Handle 401 - try to refresh token
  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      // Retry original request with new token
      headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
      return fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    }
    // Refresh failed - redirect to login
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  
  return response;
}

async function refreshToken() {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return false;
  
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      return true;
    }
  } catch (e) {
    console.error('Token refresh failed:', e);
  }
  return false;
}

// Auth API
export const authApi = {
  async register(username, password) {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return response;
  },

  async login(username, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      return { success: true, data };
    }
    const error = await response.json().catch(() => ({ detail: 'Login failed' }));
    return { success: false, error: error.detail };
  },

  async getMe() {
    const response = await apiRequest('/auth/me');
    if (response.ok) {
      return await response.json();
    }
    return null;
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  },

  isAuthenticated() {
    return !!localStorage.getItem('access_token');
  },
};

// Tasks API
export const tasksApi = {
  async list(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await apiRequest(`/tasks?${params}`);
    if (response.ok) return await response.json();
    return [];
  },

  async get(id) {
    const response = await apiRequest(`/tasks/${id}`);
    if (response.ok) return await response.json();
    return null;
  },

  async create(task) {
    const response = await apiRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
    return response;
  },

  async update(id, data) {
    const response = await apiRequest(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  },

  async delete(id) {
    const response = await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
    return response.ok;
  },
};

// Messages API
export const messagesApi = {
  async list(room = 'general', limit = 50, beforeId = null) {
    const params = new URLSearchParams({ room, limit });
    if (beforeId) params.append('before_id', beforeId);
    const response = await apiRequest(`/messages?${params}`);
    if (response.ok) return await response.json();
    return [];
  },

  async send(content, room = 'general', replyTo = null) {
    const response = await apiRequest('/messages', {
      method: 'POST',
      body: JSON.stringify({ content, room, reply_to: replyTo }),
    });
    return response;
  },

  async delete(id) {
    const response = await apiRequest(`/messages/${id}`, { method: 'DELETE' });
    return response.ok;
  },
};

// Files API
export const filesApi = {
  async upload(file, messageId = null, taskId = null) {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', file);
    if (messageId) formData.append('message_id', messageId);
    if (taskId) formData.append('task_id', taskId);
    
    const response = await fetch(`/api/v1/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (response.ok) return await response.json();
    const error = await response.json();
    throw new Error(error.detail || 'Upload failed');
  },

  getUrl(fileId) {
    return `/api/v1/files/${fileId}`;
  },

  getThumbnailUrl(fileId) {
    return `/api/v1/files/${fileId}/thumb`;
  },

  async delete(fileId) {
    const response = await apiRequest(`/files/${fileId}`, { method: 'DELETE' });
    return response.ok;
  },

  async getMessageAttachments(messageId) {
    const response = await apiRequest(`/files/message/${messageId}`);
    if (response.ok) return await response.json();
    return [];
  },

  async getTaskAttachments(taskId) {
    const response = await apiRequest(`/files/task/${taskId}`);
    if (response.ok) return await response.json();
    return [];
  },
};
