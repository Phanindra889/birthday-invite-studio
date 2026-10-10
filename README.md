# Invite Studio — First Birthday Invitation Video

A sky-blue, Mickey-inspired first-birthday invitation **video creator**: a live editor with a phone-frame preview and beat-synced timeline, and a real **MP4 export** (H.264 video + AAC audio, 1080 × 1920, 30/60 fps).

Preloaded with: **Vengala Mounish · 1st Birthday Celebration · Sunday, 18 October 2026 · 7:00 PM onwards · Y Convention, Vijayawada**. The address, parents' names, RSVP details, photo and music are optional and appear in the video only once you add them.

## Quick start

Requires Node.js 20+ (tested on Node 26, macOS).

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. The first export downloads Remotion's headless Chrome (~170 MB, one time).

## Using the editor

| Tab | What you can do |
| --- | --- |
| **Details** | Name, occasion, date (weekday computed automatically), time and time label, venue, city, optional address / parents / RSVP, and every message in the video. Wrap words in `*stars*` to make them gold and 3D; press Enter for a line break; clear a field to hide it. |
| **Scenes** | Reorder (drag or ↑/↓), show/hide, retime each scene, choose transitions, and “Fit to music bars”. You can also drag a scene's right edge on the timeline (it snaps to beats). |
| **Design** | Theme presets, six colour tokens, four backgrounds, fonts, text size, alignment, text animation, motion intensity, decoration toggles, and baby photo upload with crop and an ears or circle frame. |
| **Music** | Two original built-in tracks, or upload your own (MP3/WAV/M4A/AAC/OGG/FLAC). Volume, fades, start offset and loop. Beat sync on/off, automatic beat detection, tap tempo, a tempo grid, beats per bar, downbeat position, and editing markers by hand on the timeline. Optional chimes, sparkles, balloon pops and whooshes. |
| **Export** | Resolution (1080×1920 / 720×1280), 30/60 fps, quality, live progress with ETA, cancel, verified result, playback, MP4 and poster download, and Share. |

The preview *is* the video: the editor plays the same Remotion composition that the renderer encodes, so what you see is what you export. Your work saves automatically in the browser (an uploaded song is kept in IndexedDB). **Save config** / **Load** gives you a portable JSON file; undo/redo is ⌘Z / ⇧⌘Z.

## Exporting

- **From the editor:** Export tab → *Render MP4*. Success is shown only after the file has been checked: codec h264 + aac, exact dimensions, frame rate, duration within 0.35 s, playable in `<video>`. Files are written to `out/renders/<id>/`.
- **From the command line** (no browser needed):

  ```bash
  npm run render                                   # default invitation -> out/invitation.mp4
  npm run render -- --config my-invite.json --out out/final.mp4 --fps 60 --resolution 1080p --quality high
  ```

  Use a config saved from the editor. For an uploaded song, set `audio.source` to `"upload"` and `musicUrl` to an `http(s)` URL of the file.

Typical render time on an Apple-silicon Mac: about 50 s for 45 s at 1080p30, about 33 s at 720p30.

## What runs where

Everything runs on your computer. The editor, preview, beat detection and photo cropping run in the browser. Export needs the small render API that `npm run dev` (or `npm run build && npm run preview`) mounts into the Vite server; it uses Remotion's renderer and bundled ffmpeg. No ffmpeg install and no cloud service are needed. A purely static deployment can preview but not export.

## Beat sync

Each scene declares nominal reveal times. When beat sync is on, every text reveal, confetti burst and sound effect moves to the nearest beat (big moments prefer downbeats). Word-by-word reveals are staggered by an eighth note. Balloons, sparkles, the cake and the number “1” pulse on beats. Everything is computed from the config (`src/shared/cues.ts`), so preview and render match frame for frame. `npm run check-sync` prints each cue's offset from the beat (0 ms for the defaults).

Beat detection (`src/audio/beatDetection.ts`) uses a spectral-flux onset envelope, autocorrelation tempo estimation and dynamic-programming beat tracking, with downbeat phase taken from bass energy. `npm run test:beats` checks it against the built-in tracks: 120.2 / 99.5 BPM detected (true 120 / 100), every beat within 50 ms (≈8 ms mean error), downbeats aligned.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Editor + render API at <http://localhost:5173> |
| `npm run render` | Command-line MP4 export with verification and poster |
| `npm run stills` | Render QA still frames (`--config`, `--frames 0,150,600`) |
| `npm run audio` | Regenerate the built-in music and sound effects |
| `npm run test:beats` | Beat-detection accuracy test |
| `npm run check-sync` | Show beat alignment of every cue |
| `npm run studio` | Open the composition in Remotion Studio |
| `npm run typecheck` / `npm run build` | Type-check / production build |

## Project structure

```
src/shared/     config types + defaults, timeline, beat-synced cues, formatting, validation, themes
src/video/      Remotion composition: Invitation, five scenes, components (cake, number one, balloons, …)
src/audio/      beat detection, waveform peaks, tap tempo
src/editor/     React editor: store (undo/autosave), Player stage, timeline, panels
server/         render core (bundle → render → verify → poster) and the Vite render API
scripts/        CLI render, stills, audio synthesis, tests
public/         built-in music (audio/) and sound effects (sfx/)
```

To reuse the editor for another child or party, change the details in the editor (or `DEFAULT_CONFIG` in `src/shared/config.ts`). Themes live in `src/shared/themes.ts`, and scenes are self-contained components registered in `src/video/Invitation.tsx`.

## Licensing notes

- **Remotion** (video framework) is free for individuals, non-profits and companies with up to 3 employees; larger companies need a [company license](https://www.remotion.dev/license). A personal birthday invitation qualifies for the free license.
- **Fonts** (Fredoka, Baloo 2, Luckiest Guy, Chewy, Dancing Script, Pacifico, Great Vibes, Nunito, Quicksand) are SIL Open Font License, self-hosted through Fontsource.
- **Music and sound effects** are synthesized from code in `scripts/generate-audio.mjs`; no samples are used. “Happy Birthday to You” is a public-domain melody.
- **Artwork** is original SVG (ears motif, balloons, cake, number one). No Disney artwork is used. “Mickey Mouse” is a Disney trademark, so keep this styling to personal, non-commercial invitations.

## Known limits and next steps

- 16:9 export is shown as “coming soon”. Width, height and fps already flow from the config through the composition and renderer, but the scene layouts are designed for portrait.
- Share uses the Web Share API where the browser supports sharing files; otherwise download the MP4 and share it from your phone.
