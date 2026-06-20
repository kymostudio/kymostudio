---
title: Durable Objects — what they are, how Connect AI uses them, and equivalents
document_id: DESIGN-KAI-004
version: "0.1"
issue_date: 2026-06-20
status: Informative
classification: Internal
owner: diagrams/ project
audience: Engineers onboarding to the Connect AI / editor backend who are new to Cloudflare Durable Objects
review_cycle: On scope change
supersedes: null
related_documents:
  - FEAT-KAI-001
  - DESIGN-KAI-001
  - DESIGN-KAI-003
  - FEAT-KLIVE-001
authors:
  - Vũ Anh
language: en
keywords:
  - durable-objects
  - cloudflare
  - actor-model
  - stateful-serverless
  - websocket
  - hibernation
  - userchannel
  - editorroom
  - orleans
  - dapr
---

# Durable Objects — what they are, how Connect AI uses them, and equivalents

| Field | Value |
|-------|-------|
| Document ID | `DESIGN-KAI-004` |
| Status | **Informative** (background note, not normative) |
| Context | Connect AI's `UserChannel` and the editor's `EditorRoom` are Cloudflare **Durable Objects**; this note explains the primitive for engineers new to it. See `DESIGN-KAI-001` / `DESIGN-KAI-003` for how Connect AI uses it. |

## 1. What a Durable Object is

A **Durable Object (DO)** is the **actor model on Cloudflare's edge**: a *stateful, name-addressable object with exactly one global instance, co-locating compute and its own durable storage*. It exists because Workers are **stateless and horizontally replicated** — they can't coordinate (a room, a counter, a live document) across instances. A DO is the one authoritative, stateful place per key that can.

Four core properties:

1. **Single-instance, single-threaded.** For a given id, **exactly one instance runs globally**, and it processes **one request at a time** (serialized). → strong consistency, no races, a natural lock/coordination point.
2. **State + co-located durable storage.** Each DO has its **own transactional KV/SQLite** (`ctx.storage`) next to the code; state survives requests, eviction, and restarts. Between requests it also keeps **in-memory** state (fast actor + durable backing).
3. **Addressable by id.** `idFromName("x")` / `newUniqueId()` → from **anywhere** in the Worker fleet you reach the **same** instance; the platform routes to wherever it lives.
4. **One geographic home + hibernation.** A DO lives at one PoP (migrates near first access); when idle it **hibernates** (frees memory) and **wakes** on the next request/WebSocket message, restoring from storage. The **WebSocket Hibernation API** lets it hold many sockets cheaply while idle.

**Trade-offs:** per-object throughput ceiling (single-threaded → scale by **sharding across many objects/keys**); one home (extra latency for far clients). Good for rooms/presence/counters/locks/small queues; not for bulk storage or analytics (use D1/R2/KV).

## 2. How Connect AI / the editor use them

Two DO classes, sharded by their natural key (so load spreads):

| DO | Key | Plane | Holds |
|----|-----|-------|-------|
| **`EditorRoom`** | diagram id | document | live source/title/kind, owner, the tabs open on that diagram; `edit_diagram` fan-out |
| **`UserChannel`** | user `email` | control | every open window of the user (WebSocket Hibernation), per-socket `{focusedAt,pinned,session,project,diagram}`, the `wait_for_user_message` **inbox**; routes control via `pickTarget` |

This is exactly the DO sweet spot: *one authoritative place per key that keeps live sockets + a little durable state, single-threaded*. The single-thread property is what makes `pickTarget` / pin routing race-free; the durable storage is what makes the prompt **inbox** survive; hibernation is what makes holding a socket per editor window cheap. Detail in `DESIGN-KAI-001` §2.

## 3. Equivalents on other platforms

No managed product is **1:1** — DO bundles *virtual actor + co-located storage + WebSocket realtime + edge*. By facet:

| Facet of DO | AWS | Google Cloud | Open source |
|-------------|-----|--------------|-------------|
| **Virtual actor** (1 instance/key, single-thread) | none native → run a framework on ECS/EKS | none native → run on GKE | **MS Orleans** (grains), **Akka/Apache Pekko** cluster sharding, **Dapr Actors**, **Erlang/OTP + Horde** |
| **State co-located with compute** | DynamoDB + Lambda (conditional writes to lock) | Firestore / Spanner | Redis (single-thread), FoundationDB |
| **Realtime / WebSocket fan-out + presence** | API Gateway WebSocket + DynamoDB (connection registry), or AppSync subscriptions | Firebase Realtime DB / Firestore listeners | Phoenix Channels, Centrifugo, Soketi (Pusher-compat), Socket.IO+Redis, NATS |
| **Durable execution** (the "durable" facet) | Step Functions | Cloud Workflows | Temporal/Cadence, Restate |
| **Stateful at the edge** | — (Lambda@Edge is stateless) | — | Deno KV (global, eventual; not single-instance) |

**Closest by *model*:** **Microsoft Orleans** — a "virtual actor / grain" is single-activation per id, persisted, single-threaded; DO is very Orleans-like. **Dapr Actors** lets you self-host the same shape on k8s.

**Closest by *use-case* (rooms/presence/inbox like ours):** managed — Liveblocks / Ably / Pusher; OSS — PartyKit (itself built **on** Cloudflare DO), ElectricSQL / Yjs+y-websocket (CRDT). To rebuild `EditorRoom`/`UserChannel` on AWS you'd use **API Gateway WebSocket + DynamoDB + Lambda**; on GCP, **Firebase/Firestore realtime listeners**.

> Bottom line: **DO ≈ "Orleans/Dapr virtual actor + co-located storage + WebSocket hibernation, served at the edge."** Its distinguishing trait — **stateful + single-instance right at the edge** — is the part no major platform matches with one product; elsewhere you compose it from pieces or self-host an actor framework.

## Annex A — Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-06-20 | Vũ Anh | Initial informative note: what a Durable Object is (4 properties + trade-offs), how `EditorRoom`/`UserChannel` use them, and AWS/GCP/OSS equivalents by facet. Supports `DESIGN-KAI-001`/`DESIGN-KAI-003`. |
