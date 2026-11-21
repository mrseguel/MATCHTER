import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { repository } from './repository.js'

const app = express()
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))
app.get('/api/health', (_req,res)=>res.json({status:'ok',app:'MATCHTER API',environment:process.env.NODE_ENV||'development'}))
app.get('/api/dashboard', async (_req,res)=>res.json(await repository.dashboard()))
app.get('/api/professionals', async (req,res)=>res.json(await repository.listProfessionals({category:req.query.category,search:req.query.search})))
app.get('/api/professionals/:id', async (req,res)=>{
 const item=await repository.getProfessional(req.params.id)
 if(!item)return res.status(404).json({message:'Profesional no encontrado'})
 res.json(item)
})
app.post('/api/interactions', async (req,res)=>{
 const {clientUserId,professionalId,type}=req.body||{}
 if(!professionalId||!['like','favorite','pass'].includes(type))return res.status(400).json({message:'professionalId y tipo de interacción válidos son obligatorios'})
 const professional=await repository.getProfessional(professionalId)
 if(!professional)return res.status(404).json({message:'Profesional no encontrado'})
 res.status(201).json(await repository.createInteraction({professionalId,type}))
})
app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({message:'Error interno del servidor'})})
const port=process.env.PORT||4000
app.listen(port,()=>console.log(`MATCHTER API escuchando en http://localhost:${port}`))
