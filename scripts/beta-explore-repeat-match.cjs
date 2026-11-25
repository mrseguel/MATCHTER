(function(){
const fs=require('node:fs'),once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a);return s.replace(a,b)},update=(f,fn)=>fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8')));
update('client/src/approved/visual.js',s=>{
s=once(s,'function Explore({pros,seen,act,setView,saved,filt,setFilt,fl,setFl})','function Explore({pros,seen,act,setView,saved,filt,setFilt,fl,setFl,onRestart})');
s=once(s,'const vis=pros.filter(p=>okp(p,fl));const deck=vis.filter(p=>!seen.includes(p.id));const top=deck[0];','const vis=pros.filter(p=>okp(p,fl));const deck=vis.filter(p=>!seen.includes(p.id));const exhausted=vis.length>0&&deck.length===0;const top=deck[0];useEffect(()=>{if(exhausted)onRestart?.()},[exhausted]);');
s=once(s,'function MatchScreen({p,onContract,onClose})','function MatchScreen({p,onContract,onClose,demo=false})');
s=once(s,'<h1>¡Hiciste<br/>Match!</h1>','<h1>¡Hiciste<br/>Match!</h1>${demo&&html`<span style=${{fontSize:12,marginBottom:10,opacity:.9}}>Match de demostración</span>`}');
return s;
});
update('client/src/App.jsx',s=>{
s=once(s,'const [seen, setSeen] = useState([])','const [seen, setSeen] = useState([])\n  const exploreTurns=useRef(0)\n  useEffect(()=>{exploreTurns.current=0;setSeen([])},[account,activeClientId])');
const anchor='const changeRole = nextRole => {';
s=once(s,anchor,`// Local-only demo deck. No automatic acceptance is sent to the API.
  const restartExplore=()=>{exploreTurns.current=0;setSeen([])}
  const previewExploreAction=(profile,action)=>{
    if(!['like','pass','save'].includes(action))return;
    const turn=++exploreTurns.current;
    setSeen(previous=>previous.includes(profile.id)?previous:[...previous,profile.id]);
    if(action==='save'){setSaved(previous=>previous.includes(profile.id)?previous:[...previous,profile.id]);toast('Perfil guardado en favoritos');return;}
    if(action==='pass')return;
    setLikes(previous=>previous.includes(profile.id)?previous:[...previous,profile.id]);
    if(turn!==2){toast('Me interesa · prueba de exploración');return;}
    const jobId='demo-explore-match-'+String(activeClient.id)+'-'+String(profile.id);
    const existing=jobs.find(x=>x.id===jobId);
    if(!existing){
      const job={id:jobId,matchId:jobId,projectRef:jobId,providerId:profile.id,clientId:activeClient.id,project:'Proyecto de demostración con '+profile.name,scope:'Alcance ilustrativo del Match de prueba; pendiente de definir y acordar entre las partes.',paid:0,signed:false,notarized:false,idOk:false,demoSeed:true};
      setJobs(previous=>previous.some(x=>x.id===jobId)?previous:[job,...previous]);
      setMatches(previous=>previous.some(x=>x.id===jobId)?previous:[...previous,{id:jobId,dedupeKey:jobId,clientId:activeClient.id,providerId:profile.id,jobId,demo:true}]);
      setChats(previous=>previous[jobId]?previous:{...previous,[jobId]:[]});
    }
    setView(null);setMatch({profile,jobId,demo:true});
  }
  `+anchor);
s=once(s,'<${Explore} pros=${pros} seen=${seen} act=${act}','<${Explore} pros=${pros} seen=${seen} act=${previewExploreAction} onRestart=${restartExplore}');
s=once(s,'<${MatchScreen} p=${match.profile}','<${MatchScreen} p=${match.profile} demo=${match.demo}');
return s;
});
update('scripts/smoke-browser.cjs',s=>once(s,"console.log('BROWSER LOGGED IN:',rootEl.textContent.slice(0,160));",`console.log('BROWSER LOGGED IN:',rootEl.textContent.slice(0,160));
const deckAction=(re)=>{const el=Array.from(w.document.querySelectorAll('.deck .act')).find(x=>re.test(x.textContent));return el?.querySelector('b')||el};
const first=w.document.querySelector('.deck')?.textContent;if(!first)throw Error('Explore deck missing');await click(deckAction(/Pasar/));if(w.document.querySelector('.deck')?.textContent===first)throw Error('First card did not advance');await click(deckAction(/Me interesa/i));if(!w.document.querySelector('.mt')?.textContent.includes('Match de demostración'))throw Error('Second card demo Match missing');await click(find(/Seguir explorando/));if(w.document.querySelector('.mt'))throw Error('Match close failed');
let looped=false;for(let i=0;i<25;i++){if(w.document.querySelector('.deck')?.textContent===first){looped=true;break}await click(deckAction(/Pasar/))}if(!looped)throw Error('Explore deck did not recycle');console.log('BROWSER SECOND CARD MATCH AND RECYCLE PASSED');`));
console.log('BETA: second consumed card gets a local demo Match on interest; other interests advance; deck restarts at exhaustion, without changing normal request acceptance.');
})();