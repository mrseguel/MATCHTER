(function(){
 const fs=require('node:fs');
 fs.appendFileSync('client/src/features/settings/appearance.css',`
/* MATCHTER signature: a warm, moving halo, independent of the stable button.
   The orbit is made entirely of CSS; no video, images or extra network requests. */
.mn-nav .mn-item.mn-play,.mn-video .mn-item.mn-publish{isolation:isolate;overflow:visible;box-shadow:0 0 0 1px #ff5a00,0 0 6px 1px #ff5a003d}
[data-matchter-theme=dark] .mn-nav .mn-item.mn-play{box-shadow:0 0 0 1px #ff5a00,0 0 6px 1px #ff5a003d}
.mn-nav .mn-item.mn-play::before,.mn-video .mn-item.mn-publish::before{content:"";position:absolute;inset:-4px;border-radius:14px;background:conic-gradient(from 0deg,transparent 0deg,transparent 90deg,#ff5a0040 140deg,#ff5a00 210deg,#ff9b38 245deg,#ff5a0070 285deg,transparent 330deg);filter:blur(5px);z-index:-2;pointer-events:none;animation:matchter-orange-orbit 4.8s ease-in-out infinite;transform-origin:center}
.mn-nav .mn-item.mn-play::after,.mn-video .mn-item.mn-publish::after{content:"";position:absolute;inset:0;border-radius:inherit;background:#000;z-index:-1;pointer-events:none}
[data-matchter-theme=dark] .mn-nav .mn-item.mn-play::after,.mn-video .mn-item.mn-publish::after{background:#fff}
@keyframes matchter-orange-orbit{
 0%{transform:rotate(0deg) scale(.76);opacity:.18}
 17%{transform:rotate(65deg) scale(1.13);opacity:.95}
 40%{transform:rotate(160deg) scale(1.04);opacity:.85}
 63%{transform:rotate(245deg) scale(1.19);opacity:1}
 82%{transform:rotate(325deg) scale(.88);opacity:.48}
 100%{transform:rotate(360deg) scale(.76);opacity:.18}
}
@media(prefers-reduced-motion:reduce){
 .mn-nav .mn-item.mn-play::before,.mn-video .mn-item.mn-publish::before{animation:none;transform:none;opacity:.65}
}
`);
 console.log('BETA: orange orbit halo around both central buttons, stable icon and geometry, reduced-motion fallback.');
})();