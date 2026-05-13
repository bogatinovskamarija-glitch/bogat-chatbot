import { Lead } from "./supabase";

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";
const LEADS_LIST_ID = process.env.CLICKUP_LEADS_LIST_ID || "901326738812";

export async function createLeadTask(lead: Lead): Promise<string | null> {
  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.error("CLICKUP_API_KEY not set");
    return null;
  }

  const location = lead.location && lead.location !== "not specified" ? lead.location : "—";
  const visitorType = lead.visitor_type || "general";
  const taskName = `🏗 ${lead.name} — ${lead.project_type}`;
  const description = [
    "**New lead captured via website chatbot (Lumen)**",
    "",
    `**Name:** ${lead.name}`,
    `**Email:** ${lead.email}`,
    `**Project:** ${lead.project_type}`,
    `**Location/Market:** ${location}`,
    `**Visitor Type:** ${visitorType}`,
    `**Source:** Website chatbot`,
    `**Captured:** ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET`,
  ].join("\n");

  // Priority: developer/investor/press = urgent (1), others = high (2)
  const urgentTypes = ["developer", "investor", "press"];
  const priority = urgentTypes.includes(visitorType.toLowerCase()) ? 1 : 2;

  const response = await fetch(`${CLICKUP_API_BASE}/list/${LEADS_LIST_ID}/task`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: taskName,
      description,
      status: "not started",
      priority,
      tags: ["chatbot-lead", visitorType],
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
