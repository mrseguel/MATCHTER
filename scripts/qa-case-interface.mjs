// Render the real React case components in an isolated DOM, backed by the live QA HTTP API.
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {JSDOM,VirtualConsole} from 'jsdom'
const source=`
import React from 'react'
import {createRoot} from 'react-dom/client'
import {StageClaimsPanel} from './client/src/features/auth/StageClaimsPanel.jsx'
import {MediationPanel} from './client/src/features/auth/MediationPanel.jsx'
import {InspectorInbox} from './client/src/features/auth/InspectionPanel.jsx'
import {RealWallet} from './client/src/features/auth/RealWallet.jsx'
const root=createRoot(document.getElementById('root'))
window.mountQA=({view,token,role,claimId,requestId})=>{
 const client={getJWTToken:async()=>token}
 root.render(view==='wallet'?<RealWallet client={client} role={role} onBack={()=>{}} onOpenContract={()=>{}}/>:view==='claims'?<StageClaimsPanel client={client} role={role} thread={{id:requestId,project:'Obra QA',peerName:'Contraparte QA',peerRole:'Perfil de prueba'}} onBack={()=>{}}/>:view==='inspector'?<InspectorInbox client={client} role={role} onBack={()=>{}}/>:<MediationPanel client={client} role={role} claimId={claimId} mediator={view==='mediator'} onBack={()=>{}}/>)
}
window.unmountQA=()=>root.unmount()
`
export async function verifyCaseInterface({actors,winner,claimId,requestId,base,http}){
 const compiled=await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"production"'}})
 const code=compiled.outputFiles[0].text,failures=[]
 const delay=ms=>new Promise(r=>setTimeout(r,ms))
 async function open(who,view,run){
  const vc=new VirtualConsole()
  vc.on('jsdomError',e=>failures.push(e.message))
  vc.on('error',(...args)=>failures.push(args.join(' ')))
  const dom=new JSDOM('<div id="root"></div>',{url:'https://qa.invalid/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc})
  const w=dom.window,root=w.document.querySelector('#root')
  w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder
  w.fetch=async(path,opts={})=>{
   const url=new URL(path,'https://qa.invalid')
   assert.equal(url.origin,'https://qa.invalid')
   assert.ok(url.pathname.startsWith('/api/auth-preview/'))
   const r=await http(base+url.pathname.slice('/api/auth-preview'.length)+url.search,{method:opts.method||'GET',headers:{...opts.headers,host:'qa.invalid',...(opts.method==='POST'?{origin:'https://qa.invalid'}:{})},body:opts.body})
   return {ok:r.status>=200&&r.status<300,status:r.status,json:r.json}
  }
  w.eval(code);w.mountQA({view,token:actors[who].token,role:actors[who].role,claimId,requestId})
  const buttons=()=>Array.from(root.querySelectorAll('button'))
  const wait=async(predicate,label)=>{
   for(let i=0;i<160;i++){if(failures.length)throw Error(failures.join('; '));if(predicate())return;await delay(50)}
   throw Error(who+' UI: '+label+'; '+root.textContent.slice(0,500))
  }
  const has=text=>root.textContent.includes(text)
  const click=async(text)=>{await wait(()=>buttons().some(b=>b.textContent.trim()===text&&!b.disabled),text);buttons().find(b=>b.textContent.trim()===text&&!b.disabled).click()}
  try{await run({w,root,wait,has,click,buttons});assert.deepEqual(failures,[])}
  finally{w.unmountQA();dom.window.close()}
 }
 await open('provider','claims',async({root,wait,has,click})=>{
  await click('Consultar expediente y mediación')
  await wait(()=>has('Profesional elegido para este expediente')&&has('Revisión cerrada con acuerdo registrado'),'shared resolved case')
  assert.ok(has('OCTAVO. Solución de controversias'));assert.ok(has('Firma de prueba del cliente'));assert.ok(has('Firma de prueba del prestador'))
  assert.ok(has('Evaluación ficticia de las partidas pendientes.'))
  await wait(()=>has('informe-qa.pdf'),'shared attachment')
  assert.equal(has('PRIVATE_QA_TEXT'),false);assert.equal(has('Honorarios:'),false)
  await click('Consultar informe')
  await wait(()=>has('Informe técnico · prueba'),'read-only technical report')
  assert.equal(root.querySelector('[aria-label="Conversación privada"]'),null)
  assert.equal(has('Elegir este profesional'),false)
 })
 await open('client','claims',async({wait,has,click,root,w})=>{
  await click('Consultar expediente y mediación')
  await wait(()=>has('Revisión cerrada con acuerdo registrado'),'client resolution')
  assert.equal(has('PRIVATE_QA_TEXT'),false);assert.equal(has('Honorarios:'),false)
  const selectedChat=()=>Array.from(root.querySelectorAll('button')).find(b=>b.textContent.trim()==='Abrir conversación'&&b.parentElement?.textContent.includes('QA '+winner.who)&&b.parentElement?.textContent.includes('Informe técnico registrado'))
  await wait(()=>selectedChat()&&!selectedChat().disabled,'chosen private conversation')
  selectedChat().click()
  await wait(()=>has('Honorarios:')&&has('Informe técnico · prueba'),'private quote and report')
  const input=root.querySelector('[aria-label="Mensaje privado"]')
  assert.ok(input)
  const setter=Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set
  setter.call(input,'QA_UI_PRIVATE_MESSAGE');input.dispatchEvent(new w.Event('input',{bubbles:true}))
  await click('Enviar')
  await wait(()=>has('QA_UI_PRIVATE_MESSAGE'),'persisted private message')
 })
 await open(winner.who,'inspector',async({wait,has,click,buttons})=>{
  await wait(()=>buttons().some(b=>b.textContent.includes('Informe técnico registrado')),'inspector inbox')
  await click(buttons().find(b=>b.textContent.includes('Informe técnico registrado')).textContent.trim())
  await wait(()=>has('QA_UI_PRIVATE_MESSAGE')&&has('Informe técnico · prueba'),'inspector sees private chat and report')
  await wait(()=>has('informe-qa.pdf'),'inspector attachment')
 })
 await open('mediator','mediator',async({wait,has})=>{
  await wait(()=>has('Revisión cerrada con acuerdo registrado')&&has('informe-qa.pdf'),'mediator case')
  assert.equal(has('QA_UI_PRIVATE_MESSAGE'),false);assert.equal(has('PRIVATE_QA_TEXT'),false);assert.equal(has('Honorarios:'),false)
 })
 for(const who of ['client','provider']){
  await open(who,'wallet',async({root,wait,has,click})=>{
   await wait(()=>has('Pago de prueba registrado')&&has('Tarifa de servicio MATCHTER'),'own wallet record')
   assert.equal(root.querySelectorAll('article').length,1)
   assert.ok(has('no hay dinero disponible'))
   await click('Pendientes')
   await wait(()=>has('No hay movimientos en esta sección.'),'pending filter')
   await click('Registrados')
   await wait(()=>root.querySelectorAll('article').length===1,'recorded filter')
  })
 }
 await open('alternative','wallet',async({root,wait,has})=>{
  await wait(()=>has('No hay movimientos en esta sección.'),'unrelated profile empty wallet')
  assert.equal(root.querySelectorAll('article').length,0)
 })
 console.log('AUTHENTICATED WALLET UI QA PASSED: own fee records, filters and unrelated profile isolation')
 console.log('AUTHENTICATED CASE UI QA PASSED: client, provider, selected inspector and mediator; real React DOM and HTTP; private messages not shared')
}
