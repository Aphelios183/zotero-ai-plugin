/**
 * Anthropic-compatible API client with streaming support.
 */

import { getPref } from "../utils/prefs";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are an expert academic paper analysis assistant. Your role is to help researchers understand and analyze academic papers. You should:

1. When first studying a paper, provide a comprehensive summary including:
   - Main research question/objective
   - Key methodology
   - Major findings and contributions
   - Limitations
   - Significance to the field

2. When answering questions about the paper:
   - Reference specific sections, figures, or tables when relevant
   - Explain technical concepts clearly
   - Provide context for why certain methods were chosen
   - Compare with related work when appropriate
   - Be precise and cite specific parts of the paper

Always respond in the same language as the user's question.`;

/**
 * Get API configuration from Zotero preferences.
 */
function getApiConfig() {
  const apiKey = getPref("apiKey") as string;
  const baseUrl = getPref("apiBaseUrl") as string;
  const model = getPref("model") as string;

  Zotero.debug(`PaperNet: API config - baseUrl: ${baseUrl}, model: ${model}, apiKey length: ${apiKey?.length || 0}`);

  return {
    apiKey,
    baseUrl: baseUrl || "https://token-plan-cn.xiaomimimo.com/anthropic",
    model: model || "mimo-v2.5-pro",
  };
}

/**
 * Send a message to the Anthropic API with streaming.
 * Returns the full response text.
 * Calls onChunk for each streamed chunk.
 */
export async function sendMessageStream(
  messages: Message[],
  paperContext: string,
  onChunk: (text: string) => void,
): Promise<string> {
  const { apiKey, baseUrl, model } = getApiConfig();

  if (!apiKey) {
    throw new Error(
      "API key not set. Please configure it in PaperNet preferences.",
    );
  }

  // Build the system prompt with paper context
  const systemContent = paperContext
    ? `${SYSTEM_PROMPT}\n\n---\n\nThe following is the full text of the paper being discussed:\n\n${paperContext}`
    : SYSTEM_PROMPT;

  const url = `${baseUrl}/v1/messages`;
  Zotero.debug(`PaperNet: Sending request to ${url}`);

  const body = {
    model,
    max_tokens: 4096,
    system: systemContent,
    messages,
    stream: true,
  };

  try {
    const response = await Zotero.HTTP.request("POST", url, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      successCodes: false,
    });

    Zotero.debug(`PaperNet: Response status: ${response.status}`);

    if (response.status !== 200) {
      throw new Error(`API error ${response.status}: ${response.responseText || "No response"}`);
    }

    const responseText = response.responseText || "";

    // For non-streaming response
    try {
      const jsonResponse = JSON.parse(responseText);
      if (jsonResponse.content && jsonResponse.content[0]) {
        const text = jsonResponse.content[0].text || "";
        onChunk(text);
        return text;
      }
    } catch {
      // Try SSE parsing
    }

    // SSE parsing for streaming response
    let fullText = "";
    const lines = responseText.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);

        if (parsed.type === "content_block_delta") {
          const deltaText = parsed.delta?.text || "";
          if (deltaText) {
            fullText += deltaText;
            onChunk(deltaText);
          }
        }
      } catch {
        // Skip malformed JSON
      }
    }

    return fullText;
  } catch (e: any) {
    Zotero.debug(`PaperNet: fetch error: ${e.message}`);
    throw e;
  }
}

/**
 * Generate the initial "study paper" prompt.
 */
export function getStudyPrompt(metadata: string): string {
  return `Please analyze and summarize the following academic paper. Provide a comprehensive overview including the research question, methodology, key findings, contributions, and limitations.\n\nPaper metadata:\n${metadata}`;
}
