import { initLocale } from "./utils/locale";
import { registerAiPanel, unregisterAiPanel } from "./modules/aiPanel";
import { createZToolkit } from "./utils/ztoolkit";

async function onStartup() {
  Zotero.debug("PaperNet: onStartup begin");
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  Zotero.debug("PaperNet: Zotero initialized");
  initLocale();

  // Register preference pane
  Zotero.PreferencePanes.register({
    pluginID: addon.data.config.addonID,
    src: rootURI + "content/preferences.xhtml",
    label: "PaperNet",
    image: `chrome://${addon.data.config.addonRef}/content/icons/favicon.png`,
  });
  Zotero.debug("PaperNet: preference pane registered");

  // Register AI panel
  Zotero.debug("PaperNet: registering AI panel");
  registerAiPanel();

  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  addon.data.initialized = true;
  Zotero.debug("PaperNet: onStartup completed");
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  addon.data.ztoolkit = createZToolkit();

  // Register stylesheet
  const doc = win.document;
  const existingLink = doc.querySelector(
    'link[href*="papernet/zoteroPane.css"]',
  );
  if (!existingLink) {
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = `chrome://${addon.data.config.addonRef}/content/zoteroPane.css`;
    doc.documentElement?.appendChild(link);
  }
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
}

function onShutdown(): void {
  unregisterAiPanel();
  ztoolkit.unregisterAll();
  addon.data.alive = false;
  // @ts-expect-error - Plugin instance is not typed
  delete Zotero[addon.data.config.addonInstance];
}

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
};
