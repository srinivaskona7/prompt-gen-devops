# DevOps Explainer Video Prompt Generator

Choose a DevOps concept and a few options, and get a **complete, ready-to-paste prompt** that makes **Claude, ChatGPT or Gemini** build an animated explainer video as a single HTML file. The file previews at 1–4× speed, has voice-over and captions, and **exports itself to MP4**.

Made by **kona-srinivas-devops**. Runs entirely in your browser; nothing is sent to a server.

## Features

| | |
|---|---|
| 🗂 **Concept catalog** | Over 50 concepts across Linux, Kubernetes, SAP BTP Kyma, Containers, CI/CD & GitOps, AWS, Networking, IaC, Observability, Security and Git. Each comes with the key points the AI must cover. You can also enter a custom concept. |
| 🎛 **Options** | Type **any category and concept** (with suggestions and 51 ready-made ideas), enter the **length in minutes** (0 = no limit), and choose audience level, tone, format (4:5, 9:16, 1:1, 16:9), narration language and voice, and target AI. |
| 🎓 **Teaching-first design** | 5 teaching styles (guided, problem → solution, follow one object, build the diagram, misconception → truth), a strict *one active element* rule, at most 4 new terms per scene, element budgets, "So far" recaps and a screenshot-ready summary frame. |
| 🎨 **Low-noise themes** | 8 themes with exact colour codes, all checked in the tests against accessibility contrast guidelines (WCAG AA). Clean Focus (default), Whiteboard, Blueprint and Calm Terminal for teaching; SAP Fiori and Kubernetes for branding; Neon and Cyberpunk as expressive options. Background effects can be Off, Minimal or Rich. A **Teaching clarity score** (0–100) explains what adds noise. |
| 🎙 **Voice Studio (advanced)** | The default voice works out of the box. Optionally, record your own voice with **any microphone** (device picker, level meter, teleprompter that highlights each word, scene-by-scene takes and retakes, tap-sync) or upload audio. It then trims, normalises and merges the audio, runs a readiness checklist, and downloads the video with your voice. Download order: custom voice → default voice → captions only. |
| ➕ **Extra scenes** | Analogy, live commands, common mistakes, comparison table, troubleshooting, interview questions, quiz, cheat-sheet end card, mascot. |
| 🎙 **Voice-over timing sync** | **Auto-timed:** the AI writes the narration with exact timestamps for you to record or generate audio from, then merge. **Lock to my voice-over:** paste a timed script or `.srt` file, and the video is built to your exact timings. |
| ⏱ **Timing validator** | Live cue table, coloured timeline, error checks (overlaps, reversed times) and warnings (gaps, narration faster than 3.2 words/s). *Measure audio* compares an audio file's length with the script and can scale every timestamp to match. |
| 🔗 **Share & save** | Your settings are saved in the browser, and *Copy share link* encodes them in the URL. Download the prompt as `.md` or `.txt`. |

## What the generated prompt asks the AI to build

- A **canvas-rendered** video engine (preview and export match exactly, and work in every browser).
- Player: play/pause, 1–4× speed, seek with chapters, loop, mute, captions, fullscreen, clean mode.
- **Download video** built in the browser, so it works from a file opened from your Mac. It records in real time, so there is **no length limit**.
- Voice-over: built-in browser voice preview, plus loading your own file (one track or one clip per scene). It checks the audio length and offers *Stretch visuals to audio*.
- Exports for editing: **Copy timed script** (which can be pasted back into this generator), `.srt`, `cues.json`, **Silent video**, and an `ffmpeg` merge command.
- A quality checklist and a post kit: hook lines, a caption, hashtags and a cover-frame suggestion.

## Voice-over workflows

**A. Generate the script, then record**
1. Use *Auto-timed* and generate the video.
2. In the player, click *Copy timed script*, then record it or paste it into a text-to-speech tool.
3. Load the audio into the player (*Load voice-over*) and export. Or export the *Silent video* and merge:
   ```bash
   ffmpeg -i video-silent.mp4 -i voiceover.m4a -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest final.mp4
   ```

**B. Start from your own recording**
1. Write or transcribe your narration with timestamps (any editor's `.srt` export works).
2. Choose *Lock to my voice-over*, then paste the script or load the `.srt` file. Use *Measure audio* to check its length.
3. Generate. The AI must copy your start and duration values exactly, so the visuals line up with your audio.

Accepted timing formats:
```text
00:12.0-00:24.0 | Scene name | narration
[0:12 - 0:24] narration
0:12 | Scene | narration          (end time = the next cue's start)
SRT blocks (00:00:12,000 --> 00:00:24,000)
```

## Develop

```bash
node --test tests/*.test.js  # run the unit tests
python3 -m http.server 8000 # then open http://localhost:8000
```
There is no build step. The files are `index.html`, `styles.css`, `app.js` and `prompt.js` (the logic has no page code, so Node tests can run it directly).

## Deploy (GitHub Pages)

`.github/workflows/pages.yml` runs the tests on every push and pull request, and deploys `main` to GitHub Pages.

One-time setup:
1. Create the GitHub repo and push `main`.
2. **Settings → Pages → Build and deployment → Source: _GitHub Actions_**.
3. Push again, or run the workflow manually from the **Actions** tab. Your site will be at `https://<user>.github.io/prompt-gen-devops/`.
