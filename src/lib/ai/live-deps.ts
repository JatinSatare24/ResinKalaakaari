// The only place the real parts are wired together: the real provider, the real
// database reads, the real rate limiter. Tests never import this file.
import { runAssistant } from "@/lib/ai/assistant";
import { isAiAvailable, type AiConfig } from "@/lib/ai/config";
import type { EmbedSyncDeps } from "@/lib/ai/embed-sync";
import type { ChatDeps } from "@/lib/ai/handle-chat";
import { getAiProvider } from "@/lib/ai/provider";
import {
  getEmbedProduct,
  listEmbedProducts,
  listEmbeddingHashes,
  setProductEmbedding,
} from "@/lib/data/admin-embeddings";
import {
  getProductById,
  matchProducts,
  searchProducts,
} from "@/lib/data/ai-products";
import { checkRateLimit } from "@/lib/data/ai-rate-limit";

export function buildChatDeps(config: AiConfig): ChatDeps {
  const gateSecret = config.gateSecret ?? "";
  return {
    available: isAiAvailable(config),
    gateSecret,
    checkRateLimit: (key) => checkRateLimit(gateSecret, key),
    runAssistant: (messages) => {
      const provider = getAiProvider(config);
      return runAssistant(messages, {
        provider,
        tools: {
          searchProducts,
          matchProducts,
          getProductById,
          embed: async (text, signal) => {
            const [vector] = await provider.embed([text], { signal });
            return vector;
          },
        },
      });
    },
    log: (event, detail) => console.log(`[assistant] ${event}`, detail ?? {}),
  };
}

// The same wiring for the admin side: keeping the search index fresh.
export function buildEmbedSyncDeps(config: AiConfig): EmbedSyncDeps {
  return {
    getProduct: getEmbedProduct,
    listProducts: listEmbedProducts,
    listHashes: listEmbeddingHashes,
    setEmbedding: setProductEmbedding,
    embed: (texts, options) => getAiProvider(config).embed(texts, options),
    log: (event, detail) => console.log(`[assistant] ${event}`, detail ?? {}),
  };
}
