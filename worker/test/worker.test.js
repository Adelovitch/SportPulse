import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,collect} from '../src/index.js';
test('normalise et ne fabrique aucun score',()=>{
 const m=normalize({matches:[{id:5,status:'SCHEDULED',homeTeam:{name:'A'},awayTeam:{name:'B'},score:{fullTime:{home:null,away:null}}}]});
 assert.equal(m[0].score,null);
 assert.equal(m[0].home,'A');
});
test('rejette les réponses fournisseurs invalides',()=>assert.throws(()=>normalize({}))); 
test('exige un secret et un cache',async()=>await assert.rejects(collect({}),/Missing/));
