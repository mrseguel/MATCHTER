const fs=require('node:fs');
const file='client/src/App.jsx',s=fs.readFileSync(file,'utf8');
const old='const [socialThreads,setSocialThreads]=useState({})';
if(s.split(old).length!==2)throw Error('Unexpected social inbox state');
const thread={participants:['6','demo-client'].sort(),sender:'6',recipient:'demo-client',status:'accepted',messages:[{id:'demo-matchplay-maria-1',from:'6',body:'Muchas gracias por tu interés en mi trabajo.'}]};
const seed={[JSON.stringify(thread.participants)]:thread};
fs.writeFileSync(file,s.replace(old,'const [socialThreads,setSocialThreads]=useState(()=>('+JSON.stringify(seed)+'))'));
console.log('MATCHTER: added María Gómez sample conversation to existing Match Play inbox state.');
