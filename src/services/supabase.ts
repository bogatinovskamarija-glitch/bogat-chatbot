import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface Lead {
  name: string;
  email: string;
  project_type: string;
}

export async function saveLead(lead: Lead): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("leads")
    .insert([
      {
        name: lead.name,
        email: lead.email,
        project_type: lead.project_type,
        source: "website_chatbot",
        created_at: new Date().toISOString(),
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("Supabase error saving lead:", error.message);
    return null;
  }

  return data;
}
