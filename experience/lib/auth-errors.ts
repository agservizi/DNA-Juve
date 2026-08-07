/** Traduce gli errori GoTrue/Supabase Auth in messaggi chiari per l’utente finale. */
export function translateAuthError(raw: unknown, fallback = 'Operazione non riuscita. Riprova.'): string {
  const message = extractMessage(raw)
  if (!message) return fallback

  const seconds = message.match(/after\s+(\d+)\s+seconds?/i)?.[1]
    ?? message.match(/(\d+)\s+seconds?/i)?.[1]

  if (/only request this after|security purposes/i.test(message)) {
    return seconds
      ? `Per sicurezza puoi riprovare tra ${seconds} secondi. Se ti sei già registrato, prova ad accedere.`
      : 'Troppi tentativi. Attendi un minuto e riprova, oppure accedi se hai già un account.'
  }
  if (/email rate limit|over_email_send_rate_limit|rate limit/i.test(message)) {
    return 'Troppe richieste in poco tempo. Attendi un minuto e riprova.'
  }
  if (/already registered|user already|already been registered|email_exists|user_already_exists/i.test(message)) {
    return 'Questa email è già registrata. Accedi oppure recupera la password.'
  }
  if (/invalid login credentials|invalid_credentials/i.test(message)) {
    return 'Email o password non corretti.'
  }
  if (/email not confirmed|email_not_confirmed/i.test(message)) {
    return 'Devi prima confermare l’email: apri il link che ti abbiamo inviato, poi riprova ad accedere.'
  }
  if (/confirmation email|error sending|smtp|mailer/i.test(message)) {
    return 'Non siamo riusciti a inviare l’email di conferma. Riprova tra un minuto o contatta il supporto.'
  }
  if (/password should be at least|password.*at least \d+/i.test(message)) {
    const min = message.match(/at least\s+(\d+)/i)?.[1] || '6'
    return `La password deve contenere almeno ${min} caratteri.`
  }
  if (/weak password|password is too weak/i.test(message)) {
    return 'La password è troppo debole. Scegline una più robusta.'
  }
  if (/unable to validate email|invalid.*email|email_address_invalid/i.test(message)) {
    return 'Indirizzo email non valido.'
  }
  if (/signup.*disabled|signups not allowed|signup_disabled/i.test(message)) {
    return 'Le registrazioni sono temporaneamente disabilitate.'
  }
  if (/database error saving new user|database error/i.test(message)) {
    return 'Non siamo riusciti a creare l’account. Riprova tra poco.'
  }
  if (/user not found|user_not_found/i.test(message)) {
    return 'Nessun account trovato con questa email.'
  }
  if (/token.*(expired|invalid)|otp_expired|link is invalid|expired/i.test(message)) {
    return 'Il link non è più valido. Richiedine uno nuovo.'
  }
  if (/same password|different from the old/i.test(message)) {
    return 'La nuova password deve essere diversa da quella attuale.'
  }
  if (/network|fetch failed|failed to fetch/i.test(message)) {
    return 'Connessione non disponibile. Controlla la rete e riprova.'
  }

  // Se il messaggio è già in italiano (contiene accenti o parole tipiche), lascialo.
  if (/[àèéìòù]|registraz|acced|password|email|account|riprova|sicurezza/i.test(message)) {
    return message
  }

  return fallback
}

function extractMessage(raw: unknown): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  if (raw instanceof Error) return raw.message || ''
  if (typeof raw === 'object' && raw !== null && 'message' in raw) {
    const value = (raw as { message?: unknown }).message
    return typeof value === 'string' ? value : ''
  }
  return ''
}
