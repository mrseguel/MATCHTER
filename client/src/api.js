const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
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
