from ultralytics import YOLO
import cv2
import json
from pathlib import Path

VIDEO_PATH = "data/sample.mp4"
OUTPUT_JSON = "outputs/events.json"

model = None


def get_model():
    global model
    if model is None:
        model = YOLO("yolo11n.pt")  # small starter model
    return model


def analyze_video(video_path=VIDEO_PATH, output_json=OUTPUT_JSON):
    video_path = str(video_path)
    output_json = Path(output_json) if output_json else None
    if output_json:
        output_json.parent.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)

    if not cap.isOpened():
        raise FileNotFoundError(f"Could not open video: {video_path}")

    events = []
    detector = get_model()

    results = detector.track(
        source=video_path,
        tracker="bytetrack.yaml",
        persist=True,
        stream=True,
        conf=0.25,
    )

    last_ball_center = None
    frame_index = 0

    for result in results:
        timestamp = frame_index / fps if fps else 0

        for box in result.boxes:
            cls_id = int(box.cls[0])
            label = detector.names[cls_id]

            # Default COCO models may detect "sports ball"
            if label == "sports ball":
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                cx = (x1 + x2) / 2
                cy = (y1 + y2) / 2

                if last_ball_center:
                    dx = cx - last_ball_center[0]
                    dy = cy - last_ball_center[1]
                    pixel_speed = ((dx**2 + dy**2) ** 0.5) * fps

                    if pixel_speed > 900:
                        power = "hard"
                        haptic = "sharp_strong_burst"
                    elif pixel_speed > 400:
                        power = "medium"
                        haptic = "medium_double_pulse"
                    else:
                        power = "soft"
                        haptic = "light_glide"

                    events.append(
                        {
                            "timestamp_sec": round(timestamp, 2),
                            "event": "ball_movement",
                            "pixel_speed": round(pixel_speed, 2),
                            "power": power,
                            "haptic_pattern": haptic,
                        }
                    )

                last_ball_center = (cx, cy)

        frame_index += 1

    cap.release()

    if output_json:
        with output_json.open("w") as f:
            json.dump(events, f, indent=2)

        print(f"Saved {len(events)} events to {output_json}")

    return events


def main():
    analyze_video()


if __name__ == "__main__":
    main()
