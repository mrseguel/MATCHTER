import React,{useEffect,useState} from 'react';
export function MplayWelcome({active}){
 const [visible,setVisible]=useState(true);
 useEffect(()=>{const timer=setTimeout(()=>setVisible(false),5000);return()=>clearTimeout(timer)},[]);
 useEffect(()=>{if(active)setVisible(false)},[active]);
 if(!visible||active)return null;
 return <div className="mplay-welcome" role="status">Revisa los últimos videos que subieron nuestros <strong>MATCHTER’s</strong></div>;
}
