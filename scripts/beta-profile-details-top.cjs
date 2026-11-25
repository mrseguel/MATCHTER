(function(){
 const fs=require('node:fs'),f='client/src/features/employment/RoleProfileHome.jsx';let s=fs.readFileSync(f,'utf8');
 const pattern=/\{(!?company)&&(<div className="card rp-account"><h3>\{company\?[\s\S]*?<\/p><\/div>)\s*\}/g;
 const matches=[...s.matchAll(pattern)];
 if(matches.length!==2||matches[0][2]!==matches[1][2])throw Error('Expected two equivalent account sections');
 const block=matches[0][2];s=s.replace(pattern,'');
 const marker='<div className="rp-stats">';
 if(s.split(marker).length!==2)throw Error('Profile stats anchor missing');
 s=s.replace(marker,'</div>'+block+'<div className="card rp-stats">');
 const tail='</small></div>)}</div></div>';
 if(s.split(tail).length!==2)throw Error('Profile stats end missing');
 s=s.replace(tail,'</small></div>)}</div>');
 fs.writeFileSync(f,s);console.log('BETA: all four profiles show personal/company details immediately after photo and identity header, before stats and activity.');
})();