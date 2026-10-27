/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_ZEFIX_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
