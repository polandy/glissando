import type { InstallGuide } from "../../pwa/install-guide";

export type PwaSheetContent =
  | { readonly kind: "why"; readonly address: string }
  | { readonly kind: "guide"; readonly guide: InstallGuide };
