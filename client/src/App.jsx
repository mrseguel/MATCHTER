import React, { useRef, useState } from 'react'
import { html } from './lib/html.js'
import { PROS, FL0 } from './data.js'
import { DEMO_CLIENT, DEMO_CLIENTS, DEMO_PROJECTS, ROLE_PROFILE_IDS } from './demoData.js'
import { createProject as saveProject, createPrivateRequest as savePrivateRequest, updatePrivateRequest } from './api.js'
import { buildProfileRequest, buildProjectInterestRequest, canRespondToRequest, requestDedupeKey, resolveRequest } from './requestFlow.js'
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
import { RequestForm } from './components/RequestForm.jsx'
import { Security } from './components/Security.jsx'
import { Wallet } from './components/Wallet.jsx'

export function App() {
  const [account, setAccount] = useState(null)
  const [role, setRole] = useState('Cliente')
  const [activeClientId, setActiveClientId] = useState(DEMO_CLIENT.id)
  const [activeProviderId, setActiveProviderId] = useState(ROLE_PROFILE_IDS['Maestro o contratista'][0])
  const [tab, setTab] = useState('explorar')
  const [adminTab, setAdminTab] = useState('res')
  const [pros, setPros] = useState(PROS)
  const [seen, setSeen] = useState([])
  const [saved, setSaved] = useState([])
  const [likes, setLikes] = useState([])
  const [filters, setFilters] = useState(FL0)
  const [projects, setProjects] = useState(DEMO_PROJECTS)
  const [requests, setRequests] = useState([])
  const [jobs, setJobs] = useState([])
  const [matches, setMatches] = useState([])
  const [match, setMatch] = useState(null)
  const [view, setView] = useState(null)
  const [requestDraft, setRequestDraft] = useState(null)
  const handlingRequests = useRef(new Set())
  const submittedRequestKeys = useRef(new Set())
  const [message, setMessage] = useState('')
  const [disputes, setDisputes] = useState([
    { id: 1024, title: 'Ampliación Habitación', from: 'Carlos Muñoz', step: 1, files: ['Foto_obra_demo.jpg'], checks: [true, true, false, false] },
  ])
  const [payments, setPayments] = useState([
    { id: 'P-301', p: 'Cocina · Luis Vera', a: 650000, s: 'En custodia · demo' },
  ])
  const [chats, setChats] = useState({})
  const [privacy, setPrivacy] = useState([0, 1, 2, 0])
  const [filtersOpen, setFiltersOpen] = useState(false)

  const toast = text => {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 2600)
  }
  const activeClient = DEMO_CLIENTS.find(client => String(client.id) === String(activeClientId)) || DEMO_CLIENT
  const clientById = id => DEMO_CLIENTS.find(client => String(client.id) === String(id))
  const profileById = id => [...pros, ...DEMO_CLIENTS].find(profile => String(profile.id) === String(id))
  const roleProfile = profileById(role === 'Cliente' ? null : activeProviderId)
  const contactForJob = job => {
    if (role === 'Cliente') return profileById(job.providerId) || DEMO_CLIENT
    const profile = profileById(job.clientId)
    if (profile) return profile
    const owner = projects.find(project => String(project.ownerId) === String(job.clientId))
    return owner ? { ...(clientById(owner.ownerId) || DEMO_CLIENT), id: owner.ownerId, name: owner.ownerName } : DEMO_CLIENT
  }
  const currentRequests = role === 'Cliente'
    ? requests.filter(request => String(request.clientId) === String(activeClient.id))
    : requests.filter(request => String(request.recipientId) === String(activeProviderId) || String(request.senderId) === String(activeProviderId))

  const openProfileRequest = profile => setRequestDraft({ kind: 'profile', provider: profile, client: activeClient })

  const act = (profile, action) => {
    if (action === 'save') {
      setSaved(previous => previous.includes(profile.id) ? previous : [...previous, profile.id])
      setSeen(previous => previous.includes(profile.id) ? previous : [...previous, profile.id])
      toast('Perfil guardado en favoritos')
      return
    }
    if (action === 'like') {
      openProfileRequest(profile)
      return
    }
    setSeen(previous => previous.includes(profile.id) ? previous : [...previous, profile.id])
  }

  const changeRole = nextRole => {
    setRole(nextRole)
    if (ROLE_PROFILE_IDS[nextRole]?.length) setActiveProviderId(ROLE_PROFILE_IDS[nextRole][0])
    setTab(nextRole === 'Cliente' ? 'explorar' : 'proyectos')
    setView(null)
    setMatch(null)
    toast(`Perfil de demostración activo: ${nextRole}`)
  }

  const changeProvider = nextProviderId => {
    setActiveProviderId(nextProviderId)
    setTab('solicitudes')
    setView(null)
    setRequestDraft(null)
    setMatch(null)
    toast('Perfil proveedor de demostración actualizado')
  }

  const changeClient = nextClientId => {
    setActiveClientId(nextClientId)
    setTab('solicitudes')
    setView(null)
    setRequestDraft(null)
    setMatch(null)
    toast('Cliente activo de demostración actualizado')
  }

  const createPublicProject = projectData => {
    const project = {
      ...projectData,
      id: `project-${Date.now()}`,
      ownerId: activeClient.id,
      ownerName: activeClient.name,
      photo: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=1200&q=85',
    }
    setProjects(previous => [project, ...previous])
    saveProject(project).catch(() => {})
    toast('Proyecto publicado en esta sesión de demostración')
  }

  const expressInterest = project => {
    const providerId = roleProfile?.id
    if (!providerId) return
    const duplicateKey = requestDedupeKey({ clientId: project.ownerId, providerId, projectTitle: project.title })
    if (requests.some(request => request.dedupeKey === duplicateKey) || matches.some(item => item.dedupeKey === duplicateKey)) {
      toast('Ya existe una solicitud para este proyecto y perfil')
      return
    }
    setRequestDraft({ kind: 'project_interest', project, provider: roleProfile, role })
  }

  const submitRequest = details => {
    if (!requestDraft) return
    const request = requestDraft.kind === 'project_interest'
      ? buildProjectInterestRequest({ ...requestDraft, details })
      : buildProfileRequest({ ...requestDraft, details })
    const key = request.dedupeKey
    if (submittedRequestKeys.current.has(key) || requests.some(item => item.dedupeKey === key) || matches.some(item => item.dedupeKey === key)) {
      setRequestDraft(null)
      toast('Ya existe una solicitud o Match para este proyecto y perfil')
      return
    }
    submittedRequestKeys.current.add(key)
    request.id = `request-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    request.senderName = requestDraft.kind === 'project_interest' ? requestDraft.provider.name : requestDraft.client.name
    request.recipientName = requestDraft.kind === 'project_interest' ? requestDraft.project.ownerName : requestDraft.provider.name
    setRequests(previous => previous.some(item => item.dedupeKey === key) ? previous : [request, ...previous])
    savePrivateRequest(request).catch(() => {})
    if (requestDraft.kind === 'profile') {
      setSeen(previous => previous.includes(requestDraft.provider.id) ? previous : [...previous, requestDraft.provider.id])
      setLikes(previous => previous.includes(requestDraft.provider.id) ? previous : [...previous, requestDraft.provider.id])
    }
    setRequestDraft(null)
    toast('Solicitud enviada y pendiente de aceptación. Aún no hay Match, trabajo ni chat.')
  }

  const decideRequest = (requestId, status) => {
    const request = requests.find(item => item.id === requestId)
    const actor = { role, clientId: activeClient.id, profileIds: role === 'Cliente' ? [] : [activeProviderId] }
    if (!request || !canRespondToRequest(request, actor)) {
      toast('Solo el destinatario de esta solicitud puede responder')
      return
    }
    if (handlingRequests.current.has(requestId)) return
    handlingRequests.current.add(requestId)
    const transition = resolveRequest({ request, status, actor, matches, jobs, chats, now: new Date().toISOString() })
    if (transition.error) {
      handlingRequests.current.delete(requestId)
      if (transition.error === 'conflict') toast('Esta solicitud ya fue respondida')
      return
    }
    setRequests(previous => previous.map(item => item.id === requestId ? transition.request : item))
    updatePrivateRequest(requestId, status, String(role === 'Cliente' ? activeClient.id : activeProviderId), role).catch(() => {})
    if (status === 'accepted') {
      setMatches(previous => previous.some(item => item.dedupeKey === transition.match.dedupeKey) ? previous : [...previous, transition.match])
      setJobs(previous => previous.some(item => item.projectRef === transition.job.projectRef) ? previous : [transition.job, ...previous])
      setChats(previous => previous[transition.job.id] ? previous : { ...previous, [transition.job.id]: transition.conversation })
      const counterpart = role === 'Cliente'
        ? profileById(request.providerId)
        : { ...(clientById(request.clientId) || DEMO_CLIENT), id: request.clientId, name: request.clientName }
      setMatch({ profile: counterpart || DEMO_CLIENT, jobId: transition.job.id })
      toast('Solicitud aceptada: Match, trabajo y chat creados')
    } else {
      toast('Solicitud privada rechazada; no se creó un Match')
    }
    window.setTimeout(() => handlingRequests.current.delete(requestId), 0)
  }

  const send = (jobId, text) => {
    const job = jobs.find(item => item.id === jobId)
    if (!job?.matchId || !matches.some(item => item.id === job.matchId)) {
      toast('El chat se habilita cuando la solicitud haya sido aceptada')
      return
    }
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
    if (ROLE_PROFILE_IDS[nextAccount.type]?.length) setActiveProviderId(ROLE_PROFILE_IDS[nextAccount.type][0])
    setTab(nextAccount.type === 'Cliente' ? 'explorar' : 'proyectos')
    toast(`Sesión de demostración: ${nextAccount.type}`)
  }}/>`

  if (role === 'admin') return html`<${Admin}
    pros=${pros} setPros=${setPros} jobs=${jobs} disputes=${disputes} setDisputes=${setDisputes}
    pays=${payments} setPays=${setPayments} requests=${requests} tab=${adminTab} setTab=${setAdminTab}
    exit=${() => setRole(account.type)}
  />`

  const navigation = role === 'Cliente'
    ? [['explorar', '🧭', 'Explorar'], ['proyectos', '📋', 'Proyectos'], ['solicitudes', '✉️', 'Solicitudes'], ['trabajos', '💼', 'Trabajos'], ['mensajes', '💬', 'Mensajes'], ['perfil', '👤', 'Perfil']]
    : [['proyectos', '📋', 'Proyectos'], ['solicitudes', '✉️', 'Solicitudes'], ['trabajos', '💼', 'Trabajos'], ['mensajes', '💬', 'Mensajes'], ['perfil', '👤', 'Perfil']]
  const job = view && jobs.find(item => item.id === view.id || item.pid === view.id)
  const profile = view?.t === 'pro' ? profileById(view.id) : job ? contactForJob(job) : profileById(view?.id)

  return html`<div className="app">
    <div className="hd"><button className="chip" style=${{width:44}} onClick=${() => { setAccount(null); setView(null); setMatch(null) }} aria-label="Volver al inicio">←</button><span className="logo">MATCHTER<small>${role}</small></span>${tab === 'explorar' && html`<button className="chip" style=${{minWidth:44}} onClick=${() => setFiltersOpen(value => !value)} aria-label="Abrir filtros">🎚️${(filters.cats.length + ['inm', 'ver', 'top', 'emp'].filter(key => filters[key]).length + (filters.dist ? 1 : 0)) || ''}</button>`}</div>
    <div className=${`main ${tab === 'explorar' ? 'fit' : ''}`}>
      ${tab === 'explorar' && role === 'Cliente' && html`<${Explore} pros=${pros} seen=${seen} act=${act} setView=${setView} saved=${saved} filt=${filtersOpen} setFilt=${setFiltersOpen} fl=${filters} setFl=${setFilters}/>`}
      ${tab === 'proyectos' && html`<${Projects} role=${role} projects=${projects} requests=${currentRequests} clientId=${activeClient.id} providerId=${roleProfile?.id} onCreate=${createPublicProject} onInterest=${expressInterest}/>`}
      ${tab === 'solicitudes' && html`<${PrivateRequests} role=${role} requests=${currentRequests} clientId=${activeClient.id} profileIds=${role === 'Cliente' ? [] : [activeProviderId]} onAccept=${id => decideRequest(id, 'accepted')} onReject=${id => decideRequest(id, 'rejected')}/>`}
      ${tab === 'trabajos' && html`<${Jobs} jobs=${jobs} pros=${pros} getContact=${contactForJob} setView=${setView}/>`}
      ${tab === 'mensajes' && html`<${Messages} jobs=${jobs} pros=${pros} getContact=${contactForJob} chats=${chats} setView=${setView}/>`}
      ${tab === 'perfil' && html`<${Profile} role=${role} clientProfile=${activeClient} clientOptions=${DEMO_CLIENTS} onClientChange=${changeClient} activeProvider=${roleProfile} providerOptions=${pros.filter(item => ROLE_PROFILE_IDS[role]?.includes(item.id))} onProviderChange=${changeProvider} priv=${privacy} setPriv=${setPrivacy} onRoleChange=${changeRole} onSecurity=${() => setTab('seguridad')} onAdmin=${() => setRole('admin')} savedProfiles=${pros.filter(item => saved.includes(item.id))} likedProfiles=${pros.filter(item => likes.includes(item.id))} onOpenProfile=${id => setView({t:'pro',id})} onRemoveFavorite=${id => setSaved(previous => previous.filter(item => item !== id))}/>`}
      ${tab === 'seguridad' && html`<${Security} disputes=${disputes} setDisputes=${setDisputes} toast=${toast}/>`}
    </div>
    <div className="nav">${navigation.map(([key, icon, label]) => html`<button key=${key} className=${tab === key ? 'on' : ''} onClick=${() => setTab(key)}><span>${icon}</span>${label}${key === 'solicitudes' && currentRequests.some(request => request.status === 'pending') && html`<i className="badge">${currentRequests.filter(request => request.status === 'pending').length}</i>`}</button>`)}</div>
    ${view?.t === 'pro' && profile && html`<${ProView} p=${profile} onBack=${() => setView(null)} onPrivateRequest=${openProfileRequest}/>`}
    ${requestDraft && html`<${RequestForm} draft=${requestDraft} onClose=${() => setRequestDraft(null)} onSubmit=${submitRequest}/>`}
    ${view?.t === 'contract' && job && html`<${Contract} j=${job} p=${profile} onBack=${() => setView(null)} setJobs=${setJobs} setView=${setView} openDispute=${openDispute}/>`}
    ${view?.t === 'wallet' && job && profile && html`<${Wallet} j=${job} p=${profile} onBack=${() => setView({t:'contract',id:job.id})} pay=${pay}/>`}
    ${view?.t === 'chat' && job && html`<${Chat} p=${profile} msgs=${chats[job.id] || []} send=${text => send(job.id, text)} onBack=${() => setView(null)}/>`}
    ${match && html`<${MatchScreen} p=${match.profile} onContract=${() => { setView({t:'contract',id:match.jobId}); setMatch(null); setTab('trabajos') }} onClose=${() => setMatch(null)}/>`}
    ${message && html`<div className="toast" role="status">${message}</div>`}
  </div>`
}
