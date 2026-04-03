// ── Brevo (ex-Sendinblue) API Service ────────────────────────────────────────
// Handles newsletter subscriber management via Brevo API v3
// Dev: Vite proxy  |  Prod: Supabase Edge Function

import { apiUrl, apiHeaders } from './apiProxy'

const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY || ''
const BREVO_LIST_ID = parseInt(import.meta.env.VITE_BREVO_LIST_ID || '2', 10)

/**
 * Add a subscriber to the Brevo contact list
 * @param {string} email - subscriber email
 * @param {string} [name] - optional subscriber name
 */
export async function addSubscriber(email, name = '') {
  if (!BREVO_API_KEY) {
    console.warn('[Brevo] No API key configured, storing locally only')
    storeLocally(email, name)
    return { success: true, local: true }
  }

  try {
    const res = await fetch(apiUrl('brevo', 'contacts'), {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        email,
        listIds: [BREVO_LIST_ID],
        attributes: { NOME: name || undefined },
        updateEnabled: true,
      }),
    })

    if (res.status === 201 || res.status === 204) {
      storeLocally(email, name)
      return { success: true }
    }

    // 400 = contact already exists → still success
    if (res.status === 400) {
      const json = await res.json().catch(() => ({}))
      if (json.code === 'duplicate_parameter') {
        storeLocally(email, name)
        return { success: true, existing: true }
      }
    }

    const err = await res.text().catch(() => '')
    console.warn('[Brevo] Subscribe failed:', res.status, err)
    // Fallback to local storage
    storeLocally(email, name)
    return { success: true, local: true }
  } catch (err) {
    console.warn('[Brevo] Network error, storing locally:', err.message)
    storeLocally(email, name)
    return { success: true, local: true }
  }
}

/**
 * Remove a subscriber from the Brevo contact list
 */
export async function removeSubscriber(email) {
  if (!BREVO_API_KEY) return

  try {
    await fetch(`${apiUrl('brevo', 'contacts')}/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: apiHeaders(),
    })
  } catch (err) {
    console.warn('[Brevo] Unsubscribe error:', err.message)
  }

  // Remove locally too
  const subs = getLocalSubscribers()
  const filtered = subs.filter(s => s.email !== email)
  localStorage.setItem('fb-newsletter', JSON.stringify(filtered))
}

// ── Local storage fallback ──────────────────────────────────────────────────

function storeLocally(email, name) {
  const subs = getLocalSubscribers()
  if (!subs.find(s => s.email === email)) {
    subs.push({ email, name, date: new Date().toISOString() })
    localStorage.setItem('fb-newsletter', JSON.stringify(subs))
  }
}

export function getLocalSubscribers() {
  try {
    return JSON.parse(localStorage.getItem('fb-newsletter') || '[]')
  } catch {
    return []
  }
}
