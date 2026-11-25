// Datos de ejemplo y constantes de MATCHTER
export const fmt=n=>'$'+n.toLocaleString('es-CL')+' CLP';
export const CATS=['Todos','Obra gruesa','Electricidad','Gasfitería','Carpintería','Pintura'];
export const PROS=[
{id:1,name:'Carlos Muñoz',role:'Maestro constructor',cat:'Obra gruesa',r:4.9,n:38,loc:'Temuco · Labranza, 4,2 km',bio:'Ampliaciones, radieres y remodelaciones. Trabajo con planificación, orden y terminaciones cuidadas.',e:'🏗️',photo:'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=85',c:'#d9a066',ver:true,jobs:18,sus:false},
{id:2,name:'Constructora Araucanía Ltda.',role:'Empresa constructora',cat:'Obra gruesa',r:4.8,n:61,loc:'Temuco · Centro, 2,1 km',bio:'Edificación en madera y hormigón, proyectos llave en mano con inspección técnica.',e:'🏢',photo:'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=85',c:'#8fb3e8',ver:true,jobs:42,sus:false},
{id:3,name:'Juan Pérez',role:'Maestro mayor',cat:'Electricidad',r:4.9,n:18,loc:'Temuco · Pueblo Nuevo, 3,5 km',bio:'Instalaciones eléctricas residenciales, tableros y certificación SEC.',e:'⚡',photo:'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=85',c:'#f2cf6b',ver:true,jobs:18,sus:false},
{id:4,name:'Pedro Soto',role:'Gásfiter',cat:'Gasfitería',r:4.7,n:25,loc:'Padre Las Casas, 6 km',bio:'Redes de agua, gas y calefacción. Reparaciones urgentes.',e:'🔧',photo:'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=1200&q=85',c:'#9bd6c5',ver:false,jobs:12,sus:false},
{id:5,name:'Luis Vera',role:'Carpintero',cat:'Carpintería',r:4.8,n:30,loc:'Temuco · Amanecer, 5 km',bio:'Muebles a medida, techumbres, terrazas y cocinas.',e:'🪚',photo:'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=85',c:'#e3b58a',ver:true,jobs:27,sus:false},
{id:6,name:'María Gómez',role:'Arquitecta',cat:'Pintura',r:4.9,n:18,loc:'Temuco · Avenida Alemania, 1,8 km',bio:'Diseño de interiores, color y terminaciones. Pintura decorativa.',e:'🎨',photo:'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=85',c:'#e8a6c4',ver:true,jobs:18,sus:false}];
export const STAGES=[['Obra gruesa y cimientos','15 Dic 2026',1200000],['Techumbre y aislación','5 Ene 2027',800000],['Terminaciones e instalaciones','25 Ene 2027',1000000]];
export const CARDS=[{b:'VISA',l:'4321',e:'08/29',c:'#3d4560'},{b:'Mastercard',l:'8765',e:'11/27',c:'#6b7690'}];
export const PRIV=[['PÚBLICO','#17a34a'],['SOLO MATCH','#f59e0b'],['PRIVADO','#6b7280']];
export const PSTEPS=['Reporte','Mediación','Propuesta de acuerdo','Resolución'];

export const ICO={Todos:'🧭','Obra gruesa':'🔨',Electricidad:'⚡',Gasfitería:'🔧',Carpintería:'🪚',Pintura:'🎨'};
export const AV=[1,2,3,5];
export const km=p=>parseFloat(((p.loc.match(/([\d,]+) km/)||[])[1]||'99').replace(',','.'));
export const FL0={inm:false,ver:false,dist:0,top:false,cats:[],emp:false};
export const okp=(p,fl)=>!p.sus&&(!fl.inm||AV.includes(p.id))&&(!fl.ver||p.ver)&&(!fl.dist||km(p)<=fl.dist)&&(!fl.top||p.r>=4.8)&&(!fl.cats.length||fl.cats.includes(p.cat))&&(!fl.emp||p.role.includes('Empresa'));
export const TYPES=[['👤','Cliente','Busca y contrata profesionales para tu proyecto'],['🦺','Maestro o contratista','Ofrece servicios de obra, especialidades y ejecución'],['📐','Profesional','Arquitectos, ingenieros y especialistas titulados'],['🏢','Empresa','Constructoras y empresas del rubro']];
