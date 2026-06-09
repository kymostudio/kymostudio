// Stateless deploy: the MCP live-sync (shared doc) needs the stateful Node
// server, so here it is a no-op stub — manual editing + render still work.
export const onRequest = () => Response.json({ source: null });
