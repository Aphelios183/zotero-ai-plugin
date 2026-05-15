import { config } from "../../package.json";

// Fallback translations in case Fluent l10n fails
const fallbackStrings: Record<string, Record<string, string>> = {
  "ai-panel-title": { "zh-CN": "AI 助手", "en-US": "AI Assistant" },
  "ai-panel-sidenav-tooltip": { "zh-CN": "PaperNet AI", "en-US": "PaperNet AI" },
  "ai-panel-studying": { "zh-CN": "正在研读论文...", "en-US": "Studying paper..." },
  "ai-panel-ready": { "zh-CN": "就绪", "en-US": "Ready" },
  "ai-panel-error": { "zh-CN": "发生错误", "en-US": "Error occurred" },
};

let _locale: Record<string, string> = {};

export function initLocale() {
  try {
    const localeService = (Components as any).classes[
      "@mozilla.org/intl/stringbundle;1"
    ].getService((Components as any).interfaces.nsIStringBundleService);
  } catch {
    // Zotero 7 Fluent-based l10n handles this
  }
}

export function getString(localString: string): string {
  try {
    // Try Fluent l10n first
    const result = (globalThis as any).Zotero?.Panes?.l10n?.formatValueSync?.(
      `${config.addonRef}-${localString}`,
    );
    if (result && result !== `${config.addonRef}-${localString}`) {
      return result;
    }
  } catch {
    // Ignore error
  }

  // Try fallback translations
  const locale = Zotero.locale || "en-US";
  if (fallbackStrings[localString]?.[locale]) {
    return fallbackStrings[localString][locale];
  }
  if (fallbackStrings[localString]?.["en-US"]) {
    return fallbackStrings[localString]["en-US"];
  }

  // Return a user-friendly string instead of raw key
  return localString.replace(/-/g, " ").replace(/^ai panel /i, "");
}

export function getLocaleID(localString: string): string {
  return `${config.addonRef}-${localString}`;
}
