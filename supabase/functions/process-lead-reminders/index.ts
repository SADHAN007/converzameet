import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const now = new Date();
    const in15Min = new Date(now.getTime() + 15 * 60 * 1000);
    const in30Min = new Date(now.getTime() + 30 * 60 * 1000);
    
    console.log('Processing lead reminders at:', now.toISOString());
    
    // Get reminders due in 30 minutes (not yet notified)
    const { data: reminders30, error: error30 } = await supabase
      .from('lead_reminders')
      .select(`
        id,
        user_id,
        reminder_time,
        lead_id,
        leads!inner(company_name, serial_number)
      `)
      .eq('is_active', true)
      .eq('notified_30min', false)
      .lte('reminder_time', in30Min.toISOString())
      .gt('reminder_time', in15Min.toISOString());

    if (error30) {
      console.error('Error fetching 30min reminders:', error30);
    } else if (reminders30 && reminders30.length > 0) {
      console.log(`Found ${reminders30.length} reminders due in ~30 minutes`);
      
      for (const reminder of reminders30) {
        const lead = reminder.leads as any;
        
        // Create notification
        await supabase.from('notifications').insert({
          user_id: reminder.user_id,
          title: 'Lead Reminder - 30 Minutes',
          message: `Reminder: "${lead.company_name}" (${lead.serial_number}) is scheduled in 30 minutes.`,
          type: 'lead_reminder',
        });
        
        // Mark as notified
        await supabase
          .from('lead_reminders')
          .update({ notified_30min: true })
          .eq('id', reminder.id);
      }
    }

    // Get reminders due in 15 minutes (not yet notified)
    const { data: reminders15, error: error15 } = await supabase
      .from('lead_reminders')
      .select(`
        id,
        user_id,
        reminder_time,
        lead_id,
        leads!inner(company_name, serial_number)
      `)
      .eq('is_active', true)
      .eq('notified_15min', false)
      .lte('reminder_time', in15Min.toISOString())
      .gt('reminder_time', now.toISOString());

    if (error15) {
      console.error('Error fetching 15min reminders:', error15);
    } else if (reminders15 && reminders15.length > 0) {
      console.log(`Found ${reminders15.length} reminders due in ~15 minutes`);
      
      for (const reminder of reminders15) {
        const lead = reminder.leads as any;
        
        // Create notification
        await supabase.from('notifications').insert({
          user_id: reminder.user_id,
          title: 'Lead Reminder - 15 Minutes',
          message: `Reminder: "${lead.company_name}" (${lead.serial_number}) is scheduled in 15 minutes!`,
          type: 'lead_reminder',
        });
        
        // Mark as notified
        await supabase
          .from('lead_reminders')
          .update({ notified_15min: true })
          .eq('id', reminder.id);
      }
    }

    // Deactivate past reminders
    const { error: deactivateError } = await supabase
      .from('lead_reminders')
      .update({ is_active: false })
      .lt('reminder_time', now.toISOString())
      .eq('is_active', true);

    if (deactivateError) {
      console.error('Error deactivating past reminders:', deactivateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed_30min: reminders30?.length || 0,
        processed_15min: reminders15?.length || 0 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
