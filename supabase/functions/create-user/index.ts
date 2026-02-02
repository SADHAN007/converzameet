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
    const { email, password, fullName, role = "user" } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const validRole = VALID_ROLES.includes(role) ? role : "user";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

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
    console.error("Create user error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
