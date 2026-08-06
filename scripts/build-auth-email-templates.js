import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const templates=[
 ['invite','Sei stato invitato','Entra in BianconeriHub.','Hai ricevuto un invito per accedere allo spazio editoriale e alla community di BianconeriHub.','Accetta l’invito','{{ .ConfirmationURL }}'],
 ['confirmation','Conferma il tuo account','Benvenuto nel lato bianconero.','Conferma il tuo indirizzo email per completare la registrazione e accedere a tutte le funzioni della community.','Conferma account','{{ .ConfirmationURL }}'],
 ['recovery','Reimposta la password','Riprendi il controllo.','È stata richiesta una nuova password per il tuo account BianconeriHub. Usa il pulsante seguente per sceglierla in sicurezza.','Crea nuova password','{{ .ConfirmationURL }}'],
 ['magic_link','Il tuo accesso sicuro','Un clic. Sei dentro.','Usa questo collegamento personale per accedere a BianconeriHub senza inserire la password.','Accedi a BianconeriHub','{{ .ConfirmationURL }}'],
 ['email_change','Conferma la nuova email','Una nuova identità di accesso.','Conferma il nuovo indirizzo email associato al tuo account BianconeriHub.','Conferma nuova email','{{ .ConfirmationURL }}'],
 ['reauthentication','Verifica la tua identità','Conferma che sei tu.','Inserisci questo codice nella schermata di verifica. Non condividerlo con nessuno.','Codice di sicurezza','{{ .Token }}'],
] 

const escape=(value)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
function render([,preheader,title,copy,cta,url],isCode=false){return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${preheader} — BianconeriHub</title></head>
<body style="margin:0;padding:0;background:#050505;color:#f4f2ed;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#0b0c0c;border:1px solid #2b2925;border-radius:28px;overflow:hidden">
<tr><td style="height:3px;background:#b8955a;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:30px 34px 22px"><table role="presentation" width="100%"><tr><td style="font-size:20px;font-weight:900;letter-spacing:-1px;color:#f4f2ed">BIANCONERI<span style="color:#b8955a">HUB</span></td><td align="right" style="font-size:9px;font-weight:700;letter-spacing:2px;color:#777771">BLOG INDIPENDENTE</td></tr></table></td></tr>
<tr><td style="padding:12px 34px 0"><div style="height:1px;background:#292a28"></div></td></tr>
<tr><td style="padding:48px 34px 20px"><p style="margin:0 0 15px;color:#b8955a;font-size:10px;font-weight:800;letter-spacing:2.4px;text-transform:uppercase">Account · Accesso sicuro</p><h1 style="margin:0;max-width:490px;color:#f4f2ed;font-family:Georgia,'Times New Roman',serif;font-size:46px;font-weight:400;line-height:1.02;letter-spacing:-1.5px">${title}</h1><p style="margin:25px 0 0;max-width:475px;color:#aaa9a3;font-size:15px;line-height:1.7">${copy}</p></td></tr>
<tr><td style="padding:18px 34px 42px">${isCode?`<table role="presentation"><tr><td style="padding:18px 28px;border:1px solid #b8955a;border-radius:999px;background:#15130f;color:#f4f2ed;font-size:28px;font-weight:800;letter-spacing:8px">${url}</td></tr></table>`:`<table role="presentation"><tr><td bgcolor="#b8955a" style="border-radius:999px"><a href="${url}" style="display:inline-block;padding:16px 24px;color:#080808;font-size:12px;font-weight:900;letter-spacing:1.3px;text-decoration:none;text-transform:uppercase">${cta}&nbsp;&nbsp;↗</a></td></tr></table><p style="margin:24px 0 0;color:#6f706c;font-size:11px;line-height:1.55;word-break:break-all">Se il pulsante non funziona, apri questo collegamento:<br><a href="${url}" style="color:#b8955a;text-decoration:underline">${escape(url)}</a></p>`}</td></tr>
<tr><td style="padding:24px 34px;border-top:1px solid #292a28"><table role="presentation" width="100%"><tr><td style="color:#777771;font-size:10px;line-height:1.6">Messaggio automatico di sicurezza.<br>Se non hai avviato questa operazione, ignora l’email.</td><td align="right" style="color:#b8955a;font-size:10px;font-weight:800;letter-spacing:1px">BIANCONERIHUB.COM</td></tr></table></td></tr>
</table></td></tr></table></body></html>`}

const target=path.join(root,'supabase','templates');fs.mkdirSync(target,{recursive:true})
for(const template of templates){fs.writeFileSync(path.join(target,`${template[0]}.html`),render(template,template[0]==='reauthentication'))}
console.log(`Generati ${templates.length} template Auth in ${target}`)
