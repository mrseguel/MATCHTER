import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { repository } from './repository.js'
import { requestQueryFilters } from './requestQuery.js'
import {createAuthRouter} from './authPreviewRoutes.js'

const app = express()
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))
app.use('/api/auth-preview',createAuthRouter())

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'MATCHTER API', environment: process.env.NODE_ENV || 'development' }))
app.get('/api/dashboard', async (_req, res) => res.json(await repository.dashboard()))
app.get('/api/professionals', async (req, res) => res.json(await repository.listProfessionals({ category: req.query.category, search: req.query.search })))
app.get('/api/professionals/:id', async (req, res) => {
  const item = await repository.getProfessional(req.params.id)
  if (!item) return res.status(404).json({ message: 'Profesional no encontrado' })
  return res.json(item)
})
app.post('/api/interactions', async (req, res) => {
  const { clientUserId, professionalId, type } = req.body || {}
  if (!clientUserId || !professionalId || !['like', 'favorite', 'pass'].includes(type)) {
    return res.status(400).json({ message: 'clientUserId, professionalId y tipo de interacción válidos son obligatorios' })
  }
  const professional = await repository.getProfessional(professionalId)
  if (!professional) return res.status(404).json({ message: 'Profesional no encontrado' })
  return res.status(201).json(await repository.createInteraction({ clientUserId, professionalId: professional.id, type }))
})

app.get('/api/projects', async (req, res) => res.json(await repository.listProjects({ category: req.query.category, search: req.query.search })))
app.post('/api/projects', async (req, res) => {
  const { id, title, description, category, zone, budget, ownerId, ownerName, visibility = 'public', area = '', timeline = '' } = req.body || {}
  if (!title?.trim() || !description?.trim() || !category || !zone?.trim() || !Number.isFinite(Number(budget)) || Number(budget) < 1 || !ownerId) {
    return res.status(400).json({ message: 'Título, descripción, especialidad, ubicación, presupuesto y ownerId son obligatorios' })
  }
  if (visibility !== 'public') return res.status(400).json({ message: 'La demo solo publica proyectos en el flujo público' })
  const project = await repository.createProject({ id, title: title.trim(), description: description.trim(), category, zone: zone.trim(), budget: Number(budget), ownerId, ownerName, visibility, area, timeline })
  if (project.conflict) return res.status(409).json({ message: 'El proyecto ya existe' })
  return res.status(201).json(project)
})

app.get('/api/requests', async (req, res) => {
  const filters = requestQueryFilters(req.query)
  if (!filters) return res.status(400).json({ message: 'Indica participantId, clientUserId o recipientId para limitar la consulta' })
  return res.json(await repository.listPrivateRequests(filters))
})
app.post('/api/requests', async (req, res) => {
  const request = await repository.createPrivateRequest(req.body || {})
  if (request.invalid) return res.status(400).json({ message: 'La solicitud está incompleta o contiene un tipo no válido' })
  if (request.forbidden) return res.status(403).json({ message: 'El destinatario o la identidad del solicitante no corresponden' })
  if (request.notFound) return res.status(404).json({ message: request.message })
  if (request.conflict) return res.status(409).json({ message: 'Ya existe una solicitud o Match para este proyecto y estos perfiles' })
  if (request.duplicate) return res.status(200).json(request.request)
  return res.status(201).json(request)
})
app.patch('/api/requests/:id', async (req, res) => {
  const { status, actorId, actorRole } = req.body || {}
  if (!['accepted', 'rejected'].includes(status) || !actorId || !actorRole) {
    return res.status(400).json({ message: 'Estado e identidad del destinatario son obligatorios' })
  }
  const request = await repository.updatePrivateRequest(req.params.id, status, String(actorId), actorRole)
  if (!request) return res.status(404).json({ message: 'Solicitud no encontrada' })
  if (request.forbidden) return res.status(403).json({ message: 'Solo el destinatario puede responder esta solicitud' })
  if (request.conflict) return res.status(409).json({ message: 'La solicitud ya fue respondida' })
  if (request.invalid) return res.status(400).json({ message: 'Estado no válido' })
  return res.json(request)
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ message: 'Error interno del servidor' })
})
export default app
