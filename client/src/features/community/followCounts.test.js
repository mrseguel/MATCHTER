import test from 'node:test';
import assert from 'node:assert/strict';
import {getFollowCounts} from './followCounts.js';
test('public profile displays actual incoming and outgoing follows',()=>{
 assert.deepEqual(getFollowCounts({'1':['2','3'],'2':['1'],'3':['1'],'4':['1','1']},1),{followers:3,following:2});
});
test('counts update when following or unfollowing and empty profiles show zero',()=>{
 assert.deepEqual(getFollowCounts({},'1'),{followers:0,following:0});
 assert.deepEqual(getFollowCounts({'1':['2'],'2':['1']},'1'),{followers:1,following:1});
 assert.deepEqual(getFollowCounts({'1':[],'2':[]},'1'),{followers:0,following:0});
});
