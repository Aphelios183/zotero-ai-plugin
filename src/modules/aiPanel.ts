/**
 * AI Chat Panel — registers a reader sidebar section with a chat interface.
 */

import { getLocaleID, getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
import {
  extractPaperText,
  getItemMetadata,
  hasPdfAttachment,
} from "./pdfExtractor";
import { sendMessageStream, getStudyPrompt } from "./aiClient";

const PANEL_ID = "papernet-ai-panel";
let registered = false;

interface PanelState {
  currentItemId: number | null;
  isStudying: boolean;
  isSending: boolean;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

const state: PanelState = {
  currentItemId: null,
  isStudying: false,
  isSending: false,
  messages: [],
};

function getDoc(body: HTMLElement): Document {
  return body.ownerDocument!;
}

/**
 * Register the AI panel section in the item pane.
 */
export function registerAiPanel() {
  if (registered) return;

  try {
    Zotero.ItemPaneManager.registerSection({
      paneID: PANEL_ID,
      pluginID: addon.data.config.addonID,
      header: {
        l10nID: getLocaleID("ai-panel-title"),
        icon: "chrome://zotero/skin/16/universal/search.svg",
      },
      sidenav: {
        l10nID: getLocaleID("ai-panel-sidenav-tooltip"),
        icon: "chrome://zotero/skin/20/universal/search.svg",
      },
      bodyXHTML: `<html:div id="papernet-container" xmlns:html="http://www.w3.org/1999/xhtml" />`,
      onInit: ({ body }) => {
        buildChatUI(getDoc(body), body);
      },
      onItemChange: ({ item, setEnabled, tabType }) => {
        // Only enable in reader tab with a non-note item
        if (tabType === "reader" && item && !item.isNote()) {
          setEnabled(true);
        } else {
          setEnabled(false);
        }
        return true;
      },
      onRender: ({ body, item, setSectionSummary }) => {
        // Ensure UI is built
        const doc = getDoc(body);
        if (!doc.getElementById("papernet-panel")) {
          buildChatUI(doc, body);
        }
        return false;
      },
      onAsyncRender: async ({ body, item, setSectionSummary }) => {
        if (!item) return;
        if (item.id === state.currentItemId) return;

        const doc = getDoc(body);

        // New paper opened — reset state
        state.currentItemId = item.id;
        state.messages = [];
        state.isStudying = false;
        state.isSending = false;

        clearMessages(doc);
        addSystemMessage(doc, getString("ai-panel-studying"));
        setSectionSummary(getString("ai-panel-studying"));

        // Extract text and auto-study
        if (getPref("autoStudy")) {
          await studyPaper(doc, item, setSectionSummary);
        } else {
          clearMessages(doc);
          addSystemMessage(doc, getString("ai-panel-ready"));
          setSectionSummary(getString("ai-panel-ready"));
        }
      },
      onDestroy: () => {
        // cleanup
      },
      sectionButtons: [
        {
          type: "clear",
          icon: "chrome://zotero/skin/16/universal/empty-trash.svg",
          l10nID: getLocaleID("ai-panel-title"),
          onClick: ({ body }) => {
            state.messages = [];
            state.currentItemId = null;
            clearMessages(getDoc(body));
          },
        },
      ],
    });

    registered = true;
    Zotero.debug("PaperNet: AI panel registered successfully");
  } catch (e: any) {
    Zotero.logError(new Error(`PaperNet: Failed to register AI panel: ${e.message || e}`));
  }
}

/**
 * Unregister the AI panel.
 */
export function unregisterAiPanel() {
  if (registered) {
    Zotero.ItemPaneManager.unregisterSection(PANEL_ID);
    registered = false;
  }
}

/**
 * Build the chat UI inside the panel body.
 */
function buildChatUI(doc: Document, container: HTMLElement) {
  if (doc.getElementById("papernet-panel")) return;

  const panel = doc.createElement("div");
  panel.id = "papernet-panel";
  panel.className = "papernet-panel";

  // Messages area
  const messagesDiv = doc.createElement("div");
  messagesDiv.id = "papernet-messages";
  messagesDiv.className = "papernet-messages";

  // Input area
  const inputArea = doc.createElement("div");
  inputArea.className = "papernet-input-area";

  const textarea = doc.createElement("textarea");
  textarea.id = "papernet-input";
  textarea.className = "papernet-input";
  textarea.placeholder = "Ask about this paper...";
  textarea.rows = 2;

  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  });

  textarea.addEventListener("keydown", (e: Event) => {
    const ke = e as KeyboardEvent;
    if (ke.key === "Enter" && !ke.shiftKey) {
      e.preventDefault();
      handleSend(doc);
    }
  });

  const sendBtn = doc.createElement("button");
  sendBtn.id = "papernet-send-btn";
  sendBtn.className = "papernet-send-btn";
  sendBtn.textContent = "Send";
  sendBtn.addEventListener("click", () => handleSend(doc));

  inputArea.appendChild(textarea);
  inputArea.appendChild(sendBtn);

  const status = doc.createElement("div");
  status.id = "papernet-status";
  status.className = "papernet-status";

  panel.appendChild(messagesDiv);
  panel.appendChild(inputArea);
  panel.appendChild(status);

  container.appendChild(panel);
}

