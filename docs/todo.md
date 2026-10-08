# To do

Ideas, known gaps and open questions. Nothing here is scheduled; we decide on each as we go.
"Original maintainer" items are from the creator's reply after the first polish release.

## Music

Today: three 4-chord loops (`web/content/music.ts`: easy, jazz, blue), picked per mood with a tempo
(`web/content/moods.ts`), plus random comping, the bass fifth and sparse pentatonic notes. Within a
mood the same four chords repeat, and the style and tempo can switch every 4 bars, which sounds
abrupt.

The original maintainer's view: repetition is the genre; lofi works because the harmony loops while
the surface keeps changing. So arrangement and song form come before more chords. In order of
payoff:

1. **Arrangement over time.** Mute and bring back layers on phrase boundaries: drums out for two
   bars, a filter sweep into the next section, the bass dropping out, a kick-only bar, a small drum
   fill every 8 bars. A, B and breakdown sections give form even with the same chords.
2. **Songs, not a stream.** A seeded "song" every two or three minutes, each with its own key,
   tempo, progression and motif. End each with a gap, extra crackle and a needle lift; a new key is
   what makes a listener hear a new track. The jukebox could show "track 4" or a made-up title.
   Seeded, so every song is reproducible in tests.
3. **A motif per song.** Three to five notes from chord tones, stated in A and varied in B. The
   random pentatonic notes are filler next to that.
4. **Mood shapes the music; it doesn't swap the track.** Mood picks the next song from a pool tagged
   by mood, and meanwhile adjusts density, swing, filter cutoff and percussion in the current one.
   Also gives the moods that share a loop (cheery, smitten and frazzled all play `jazz`; content and
   sleepy both play `easy`) their own character.
5. **Small touches:** varied chord inversions with smooth voice-leading, bass approach notes into
   each chord change, ghost notes on the snare, velocity that follows the phrase.
6. **Spatial muffle.** Tie the lowpass "muffle" to where the jukebox is relative to the camera, so
   the music opens up when you orbit round to face it.
7. **Status-bar note on the beat.** The note could pulse on the kick, like the jukebox glow in the
   scene already does (`lofi.pulse`). From the original handoff.

8. **Stalled Web Audio.** On some phones Chromium's live Web Audio output never starts: the
   context says "running" but its clock barely moves, then it suspends itself. Seen on an old
   LineageOS phone with Magisk and ViPER4Android, in Chrome and Brave on http and https; Firefox,
   `<audio>` and YouTube worked. Offline rendering played through `<audio>` did work there, so a
   fallback is possible: detect the stalled clock after the tap, then render the music a few bars at
   a time offline. Not worth it unless ordinary visitors report silence. `/audio-test` (dev only:
   `bun --port=3000 web/index.html web/audio-test.html`) reproduces and diagnoses it.

Our earlier ideas, mostly covered above: more progressions per style rotating every 4–8 bars; own
loops for moods that share one; a motif per loop; A/B song form.

## Before the brain server

The original maintainer's advice. Keep: the page owns the simulation (positions, the order
lifecycle, physics) and the brain is a director that sends intents; keep the brain out of the
bodies.

- **Decide whether the bar is shared or per visitor.** The big one; settle it before writing the
  server. Today every browser runs its own bar. If Chickenbot is one character with one mood, the
  server owns the story state (mood, the chat log, patrons created from chat, music on/off) and
  broadcasts it, while each browser simulates the background crowd locally from a shared seed.
- **Identity.** Chat arrives `from: "you"`. A real server needs a per-visitor id and display name,
  and the "you" patron becomes each visitor's own avatar.
- **Waiting for slow replies.** Model replies take seconds. After a chat, show Chickenbot thinking
  (looking at the speaker, a "…" bubble, polishing a glass) until a `say` arrives or a timeout
  passes: a `{type:"thinking"}` message, or a client-side default.
- **Autopilot on disconnect.** If a server sends `auto:false` and then drops, the bar stays on
  manual and stalls. Turn autopilot back on when the link closes. Confirmed: `ws.onclose` in
  `web/brain/link.ts` doesn't.
- **Ids, not names.** `serve {to: name}` is ambiguous once two visitors share a name.
- **Protocol housekeeping.** The server replies to `hello` with its version and capabilities; events
  get sequence numbers; state changes are sent as they happen instead of a full snapshot every 5 s.
- **Public chat going into a model.** Rate limits and length caps, moderation, and a guard against
  prompt injection. Server text only reaches the page as text: checked, `say` uses `textContent` and
  chat lines are text nodes; keep it that way.
- **Keep the local brain** as offline mode, and as the "body" layer (glances, polishing, small
  reactions) even when a server is connected. Give both the same voice, so dropping to offline
  isn't noticeable.
- The server itself goes in `server/`, speaking `shared/protocol.ts`, behind
  `wss://chickenbot.si/brain`. Needs infra review, and `connect-src` in the production CSP.

## Look and feel

Open questions from the original maintainer, who hadn't seen the live site:

- **Art Rows.** 414 is much finer than the original, which drew about 230–280 rows in the Claude
  panel; much of its coziness came from chunky pixels, thick ink lines relative to the figures and a
  coarse hatch. He'd try 260–300. Compare with `?rows=280`.
- **Jukebox in silence.** He'd let it idle dim with its bubbles still rising, and brighten when music
  plays, since its glow and motion were part of the room's warmth. Undecided.
- **Auto-orbit.** He found the slow continuous drift a living screensaver, and the steps with holds
  more like a slideshow. Owner's choice for now: keep the pauses. With the world not spinning you
  appreciate the scene more and can see how alive it is. `step=0` gives the continuous drift.
- **Debug look.** The original request was a site that looks like a debug render; he suggested
  keeping the frame-time tab visible to visitors. It already is (the "Show" tab top right).

## Status bar

- **Rename `hud` to `status-bar`** in the markup, CSS and `ui/hud.ts`, to match what we call it.
- **Raised minimum font sizes.** A browser minimum font size above 6px enlarges the phone labels past
  their cells. Drop or shrink the labels when they don't fit.
- **The empty wood either side** of the centred cells on wide screens. The handoff suggested brass
  screw-heads or a nameplate, and no more data.

## View

- **Portrait framing.** On tall phones the room fits the width with a lot of empty space above and
  below. Allow some cropping of the sides on tall screens so the bar shows larger.
- **Art Rows steps.** The scale is a whole number of device pixels, so some screens jump between
  levels of detail (e.g. 331 → 414 rows on a 1655px-tall stage) with nothing in between.

## Process

- **Dependabot** with a 14-day cooldown, instead of manual dependency and action updates.
- **Delete `docs/handoff-original.md`.** Its four items are done; keep it only while its reasoning
  is still useful.
