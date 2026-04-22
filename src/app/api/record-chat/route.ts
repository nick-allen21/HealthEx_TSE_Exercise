import { NextRequest } from "next/server";

export const runtime = "nodejs";

const OPENAI_URL = "https://api.openai.com/v1/responses";

type ChatTurn = { role: "user" | "assistant"; content: string };

type SerializedSelection = {
  description?: string;
  key: string;
  label: string;
  metadata: string[];
  occurrenceCount?: number;
  occurrences: Array<{
    date?: string;
    dateLabel?: string;
    note?: string;
    unit?: string;
    valueLabel: string;
  }>;
  tabId: string;
  tabLabel: string;
};

type RecordChatPayload = {
  history?: ChatTurn[];
  selections?: SerializedSelection[];
  userMessage?: string;
};

const SYSTEM_INSTRUCTIONS = [
  "You are a clinical chart reading assistant.",
  "Answer ONLY from the pinned records (if any) and the prior conversation below, which starts with an opening chart summary of the user's record.",
  "If nothing is pinned, answer from the opening chart summary and prior turns only.",
  "If the available context does not support an answer, say exactly what is missing and suggest which record type would help.",
  "Never invent dates, doses, diagnoses, or contraindications.",
  "Frame responses as chart observations, not medical advice.",
  "Be concise: short paragraphs, no bullet points, no disclaimers.",
].join(" ");

function buildInput(payload: Required<Pick<RecordChatPayload, "selections" | "userMessage">> & { history: ChatTurn[] }) {
  const sections: string[] = [SYSTEM_INSTRUCTIONS];

  if (payload.selections.length > 0) {
    sections.push("Pinned records (JSON):");
    sections.push(JSON.stringify(payload.selections, null, 2));
  } else {
    sections.push("Pinned records: none - answer from the opening chart summary and prior turns only.");
  }

  if (payload.history.length > 0) {
    sections.push("Prior turns in this thread:");
    sections.push(
      payload.history
        .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
        .join("\n"),
    );
  }

  sections.push(`Current user question: ${payload.userMessage}`);

  return sections.join("\n\n");
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new Response("OPENAI_API_KEY is not configured on the server.", { status: 500 });
  }

  let body: RecordChatPayload;

  try {
    body = (await request.json()) as RecordChatPayload;
  } catch {
    return new Response("Invalid record chat request payload.", { status: 400 });
  }

  const selections = Array.isArray(body.selections) ? body.selections : [];
  const history = Array.isArray(body.history) ? body.history.filter((turn) => turn?.content) : [];
  const userMessage = (body.userMessage ?? "").trim();

  if (!userMessage) {
    return new Response("Question is required.", { status: 400 });
  }

  if (selections.length === 0 && history.length === 0) {
    return new Response("Ask a question after the opening chart summary streams, or pin a record first.", { status: 400 });
  }

  const upstreamResponse = await fetch(OPENAI_URL, {
    body: JSON.stringify({
      input: buildInput({ selections, history, userMessage }),
      model: "o4-mini",
      stream: true,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!upstreamResponse.ok) {
    const errorText = await upstreamResponse.text();
    return new Response(errorText || "OpenAI record chat request failed.", {
      status: upstreamResponse.status,
    });
  }

  if (!upstreamResponse.body) {
    return new Response("OpenAI record chat stream was unavailable.", { status: 502 });
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstreamResponse.body!.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const eventChunk of events) {
            const lines = eventChunk.split("\n");

            for (const line of lines) {
              if (!line.startsWith("data: ")) {
                continue;
              }

              const data = line.slice(6).trim();

              if (!data || data === "[DONE]") {
                continue;
              }

              const parsed = JSON.parse(data) as {
                delta?: string;
                type?: string;
              };

              if (parsed.type === "response.output_text.delta" && parsed.delta) {
                controller.enqueue(encoder.encode(parsed.delta));
              }
            }
          }
        }

        controller.close();
      } catch (error) {
        controller.error(
          error instanceof Error ? error : new Error("Failed to process record chat stream."),
        );
      } finally {
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
