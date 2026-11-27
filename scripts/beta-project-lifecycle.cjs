(function(){
 const fs=require('node:fs'),once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a);return s.replace(a,b)},update=(f,fn)=>fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8')));
 update('client/src/features/contracts/model.js',s=>{
 if(!s.includes("job.startDate||'01 de diciembre de 2026'"))s=once(s,"Inicio referencial: 01 de diciembre de 2026. Término estimado: 30 de enero de 2027.","Inicio: '+(job.startDate||'01 de diciembre de 2026')+'. Término estimado: '+(job.endDate||'30 de enero de 2027')+'.");return s});
 update('client/src/features/contracts/ContractFormal.jsx',s=>{
 const re=/\{job\.paid<stages\.length&&side==='client'&&<button className="btn gr" onClick=\{onPay\}>Pagar etapa \{job\.paid\+1\} · demo<\/button>\}/;
 if(!re.test(s))throw Error('Old pay action missing');s=s.replace(re,'');return s;
 });
 update('client/src/approved/visual.js',s=>{
 s='import {ChatAgreement,Execution} from "../features/lifecycle/Workflow.jsx";\nimport {agreementReady,stageStatus,currentStage,stageCount,completed} from "../features/lifecycle/model.js";\n'+s;
 s=once(s,'onClick=${onContract}>Ver contrato</button>','onClick=${onContract}>Iniciar conversación</button>');
 s=once(s,'function Chat({p,msgs,send,onBack})','function Chat({p,msgs,send,onBack,job,actor,onContract,onPropose,onConfirm})');
 s=once(s,'Conversación de demostración</div></div></div><div style=${{minHeight:320}}>','Conversación de demostración</div></div></div><${ChatAgreement} key=${job.id} job=${job} actor=${actor} onContract=${onContract} onPropose=${onPropose} onConfirm=${onConfirm}/><div style=${{minHeight:220}}>');
 s=once(s,'openDispute,actor,client,provider,onContinue})','openDispute,actor,client,provider,onContinue,onDeliver,onRelease,onReview,hasClaim})');
 s=once(s,'Pago sujeto a conformidad</div></div>','${stageStatus(j,i)}</div></div>');
 s=once(s,'<b>01 Dic 2026</b>','<b>${j.startDate||"01 Dic 2026"}</b>');
 s=once(s,'<b>30 Ene 2027</b>','<b>${j.endDate||"30 Ene 2027"}</b>');
 const a='<button className="btn out" onClick=${()=>openDispute(j)}>';
 s=once(s,a,'<${Execution} key=${j.id+":"+j.paid} job=${j} actor=${actor} stages=${stages} onFund=${()=>setView({t:"wallet",id:j.pid})} onDeliver=${onDeliver} onRelease=${onRelease} onReview=${onReview} hasClaim=${hasClaim}/>'+a);
 s=once(s,"const t=[contractLabel(j),canPay(j)?'g':''];","const t=completed(j)?['Recibido conforme','g']:[contractLabel(j),canPay(j)?'g':''];");
 s=once(s,'const s=j&&(j.stages||STAGES)[j.paid],c=cards[Math.min(sel,cards.length-1)];','const s=j&&(j.stages||STAGES)[j.paid],c=cards[Math.min(sel,cards.length-1)],funded=!!j&&!!currentStage(j).fundedAt;');
 s=once(s,'disabled=${!c} onClick=${()=>pay(j,s,c)}>Simular pago · ${fmt(s[2])}','disabled=${funded||!c} onClick=${()=>pay(j,s,c)}>${funded?"Depósito de prueba registrado":"Simular pago · "+fmt(s[2])}');
 s=once(s,'const j=jobs.find(x=>x.paid<3);','const j=jobs.find(x=>x.paid<stageCount(x)&&!currentStage(x).fundedAt);');
 return s;
 });
 update('client/src/App.jsx',s=>{
 s='import {FinalReview} from "./features/lifecycle/Workflow.jsx";\nimport {agreementReady,proposeAgreement,confirmAgreement,fundStage,deliverStage,releaseStage,makeReview,completed,currentStage,stageCount} from "./features/lifecycle/model.js";\nimport {demoReviews,average} from "./features/reviews/model.js";\n'+s;
 s=once(s,'const [jobs, setJobs] = useState(()=>DEMO_JOBS.map(j=>({...j})))','const [jobs, setJobs] = useState(()=>DEMO_JOBS.map(j=>({...j})))\n  const [sessionReviews,setSessionReviews]=useState([])\n  const [workflowNotices,setWorkflowNotices]=useState([])');
 s=once(s,'const ownProfile=role===\'Cliente\'?activeClient:roleProfile','const baseProfile=role===\'Cliente\'?activeClient:roleProfile\n  const reviewedProfile=p=>{if(!p)return p;const reviews=[...sessionReviews.filter(r=>String(r.recipientId)===String(p.id)),...demoReviews(p)];return {...p,reviews,n:reviews.length,r:reviews.length?Number(average(reviews).toFixed(1)):undefined}}\n  const ownProfile=reviewedProfile(baseProfile)');
 s=once(s,'[confirmed.job, ...previous]','[{...confirmed.job,agreementRequired:true}, ...previous]');
 s=once(s,"demoSeed:true};\n      setJobs(previous=>","demoSeed:true,agreementRequired:true};\n      setJobs(previous=>");
 const p=s.indexOf('const pay = (job, stage, card) => {'),e=s.indexOf('\n  const openDispute',p);
 if(p<0||e<0)throw Error('Payment handler missing');
 s=s.slice(0,p)+`const updateJob=next=>setJobs(previous=>previous.map(item=>item.id===next.id?{...item,...next}:item))
  const activeClaim=job=>disputes.some(c=>String(c.jobId||c.job?.id||c.job?.pid||c.jobRef||'')===String(job.id)&&!['resolved','no-agreement','withdrawn'].includes(c.status))
  const workflowNotice=(job,recipientId,title,body)=>setWorkflowNotices(ns=>[{id:'workflow-'+job.id+'-'+title+'-'+Date.now(),recipientId:String(recipientId),category:'Contratos',title,body,tab:'contratos'},...ns])
  const pay = (job, stage, card) => {
    try{const next=fundStage(job,ownProfile.id,card,new Date().toISOString());updateJob(next);
    setPayments(previous=>[{id:'P-'+job.id+'-'+job.paid,p:job.project+' · etapa '+(job.paid+1),a:stage[2],s:'En custodia · demo'},...previous]);
    workflowNotice(job,job.providerId,'Depósito del hito '+(job.paid+1),'Fondos en custodia de prueba: '+job.project);
    setView({t:'contract',id:job.id});toast('Depósito simulado. El pago se libera tras recepción conforme.')}catch(err){toast(err.message)}
  }
  const notifyDelivery=job=>{const next=deliverStage(job,ownProfile.id,new Date().toISOString());updateJob(next);workflowNotice(job,job.clientId,'Entrega del hito '+(job.paid+1),'Revisa los trabajos y confirma conformidad: '+job.project);toast('Entrega notificada en la demo')}
  const acceptDelivery=job=>{const next=releaseStage(job,ownProfile.id,new Date().toISOString(),activeClaim(job));updateJob(next);setPayments(ps=>ps.map(p=>p.id==='P-'+job.id+'-'+job.paid?{...p,s:'Liberado · demo'}:p));workflowNotice(job,job.providerId,'Pago liberado · etapa '+(job.paid+1),job.project);if(completed(next))setView({t:'final-review',id:job.id});else toast('Etapa recibida conforme; pago de prueba liberado')}
  const submitFinalReview=(job,score,comment)=>{const r=makeReview(job,ownProfile.id,score,comment,new Date().toISOString(),ownProfile.name);if(sessionReviews.some(x=>x.id===r.id))throw Error('Ya calificaste este trabajo');setSessionReviews(rs=>[r,...rs]);updateJob({...job,reviewId:r.id});workflowNotice(job,job.providerId,'Nueva calificación',job.project);setView({t:'contract',id:job.id});toast('Calificación registrada en esta sesión')}
  `+s.slice(e);
 s=once(s,'<${MatchScreen} p=${match.profile} demo=${match.demo} onContract=${()=>{setView({t:\'contract\',id:match.jobId});setMatch(null);setTab(\'contratos\')}}','<${MatchScreen} p=${match.profile} demo=${match.demo} onContract=${()=>{setView({t:"chat",id:match.jobId});setMatch(null);setTab("mensajes")}}');
 s=once(s,'<${Chat} p=${vp} msgs=${chats[view.id]} send=${(_id,t)=>send(j.id,t)} onBack=${()=>setView(null)}/>','<${Chat} p=${vp} job=${j} actor=${ownProfile} msgs=${(chats[view.id]||[]).map(m=>({...m,me:m.actorId?String(m.actorId)===String(ownProfile.id):role==="Cliente"?m.me:!m.me}))} send=${(_id,t)=>send(j.id,t)} onBack=${()=>setView(null)} onContract=${()=>{setView({t:"contract",id:j.id});setTab("contratos")}} onPropose=${data=>{updateJob(proposeAgreement(j,ownProfile.id,data,new Date().toISOString()));workflowNotice(j,role==="Cliente"?j.providerId:j.clientId,"Acuerdo propuesto",j.project)}} onConfirm=${()=>{updateJob(confirmAgreement(j,ownProfile.id,new Date().toISOString()));workflowNotice(j,role==="Cliente"?j.providerId:j.clientId,"Acuerdo confirmado",j.project);setView({t:"contract",id:j.id});setTab("contratos")}}/>');
 s=once(s,'{ me: true, t: body }','{ me: true, actorId:ownProfile.id,t: body }');
 s=once(s,"{ me: false, t: 'Gracias por el mensaje.","{ me: false, actorId:role==='Cliente'?job.providerId:job.clientId,t: 'Gracias por el mensaje.");
 s=once(s,'<${ContractsTab} jobs=${uiJobs}','<${ContractsTab} jobs=${uiJobs.filter(agreementReady)}');
 // Gate contract, old notary and wallet routes even if opened from another section.
 s=once(s,"view.t==='contract'&&j&&vp&&","view.t==='contract'&&j&&vp&&agreementReady(j)&&");
 s=once(s,"view.t==='notary'&&j&&vp&&","view.t==='notary'&&j&&vp&&agreementReady(j)&&");
 s=once(s,'view.t===\'wallet\'&&j&&vp&&j.paid<3&&contractCanPay(j)','view.t===\'wallet\'&&j&&vp&&agreementReady(j)&&role==="Cliente"&&j.paid<stageCount(j)&&contractCanPay(j)');
 s=once(s,'<${WalletTab} jobs=${uiJobs}','<${WalletTab} jobs=${role==="Cliente"?uiJobs.filter(agreementReady):[]}');
 // Both contract render paths use the same execution callbacks.
 const anchor='<${Contract} j=${j} p=${vp} actor=${ownProfile}';
 if(s.split(anchor).length!==3)throw Error('Expected two contract renders');
 s=s.replaceAll(anchor,anchor+' onDeliver=${()=>notifyDelivery(j)} onRelease=${()=>acceptDelivery(j)} hasClaim=${activeClaim(j)} onReview=${()=>setView({t:"final-review",id:j.id})}');
 const overlay='${view?.t==="review-history"';
 s=once(s,overlay,'${view?.t==="final-review"&&j&&completed(j)&&role==="Cliente"&&!j.reviewId&&html`<${Overlay} title="Calificar trabajo" onBack=${()=>setView({t:"contract",id:j.id})}><${FinalReview} job=${j} provider=${profileById(j.providerId)} onSubmit=${(score,comment)=>submitFinalReview(j,score,comment)} onLater=${()=>setView({t:"contract",id:j.id})}/><//>`}\n'+overlay);
 // Include lifecycle notices as additional local notifications without changing other channels.
 s=once(s,'const notices=[...sampleNotices(noticeOwner),...actualNotices]','const notices=[...sampleNotices(noticeOwner),...workflowNotices.filter(n=>n.recipientId===noticeOwner),...actualNotices]');
 return s;
 });
 update('client/src/features/reviews/ReviewHistory.jsx',s=>{
 s=once(s,'demoReviews(person),[person?.id,person?.n,person?.r,person?.role]','person?.reviews||demoReviews(person),[person?.reviews,person?.id,person?.n,person?.r,person?.role]');
 s=once(s,'{formatDate(r.date)} · Ejemplo','{formatDate(r.date)} · {r.session?"Evaluación de esta sesión":"Ejemplo"}');
 s=once(s,'{r.comment?<p>{r.comment}</p>','{r.project&&<p className="mut">{r.project}</p>}{r.comment?<p>{r.comment}</p>');return s;
 });
 // Smoke verifies the new Match CTA and the chat guidance, before continuing existing checks.
 update('scripts/smoke-browser.cjs',s=>{
 s=once(s,"await click(find(/Seguir explorando/));if(w.document.querySelector('.mt'))throw Error('Match close failed');","if(!find(/^Iniciar conversación$/))throw Error('Match CTA missing');await click(find(/^Iniciar conversación$/));if(!find(/^Ir al contrato/))throw Error('Chat contract CTA missing');await click(find(/^Ir al contrato/));if(!w.document.querySelector('.wf-form'))throw Error('Agreement form missing');const chatBack=w.document.querySelector('.ov .hd button');await click(chatBack);const discoverNav=Array.from(w.document.querySelectorAll('.mn-nav button')).find(b=>/Explorar|Descubrir/i.test(b.getAttribute('aria-label')||''));await click(discoverNav);console.log('BROWSER MATCH TO CHAT AGREEMENT PASSED');");
 return s;
 });
 console.log('BETA: Match to chat; mutually confirmed agreement, separate stage deposit/delivery/release, client final review in reputation.');
})();