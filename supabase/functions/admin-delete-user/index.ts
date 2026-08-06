import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: caller } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (caller?.role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { userId } = await req.json()
    if (!userId) throw new Error('userId is required')
    if (userId === user.id) throw new Error('Non puoi eliminare il tuo account dalla console')

    const { data: target } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (!target?.user) throw new Error('Utente non trovato')
    if ((target.user.email || '').toLowerCase() === 'admin@bianconerihub.com') throw new Error('L’amministratore principale è protetto')

    const { data: targetProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).maybeSingle()
    if (targetProfile?.role === 'admin') {
      const { count } = await supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin')
      if ((count || 0) <= 1) throw new Error('Non puoi eliminare l’ultimo amministratore')
    }

    // Delete profile
    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
    if (profileError) throw profileError

    // Delete auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authDeleteError) throw authDeleteError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Operazione non riuscita' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
