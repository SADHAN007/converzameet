import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify user with anon client
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await anonClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role for bulk insert (bypasses RLS for speed)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const { leads } = await req.json() as { leads: any[] }
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return new Response(JSON.stringify({ error: 'No leads provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Processing ${leads.length} leads for user ${user.id}`)

    const BATCH_SIZE = 200
    let success = 0
    const errors: string[] = []

    // Prepare all rows with user context
    const rows = leads.map((lead: any, i: number) => ({
      company_name: lead.company_name || `Import ${i + 1}`,
      contact_number: lead.contact_number || '-',
      email: lead.email || null,
      poc_name: lead.poc_name || null,
      poc_number: lead.poc_number || null,
      address: lead.address || null,
      city: lead.city || null,
      pin: lead.pin || null,
      state: lead.state || null,
      website: lead.website || null,
      requirements: lead.requirements || [],
      sectors: lead.sectors || null,
      other_service: lead.other_service || null,
      lead_source: lead.lead_source || null,
      status: lead.status || 'new_lead',
      remarks: lead.remarks || null,
      follow_up_date: lead.follow_up_date || null,
      deal_value: lead.deal_value || null,
      created_by: user.id,
      is_imported: true,
    }))

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      try {
        const { error } = await serviceClient.from('leads').insert(batch)
        if (error) throw error
        success += batch.length
      } catch (err: any) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, err.message)
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1} (rows ${i + 1}-${i + batch.length}): ${err.message}`)
      }
    }

    console.log(`Done: ${success}/${leads.length} imported, ${errors.length} errors`)

    return new Response(
      JSON.stringify({ success, errors, total: leads.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Import error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
