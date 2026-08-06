import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const token=process.env.SUPABASE_ACCESS_TOKEN?.trim()
const project=process.env.SUPABASE_PROJECT_REF?.trim()||'ncolenbfdiukkyfixovo'
if(!token)throw new Error('SUPABASE_ACCESS_TOKEN mancante: crea un Personal Access Token con accesso al progetto.')
const read=(name)=>fs.readFileSync(path.join(root,'supabase','templates',`${name}.html`),'utf8')
const payload={
 mailer_subjects_invite:'Il tuo invito a BianconeriHub',mailer_templates_invite_content:read('invite'),
 mailer_subjects_confirmation:'Conferma il tuo account BianconeriHub',mailer_templates_confirmation_content:read('confirmation'),
 mailer_subjects_recovery:'Reimposta la password BianconeriHub',mailer_templates_recovery_content:read('recovery'),
 mailer_subjects_magic_link:'Il tuo accesso sicuro a BianconeriHub',mailer_templates_magic_link_content:read('magic_link'),
 mailer_subjects_email_change:'Conferma il nuovo indirizzo email',mailer_templates_email_change_content:read('email_change'),
 mailer_subjects_reauthentication:'{{ .Token }} è il tuo codice BianconeriHub',mailer_templates_reauthentication_content:read('reauthentication'),
 site_url:'https://bianconerihub.com',uri_allow_list:'https://bianconerihub.com/**,https://bianconerihub.com/admin/login,https://bianconerihub.com/admin/login?mode=recovery',
}
const response=await fetch(`https://api.supabase.com/v1/projects/${project}/config/auth`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(payload)})
if(!response.ok)throw new Error(`Migrazione Supabase fallita (${response.status}): ${await response.text()}`)
console.log(`Template Auth migrati sul progetto ${project}.`)
