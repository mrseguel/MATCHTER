import React,{useEffect,useRef,useState} from 'react'
import {messagesRequest} from './messagesApi.js'
const maxBytes=512000
async function adminGet(client,path,query){
 const token=await client.getJWTToken()
 if(typeof token!=='string'||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/.test(token))throw Error('Sesión no válida')
 const r=await fetch('/api/auth-preview/admin/mediation/'+path+'?'+new URLSearchParams(query),{headers:{Authorization:'Bearer '+token}})
 const data=await r.json().catch(()=>null)
 if(!r.ok||!data)throw Error(data?.message||'Archivos no disponibles')
 return data
}
export function InspectionAttachments({client,role,orderId,claimId,canUpload=false,mediator=false}){
 const [enabled,setEnabled]=useState(false),[files,setFiles]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[file,setFile]=useState(null)
 const input=useRef(null),pending=useRef(null),running=useRef(false)
 const isClaim=!!claimId,location=isClaim?{claimId}:{orderId},endpoint=isClaim?'mediation/evidence':'inspections/attachments'
 const get=(name,query)=>mediator?adminGet(client,isClaim?(name==='attachments'?'evidence':'evidence-file'):'inspection-'+name,query):messagesRequest(client,isClaim?(name==='attachments'?'mediation/evidence':'mediation/evidence-file'):'inspections/'+name,role,undefined,query)
 async function load(){if(running.current)return;running.current=true;setBusy(true);setError('');try{setFiles((await get('attachments',location)).files)}catch(e){setError(e.message)}finally{running.current=false;setBusy(false)}}
 useEffect(()=>{let alive=true;fetch('/api/auth-preview/config').then(r=>r.ok?r.json():null).then(r=>{if(alive)setEnabled((isClaim?r?.caseCompletionEnabled:r?.inspectionAttachmentsEnabled)===true)}).catch(()=>{});return()=>{alive=false}},[])
 useEffect(()=>{if(enabled)load()},[enabled,client,role,orderId,claimId,mediator])
 async function upload(e){
  e.preventDefault();if(!file||running.current)return
  if(file.size<1||file.size>maxBytes||!['application/pdf','image/jpeg','image/png',...(isClaim?['video/mp4']:[])].includes(file.type)){setError('Selecciona un formato admitido de hasta 500 KiB.');return}
  running.current=true;setBusy(true);setError('')
  try{
   const raw=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<raw.length;i+=8192)binary+=String.fromCharCode(...raw.subarray(i,i+8192))
   if(pending.current?.file!==file)pending.current={file,id:crypto.randomUUID()}
   const result=await messagesRequest(client,endpoint,role,{...location,submissionId:pending.current.id,filename:file.name,mediaType:file.type,base64:btoa(binary)})
   setFiles(result.files);setFile(null);pending.current=null;if(input.current)input.current.value=''
  }catch(e){setError(e.message)}finally{running.current=false;setBusy(false)}
 }
 async function download(fileId){
  if(running.current)return;running.current=true;setBusy(true);setError('')
  try{const f=await get('attachment',{...location,fileId});const bytes=Uint8Array.from(atob(f.base64),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'}));const a=document.createElement('a');a.href=url;a.download=f.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  catch(e){setError(e.message)}finally{running.current=false;setBusy(false)}
 }
 if(!enabled)return null
 return <section className="ct-fee-summary"><h4>{isClaim?'Evidencias de las partes':'Informe y evidencias adjuntas'}</h4><p className="mut">Los archivos se incorporan al expediente compartido, no al chat privado. Adjunta únicamente antecedentes pertinentes y autorizados.</p><button type="button" className="chip" disabled={busy} onClick={load}>Actualizar archivos</button>{files.length===0&&<p className="mut">Sin archivos adjuntos.</p>}{files.map(f=><div className="row sp" key={f.id}><span>{f.filename}</span><button type="button" className="chip" disabled={busy} onClick={()=>download(f.id)}>Descargar</button></div>)}{canUpload&&<form className="ct-form" onSubmit={upload}><label>Adjuntar {isClaim?'PDF, fotografía o MP4':'PDF o fotografía'}<input ref={input} type="file" accept={isClaim?'.pdf,.jpg,.jpeg,.png,.mp4':'.pdf,.jpg,.jpeg,.png'} onChange={e=>setFile(e.target.files?.[0]||null)}/></label><p className="mut">Prueba: máximo 500 KiB por archivo, {isClaim?'20 archivos por expediente':'10 archivos por inspección'}. No se garantiza la ausencia de contenido malicioso.</p><button className="btn out" disabled={busy||!file||files.length>=(isClaim?20:10)}>Adjuntar al expediente</button></form>}{error&&<p role="alert">{error}</p>}</section>
}
