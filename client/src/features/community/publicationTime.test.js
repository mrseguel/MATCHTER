import test from 'node:test';import assert from 'node:assert/strict';import {publicationTime} from './publicationTime.js';
const now=Date.parse('2026-11-24T18:00:00-03:00');
test('recent posts use minute and hour labels',()=>{assert.equal(publicationTime(now-2000,now),'Ahora');assert.equal(publicationTime(now-5*60000,now),'Hace 5 min');assert.equal(publicationTime(now-2*3600000,now),'Hace 2 h')});
test('older posts use day-month until calendar anniversary and month-year thereafter',()=>{assert.equal(publicationTime('2026-11-23T12:00:00-03:00',now),'23-11');assert.equal(publicationTime('2025-11-25T12:00:00-03:00',now),'25-11');assert.equal(publicationTime('2025-11-24T12:00:00-03:00',now),'11-25');assert.equal(publicationTime(null,now),'');assert.equal(publicationTime(now+1,now),'')});
