# Design note: SketchParty

A real-time multiplayer drawing and guessing game. Node.js (Express + Socket.IO) server, React client. The server is the single source of truth for the word, the clock, guess checking and scoring, and each client only receives a personalised view. Game state lives in server memory (no database).

## 1. How the canvas is synced and how stroke data is sent

The canvas is not a bitmap that gets copied around. It is an **ordered list of operations** kept on the server (`room.ops`) and rebuilt identically on every client:

- `stroke`: `{id, tool, color, size, pts[]}`
- `fill`: `{x, y, color}`

The drawer's client sends small events over the WebSocket: `start` (first point + brush), `pts` (a batch of up to 40 points, flushed every ~30 ms), `end`, `fill`, `undo` and `clear`. The drawer renders every point **locally first**, so their own drawing has zero lag. The server validates each event, applies it to `room.ops`, stamps it with a sequence number, and relays it to everyone except the drawer.

Other clients apply the same events to their own op list and draw only the new segment (no full redraw), so strokes appear as they are drawn. Undo and clear just pop or reset the op list and redraw.

- **Late joiners and refreshes** receive a `canvas:snapshot` (`{seq, ops}`) on join and then keep applying live events from that `seq`.
- **Fill** is computed on each client from the op list (scanline flood fill on the 800x600 canvas), so the server only stores `{x, y, color}`, not pixels.
- **Replay** is the server's per-turn event log (every event with a timestamp relative to when drawing started, including undo and clear). The end-of-game screen plays it back through the same render code, with long pauses squashed.

## 2. Latency and ordering

- **Transport:** WebSocket (long-polling is only a fallback), with `perMessageDeflate` off because the messages are tiny and compression would cost more CPU than it saves.
- **Ordering:** a single connection per client preserves order, and the server assigns one increasing `seq` per turn. Clients apply events strictly in `seq` order. If a client sees a gap (`seq > last + 1`) it ignores further events and asks for a `canvas:resync` snapshot; duplicates (`seq <= last`) are dropped.
- **Batching:** points are batched every 30 ms (about 33 messages per second per drawer) instead of one message per mouse move, and the browser's coalesced pointer events keep fast strokes detailed.
- **Drawer feedback:** the drawer renders locally. If the server drops one of their events because of the rate limit, it sends the drawer a snapshot 400 ms later so their canvas converges.
- **Clock:** the server owns the timer. Each state message carries `serverNow` and `phaseEndsAt`, and clients display `phaseEndsAt - (Date.now() + offset)`, so a wrong local clock does not change the countdown.
- **Scoring uses server time only:** the points for a guess depend on how much of the turn is left when the *server* receives it, so a player's own clock cannot affect the score.

## 3. What happens when the server restarts

Everything lives in memory, so **a restart ends all games**. This is a deliberate trade-off for the scope of the assignment (no database, one process).

What users see: Socket.IO reconnects automatically, the client tries to rejoin with its saved token, the server answers "Room not found", and the client shows "This room has ended" with a button to start a new room. Nobody is left on a frozen screen. The `SIGTERM` handler logs that rooms are being dropped.

What I would do for production: keep room state in Redis (it is small: settings, players and their rejoin tokens, scores, phase, word, deadline, op list), rebuild timers from the stored deadlines, and use sticky routing by room id so any instance could resume a room. Because the tokens would then be part of the stored room state, players could rejoin through a different instance.

## 4. How many rooms one server instance can handle, and how I measured it

**Answer: about 100 rooms (400 players) comfortably on my machine, with a ceiling of about 150 rooms (600 players), where the server's single Node thread saturates.** This is a worst case, because in every room one player draws non-stop.

**Test machine:** Windows 11, Intel Celeron N4020 @ 1.10 GHz (2 cores), 4 GB RAM, Node v23.3.0.

**How I measured it.** `npm run loadtest` starts a fresh server for each step and creates N rooms with 4 bots each. In every room, one bot continuously draws (about 66 points per second, about 33 messages per second) and the other three bots send a chat message every 3 to 4 seconds. After a 3-second warm-up, it measures for 20 seconds. Every bot also pings the server once per second, and the time until the reply arrives is the round-trip time (RTT). CPU, memory and event-loop lag come from the server's own `/metrics` endpoint.

Result of the second of two runs (same machine, same settings):

| Rooms | Players | RTT p50 | RTT p95 | Server CPU (1 core = 100%) | Event-loop lag p99 | Verdict |
|------:|--------:|--------:|--------:|---------------------------:|-------------------:|---------|
| 50 | 200 | 5 ms | 15 ms | 9% | 22 ms | Very comfortable |
| 100 | 400 | 17 ms | 29 ms | 60% | 28 ms | Comfortable |
| 150 | 600 | 89 ms | 253 ms | 98% | 118 ms | Saturated |
| 200 | 800 | 126 ms | 209 ms | 98% | 117 ms | Saturated |

**Reading it.** Up to 100 rooms the server has spare capacity. At 150 rooms CPU reaches 98%, so there is no headroom left, and p95 delay jumps from 29 ms to 253 ms. At 200 rooms the server is still at 98% CPU. I treat 150 and above simply as "saturated": at saturation the latency figures are noisy (p95 at 200 rooms is lower than at 150 while p50 is higher), so I do not read anything into small differences there.

**The first run agreed.** It also showed 100 rooms as comfortable (p95 about 80 ms, 52% CPU) and 200 rooms as saturated (100% CPU). Its 50-room step had a one-off spike (p95 758 ms), which did not repeat in the second run. At 400 rooms the server was clearly overloaded (p95 about 6.5 s, setup took 130 s, and only about 1,380 of the 1,600 connections were open).

**Caveats.**
- The load generator runs on the same machine as the server (as a separate process), so a dedicated server would probably do somewhat better. The generator is also a single Node process, so some of the measured delay at high load may come from the generator itself, not only from the server.
- Real players pause and think while drawing, so real traffic per room is lower than in this test.
- This measures one instance on one machine; it is not a production capacity claim.

**Why it saturates and how to go further.** Each stroke message is copied to the other 3 players in the room, so the server sends about 3 messages for every one it receives (at 150 rooms: about 5,070 in and 15,500 out per second), all on one thread. Rooms never share state, so the way to scale is to run several instances and route each room to one of them by room id. Cheaper fan-out (smaller or less frequent updates) would also raise the ceiling.

## 5. Other robustness choices

- **Server authority:** the secret word is only sent to the drawer (and to everyone once the turn ends). Guesses are checked, and points awarded, only on the server. Drawing events are accepted only from the current drawer.
- **Drawer leaves:** a dropped drawer gets 8 s to come back (for example after a refresh). After that the turn ends, guessers keep the points already earned, and the next turn starts. If fewer than 2 players remain, the game ends.
- **Reconnect:** each player gets a secret token on joining. A refresh or a drop of up to 30 s rejoins with the same score; after that the seat is released.
- **Abuse protection:** per-socket flood limiter (300 events burst, 200 per second sustained, disconnect after repeated violations); 16 KB maximum message size; chat limited to 100 characters and about 1 message per second (burst of 4); strokes limited to 40 points per message, 3,000 points per stroke, 60,000 points per turn and 600 operations; a points-per-second limit; names limited to 20 characters; 12 players per room (configurable with `MAX_PLAYERS`); 5,000 rooms per server; room create and join attempts are rate limited.
