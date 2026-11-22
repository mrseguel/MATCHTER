import React from 'react'
import { html } from '../lib/html.js'
import { canRespondToRequest, isRequestRecipient } from '../requestFlow.js'

const CLP = value => `$${Number(value || 0).toLocaleString('es-CL')} CLP`

export function PrivateRequests({ role, requests, clientId, profileIds = [], onAccept, onReject }) {
  const isRelevant = request => role === 'Cliente'
    ? String(request.clientId) === String(clientId)
    : profileIds.map(String).some(id => id === String(request.recipientId) || id === String(request.senderId))
  const items = requests.filter(isRelevant)
  const isRecipient = request => isRequestRecipient(request, { role, clientId, profileIds })
  const canRespond = request => canRespondToRequest(request, { role, clientId, profileIds })
  const heading = role === 'Cliente' ? 'Solicitudes del proyecto' : 'Solicitudes e intereses'

  return html`<div>
    <h2>${heading}</h2>
    <p className="mut">Solo el destinatario puede aceptar o rechazar. El Match, trabajo y chat se habilitan después de aceptar.</p>
    ${items.length === 0
      ? html`<div className="card"><p className="mut">No hay solicitudes para este perfil de demostración.</p></div>`
      : items.map(request => {
        const recipient = isRecipient(request)
        const actionable = canRespond(request)
        const received = recipient
        const title = request.requestKind === 'project_interest' ? 'Interés en proyecto público' : 'Invitación a proyecto privado'
        const otherParty = received ? request.senderName : request.recipientName
        return html`<article className="card private-request" key=${request.id}>
          <div className="row sp"><div><span className="tag">${title} · ${received ? 'Recibida' : 'Enviada'}</span><h3>${otherParty || (received ? request.providerName : request.clientName)}</h3></div><span className=${`tag ${request.status === 'accepted' ? 'g' : request.status === 'rejected' ? 'r' : ''}`}>${request.status === 'pending' ? 'Pendiente' : request.status === 'accepted' ? 'Aceptada' : 'Rechazada'}</span></div>
          <div className="request-detail"><b>Proyecto:</b> ${request.projectTitle}</div>
          <div className="request-detail"><b>Descripción:</b> ${request.description}</div>
          ${request.specifications && html`<div className="request-detail"><b>Especificaciones:</b> ${request.specifications}</div>`}
          <div className="request-detail"><b>Ubicación:</b> ${request.location || request.zone}</div>
          <div className="request-detail"><b>${request.requestKind === 'project_interest' ? 'Presupuesto propuesto:' : 'Presupuesto:'}</b> ${request.budget == null ? 'No indicado' : CLP(request.budget)}</div>
          ${request.requestKind === 'project_interest' && request.projectBudget != null && html`<div className="request-detail"><b>Presupuesto publicado:</b> ${CLP(request.projectBudget)}</div>`}
          ${request.message && request.requestKind === 'project_interest' && html`<div className="request-detail"><b>Mensaje:</b> ${request.message}</div>`}
          ${request.antecedents && html`<div className="request-detail"><b>Antecedentes:</b> ${request.antecedents}</div>`}
          ${request.status === 'pending' && actionable && html`<div className="row request-actions"><button className="btn sm gr" onClick=${() => onAccept(request.id)}>Aceptar y crear Match</button><button className="btn sm out" onClick=${() => onReject(request.id)}>Rechazar</button></div>`}
          ${request.status === 'pending' && !actionable && html`<p className="mut request-note">Enviada. Aún no hay Match, trabajo ni conversación; espera la respuesta del destinatario.</p>`}
          ${request.status === 'accepted' && html`<p className="mut request-note">Aceptada. Se creó un Match y ahora está disponible el trabajo y el chat.</p>`}
          ${request.status === 'rejected' && html`<p className="mut request-note">Rechazada. No se creó ningún Match, trabajo ni chat.</p>`}
        </article>`
      })}
  </div>`
}
