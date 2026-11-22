const API = import.meta.env.VITE_API_URL || '/api'
export async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  })
  if (!response.ok) throw new Error((await response.json()).message || 'Error de conexión')
  return response.json()
}
export const getProfessionals = (params = '') => api(`/professionals${params}`)
export const getDashboard = () => api('/dashboard')
export const createInteraction = (body) => api('/interactions', { method: 'POST', body: JSON.stringify(body) })
export const getProjects = () => api('/projects')
export const createProject = (body) => api('/projects', { method: 'POST', body: JSON.stringify(body) })
export const createPrivateRequest = (body) => api('/requests', { method: 'POST', body: JSON.stringify(body) })
export const updatePrivateRequest = (id, status, recipientId) => api(`/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status, recipientId }) })
