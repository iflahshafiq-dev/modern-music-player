/* =====================================================
   MUSICFLOW — MUSIC PLAYER LOGIC (Vanilla JS)
   ===================================================== */

/* ---------- 1. SONG DATA ----------
   Each song holds everything the UI needs to render.
   Audio files are open demo tracks (SoundHelix), used here
   only as placeholder playback sources.
------------------------------------------------------- */
const songs = [
  {
    title: "Dreams",
    artist: "Aurora Waves",
    genre: "Ambient",
    year: "2024",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    coverColors: ["#3B82F6", "#8B5CF6"],
  },
  {
    title: "Night Sky",
    artist: "Luna Ray",
    genre: "Synthwave",
    year: "2023",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    coverColors: ["#0EA5E9", "#1E3A8A"],
  },
  {
    title: "Ocean Waves",
    artist: "Coastal Drift",
    genre: "Chillout",
    year: "2025",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    coverColors: ["#06B6D4", "#3B82F6"],
  },
  {
    title: "Infinity",
    artist: "Nova Sound",
    genre: "Electronic",
    year: "2024",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    coverColors: ["#6366F1", "#EC4899"],
  },
  {
    title: "Sunrise",
    artist: "Golden Hour",
    genre: "Indie Pop",
    year: "2023",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    coverColors: ["#F59E0B", "#EF4444"],
  },
  {
    title: "Lost Memories",
    artist: "Echo Valley",
    genre: "Lo-Fi",
    year: "2022",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    coverColors: ["#64748B", "#3B82F6"],
  },
];

