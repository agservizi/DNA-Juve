import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import test from 'node:test'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')

test('le migrazioni hanno versioni univoche e ordinate',async()=>{
 const names=(await readdir(path.join(root,'supabase/migrations'))).filter(x=>x.endsWith('.sql')).sort()
 const versions=names.map(x=>x.split('_')[0])
 assert.equal(new Set(versions).size,versions.length,'Versioni di migrazione duplicate')
 assert.ok(names.length>0,'Nessuna migrazione trovata')
})

test('lo scheduler pubblica atomicamente e gira ogni minuto in Postgres',async()=>{
 const sql=await readFile(path.join(root,'supabase/migrations/20260805120000_publish_scheduled_articles_every_minute.sql'),'utf8')
 assert.match(sql,/for update skip locked/i)
 assert.match(sql,/\* \* \* \* \*/)
 assert.match(sql,/revoke all .* anon, authenticated/i)
 assert.match(sql,/status = 'published'/i)
})
