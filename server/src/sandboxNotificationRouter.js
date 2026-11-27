import express from 'express'
import {SandboxNotificationError} from './sandboxWebhookVerification.js'
// Standalone router for isolated QA only. Mount before any JSON parser.
// Deliberately NOT mounted in the production app, Vercel handler or auth preview.
export function createSandboxNotificationRouter({mode,host,inbox}={}){
 if(mode!=='isolated_test'||typeof host!=='string'||!/^[a-z0-9.-]+(?::[0-9]{1,5})?$/.test(host)||!inbox?.acceptKhipu||!inbox?.acceptMercadoPago)throw Error('Isolated notification router required')
 const router=express.Router()
 const raw=express.raw({type:'application/json',limit:256*1024,inflate:false})
 router.use((req,res,next)=>{
  res.set('Cache-Control','no-store')
  if(req.get('host')!==host||req.method!=='POST')return res.status(404).json({message:'No disponible'})
  if(!req.is('application/json'))return res.status(415).json({message:'Formato no admitido'})
  next()
 })
 function singleHeader(req,name){
  const h=req.rawHeaders||[],values=[]
  for(let i=0;i<h.length;i+=2)if(h[i].toLowerCase()===name)values.push(h[i+1])
  if(values.length!==1)throw new SandboxNotificationError('Cabecera inválida')
  return values[0]
 }
 function handle(provider){return async(req,res)=>{
  try{
   if(!Buffer.isBuffer(req.body))throw new SandboxNotificationError('Cuerpo inválido')
   const input={rawBody:req.body,signature:singleHeader(req,provider==='khipu'?'x-khipu-signature':'x-signature')}
   if(provider==='mercadopago'){
    input.requestId=singleHeader(req,'x-request-id')
    const ids=new URL(req.originalUrl,'https://qa.invalid').searchParams.getAll('data.id')
    if(ids.length!==1)throw new SandboxNotificationError('Recurso inválido')
    input.resourceId=ids[0]
   }
   const accepted=await (provider==='khipu'?inbox.acceptKhipu(input):inbox.acceptMercadoPago(input))
   if(accepted?.accepted!==true)throw Error('Notification not persisted')
   // Acknowledge only after persistence. No provider GET or reconciliation here.
   return res.status(200).json({accepted:true})
  }catch(e){
   if(e instanceof SandboxNotificationError)return res.status(400).json({message:'Notificación no válida'})
   return res.status(503).json({message:'Recepción temporalmente no disponible'})
  }
 }}
 router.post('/khipu',raw,handle('khipu'))
 router.post('/mercadopago',raw,handle('mercadopago'))
 router.use((_req,res)=>res.status(404).json({message:'No disponible'}))
 router.use((err,_req,res,_next)=>{
  const code=err?.type==='entity.too.large'?413:err?.type==='encoding.unsupported'?415:400
  res.status(code).json({message:'Notificación no válida'})
 })
 return router
}
