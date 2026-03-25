/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Add other VITE_ variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
