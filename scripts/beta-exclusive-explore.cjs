(function(){
 const fs=require('node:fs'),file='client/src/features/employment/RoleProfileHome.jsx';
 let s=fs.readFileSync(file,'utf8');
 const old='<Tile icon={FolderKanban} title={company?\'Proyectos y oportunidades de negocio\':\'Proyectos disponibles\'} sub="Encuentra nuevas obras" onClick={action(\'proyectos\')}/>';
 const next='{company&&<Tile icon={FolderKanban} title="Proyectos y oportunidades de negocio" sub="Explorar oportunidades de negocio" onClick={action(\'explorar\')}/>}';
 if(s.split(old).length!==2)throw Error('Expected exact role-specific project shortcut');
 s=s.replace(old,next);
 if(s.includes('Proyectos disponibles'))throw Error('Duplicate worker project shortcut remains');
 fs.writeFileSync(file,s);
 console.log('BETA: removed duplicate project discovery shortcut from worker/professional profiles. Company and client approved shortcuts preserved.');
})();