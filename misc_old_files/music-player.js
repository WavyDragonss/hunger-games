/**
 * Reusable Music Player Module — Glass Panel UI
 */

function initMusicPlayer(songsArray) {
  if (!songsArray || songsArray.length === 0) {
    console.warn("Music player: no songs provided");
    return;
  }

  var currentIndex = 0;
  var isPlaying = false;
  var isDraggingProgress = false;
  var creditsOpen = false;
  var rafId = 0;

  var player = document.getElementById("player");
  var musicPanel = document.getElementById("musicPanel");
  var musicPanelToggle = document.getElementById("musicPanelToggle");
  var musicArtist = document.getElementById("musicArtist");
  var musicSong = document.getElementById("musicSong");
  var musicTimeCurrent = document.getElementById("musicTimeCurrent");
  var musicTimeTotal = document.getElementById("musicTimeTotal");
  var musicProgressBar = document.getElementById("musicProgressBar");
  var musicProgressFill = document.getElementById("musicProgressFill");
  var musicProgressDot = document.getElementById("musicProgressDot");
  var musicPlayPauseBtn = document.getElementById("musicPlayPauseBtn");
  var musicPrevBtn = document.getElementById("musicPrevBtn");
  var musicNextBtn = document.getElementById("musicNextBtn");
  var musicCreditsBtn = document.getElementById("musicCreditsBtn");
  var musicCredits = document.getElementById("musicCredits");

  if (
    !player ||
    !musicPanel ||
    !musicPanelToggle ||
    !musicArtist ||
    !musicSong ||
    !musicTimeCurrent ||
    !musicTimeTotal ||
    !musicProgressBar ||
    !musicProgressFill ||
    !musicProgressDot ||
    !musicPlayPauseBtn ||
    !musicPrevBtn ||
    !musicNextBtn ||
    !musicCreditsBtn ||
    !musicCredits
  ) {
    console.error("Music player: required elements not found");
    return;
  }

  function formatTime(seconds) {
    if (!isFinite(seconds)) {
      return "0:00";
    }
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderCredits(song) {
    var credits = song.credits || {};
    var lines = [];

    if (song.song) {
      lines.push('<span class="music-credit-label">Title:</span> ' + escapeHtml(song.song));
    }
    if (song.artist) {
      lines.push('<span class="music-credit-label">Singer:</span> ' + escapeHtml(song.artist));
    }
    if (credits.title) {
      lines.push('<span class="music-credit-label">Release:</span> ' + escapeHtml(credits.title));
    }
    if (credits.provider) {
      lines.push('<span class="music-credit-label">Provider:</span> ' + escapeHtml(credits.provider));
    }
    if (credits.download) {
      lines.push('<span class="music-credit-label">Free Download/Stream:</span> <a href="' + escapeHtml(credits.download) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(credits.download) + "</a>");
    }
    if (credits.watch) {
      lines.push('<span class="music-credit-label">Watch:</span> <a href="' + escapeHtml(credits.watch) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(credits.watch) + "</a>");
    }

    musicCredits.innerHTML = lines.join("<br>");
  }

  function setProgressByRatio(ratio) {
    var clamped = Math.max(0, Math.min(1, ratio));
    var pct = clamped * 100;
    musicProgressFill.style.width = pct + "%";
    musicProgressDot.style.left = pct + "%";
  }

  function updateProgressVisual() {
    if (!isFinite(player.duration) || player.duration <= 0) {
      musicTimeCurrent.textContent = "0:00";
      musicTimeTotal.textContent = "0:00";
      setProgressByRatio(0);
      return;
    }

    if (!isDraggingProgress) {
      setProgressByRatio(player.currentTime / player.duration);
    }

    musicTimeCurrent.textContent = formatTime(player.currentTime);
    musicTimeTotal.textContent = formatTime(player.duration);
  }

  function tick() {
    if (isPlaying) {
      updateProgressVisual();
      rafId = window.requestAnimationFrame(tick);
    }
  }

  function startTicker() {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    rafId = window.requestAnimationFrame(tick);
  }

  function stopTicker() {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function loadSong(index) {
    var song = songsArray[index];
    currentIndex = index;

    musicArtist.textContent = song.artist || "Unknown Artist";
    musicSong.textContent = song.song || "Unknown Song";
    renderCredits(song);
    player.src = song.file;

    setProgressByRatio(0);
    musicTimeCurrent.textContent = "0:00";
    musicTimeTotal.textContent = "0:00";
  }

  function playCurrent() {
    var playPromise = player.play();
    isPlaying = true;
    musicPlayPauseBtn.textContent = "⏸";
    startTicker();

    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {
        isPlaying = false;
        musicPlayPauseBtn.textContent = "▶";
        stopTicker();
      });
    }
  }

  function pauseCurrent() {
    player.pause();
    isPlaying = false;
    musicPlayPauseBtn.textContent = "▶";
    stopTicker();
    updateProgressVisual();
  }

  function togglePlayPause() {
    if (isPlaying) {
      pauseCurrent();
    } else {
      playCurrent();
    }
  }

  function seekToMouse(event) {
    var clientX = getClientX(event);
    if (clientX === null) {
      return;
    }
    var rect = musicProgressBar.getBoundingClientRect();
    var ratio = (clientX - rect.left) / rect.width;
    var clamped = Math.max(0, Math.min(1, ratio));
    setProgressByRatio(clamped);
    if (isFinite(player.duration) && player.duration > 0) {
      player.currentTime = clamped * player.duration;
      musicTimeCurrent.textContent = formatTime(player.currentTime);
    }
  }

  function getClientX(event) {
    if (!event) {
      return null;
    }
    if (typeof event.clientX === "number") {
      return event.clientX;
    }
    if (event.touches && event.touches.length) {
      return event.touches[0].clientX;
    }
    if (event.changedTouches && event.changedTouches.length) {
      return event.changedTouches[0].clientX;
    }
    return null;
  }

  function goNext(forcePlay) {
    var shouldPlay = typeof forcePlay === "boolean" ? forcePlay : isPlaying;
    currentIndex = (currentIndex + 1) % songsArray.length;
    loadSong(currentIndex);
    if (shouldPlay) {
      playCurrent();
    }
  }

  function goPrev(forcePlay) {
    var shouldPlay = typeof forcePlay === "boolean" ? forcePlay : isPlaying;
    currentIndex = (currentIndex - 1 + songsArray.length) % songsArray.length;
    loadSong(currentIndex);
    if (shouldPlay) {
      playCurrent();
    }
  }

  musicPanelToggle.addEventListener("click", function () {
    musicPanel.classList.toggle("open");
  });

  document.addEventListener("pointerdown", function (event) {
    if (!musicPanel.classList.contains("open")) {
      return;
    }

    var clickedToggle = musicPanelToggle.contains(event.target);
    var clickedInsidePanel = musicPanel.contains(event.target);
    if (!clickedToggle && !clickedInsidePanel) {
      musicPanel.classList.remove("open");
    }
  });

  musicCreditsBtn.addEventListener("click", function () {
    creditsOpen = !creditsOpen;
    musicCredits.hidden = !creditsOpen;
  });

  musicPlayPauseBtn.addEventListener("click", togglePlayPause);
  musicNextBtn.addEventListener("click", goNext);
  musicPrevBtn.addEventListener("click", goPrev);

  musicProgressBar.addEventListener("click", seekToMouse);
  musicProgressBar.addEventListener("mousedown", function (event) {
    isDraggingProgress = true;
    seekToMouse(event);
  });
  musicProgressBar.addEventListener("touchstart", function (event) {
    isDraggingProgress = true;
    seekToMouse(event);
    event.preventDefault();
  }, { passive: false });

  document.addEventListener("mousemove", function (event) {
    if (isDraggingProgress) {
      seekToMouse(event);
    }
  });
  document.addEventListener("touchmove", function (event) {
    if (isDraggingProgress) {
      seekToMouse(event);
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener("mouseup", function () {
    isDraggingProgress = false;
  });
  document.addEventListener("touchend", function () {
    isDraggingProgress = false;
  });

  player.addEventListener("loadedmetadata", updateProgressVisual);
  player.addEventListener("timeupdate", updateProgressVisual);
  player.addEventListener("ended", function () {
    goNext(true);
  });
  player.addEventListener("pause", function () {
    if (!player.ended) {
      isPlaying = false;
      musicPlayPauseBtn.textContent = "▶";
      stopTicker();
    }
  });

  player.volume = 0.5;
  loadSong(0);

  window.musicPlayer = {
    play: playCurrent,
    pause: pauseCurrent,
    next: goNext,
    prev: goPrev,
    setVolume: function (vol) {
      player.volume = Math.max(0, Math.min(1, vol));
    },
    openPanel: function () {
      musicPanel.classList.add("open");
    },
    closePanel: function () {
      musicPanel.classList.remove("open");
    }
  };
}
