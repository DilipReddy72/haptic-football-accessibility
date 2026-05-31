const video = document.querySelector("#videoPlayer");
const videoInput = document.querySelector("#videoInput");
const analyzeButton = document.querySelector("#analyzeButton");
const loadDefaultButton = document.querySelector("#loadDefaultButton");
const testHapticButton = document.querySelector("#testHapticButton");
const hapticsToggle = document.querySelector("#hapticsToggle");
const analysisStatus = document.querySelector("#analysisStatus");
const supportStatus = document.querySelector("#supportStatus");
const totalEvents = document.querySelector("#totalEvents");
const nextEvent = document.querySelector("#nextEvent");
const currentPattern = document.querySelector("#currentPattern");
const playbackTime = document.querySelector("#playbackTime");
const timelineTrack = document.querySelector("#timelineTrack");
const playhead = document.querySelector("#playhead");
const eventList = document.querySelector("#eventList");

const vibrationPatterns = {
  light_glide: [45],
  medium_double_pulse: [70, 55, 70],
  sharp_strong_burst: [140],
};

let events = [];
let nextEventIndex = 0;
let activeEventTimeout = null;

function hasHapticSupport() {
  return "vibrate" in navigator;
}

function vibrate(patternName) {
  if (!hapticsToggle.checked || !hasHapticSupport()) {
    return;
  }

  const pattern = vibrationPatterns[patternName] || [60];
  navigator.vibrate(pattern);
}

function updateSupportStatus() {
  supportStatus.textContent = hasHapticSupport()
    ? "Haptic playback is supported in this browser. Use a mobile device for the strongest effect."
    : "This browser does not expose vibration support. Timeline playback still works visually.";
}

function setEvents(nextEvents) {
  events = nextEvents
    .filter((event) => Number.isFinite(event.timestamp_sec))
    .sort((a, b) => a.timestamp_sec - b.timestamp_sec);

  nextEventIndex = 0;
  totalEvents.textContent = String(events.length);
  renderTimeline();
  renderEventList();
  syncToVideoTime();
}

function renderTimeline() {
  timelineTrack.querySelectorAll(".event-dot").forEach((dot) => dot.remove());
  const duration = getTimelineDuration();

  events.forEach((event) => {
    const dot = document.createElement("span");
    dot.className = `event-dot ${event.power || "soft"}`;
    dot.style.left = `${Math.min((event.timestamp_sec / duration) * 100, 100)}%`;
    dot.title = `${event.timestamp_sec}s ${event.haptic_pattern}`;
    timelineTrack.appendChild(dot);
  });
}

function renderEventList() {
  eventList.innerHTML = "";
  const visibleEvents = events.slice(0, 120);

  visibleEvents.forEach((event, index) => {
    const item = document.createElement("li");
    item.dataset.index = String(index);
    item.innerHTML = `
      <strong>${event.timestamp_sec.toFixed(2)}s</strong>
      <span>${event.haptic_pattern}</span>
      <span class="badge ${event.power || "soft"}">${event.power || "soft"}</span>
    `;
    eventList.appendChild(item);
  });
}

function getTimelineDuration() {
  return video.duration || events.at(-1)?.timestamp_sec || 1;
}

function updatePlayhead() {
  const duration = getTimelineDuration();
  const progress = duration ? (video.currentTime / duration) * 100 : 0;
  playhead.style.left = `${Math.min(Math.max(progress, 0), 100)}%`;
  playbackTime.textContent = `${video.currentTime.toFixed(2)}s`;
}

function syncToVideoTime() {
  while (
    nextEventIndex < events.length &&
    events[nextEventIndex].timestamp_sec < video.currentTime
  ) {
    nextEventIndex += 1;
  }

  const upcoming = events[nextEventIndex];
  nextEvent.textContent = upcoming ? `${upcoming.timestamp_sec.toFixed(2)}s` : "--";
}

function updateActiveEvent(event) {
  currentPattern.textContent = event.haptic_pattern;

  eventList.querySelectorAll(".active").forEach((item) => {
    item.classList.remove("active");
  });

  const activeItem = eventList.querySelector(`[data-index="${nextEventIndex}"]`);
  if (activeItem) {
    activeItem.classList.add("active");
    activeItem.scrollIntoView({ block: "nearest" });
  }

  window.clearTimeout(activeEventTimeout);
  activeEventTimeout = window.setTimeout(() => {
    currentPattern.textContent = "--";
  }, 600);
}

function processDueEvents() {
  if (video.paused || video.ended) {
    return;
  }

  const currentTime = video.currentTime;
  const triggerWindowSeconds = 0.08;

  while (
    nextEventIndex < events.length &&
    events[nextEventIndex].timestamp_sec <= currentTime + triggerWindowSeconds
  ) {
    const event = events[nextEventIndex];

    if (event.timestamp_sec >= currentTime - triggerWindowSeconds) {
      vibrate(event.haptic_pattern);
      updateActiveEvent(event);
    }

    nextEventIndex += 1;
  }

  const upcoming = events[nextEventIndex];
  nextEvent.textContent = upcoming ? `${upcoming.timestamp_sec.toFixed(2)}s` : "--";
}

async function loadDefaultEvents() {
  const response = await fetch("../outputs/events.json");
  if (!response.ok) {
    throw new Error("Could not load ../outputs/events.json");
  }
  setEvents(await response.json());
}

videoInput.addEventListener("change", () => {
  const file = videoInput.files?.[0];
  if (!file) {
    return;
  }

  video.src = URL.createObjectURL(file);
  video.load();
  setEvents([]);
  analysisStatus.textContent = `${file.name} is ready. Select Analyze video to generate its haptic timeline.`;
});

analyzeButton.addEventListener("click", async () => {
  const file = videoInput.files?.[0];
  if (!file) {
    analysisStatus.textContent = "Choose a football video before starting analysis.";
    return;
  }

  analyzeButton.disabled = true;
  analysisStatus.textContent =
    "Analyzing video. Longer videos can take several minutes. Keep this page open.";

  try {
    const response = await fetch(
      `/api/analyze?filename=${encodeURIComponent(file.name)}`,
      {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Analysis could not be completed.");
    }

    setEvents(payload.events);
    analysisStatus.textContent = `Analysis complete. Generated ${payload.total_events} haptic events from ${payload.filename}.`;
  } catch (error) {
    analysisStatus.textContent = `${error.message} Start the Python analysis server and try again.`;
  } finally {
    analyzeButton.disabled = false;
  }
});

loadDefaultButton.addEventListener("click", async () => {
  try {
    await loadDefaultEvents();
    analysisStatus.textContent = "Loaded the included demo timeline.";
  } catch (error) {
    analysisStatus.textContent = "Could not load the included demo timeline.";
  }
});

testHapticButton.addEventListener("click", () => {
  vibrate("medium_double_pulse");
});

video.addEventListener("loadedmetadata", () => {
  renderTimeline();
  updatePlayhead();
});

video.addEventListener("play", syncToVideoTime);
video.addEventListener("seeking", syncToVideoTime);
video.addEventListener("timeupdate", () => {
  updatePlayhead();
  processDueEvents();
});

updateSupportStatus();
