import { Lead } from "./supabase";

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";
const LEADS_LIST_ID = process.env.CLICKUP_LEADS_LIST_ID || "901326738812";

export async function createLeadTask(lead: Lead): Promise<string | null> {
  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.error("CLICKUP_API_KEY not set");
    return null;
  }

  const taskName = `New Lead: ${lead.name} — ${lead.project_type}`;
  const description = `**New chatbot lead captured**\n\n**Name:** ${lead.name}\n**Email:** ${lead.email}\n**Project Type:** ${lead.project_type}\n**Source:** Website chatbot\n**Captured:** ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })}`;

  const response = await fetch(`${CLICKUP_API_BASE}/list/${LEADS_LIST_ID}/task`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: taskName,
      description,
      status: "Open",
      priority: 2, // High
      tags: ["chatbot-lead"],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("ClickUp error creating task:", err);
    return null;
  }

  const data = (await response.json()) as { id: string };
  console.log(`ClickUp task created: ${data.id} for lead ${lead.email}`);
  return data.id;
}
