import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.jsx'
import './styles.css'
const root=createRoot(document.getElementById('root'))
if(window.location.hostname==='matchter-beta-auth.vercel.app'){
  const technical=new URLSearchParams(window.location.search).get('technical')==='1'
  const screen=technical?import('./features/auth/AuthIntegration.jsx'):import('./features/auth/AuthLanding.jsx')
  screen.then(({default:Screen})=>root.render(<Screen/>)).catch(()=>{document.getElementById('root').textContent='No se pudo cargar la prueba de autenticación.'})
}else root.render(<React.StrictMode><App /></React.StrictMode>)
