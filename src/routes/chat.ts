import { Router, Request, Response } from "express";
import { streamChat, extractLead, Message } from "../services/anthropic";
import { saveLead } from "../services/supabase";
import { createLeadTask } from "../services/clickup";

const router = Router();

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { messages } = req.body as { messages: Message[] };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  // Validate message format
  for (const msg of messages) {
    if (!msg.role || !msg.content || typeof msg.content !== "string") {
      res.status(400).json({ error: "Each message must have role and content" });
      return;
    }
    if (msg.role !== "user" && msg.role !== "assistant") {
      res.status(400).json({ error: "Message role must be user or assistant" });
      return;
    }
  }

  // Set SSE headers for streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (event: string, data: object) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let fullResponse = "";

    await streamChat(
      messages,
      (chunk) => {
        sendEvent("chunk", { text: chunk });
      },
      () => {
        // done callback — handled after
      },
      (err) => {
        console.error("Stream error:", err);
        sendEvent("error", { message: "Stream error" });
        res.end();
      }
    ).then((text) => {
      fullResponse = text;
    });

    // Check for lead capture
    const lead = extractLead(fullResponse);
    if (lead) {
      console.log(`Lead captured: ${lead.name} <${lead.email}> — ${lead.project_type}`);

      // Save to Supabase and create ClickUp task in parallel
      const [savedLead, clickupTaskId] = await Promise.allSettled([
        saveLead(lead),
        createLeadTask(lead),
      ]);

      if (savedLead.status === "fulfilled" && savedLead.value) {
        console.log(`Lead saved to Supabase: ${savedLead.value.id}`);
      }
      if (clickupTaskId.status === "fulfilled" && clickupTaskId.value) {
        console.log(`ClickUp task: ${clickupTaskId.value}`);
      }

      sendEvent("lead_captured", { captured: true });
    }

    sendEvent("done", { done: true });
    res.end();
  } catch (err) {
    console.error("Chat route error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      sendEvent("error", { message: "Internal server error" });
      res.end();
    }
  }
});

export default router;
