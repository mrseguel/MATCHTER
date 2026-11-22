import React from 'react';
import htm from 'htm';
// Íconos SVG de línea (sin emojis): un emoji escrito en un texto se reemplaza automáticamente por su ícono.
const ICONS={
compass:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5L13.5 13.5 8.5 15.5 10.5 10.5z"/>',
hammer:'<path d="m15 12-8.4 8.4a1 1 0 1 1-3-3L12 9"/><path d="m18 15 4-4"/><path d="m21.5 11.5-1.9-1.9A2 2 0 0 1 19 8.2V7l-2.3-2.3a6 6 0 0 0-4.2-1.8L9 3l.9.8A6.2 6.2 0 0 1 12 8.4V10l2 2h1.2a2 2 0 0 1 1.4.6l1.9 1.9"/>',
bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
wrench:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
ruler:'<rect x="2.5" y="9" width="19" height="6" rx="1" transform="rotate(-45 12 12)"/><path d="M9 11l1.5 1.5M12 8l1.5 1.5M6 14l1.5 1.5"/>',
brush:'<path d="M18 3l3 3-9 9-3-3z"/><path d="M8.5 13.5C6 14 5 16 5 18c0 1-1 2-2 2 4 1 8 0 8-4"/>',
hat:'<path d="M3 18h18M5 18v-2a7 7 0 0 1 14 0v2M12 9V6M9 9V8h6v1"/>',
bld:'<path d="M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 7h3M8 11h3M8 15h3"/>',
home:'<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
brief:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
star:'<path d="M12 2.5l3 6.5 7 .8-5.2 4.7 1.5 7L12 17.8 5.7 21.5l1.5-7L2 9.8 9 9z"/>',
pin:'<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
check:'<path d="M5 12.5l5 5L19.5 7"/>',
x:'<path d="M6 6l12 12M18 6L6 18"/>',
heart:'<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c0 6-8 11-8 11z"/>',
thumb:'<path d="M7 10v12"/><path d="M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 8a2 2 0 0 1-1.9 1.4H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9z"/>',
info:'<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
cam:'<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/>',
award:'<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/>',
cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
scale:'<path d="M12 3v18M5 21h14M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
clip:'<path d="M21 11l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/>',
trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
up:'<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
alert:'<path d="M12 3l10 18H2zM12 10v5M12 18h.01"/>',
sliders:'<path d="M4 6h8M16 6h4M4 12h4M12 12h8M4 18h10M18 18h2"/><circle cx="14" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
hand:'<path d="M2 11l4-4 5 2 4-2 5 4M6 7l6 10 3-1M11 18l-2 3M15 16l-2 3M18 11l-4 4"/>',
flag:'<path d="M5 21V4M5 4h13l-3 4 3 4H5"/>',
hour:'<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>',
ok:'<circle cx="12" cy="12" r="9" fill="#17a34a" stroke="none"/><path d="M8 12l3 3 5-6" stroke="#fff"/>',
dotb:'<circle cx="12" cy="12" r="9" fill="#2563eb" stroke="none"/>',
dotg:'<circle cx="12" cy="12" r="8" stroke="#9aa6c7"/>',
pot:'<path d="M4 11h16v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM8 11V8M12 11V6M16 11V8"/>'};
const MAP={'🏗':'hat','👷':'hat','🏢':'bld','⚡':'bolt','🔧':'wrench','🪚':'ruler','🎨':'brush','🧭':'compass','🔨':'hammer','💼':'brief','💬':'chat','👤':'user','🧑\u200d🔧':'user','👩\u200d💼':'user','🛡':'shield','🏠':'home','🛖':'home','🍳':'pot','🏅':'award','🔵':'dotb','⚪':'dotg','✅':'ok','⏳':'hour','🔒':'lock','💳':'card','📊':'chart','⚖':'scale','📎':'clip','🗑':'trash','⬆':'up','📅':'cal','⚠':'alert','🎚':'sliders','⚙':'gear','🏁':'flag','🤝':'hand','📷':'cam','📐':'ruler','📍':'pin','⭐':'star','ⓘ':'info','✔':'check','✓':'check','✕':'x','♥':'heart','👍':'thumb'};
const FILL={star:1,heart:1},COL={star:'#f59e0b',heart:'#ff5a00'};
const RX=new RegExp('('+Object.keys(MAP).sort((a,b)=>b.length-a.length).join('|')+')\uFE0F?','g');
export function Ic({n}){return React.createElement('svg',{viewBox:'0 0 24 24',width:'1em',height:'1em',fill:FILL[n]?'currentColor':'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,style:{verticalAlign:'-0.15em',flex:'none',color:COL[n]},dangerouslySetInnerHTML:{__html:ICONS[n]}})}
const tx=c=>typeof c==='string'?(c.split(RX).length>1?c.split(RX).map((x,i)=>MAP[x]?React.createElement(Ic,{n:MAP[x],key:i}):x):c):Array.isArray(c)?c.map(tx):c;
const h=(t,p,...c)=>React.createElement(t,p,...c.map(tx));
export const html=htm.bind(h);
