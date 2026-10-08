// The ONLY file that talks to the AI provider. Everything else in the app
// (the chat route, the admin save action) sees the small neutral interface in
// types.ts, so changing provider means rewriting this file and nothing else.
//
// It uses plain fetch against OpenAI's Responses and Embeddings endpoints, so
// the app gets no new runtime dependency and the key never leaves this file.
// Server only: it is imported by route handlers and Server Actions, never by a
// Client Component.
import {
  AI_LIMITS,
  EMBEDDING_DIMENSIONS,
  type AiConfig,
} from "@/lib/ai/config";
import { createDemoProvider } from "@/lib/ai/mock-provider";
import {
  AiProviderError,
  type AiProvider,
  type CallOptions,
  type ModelTurn,
  type ToolCall,
} from "@/lib/ai/types";

// --- Helpers ---

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

// The timeout, plus the caller's own signal if there is one.
function makeSignal(options: CallOptions | undefined, fallbackMs: number) {
  const timeout = AbortSignal.timeout(options?.timeoutMs ?? fallbackMs);
  return options?.signal ? AbortSignal.any([timeout, options.signal]) : timeout;
}

// --- The OpenAI implementation ---

const API_BASE = "https://api.openai.com/v1";

type OpenAiSettings = {
  apiKey: string;
  model: string;
  embeddingModel: string;
  reasoningEffort: string;
  fetchImpl?: typeof fetch; // tests pass a fake
};

// Turns a non-2xx answer into an AiProviderError. Only the status and the
// provider's short error code are used; the body is never copied into the
// message.
async function failureFrom(response: Response): Promise<AiProviderError> {
  let code = "";
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && isRecord(body.error)) {
      const raw = body.error.code ?? body.error.type;
      if (typeof raw === "string") code = raw.slice(0, 60);
    }
  } catch {
    // an unreadable body is fine, the status is enough
  }
  const status = response.status;
  const label = `OpenAI request failed (${status}${code ? ` ${code}` : ""})`;

  if (status === 401 || status === 403)
    return new AiProviderError("auth", label);
  if (status === 429) {
    const quota =
      code === "insufficient_quota" || code === "billing_hard_limit_reached";
    return new AiProviderError(quota ? "quota" : "rate_limited", label);
  }
  if (status >= 500) return new AiProviderError("unavailable", label);
  return new AiProviderError("bad_response", label);
}

export function createOpenAiProvider(settings: OpenAiSettings): AiProvider {
  const doFetch = settings.fetchImpl ?? fetch;

  // One POST, with the timeout, the auth header and the error mapping.
  async function post(
    path: string,
    body: unknown,
    options: CallOptions | undefined,
    fallbackMs: number,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await doFetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: makeSignal(options, fallbackMs),
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "TimeoutError" || name === "AbortError") {
        throw new AiProviderError("timeout", "OpenAI request timed out");
      }
      throw new AiProviderError("unavailable", "OpenAI could not be reached");
    }

    if (!response.ok) throw await failureFrom(response);

    try {
      return await response.json();
    } catch {
      throw new AiProviderError("bad_response", "OpenAI sent unreadable JSON");
    }
  }

  return {
    async respond(input, options) {
      const body: Record<string, unknown> = {
        model: settings.model,
        instructions: input.instructions,
        input: input.items.flatMap((item) => {
          if (item.type === "message") {
            return [{ role: item.role, content: item.text }];
          }
          if (item.type === "provider_output") return item.items;
          return [
            {
              type: "function_call_output",
              call_id: item.callId,
              output: item.output,
            },
          ];
        }),
        max_output_tokens: AI_LIMITS.maxOutputTokens,
        reasoning: { effort: settings.reasoningEffort },
        // Nothing about the conversation is kept on OpenAI's side for reuse.
        store: false,
      };
      if (input.tools.length > 0) {
        body.tools = input.tools.map((tool) => ({
          type: "function",
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          strict: true,
        }));
      }
      if (input.outputFormat) {
        body.text = {
          format: {
            type: "json_schema",
            name: input.outputFormat.name,
            schema: input.outputFormat.schema,
            strict: true,
          },
        };
      }

      const data = await post(
        "/responses",
        body,
        options,
        AI_LIMITS.chatTimeoutMs,
      );
      return readResponse(data);
    },

    async embed(texts, options) {
      const vectors: number[][] = [];
      for (let i = 0; i < texts.length; i += AI_LIMITS.embedBatchSize) {
        const batch = texts.slice(i, i + AI_LIMITS.embedBatchSize);
        const data = await post(
          "/embeddings",
          {
            model: settings.embeddingModel,
            input: batch,
            encoding_format: "float",
          },
          options,
          AI_LIMITS.embedTimeoutMs,
        );
        vectors.push(...readEmbeddings(data, batch.length));
      }
      return vectors;
    },
  };
}

