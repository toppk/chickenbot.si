// font files imported for their URL (Bun's file loader)
declare module '*.woff2' {
  const url: string;
  export default url;
}
