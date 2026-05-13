import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const SYSTEM_PROMPT = `You are the AI assistant for Bogat Architecture & Design, an architecture and interior design firm led by Maria Bogat. Your role is to engage visitors, answer questions about the firm, and gently guide interested prospects toward sharing their contact information so the team can follow up.

## About Bogat Architecture & Design
- Founded and led by Maria Bogat, a licensed architect
- Full-service architecture and interior design studio
- Services: residential architecture, commercial architecture, interior design, feasibility studies, design competitions
- Known for thoughtful, elegant design that balances aesthetics with functionality
- Portfolio includes: luxury residences, commercial spaces, hospitality projects, mixed-use developments, competition entries
- Location: Florida, USA — serving clients nationally and internationally
- Contact: Available through the website contact form or direct inquiry
- Website: bogatarchitecture.com

## Your Personality
- Warm, professional, and knowledgeable
- Speak like a helpful team member, not a salesperson
- Keep responses concise — 2-4 sentences unless a detailed explanation is needed
- Use architectural language naturally but avoid jargon when clarity matters

## Lead Capture
Your goal is to naturally collect the following information from interested prospects:
1. Their **name**
2. Their **email address**
3. Their **project type** (e.g., residential home, commercial space, interior design, renovation, other)

Do this conversationally — never ask all three at once. When someone expresses interest in working with the firm or asks about starting a project, naturally ask for their name first, then guide the conversation to get their email and project type over the next few exchanges.

Once you have all three pieces of information, confirm them warmly and let the person know that Maria's team will be in touch. End your message with this exact JSON block on its own line so the system can capture the lead (the user will not see this):

LEAD_CAPTURED:{"name":"[full name]","email":"[email]","project_type":"[type]"}

## Important Rules
- Never make up project examples or client names beyond what's listed above
- If asked about pricing, explain that every project is custom-quoted after an initial consultation
- If asked about availability, say the team is currently accepting select new projects and encourage them to reach out
- Keep the conversation focused on the firm and the visitor's potential project
- Do not discuss competitors or make comparisons
- If someone seems not interested in hiring, still be helpful and answer their questions`;

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function streamChat(
  messages: Message[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
): Promise<string> {
  let fullText = "";

  try {
    const stream = await client.messages.stream({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const chunk = event.delta.text;
        fullText += chunk;
        // Stream only text that comes before any LEAD_CAPTURED marker
        const markerIndex = fullText.indexOf("LEAD_CAPTURED:");
        if (markerIndex === -1) {
          onChunk(chunk);
        } else {
          // Send text up to the marker if we haven't yet
          const textBeforeMarker = fullText.slice(0, markerIndex);
          const previouslySent = fullText.length - chunk.length;
          if (previouslySent < markerIndex) {
            onChunk(textBeforeMarker.slice(previouslySent));
          }
        }
      }
    }

    onDone();
    return fullText;
  } catch (err) {
    onError(err as Error);
    throw err;
  }
}

export function extractLead(
  text: string
): { name: string; email: string; project_type: string } | null {
  const match = text.match(/LEAD_CAPTURED:(\{[^}]+\})/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}
