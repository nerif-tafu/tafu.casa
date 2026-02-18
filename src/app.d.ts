/// <reference types="@sveltejs/kit" />

declare module '*.txt?raw' {
  const content: string;
  export default content;
}

