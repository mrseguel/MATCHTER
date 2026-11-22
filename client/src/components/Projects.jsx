import React, { useState } from 'react'
import { html } from '../lib/html.js'

const CLP = value => `$${Number(value || 0).toLocaleString('es-CL')} CLP`

export function Projects({ role, projects, requests, onCreate, onInterest }) {
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const ownRequests = requests.filter(request => request.clientId === 'demo-client')
  const visible = projects.filter(project => project.visibility === 'public'
    && project.ownerId !== 'demo-client'
    && (category === 'Todas' || project.category === category)
    && `${project.title} ${project.category} ${project.zone}`.toLowerCase().includes(query.toLowerCase()))

  const submit = event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onCreate({
      title: data.get('title').trim(),
      description: data.get('description').trim(),
      category: data.get('category'),
      zone: data.get('zone').trim(),
      budget: Number(data.get('budget')),
      area: data.get('area').trim(),
      timeline: data.get('timeline').trim(),
      visibility: 'public',
    })
    event.currentTarget.reset()
    setShowForm(false)
  }

  if (role === 'Cliente') return html`<div>
    <div className="row sp"><div><h2>Mis proyectos</h2><p className="mut">Publica un proyecto para recibir interés de profesionales. Las solicitudes privadas se muestran con su estado.</p></div><button className="btn sm" onClick=${() => setShowForm(value => !value)}>${showForm ? 'Cerrar' : '+ Publicar proyecto'}</button></div>
    ${showForm && html`<form className="card project-form" onSubmit=${submit}>
      <h3>Nuevo proyecto público</h3>
      <label>Título<input name="title" required maxLength="90" placeholder="Ej. Remodelación de baño" /></label>
      <label>Descripción<textarea name="description" required maxLength="600" placeholder="Describe el trabajo y lo que necesitas" /></label>
      <div className="row"><label>Especialidad<select name="category" required><option>Obra gruesa</option><option>Electricidad</option><option>Gasfitería</option><option>Carpintería</option><option>Pintura</option><option>Remodelación</option></select></label><label>Presupuesto CLP<input name="budget" type="number" min="1" required placeholder="450000" /></label></div>
      <div className="row"><label>Comuna / sector<input name="zone" required placeholder="Temuco · Centro" /></label><label>Superficie o tamaño<input name="area" placeholder="Ej. 20 m²" /></label></div>
      <label>Plazo estimado<input name="timeline" placeholder="Ej. Durante el próximo mes" /></label>
      <button className="btn">Publicar en proyectos públicos</button>
      <p className="mut">La publicación queda en esta sesión de demostración.</p>
    </form>`}
    <div className="card"><h3>Solicitudes privadas enviadas</h3>${ownRequests.length === 0
      ? html`<p className="mut">Todavía no has enviado solicitudes privadas.</p>`
      : ownRequests.map(request => html`<div className="request-row" key=${request.id}><div><b>${request.providerName}</b><div className="mut">${request.message}</div></div><span className=${`tag ${request.status === 'accepted' ? 'g' : request.status === 'rejected' ? 'r' : ''}`}>${request.status === 'pending' ? 'Pendiente de aceptación' : request.status === 'accepted' ? 'Aceptada · Match creado' : 'No aceptada'}</span></div>`)
    }</div>
    <h3>Publicaciones de la sesión</h3>
    ${projects.filter(project => project.ownerId === 'demo-client').map(project => html`<div className="card project-card" key=${project.id}><b>${project.title}</b><span className="tag">Público</span><p className="mut">${project.category} · ${project.zone} · ${CLP(project.budget)}</p><p>${project.description}</p></div>`)}
  </div>`

  return html`<div>
    <h2>Proyectos públicos</h2><p className="mut">Explora encargos publicados y expresa interés. Al hacerlo se crea una conexión de demostración.</p>
    <div className="project-filters"><input value=${query} onChange=${event => setQuery(event.target.value)} placeholder="Buscar proyecto o comuna" aria-label="Buscar proyecto" /><select value=${category} onChange=${event => setCategory(event.target.value)} aria-label="Filtrar por especialidad"><option>Todas</option><option>Obra gruesa</option><option>Electricidad</option><option>Gasfitería</option><option>Carpintería</option><option>Pintura</option><option>Remodelación</option></select></div>
    ${visible.length ? visible.map(project => html`<article className="card public-project" key=${project.id}>
      <div className="project-photo" style=${{ backgroundImage: `url(${project.photo || ''})` }} role="img" aria-label=${`Foto referencial: ${project.title}`}></div>
      <div className="project-content"><div className="row sp"><span className="tag">${project.category}</span><b>${CLP(project.budget)}</b></div><h3>${project.title}</h3><p>${project.description}</p><div className="mut">${project.ownerName} · ${project.zone} · ${project.area || 'Superficie por definir'}</div><div className="row sp project-action"><span className="mut">${project.timeline || 'Plazo a coordinar'}</span><button className="btn sm" onClick=${() => onInterest(project)}>Me interesa</button></div></div>
    </article>`)
    : html`<div className="card"><p className="mut">No hay proyectos con estos filtros. Cambia la búsqueda o revisa más tarde.</p></div>`}
  </div>`
}
