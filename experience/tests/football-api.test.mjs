import assert from 'node:assert/strict'
import test from 'node:test'
import {mapFootballApiMatches} from '../lib/match-market-content.ts'

test('normalizza soltanto partite valide dalla Football API',()=>{
 const rows=mapFootballApiMatches({matches:[
  {id:42,utcDate:'2026-08-10T18:00:00Z',status:'FINISHED',homeTeam:{shortName:'Juventus'},awayTeam:{name:'Milan'},competition:{name:'Serie A'},score:{fullTime:{home:2,away:1}}},
  {id:43,utcDate:'data-non-valida',homeTeam:{name:'Juventus'},awayTeam:{name:'Roma'}},
 ]})
 assert.deepEqual(rows,[{id:42,home:'Juventus',away:'Milan',homeScore:2,awayScore:1,competition:'Serie A',venue:'',date:'2026-08-10T18:00:00Z',played:true}])
})

test('payload assente o malformato non produce dati dimostrativi',()=>{
 assert.deepEqual(mapFootballApiMatches(null),[])
 assert.deepEqual(mapFootballApiMatches({matches:'invalid'}),[])
})
