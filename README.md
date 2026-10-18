# SketchParty

A real-time multiplayer drawing and guessing game (Skribbl.io style). One player gets a secret word and draws it, everyone else guesses in chat, and faster correct guesses earn more points.

**Stack:** Node.js + Express + Socket.IO on the server, React (Vite) on the client. No database. Game state lives in server memory.

## Run it (one command)

```bash
npm install && npm start
```

Then open <http://localhost:3001>. Needs Node 18+.

`npm start` builds the React client and serves it from the same Node process, so there is one port and no CORS to deal with.

Alternatively, with Docker: `docker compose up` (same URL).

🎮 Live Application: [Play SketchParty](https://sketchparty-swapna.netlify.app/)

### Playing with 3+ players locally

1. Open <http://localhost:3001> in a browser, enter a name and click **Create a room**.
2. Copy the invite link from the lobby and open it in other browser windows. Every tab or window is its own player (a refresh keeps your seat for 30 s), so separate tabs, windows, different browsers or incognito all work.
3. The host sets rounds, draw time and an optional custom word list, then clicks **Start game**.

On a LAN, other devices can join using `http://<your-ip>:3001/r/<ROOM>`.

### What keeps your seat and score (and what doesn't)

| What you do | Result |
|---|---|
| Refresh the tab | Same player, score kept |
| Network drops, then comes back | Same player, score kept (up to 30 s) |
| Close the tab, reopen the room link within 30 s and click **Rejoin room** | Same player, score kept |
| Away for more than 30 s | Seat is released; joining again starts at 0 |
| Click **Leave room / Leave game** | You gave up the seat on purpose; joining again starts at 0 |
| Open the link in a second tab while the first is open | The second tab is a separate player |

### Other commands

| Command | What it does |
|---|---|
| `npm run dev` | Hot-reload dev mode: Vite on :5173 (proxying sockets to the server on :3001) |
| `npm test` | Starts a real server and runs 46 end-to-end checks with 4-5 socket clients |
| `npm run loadtest -- --steps 50,200 --secs 20` | Capacity test with bot players (see `NOTES.md`) |

## Features

- Rooms with shareable links (`/r/ABC123`); host sets rounds (1-10), draw time (20-240 s) and a custom word list
- Pen, 12 colours + colour picker, 4 brush sizes, eraser, flood fill, undo (button or Ctrl/Cmd+Z) and clear
- Strokes are drawn instantly for the drawer and streamed to everyone in ~30 ms batches
- Turn flow: drawer picks 1 of 3 words, countdown starts, letter hints reveal at 40/60/80% of the time, the round ends on timeout or when everyone has guessed
- Server is the authority for the word, the clock, guess checking and scoring
- Players who already guessed chat in a private channel with the drawer; the drawer talks to everyone but the server blocks any message containing the word. Lobby chat, join announcements and recent chat history for late joiners are included
- Near-misses show "close!" to the guesser only
- Mid-round joiners get the canvas as it stands; refresh or drop for up to 30 s and you rejoin with your score
- If the drawer leaves, the turn is skipped after 8 s and the game moves on
- Built for phones: players strip above the canvas, finger-sized tools in three rows, touch drawing, 👍/👎 on the canvas, chat right under the canvas with a big full-width Send button that scrolls into view above the keyboard
- Rate limiting and size limits on chat, strokes and every socket message
- Pick an avatar from a horizontally scrollable row of 24 animals, or press the 🎲 on the right for a random one; avatars are unique per room
- A dictionary of 3,100+ ordinary, drawable words across a wide range (animals, birds, fish, food, drinks, plants, objects, tools, clothing, vehicles, buildings, places, nature, jobs, instruments, sports...) in easy / medium / hard tiers, or the host can supply a custom list. Each room remembers every word it has offered, so nothing repeats for 300+ turns (a 10-round game with 12 players is only 120 turns); a tier only refills once all of its words have been shown
- 👍 / 👎 buttons on the canvas while drawing (and at turn end), with floating reactions and a chat line
- Winner podium with crown and confetti, ranks (#1, #2, #3…), points counting up with a floating +N on the scoreboard, and the final ranking revealed one by one from highest to lowest
- Players who guess correctly turn green (scoreboard and turn-end list). The word is never shown in chat, and stays hidden from everyone except the drawer until the turn ends. Anyone who already guessed chats privately (light green), cannot type the word, and cannot score again. Near-misses show a yellow "is close!" to the guesser only
- Up to 12 players per room (set `MAX_PLAYERS=16 npm start` to change, max 20)
- Turn-end screen lists every player with the points they earned and their total
- Stroke-by-stroke replay of every drawing on the final screen

## Project layout

```
server/src/index.js    Express + Socket.IO wiring, /metrics, per-socket flood limiter
server/src/game.js     Room: state machine, timers, scoring, drawing validation, per-player views
server/src/limits.js   Token bucket and all tunable limits
server/test/smoke.js   End-to-end authority/recovery tests
server/test/loadtest.js  Bot-driven capacity test
client/src/canvasModel.js  Canvas = ordered list of ops (strokes/fills), flood fill
client/src/canvasStore.js  Long-lived canvas fed from the socket, in-order with gap detection
client/src/components/     Home, Lobby, Game, Board, Toolbar, Chat, Players, GameEnd, Replay
NOTES.md               Design note: sync, latency/ordering, restart behaviour, capacity
```

## How the server stays the authority

- The word is only ever sent to the drawer, and to everyone once the turn has ended (players who guess it see the letters stay hidden until then). `room.stateFor(player)` builds a personalised view for each socket; there is no shared payload that contains the word.
- Guesses are sent as chat; the server compares them. The client never learns whether a wrong guess was "close" except through a message addressed to that player alone.
- Scores, timers, hints and turn order are computed on the server. The client has no event that can change any of them.
- Drawing events are accepted only from the current drawer during the drawing phase, then validated (coordinates in bounds, colour is `#rrggbb`, size 1-60, point and op counts capped) before being relayed.
- A reconnect needs the per-player secret token issued at join time, so a seat cannot be taken over by guessing a player id.
