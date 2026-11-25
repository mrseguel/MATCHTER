// Stable role keys are distinct from human-readable categories.
export const ROLE_DISPLAY=Object.freeze({'Cliente':'Cliente','Maestro o contratista':'Maestros y contratistas','Profesional':'Profesionales','Empresa':'Empresa'})
export const displayRole=role=>ROLE_DISPLAY[role]||role
export const ACCOUNT_TYPES=Object.freeze([
 ['👤','Perfil clientes','Busca y contrata servicios para tu proyecto'],
 ['🔨','Maestros y contratistas','Maestros independientes, cuadrillas y contratistas que ejecutan obras y servicios'],
 ['📐','Profesionales','Arquitectos, ingenieros, constructores civiles y especialistas técnicos'],
 ['🏢','Perfil empresas','Constructoras y empresas que buscan u ofrecen servicios']
].map(Object.freeze))
export const ROLE_BY_LABEL=Object.freeze({'Perfil clientes':'Cliente','Maestros y contratistas':'Maestro o contratista','Profesionales':'Profesional','Perfil empresas':'Empresa'})
export function roleForLabel(label){if(!Object.hasOwn(ROLE_BY_LABEL,label))throw Error('Selecciona un tipo de cuenta válido');return ROLE_BY_LABEL[label]}
export const WORK_PROFILE_CATEGORIES=Object.freeze(['Maestros y contratistas','Profesionales','Ambos'])
export function workCategoryMatches(role,category){return (role==='Maestro o contratista'||role==='Profesional')&&(category==='Ambos'||displayRole(role)===category)}