// Reads a Responses API answer into a ModelTurn, or throws AiProviderError.
function readResponse(data: unknown): ModelTurn {
  if (!isRecord(data) || !Array.isArray(data.output)) {
    throw new AiProviderError("bad_response", "OpenAI answer has no output");
  }
  if (data.status === "incomplete") {
    // Usually max_output_tokens ran out (reasoning counts toward it).
    throw new AiProviderError("bad_response", "OpenAI answer was cut short");
  }
  if (data.status === "failed") {
    throw new AiProviderError(
      "bad_response",
      "OpenAI reported a failed answer",
    );
  }

  let text = "";
  const toolCalls: ToolCall[] = [];
  for (const item of data.output) {
    if (!isRecord(item)) continue;

    if (
      item.type === "function_call" &&
      typeof item.call_id === "string" &&
      typeof item.name === "string" &&
      typeof item.arguments === "string"
    ) {
      toolCalls.push({
        callId: item.call_id,
        name: item.name,
        argumentsJson: item.arguments,
      });
    }

    if (item.type === "message" && Array.isArray(item.content)) {
      for (const part of item.content) {
        if (!isRecord(part)) continue;
        if (part.type === "refusal") {
          throw new AiProviderError("refused", "The model declined to answer");
        }
        if (part.type === "output_text" && typeof part.text === "string") {
          text += part.text;
        }
      }
    }
  }

  if (!text && toolCalls.length === 0) {
    throw new AiProviderError("bad_response", "OpenAI answer is empty");
  }

  const usage = isRecord(data.usage) ? data.usage : {};
  const details = isRecord(usage.input_tokens_details)
    ? usage.input_tokens_details
    : {};
  return {
    text: text || null,
    toolCalls,
    outputItems: data.output,
    usage: {
      inputTokens: count(usage.input_tokens),
      outputTokens: count(usage.output_tokens),
      cachedInputTokens: count(details.cached_tokens),
    },
  };
}

// Reads an Embeddings API answer: exactly `expected` vectors, in input order,
// each EMBEDDING_DIMENSIONS finite numbers. Anything else is refused, because
// a wrong-sized vector would fail later inside the database.
function readEmbeddings(data: unknown, expected: number): number[][] {
  if (!isRecord(data) || !Array.isArray(data.data)) {
    throw new AiProviderError("bad_response", "Embeddings answer has no data");
  }
  if (data.data.length !== expected) {
    throw new AiProviderError(
      "bad_response",
      "Embeddings count does not match",
    );
  }

  const slots: (number[] | undefined)[] = new Array(expected).fill(undefined);
  for (const row of data.data) {
    if (!isRecord(row)) {
      throw new AiProviderError("bad_response", "Embeddings row is malformed");
    }
    const { index, embedding } = row;
    if (
      typeof index !== "number" ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= expected ||
      slots[index] !== undefined ||
      !Array.isArray(embedding) ||
      embedding.length !== EMBEDDING_DIMENSIONS ||
      !embedding.every((n) => typeof n === "number" && Number.isFinite(n))
    ) {
      throw new AiProviderError("bad_response", "Embeddings row is invalid");
    }
    slots[index] = embedding as number[];
  }
  return slots as number[][];
}

// --- Choosing the provider ---

// The single place that decides who answers. "mock" is the built-in fake for
// local work; "openai" needs a key.
export function getAiProvider(config: AiConfig): AiProvider {
  if (config.provider === "mock") return createDemoProvider();
  if (!config.apiKey) {
    throw new AiProviderError("not_configured", "No OpenAI key is set");
  }
  return createOpenAiProvider({
    apiKey: config.apiKey,
    model: config.model,
    embeddingModel: config.embeddingModel,
    reasoningEffort: config.reasoningEffort,
  });
}
