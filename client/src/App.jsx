import React, { useRef, useState } from 'react'
import { DEMO_CLIENT, DEMO_CLIENTS, DEMO_PROJECTS, ROLE_PROFILE_IDS } from './demoData.js'
import { createProject as saveProject, createPrivateRequest as savePrivateRequest, updatePrivateRequest } from './api.js'
import { buildProfileRequest, buildProjectInterestRequest, canRespondToRequest, requestDedupeKey, submitRequestWithApi, decideRequestWithApi } from './requestFlow.js'
import { Admin } from './components/Admin.jsx'
import {html, PROS, FL0, CARDS, Landing, Explore, Jobs, Messages, Contract, ContractsTab, NotaryFlow, Wallet, WalletTab, Chat, Profile, Security, MatchScreen, ProView, Overlay, FavoriteProfiles} from './approved/visual.js'
import { Profile as DemoProfile } from './components/Profile.jsx'
import { Projects } from './components/Projects.jsx'
import { PrivateRequests } from './components/PrivateRequests.jsx'
import { RequestForm } from './components/RequestForm.jsx'
import { Community } from './features/community/Community.jsx'
import './features/community/community.css'

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
  const submittingRequestKeys = useRef(new Set())
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
  const [communityInboxSignal,setCommunityInboxSignal]=useState(0)
  const [cards, setCards] = useState(CARDS)
  const addCard = () => { setCards(cs => [...cs, {b:cs.length%2?'Mastercard':'VISA', l:String(1000+cs.length*1111).slice(-4), e:'12/30', c:'#4a5570'}]); toast('Tarjeta de demostración agregada') }

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

  const createPublicProject = async projectData => {
    const project = {
      ...projectData,
      id: `project-${Date.now()}`,
      ownerId: activeClient.id,
      ownerName: activeClient.name,
      photo: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=1200&q=85',
    }
    try {
      const confirmedProject = await saveProject(project)
      if (!confirmedProject?.id) throw new Error('La API no devolvió el proyecto creado')
      setProjects(previous => previous.some(item => String(item.id) === String(confirmedProject.id)) ? previous : [confirmedProject, ...previous])
      toast('Proyecto publicado por la API; disponible en esta sesión')
      return true
    } catch (error) {
      toast(`No se pudo publicar el proyecto: ${error.message}`)
      return false
    }
  }

  const expressInterest = project => {
    const providerId = roleProfile?.id
    if (!providerId) return
    const duplicateKey = requestDedupeKey({ clientId: project.ownerId, providerId, projectId: project.id, projectTitle: project.title })
    if (requests.some(request => request.dedupeKey === duplicateKey) || matches.some(item => item.dedupeKey === duplicateKey)) {
      toast('Ya existe una solicitud para este proyecto y perfil')
      return
    }
    setRequestDraft({ kind: 'project_interest', project, provider: roleProfile, role })
  }

  const submitRequest = async details => {
    if (!requestDraft) return false
    const request = requestDraft.kind === 'project_interest'
      ? buildProjectInterestRequest({ ...requestDraft, details })
      : buildProfileRequest({ ...requestDraft, details })
    const key = request.dedupeKey
    if (submittedRequestKeys.current.has(key) || submittingRequestKeys.current.has(key) || requests.some(item => item.dedupeKey === key) || matches.some(item => item.dedupeKey === key)) {
      setRequestDraft(null)
      toast('Ya existe una solicitud o Match para este proyecto y perfil')
      return false
    }
    request.id = `request-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    request.senderName = requestDraft.kind === 'project_interest' ? requestDraft.provider.name : requestDraft.client.name
    request.recipientName = requestDraft.kind === 'project_interest' ? requestDraft.project.ownerName : requestDraft.provider.name
    submittingRequestKeys.current.add(key)
    try {
      const confirmedRequest = await submitRequestWithApi(request, savePrivateRequest)
      submittedRequestKeys.current.add(key)
      setRequests(previous => previous.some(item => item.dedupeKey === key) ? previous : [confirmedRequest, ...previous])
      if (requestDraft.kind === 'profile') {
        setSeen(previous => previous.includes(requestDraft.provider.id) ? previous : [...previous, requestDraft.provider.id])
        setLikes(previous => previous.includes(requestDraft.provider.id) ? previous : [...previous, requestDraft.provider.id])
      }
      setRequestDraft(null)
      toast('La API confirmó la solicitud pendiente. Aún no hay Match, trabajo ni chat.')
      return true
    } catch (error) {
      toast(`No se pudo enviar la solicitud: ${error.message}`)
      return false
    } finally {
      submittingRequestKeys.current.delete(key)
    }
  }

  const decideRequest = async (requestId, status) => {
    const request = requests.find(item => item.id === requestId)
    const actor = { role, clientId: activeClient.id, profileIds: role === 'Cliente' ? [] : [activeProviderId] }
    if (!request || !canRespondToRequest(request, actor)) {
      toast('Solo el destinatario de esta solicitud puede responder')
      return
    }
    if (handlingRequests.current.has(requestId)) return
    handlingRequests.current.add(requestId)
    try {
      const actorId = String(role === 'Cliente' ? activeClient.id : activeProviderId)
      const confirmed = await decideRequestWithApi({
        request,
        status,
        actor,
        actorId,
        matches,
        jobs,
        updateRequest: updatePrivateRequest,
        now: new Date().toISOString(),
      })
      setRequests(previous => previous.map(item => item.id === requestId ? confirmed.request : item))
      if (status === 'accepted') {
        setMatches(previous => previous.some(item => item.dedupeKey === confirmed.match.dedupeKey) ? previous : [...previous, confirmed.match])
        setJobs(previous => previous.some(item => item.projectRef === confirmed.job.projectRef) ? previous : [confirmed.job, ...previous])
        setChats(previous => previous[confirmed.job.id] ? previous : { ...previous, [confirmed.job.id]: confirmed.conversation })
        const counterpart = role === 'Cliente'
          ? profileById(request.providerId)
          : { ...(clientById(request.clientId) || DEMO_CLIENT), id: request.clientId, name: request.clientName }
        setMatch({ profile: counterpart || DEMO_CLIENT, jobId: confirmed.job.id })
        toast('La API confirmó el Match. El trabajo y el chat son simulaciones de esta sesión.')
      } else {
        toast('La API confirmó el rechazo. No se creó un Match.')
      }
    } catch (error) {
      toast(`No se pudo ${status === 'accepted' ? 'aceptar' : 'rechazar'} la solicitud: ${error.message}`)
    } finally {
      handlingRequests.current.delete(requestId)
    }
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
    if (!job.notarized || job.paid >= 3) { toast('El contrato de demostración debe estar certificado y tener un hito pendiente'); return }
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
    const canonicalRole = ({'Perfil clientes':'Cliente','Perfil maestros':'Maestro o contratista','Profesionales y contratistas':'Profesional','Perfil empresas':'Empresa'})[nextAccount.type] || nextAccount.type
    setAccount({...nextAccount, type:canonicalRole})
    setRole(canonicalRole)
    if (ROLE_PROFILE_IDS[canonicalRole]?.length) setActiveProviderId(ROLE_PROFILE_IDS[canonicalRole][0])
    setTab(canonicalRole === 'Cliente' ? 'explorar' : 'proyectos')
  }}/>`

  if (role === 'admin') return html`<${Admin}
    pros=${pros} setPros=${setPros} jobs=${jobs} disputes=${disputes} setDisputes=${setDisputes}
    pays=${payments} setPays=${setPayments} requests=${requests} tab=${adminTab} setTab=${setAdminTab}
    exit=${() => setRole(account.type)}
  />`

 const SUB={videos:'MATCHTER Community',proyectos:'Proyectos',solicitudes:'Solicitudes',mensajes:'Mensajes',wallet:'Wallet',contratos:'Contratos',trabajos:'Portafolio',perfil:'Mi perfil',seguridad:'Reclamos'};
 const NAV=[['videos',html`<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="4"/><path d="m10 8 6 4-6 4Z"/></svg>`,'Community'],['contratos','📄','Contratos'],['explorar','🧭','Explorar'],['mensajes','💬','Mensajes'],['seguridad','🛡️','Reclamos'],['perfil','👤','Mi perfil']];
  const uiJobs=jobs.filter(item=>role==='Cliente'?String(item.clientId)===String(activeClient.id):String(item.providerId)===String(activeProviderId)).map(item=>({...item,pid:item.id}))
  const uiContacts=uiJobs.map(item=>({...contactForJob(item),id:item.id}))
  const j=view&&uiJobs.find(item=>item.id===view.id)
  const vp=view?.t==='pro'?profileById(view.id):j?contactForJob(j):null
  const goTab=k=>{setView(null);setTab(k==='explorar'&&role!=='Cliente'?'proyectos':k)}
 return html`<div className="app">
  <div className="hd"><button className="chip" style=${{width:44}} onClick=${()=>{setAccount(null);setView(null);setMatch(null);setRequestDraft(null)}}>←</button><span className="logo">MATCHTER${SUB[tab]?html`<small>${SUB[tab]}</small>`:''}</span>${tab==='wallet'?html`<button className="chip" style=${{minWidth:44,borderRadius:'50%'}} onClick=${()=>toast('Pago protegido: tus fondos quedan en custodia hasta dar tu conformidad')}>?</button>`:tab==='explorar'?html`<button className="chip" style=${{minWidth:44}} onClick=${()=>setFiltersOpen(f=>!f)}>🎚️${(filters.cats.length+['inm','ver','top','emp'].filter(k=>filters[k]).length+(filters.dist?1:0))||''}</button>`:html`<span style=${{width:44}}></span>`}</div>
  <div className=${'main'+(tab==='explorar'?' fit':'')+(tab==='videos'?' community-main':'')}>
   <div hidden=${tab!=='videos'} className="community-mount"><${Community} active=${tab==='videos'} actor=${role==='Cliente'?activeClient:roleProfile} role=${role} profiles=${pros} clients=${DEMO_CLIENTS} inboxSignal=${communityInboxSignal} onOpenProfile=${p=>setView({t:'pro',id:p.id})}/></div>
   ${tab==='explorar'&&role==='Cliente'&&html`<${Explore} pros=${pros} seen=${seen} act=${act} setView=${setView} saved=${saved} filt=${filtersOpen} setFilt=${setFiltersOpen} fl=${filters} setFl=${setFilters}/>`}
      ${tab === 'proyectos' && html`<${Projects} role=${role} projects=${projects} requests=${currentRequests} clientId=${activeClient.id} providerId=${roleProfile?.id} onCreate=${createPublicProject} onInterest=${expressInterest}/>`}
      ${tab === 'solicitudes' && html`<${PrivateRequests} role=${role} requests=${currentRequests} clientId=${activeClient.id} profileIds=${role === 'Cliente' ? [] : [activeProviderId]} onAccept=${id => decideRequest(id, 'accepted')} onReject=${id => decideRequest(id, 'rejected')}/>`}
   ${tab==='trabajos'&&html`<${Jobs} jobs=${uiJobs} pros=${uiContacts} setView=${setView}/>`}
   ${tab==='mensajes'&&html`<${React.Fragment}><button className="btn out" style=${{marginBottom:10}} onClick=${()=>{goTab('videos');setCommunityInboxSignal(n=>n+1)}}>💬 Mensajes de Community</button><${Messages} jobs=${uiJobs} pros=${uiContacts} chats=${chats} setView=${setView}/><//>`}
   ${tab==='contratos'&&html`<${ContractsTab} jobs=${uiJobs} pros=${uiContacts} setView=${setView}/>`}
   ${tab==='wallet'&&html`<${WalletTab} jobs=${uiJobs} pros=${uiContacts} pay=${pay} cards=${cards} addCard=${addCard} setView=${setView}/>`}
   ${tab==='perfil'&&html`<${React.Fragment}><button className="btn out" style=${{marginBottom:10}} onClick=${()=>setView({t:'favorites'})}>♥ Perfiles guardados (${saved.length})</button><div className="profile-shortcuts"><button className="card" onClick=${()=>goTab('trabajos')}><span>💼</span><b>Portafolio</b><span aria-hidden="true">›</span></button><button className="card" onClick=${()=>goTab('wallet')}><span>💳</span><b>Wallet</b><span aria-hidden="true">›</span></button></div><${Profile} priv=${privacy} setPriv=${setPrivacy} onAdmin=${()=>setRole('admin')}/><div className="card"><b>Gestión de demostración</b><p className="mut">Los perfiles, cifras y servicios de esta vista previa son ilustrativos.</p><div className="wrap"><button className="chip" onClick=${()=>setTab('proyectos')}>Proyectos</button><button className="chip" onClick=${()=>setTab('solicitudes')}>Solicitudes (${currentRequests.filter(r=>r.status==='pending').length})</button><button className="chip" onClick=${()=>setView({t:'demo-profile'})}>Cambiar perfil de demostración</button></div></div><//>`}
   ${tab==='seguridad'&&html`<${Security} disputes=${disputes} setDisputes=${setDisputes} toast=${toast}/>`}
  </div>
  <div className="nav community-nav">${NAV.map(([k,i,l])=>html`<button key=${k} className=${(tab===k||(k==='explorar'&&role!=='Cliente'&&tab==='proyectos')||(k==='perfil'&&['wallet','trabajos'].includes(tab)))?'on':''} onClick=${()=>goTab(k)}><span>${i}</span>${l}${k==='mensajes'&&uiJobs.some(item=>(chats[item.id]||[]).length)&&html`<i className="badge">${uiJobs.filter(item=>(chats[item.id]||[]).length).length}</i>`}</button>`)}</div>
  ${view&&view.t==='favorites'&&html`<${FavoriteProfiles} profiles=${pros.filter(p=>saved.includes(p.id))} onBack=${()=>setView(null)} onOpen=${p=>setView({t:'pro',id:p.id})} onAct=${act} onRemove=${p=>setSaved(s=>s.filter(id=>id!==p.id))}/>`}
${view?.t === 'demo-profile' && html`<${Overlay} title="Gestión de perfil demo" onBack=${()=>setView(null)}><${DemoProfile} role=${role} clientProfile=${activeClient} clientOptions=${DEMO_CLIENTS} onClientChange=${changeClient} activeProvider=${roleProfile} providerOptions=${pros.filter(item => ROLE_PROFILE_IDS[role]?.includes(item.id))} onProviderChange=${changeProvider} priv=${privacy} setPriv=${setPrivacy} onRoleChange=${changeRole} onSecurity=${() => setTab('seguridad')} onAdmin=${() => setRole('admin')} savedProfiles=${pros.filter(item => saved.includes(item.id))} likedProfiles=${pros.filter(item => likes.includes(item.id))} onOpenProfile=${id => setView({t:'pro',id})} onRemoveFavorite=${id => setSaved(previous => previous.filter(item => item !== id))}/><//>`}
  ${view&&view.t==='pro'&&vp&&html`<${ProView} p=${vp} onBack=${()=>setView(null)} act=${act}/>`}
  ${view&&view.t==='contract'&&j&&vp&&html`<${Contract} j=${j} p=${vp} onBack=${()=>setView(null)} setJobs=${setJobs} setView=${setView} openDispute=${openDispute}/>`}
  ${view&&view.t==='wallet'&&j&&vp&&j.paid<3&&j.notarized&&html`<${Wallet} j=${j} p=${vp} onBack=${()=>setView({t:'contract',id:view.id})} pay=${pay} cards=${cards} addCard=${addCard}/>`}
  ${view&&view.t==='notary'&&j&&vp&&html`<${NotaryFlow} j=${j} p=${vp} onBack=${()=>setView({t:'contract',id:view.id})} onPatch=${patch=>setJobs(js=>js.map(x=>x.id===j.id?{...x,...patch}:x))}/>`}
  ${view&&view.t==='chat'&&j&&vp&&html`<${Chat} p=${vp} msgs=${chats[view.id]} send=${(_id,t)=>send(j.id,t)} onBack=${()=>setView(null)}/>`}
  ${match&&html`<${MatchScreen} p=${match.profile} onContract=${()=>{setView({t:'contract',id:match.jobId});setMatch(null);setTab('contratos')}} onClose=${()=>setMatch(null)}/>`}
    ${requestDraft && html`<${RequestForm} draft=${requestDraft} onClose=${() => setRequestDraft(null)} onSubmit=${submitRequest}/>`}
  ${message&&html`<div className="toast">${message}</div>`}
 </div>`;
}
