import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

// Apply presentation-only labels after the existing demo build patches.
function sectionNames(){
  return {name:'matchter-section-names',enforce:'pre',transform(code,id){
    const file=id.split('?')[0].replaceAll('\\','/')
    if(!/\/client\/src\/(?:App\.jsx|features\/(?:settings\/Appearance\.jsx|community\/(?:Community|MatchplaySearch|MatchplayPublicProfile)\.jsx|employment\/(?:ClientEmployment|EmploymentHub|RoleProfileHome)\.jsx))$/.test(file))return null
    let s=code
    // Only presentation strings: do not rename routes, storage, functions or CSS selectors.
    if(file.endsWith('/Community.jsx')){
      const brand = '<div className="cm-brand logo" aria-label="Match Play">MATCHPLAY</div>'
      const icon = '<span className="play-title" role="img" aria-label="PLAY"><svg className="play-title-symbol" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.1 1.6Q2 1 2 2.3v11.4q0 1.3 1.1.7l10.2-5.7q1.1-.7 0-1.4Z"/></svg><svg className="play-title-letters" viewBox="0 0 67 20" aria-hidden="true"><path fillRule="evenodd" d="M1.97 19H6.99V13.56H9.61C13.91 13.56 16.61 11.14 16.61 7.28C16.61 3.43 13.91 1 9.61 1H1.97ZM6.99 9.43V5.13H9.24C10.75 5.13 11.7 5.97 11.7 7.28C11.7 8.6 10.75 9.43 9.24 9.43ZM17.4 19H30.18V14.75H22.42V1H17.4ZM30.06 19H35.56L36.44 16.04H42.46L43.31 19H48.97L42.87 1H36.1ZM37.6 12.17 37.65 12.02C38.3 9.84 38.9 7.74 39.5 5.55C40.08 7.74 40.67 9.84 41.3 12.02L41.34 12.17ZM55.07 19H59.93V12.86L66.44 1H60.73L58.3 6.05C58.03 6.62 57.77 7.19 57.52 7.77C57.26 7.19 56.99 6.62 56.7 6.05L54.12 1H48.37L55.07 12.86Z"/></svg></span>'
      if (!s.includes(brand)) throw Error('Missing PLAY header')
      s = "import './play-title.css'\n" + s.replace(brand, '<div className="cm-brand logo">' + icon + '</div>')
    }
    s=s.replace(/\b(?:MATCHTER Empleos|MATCHTER EMPLEOS)\b/g,'WORKS')
       .replace(/\b(?:MATCHPLAY|Match Play|MatchPlay|MPLAY)\b/g,'PLAY')
       .replace(/(['"])Empleos\1/g,(_,q)=>q+'WORKS'+q)
       .replace(/>\s*Empleos\s*</g,'>WORKS<')
    if(s===code)return null
    console.log('[section names] '+file.split('/client/src/').pop()+' | WORKS='+((s.match(/\bWORKS\b/g)||[]).length)+' PLAY='+((s.match(/\bPLAY\b/g)||[]).length))
    return {code:s,map:null}
  }}
}

// Use the same mixed-case wordmark in the authenticated UI and startup.
function matchterWordmark(){
  let root
  const oldMark='class="mw-wordmark">MATCHTER</div>'
  const newMark='class="mw-wordmark">Matchter</div>'
  return {name:'matchter-wordmark',enforce:'pre',
    configResolved(config){root=config.root},
    transformIndexHtml(html){return html.replace('<title>MATCHTER</title>','<title>Matchter</title>').replace(/(<div id="matchter-startup"[^>]*><span>)MATCHTER(<\/span>)/g,'$1Matchter$2')},
    transform(code,id){
      const file=id.split('?')[0].replaceAll('\\','/')
      if(!/\/client\/src\/.*\.(jsx|js|tsx|ts)$/.test(file)||/\.test\./.test(file))return null
      // Match standalone rendered brand text, including brand-plus-subtitle markup.
      let s=code.replace(/>(\s*)MATCHTER(?=\s*(?:<|\$\{))/g,(_,ws)=>'>'+ws+'Matchter')
      // Static app wordmark values are presented by the shared header.
      if(/\/(?:App\.jsx|approved\/visual\.js|features\/auth\/AuthPreview\.jsx)$/.test(file)){
        s=s.replace(/(['"])MATCHTER\1/g,(_,q)=>q+'Matchter'+q)
        s=s.replace(/(\b(?:title|aria-label|alt)\s*=\s*["'])MATCHTER(?=["'])/g,'$1Matchter')
      }
      if(s===code)return null
      console.log('[wordmark] '+file.split('/client/src/').pop())
      return {code:s,map:null}
    },
    writeBundle(options){
      const folder=resolve(root,options.dir||'dist')
      const path=resolve(folder,'matchter-welcome.js')
      const original=readFileSync(path,'utf8')
      if(original.split(oldMark).length!==2)throw Error('Welcome wordmark anchor changed')
      const updated=original.replace(oldMark,newMark)
      writeFileSync(path,updated,'utf8')
      console.log('[wordmark] welcome public JS updated; other markup and animations preserved')
      const html=readFileSync(resolve(folder,'index.html'),'utf8')
      if(!html.includes('<span>Matchter</span>'))throw Error('Startup wordmark missing')
      console.log('[wordmark] startup Matchter verified')
    }
  }
}

// Preserve the shared header markup and styles; only replace the quotation label.
function cotizaHeader(){
  return {name:'matchter-cotiza-header',enforce:'pre',transform(code,id){
    const file=id.split('?')[0].replaceAll('\\','/')
    if(!file.endsWith('/client/src/App.jsx'))return null
    const before='<span className="logo">Matchter${SUB[tab]?html`<small>${SUB[tab]}</small>`:\'\'}</span>'
    const after=before.replace('<small>${SUB[tab]}</small>','<small>${tab==="cotizador"?html`Cot<span style=${{color:"#ff790c"}}>I</span>z<span style=${{color:"#ff790c"}}>A</span>`:SUB[tab]}</small>')
    if(code.split(before).length!==2)throw Error('Expected exactly one original shared header')
    console.log('[cotiza header] original typography, separation and layout preserved; only cotizador label changed')
    return {code:code.replace(before,()=>after),map:null}
  }}
}

export default defineConfig({ plugins: [sectionNames(),matchterWordmark(),cotizaHeader(),react()], server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } }, build: { outDir: 'dist' } })
