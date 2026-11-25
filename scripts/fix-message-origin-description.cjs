const fs=require('node:fs');
const community='client/src/features/community/';
const changes=[
 ['client/src/approved/visual.js','Explorar','Esta conversación proviene de la sección Explorar.'],
 [community+'SocialInboxRows.jsx','Match Play','Esta conversación se inició a partir de un video en Match Play.'],
 [community+'Community.jsx','Match Play','Esta conversación se inició a partir de un video en Match Play.']
];
for(const [file,label,description] of changes){
 const s=fs.readFileSync(file,'utf8');
 const old='<span className="message-origin">'+label+'</span>';
 if(s.split(old).length!==2)throw Error('Unexpected message-origin markup in '+file);
 const replacement='<span className="message-origin-group">'+old+'<small className="message-origin-description">'+description+'</small></span>';
 fs.writeFileSync(file,s.replace(old,replacement));
}
fs.appendFileSync(community+'message-origin.css','\n.message-origin-group{display:inline-flex;align-items:center;flex-wrap:wrap;gap:4px 5px;max-width:100%;vertical-align:middle}.message-origin-group .message-origin{margin-left:0;flex-shrink:0}.message-origin-description,.message-social-name .message-origin-description,.cm-inbox .message-origin-description{font-family:inherit;font-size:10px;font-weight:400;line-height:1.3;color:#77808d;white-space:normal;overflow-wrap:break-word}.cm-inbox .message-origin-group{justify-self:start}\n');
console.log('MATCHTER: small origin descriptions added beside the existing inbox labels; no navigation or message handling changed.');
