# Haptic Football Accessibility

Haptic Football Accessibility is an early prototype for turning football video into a timestamped haptic event timeline. The goal is to make sports media more accessible and immersive by converting ball movement into vibration patterns that can later be played on a phone, wearable, or other haptic device.

## What It Does

The current MVP follows a simple pipeline:

```text
video -> ball movement -> speed estimate -> haptic event JSON
```

The analyzer reads a football video, tracks detected sports-ball movement frame by frame, estimates pixel speed, and maps movement intensity into haptic patterns:

```text
soft movement   -> light_glide
medium movement -> medium_double_pulse
hard movement   -> sharp_strong_burst
```

The output is a JSON timeline that can be used by a future mobile or web haptic player.

## Tech Used

- Python for the analysis script
- Ultralytics YOLO for object detection and video tracking
- ByteTrack through Ultralytics for object tracking
- OpenCV for video loading and frame-rate metadata
- JSON for the generated haptic event timeline
- NumPy, pandas, and matplotlib as supporting analysis dependencies

## Project Structure

```text
haptic-football-accessibility/
  src/analyze_video.py
  src/server.py
  mobile/index.html
  mobile/app.js
  mobile/styles.css
  data/sample.mp4
  outputs/events.json
  requirements.txt
  docs/
```

## Output Format

Each detected haptic event includes the playback timestamp, estimated speed, intensity label, and haptic pattern:

```json
{
  "timestamp_sec": 6.14,
  "event": "ball_movement",
  "pixel_speed": 2568.88,
  "power": "hard",
  "haptic_pattern": "sharp_strong_burst"
}
```

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

On Windows:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Run The Web App

Start the analysis server:

```bash
python src/server.py
```

Then open:

```text
http://localhost:8000/mobile/
```

Choose any football video and select **Analyze video**. The server uploads the selected video locally, generates a fresh haptic timeline, and sends the events back to the player automatically. The latest timeline is also written to:

```text
outputs/events.json
```

For command-line analysis without the web app, place a football video at `data/sample.mp4` and run:

```bash
python src/analyze_video.py
```

## Haptic Player

The `mobile/` folder contains a browser prototype for generating and playing haptic events in sync with video playback. On browsers that support the Vibration API, the player maps haptic patterns to vibration sequences:

```text
light_glide          -> short light vibration
medium_double_pulse  -> two medium pulses
sharp_strong_burst   -> strong burst
```

## Current Status

The first end-to-end run generated a haptic event timeline from a football video. The web player can now accept a new football video, request analysis from the local Python server, and trigger matching vibration patterns during playback without requiring the user to load a JSON file manually.
