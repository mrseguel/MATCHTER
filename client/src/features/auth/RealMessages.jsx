import React,{useEffect,useRef,useState} from 'react'
import {Messages,Chat,Overlay} from '../../approved/visual.js'
import {messagesRequest} from './messagesApi.js'
const merge=(a,b)=>[...new Map([...a,...b].map(m=>[m.id,m])).values()].sort((x,y)=>String(x.createdAt).localeCompare(String(y.createdAt))||x.id.localeCompare(y.id))
const display=m=>({...m,t:m.body})
function Thread({client,role,thread,onBack}){
 const [items,setItems]=useState([]),[hasMore,setHasMore]=useState(false),[busy,setBusy]=useState(true),[error,setError]=useState('')
 const loaded=useRef(false),inFlight=useRef(false),alive=useRef(true),retry=useRef(null),oldest=useRef(null),sending=useRef(false)
 useEffect(()=>{alive.current=true;load(false);const timer=setInterval(()=>load(false,true),8000);return()=>{alive.current=false;clearInterval(timer)}},[thread.id,role,client])
 async function load(older=false,quiet=false){
  if(inFlight.current||older&&!oldest.current)return
  inFlight.current=true;if(!quiet)setBusy(true)
  try{
   const data=await messagesRequest(client,'history',role,undefined,{requestId:thread.id,...(older?{before:oldest.current}:{})})
   if(!Array.isArray(data.messages))throw Error('Historial no válido')
   if(!alive.current)return
   const first=data.messages[0]
   if(!loaded.current||older){setHasMore(data.hasMore===true);if(first)oldest.current=first.id}
   setItems(prev=>merge(prev,data.messages));loaded.current=true;setError('')
  }catch(e){if(alive.current)setError(e.message)}
  finally{inFlight.current=false;if(alive.current)setBusy(false)}
 }
 async function send(_id,input){
  if(sending.current)throw Error('Espera a que termine el envío anterior')
  if(!loaded.current)throw Error('Espera a que se cargue la conversación')
  const payload=typeof input==='string'?{body:input.trim()}:{request:input}
  if(payload.body==='')return
  const fingerprint=JSON.stringify(payload)
  const key=retry.current?.fingerprint===fingerprint?retry.current.key:crypto.randomUUID()
  retry.current={fingerprint,key};sending.current=true
  try{const data=await messagesRequest(client,'send',role,{requestId:thread.id,clientMessageId:key,...payload})
   if(!data.message?.id)throw Error('El servidor no confirmó el envío')
   retry.current=null
   if(alive.current){setItems(prev=>merge(prev,[data.message]));setError('')}
  }finally{sending.current=false}
 }
 const p={id:thread.id,name:thread.peerName,e:'👤',c:'#e6e9ef'}
 const job={id:thread.id,project:thread.project,agreementRequired:true,clientId:'client',providerId:'provider'}
 const actor={id:role==='Cliente'?'client':'provider'}
 return <>{error&&<p className="mt-real-chat-error" role="alert">{error}</p>}<Chat p={p} job={job} actor={actor} msgs={items.map(display)} send={send} onBack={onBack} real={true} onRefresh={()=>load(false)} onOlder={()=>load(true)} hasMore={hasMore} loading={busy}/></>
}
export function RealMessages({client,role,initialRequestId,onBack}){
 const [threads,setThreads]=useState([]),[active,setActive]=useState(null),[busy,setBusy]=useState(true),[error,setError]=useState('')
 const first=useRef(initialRequestId),alive=useRef(true)
 async function load(){setBusy(true);setError('');try{const data=await messagesRequest(client,'',role);if(!Array.isArray(data.threads))throw Error('Conversaciones no válidas');if(!alive.current)return;setThreads(data.threads);if(first.current){const t=data.threads.find(x=>x.id===first.current);first.current=null;if(t)setActive(t);else setError('Conversación no disponible')}}catch(e){if(alive.current)setError(e.message)}finally{if(alive.current)setBusy(false)}}
 useEffect(()=>{alive.current=true;load();return()=>{alive.current=false}},[client,role])
 if(active)return <Thread key={active.id} client={client} role={role} thread={active} onBack={()=>{setActive(null);load()}}/>
 const jobs=threads.map(t=>({id:t.id,pid:t.id})),pros=threads.map(t=>({id:t.id,name:t.peerName,e:'👤',c:'#e6e9ef'})),chats=Object.fromEntries(threads.map(t=>[t.id,t.lastMessage?[{t:t.lastMessage}]:[]]))
 return <Overlay title="Mensajes" onBack={onBack}><div className="row sp"><span className="mut">Conversaciones reales</span><button type="button" className="chip" disabled={busy} onClick={load}>Actualizar</button></div>{error&&<p role="alert" style={{color:'#a02222'}}>{error}</p>}{busy?<p className="mut" role="status">Cargando conversaciones…</p>:<Messages jobs={jobs} pros={pros} chats={chats} real={true} setView={v=>setActive(threads.find(t=>t.id===v.id)||null)}/>}</Overlay>
}
