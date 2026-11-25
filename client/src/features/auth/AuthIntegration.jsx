import React,{useEffect,useState,useRef} from 'react'
import {createAuthClient} from '@neondatabase/auth'
import './authIntegration.css'
const roles=['Cliente','Maestro o contratista','Profesional','Empresa']
const callbackURL='https://matchter-beta-auth.vercel.app/'
export default function AuthIntegration(){
 const [client,setClient]=useState(null),[session,setSession]=useState(null),[profile,setProfile]=useState(null),[mode,setMode]=useState('login'),[email,setEmail]=useState(''),[name,setName]=useState(''),[password,setPassword]=useState(''),[role,setRole]=useState('Cliente'),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('')
 const started=useRef(false)
 async function accountRequest(auth,path,body){
   const token=await auth.getJWTToken()
   if(typeof token!=='string'||token.split('.').length!==3)throw Error('No se pudo obtener una sesión válida. Inicia sesión nuevamente.')
   const response=await fetch('/api/auth-preview/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
   if(path==='me'&&response.status===404)return null
   const data=await response.json()
   if(!response.ok)throw Error(data.message||'No se pudo consultar la cuenta')
   return data
 }
 async function refresh(auth){
   const result=await auth.getSession()
   if(result.error)throw Error('No se pudo comprobar la sesión')
   const data=result.data||null;setSession(data);setProfile(null)
   if(data?.user?.emailVerified===true)setProfile(await accountRequest(auth,'me'))
 }
 useEffect(()=>{if(started.current)return;started.current=true;(async()=>{try{
   const res=await fetch('/api/auth-preview/config');if(!res.ok)throw Error('Configuración no disponible')
   const {authUrl}=await res.json()
   const auth=createAuthClient(authUrl);setClient(auth);await refresh(auth)
 }catch(e){setError(e.message)}})()},[])
 async function run(fn){if(!client||busy)return;setBusy(true);setError('');setNotice('');try{await fn()}catch(e){setError(e.message||'No se pudo completar la operación')}finally{setBusy(false)}}
 async function submit(e){e.preventDefault();await run(async()=>{
   const result=mode==='register'?await client.signUp.email({email,password,name,callbackURL}):await client.signIn.email({email,password,callbackURL})
   setPassword('')
   if(result.error)throw Error(result.error.message||'No se pudo autenticar')
   if(mode==='register')setNotice('Revisa tu correo y confirma la dirección. Después vuelve a iniciar sesión.')
   await refresh(client)
 })}
 return <main className="mai-page"><section className="mai-card"><header><h1>Matchter</h1><p>Integración de autenticación · Entorno privado</p></header>
 <p className="mai-note">Prueba técnica separada de la demo. Usa un correo de prueba al que tengas acceso y una contraseña única. No ingreses RUT, domicilio ni otros datos personales.</p>
 {error&&<p role="alert" className="mai-error">{error}</p>}{notice&&<p role="status" className="mai-notice">{notice}</p>}
 {!client?<p>Conectando con Neon…</p>:session?.user?<><h2>Sesión iniciada</h2><p>{session.user.email}</p>
 {session.user.emailVerified!==true?<><p>Debes verificar tu correo antes de crear un perfil.</p><button disabled={busy} onClick={()=>run(()=>refresh(client))}>Comprobar verificación</button></>:profile?<><p>Perfil persistente: <b>{profile.role}</b></p><button disabled={busy} onClick={()=>run(()=>refresh(client))}>Comprobar cuenta guardada</button></>:<form onSubmit={e=>{e.preventDefault();run(async()=>{setProfile(await accountRequest(client,'onboard',{role}));setNotice('Perfil guardado en Neon')})}}><label>Tipo de cuenta<select value={role} onChange={e=>setRole(e.target.value)}>{roles.map(r=><option key={r}>{r}</option>)}</select></label><button disabled={busy}>Guardar perfil de prueba</button></form>}
 <button className="mai-secondary" disabled={busy} onClick={()=>run(async()=>{const r=await client.signOut();if(r.error)throw Error('No se pudo cerrar la sesión');setSession(null);setProfile(null);setPassword('')})}>Cerrar sesión</button></>:<><h2>{mode==='register'?'Crear cuenta':'Iniciar sesión'}</h2><form onSubmit={submit}>
 {mode==='register'&&<label>Nombre de prueba<input required value={name} maxLength={80} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>}
 <label>Correo electrónico<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
 <label>Contraseña<input type="password" required minLength={mode==='register'?12:undefined} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='register'?'new-password':'current-password'}/></label>
 <button disabled={busy}>{busy?'Procesando…':mode==='register'?'Crear cuenta de prueba':'Iniciar sesión'}</button></form>
 <button className="mai-secondary" disabled={busy} onClick={()=>{setMode(mode==='register'?'login':'register');setError('');setNotice('');setPassword('')}}>{mode==='register'?'Ya tengo cuenta':'Crear una cuenta'}</button>
 </>}</section></main>
}
