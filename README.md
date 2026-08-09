# benten

*Benten — the Japanese goddess of music, eloquence, and everything that flows —
is the patron of this repo. She watches over anything that moves like water:
sound, language, the arts.*

This is a workshop for my musical life. Not a course to finish and not an app to
ship — a place to keep the stuff that would otherwise scatter across notebooks,
phone memos, and half-remembered practice sessions. Think of it as a luthier's
bench rather than a textbook: raw wood, jigs, a drawer of offcuts you keep because
one of them will turn out to be the neck of something later.

Everything here is plain Markdown — open a file, add to it, commit. The structure
below is a set of drawers, not a syllabus; fill the ones you're using and ignore the
rest until you need them. There's now also an optional local app (see
[The app](#the-app-optional)) for the things a notebook can't do, but the drawers
never depend on it.

## The drawers

| Folder | What lives here |
|---|---|
| [`theory/`](./theory) | Music theory as I actually learn it — intervals, scales, modes, harmony, rhythm. The *why* under the fingers. |
| [`instruments/`](./instruments) | One drawer per instrument: guitar, piano, ukulele, mandolin, bass, saxophone. Technique notes, tunings, songs in progress, and a practice log for each. |
| [`riffs/`](./riffs) | The riff library — the offcuts drawer. Short musical ideas, licks, and phrases, captured before they evaporate. |
| [`composition/`](./composition) | Writing music: song sketches, chord progressions, arrangement notes, lyrics, form. |
| [`recording/`](./recording) | Capturing sound — mic technique, signal chains, session notes, gear. |
| [`production/`](./production) | Editing, mixing, and home-production technique — the work that happens after the take. |

Two logs sit at the root and cut across all of it:

- [`practice-log.md`](./practice-log.md) — a running record of what I actually did, dated newest-first. The single most honest file in the repo.
- Each instrument keeps its own `practice-log.md` too, for the detail that only makes sense in context.

## The app (optional)

The drawers work on their own — open a file and write, forever. But some things a
notebook can't do: hear a chord, see a scale laid across the fretboard, catch a mic
take. Those live in a small **local web app** that sits on top of these same drawers.
It's optional by design; the bench never depends on it.

Run it:

```sh
uv sync
uv run benten        # http://127.0.0.1:8788
```

First module up is **Chords & scales**: pick a key, build a progression (click the
in-key palette or type symbols like `Am7`, `D9`, `Cmaj7`), and get the scales that fit
each chord and the whole thing — with the chords that step outside the key flagged.
Click a scale to see it laid across a guitar fretboard, then save the result straight
into `composition/` as plain Markdown. Nothing it writes is anything you couldn't have
typed by hand — that's the rule. It plays, too: click a chord to hear it, or loop the
whole progression against a metronome and solo over it.

The **Studio** module is where a take gets caught. Enable the mic, pick your input,
and record — the take lands as a plain WAV in a local, git-ignored `audio/` folder,
never committed, only referenced from your notes by path. Loop any take as a backing
track and overdub a lead over it — jam with yourself — with a latency offset to nudge
the overdub back into time. When you're done, write a session note straight into
`recording/sessions/` with the take list attached, and send any keeper to the
[`riffs/`](./riffs) drawer. Serious mixing still belongs in your DAW; this is the bench
where the performance becomes a fact.

The **Tabs** module goes and finds the tablature. Type a song or an artist, and it
searches [Songsterr](https://www.songsterr.com) live; pick the instrument you want it
filed under and hit save. What lands in `instruments/<instrument>/tabs/` is a clean
Markdown reference — title, artist, and a link out to the source — never a scraped copy
of the tab itself. The network is only ever touched to *search*; the note it leaves
behind reads fine with the server off, like everything else in the drawers.

The **Effects** module is a small pedalboard. Wire up a chain of ready-made blocks
— distortion, filter, delay, reverb — reorder them, turn the knobs, and load one of
your Studio takes to hear it run through the chain, with an A/B bypass to check your
work against the dry signal. When a chain earns its keep, name it and save it: what
lands in `production/effects/` is a plain-Markdown preset — a little table of blocks
and their settings you can read and tweak by hand — that loads straight back into the
rack. It's a bench pedalboard for finding a sound, not a mix; the real mixing still
belongs in your DAW.

That's the whole app: the four drawers the Markdown workshop always had, now with a
tool on the bench for each — chords you can hear, takes you can catch, tabs you can
find, and effects you can shape. See [`PRD.md`](./PRD.md) for the thinking and
[`TASKS.md`](./TASKS.md) for the build.

## How to use it

There is exactly one rule, and it's the one that makes a bench useful instead of a
graveyard: **write the thing down when it happens, not when it's finished.** A riff
you hum in the car, a voicing you stumble onto, a mix move that finally cleared up
the low end — into the right drawer, in whatever shape it arrives. Polish is
optional; capture is not.

When a folder starts to sprawl, give it an index. When a drawer stays empty for a
month, that's information too — maybe it's not where your attention actually goes.

Practice compounds. Notes don't, unless you keep them somewhere you'll look again.
This is that somewhere.
