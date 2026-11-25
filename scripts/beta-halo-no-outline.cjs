(function(){const fs=require('node:fs');fs.appendFileSync('client/src/features/settings/appearance.css',`
/* No fixed orange outline: only the animated halo behind the center buttons. */
.mn-nav .mn-item.mn-play,.mn-video .mn-item.mn-publish,[data-matchter-theme=dark] .mn-nav .mn-item.mn-play{box-shadow:none;border:0}
`);console.log('BETA: removed stationary orange outline and shadow; animated halo preserved.');})();