import React, { useState } from 'react'
import { html } from './lib/html.js'
import { PROS, FL0 } from './data.js'
import { CLIENT_ID, DEMO_CLIENT, DEMO_PROJECTS, ROLE_PROFILE_IDS } from './demoData.js'
import { createInteraction, createProject as saveProject, createPrivateRequest as savePrivateRequest, updatePrivateRequest } from './api.js'
import { Admin } from './components/Admin.jsx'
import { Chat } from './components/Chat.jsx'
import { Contract } from './components/Contract.jsx'
import { Explore } from './components/Explore.jsx'
import { Jobs } from './components/Jobs.jsx'
import { Landing } from './components/Landing.jsx'
import { MatchScreen } from './components/MatchScreen.jsx'
import { Messages } from './components/Messages.jsx'
import { ProView } from './components/ProView.jsx'
import { Profile } from './components/Profile.jsx'
import { Projects } from './components/Projects.jsx'
import { PrivateRequests } from './components/PrivateRequests.jsx'
import { Security } from './components/Security.jsx'
import { Wallet } from './components/Wallet.jsx'

const starterJob = {
  id: 'job-welcome', pid: 1, providerId: 1, clientId: CLIENT_ID,
  project: 'Ampliación Habitación', projectRef: 'starter', signed: false, paid: 0,
}

