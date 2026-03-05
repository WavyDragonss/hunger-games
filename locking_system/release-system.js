(function () {
  "use strict";

  var DEFAULT_SECONDS_PER_DAY = 86400;
  var serverOffsetSeconds = 0;
  var serverSyncInFlight = null;

  function resolveStartUnix(config) {
    var cfg = config || {};
    var parsed = parseInt(cfg.startUnix, 10);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function resolveSecondsPerDay(config) {
    var cfg = config || {};
    var parsed = parseInt(cfg.secondsPerDay, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return DEFAULT_SECONDS_PER_DAY;
    }
    return parsed;
  }

  function getUnlockTime(dayNumber, config) {
    var startUnix = resolveStartUnix(config);
    var secondsPerDay = resolveSecondsPerDay(config);
    if (!Number.isFinite(startUnix) || dayNumber < 1) {
      return NaN;
    }
    return startUnix + (dayNumber - 1) * secondsPerDay;
  }

  function getDayState(dayNumber, config, nowUnix) {
    var unlockUnix = getUnlockTime(dayNumber, config);
    var now = Number.isFinite(nowUnix) ? Math.floor(nowUnix) : getCurrentUnix();
    if (!Number.isFinite(unlockUnix)) {
      return {
        valid: false,
        locked: true,
        unlockUnix: NaN,
        secondsRemaining: NaN
      };
    }

    var bypass = isPreviewEnabled(config);
    var secondsRemaining = unlockUnix - now;
    return {
      valid: true,
      locked: bypass ? false : secondsRemaining > 0,
      unlockUnix: unlockUnix,
      secondsRemaining: Math.max(0, secondsRemaining),
      bypass: bypass
    };
  }

  function getNextUnlockInfo(totalDays, config, nowUnix) {
    var safeTotal = Math.max(0, parseInt(totalDays, 10) || 0);
    var now = Number.isFinite(nowUnix) ? Math.floor(nowUnix) : getCurrentUnix();
    if (isPreviewEnabled(config)) {
      return null;
    }
    for (var i = 1; i <= safeTotal; i += 1) {
      var state = getDayState(i, config, now);
      if (state.valid && state.locked) {
        return {
          dayNumber: i,
          unlockUnix: state.unlockUnix,
          secondsRemaining: state.secondsRemaining
        };
      }
    }
    return null;
  }

  function isPreviewEnabled(config) {
    var cfg = config || {};
    var paramName = cfg.previewParam || "preview";
    var enableToken = String(cfg.previewEnableToken || "1");
    var storageKey = cfg.previewStorageKey || "hunger_preview_mode";

    try {
      var params = new URLSearchParams(window.location.search || "");
      var q = params.get(paramName);
      if (q === enableToken) {
        window.localStorage.setItem(storageKey, "true");
        return true;
      }
      if (q === "0" || q === "false") {
        window.localStorage.setItem(storageKey, "false");
        return false;
      }
    } catch (err) {
      // Ignore query parsing issues.
    }

    try {
      return window.localStorage.getItem(storageKey) === "true";
    } catch (err2) {
      return false;
    }
  }

  function formatDateTime(unixSeconds, locale) {
    var date = new Date(toMillis(unixSeconds));
    if (Number.isNaN(date.getTime())) {
      return "Invalid date";
    }
    return new Intl.DateTimeFormat(locale || "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function formatDuration(totalSecondsInput) {
    var totalSeconds = Math.max(0, Math.floor(totalSecondsInput || 0));
    var days = Math.floor(totalSeconds / 86400);
    var hours = Math.floor((totalSeconds % 86400) / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;

    return {
      days: days,
      hours: hours,
      minutes: minutes,
      seconds: seconds,
      text: pad(days) + "d " + pad(hours) + "h " + pad(minutes) + "m " + pad(seconds) + "s"
    };
  }

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function getCurrentUnix() {
    return Math.floor(Date.now() / 1000) + serverOffsetSeconds;
  }

  function syncServerTime(config) {
    if (serverSyncInFlight) {
      return serverSyncInFlight;
    }

    var cfg = config || {};
    var url = String(cfg.serverTimeUrl || "").trim();
    if (!url) {
      serverOffsetSeconds = parseInt(cfg.serverUnixOffset, 10) || 0;
      return Promise.resolve({ synced: false, offsetSeconds: serverOffsetSeconds });
    }

    serverSyncInFlight = fetch(url, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) {
          throw new Error("Time endpoint returned " + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        var serverUnix = extractUnixFromPayload(data);
        if (!Number.isFinite(serverUnix)) {
          throw new Error("Server response did not include a unix timestamp.");
        }
        var localUnix = Math.floor(Date.now() / 1000);
        serverOffsetSeconds = serverUnix - localUnix;
        return {
          synced: true,
          offsetSeconds: serverOffsetSeconds,
          serverUnix: serverUnix
        };
      })
      .catch(function () {
        return {
          synced: false,
          offsetSeconds: serverOffsetSeconds
        };
      })
      .finally(function () {
        serverSyncInFlight = null;
      });

    return serverSyncInFlight;
  }

  function extractUnixFromPayload(data) {
    if (!data || typeof data !== "object") {
      return NaN;
    }

    var candidates = [data.unixtime, data.unixTime, data.unix, data.timestamp, data.epoch];
    for (var i = 0; i < candidates.length; i += 1) {
      var parsed = parseNumberish(candidates[i]);
      if (!Number.isFinite(parsed)) {
        continue;
      }
      if (parsed > 1000000000000) {
        return Math.floor(parsed / 1000);
      }
      return Math.floor(parsed);
    }

    return NaN;
  }

  function parseNumberish(value) {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      var parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : NaN;
    }
    return NaN;
  }

  function toMillis(unixSeconds) {
    if (!Number.isFinite(unixSeconds)) {
      return NaN;
    }
    if (unixSeconds > 1000000000000) {
      return unixSeconds;
    }
    return Math.floor(unixSeconds) * 1000;
  }

  window.HungerReleaseSystem = {
    getUnlockTime: getUnlockTime,
    getDayState: getDayState,
    getNextUnlockInfo: getNextUnlockInfo,
    isPreviewEnabled: isPreviewEnabled,
    getCurrentUnix: getCurrentUnix,
    syncServerTime: syncServerTime,
    formatDateTime: formatDateTime,
    formatDuration: formatDuration
  };
})();