/* ---------- 2. GENERATED ALBUM ART ----------
   Builds a unique gradient SVG cover per song at runtime,
   so the demo never depends on external image hosting.
------------------------------------------------------- */
function generateCover(colors, title) {
  const [c1, c2] = colors;
  const initial = title.charAt(0).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#g)"/>
      <circle cx="300" cy="90" r="110" fill="rgba(255,255,255,0.08)"/>
      <circle cx="60" cy="340" r="140" fill="rgba(0,0,0,0.12)"/>
      <text x="200" y="235" font-family="Inter, sans-serif" font-size="140"
            font-weight="800" fill="rgba(255,255,255,0.85)"
            text-anchor="middle">${initial}</text>
    </svg>`;
  return "data:image/svg+xml;base64," + btoa(svg);
}

/* ---------- 3. STATE ---------- */
const state = {
  currentIndex: 0,
  isPlaying: false,
  isShuffle: false,
  isRepeat: false,
  isMuted: false,
  previousVolume: 0.7,
  favorites: new Set(),
};

/* ---------- 4. DOM REFERENCES ---------- */
const audio = document.getElementById("audio");

const albumArt = document.getElementById("albumArt");
const albumGlow = document.getElementById("albumGlow");
const trackTitle = document.getElementById("trackTitle");
const trackArtist = document.getElementById("trackArtist");
const trackGenre = document.getElementById("trackGenre");
const trackYear = document.getElementById("trackYear");
const favoriteBtn = document.getElementById("favoriteBtn");

const playBtn = document.getElementById("playBtn");
const playIcon = document.getElementById("playIcon");
const pauseIcon = document.getElementById("pauseIcon");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");

const progressBar = document.getElementById("progressBar");
const progressFill = document.getElementById("progressFill");
const progressHandle = document.getElementById("progressHandle");
const currentTimeEl = document.getElementById("currentTime");
const durationTimeEl = document.getElementById("durationTime");

const volumeBar = document.getElementById("volumeBar");
const volumeFill = document.getElementById("volumeFill");
const muteBtn = document.getElementById("muteBtn");

const playlistEl = document.getElementById("playlist");
const playlistCount = document.getElementById("playlistCount");

const loader = document.getElementById("loader");

/* ---------- 5. UTILITIES ---------- */

// Formats seconds into M:SS
function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

// Clamp a number between min and max
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/* ---------- 6. RENDER PLAYLIST ---------- */
function renderPlaylist() {
  playlistEl.innerHTML = "";

  songs.forEach((song, index) => {
    const li = document.createElement("li");
    li.className = "playlist-item" + (index === state.currentIndex ? " playing" : "");
    li.style.animationDelay = `${index * 0.05}s`;
    li.setAttribute("data-index", index);
    li.setAttribute("role", "button");
    li.setAttribute("tabindex", "0");

    li.innerHTML = `
      <div class="item-cover">
        <img src="${generateCover(song.coverColors, song.title)}" alt="${song.title} cover" />
        <div class="eq"><span></span><span></span><span></span></div>
      </div>
      <div class="item-info">
        <div class="item-title">${song.title}</div>
        <div class="item-artist">${song.artist}</div>
      </div>
      <span class="item-duration" data-duration-index="${index}">--:--</span>
    `;

    // Click a playlist song to play it
    li.addEventListener("click", () => {
      loadSong(index);
      playSong();
    });

    // Keyboard accessibility: Enter/Space activates the item
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        loadSong(index);
        playSong();
      }
    });

    playlistEl.appendChild(li);
  });

  playlistCount.textContent = `${songs.length} songs`;
}

// Highlights the currently playing song in the list
function highlightActiveSong() {
  document.querySelectorAll(".playlist-item").forEach((item) => {
    const idx = Number(item.getAttribute("data-index"));
    item.classList.toggle("playing", idx === state.currentIndex);
  });
}

/* ---------- 7. LOAD / DISPLAY SONG ---------- */
function loadSong(index) {
  state.currentIndex = clamp(index, 0, songs.length - 1);
  const song = songs[state.currentIndex];

  // Update audio source
  audio.src = song.audio;

  // Update album art + glow color
  const cover = generateCover(song.coverColors, song.title);
  albumArt.src = cover;
  albumGlow.style.background = `linear-gradient(135deg, ${song.coverColors[0]}, ${song.coverColors[1]})`;

  // Update text info
  trackTitle.textContent = song.title;
  trackArtist.textContent = song.artist;
  trackGenre.textContent = song.genre;
  trackYear.textContent = song.year;

  // Reset progress UI
  progressFill.style.width = "0%";
  progressHandle.style.left = "0%";
  currentTimeEl.textContent = "0:00";
  durationTimeEl.textContent = "0:00";

  // Update favorite heart state
  updateFavoriteUI();

  highlightActiveSong();
}

/* ---------- 8. PLAYBACK CONTROLS ---------- */
function playSong() {
  audio
    .play()
    .then(() => {
      state.isPlaying = true;
      updatePlayButtonUI();
    })
    .catch(() => {
      // Autoplay might be blocked by the browser; keep UI in sync
      state.isPlaying = false;
      updatePlayButtonUI();
    });
}

function pauseSong() {
  audio.pause();
  state.isPlaying = false;
  updatePlayButtonUI();
}

function togglePlay() {
  if (state.isPlaying) {
    pauseSong();
  } else {
    playSong();
  }
}

function updatePlayButtonUI() {
  playIcon.style.display = state.isPlaying ? "none" : "block";
  pauseIcon.style.display = state.isPlaying ? "block" : "none";
  playBtn.setAttribute("aria-label", state.isPlaying ? "Pause" : "Play");
  highlightActiveSong();
}

// Picks the next index, honoring shuffle mode
function getNextIndex() {
  if (state.isShuffle) {
    let random = Math.floor(Math.random() * songs.length);
    // Avoid repeating the same song twice in a row when possible
    if (songs.length > 1) {
      while (random === state.currentIndex) {
        random = Math.floor(Math.random() * songs.length);
      }
    }
    return random;
  }
  return (state.currentIndex + 1) % songs.length;
}

function getPrevIndex() {
  if (state.isShuffle) {
    return Math.floor(Math.random() * songs.length);
  }
  return (state.currentIndex - 1 + songs.length) % songs.length;
}

function nextSong() {
  loadSong(getNextIndex());
  playSong();
}

function prevSong() {
  // If more than 3 seconds into the song, restart it instead of going back
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  loadSong(getPrevIndex());
  playSong();
}

/* ---------- 9. SHUFFLE / REPEAT ---------- */
function toggleShuffle() {
  state.isShuffle = !state.isShuffle;
  shuffleBtn.classList.toggle("active", state.isShuffle);
  shuffleBtn.setAttribute("aria-pressed", state.isShuffle);
}

function toggleRepeat() {
  state.isRepeat = !state.isRepeat;
  repeatBtn.classList.toggle("active", state.isRepeat);
  repeatBtn.setAttribute("aria-pressed", state.isRepeat);
  audio.loop = state.isRepeat;
}

/* ---------- 10. PROGRESS BAR ---------- */
function updateProgress() {
  if (!audio.duration) return;
  const percent = (audio.currentTime / audio.duration) * 100;
  progressFill.style.width = `${percent}%`;
  progressHandle.style.left = `${percent}%`;
  currentTimeEl.textContent = formatTime(audio.currentTime);
}

function updateDuration() {
  durationTimeEl.textContent = formatTime(audio.duration);

  // Fill in the playlist duration for the currently loaded song
  const durationEl = document.querySelector(
    `[data-duration-index="${state.currentIndex}"]`
  );
  if (durationEl) durationEl.textContent = formatTime(audio.duration);
}

// Seeks playback based on a click position within the progress bar
function seek(e) {
  const rect = progressBar.getBoundingClientRect();
  const clickX = clamp(e.clientX - rect.left, 0, rect.width);
  const percent = clickX / rect.width;
  if (audio.duration) {
    audio.currentTime = percent * audio.duration;
    updateProgress();
  }
}

/* ---------- 11. VOLUME CONTROL ---------- */
function setVolume(percent) {
  const clamped = clamp(percent, 0, 1);
  audio.volume = clamped;
  volumeFill.style.width = `${clamped * 100}%`;
  state.isMuted = clamped === 0;
  updateVolumeIcon();
}

function handleVolumeClick(e) {
  const rect = volumeBar.getBoundingClientRect();
  const clickX = clamp(e.clientX - rect.left, 0, rect.width);
  const percent = clickX / rect.width;
  state.previousVolume = percent || 0.01;
  setVolume(percent);
}

function toggleMute() {
  if (state.isMuted) {
    setVolume(state.previousVolume || 0.7);
  } else {
    state.previousVolume = audio.volume;
    setVolume(0);
  }
}

function updateVolumeIcon() {
  muteBtn.style.opacity = state.isMuted || audio.volume === 0 ? "0.5" : "1";
  muteBtn.setAttribute("aria-label", state.isMuted ? "Unmute" : "Mute");
}

/* ---------- 12. FAVORITES ---------- */
function toggleFavorite() {
  const key = state.currentIndex;
  if (state.favorites.has(key)) {
    state.favorites.delete(key);
  } else {
    state.favorites.add(key);
  }
  updateFavoriteUI();
}

function updateFavoriteUI() {
  const isFav = state.favorites.has(state.currentIndex);
  favoriteBtn.classList.toggle("active", isFav);
  favoriteBtn.querySelector("span").textContent = isFav
    ? "Added to Favorites"
    : "Add to Favorites";
  favoriteBtn.setAttribute("aria-pressed", isFav);
}

/* ---------- 13. AUTO NEXT SONG ---------- */
function handleSongEnd() {
  // If repeat is on, the native `audio.loop` already restarts the track.
  if (state.isRepeat) return;
  nextSong();
}

/* ---------- 14. EVENT LISTENERS ---------- */
playBtn.addEventListener("click", togglePlay);
prevBtn.addEventListener("click", prevSong);
nextBtn.addEventListener("click", nextSong);
shuffleBtn.addEventListener("click", toggleShuffle);
repeatBtn.addEventListener("click", toggleRepeat);
favoriteBtn.addEventListener("click", toggleFavorite);

progressBar.addEventListener("click", seek);
volumeBar.addEventListener("click", handleVolumeClick);
muteBtn.addEventListener("click", toggleMute);

audio.addEventListener("timeupdate", updateProgress);
audio.addEventListener("loadedmetadata", updateDuration);
audio.addEventListener("ended", handleSongEnd);

// Keyboard shortcuts: Space = play/pause, arrows = prev/next
document.addEventListener("keydown", (e) => {
  // Ignore shortcuts while typing in an input/textarea (future-proofing)
  const tag = document.activeElement.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return;

  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  } else if (e.code === "ArrowLeft") {
    prevSong();
  } else if (e.code === "ArrowRight") {
    nextSong();
  }
});

/* ---------- 15. INITIALIZATION ---------- */
function init() {
  renderPlaylist();
  loadSong(0);
  setVolume(0.7);

  // Hide the loading screen once everything is ready
  window.addEventListener("load", () => {
    setTimeout(() => {
      loader.classList.add("hidden");
    }, 600);
  });

  // Fallback in case the load event already fired
  setTimeout(() => loader.classList.add("hidden"), 2000);
}

init();