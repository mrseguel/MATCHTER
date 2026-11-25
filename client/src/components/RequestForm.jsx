import React, { useState } from 'react'
import { html } from '../lib/html.js'
import { Overlay } from './Overlay.jsx'

const CLP = value => `$${Number(value || 0).toLocaleString('es-CL')} CLP`

export function RequestForm({ draft, onClose, onSubmit }) {
  const isProjectInterest = draft.kind === 'project_interest'
  const key = 'matchter:request-draft:v1:' + JSON.stringify([
    draft.kind, draft.client?.id ?? draft.project?.ownerId, draft.provider.id, draft.project?.id ?? null,
  ])
  return html`<${RequestFields} key=${key} storageKey=${key} draft=${draft} isProjectInterest=${isProjectInterest} onClose=${onClose} onSubmit=${onSubmit}/>`
}

function RequestFields({ storageKey, draft, isProjectInterest, onClose, onSubmit }) {
  const [initial] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey)) || {} } catch { return {} }
  })
  const [sending, setSending] = useState(false)
  const [saved, setSaved] = useState(Object.keys(initial).length > 0)
  const save = event => {
    const values = Object.fromEntries(new FormData(event.currentTarget))
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(values))
      setSaved(true)
    } catch { setSaved(false) }
  }
  const submit = async event => {
    event.preventDefault()
    if (sending) return
    const values = Object.fromEntries(new FormData(event.currentTarget))
    setSending(true)
    try {
      if (await onSubmit(values)) {
        try {
          if (sessionStorage.getItem(storageKey) === JSON.stringify(values)) sessionStorage.removeItem(storageKey)
        } catch { /* Storage may be unavailable in private browsing. */ }
      }
    } finally { setSending(false) }
  }

  return html`<${Overlay} title=${isProjectInterest ? 'Interés en proyecto' : 'Solicitud privada'} onBack=${onClose}>
    <form className="project-form request-form" onSubmit=${submit} onChange=${save}>
      <div>
        <h2>${isProjectInterest ? 'Enviar solicitud al cliente' : 'Nueva solicitud privada'}</h2>
        <p className="mut">${isProjectInterest
          ? `El cliente ${draft.project.ownerName} recibirá tu solicitud y decidirá si acepta.`
          : `Completa los antecedentes para ${draft.provider.name}. No se creará un Match hasta que acepte.`}</p>
      </div>
      ${isProjectInterest && html`<div className="card request-project-summary">
        <span className="tag">Proyecto público</span><h3>${draft.project.title}</h3>
        <p>${draft.project.description}</p><div className="mut">${draft.project.category} · ${draft.project.zone} · ${draft.project.budget ? CLP(draft.project.budget) : 'Presupuesto por definir'}</div>
      </div>`}
      ${!isProjectInterest && html`<div className="request-fields">
        <label>Nombre del proyecto<input name="projectTitle" defaultValue=${initial.projectTitle ?? ''} required maxLength="100" placeholder="Ej. Remodelación de cocina" /></label>
        <label>Descripción del proyecto<textarea name="description" defaultValue=${initial.description ?? ''} required maxLength="1200" placeholder="Describe el trabajo que necesitas realizar" /></label>
        <label>Especificaciones<textarea name="specifications" defaultValue=${initial.specifications ?? ''} required maxLength="1200" placeholder="Medidas, materiales, alcance y requisitos técnicos" /></label>
        <label>Ubicación<input name="location" required maxLength="160" defaultValue=${initial.location ?? draft.client.loc ?? ''} placeholder="Comuna, sector o dirección de referencia" /></label>
        <label>Presupuesto opcional (CLP)<input name="budget" defaultValue=${initial.budget ?? ''} type="number" min="0" step="1" placeholder="Puedes dejarlo vacío" /></label>
        <label>Antecedentes adicionales<textarea name="antecedents" defaultValue=${initial.antecedents ?? ''} maxLength="1200" placeholder="Plazos, disponibilidad para visita u otro antecedente relevante" /></label>
      </div>`}
      ${isProjectInterest && html`<div className="request-fields">
        <label>Mensaje para el cliente<textarea name="message" defaultValue=${initial.message ?? ''} required maxLength="1000" placeholder="Cuéntale por qué te interesa y cómo abordarías el proyecto" /></label>
        <label>Presupuesto propuesto opcional (CLP)<input name="budget" defaultValue=${initial.budget ?? ''} type="number" min="0" step="1" placeholder="Deja vacío para usar el presupuesto publicado" /></label>
        <label>Antecedentes adicionales<textarea name="antecedents" defaultValue=${initial.antecedents ?? ''} maxLength="1000" placeholder="Experiencia, disponibilidad o referencias relevantes" /></label>
      </div>`}
      <button className="btn" disabled=${sending}>${sending ? 'Enviando…' : isProjectInterest ? 'Enviar solicitud de interés' : 'Enviar solicitud privada'}</button>
      ${saved && html`<small className="mut">Borrador guardado en esta pestaña.</small>`}
      <p className="mut">La solicitud quedará pendiente. No se habilitan Match, trabajo ni mensajes antes de la aceptación.</p>
    </form>
  <//>`
}
