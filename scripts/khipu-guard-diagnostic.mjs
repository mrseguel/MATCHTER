// Read-only real-bank preflight, intercepted POST, no payment creation.
import {createKhipuDemoBankGuard} from '../server/src/khipuDemoBankGuard.js'
if(process.env.VERCEL_ENV!=='preview')throw Error('Preview only')
const key=process.env.KHIPU_API_KEY
if(typeof key!=='string'||key.length<8)throw Error('Missing preview key')
const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000)
let bankInfo,postIntercepted=false
try{
 const fetchImpl=async(url,opts)=>{
  if(opts.method==='GET'&&url==='https://payment-api.khipu.com/v3/banks'){
   const r=await fetch(url,opts)
   if(r.ok&&/^application\/json/i.test(r.headers.get('content-type')||'')){
    const body=await r.clone().json(),banks=body?.banks
    if(Array.isArray(banks)&&banks.length===1){
     const b=banks[0]
     bankInfo={oneBank:true,nameMatchesDemo:typeof b.name==='string'&&b.name.replace(/[^a-z]/gi,'').toLowerCase()==='demobank',idFormatValid:typeof b.bank_id==='string'&&/^[A-Za-z0-9_-]{1,5}$/.test(b.bank_id),minimumType:typeof b.min_amount,minimumAllows2990:Number.isFinite(b.min_amount)&&b.min_amount>=0&&b.min_amount<=2990}
    }else bankInfo={oneBank:false}
   }
   return r
  }
  if(opts.method==='POST'&&url==='https://payment-api.khipu.com/v3/payments'){
   postIntercepted=true
   return new Response('{}',{status:200,headers:{'Content-Type':'application/json'}})
  }
  throw Error('Unexpected network operation')
 }
 const guarded=createKhipuDemoBankGuard({fetchImpl,merchantId:'533557',developerAccountConfirmed:true})
 let guardPassed=false
 try{await guarded('https://payment-api.khipu.com/v3/payments',{method:'POST',headers:{'x-api-key':key},redirect:'error',cache:'no-store',signal:controller.signal,body:JSON.stringify({subject:'MATCHTER - tarifa de prueba',currency:'CLP',amount:2990,transaction_id:'fixture-diagnostic',return_url:'https://qa.invalid',cancel_url:'https://qa.invalid'})});guardPassed=true}catch{}
 console.log('KHIPU_GUARD_DIAGNOSTIC '+JSON.stringify({bankInfo,guardPassed,postIntercepted,externalPost:false}))
 if(!bankInfo)process.exitCode=1
}finally{clearTimeout(timer)}
