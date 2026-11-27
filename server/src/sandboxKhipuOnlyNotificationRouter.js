import express from 'express'
// Mount only on the dedicated isolated QA ingress, before any body parser.
// No checkout creation, arbitrary merchant selection, or public status lookup.
export function createKhipuOnlyNotificationRouter({mode,host,handle}={}){
 if(mode!=='isolated_test'||typeof host!=='string'||!/^[a-z0-9.-]+(?::[0-9]{1,5})?$/.test(host)||typeof handle!=='function')throw Error('Isolated Khipu HTTP receiver required')
 const router=express.Router()
 const raw=express.raw({type:'application/json',limit:256*1024,inflate:false})
 router.use((req,res,next)=>{
  res.set('Cache-Control','no-store')
  if(req.get('host')!==host||req.method!=='POST')return res.status(404).json({accepted:false})
  if(!req.is('application/json'))return res.status(415).json({accepted:false})
  next()
 })
 router.post('/khipu',raw,async(req,res)=>{
  const values=[]
  for(let i=0;i<req.rawHeaders.length;i+=2)if(req.rawHeaders[i].toLowerCase()==='x-khipu-signature')values.push(req.rawHeaders[i+1])
  if(values.length!==1||!Buffer.isBuffer(req.body)||!req.body.length)return res.status(400).json({accepted:false})
  try{
   const r=await handle({rawBody:req.body,signature:values[0]})
   if(![200,400,503].includes(r?.status))throw Error('Invalid receiver result')
   return res.status(r.status).json({accepted:r.body?.accepted===true})
  }catch{return res.status(503).json({accepted:false})}
 })
 router.use((_req,res)=>res.status(404).json({accepted:false}))
 router.use((err,_req,res,_next)=>res.status(err?.type==='entity.too.large'?413:err?.type==='encoding.unsupported'?415:400).json({accepted:false}))
 return router
}
