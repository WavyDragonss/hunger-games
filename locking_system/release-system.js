(function () {
  "use strict";

  var DAY_MS = 24 * 60 * 60 * 1000;

  function parseStartMoment(config) {
    if (config.startMomentISO) {
      var isoDate = new Date(config.startMomentISO);
      if (!Number.isNaN(isoDate.getTime())) {
        return isoDate.getTime();
      }
    }

    if (!config.startDate) {
      return NaN;
    }

    var dateMatch = String(config.startDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) {
      return NaN;
    }

    var year = parseInt(dateMatch[1], 10);
    var month = parseInt(dateMatch[2], 10) - 1;
    var day = parseInt(dateMatch[3], 10);
    var hour = parseInt(config.dailyUnlockHour, 10);
    var minute = parseInt(config.dailyUnlockMinute, 10);

    var safeHour = Number.isFinite(hour) ? clamp(hour, 0, 23) : 0;
    var safeMinute = Number.isFinite(minute) ? clamp(minute, 0, 59) : 0;

    return new Date(year, month, day, safeHour, safeMinute, 0, 0).getTime();
  }

  function getUnlockTime(dayNumber, config) {
    var start = parseStartMoment(config || {});
    if (!Number.isFinite(start) || dayNumber < 1) {
      return NaN;
    }
    return start + (dayNumber - 1) * DAY_MS;
  }

  function getDayState(dayNumber, config, nowMs) {
    var unlockMs = getUnlockTime(dayNumber, config);
    var now = Number.isFinite(nowMs) ? nowMs : Date.now();
    if (!Number.isFinite(unlockMs)) {
      return {
        valid: false,
        locked: true,
        unlockMs: NaN,
        msRemaining: NaN
      };
    }

    var bypass = isPreviewEnabled(config);
    var msRemaining = unlockMs - now;
    return {
      valid: true,
      locked: bypass ? false : msRemaining > 0,
      unlockMs: unlockMs,
      msRemaining: Math.max(0, msRemaining),
      bypass: bypass
    };
  }

  function getNextUnlockInfo(totalDays, config, nowMs) {
    var safeTotal = Math.max(0, parseInt(totalDays, 10) || 0);
    var now = Number.isFinite(nowMs) ? nowMs : Date.now();
    if (isPreviewEnabled(config)) {
      return null;
    }
    for (var i = 1; i <= safeTotal; i += 1) {
      var state = getDayState(i, config, now);
      if (state.valid && state.locked) {
        return {
          dayNumber: i,
          unlockMs: state.unlockMs,
          msRemaining: state.msRemaining
        };
      }
    }
    return null;
  }

  function isPreviewEnabled(config) {
    var cfg = config || {};
    var paramName = cfg.previewParam || "preview";
    var storageKey = cfg.previewStorageKey || "hunger_preview_mode";

    try {
      var params = new URLSearchParams(window.location.search || "");
      var q = params.get(paramName);
      if (q === "1" || q === "true") {
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

  function formatDateTime(ms, locale) {
    var date = new Date(ms);
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

  function formatDuration(msInput) {
    var ms = Math.max(0, Math.floor(msInput || 0));
    var totalSeconds = Math.floor(ms / 1000);
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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  window.HungerReleaseSystem = {
    getUnlockTime: getUnlockTime,
    getDayState: getDayState,
    getNextUnlockInfo: getNextUnlockInfo,
    isPreviewEnabled: isPreviewEnabled,
    formatDateTime: formatDateTime,
    formatDuration: formatDuration
  };
})();
