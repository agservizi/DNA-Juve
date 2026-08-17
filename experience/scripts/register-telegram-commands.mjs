const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN missing')
  process.exit(1)
}

const commands = [
  { command: 'nuovo', description: 'Crea un nuovo articolo' },
  { command: 'modifica', description: 'Modifica un articolo esistente' },
  { command: 'annulla', description: 'Interrompe la bozza o la modifica' },
  { command: 'promuovi', description: 'Promuovi notizia live a bozza articolo' },
  { command: 'flash', description: 'Breaking news sul canale' },
  { command: 'pubblica_canale', description: 'Pubblica articolo sul canale' },
  { command: 'partita', description: 'Prossime partite + annuncio kickoff' },
  { command: 'gol', description: 'Annuncio gol sul canale' },
  { command: 'risultato', description: 'Forza full-time sul canale' },
  { command: 'digest', description: 'Anteprima e invio digest notizie' },
  { command: 'mattina', description: 'Rassegna mattutina canale' },
  { command: 'rumor', description: 'Rumors mercato → canale' },
  { command: 'video_canale', description: 'Annuncia video sul canale' },
  { command: 'gallery_canale', description: 'Galleria foto → canale' },
  { command: 'sondaggio_canale', description: 'Sondaggio 1X2 sul canale' },
  { command: 'pin', description: 'Pinna ultimo kickoff sul canale' },
  { command: 'quiet', description: 'Modalità silenziosa on/off' },
  { command: 'auto', description: 'Auto-post per tipo on/off' },
  { command: 'stato', description: 'Stato webhook e canale' },
  { command: 'test_canale', description: 'Test messaggio solo in redazione' },
  { command: 'bozze', description: 'Lista bozze articoli' },
  { command: 'cerca', description: 'Cerca articoli per parola' },
  { command: 'thread', description: 'Crea thread matchday (opzionale)' },
  { command: 'pagelle', description: 'Crea pagelle per una partita' },
  { command: 'media', description: 'Prossima foto → gallery canale' },
  { command: 'club', description: 'Conteggio pronostici community' },
  { command: 'help', description: 'Mostra i comandi disponibili' },
]

const set = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ commands }),
}).then((r) => r.json())

const get = await fetch(`https://api.telegram.org/bot${token}/getMyCommands`).then((r) =>
  r.json(),
)

console.log(JSON.stringify({ setOk: set.ok, commands: get.result }, null, 2))
if (!set.ok) process.exit(1)
