import argparse
import json
import re
import sys
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from urllib.parse import parse_qs, urlparse

from analyze_video import analyze_video

PROJECT_ROOT = Path(__file__).resolve().parent.parent
UPLOAD_DIR = PROJECT_ROOT / "data" / "uploads"
OUTPUT_JSON = PROJECT_ROOT / "outputs" / "events.json"
MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024
analysis_lock = Lock()


def safe_filename(filename):
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", Path(filename).name)
    return cleaned or "uploaded-video.mp4"


class HapticFootballHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PROJECT_ROOT), **kwargs)

    def send_json(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/analyze":
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        if not content_length:
            self.send_json({"error": "Choose a video file first."}, HTTPStatus.BAD_REQUEST)
            return
        if content_length > MAX_UPLOAD_BYTES:
            self.send_json({"error": "Video is larger than the 2 GB upload limit."}, HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
            return

        requested_name = parse_qs(parsed.query).get("filename", ["uploaded-video.mp4"])[0]
        upload_path = UPLOAD_DIR / safe_filename(requested_name)
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        try:
            with upload_path.open("wb") as uploaded_file:
                remaining = content_length
                while remaining:
                    chunk = self.rfile.read(min(1024 * 1024, remaining))
                    if not chunk:
                        raise ValueError("Upload ended before the complete video was received.")
                    uploaded_file.write(chunk)
                    remaining -= len(chunk)

            if not analysis_lock.acquire(blocking=False):
                self.send_json({"error": "Another video is already being analyzed. Try again when it finishes."}, HTTPStatus.CONFLICT)
                return

            try:
                events = analyze_video(upload_path, OUTPUT_JSON)
            finally:
                analysis_lock.release()

            self.send_json(
                {
                    "events": events,
                    "filename": upload_path.name,
                    "total_events": len(events),
                }
            )
        except Exception as error:
            print(f"Analysis failed: {error}", file=sys.stderr)
            self.send_json({"error": str(error)}, HTTPStatus.INTERNAL_SERVER_ERROR)


def main():
    parser = argparse.ArgumentParser(description="Run the haptic football web app and video analyzer.")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", default=8000, type=int)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), HapticFootballHandler)
    print(f"Haptic Football web app: http://localhost:{args.port}/mobile/")
    print("Choose a football video in the browser, then select Analyze video.")
    server.serve_forever()


if __name__ == "__main__":
    main()
