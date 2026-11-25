(function(){
 const fs=require('node:fs');
 fs.appendFileSync('client/src/features/settings/appearance.css',`
/* Identical center-button geometry in the normal menu and MATCHPLAY.
   Preserve the normal play symbol and theme colors; add MATCHTER's orange halo. */
.mn-nav,.mn-nav.mn-video{grid-template-columns:repeat(3,minmax(0,1fr)) 60px repeat(3,minmax(0,1fr))}
.mn-nav .mn-item.mn-play,.mn-video .mn-item.mn-publish{width:48px;height:34px;min-height:0;border-radius:10px;padding:0;box-shadow:0 0 0 1px #ff5a00,0 0 9px 2px #ff5a0066}
.mn-nav .mn-item.mn-play>svg,.mn-video .mn-item.mn-publish>svg{width:27px;height:27px}
[data-matchter-theme=dark] .mn-nav .mn-item.mn-play{box-shadow:0 0 0 1px #ff5a00,0 0 9px 2px #ff5a0066}
@media(max-width:360px){.mn-nav,.mn-nav.mn-video{grid-template-columns:repeat(3,minmax(0,1fr)) 50px repeat(3,minmax(0,1fr))}.mn-nav .mn-item.mn-play,.mn-video .mn-item.mn-publish{width:42px;height:33px}}
`);
 console.log('BETA: center buttons share the approved publish-button dimensions and rounded rectangle, with subtle orange border glow; icons and behavior unchanged.');
})();