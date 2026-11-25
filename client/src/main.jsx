import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.jsx'
import './styles.css'
const root=createRoot(document.getElementById('root'))
if(window.location.hostname==='matchter-beta-auth.vercel.app'){
  import('./features/auth/AuthIntegration.jsx').then(({default:AuthIntegration})=>root.render(<AuthIntegration/>)).catch(()=>{document.getElementById('root').textContent='No se pudo cargar la prueba de autenticación.'})
}else root.render(<React.StrictMode><App /></React.StrictMode>)
