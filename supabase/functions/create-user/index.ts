import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_ROLES = ["admin", "manager", "user", "client"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Handle delete action
    if (action === "delete") {
      const { userId } = body;
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // First, unassign any leads assigned to this user to avoid FK constraint violations
      const { error: leadsUpdateError } = await supabaseAdmin
        .from("leads")
        .update({ assigned_to: null, assigned_by: null, assigned_at: null })
        .eq("assigned_to", userId);

      if (leadsUpdateError) {
        console.error("Error unassigning leads:", leadsUpdateError);
        // Continue anyway - the leads might not exist
      }

      // Also clear leads created by this user (set to null, don't delete the leads)
      const { error: createdByError } = await supabaseAdmin
        .from("leads")
        .update({ created_by: null })
        .eq("created_by", userId);

      if (createdByError) {
        console.error("Error clearing created_by:", createdByError);
      }

      // Clear lead activities by this user
      const { error: activitiesError } = await supabaseAdmin
        .from("lead_activities")
        .update({ user_id: null })
        .eq("user_id", userId);

      if (activitiesError) {
        console.error("Error clearing lead activities:", activitiesError);
      }

      // Delete user from auth (this will cascade to profiles and roles due to foreign keys)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`User deleted: ${userId}`);

      return new Response(
        JSON.stringify({ success: true, message: "User deleted successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: Create user action
    const { email, password, fullName, role = "user" } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const validRole = VALID_ROLES.includes(role) ? role : "user";

    // Create the user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || email.split("@")[0] },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // Create profile
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName || email.split("@")[0],
    });

    if (profileError) {
      console.error("Profile error:", profileError);
    }

    // Set the user role (delete any existing role first to avoid conflicts)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: validRole,
    });

    if (roleError) {
      console.error("Role error:", roleError);
    }

    console.log(`User created: ${email} with role: ${validRole}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: userId, email },
        role: validRole 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("User management error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
