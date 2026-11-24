export const CLIENT_ID = 'demo-client'

export const DEMO_CLIENT = {
  id: CLIENT_ID,
  name: 'Francisca Muñoz',
  role: 'Cliente',
  e: 'FM',
  c: '#d9a066',
  ver: true,
  r: 4.9,
  n: 4,
  loc: 'Temuco · Centro',
  bio: 'Busco profesionales responsables para proyectos de remodelación en Temuco.',
  jobs: 1,
  sus: false,
}

export const DEMO_CLIENTS = [
  DEMO_CLIENT,
  { ...DEMO_CLIENT, id: 'client-rodrigo', name: 'Rodrigo A.', e: 'RA', loc: 'Temuco · Pueblo Nuevo', bio: 'Cliente de demostración con un proyecto eléctrico público.' },
  { ...DEMO_CLIENT, id: 'client-sebastian', name: 'Sebastián V.', e: 'SV', loc: 'Temuco · Labranza', bio: 'Cliente de demostración con un proyecto de carpintería público.' },
]

export const DEMO_PROJECTS = [
  {
    id: 'project-public-kitchen',
    title: 'Remodelación de cocina y terraza',
    description: 'Renovación de muebles, cubierta, puntos de agua y terminaciones. Se puede coordinar visita para revisar medidas.',
    category: 'Remodelación',
    zone: 'Temuco · Centro',
    budget: 4500000,
    area: '25 m²',
    timeline: 'Inicio durante este mes',
    ownerId: CLIENT_ID,
    ownerName: DEMO_CLIENT.name,
    visibility: 'public',
    photo: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'project-public-electrical',
    title: 'Normalización de tablero eléctrico',
    description: 'Revisión y actualización de tablero domiciliario con protecciones y certificación SEC.',
    category: 'Electricidad',
    zone: 'Temuco · Pueblo Nuevo',
    budget: 450000,
    area: 'Casa de 110 m²',
    timeline: 'Durante la próxima semana',
    ownerId: 'client-rodrigo',
    ownerName: 'Rodrigo A.',
    visibility: 'public',
    photo: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'project-public-deck',
    title: 'Quincho y deck de madera',
    description: 'Pérgola, deck exterior y mesón de obra. Buscamos experiencia comprobable en carpintería exterior.',
    category: 'Carpintería',
    zone: 'Temuco · Labranza',
    budget: 6200000,
    area: '25 m²',
    timeline: 'Flexible',
    ownerId: 'client-sebastian',
    ownerName: 'Sebastián V.',
    visibility: 'public',
    photo: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=85',
  },
]

export const ROLE_PROFILE_IDS = {
  'Maestro o contratista': [1, 3, 4, 5],
  Profesional: [6],
  Empresa: [2],
}

 // Photographs are stock illustrations, not the identities of the fictional accounts.
 const portraits={1:'men/32',2:'men/44',3:'men/52',4:'men/65',5:'men/36',6:'women/44','demo-client':'women/68','client-rodrigo':'men/22','client-sebastian':'men/46'}
 export const demoPortrait=p=>p?.avatar|| (portraits[String(p?.id)]?'https://randomuser.me/api/portraits/'+portraits[String(p.id)]+'.jpg':null)
 export const DEMO_JOBS=[
 {id:'demo-contract-carlos',matchId:'demo-match-carlos',projectRef:'demo-project-carlos',providerId:1,clientId:CLIENT_ID,project:'Ampliación de habitación',scope:'Ampliación de 15 m² con estructura de madera, techumbre, aislación y terminaciones básicas.',signed:false,notarized:false,idOk:false,paid:0,demoSeed:true},
 {id:'demo-contract-luis',matchId:'demo-match-luis',projectRef:'demo-project-luis',providerId:5,clientId:CLIENT_ID,project:'Renovación de cocina',scope:'Fabricación e instalación de muebles de cocina, cubierta y terminaciones de carpintería. No incluye artefactos ni obras sanitarias.',stages:[['Medición y fabricación','15 Dic 2026',650000],['Instalación de muebles','5 Ene 2027',900000],['Ajustes y entrega','25 Ene 2027',450000]],signed:false,notarized:false,idOk:false,paid:0,demoSeed:true}
 ]
 export const DEMO_CHATS={
 'demo-contract-carlos':[{me:false,t:'¡Hola! Soy Carlos. Puedo pasar a revisar las medidas de tu ampliación esta semana.'},{me:true,t:'Hola Carlos, ¿podrías venir el jueves por la tarde?'},{me:false,t:'Sí, a las 16:00 me acomoda. Te llevo una propuesta de materiales y plazos.'}],
 'demo-contract-luis':[{me:false,t:'Hola, te comparto la propuesta para los muebles de cocina.'},{me:true,t:'Gracias, Luis. ¿Incluye instalación y cubierta?'},{me:false,t:'Sí, ambos están incluidos. Podemos revisar los colores antes de fabricar.'}]
 }
