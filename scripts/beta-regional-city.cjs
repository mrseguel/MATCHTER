(function(){
 const fs=require('node:fs');
 const root='client/src/features/auth/';
 function replaceOnce(s,old,next){if(s.split(old).length!==2)throw Error('Expected exactly one registration anchor: '+old.slice(0,100));return s.replace(old,next)}
 const file=root+'AuthPreview.jsx';let ui=fs.readFileSync(file,'utf8');
 ui='import {ARАUCANIA_CITIES as cities} from "./araucaniaCities.js";\n'.replace('ARАUCANIA','ARAUCANIA')+ui;
 ui=replaceOnce(ui,"city:'',sector:'',address:''","city:'',address:''");
 ui=replaceOnce(ui,"{field('city','Ciudad o comuna (opcional)',{maxLength:100,placeholder:'Ej. Temuco'})}\n {field('sector','Sector (opcional)',{maxLength:100,placeholder:'Ej. Labranza'})}",'<label>Ciudad *<select required value={form.city} onChange={update("city")}><option value="" disabled>Selecciona tu ciudad</option>{cities.map(city=><option key={city} value={city}>{city}</option>)}</select><small>Región de La Araucanía. Si vives en un área rural, selecciona la ciudad o localidad más cercana.</small></label>');
 fs.writeFileSync(file,ui);
 const model=root+'testAccounts.js';let s=fs.readFileSync(model,'utf8');
 s='import {ARAUCANIA_CITIES} from "./araucaniaCities.js";\n'+s;
 s=replaceOnce(s,"city=clean(input.city),sector=clean(input.sector),address=clean(input.address)","city=clean(input.city),address=clean(input.address)");
 s=replaceOnce(s,"if([city,sector].some(v=>v.length>100)||address.length>180)","if(!ARAUCANIA_CITIES.includes(city))throw Error('Selecciona una ciudad de La Araucanía.');\n if(address.length>180)");
 s=replaceOnce(s,"phone,city,sector,address","phone,city,address");fs.writeFileSync(model,s);
 const test=root+'testAccounts.test.js';let t=fs.readFileSync(test,'utf8');
 t=replaceOnce(t,"const base={password:","const base={city:'Temuco',password:");
 t=t.replace("ubicación y teléfono opcionales","ciudad obligatoria, dirección y teléfono opcionales");
 t+="\ntest('ciudad obligatoria y limitada a La Araucanía; sector eliminado',()=>{const p={...client,email:'ciudad@example.test'};assert.throws(()=>validateRegistration({...p,city:''}),/ciudad/);assert.throws(()=>validateRegistration({...p,city:'Santiago'}),/ciudad/);const u=validateRegistration({...p,city:'Licán Ray',sector:'no conservar'});assert.equal(u.city,'Licán Ray');assert.equal(u.address,'');assert.equal('sector' in u,false)});\n";
 fs.writeFileSync(test,t);
 fs.appendFileSync(root+'auth.css','\n.beta-auth-form select{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;padding:12px;color:var(--n);background:#fff;font-size:16px;font-family:inherit}.beta-auth-form select:focus{outline:2px solid var(--o);outline-offset:1px}.beta-auth-form select:invalid{color:var(--mut)}\n');
 const sql='server/db/001_beta_accounts.sql';let schema=fs.readFileSync(sql,'utf8');
 schema=replaceOnce(schema,'phone text, city text, sector text, address text','phone text, city text NOT NULL, address text');
 fs.writeFileSync(sql,schema);
 console.log('BETA: required regional city selector; no sector; optional private address.');
})();