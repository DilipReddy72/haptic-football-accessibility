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

## Run

Place a football video at:

```text
data/sample.mp4
```

Then run:

```bash
python src/analyze_video.py
```

The analyzer writes:

```text
outputs/events.json
```

## Haptic Player

The `mobile/` folder contains a static browser prototype for playing haptic events in sync with video playback.

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/mobile/
```

Use the controls to choose a video file and load `outputs/events.json`. On browsers that support the Vibration API, the player maps haptic patterns to vibration sequences:

```text
light_glide          -> short light vibration
medium_double_pulse  -> two medium pulses
sharp_strong_burst   -> strong burst
```

## Current Status

The first end-to-end run generated a haptic event timeline from a football video. A mobile web haptic player has been added to read `outputs/events.json` and trigger matching vibration patterns during video playback.
