(function () {
  "use strict";

  var COOLDOWN_SECONDS = 20;
  var COOLDOWN_STORE_KEY = "maze_feedback_cooldown_until";
  var cooldownUntilMs = 0;
  var cooldownTimerId = null;

  var form = document.getElementById("feedbackForm");
  var fieldset = document.getElementById("feedbackFieldset");
  var statusEl = document.getElementById("feedbackStatus");
  var sendBtn = document.getElementById("sendBtn");
  var overlay = document.getElementById("cooldownOverlay");
  var cooldownSecondsEl = document.getElementById("cooldownSeconds");

  if (!form || !fieldset || !statusEl || !sendBtn || !overlay || !cooldownSecondsEl) {
    return;
  }

  restoreCooldown();

  form.addEventListener("submit", function (event) {
    // Always block native navigation; feedback is sent with fetch.
    event.preventDefault();
  });

  sendBtn.addEventListener("click", function () {
    submitFeedback();
  });

  function submitFeedback() {
    if (isCoolingDown()) {
      return;
    }
    if (!form.reportValidity()) {
      return;
    }

    statusEl.textContent = "Sending feedback...";
    statusEl.classList.remove("error");
    sendBtn.disabled = true;

    var discordTag = document.getElementById("discordTag");
    var issueTitle = document.getElementById("issueTitle");
    var description = document.getElementById("description");
    var upload = document.getElementById("upload");

    var discordTagValue = discordTag ? discordTag.value.trim() : "";
    var issueTitleValue = issueTitle ? issueTitle.value.trim() : "";
    var descriptionValue = description ? description.value.trim() : "";

    var message = "Discord: " + discordTagValue + "\nTitle: " + issueTitleValue + "\n\n" + descriptionValue;

    var hasFile = upload && upload.files && upload.files.length;
    var body;
    var headers = { "Accept": "application/json" };

    if (hasFile) {
      body = new FormData();
      body.append("message", message);
      body.append("discordTag", discordTagValue);
      body.append("issueTitle", issueTitleValue);
      body.append("description", descriptionValue);
      body.append("_subject", "Maze Runner feedback: " + issueTitleValue);
      body.append("upload", upload.files[0]);
    } else {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      body = new URLSearchParams({
        message: message,
        discordTag: discordTagValue,
        issueTitle: issueTitleValue,
        description: descriptionValue,
        _subject: "Maze Runner feedback: " + issueTitleValue
      }).toString();
    }

    fetch(form.action, {
      method: "POST",
      headers: headers,
      body: body
    })
      .then(function (response) {
        return response.json().catch(function () {
          return {};
        }).then(function (data) {
          return {
            ok: response.ok,
            status: response.status,
            data: data
          };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          var errors = Array.isArray(result.data && result.data.errors) ? result.data.errors : [];
          var firstError = errors.length ? String(errors[0].message || "Request failed") : "Request failed";
          throw createSubmissionError(firstError, result.status);
        }

        form.reset();
        statusEl.textContent = "";
        startCooldown(COOLDOWN_SECONDS);
      })
      .catch(function (err) {
        statusEl.textContent = buildTroubleshootingText(err);
        statusEl.classList.add("error");
      })
      .finally(function () {
        sendBtn.disabled = isCoolingDown();
      });
  }

  function createSubmissionError(message, status) {
    var err = new Error(message || "Request failed");
    err.status = status || 0;
    return err;
  }

  function buildTroubleshootingText(err) {
    var baseMessage = err && err.message ? err.message : "Could not send feedback right now.";
    var status = err && err.status ? err.status : 0;
    var hints = [];

    if (status === 403 || /inactive|confirm|verify|unverified/i.test(baseMessage)) {
      hints.push("Verify your Formspree account email and confirm that this form endpoint is active.");
    }

    if (status === 422) {
      hints.push("Check required fields and make sure each submitted field has a name attribute.");
    }

    if (status === 429) {
      hints.push("Too many requests were sent. Wait a moment, then try again.");
    }

    if (status >= 500) {
      hints.push("Formspree may be having an outage. Check https://status.formspree.io");
    }

    if (window.location && window.location.protocol === "file:") {
      hints.push("Open this page through a local web server instead of file://.");
    }

    if (!hints.length) {
      hints.push("Double-check the form action endpoint, method=POST, spam/junk folders, and sender unblocking at https://formspree.io/unblock/<your@email.com>.");
    }

    return baseMessage + " " + hints.join(" ");
  }

  function startCooldown(seconds) {
    cooldownUntilMs = Date.now() + (Math.max(1, seconds) * 1000);
    persistCooldownUntil();
    fieldset.disabled = true;
    overlay.classList.remove("hidden");
    updateCooldownUi();

    if (cooldownTimerId !== null) {
      window.clearInterval(cooldownTimerId);
    }

    cooldownTimerId = window.setInterval(function () {
      updateCooldownUi();
      if (!isCoolingDown()) {
        window.clearInterval(cooldownTimerId);
        cooldownTimerId = null;
        endCooldown();
      }
    }, 1000);
  }

  function endCooldown() {
    fieldset.disabled = false;
    sendBtn.disabled = false;
    overlay.classList.add("hidden");
    cooldownSecondsEl.textContent = String(COOLDOWN_SECONDS);
    cooldownUntilMs = 0;
    clearPersistedCooldown();
  }

  function isCoolingDown() {
    return getRemainingSeconds() > 0;
  }

  function getRemainingSeconds() {
    if (!cooldownUntilMs) {
      return 0;
    }
    var remainingMs = cooldownUntilMs - Date.now();
    if (remainingMs <= 0) {
      return 0;
    }
    return Math.ceil(remainingMs / 1000);
  }

  function updateCooldownUi() {
    cooldownSecondsEl.textContent = String(getRemainingSeconds());
  }

  function restoreCooldown() {
    var persisted = readPersistedCooldownUntil();
    if (!persisted) {
      return;
    }

    cooldownUntilMs = persisted;
    if (isCoolingDown()) {
      fieldset.disabled = true;
      sendBtn.disabled = true;
      overlay.classList.remove("hidden");
      updateCooldownUi();

      cooldownTimerId = window.setInterval(function () {
        updateCooldownUi();
        if (!isCoolingDown()) {
          window.clearInterval(cooldownTimerId);
          cooldownTimerId = null;
          endCooldown();
        }
      }, 1000);
      return;
    }

    endCooldown();
  }

  function persistCooldownUntil() {
    try {
      window.localStorage.setItem(COOLDOWN_STORE_KEY, String(cooldownUntilMs));
    } catch (err) {
      // Ignore storage failures and keep runtime cooldown behavior.
    }
  }

  function readPersistedCooldownUntil() {
    try {
      var raw = window.localStorage.getItem(COOLDOWN_STORE_KEY);
      var parsed = parseInt(raw || "0", 10);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch (err) {
      return 0;
    }
  }

  function clearPersistedCooldown() {
    try {
      window.localStorage.removeItem(COOLDOWN_STORE_KEY);
    } catch (err) {
      // Ignore storage failures and keep runtime cooldown behavior.
    }
  }
})();
