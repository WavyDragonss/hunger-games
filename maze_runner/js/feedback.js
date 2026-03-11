(function () {
  "use strict";

  var COOLDOWN_SECONDS = 20;
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

    var formData = new FormData();
    var discordTag = document.getElementById("discordTag");
    var issueTitle = document.getElementById("issueTitle");
    var description = document.getElementById("description");
    var upload = document.getElementById("upload");

    formData.append("discordTag", discordTag ? discordTag.value.trim() : "");
    formData.append("issueTitle", issueTitle ? issueTitle.value.trim() : "");
    formData.append("description", description ? description.value.trim() : "");
    formData.append("_subject", "Maze Runner feedback: " + (issueTitle ? issueTitle.value.trim() : ""));

    if (upload && upload.files && upload.files.length) {
      formData.append("upload", upload.files[0]);
    }

    fetch(form.action, {
      method: "POST",
      headers: {
        "Accept": "application/json"
      },
      body: formData
    })
      .then(function (response) {
        return response.json().catch(function () {
          return {};
        }).then(function (data) {
          return {
            ok: response.ok,
            data: data
          };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          var errors = Array.isArray(result.data && result.data.errors) ? result.data.errors : [];
          var firstError = errors.length ? String(errors[0].message || "Request failed") : "Request failed";
          throw new Error(firstError);
        }

        form.reset();
        statusEl.textContent = "";
        startCooldown(COOLDOWN_SECONDS);
      })
      .catch(function (err) {
        var details = err && err.message ? err.message : "Could not send feedback right now.";
        if (window.location && window.location.protocol === "file:") {
          details += " Open this page through a local web server instead of file://.";
        }
        statusEl.textContent = details;
        statusEl.classList.add("error");
      })
      .finally(function () {
        sendBtn.disabled = isCoolingDown();
      });
  }

  function startCooldown(seconds) {
    cooldownUntilMs = Date.now() + (Math.max(1, seconds) * 1000);
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
})();
