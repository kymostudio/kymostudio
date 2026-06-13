// Hand-written cover for the emscripten glue (build.sh output has no types).
declare function factory(options?: Record<string, unknown>): Promise<unknown>;
export default factory;
