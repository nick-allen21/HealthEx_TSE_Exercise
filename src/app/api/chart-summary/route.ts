import { NextRequest } from "next/server";

export const runtime = "nodejs";

const OPENAI_URL = "https://api.openai.com/v1/responses";

function buildPrompt(summary: unknown) {
  return [
    "You are writing a concise reviewer-facing clinical chart summary.",
    "Write 3 short paragraphs in plain language.",
    "Lead with the strongest active themes first.",
    "Mention the most relevant conditions, medications, labs/vitals, and immunizations when present.",
    "Do not invent facts. If a category is sparse, say it is sparse rather than guessing.",
    "Avoid bullet points and avoid disclaimers.",
    "",
    "Structured patient summary:",
    JSON.stringify(summary, null, 2),
  ].join("\n");
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new Response("OPENAI_API_KEY is not configured on the server.", { status: 500 });
  }

  let body: { summary?: unknown };

  try {
    body = (await request.json()) as { summary?: unknown };
  } catch {
    return new Response("Invalid summary request payload.", { status: 400 });
  }

  if (!body.summary) {
    return new Response("Summary payload is required.", { status: 400 });
  }

  const upstreamResponse = await fetch(OPENAI_URL, {
    body: JSON.stringify({
      input: buildPrompt(body.summary),
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
    return new Response(errorText || "OpenAI summary request failed.", {
      status: upstreamResponse.status,
    });
  }

  if (!upstreamResponse.body) {
    return new Response("OpenAI summary stream was unavailable.", { status: 502 });
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
          error instanceof Error ? error : new Error("Failed to process summary stream."),
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
