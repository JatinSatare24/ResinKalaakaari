"use client"; // state, a form, fetch and focus handling: all browser-side

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AssistantProduct } from "@/lib/ai/assistant";
import {
  buildHistory,
  errorText,
  isHiddenPath,
} from "@/components/Assistant/chat-helpers";
import styles from "@/components/Assistant/AssistantWidget.module.css";

// --- Types ---

export type QuickReplyProp = { id: string; label: string; answer: string };

export interface AssistantWidgetProps {
  quickReplies: QuickReplyProp[];
  whatsappUrl: string; // a plain "I have a question" link to the shop
  maxMessageChars: number;
  historyLimit: number; // how many recent messages are sent along
}

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  products?: AssistantProduct[];
  whatsappUrl?: string | null;
  isError?: boolean; // shown, but never sent back to the server
};

// What /api/assistant answers on success.
type ChatSuccess = {
  reply: string;
  products: AssistantProduct[];
  whatsappUrl: string | null;
};

const REQUEST_TIMEOUT_MS = 30_000;

const GREETING =
  "Hi! I'm the shop's AI assistant. Ask me about our pieces, delivery, payment or custom orders.";

// --- Component ---

// A floating chat bubble. The conversation lives in this component's state
// only: nothing is stored in the browser or sent anywhere except the last few
// messages, when the customer asks something. Product rows are drawn from the
// data the server returns (name, price and link come from the database).
export default function AssistantWidget({
  quickReplies,
  whatsappUrl,
  maxMessageChars,
  historyLimit,
}: AssistantWidgetProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: "assistant", content: GREETING },
  ]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  const nextId = useRef(1);
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);

  // Cancel an in-flight request if the widget goes away.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Keep the newest message in view.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, pending, open]);

  // Move focus into the panel when it opens, and back to the bubble once it has
  // closed. This runs after the render, because while the panel is open the
  // bubble is hidden and cannot take focus yet.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else if (wasOpen.current) bubbleRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  function close() {
    setOpen(false);
  }

  if (isHiddenPath(pathname)) return null;

  const add = (message: Omit<Message, "id">) =>
    setMessages((prev) => [...prev, { ...message, id: nextId.current++ }]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;

    const history = buildHistory(messages, content, historyLimit);

    add({ role: "user", content });
    setDraft("");
    setPending(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });
      const data: unknown = await response.json().catch(() => null);
      const body = (data ?? {}) as Partial<ChatSuccess> & { error?: string };

      if (response.ok && typeof body.reply === "string") {
        add({
          role: "assistant",
          content: body.reply,
          products: Array.isArray(body.products) ? body.products : [],
          whatsappUrl: body.whatsappUrl ?? null,
        });
      } else {
        add({
          role: "assistant",
          content: errorText(response.status, body.error),
          isError: true,
        });
      }
    } catch {
      // Network failure or the 30 second timeout.
      add({
        role: "assistant",
        content: errorText(0, undefined),
        isError: true,
      });
    } finally {
      clearTimeout(timer);
      setPending(false);
      inputRef.current?.focus();
    }
  }

  // A quick reply is fixed shop text: no request, no cost, works offline from
  // the AI provider.
  function quickAnswer(reply: QuickReplyProp) {
    if (pending) return;
    add({ role: "user", content: reply.label });
    add({ role: "assistant", content: reply.answer });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  const hasAsked = messages.some((m) => m.role === "user");

  return (
    <>
      <button
        ref={bubbleRef}
        type="button"
        className={`${styles.bubble} ${open ? styles.bubbleHidden : ""}`}
        onClick={() => setOpen(true)}
        aria-label="Open the shop assistant chat"
        aria-expanded={open}
        aria-controls="assistant-panel"
      >
        {/* The common "AI" mark: a four-point star with a small one beside it. */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10 4 L12.1 10 L18 12 L12.1 14 L10 20 L7.9 14 L2 12 L7.9 10 Z" />
          <path d="M19 2.5 L19.8 4.7 L22 5.5 L19.8 6.3 L19 8.5 L18.2 6.3 L16 5.5 L18.2 4.7 Z" />
        </svg>
      </button>

      {open && (
        <section
          id="assistant-panel"
          className={styles.panel}
          role="dialog"
          aria-label="Shop assistant"
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <header className={styles.header}>
            <div>
              <h2 className={styles.title}>Shop assistant</h2>
              <p className={styles.notice}>
                AI assistant. It can make mistakes, so check the price on the
                product page. Please don&apos;t share personal details.
              </p>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={close}
              aria-label="Close the chat"
            >
              ✕
            </button>
          </header>

          <div
            ref={logRef}
            className={styles.log}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.message} ${
                  message.role === "user" ? styles.user : styles.assistant
                } ${message.isError ? styles.error : ""}`}
              >
                <p className={styles.text}>{message.content}</p>

                {message.products && message.products.length > 0 && (
                  <ul className={styles.products}>
                    {message.products.map((product) => (
                      <li key={product.id}>
                        <Link
                          href={`/products/${product.slug}`}
                          className={styles.productLink}
                          onClick={() => setOpen(false)}
                        >
                          <span>{product.name}</span>
                          <span className={styles.price}>
                            ₹{product.price.toLocaleString("en-IN")}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                {message.whatsappUrl && (
                  <a
                    href={message.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.handoff}
                  >
                    Send this to the shop on WhatsApp
                  </a>
                )}
              </div>
            ))}

            {pending && (
              <p className={styles.typing} role="status">
                Thinking…
              </p>
            )}
          </div>

          {!hasAsked && (
            <div className={styles.quick} aria-label="Quick questions">
              {quickReplies.map((reply) => (
                <button
                  key={reply.id}
                  type="button"
                  className={styles.chip}
                  onClick={() => quickAnswer(reply)}
                >
                  {reply.label}
                </button>
              ))}
            </div>
          )}

          <form className={styles.form} onSubmit={onSubmit}>
            <label htmlFor="assistant-input" className={styles.srOnly}>
              Your message
            </label>
            <textarea
              id="assistant-input"
              ref={inputRef}
              className={styles.input}
              rows={2}
              value={draft}
              maxLength={maxMessageChars}
              placeholder="Ask about a product or our policies…"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends, Shift+Enter makes a new line.
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(draft);
                }
              }}
            />
            <button
              type="submit"
              className={styles.send}
              disabled={pending || draft.trim() === ""}
            >
              Send
            </button>
          </form>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerLink}
          >
            Prefer a person? Message the shop on WhatsApp
          </a>
        </section>
      )}
    </>
  );
}
