# Design note: SketchParty

## How the canvas is synced and how strokes are sent

The canvas is not a bitmap that gets copied around. It is an **ordered list of operations** kept on the server (`room.ops`) and rebuilt identically on every client:

- `stroke`: `{id, tool, color, size, pts[]}`
- `fill`: `{x, y, color}`

The drawer's client sends small events over the WebSocket: `start` (first point + brush), `pts` (a batch of up to 40 points, flushed every ~30 ms), `end`, `fill`, `undo`, `clear`. The drawer renders every point **locally first**, so their own drawing has zero lag. The server validates each event, applies it to `room.ops`, stamps it with a room-wide sequence number, and relays it to everyone except the drawer.

Other clients apply events to the same op list and draw only the new segment (no full redraw), so strokes appear as they are drawn. Undo and clear just pop/reset the op list and redraw.

- **Late joiners and refreshes** receive a `canvas:snapshot` (`{seq, ops}`) on join and keep applying live events from that `seq`.
- **Fill** is computed on each client from the op list (scanline flood fill on the 800x600 canvas), so the server only stores `{x, y, color}`, not pixels.
- **Replay** is the server's per-turn event log (every event with a timestamp since the turn began, including undo/clear). The end-of-game screen plays it back through the same render code, with long pauses squashed.

## Latency and ordering

- **Transport:** WebSocket, with `perMessageDeflate` off (messages are tiny, so compression costs more CPU than it saves).
- **Ordering:** a single TCP connection per client preserves order, and the server assigns one monotonically increasing `seq` per room. Clients apply events strictly in `seq` order. If a client sees a gap (`seq > last + 1`) it ignores further events and asks for a `canvas:resync` snapshot; duplicates (`seq <= last`) are dropped.
- **Batching:** points are batched every 30 ms (about 33 messages/s per drawer) instead of one message per mouse move, and browsers' coalesced pointer events are used so fast strokes still keep their detail.
- **Drawer feedback:** drawer renders locally. If the server drops one of their events (rate limit), it sends the drawer a snapshot 400 ms later so their canvas converges.
- **Clock:** the server owns the timer. Each state message carries `serverNow` and `phaseEndsAt`, and clients display `phaseEndsAt - (Date.now() + offset)`, so a wrong local clock does not change the countdown.
- **Scoring uses server time only:** the points for a guess are based on how much of the turn is left when the *server* receives it, so network lag does not matter beyond actual arrival order.

## What happens when the server restarts

Everything lives in memory, so **a restart ends all games**. This is a deliberate trade-off for the scope of the assignment (no DB, one process).

What users see: Socket.IO reconnects automatically, the client tries to rejoin with its saved token, the server replies "room not found", and the client shows "This room has ended" with a button to start a new room. Nobody is left on a frozen screen. The `SIGTERM` handler logs that rooms are being dropped.

What I would do for production: keep room state in Redis (it is small: settings, players, scores, phase, word, deadline, op list) with the timers rebuilt from stored deadlines, and use sticky routing by room id (or a Redis adapter) so any instance can resume a room. Rejoin tokens already work across processes because they are just stored on the player record.

## Other robustness choices

- **Drawer leaves:** a dropped drawer gets 8 s to come back (page refresh). After that the turn ends with reason `drawer_left`, guessers keep points already earned, and the next turn starts. If the drawer explicitly leaves, or is removed after 30 s, the same path runs. If fewer than 2 players remain, the game ends.
- **Host leaves:** host moves to the next connected player.
- **Disconnected guessers do not block** "everyone has guessed", and players who are mid-reconnect are skipped when picking the next drawer.
- **Abuse protection:** per-socket flood limiter (300 events burst, 200/s sustained, disconnect after repeated violations); `maxHttpBufferSize` 16 KB per message; chat 100 chars and ~1 msg/s; strokes limited to 40 points per message, 3,000 points per stroke, 60,000 points per turn, 600 ops, 12,000 log events; points/s token bucket; names 20 chars; 12 players per room; 5,000 rooms per server; room create/join attempts rate limited.

## Capacity: how many rooms one instance can handle, and how I measured it

`npm run loadtest` starts a **fresh server for each step**, creates N rooms of 4 bots (one drawer streaming ~66 points/s in ~33 messages/s, three guessers chatting every ~3 s), and every bot also pings the server once per second to measure round-trip time. It reports RTT percentiles, server CPU, event-loop lag, memory and message throughput from `/metrics`.

**Results in the sandbox I developed in (1 CPU core shared by the server AND all the bots, Node 22):**

| Rooms (players) | RTT p50 / p95 / p99 | Server CPU | Loop lag p99 | RSS |
|---|---|---|---|---|
| 10 (40) | 2 / 25 / 27 ms | 12% | 16 ms | 81 MB |
| 50 (200) | 3 / 32 / 44 ms | 25% | 15 ms | 104 MB |
| 200 (800) | 40 / 131 / 256 ms | 54% | 84 ms | 150 MB |
| 300 (1,200) | 136 / 459 / 490 ms | 55% | 270 ms | 207 MB |
| 400 (1,600) | 236 / 700 / 806 ms | 58% | 980 ms | 266 MB |

**Reading it:** on this machine, latency stays comfortable (p95 well under 150 ms) up to about **200 busy rooms** with every room's drawer drawing continuously. Past that, the single core is saturated (the bots take roughly half of it), and latency climbs steeply. Real games are far lighter than this test because drawers pause, so a quiet-room mix would carry more.

**Honest caveats:** these numbers come from a 1-core container with the load generator on the same core, so they are a conservative lower bound for a dedicated server. Re-run on your own hardware (`npm run loadtest -- --steps 100,200,400,800 --secs 20`, or point it at another machine with `--url`). The bottleneck is CPU on one Node thread (fan-out of stroke messages is about 3 outgoing messages per incoming one), so the way to scale beyond one process is more instances with sticky routing by room id, since rooms never talk to each other.
