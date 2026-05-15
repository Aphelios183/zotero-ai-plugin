import { config } from "../../package.json";

export function getPref(
  key: string,
): string | boolean | number | undefined {
  return Zotero.Prefs.get(`${config.prefsPrefix}.${key}`, true);
}

export function setPref(key: string, value: string | boolean | number) {
  Zotero.Prefs.set(`${config.prefsPrefix}.${key}`, value, true);
}
