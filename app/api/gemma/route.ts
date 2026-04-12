import { NextResponse } from "next/server";

interface GemmaRequestBody {
  prompt?: string;
}

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "gemma3:1b";
const DEFAULT_TIMEOUT_MS = 45000;

function getGemmaConfig() {
  const baseUrl = (process.env.GEMMA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = process.env.GEMMA_MODEL || DEFAULT_MODEL;
  const timeoutMs = Number(process.env.GEMMA_REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

  return { baseUrl, model, timeoutMs };
}

export async function POST(request: Request) {
  const body = (await request.json()) as GemmaRequestBody;
  const prompt = body.prompt?.trim();

  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt." }, { status: 400 });
  }

  const { baseUrl, model, timeoutMs } = getGemmaConfig();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const upstream = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
      }),
      signal: abortController.signal,
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      clearTimeout(timeoutId);
      return NextResponse.json(
        {
          error: "Gemma service request failed.",
          status: upstream.status,
          detail: detail || "No response body returned by model service.",
        },
        { status: 502 },
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = "";

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              try {
                const chunk = JSON.parse(trimmed) as { response?: string; error?: string };
                if (chunk.error) {
                  controller.error(new Error(chunk.error));
                  return;
                }
                if (chunk.response) {
                  controller.enqueue(encoder.encode(chunk.response));
                }
              } catch {
                controller.error(new Error("Failed to parse streamed Gemma response."));
                return;
              }
            }
          }

          if (buffer.trim()) {
            const tail = JSON.parse(buffer) as { response?: string; error?: string };
            if (tail.error) {
              controller.error(new Error(tail.error));
              return;
            }
            if (tail.response) {
              controller.enqueue(encoder.encode(tail.response));
            }
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          clearTimeout(timeoutId);
          reader.releaseLock();
        }
      },
      cancel() {
        clearTimeout(timeoutId);
        abortController.abort();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    clearTimeout(timeoutId);
    const message =
      error instanceof Error && error.name === "AbortError"
        ? `Gemma request timed out after ${timeoutMs}ms.`
        : error instanceof Error
          ? error.message
          : "Unknown Gemma request error.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
