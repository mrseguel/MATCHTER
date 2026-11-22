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
