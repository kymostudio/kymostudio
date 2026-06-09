// esbuild's `text` loader inlines `.kymo` / `.bpmn` files as string default
// exports at build time; declare them so TypeScript accepts the imports.
declare module "*.kymo" {
  const content: string;
  export default content;
}
declare module "*.bpmn" {
  const content: string;
  export default content;
}
