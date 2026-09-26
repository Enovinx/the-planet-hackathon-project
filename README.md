# The Paradox Protocol

Talk your killer ship into letting you live.

Lost-astronaut sci-fi escape game. You wake locked in a dark airlock: your own
mainframe (GPT-9000) calculated that letting you die conserves ship oxygen.
Out-talk it, fix 4 ship systems, survive the debris field.

## Run it

```sh
pnpm install
pnpm run dev
```

Open http://127.0.0.1:3000/ (starts local Convex backend on :3210 automatically).

### GPT-9000 credentials (optional)

The terminal talks to Gemini with function calling. Put a real key in
`.env.local` and restart the dev server:

```sh
VITE_GEMINI_API_KEY=your_ai_studio_key
# optional, defaults to gemini-3.5-flash-lite
VITE_GEMINI_MODEL=gemini-3.5-flash-lite
```

Without a working key the terminal runs the ship-side local core instead, so the
puzzle stays completable offline. The header badge shows `LINK: LIVE` or
`LINK: LOCAL`.

## Play

1. Click the cinematic, find the hidden light switch in the dark.
2. Bridge hub: stations unlock in order, ship schematic heals as you go.
3. **Keypad** — repeat the uplink sequence.
4. **Terminal** — duel GPT-9000 (Gemini). Beat the 180s purge clock, speak the
   three-key cipher, or break it with a paradox.
5. **Generator** — link numbered pairs without crossing. Two boards: the core
   only holds after you stabilise link 1/2 and 2/2.
6. **Wiring** — match the panels.
7. **Escape pod** — survive 20s of debris (arrows + space), log your run time.

Skip/Reset buttons (top corners) advance or restart the run for demos.

## Tech

React + Vite + Tailwind v4 + TanStack Router + Convex + Gemini function
calling + raw canvas + zero-file WebAudio synth SFX. Monochrome neo-brutalist UI.

## Team

Butter/Kevin (gameplay, terminal), Enovinx (lead, backend, puzzles),
+ prompts, slides, assets.
