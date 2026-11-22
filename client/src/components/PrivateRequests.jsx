import React from 'react'
import { html } from '../lib/html.js'

export function PrivateRequests({ role, requests, onAccept, onReject }) {
  const asClient = role === 'Cliente'
  const providerIds = ({ 'Maestro o contratista': [1, 3, 4, 5], Profesional: [6], Empresa: [2] })[role] || []
  const items = requests.filter(request => asClient
    ? request.clientId === 'demo-client'
    : providerIds.map(String).includes(String(request.recipientId)))
  return html`<div>
    <h2>${asClient ? 'Estado de solicitudes' : 'Solicitudes privadas'}</h2>
    <p className="mut">Una solicitud privada no crea un Match hasta que la persona destinataria la acepte.</p>
    ${items.length === 0
      ? html`<div className="card"><p className="mut">${asClient ? 'No tienes solicitudes privadas enviadas.' : 'No hay solicitudes dirigidas a este perfil.'}</p></div>`
      : items.map(request => html`<article className="card private-request" key=${request.id}>
        <div className="row sp"><div><span className="tag">Solicitud privada</span><h3>${asClient ? request.providerName : request.clientName}</h3></div><span className=${`tag ${request.status === 'accepted' ? 'g' : request.status === 'rejected' ? 'r' : ''}`}>${request.status === 'pending' ? 'Pendiente' : request.status === 'accepted' ? 'Aceptada' : 'Rechazada'}</span></div>
        <p>${request.message}</p><div className="mut">Proyecto: ${request.projectTitle} · ${request.zone}</div>
        ${!asClient && request.status === 'pending' && html`<div className="row request-actions"><button className="btn sm gr" onClick=${() => onAccept(request.id)}>Aceptar y crear Match</button><button className="btn sm out" onClick=${() => onReject(request.id)}>Rechazar</button></div>`}
        ${request.status === 'pending' && asClient && html`<p className="mut request-note">Aún no existe Match ni conversación. El destinatario debe aceptar primero.</p>`}
        ${request.status === 'accepted' && html`<p className="mut request-note">Solicitud aceptada. Ya puedes continuar desde Mis trabajos y Mensajes.</p>`}
      </article>`)}
  </div>`
}
