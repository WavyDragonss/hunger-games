(function () {
  "use strict";

  var FACTIONS = {
    "astral-wardens": {
      name: "Astral Wardens",
      core: "#12326A",
      secondary: "#F2F6FF",
      accent: "#7FF5FF",
      summary: "A disciplined cosmic guard that opens the event with calculated control and precision pacing.",
      focus: "On every day, run Astral as a clean strategic lane on its own world map. Keep tempo measured and positional."
    },
    "obsidian-dominion": {
      name: "Furious Floofs",
      core: "#2A123A",
      secondary: "#D4B56A",
      accent: "#A3122A",
      summary: "A chaotic power faction with pressure-heavy presence and relentless momentum.",
      focus: "On every day, run Furious Floofs as a dominance lane on a separate world. Build pressure and force reactions."
    },
    "velocity-syndicate": {
      name: "Velocity Syndicate",
      core: "#DB1D2D",
      secondary: "#C7FF22",
      accent: "#FFFFFF",
      summary: "A high-speed wildcard team built around momentum spikes, disruption, and mechanical aggression.",
      focus: "On every day, run Velocity as a momentum lane in its own world. Hit fast spikes and sudden instability."
    }
  };

  var DAY_PLAN = [
    {
      phase: "Phase Zero",
      day: 0,
      worlds: [
        { faction: "astral-wardens", world: "Celestial Bastion", note: "Presentation and faction brief" },
        { faction: "obsidian-dominion", world: "Black Throne Expanse", note: "Presentation and faction brief" },
        { faction: "velocity-syndicate", world: "Redline Sector", note: "Presentation and faction brief" }
      ]
    },
    {
      phase: "Day 1",
      day: 1,
      worlds: [
        { faction: "astral-wardens", world: "Celestial Bastion", note: "Defensive calculus and formation testing" },
        { faction: "obsidian-dominion", world: "Black Throne Expanse", note: "Resource choke points established" },
        { faction: "velocity-syndicate", world: "Redline Sector", note: "Speed-control gambits" }
      ]
    },
    {
      phase: "Day 2",
      day: 2,
      worlds: [
        { faction: "astral-wardens", world: "Celestial Bastion", note: "Counterplay prep and intel map" },
        { faction: "obsidian-dominion", world: "Black Throne Expanse", note: "Escalation through influence" },
        { faction: "velocity-syndicate", world: "Redline Sector", note: "Burst offense windows" }
      ]
    },
    {
      phase: "Day 3",
      day: 3,
      worlds: [
        { faction: "astral-wardens", world: "Celestial Bastion", note: "Forward pressure and route denial" },
        { faction: "obsidian-dominion", world: "Black Throne Expanse", note: "Dominion expansion and control tax" },
        { faction: "velocity-syndicate", world: "Redline Sector", note: "Chain pushes and collapse attempts" }
      ]
    }
  ];

  var FALLBACK_LEADERS = {
    "astral-wardens": "space_fan",
    "obsidian-dominion": "Ninnginni",
    "velocity-syndicate": "Rabbit"
  };

  var state = {
    activeFaction: "astral-wardens",
    focusedOnly: true,
    teamRosters: {},
    availablePlan: [],
    memberMatchers: [],
    dayTextByDay: {},
    readerDay: null,
    readerFaction: "astral-wardens",
    readerWorld: "",
    readerTheme: "dark",
    readerMode: "paged",
    readerWidth: "narrow",
    readerFontScale: 1,
    readerQuery: "",
    selectedName: "",
    selectedNameLabel: "",
    progressByDay: {}
  };

  var subtitle = document.getElementById("subtitle");
  var readerPanel = document.getElementById("readerPanel");
  var readerTitle = document.getElementById("readerTitle");
  var readerMeta = document.getElementById("readerMeta");
  var readerBody = document.getElementById("readerBody");
  var readerSearchInput = document.getElementById("readerSearchInput");
  var readerWorldSelect = document.getElementById("readerWorldSelect");
  var characterPicker = document.getElementById("characterPicker");
  var readerFactionSelect = document.getElementById("readerFactionSelect");
  var readerThemeToggle = document.getElementById("readerThemeToggle");
  var readerWidthToggle = document.getElementById("readerWidthToggle");
  var readerFontDown = document.getElementById("readerFontDown");
  var readerFontUp = document.getElementById("readerFontUp");
  var readerPrevDayBtn = document.getElementById("readerPrevDayBtn");
  var readerNextDayBtn = document.getElementById("readerNextDayBtn");
  var readerModeInputs = document.querySelectorAll("input[name='readerMode']");
  var focusLabel = document.getElementById("focusLabel");
  var progressLabel = document.getElementById("progressLabel");

  var STORE_KEYS = {
    faction: "animal_faction",
    focused: "animal_focused",
    readerDay: "animal_reader_day",
    readerFaction: "animal_reader_faction",
    readerWorld: "animal_reader_world",
    readerTheme: "animal_reader_theme",
    readerMode: "animal_reader_mode",
    readerWidth: "animal_reader_width",
    readerFontScale: "animal_reader_font_scale",
    readerProgress: "animal_reader_progress_by_day"
  };

  function saveStore() {
    try {
      localStorage.setItem(STORE_KEYS.faction, state.activeFaction);
      localStorage.setItem(STORE_KEYS.focused, state.focusedOnly ? "true" : "false");
      localStorage.setItem(STORE_KEYS.readerDay, state.readerDay === null ? "" : String(state.readerDay));
      localStorage.setItem(STORE_KEYS.readerFaction, state.readerFaction);
      localStorage.setItem(STORE_KEYS.readerWorld, state.readerWorld);
      localStorage.setItem(STORE_KEYS.readerTheme, state.readerTheme);
      localStorage.setItem(STORE_KEYS.readerMode, state.readerMode);
      localStorage.setItem(STORE_KEYS.readerWidth, state.readerWidth);
      localStorage.setItem(STORE_KEYS.readerFontScale, String(state.readerFontScale));
      localStorage.setItem(STORE_KEYS.readerProgress, JSON.stringify(state.progressByDay || {}));
    } catch (e) {}
  }

  function restoreStore() {
    try {
      var savedFaction = localStorage.getItem(STORE_KEYS.faction);
      if (savedFaction && FACTIONS[savedFaction]) {
        state.activeFaction = savedFaction;
      }

      var savedFocused = localStorage.getItem(STORE_KEYS.focused);
      if (savedFocused !== null) {
        state.focusedOnly = savedFocused !== "false";
      }

      var savedReaderDay = localStorage.getItem(STORE_KEYS.readerDay);
      if (savedReaderDay !== null && savedReaderDay !== "") {
        var parsedDay = parseInt(savedReaderDay, 10);
        if (!isNaN(parsedDay)) {
          state.readerDay = parsedDay;
        }
      }

      var savedReaderFaction = localStorage.getItem(STORE_KEYS.readerFaction);
      if (savedReaderFaction && FACTIONS[savedReaderFaction]) {
        state.readerFaction = savedReaderFaction;
      }

      var savedReaderWorld = localStorage.getItem(STORE_KEYS.readerWorld);
      if (savedReaderWorld !== null) {
        state.readerWorld = savedReaderWorld;
      }

      var savedReaderTheme = localStorage.getItem(STORE_KEYS.readerTheme);
      if (savedReaderTheme === "dark" || savedReaderTheme === "light") {
        state.readerTheme = savedReaderTheme;
      }

      var savedReaderMode = localStorage.getItem(STORE_KEYS.readerMode);
      if (savedReaderMode === "paged" || savedReaderMode === "infinite") {
        state.readerMode = savedReaderMode;
      }

      var savedReaderWidth = localStorage.getItem(STORE_KEYS.readerWidth);
      if (savedReaderWidth === "narrow" || savedReaderWidth === "wide") {
        state.readerWidth = savedReaderWidth;
      }

      var savedReaderFontScale = parseFloat(localStorage.getItem(STORE_KEYS.readerFontScale) || "1");
      if (!isNaN(savedReaderFontScale)) {
        state.readerFontScale = clamp(savedReaderFontScale, 0.9, 1.35);
      }

      var savedProgress = localStorage.getItem(STORE_KEYS.readerProgress);
      if (savedProgress) {
        var parsedProgress = JSON.parse(savedProgress);
        if (parsedProgress && typeof parsedProgress === "object") {
          state.progressByDay = parsedProgress;
        }
      }
    } catch (e) {}
  }

  init();

  function init() {
    restoreStore();
    renderReaderFactionOptions();
    bindEvents();
    applyReaderTheme(state.readerTheme);
    applyReaderMode(state.readerMode);
    applyReaderWidth(state.readerWidth);
    applyReaderFontScale(state.readerFontScale);
    applyReaderFactionTheme(state.readerFaction);
    applyNameSelectionVisuals();
    updateProgress();
    if (subtitle) {
      subtitle.textContent = "Checking which day files exist...";
    }

    discoverAvailableDays()
      .finally(function () {
        rebuildMemberMatchersFromLoadedContent();
        var availableDays = getAvailableDayNumbers();
        if (!availableDays.length) {
          readerTitle.textContent = "Day Reader";
          readerMeta.textContent = "No day files found in content.";
          readerBody.innerHTML = '<p class="reader-empty">Add phase0.txt or day1.txt to begin reading.</p>';
          return;
        }

        if (state.readerDay === null || availableDays.indexOf(state.readerDay) === -1) {
          state.readerDay = availableDays[0];
        }

        state.readerWorld = getWorldForFaction(state.readerDay, state.readerFaction, state.readerWorld);
        openReader(state.readerDay, state.readerFaction, state.readerWorld);
        if (subtitle) {
          subtitle.textContent = "Use the controls to switch day, world, faction, and reader style.";
        }
      });
  }

  function bindEvents() {
    readerFactionSelect.addEventListener("change", function () {
      var selectedFaction = readerFactionSelect.value;
      if (!FACTIONS[selectedFaction] || state.readerDay === null) {
        return;
      }
      state.readerFaction = selectedFaction;
      state.readerWorld = getWorldForFaction(state.readerDay, selectedFaction, state.readerWorld);
      applyReaderFactionTheme(state.readerFaction);
      updateCharacterPickerForFaction();
      syncReaderSelectors();
      saveStore();
      renderReaderForSelection();
    });

    if (readerWorldSelect) {
      readerWorldSelect.addEventListener("change", function () {
        if (state.readerDay === null) {
          return;
        }
        var selectedWorld = readerWorldSelect.value;
        var match = getTrackByWorld(state.readerDay, selectedWorld);
        if (match) {
          state.readerWorld = match.world;
          state.readerFaction = match.faction;
          applyReaderFactionTheme(state.readerFaction);
          updateCharacterPickerForFaction();
          syncReaderSelectors();
          saveStore();
          renderReaderForSelection();
        }
      });
    }

    if (readerSearchInput) {
      readerSearchInput.addEventListener("input", function () {
        state.readerQuery = readerSearchInput.value.trim().toLowerCase();
        applyReaderSearch();
        updateProgress();
      });
    }

    if (characterPicker) {
      characterPicker.addEventListener("change", function () {
        var selected = characterPicker.value || "";
        if (!selected) {
          state.selectedName = "";
          state.selectedNameLabel = "";
        } else {
          state.selectedName = selected;
          var selectedOption = characterPicker.options[characterPicker.selectedIndex];
          state.selectedNameLabel = selectedOption ? selectedOption.textContent : selected;
        }
        applyNameSelectionVisuals();
        applyReaderSearch();
      });
    }

    if (readerBody) {
      readerBody.addEventListener("click", function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement) || !target.classList.contains("name")) {
          return;
        }
        var name = target.getAttribute("data-name") || "";
        if (!name) {
          return;
        }
        if (state.selectedName === name) {
          state.selectedName = "";
          state.selectedNameLabel = "";
        } else {
          state.selectedName = name;
          state.selectedNameLabel = target.textContent ? target.textContent.trim() : name;
        }
        applyNameSelectionVisuals();
        syncCharacterPickerSelection();
        applyReaderSearch();
      });

      readerBody.addEventListener("keydown", function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement) || !target.classList.contains("name")) {
          return;
        }
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        target.click();
      });
    }

    window.addEventListener("scroll", function () {
      updateProgress();
    }, { passive: true });

    window.addEventListener("resize", function () {
      updateProgress();
    });

    if (readerThemeToggle) {
      readerThemeToggle.addEventListener("click", function () {
        var nextTheme = state.readerTheme === "dark" ? "light" : "dark";
        applyReaderTheme(nextTheme);
        saveStore();
      });
    }

    if (readerWidthToggle) {
      readerWidthToggle.addEventListener("click", function () {
        var nextWidth = state.readerWidth === "narrow" ? "wide" : "narrow";
        applyReaderWidth(nextWidth);
        saveStore();
      });
    }

    if (readerFontDown) {
      readerFontDown.addEventListener("click", function () {
        applyReaderFontScale(clamp(state.readerFontScale - 0.05, 0.9, 1.35));
        saveStore();
      });
    }

    if (readerFontUp) {
      readerFontUp.addEventListener("click", function () {
        applyReaderFontScale(clamp(state.readerFontScale + 0.05, 0.9, 1.35));
        saveStore();
      });
    }

    if (readerPrevDayBtn) {
      readerPrevDayBtn.addEventListener("click", function () {
        changeReaderDay(-1);
      });
    }

    if (readerNextDayBtn) {
      readerNextDayBtn.addEventListener("click", function () {
        changeReaderDay(1);
      });
    }

    readerModeInputs.forEach(function (input) {
      input.addEventListener("change", function () {
        if (!input.checked) {
          return;
        }
        applyReaderMode(input.value);
        renderReaderForSelection();
        saveStore();
      });
    });


  }

  function discoverAvailableDays() {
    return Promise.all(
      DAY_PLAN.map(function (entry) {
        return loadDayFile(entry.day)
          .then(function () {
            return entry;
          })
          .catch(function () {
            return null;
          });
      })
    ).then(function (results) {
      state.availablePlan = results.filter(function (entry) {
        return Boolean(entry);
      });
    });
  }

  function loadTaggedRosters() {
    var preferredDay = hasDayInPlan(0) ? 0 : getFirstAvailableDay();
    if (preferredDay === null) {
      state.teamRosters = {};
      renderRoster(state.activeFaction);
      return;
    }

    loadDayFile(preferredDay)
      .then(function (text) {
        state.teamRosters = parseTaggedRosters(text);
      })
      .catch(function () {
        state.teamRosters = {};
      })
      .finally(function () {
        renderRoster(state.activeFaction);
      });
  }

  function renderFactionButtons() {
    var keys = Object.keys(FACTIONS);
    var html = keys
      .map(function (key) {
        var faction = FACTIONS[key];
        var activeClass = key === state.activeFaction ? " active" : "";

        return "" +
          '<button class="faction-btn' + activeClass + '" type="button" data-faction="' + key + '">' +
            '<span class="faction-name">' + escapeHtml(faction.name) + "</span>" +
            '<span class="faction-colors">' +
              '<span class="dot" style="background:' + faction.core + '"></span>' +
              '<span class="dot" style="background:' + faction.secondary + '"></span>' +
              '<span class="dot" style="background:' + faction.accent + '"></span>' +
            "</span>" +
          "</button>";
      })
      .join("");

    factionGrid.innerHTML = html;

    factionGrid.querySelectorAll(".faction-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        var nextFaction = button.getAttribute("data-faction");
        if (!nextFaction || !FACTIONS[nextFaction]) {
          return;
        }
        state.activeFaction = nextFaction;
        state.focusedOnly = true;
        applyFactionTheme(nextFaction);
        renderFactionButtons();
        renderTimeline();
        saveStore();
      });
    });
  }

  function renderReaderFactionOptions() {
    readerFactionSelect.innerHTML = Object.keys(FACTIONS)
      .map(function (key) {
        return '<option value="' + key + '">' + escapeHtml(FACTIONS[key].name) + "</option>";
      })
      .join("");
  }

  function syncReaderSelectors() {
    if (readerFactionSelect) {
      readerFactionSelect.value = state.readerFaction;
    }

    if (!readerWorldSelect || state.readerDay === null) {
      return;
    }

    var dayEntry = getPlanByDay(state.readerDay);
    var tracks = dayEntry ? dayEntry.worlds : [];
    readerWorldSelect.innerHTML = tracks
      .map(function (track) {
        return '<option value="' + escapeHtml(track.world) + '">' + escapeHtml(track.world) + "</option>";
      })
      .join("");

    var worldExists = tracks.some(function (track) {
      return track.world === state.readerWorld;
    });
    if (!worldExists && tracks.length) {
      state.readerWorld = getWorldForFaction(state.readerDay, state.readerFaction, tracks[0].world);
    }

    readerWorldSelect.value = state.readerWorld;
    readerWorldSelect.disabled = state.readerMode === "infinite";
  }

  function updateReaderDayButtons() {
    if (!readerPrevDayBtn || !readerNextDayBtn || state.readerDay === null) {
      return;
    }

    if (state.readerMode === "infinite") {
      readerPrevDayBtn.disabled = true;
      readerNextDayBtn.disabled = true;
      return;
    }

    var availableDays = getAvailableDayNumbers();
    var index = availableDays.indexOf(state.readerDay);
    readerPrevDayBtn.disabled = index <= 0;
    readerNextDayBtn.disabled = index === -1 || index >= availableDays.length - 1;
  }

  function changeReaderDay(step) {
    if (state.readerDay === null || state.readerMode === "infinite") {
      return;
    }

    var availableDays = getAvailableDayNumbers();
    var index = availableDays.indexOf(state.readerDay);
    if (index === -1) {
      return;
    }

    var nextIndex = clamp(index + step, 0, availableDays.length - 1);
    if (nextIndex === index) {
      return;
    }

    var nextDay = availableDays[nextIndex];
    var nextWorld = getWorldForFaction(nextDay, state.readerFaction, state.readerWorld);
    openReader(nextDay, state.readerFaction, nextWorld);
  }

  function applyReaderTheme(theme) {
    state.readerTheme = theme === "light" ? "light" : "dark";
    document.body.setAttribute("data-theme", state.readerTheme);
    if (readerPanel) {
      readerPanel.setAttribute("data-reader-theme", state.readerTheme);
    }
    if (readerThemeToggle) {
      readerThemeToggle.textContent = state.readerTheme === "dark" ? "Light" : "Dark";
    }
  }

  function applyReaderFactionTheme(key) {
    var faction = FACTIONS[key];
    if (!faction) {
      return;
    }

    document.body.setAttribute("data-faction", key);
    document.documentElement.style.setProperty("--core", faction.core);
    document.documentElement.style.setProperty("--secondary", faction.secondary);
    document.documentElement.style.setProperty("--accent", faction.accent);
    document.documentElement.style.setProperty("--accent-contrast", readableTextColor(faction.accent));
    document.documentElement.style.setProperty("--glow", hexToRgba(faction.accent, 0.45));
    var mutedOpacity = key === "obsidian-dominion" ? 0.86 : 0.72;
    document.documentElement.style.setProperty("--muted", hexToRgba(faction.secondary, mutedOpacity));
  }

  function applyReaderMode(mode) {
    state.readerMode = mode === "infinite" ? "infinite" : "paged";
    document.body.setAttribute("data-reader-mode", state.readerMode);
    if (readerPanel) {
      readerPanel.setAttribute("data-reader-mode", state.readerMode);
    }
    readerModeInputs.forEach(function (input) {
      input.checked = input.value === state.readerMode;
    });
    updateReaderDayButtons();
    syncReaderSelectors();
  }

  function applyReaderWidth(widthMode) {
    state.readerWidth = widthMode === "wide" ? "wide" : "narrow";
    if (readerPanel) {
      readerPanel.setAttribute("data-reader-width", state.readerWidth);
    }
    if (readerWidthToggle) {
      readerWidthToggle.textContent = "Width: " + (state.readerWidth === "wide" ? "Wide" : "Narrow");
    }
  }

  function applyReaderFontScale(scale) {
    state.readerFontScale = clamp(scale, 0.9, 1.35);
    if (readerPanel) {
      readerPanel.style.setProperty("--reader-font-scale", String(state.readerFontScale));
    }
  }

  function applyReaderSearch() {
    if (!readerBody) {
      return;
    }

    var query = state.readerQuery;
    var selectedName = state.selectedName || "";
    var lines = readerBody.querySelectorAll(".story-line");

    if (lines.length) {
      lines.forEach(function (lineEl) {
        var lineText = (lineEl.getAttribute("data-text") || "").toLowerCase();
        var lineNames = (lineEl.getAttribute("data-names") || "").split("|").filter(Boolean);
        var matchesQuery = !query || lineText.indexOf(query) !== -1;
        var matchesSelected = !selectedName || lineNames.indexOf(selectedName) !== -1;
        var visible = matchesQuery && matchesSelected;
        lineEl.classList.toggle("is-hidden", !visible);
      });

      var containers = readerBody.querySelectorAll(".reader-section, .reader-day-block");
      containers.forEach(function (container) {
        var nestedLines = container.querySelectorAll(".story-line");
        if (nestedLines.length) {
          var hasVisibleLine = Array.from(nestedLines).some(function (lineEl) {
            return !lineEl.classList.contains("is-hidden");
          });
          container.classList.toggle("reader-section-hidden", !hasVisibleLine);
          return;
        }

        if (selectedName) {
          container.classList.add("reader-section-hidden");
          return;
        }

        if (!query) {
          container.classList.remove("reader-section-hidden");
          return;
        }

        var text = (container.textContent || "").toLowerCase();
        container.classList.toggle("reader-section-hidden", text.indexOf(query) === -1);
      });
    } else {
      var sections = readerBody.querySelectorAll(".reader-section");
      if (!sections.length) {
        return;
      }

      sections.forEach(function (section) {
        if (!query) {
          section.classList.remove("reader-section-hidden");
          return;
        }
        var text = (section.textContent || "").toLowerCase();
        section.classList.toggle("reader-section-hidden", text.indexOf(query) === -1);
      });
    }

    if (focusLabel) {
      focusLabel.textContent = "Character: " + (state.selectedNameLabel || "none");
      if (state.selectedNameLabel) {
        focusLabel.textContent += " (focused)";
      }
    }

    updateProgress();
  }

  function applyNameSelectionVisuals() {
    var selected = state.selectedName || "";
    if (!readerBody) {
      return;
    }

    var names = readerBody.querySelectorAll(".name");
    names.forEach(function (el) {
      var isSelected = selected && (el.getAttribute("data-name") || "") === selected;
      el.classList.toggle("selected", !!isSelected);
    });

    if (focusLabel) {
      focusLabel.textContent = "Character: " + (state.selectedNameLabel || "none");
      if (state.selectedNameLabel) {
        focusLabel.textContent += " (focused)";
      }
    }

    syncCharacterPickerSelection();
  }

  function updateCharacterPickerForFaction() {
    if (!characterPicker) {
      return;
    }

    var members = getFactionMembers(state.readerFaction);
    characterPicker.replaceChildren();

    var noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.textContent = "Character: none";
    characterPicker.appendChild(noneOption);

    members.forEach(function (name) {
      var option = document.createElement("option");
      option.value = normalizeName(name);
      option.textContent = name;
      characterPicker.appendChild(option);
    });

    if (state.selectedName) {
      var hasSelected = members.some(function (name) {
        return normalizeName(name) === state.selectedName;
      });
      if (!hasSelected) {
        state.selectedName = "";
        state.selectedNameLabel = "";
      }
    }

    syncCharacterPickerSelection();
  }

  function syncCharacterPickerSelection() {
    if (!characterPicker) {
      return;
    }
    var selected = state.selectedName || "";
    var hasSelected = Array.from(characterPicker.options).some(function (opt) {
      return opt.value === selected;
    });
    characterPicker.value = hasSelected ? selected : "";
  }

  function getFactionMembers(factionKey) {
    var tagByFaction = {
      "astral-wardens": "TEAM_A_ASTRAL_WARDENS",
      "obsidian-dominion": "TEAM_B_FURIOUS_FLOOFS",
      "velocity-syndicate": "TEAM_C_VELOCITY_SYNDICATE"
    };
    var targetTag = tagByFaction[factionKey];
    if (!targetTag) {
      return [];
    }

    var seen = {};
    var members = [];

    Object.keys(state.dayTextByDay || {}).forEach(function (dayKey) {
      var text = state.dayTextByDay[dayKey] || "";
      var re = new RegExp("\\[\\[" + targetTag + "\\]\\]([\\s\\S]*?)\\[\\[\\/" + targetTag + "\\]\\]", "i");
      var match = text.match(re);
      if (!match) {
        return;
      }

      var body = match[1] || "";
      var leaderMatch = body.match(/\[\[LEADER\]\]\s*([^\n\r]+?)\s*\[\[\/LEADER\]\]/i);
      if (leaderMatch) {
        pushUniqueName(members, seen, leaderMatch[1]);
      }

      var cleanBody = body.replace(/\[\[LEADER\]\][\s\S]*?\[\[\/LEADER\]\]/gi, "");
      cleanBody.split(/\r?\n/).forEach(function (line) {
        var name = String(line || "").trim();
        if (isLikelyPlayerName(name)) {
          pushUniqueName(members, seen, name);
        }
      });
    });

    return members.sort(function (a, b) {
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
  }

  function updateProgress() {
    if (!progressLabel) {
      return;
    }

    var dayNumber = state.readerDay === null ? 1 : state.readerDay;
    var pct = 0;

    if (state.readerMode === "infinite") {
      var blocks = Array.from(readerBody ? readerBody.querySelectorAll(".reader-day-block") : []);
      if (blocks.length) {
        var active = blocks[0];
        var pivot = (window.innerHeight || 800) * 0.36;

        for (var i = 0; i < blocks.length; i += 1) {
          var rect = blocks[i].getBoundingClientRect();
          if (rect.top <= pivot) {
            active = blocks[i];
          } else {
            break;
          }
        }

        var parsedDay = parseInt(active.getAttribute("data-day-number") || String(dayNumber), 10);
        if (!isNaN(parsedDay)) {
          dayNumber = parsedDay;
        }
        pct = getElementScrollProgress(active);
      }
    } else if (readerBody) {
      pct = getElementScrollProgress(readerBody);
    }

    var safeDay = String(dayNumber);
    var currentPct = clamp(Math.round(pct), 0, 100);
    var previousMax = parseInt(state.progressByDay[safeDay] || "0", 10);
    if (!isNaN(previousMax)) {
      currentPct = Math.max(currentPct, clamp(previousMax, 0, 100));
    }
    state.progressByDay[safeDay] = currentPct;
    saveStore();

    progressLabel.textContent = "Day " + dayNumber + " - " + currentPct + "%";
  }

  function getElementScrollProgress(element) {
    if (!element) {
      return 0;
    }

    var rect = element.getBoundingClientRect();
    var top = rect.top + window.scrollY;
    var height = Math.max(1, element.offsetHeight || rect.height || 1);
    var viewportTop = window.scrollY;
    var viewportHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);

    if (height <= viewportHeight) {
      return 100;
    }

    var trackStart = top;
    var trackEnd = Math.max(trackStart + 1, (top + height) - viewportHeight);
    var raw = ((viewportTop - trackStart) / (trackEnd - trackStart)) * 100;
    return Math.round(clamp(raw, 0, 100));
  }

  function applyFactionTheme(key) {
    var faction = FACTIONS[key];
    if (!faction) {
      return;
    }

    document.body.setAttribute("data-faction", key);
    document.documentElement.style.setProperty("--core", faction.core);
    document.documentElement.style.setProperty("--secondary", faction.secondary);
    document.documentElement.style.setProperty("--accent", faction.accent);
    document.documentElement.style.setProperty("--accent-contrast", readableTextColor(faction.accent));
    document.documentElement.style.setProperty("--glow", hexToRgba(faction.accent, 0.45));
    document.documentElement.style.setProperty("--text", "#FFFFFF");
    document.documentElement.style.setProperty("--muted", hexToRgba(faction.secondary, 0.72));

    detailsTitle.textContent = faction.name;
    detailsSummary.textContent = faction.summary;
    coreColor.textContent = faction.core + " (Core)";
    secondaryColor.textContent = faction.secondary + " (Secondary)";
    accentColor.textContent = faction.accent + " (Accent)";
    focusText.textContent = faction.focus;
    activeFactionLabel.textContent = "Active Faction: " + faction.name;
    renderRoster(key);
  }

  function renderRoster(factionKey) {
    var roster = state.teamRosters[factionKey];

    if (!roster) {
      rosterPanel.innerHTML = '<p class="roster-empty">No tagged roster found yet for this faction.</p>';
      return;
    }

    var membersList = roster.members
      .map(function (member) {
        return "<li>" + escapeHtml(member) + "</li>";
      })
      .join("");

    rosterPanel.innerHTML = "" +
      '<p class="leader-row"><span class="leader-tag">Leader</span><span>' + escapeHtml(roster.leader || "Unknown") + "</span></p>" +
      '<ul class="roster-list">' + membersList + "</ul>";
  }

  function renderTimeline() {
    focusModeLabel.textContent = state.focusedOnly
      ? "Focus Mode: Selected faction across all days"
      : "Focus Mode: All faction worlds visible";

    if (!state.availablePlan.length) {
      timeline.innerHTML = '<p class="panel-note">No day files were found in content. Add phase0.txt or day1.txt to begin.</p>';
      return;
    }

    var html = state.availablePlan.map(function (dayEntry) {
      var worldTracks = dayEntry.worlds.filter(function (track) {
        if (!state.focusedOnly) {
          return true;
        }
        return track.faction === state.activeFaction;
      });

      if (!worldTracks.length) {
        return "";
      }

      return worldTracks
        .map(function (track) {
          var phaseLabel = getPhaseLabel(dayEntry);
          return "" +
            '<button class="day-card day-action" type="button" data-day="' + dayEntry.day + '" data-faction="' + track.faction + '" data-world="' + escapeHtml(track.world) + '">' +
              '<div><strong>' + escapeHtml(phaseLabel) + " - " + escapeHtml(track.world) + '</strong><div>' + escapeHtml(track.note) + "</div></div>" +
              '<div class="day-tag">' + escapeHtml(FACTIONS[track.faction].name) + "</div>" +
            "</button>";
        })
        .join("");
    }).join("");

    timeline.innerHTML = html || '<p class="panel-note">No world tracks matched this filter.</p>';
  }

  function openReader(day, factionKey, worldName) {
    state.readerDay = day;
    state.readerFaction = factionKey;
    state.readerWorld = getWorldForFaction(day, factionKey, worldName);
    applyReaderFactionTheme(state.readerFaction);
    syncReaderSelectors();
    updateReaderDayButtons();
    renderReaderForSelection();
    saveStore();
    readerPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderReaderForSelection() {
    if (state.readerDay === null) {
      return;
    }

    if (state.readerMode === "infinite") {
      renderInfiniteReader();
      return;
    }

    var dayEntry = getPlanByDay(state.readerDay);
    var dayTrack = getTrackByWorld(state.readerDay, state.readerWorld) || getTrackByFaction(state.readerDay, state.readerFaction);
    if (dayTrack) {
      state.readerFaction = dayTrack.faction;
      state.readerWorld = dayTrack.world;
      applyReaderFactionTheme(state.readerFaction);
    }
    var phaseLabel = dayEntry ? getPhaseLabel(dayEntry) : (state.readerDay === 0 ? "Phase Zero" : "Day " + state.readerDay);
    var worldLabel = state.readerWorld ? (" | " + state.readerWorld) : "";
    readerTitle.textContent = phaseLabel + " Reader";
    readerMeta.textContent = FACTIONS[state.readerFaction].name + worldLabel;
    readerBody.innerHTML = '<p class="reader-empty">Loading content...</p>';
    syncReaderSelectors();
    updateReaderDayButtons();

    loadDayFile(state.readerDay)
      .then(function (text) {
        readerBody.innerHTML = renderStructuredDay(text, state.readerFaction);
        updateCharacterPickerForFaction();
        applyReaderSearch();
        applyNameSelectionVisuals();
        updateProgress();
      })
      .catch(function () {
        readerBody.innerHTML = '<p class="reader-empty">This day file is missing.</p>';
        updateProgress();
      });
  }

  function renderInfiniteReader() {
    var days = getAvailableDayNumbers();
    if (!days.length) {
      readerTitle.textContent = "Infinite Reader";
      readerMeta.textContent = "No available day files.";
      readerBody.innerHTML = '<p class="reader-empty">No day content found.</p>';
      return;
    }

    readerTitle.textContent = "Infinite Reader";
    readerMeta.textContent = FACTIONS[state.readerFaction].name + " | All available days";
    readerBody.innerHTML = '<p class="reader-empty">Loading all available days...</p>';
    updateReaderDayButtons();

    Promise.all(days.map(function (dayNumber) {
      return loadDayFile(dayNumber).then(function (text) {
        return { day: dayNumber, text: text };
      });
    }))
      .then(function (entries) {
        var html = entries.map(function (entry) {
          var dayEntry = getPlanByDay(entry.day);
          var phaseLabel = dayEntry ? getPhaseLabel(dayEntry) : (entry.day === 0 ? "Phase Zero" : "Day " + entry.day);
          var world = getWorldForFaction(entry.day, state.readerFaction, "");
          var prefix = '<article class="reader-day-block" data-day-number="' + entry.day + '"><h3 class="reader-block-title reader-day-anchor">' + escapeHtml(phaseLabel + " | " + world) + "</h3>";
          var body = renderStructuredDay(entry.text, state.readerFaction);
          return prefix + body + "</article>";
        }).join("");

        readerBody.innerHTML = html || '<p class="reader-empty">No structured content found.</p>';
        updateCharacterPickerForFaction();
        applyReaderSearch();
        applyNameSelectionVisuals();
        updateProgress();
      })
      .catch(function () {
        readerBody.innerHTML = '<p class="reader-empty">Some day files could not be loaded.</p>';
        updateProgress();
      });
  }

  function renderStructuredDay(text, factionKey) {
    var html = "";
    var lineCounter = { value: 0 };
    var matchers = state.memberMatchers || [];
    var dayTitle = getFirstTagLine(text, "TITLE") || getFirstTagLine(text, "DAY");
    var systemStateText = getTagBlock(text, "SYSTEM_STATE");
    var narrativeText = getTagBlock(text, "NARRATIVE");
    var rulesText = getTagBlock(text, "RULES");
    var logText = getTagBlock(text, "LOG");
    var nightText = getTagBlock(text, "NIGHT");
    var authorNoteText = getTagBlock(text, "AUTHOR NOTE");
    var systemObservationText = getTagBlock(text, "SYSTEM_OBSERVATION");

    if (dayTitle) {
      html += '<h3 class="reader-block-title reader-day-title">' + escapeHtml(dayTitle) + "</h3>";
    }

    if (systemStateText) {
      html += renderSimpleListSection("System State", systemStateText, "reader-section--system");
    }

    if (narrativeText) {
      html += renderParagraphSection("Narrative", narrativeText, "reader-section--narrative", lineCounter, matchers);
    }

    if (rulesText) {
      html += renderSimpleListSection("Rules", rulesText, "reader-section--system");
    }

    if (logText) {
      html += renderParagraphSection("Log", logText, "reader-section--narrative", lineCounter, matchers);
    }

    if (nightText) {
      html += renderParagraphSection("Night", nightText, "reader-section--narrative", lineCounter, matchers);
    }

    if (authorNoteText) {
      html += renderParagraphSection("Author Note", authorNoteText, "reader-section--system", lineCounter, matchers);
    }

    // Faction-specific block
    var tagMap = {
      "astral-wardens": "TEAM_A_ASTRAL_WARDENS",
      "obsidian-dominion": "TEAM_B_FURIOUS_FLOOFS",
      "velocity-syndicate": "TEAM_C_VELOCITY_SYNDICATE"
    };
    var teamTag = tagMap[factionKey];
    var teamRegex = new RegExp("\\[\\[" + teamTag + "\\]\\]([\\s\\S]*?)\\[\\[\\/" + teamTag + "\\]\\]");
    var teamMatch = text.match(teamRegex);

    if (teamMatch) {
      var body = teamMatch[1];

      // Separate out [[LEADER]] if present
      var leaderMatch = body.match(/\[\[LEADER\]\]\s*([^\n\r]+?)\s*\[\[\/LEADER\]\]/);
      var leader = leaderMatch ? leaderMatch[1].trim() : null;
      var cleanBody = body.replace(/\[\[LEADER\]\][\s\S]*?\[\[\/LEADER\]\]/g, "");

      // Detect leading player-name lines even when spacing in content files varies.
      var allLines = cleanBody.split(/\r?\n/);
      var memberLines = [];
      var contentLines = [];
      var pastMembers = false;

      for (var i = 0; i < allLines.length; i++) {
        var line = allLines[i].trim();
        if (!line) {
          if (memberLines.length) {
            pastMembers = true;
          }
          continue;
        }

        if (!pastMembers && isLikelyPlayerName(line)) {
          memberLines.push(line);
          continue;
        }

        pastMembers = true;
        contentLines.push(line);
      }

      if (!leader) {
        leader = inferLeaderForFaction(factionKey, memberLines);
      }

      html += '<div class="reader-section reader-section--faction">';
      html += '<h4 class="reader-section-label">' + escapeHtml(FACTIONS[factionKey].name) + "</h4>";

      if (leader || memberLines.length) {
        html += "<div>";
        if (leader) {
          html += '<p class="leader-row"><span class="leader-tag">Leader</span><span>' + escapeHtml(leader) + "</span></p>";
        }
        if (memberLines.length) {
          html += '<ul class="reader-list">' + memberLines.map(function (m) {
            var leaderClass = isSameName(m, leader) ? ' class="member-leader"' : "";
            return "<li" + leaderClass + ">" + escapeHtml(m) + "</li>";
          }).join("") + "</ul>";
        }
        html += "</div>";
      }

      if (contentLines.length) {
        html += '<div class="reader-narrative">';
        contentLines.forEach(function (line) {
          if (isVisualDivider(line)) {
            html += renderVisualDivider();
            return;
          }
          lineCounter.value += 1;
          html += renderNumberedLine(lineCounter.value, line, matchers);
        });
        html += "</div>";
      }

      html += "</div>";
    }

    if (systemObservationText) {
      html += renderSimpleListSection("System Observation", systemObservationText, "reader-section--system");
    }

    return html || '<p class="reader-empty">No structured content found for this faction.</p>';
  }

  function renderSimpleListSection(label, sectionText, extraClass) {
    var lines = toNonEmptyLines(sectionText);
    if (!lines.length) {
      return "";
    }

    return '' +
      '<div class="reader-section ' + extraClass + '">' +
      '<h4 class="reader-section-label">' + escapeHtml(label) + '</h4>' +
      '<ul class="reader-list">' + lines.map(function (line) {
        if (isVisualDivider(line)) {
          return '<li class="reader-list-divider" aria-hidden="true"></li>';
        }
        return "<li>" + escapeHtml(line) + "</li>";
      }).join("") + '</ul>' +
      '</div>';
  }

  function renderParagraphSection(label, sectionText, extraClass, lineCounter, matchers) {
    var lines = toLines(sectionText);
    if (!lines.length) {
      return "";
    }

    return '' +
      '<div class="reader-section ' + extraClass + '">' +
      '<h4 class="reader-section-label">' + escapeHtml(label) + '</h4>' +
      lines.map(function (line) {
        if (!line.trim()) {
          return "";
        }
        if (isVisualDivider(line)) {
          return renderVisualDivider();
        }
        lineCounter.value += 1;
        return renderNumberedLine(lineCounter.value, line.trim(), matchers || []);
      }).join("") +
      '</div>';
  }

  function renderVisualDivider() {
    return '<div class="reader-divider" role="separator" aria-hidden="true"></div>';
  }

  function isVisualDivider(line) {
    return /^-{3,}$/.test(String(line || "").trim());
  }

  function renderNumberedLine(lineNumber, lineText, matchers) {
    var highlighted = highlightKnownNames(lineText, matchers || []);
    return '' +
      '<p class="story-line" data-line-number="' + lineNumber + '" data-text="' + escapeHtml(String(lineText || "").toLowerCase()) + '" data-names="' + escapeHtml(highlighted.names.join("|")) + '">' +
      '<span class="line-number" aria-hidden="true">' + lineNumber + '.</span>' +
      '<span class="line-content">' + highlighted.html + '</span>' +
      '</p>';
  }

  function highlightKnownNames(text, matchers) {
    var source = String(text || "");
    if (!source || !matchers.length) {
      return {
        html: escapeHtml(source),
        names: []
      };
    }

    var lowerText = source.toLowerCase();
    var cursor = 0;
    var result = "";
    var foundNames = [];

    while (cursor < source.length) {
      var bestIndex = -1;
      var bestMatcher = null;

      matchers.forEach(function (matcher) {
        var idx = lowerText.indexOf(matcher.lower, cursor);
        while (idx !== -1) {
          var end = idx + matcher.length;
          if (hasNameBoundary(source, idx, end)) {
            if (bestIndex === -1 || idx < bestIndex || (idx === bestIndex && matcher.length > bestMatcher.length)) {
              bestIndex = idx;
              bestMatcher = matcher;
            }
            break;
          }
          idx = lowerText.indexOf(matcher.lower, idx + 1);
        }
      });

      if (bestIndex === -1 || !bestMatcher) {
        result += escapeHtml(source.slice(cursor));
        break;
      }

      if (bestIndex > cursor) {
        result += escapeHtml(source.slice(cursor, bestIndex));
      }

      var matchedText = source.slice(bestIndex, bestIndex + bestMatcher.length);
      result += '<span class="name" tabindex="0" data-name="' + escapeHtml(bestMatcher.normalized) + '">' + escapeHtml(matchedText) + '</span>';
      foundNames.push(bestMatcher.normalized);
      cursor = bestIndex + bestMatcher.length;
    }

    return {
      html: result,
      names: unique(foundNames)
    };
  }

  function unique(values) {
    return Array.from(new Set(values || []));
  }

  function hasNameBoundary(text, start, end) {
    var before = start > 0 ? text.charAt(start - 1) : "";
    var after = end < text.length ? text.charAt(end) : "";
    var isWordChar = function (ch) {
      return !!ch && /[A-Za-z0-9_]/.test(ch);
    };
    return !isWordChar(before) && !isWordChar(after);
  }

  function rebuildMemberMatchersFromLoadedContent() {
    var names = [];
    var seen = {};

    Object.keys(FALLBACK_LEADERS).forEach(function (key) {
      pushUniqueName(names, seen, FALLBACK_LEADERS[key]);
    });

    Object.keys(state.dayTextByDay || {}).forEach(function (dayKey) {
      var text = state.dayTextByDay[dayKey];
      collectTeamNamesFromText(text).forEach(function (name) {
        pushUniqueName(names, seen, name);
      });
    });

    state.memberMatchers = buildMemberMatchers(names);
  }

  function collectTeamNamesFromText(text) {
    var out = [];
    var seen = {};
    var teamRegex = /\[\[(TEAM_[A-Z_]+)\]\]([\s\S]*?)\[\[\/\1\]\]/g;
    var match;

    while ((match = teamRegex.exec(text || "")) !== null) {
      var body = match[2] || "";
      var leaderMatch = body.match(/\[\[LEADER\]\]\s*([^\n\r]+?)\s*\[\[\/LEADER\]\]/i);
      if (leaderMatch) {
        pushUniqueName(out, seen, leaderMatch[1]);
      }

      var cleanBody = body.replace(/\[\[LEADER\]\][\s\S]*?\[\[\/LEADER\]\]/gi, "");
      var lines = cleanBody.split(/\r?\n/);
      var stopList = false;
      var teamHasNames = false;

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) {
          if (teamHasNames) {
            stopList = true;
          }
          continue;
        }
        if (!stopList && isLikelyPlayerName(line)) {
          pushUniqueName(out, seen, line);
          teamHasNames = true;
          continue;
        }
        stopList = true;
      }
    }

    return out;
  }

  function pushUniqueName(target, seen, value) {
    var raw = String(value || "").trim();
    if (!raw) {
      return;
    }
    var key = raw.toLowerCase();
    if (seen[key]) {
      return;
    }
    seen[key] = true;
    target.push(raw);
  }

  function buildMemberMatchers(names) {
    var map = {};
    names.forEach(function (name) {
      var raw = String(name || "").trim();
      if (!raw) {
        return;
      }
      var lower = raw.toLowerCase();
      if (map[lower]) {
        return;
      }
      map[lower] = {
        raw: raw,
        lower: lower,
        length: raw.length,
        normalized: normalizeName(raw)
      };
    });

    return Object.keys(map)
      .map(function (key) {
        return map[key];
      })
      .sort(function (a, b) {
        return b.length - a.length;
      });
  }

  function getFirstTagLine(text, tagName) {
    var block = getTagBlock(text, tagName);
    if (!block) {
      return "";
    }

    var lines = toNonEmptyLines(block);
    return lines.length ? lines[0] : "";
  }

  function getTagBlock(text, tagName) {
    var escapedTag = escapeForRegExp(tagName);
    var closedPattern = new RegExp("\\[\\[" + escapedTag + "\\]\\]([\\s\\S]*?)\\[\\[\\/" + escapedTag + "\\]\\]", "i");
    var closedMatch = text.match(closedPattern);
    if (closedMatch) {
      return (closedMatch[1] || "").trim();
    }

    var openPattern = new RegExp("\\[\\[" + escapedTag + "\\]\\]([\\s\\S]*?)(?=\\n\\s*\\[\\[[A-Z0-9_ \\/-]+\\]\\]|$)", "i");
    var openMatch = text.match(openPattern);
    if (openMatch) {
      return (openMatch[1] || "").trim();
    }

    return "";
  }

  function toLines(value) {
    return String(value || "").split(/\r?\n/);
  }

  function toNonEmptyLines(value) {
    return toLines(value)
      .map(function (line) {
        return line.trim();
      })
      .filter(function (line) {
        return line.length > 0;
      });
  }

  function escapeForRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function loadDayFile(dayNumber) {
    if (state.dayTextByDay[dayNumber]) {
      return Promise.resolve(state.dayTextByDay[dayNumber]);
    }

    var filePath = getDayFilePath(dayNumber);
    return fetch(filePath, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error(filePath + " missing");
        }
        return response.text();
      })
      .then(function (text) {
        state.dayTextByDay[dayNumber] = text;
        return text;
      });
  }

  function getDayFilePath(dayNumber) {
    if (dayNumber === 0) {
      return "./content/phase0.txt";
    }
    return "./content/day" + dayNumber + ".txt";
  }

  function getPlanByDay(dayNumber) {
    return DAY_PLAN.find(function (entry) {
      return entry.day === dayNumber;
    }) || null;
  }

  function hasDayInPlan(dayNumber) {
    return DAY_PLAN.some(function (entry) {
      return entry.day === dayNumber;
    });
  }

  function getFirstAvailableDay() {
    if (!state.availablePlan.length) {
      return null;
    }
    return state.availablePlan[0].day;
  }

  function getPhaseLabel(dayEntry) {
    return dayEntry.phase || (dayEntry.day === 0 ? "Phase Zero" : "Day " + dayEntry.day);
  }

  function getTrackByFaction(dayNumber, factionKey) {
    var dayEntry = getPlanByDay(dayNumber);
    if (!dayEntry) {
      return null;
    }
    return dayEntry.worlds.find(function (track) {
      return track.faction === factionKey;
    }) || null;
  }

  function getTrackByWorld(dayNumber, worldName) {
    var dayEntry = getPlanByDay(dayNumber);
    if (!dayEntry) {
      return null;
    }
    return dayEntry.worlds.find(function (track) {
      return track.world === worldName;
    }) || null;
  }

  function getWorldForFaction(dayNumber, factionKey, fallbackWorld) {
    var preferredTrack = getTrackByFaction(dayNumber, factionKey);
    if (preferredTrack) {
      return preferredTrack.world;
    }

    var fallbackTrack = getTrackByWorld(dayNumber, fallbackWorld || "");
    if (fallbackTrack) {
      return fallbackTrack.world;
    }

    var dayEntry = getPlanByDay(dayNumber);
    if (dayEntry && dayEntry.worlds.length) {
      return dayEntry.worlds[0].world;
    }

    return "";
  }

  function getAvailableDayNumbers() {
    return state.availablePlan
      .map(function (entry) {
        return entry.day;
      })
      .sort(function (a, b) {
        return a - b;
      });
  }

  function normalizeName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function isSameName(a, b) {
    return !!normalizeName(a) && normalizeName(a) === normalizeName(b);
  }

  function looksLikeSentence(text) {
    if (!text) {
      return false;
    }
    return /[.!?]$/.test(text) || /\b(initial|team|state|objective|environment|system|trial|outcome|recorded|initiated|must)\b/i.test(text);
  }

  function isLikelyPlayerName(text) {
    var value = String(text || "").trim();
    if (!value || value.length > 36) {
      return false;
    }
    if (looksLikeSentence(value)) {
      return false;
    }

    var words = value.split(/\s+/);
    if (words.length > 3) {
      return false;
    }

    return /^[A-Za-z0-9_.\- ]+$/.test(value);
  }

  function inferLeaderForFaction(factionKey, memberLines) {
    var fromRoster = state.teamRosters && state.teamRosters[factionKey] ? state.teamRosters[factionKey].leader : "";
    if (fromRoster) {
      return fromRoster;
    }

    var fallback = FALLBACK_LEADERS[factionKey] || "";
    if (fallback) {
      for (var i = 0; i < memberLines.length; i++) {
        if (isSameName(memberLines[i], fallback)) {
          return memberLines[i];
        }
      }
    }

    return "";
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function hexToRgba(hex, alpha) {
    var clean = hex.replace("#", "");
    if (clean.length !== 6) {
      return "rgba(255,255,255," + alpha + ")";
    }

    var r = parseInt(clean.slice(0, 2), 16);
    var g = parseInt(clean.slice(2, 4), 16);
    var b = parseInt(clean.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function readableTextColor(bgHex) {
    var clean = bgHex.replace("#", "");
    if (clean.length !== 6) {
      return "#EAF2FF";
    }
    var r = parseInt(clean.slice(0, 2), 16);
    var g = parseInt(clean.slice(2, 4), 16);
    var b = parseInt(clean.slice(4, 6), 16);
    var luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.5 ? "#10131E" : "#EAF2FF";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parseTaggedRosters(text) {
    var mapping = {
      TEAM_A_ASTRAL_WARDENS: "astral-wardens",
      TEAM_B_FURIOUS_FLOOFS: "obsidian-dominion",
      TEAM_C_VELOCITY_SYNDICATE: "velocity-syndicate"
    };
    var result = {};
    var teamRegex = /\[\[(TEAM_[A-Z_]+)\]\]([\s\S]*?)\[\[\/\1\]\]/g;
    var match;

    while ((match = teamRegex.exec(text)) !== null) {
      var tag = match[1];
      var body = match[2] || "";
      var factionKey = mapping[tag];

      if (!factionKey) {
        continue;
      }

      var leaderMatch = body.match(/\[\[LEADER\]\]\s*([^\n\r]+?)\s*\[\[\/LEADER\]\]/);
      var leader = leaderMatch ? leaderMatch[1].trim() : "";
      var cleanedBody = body.replace(/\[\[LEADER\]\][\s\S]*?\[\[\/LEADER\]\]/g, "");
      var members = cleanedBody
        .split(/\r?\n/)
        .map(function (line) {
          return line.trim();
        })
        .filter(function (line) {
          return line.length > 0 && line !== "---";
        });

      result[factionKey] = {
        leader: leader,
        members: members
      };
    }

    return result;
  }

  // ═════════════════════════════════════════════════════════════════
  // MUSIC PLAYER INITIALIZATION
  // To port to another game: copy this songs array, update file paths,
  // and call initMusicPlayer(animalGamesSongs) from that game's JS
  // ═════════════════════════════════════════════════════════════════
  var animalGamesSongs = [
    {
      file: "songs/MXZI, Deno - FAVELA [NCS Release].mp3",
      artist: "MXZI, Deno",
      song: "FAVELA",
      credits: {
        title: "MXZI, Deno - FAVELA",
        provider: "Music provided by NoCopyrightSounds",
        download: "http://ncs.io/FAVELA",
        watch: "http://ncs.lnk.to/FAVELAAT/youtube"
      }
    },
    {
      file: "songs/youth® - stuckinmyhead! [NCS Release].mp3",
      artist: "Youth",
      song: "Stuck in my head",
      credits: {
        title: "Song: Youth - Stuck in my head",
        provider: "Music provided by NoCopyrightSounds",
        download: "http://ncs.io/stuckinmyhead",
        watch: "http://ncs.lnk.to/stuckinmyheadAT/youtube"
      }
    },
    {
      file: "songs/Alex Hagen - Superhero [NCS Release].mp3",
      artist: "Alex Hagen",
      song: "Superhero",
      credits: {
        title: "Song: Alex Hagen - Superhero",
        provider: "Music provided by NoCopyrightSounds",
        download: "http://ncs.io/AH_Superhero",
        watch: "https://ncs.lnk.to/AH_SuperheroAT/youtube"
      }
    }
  ];

  // Initialize the music player if the function exists
  if (typeof initMusicPlayer === "function") {
    initMusicPlayer(animalGamesSongs);
  }
})();
