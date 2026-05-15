import { zoteroConfig } from "@zotero-plugin/eslint-config";

export default [
  ...zoteroConfig,
  {
    ignores: ["build/**", ".scaffold/**", "addon/**"],
  },
];