export function App() {
  const [account, setAccount] = useState(null)
  const [role, setRole] = useState('Cliente')
  const [tab, setTab] = useState('explorar')
  const [adminTab, setAdminTab] = useState('res')
  const [pros, setPros] = useState(PROS)
  const [seen, setSeen] = useState([])
  const [saved, setSaved] = useState([])
  const [likes, setLikes] = useState([])
  const [filters, setFilters] = useState(FL0)
  const [projects, setProjects] = useState(DEMO_PROJECTS)
  const [requests, setRequests] = useState([])
  const [jobs, setJobs] = useState([starterJob])
  const [match, setMatch] = useState(null)
  const [view, setView] = useState(null)
  const [message, setMessage] = useState('')
  const [disputes, setDisputes] = useState([
    { id: 1024, title: 'Ampliación Habitación', from: 'Carlos Muñoz', step: 1, files: ['Foto_obra_demo.jpg'], checks: [true, true, false, false] },
  ])
  const [payments, setPayments] = useState([
    { id: 'P-301', p: 'Cocina · Luis Vera', a: 650000, s: 'En custodia · demo' },
  ])
  const [chats, setChats] = useState({ 'job-welcome': [{ me: false, t: 'Hola, vi tu proyecto. ¿Cuándo podemos conversar?' }] })
  const [privacy, setPrivacy] = useState([0, 1, 2, 0])
  const [filtersOpen, setFiltersOpen] = useState(false)

  const toast = text => {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 2600)
  }
  const profileById = id => [...pros, DEMO_CLIENT].find(profile => String(profile.id) === String(id))
  const roleProfile = profileById(ROLE_PROFILE_IDS[role]?.[0])
  const contactForJob = job => {
    if (role === 'Cliente') return profileById(job.providerId) || DEMO_CLIENT
    const profile = profileById(job.clientId)
    if (profile) return profile
    const owner = projects.find(project => String(project.ownerId) === String(job.clientId))
    return owner ? { ...DEMO_CLIENT, id: owner.ownerId, name: owner.ownerName } : DEMO_CLIENT
  }
  const currentRequests = role === 'Cliente'
    ? requests.filter(request => request.clientId === CLIENT_ID)
    : requests.filter(request => ROLE_PROFILE_IDS[role]?.map(String).includes(String(request.recipientId)))

  const makeJob = ({ providerId, clientId, project, projectRef }) => {
    const existing = jobs.find(job => job.projectRef && job.projectRef === projectRef)
    if (existing) return existing
    const job = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      pid: providerId,
      providerId,
      clientId,
      project,
      projectRef,
      signed: false,
      paid: 0,
    }
    setJobs(previous => [job, ...previous])
    setChats(previous => ({ ...previous, [job.id]: [] }))
    return job
  }

  const act = (profile, action) => {
    if (action === 'save') {
      setSaved(previous => previous.includes(profile.id) ? previous : [...previous, profile.id])
      setSeen(previous => previous.includes(profile.id) ? previous : [...previous, profile.id])
      toast('Perfil guardado en favoritos')
      return
    }
    setSeen(previous => previous.includes(profile.id) ? previous : [...previous, profile.id])
    if (action === 'like') {
      setLikes(previous => previous.includes(profile.id) ? previous : [...previous, profile.id])
      const job = makeJob({ providerId: profile.id, clientId: CLIENT_ID, project: `Conexión con ${profile.name}`, projectRef: `profile-${profile.id}` })
      createInteraction({ clientUserId: CLIENT_ID, professionalId: profile.id, type: 'like' }).catch(() => {})
      setMatch({ profile, jobId: job.id })
    }
  }

  const changeRole = nextRole => {
    setRole(nextRole)
    setTab(nextRole === 'Cliente' ? 'explorar' : 'proyectos')
    setView(null)
    setMatch(null)
    toast(`Perfil de demostración activo: ${nextRole}`)
  }

  const createPublicProject = projectData => {
    const project = {
      ...projectData,
      id: `project-${Date.now()}`,
      ownerId: CLIENT_ID,
      ownerName: DEMO_CLIENT.name,
      photo: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=1200&q=85',
    }
    setProjects(previous => [project, ...previous])
    saveProject(project).catch(() => {})
    toast('Proyecto publicado en esta sesión de demostración')
  }

  const expressInterest = project => {
    const providerId = roleProfile?.id
    if (!providerId) return
    if (jobs.some(job => job.projectRef === project.id)) {
      toast('Ya expresaste interés en este proyecto')
      return
    }
    const job = makeJob({ providerId, clientId: project.ownerId, project: project.title, projectRef: project.id })
    createInteraction({ clientUserId: String(project.ownerId), professionalId: providerId, type: 'like' }).catch(() => {})
    const clientProfile = project.ownerId === CLIENT_ID ? DEMO_CLIENT : { ...DEMO_CLIENT, id: project.ownerId, name: project.ownerName, loc: project.zone }
    setMatch({ profile: clientProfile, jobId: job.id })
  }

  const requestPrivately = profile => {
    const projectTitle = projects.find(project => project.ownerId === CLIENT_ID)?.title || 'Proyecto de construcción'
    const request = {
      id: `request-${Date.now()}`,
      clientId: CLIENT_ID,
      clientUserId: CLIENT_ID,
      clientName: DEMO_CLIENT.name,
      recipientId: String(profile.id),
      providerId: profile.id,
      providerName: profile.name,
      projectTitle,
      zone: 'Temuco · Centro',
      message: `Quisiera invitarte a revisar en privado: ${projectTitle}. ¿Tienes disponibilidad para conversar?`,
      status: 'pending',
    }
    setRequests(previous => [request, ...previous])
    savePrivateRequest(request).catch(() => {})
    setTab('proyectos')
    toast('Solicitud privada enviada. Aún no hay Match; debe aceptarla el destinatario.')
  }

  const decideRequest = (requestId, status) => {
    const request = requests.find(item => item.id === requestId)
    if (!request || request.status !== 'pending') return
    if (!ROLE_PROFILE_IDS[role]?.map(String).includes(String(request.recipientId))) return
    setRequests(previous => previous.map(item => item.id === requestId ? { ...item, status } : item))
    updatePrivateRequest(requestId, status, String(request.recipientId)).catch(() => {})
    if (status === 'accepted') {
      const job = makeJob({
        providerId: request.providerId,
        clientId: request.clientId,
        project: request.projectTitle,
        projectRef: request.id,
      })
      setMatch({ profile: profileById(request.clientId) || DEMO_CLIENT, jobId: job.id })
      toast('Solicitud aceptada: Match, trabajo y chat creados')
    } else {
      toast('Solicitud privada rechazada; no se creó un Match')
    }
  }

  const send = (jobId, text) => {
    const body = String(text || '').trim()
    if (!body) return
    setChats(previous => ({ ...previous, [jobId]: [...(previous[jobId] || []), { me: true, t: body }] }))
    window.setTimeout(() => setChats(previous => ({
      ...previous,
      [jobId]: [...(previous[jobId] || []), { me: false, t: 'Gracias por el mensaje. Esta es una respuesta automática de la demo.' }],
    })), 700)
  }

  const pay = (job, stage, card) => {
    setJobs(previous => previous.map(item => item.id === job.id ? { ...item, paid: Math.min(3, item.paid + 1) } : item))
    setPayments(previous => [{ id: `P-${303 + previous.length}`, p: `${job.project} · ${card.b}`, a: stage[2], s: 'En custodia · demo' }, ...previous])
    setView({ t: 'contract', id: job.id })
    toast('Hito marcado como pagado en la sesión de demostración')
  }

  const openDispute = job => {
    const person = contactForJob(job)
    const dispute = {
      id: 1025 + disputes.length,
      title: job.project,
      from: person.name,
      step: 0,
      files: [],
      checks: [false, false, false, false],
    }
    setDisputes(previous => [dispute, ...previous])
    setView(null)
    setTab('seguridad')
    toast('Reclamo creado en esta sesión de demostración')
  }

  if (!account) return html`<${Landing} onEnter=${nextAccount => {
    setAccount(nextAccount)
    setRole(nextAccount.type)
    setTab(nextAccount.type === 'Cliente' ? 'explorar' : 'proyectos')
    toast(`Sesión de demostración: ${nextAccount.type}`)
  }}/>`

  if (role === 'admin') return html`<${Admin}
    pros=${pros} setPros=${setPros} jobs=${jobs} disputes=${disputes} setDisputes=${setDisputes}
    pays=${payments} setPays=${setPayments} requests=${requests} tab=${adminTab} setTab=${setAdminTab}
    exit=${() => setRole(account.type)}
  />`

  const navigation = role === 'Cliente'
    ? [['explorar', '🧭', 'Explorar'], ['proyectos', '📋', 'Proyectos'], ['trabajos', '💼', 'Trabajos'], ['mensajes', '💬', 'Mensajes'], ['perfil', '👤', 'Perfil']]
    : [['proyectos', '📋', 'Proyectos'], ['solicitudes', '✉️', 'Solicitudes'], ['trabajos', '💼', 'Trabajos'], ['mensajes', '💬', 'Mensajes'], ['perfil', '👤', 'Perfil']]
  const job = view && jobs.find(item => item.id === view.id || item.pid === view.id)
  const profile = view?.t === 'pro' ? profileById(view.id) : job ? contactForJob(job) : profileById(view?.id)

  return html`<div className="app">
    <div className="hd"><button className="chip" style=${{width:44}} onClick=${() => { setAccount(null); setView(null); setMatch(null) }} aria-label="Volver al inicio">←</button><span className="logo">MATCHTER<small>${role}</small></span>${tab === 'explorar' && html`<button className="chip" style=${{minWidth:44}} onClick=${() => setFiltersOpen(value => !value)} aria-label="Abrir filtros">🎚️${(filters.cats.length + ['inm', 'ver', 'top', 'emp'].filter(key => filters[key]).length + (filters.dist ? 1 : 0)) || ''}</button>`}</div>
    <div className=${`main ${tab === 'explorar' ? 'fit' : ''}`}>
      ${tab === 'explorar' && role === 'Cliente' && html`<${Explore} pros=${pros} seen=${seen} act=${act} setView=${setView} saved=${saved} filt=${filtersOpen} setFilt=${setFiltersOpen} fl=${filters} setFl=${setFilters}/>`}
      ${tab === 'proyectos' && html`<${Projects} role=${role} projects=${projects} requests=${currentRequests} onCreate=${createPublicProject} onInterest=${expressInterest}/>`}
      ${tab === 'solicitudes' && html`<${PrivateRequests} role=${role} requests=${currentRequests} onAccept=${id => decideRequest(id, 'accepted')} onReject=${id => decideRequest(id, 'rejected')}/>`}
      ${tab === 'trabajos' && html`<${Jobs} jobs=${jobs} pros=${pros} getContact=${contactForJob} setView=${setView}/>`}
      ${tab === 'mensajes' && html`<${Messages} jobs=${jobs} pros=${pros} getContact=${contactForJob} chats=${chats} setView=${setView}/>`}
      ${tab === 'perfil' && html`<${Profile} role=${role} priv=${privacy} setPriv=${setPrivacy} onRoleChange=${changeRole} onSecurity=${() => setTab('seguridad')} onAdmin=${() => setRole('admin')} savedProfiles=${pros.filter(item => saved.includes(item.id))} likedProfiles=${pros.filter(item => likes.includes(item.id))} onOpenProfile=${id => setView({t:'pro',id})} onRemoveFavorite=${id => setSaved(previous => previous.filter(item => item !== id))}/>`}
      ${tab === 'seguridad' && html`<${Security} disputes=${disputes} setDisputes=${setDisputes} toast=${toast}/>`}
    </div>
    <div className="nav">${navigation.map(([key, icon, label]) => html`<button key=${key} className=${tab === key ? 'on' : ''} onClick=${() => setTab(key)}><span>${icon}</span>${label}${key === 'solicitudes' && currentRequests.some(request => request.status === 'pending') && html`<i className="badge">${currentRequests.filter(request => request.status === 'pending').length}</i>`}</button>`)}</div>
    ${view?.t === 'pro' && profile && html`<${ProView} p=${profile} onBack=${() => setView(null)} act=${act} onPrivateRequest=${requestPrivately}/>`}
    ${view?.t === 'contract' && job && html`<${Contract} j=${job} p=${profile} onBack=${() => setView(null)} setJobs=${setJobs} setView=${setView} openDispute=${openDispute}/>`}
    ${view?.t === 'wallet' && job && profile && html`<${Wallet} j=${job} p=${profile} onBack=${() => setView({t:'contract',id:job.id})} pay=${pay}/>`}
    ${view?.t === 'chat' && job && html`<${Chat} p=${profile} msgs=${chats[job.id] || []} send=${text => send(job.id, text)} onBack=${() => setView(null)}/>`}
    ${match && html`<${MatchScreen} p=${match.profile} onContract=${() => { setView({t:'contract',id:match.jobId}); setMatch(null); setTab('trabajos') }} onClose=${() => setMatch(null)}/>`}
    ${message && html`<div className="toast" role="status">${message}</div>`}
  </div>`
}
