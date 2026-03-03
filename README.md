# Prompt2LongVideo

A simple website that generates **5+ minute AI videos from plain-English commands**.

## Features

- Accepts a plain-English prompt.
- Enforces a minimum 5-minute output duration.
- Auto-builds scene-by-scene prompts.
- Generates AI images using Pollinations image API.
- Adds narration with browser text-to-speech.
- Records and exports a downloadable `.webm` video fully in-browser.
- Includes fallback visuals if remote image generation fails.

## Run locally

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Usage

1. Enter your English command (example: "Create a 6-minute educational video on black holes").
2. Keep `Target duration` at 5 or more minutes.
3. Click **Generate 5+ Minute Video**.
4. Wait for scenes to render and recording to complete.
5. Download the final video.

## Notes

- Requires a modern Chromium-based browser for best `MediaRecorder` compatibility.
- Video generation can take several minutes depending on selected duration.
- If image API requests fail, the app still completes using fallback frames.
