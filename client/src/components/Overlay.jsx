import React,{useState,useRef} from 'react';
import {html,Ic} from '../lib/html.js';

export function Overlay({title,onBack,children,right}){return html`<div className="ov"><div className="hd"><button className="chip" onClick=${onBack}>←</button><span className="logo">MATCHTER<small>${title}</small></span><span style=${{width:40}}>${right}</span></div><div className="main">${children}</div></div>`}
