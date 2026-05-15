import { config } from "../package.json";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";

class Addon {
  public data: {
    alive: boolean;
    config: typeof config;
    env: "development" | "production";
    initialized?: boolean;
    ztoolkit: ZToolkit;
    paperTexts: Map<number, string>;
    conversations: Map<number, Array<{ role: string; content: string }>>;
  };
  public hooks: typeof hooks;
  public api: object;

  constructor() {
    this.data = {
      alive: true,
      config,
      env: __env__,
      initialized: false,
      ztoolkit: createZToolkit(),
      paperTexts: new Map(),
      conversations: new Map(),
    };
    this.hooks = hooks;
    this.api = {};
  }
}

export default Addon;
