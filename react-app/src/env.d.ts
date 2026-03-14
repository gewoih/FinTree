/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Target URL for the backend API proxy used by the Vite dev server. */
  readonly VITE_API_PROXY_TARGET?: string;
  /** Legacy alias kept for backward compatibility with earlier local setups. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
