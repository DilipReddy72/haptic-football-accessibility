# Haptic Football Accessibility

Starter MVP for converting football video into haptic event JSON.

The first goal is:

```text
video -> ball movement -> speed estimate -> haptic event JSON
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
