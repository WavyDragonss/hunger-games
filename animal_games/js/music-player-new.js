/**
 * Reusable Music Player Module — Glass Panel UI
 * 
 * Interactive music player with:
 * - Glass-style panel with backdrop blur
 * - Seekable progress bar (click/drag)
 * - Time display (0:05 / 2:45 format)
 * - Play/pause toggle
 * - Next song button
 * 
 * Usage: initMusicPlayer(songsArray)
 * Songs format: [{file: "path.mp3", title: "Artist — Song"}, ...]
 */

function initMusicPlayer(songsArray) {
  if (!songsArray || songsArray.length === 0) {
    console.warn("Music player: no songs provided");
    return;
  }

  let currentIndex = 0;
  let isPlaying = false;
  let isDraggingProgress = false;

  // DOM elements
  const player = document.getElementById("player");
  const musicPanel = document.getElementById("musicPanel");
  const musicPanelToggle = document.getElementById("musicPanelToggle");
  const musicArtist = document.getElementById("musicArtist");
  const musicSong = document.getElementById("musicSong");
  const musicTimeCurrent = document.getElementById("musicTimeCurrent");
  const musicTimeTotal = document.getElementById("musicTimeTotal");
  const musicProgressBar = document.getElementById("musicProgressBar");
  const musicProgressFill = document.getElementById("musicProgressFill");
  const musicProgressDot = document.getElementById("musicProgressDot");
  const musicPlayPauseBtn = document.getElementById("musicPlayPauseBtn");
  const musicNextBtn = document.getElementById("musicNextBtn");

  if (!player || !musicPanel) {
    console.error("Music player: required elements not found");
    return;
  }

  // Utility: Format seconds to MM:SS
  function formatTime(seconds) {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
  }

  // Update progress bar and time display
  function updateProgress() {
    if (!player.duration || !isFinite(player.duration)) {
      return;
    }

    const percent = (player.currentTime / player.duration) * 100;
    if (!isDraggingProgress) {
      musicProgressFill.style.width = percent + "%";
      musicProgressDot.style.left = percent + "%";
    }

    musicTimeCurrent.textContent = formatTime(player.currentTime);
  }

  // Load and display a song
  function loadSong(index) {
    const song = songsArray[index];
    currentIndex = index;

    // Parse "Artist — Song" format
    const parts = song.title.split(" — ").map(s => s.trim());
    const artist = parts[0] || "Unknown Artist";
    const title = parts[1] || parts[0] || "Unknown Song";

    musicArtist.textContent = artist;
    musicSong.textContent = title;
    player.src = song.file;
    
    // Reset progress
    musicProgressFill.style.width = "0%";
    musicProgressDot.style.left = "0%";
    musicTimeCurrent.textContent = "0:00";

    // Once metadata loads, update total time
    player.onloadedmetadata = function() {
      musicTimeTotal.textContent = formatTime(player.duration);
    };
  }

  // Play/Pause toggle
  function togglePlayPause() {
    if (isPlaying) {
      player.pause();
      isPlaying = false;
      musicPlayPauseBtn.textContent = "▶";
    } else {
      player.play();
      isPlaying = true;
      musicPlayPauseBtn.textContent = "⏸";
    }
  }

  // Progress bar seeking
  function seekToMouse(event) {
    const rect = musicProgressBar.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const clampedPercent = Math.max(0, Math.min(1, percent));
    
    if (isFinite(player.duration)) {
      player.currentTime = clampedPercent * player.duration;
      musicProgressFill.style.width = (clampedPercent * 100) + "%";
      musicProgressDot.style.left = (clampedPercent * 100) + "%";
    }
  }

  // Panel toggle
  function togglePanel() {
    musicPanel.classList.toggle("open");
  }

  // Event listeners

  musicPanelToggle.addEventListener("click", togglePanel);

  // Load first song on initialization
  loadSong(0);

  // Progress updates
  player.addEventListener("timeupdate", updateProgress);

  // When metadata loads (duration becomes available)
  player.addEventListener("loadedmetadata", function() {
    musicTimeTotal.textContent = formatTime(player.duration);
  });

  // When song ends, play next
  player.addEventListener("ended", function() {
    currentIndex = (currentIndex + 1) % songsArray.length;
    loadSong(currentIndex);
    player.play();
  });

  // Progress bar click to seek
  musicProgressBar.addEventListener("click", seekToMouse);

  // Progress bar drag to scrub
  musicProgressBar.addEventListener("mousedown", function(event) {
    isDraggingProgress = true;
    seekToMouse(event);
  });

  document.addEventListener("mousemove", function(event) {
    if (isDraggingProgress) {
      seekToMouse(event);
    }
  });

  document.addEventListener("mouseup", function() {
    isDraggingProgress = false;
  });

  // Play/Pause button
  musicPlayPauseBtn.addEventListener("click", togglePlayPause);

  // Next button
  musicNextBtn.addEventListener("click", function() {
    currentIndex = (currentIndex + 1) % songsArray.length;
    loadSong(currentIndex);
    if (isPlaying) {
      player.play();
    }
  });

  // Set default volume
  player.volume = 0.5;

  // Expose API for external control
  window.musicPlayer = {
    play: function() {
      player.play();
      isPlaying = true;
      musicPlayPauseBtn.textContent = "⏸";
    },
    pause: function() {
      player.pause();
      isPlaying = false;
      musicPlayPauseBtn.textContent = "▶";
    },
    next: function() {
      currentIndex = (currentIndex + 1) % songsArray.length;
      loadSong(currentIndex);
      if (isPlaying) player.play();
    },
    prev: function() {
      currentIndex = (currentIndex - 1 + songsArray.length) % songsArray.length;
      loadSong(currentIndex);
      if (isPlaying) player.play();
    },
    setVolume: function(vol) {
      player.volume = Math.max(0, Math.min(1, vol));
    },
    openPanel: togglePanel,
    closePanel: function() {
      musicPanel.classList.remove("open");
    }
  };
}
