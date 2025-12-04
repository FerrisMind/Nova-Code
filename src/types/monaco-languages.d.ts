import type { languages } from 'monaco-editor';

declare module 'monaco-editor/esm/vs/basic-languages/rust/rust.js' {
  export const language: languages.IMonarchLanguage;
}

declare module 'monaco-editor/esm/vs/basic-languages/ini/ini.js' {
  export const language: languages.IMonarchLanguage;
}

declare module 'monaco-editor/esm/vs/basic-languages/python/python.js' {
  export const language: languages.IMonarchLanguage;
}

declare module 'monaco-editor/esm/vs/basic-languages/*' {
  export const language: languages.IMonarchLanguage;
}