/**
 * Handle send button click / Enter key.
 */
async function handleSend(doc: Document) {
  const input = doc.getElementById("papernet-input") as HTMLTextAreaElement;
  if (!input) return;

  const question = input.value.trim();
  if (!question || state.isSending) return;

  input.value = "";
  input.style.height = "auto";

  state.messages.push({ role: "user", content: question });
  addUserMessage(doc, question);

  state.isSending = true;
  updateSendButton(doc, true);
  const aiMsgEl = addAiMessage(doc, "");

  try {
    const paperText = state.currentItemId
      ? addon.data.paperTexts.get(state.currentItemId) || ""
      : "";

    const response = await sendMessageStream(
      state.messages,
      paperText,
      (chunk) => {
        if (aiMsgEl) {
          const current = aiMsgEl.textContent || "";
          aiMsgEl.textContent = current + chunk;
          scrollToBottom(doc);
        }
      },
    );

    state.messages.push({ role: "assistant", content: response });
  } catch (e: any) {
    if (aiMsgEl) {
      aiMsgEl.textContent = `Error: ${e.message}`;
      aiMsgEl.style.color = "#cc0000";
    }
  } finally {
    state.isSending = false;
    updateSendButton(doc, false);
  }
}

/**
 * Study a paper: extract text, send study prompt to AI.
 */
async function studyPaper(
  doc: Document,
  item: Zotero.Item,
  setSectionSummary: (s: string) => string,
) {
  state.isStudying = true;

  try {
    const paperText = await extractPaperText(item);
    addon.data.paperTexts.set(item.id, paperText);

    if (!paperText) {
      clearMessages(doc);
      addSystemMessage(doc, "Could not extract text from this PDF.");
      setSectionSummary("No text extracted");
      return;
    }

    const metadata = getItemMetadata(item);
    const studyPrompt = getStudyPrompt(metadata);

    state.messages.push({ role: "user", content: studyPrompt });
    clearMessages(doc);

    const aiMsgEl = addAiMessage(doc, "");

    const response = await sendMessageStream(
      state.messages,
      paperText,
      (chunk) => {
        if (aiMsgEl) {
          const current = aiMsgEl.textContent || "";
          aiMsgEl.textContent = current + chunk;
          scrollToBottom(doc);
        }
      },
    );

    state.messages.push({ role: "assistant", content: response });
    setSectionSummary(getString("ai-panel-ready"));
  } catch (e: any) {
    Zotero.debug(`PaperNet: studyPaper error: ${e.message}`);
    Zotero.debug(`PaperNet: error stack: ${e.stack}`);
    clearMessages(doc);
    addSystemMessage(doc, `${getString("ai-panel-error")}: ${e.message}`);
    setSectionSummary(getString("ai-panel-error"));
  } finally {
    state.isStudying = false;
  }
}

// --- UI Helper Functions ---

function clearMessages(doc: Document) {
  const container = doc.getElementById("papernet-messages");
  if (container) {
    container.innerHTML = "";
  }
}

function addUserMessage(doc: Document, text: string): HTMLElement | null {
  const container = doc.getElementById("papernet-messages");
  if (!container) return null;

  const msg = doc.createElement("div");
  msg.className = "papernet-msg papernet-msg-user";
  msg.textContent = text;
  container.appendChild(msg);
  scrollToBottom(doc);
  return msg;
}

function addAiMessage(doc: Document, text: string): HTMLElement | null {
  const container = doc.getElementById("papernet-messages");
  if (!container) return null;

  const msg = doc.createElement("div");
  msg.className = "papernet-msg papernet-msg-ai";
  msg.textContent = text;
  container.appendChild(msg);
  scrollToBottom(doc);
  return msg;
}

function addSystemMessage(doc: Document, text: string): HTMLElement | null {
  const container = doc.getElementById("papernet-messages");
  if (!container) return null;

  const msg = doc.createElement("div");
  msg.className = "papernet-msg papernet-msg-system";
  msg.textContent = text;
  container.appendChild(msg);
  scrollToBottom(doc);
  return msg;
}

function scrollToBottom(doc: Document) {
  const container = doc.getElementById("papernet-messages");
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function updateSendButton(doc: Document, disabled: boolean) {
  const btn = doc.getElementById(
    "papernet-send-btn",
  ) as HTMLButtonElement | null;
  if (btn) {
    btn.disabled = disabled;
    btn.textContent = disabled ? "..." : "Send";
  }
}
