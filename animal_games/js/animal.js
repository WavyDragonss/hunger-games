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
      name: "Obsidian Dominion",
      core: "#2A123A",
      secondary: "#8B6B13",
      accent: "#A3122A",
      summary: "A power faction with ritual authority and pressure-heavy presence. Their opening should feel inevitable.",
      focus: "On every day, run Obsidian as a dominance lane on a separate world. Build pressure and force reactions."
    },
    "velocity-syndicate": {
      name: "Velocity Syndicate",
      core: "#DB1D2D",
      secondary: "#C7FF22",
      accent: "#050505",
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

  var state = {
    activeFaction: "astral-wardens",
    focusedOnly: true,
    teamRosters: {},
    availablePlan: [],
    dayTextByDay: {},
    readerDay: null,
    readerFaction: "astral-wardens",
    readerWorld: "",
    readerTheme: "dark",
    readerMode: "paged",
    readerWidth: "narrow",
    readerFontScale: 1,
    readerQuery: "",
    readerHidden: false
  };

  var subtitle = document.getElementById("subtitle");
  var readerVisibilityBtn = document.getElementById("readerVisibilityBtn");
  var readerPanel = document.getElementById("readerPanel");
  var readerTitle = document.getElementById("readerTitle");
  var readerMeta = document.getElementById("readerMeta");
  var readerBody = document.getElementById("readerBody");
  var readerSearchInput = document.getElementById("readerSearchInput");
  var readerWorldSelect = document.getElementById("readerWorldSelect");
  var readerFactionSelect = document.getElementById("readerFactionSelect");
  var readerThemeToggle = document.getElementById("readerThemeToggle");
  var readerWidthToggle = document.getElementById("readerWidthToggle");
  var readerFontDown = document.getElementById("readerFontDown");
  var readerFontUp = document.getElementById("readerFontUp");
  var readerPrevDayBtn = document.getElementById("readerPrevDayBtn");
  var readerNextDayBtn = document.getElementById("readerNextDayBtn");
  var readerModeInputs = document.querySelectorAll("input[name='readerMode']");

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
    readerHidden: "animal_reader_hidden"
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
      localStorage.setItem(STORE_KEYS.readerHidden, state.readerHidden ? "true" : "false");
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

      var savedReaderHidden = localStorage.getItem(STORE_KEYS.readerHidden);
      if (savedReaderHidden !== null) {
        state.readerHidden = savedReaderHidden === "true";
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
    applyReaderVisibility(state.readerHidden);
    if (subtitle) {
      subtitle.textContent = "Checking which day files exist...";
    }

    discoverAvailableDays()
      .finally(function () {
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
    if (readerVisibilityBtn) {
      readerVisibilityBtn.addEventListener("click", function () {
        applyReaderVisibility(!state.readerHidden);
        saveStore();
      });
    }

    readerFactionSelect.addEventListener("change", function () {
      var selectedFaction = readerFactionSelect.value;
      if (!FACTIONS[selectedFaction] || state.readerDay === null) {
        return;
      }
      state.readerFaction = selectedFaction;
      state.readerWorld = getWorldForFaction(state.readerDay, selectedFaction, state.readerWorld);
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
      });
    }

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
  }

  function updateReaderDayButtons() {
    if (!readerPrevDayBtn || !readerNextDayBtn || state.readerDay === null) {
      return;
    }

    var availableDays = getAvailableDayNumbers();
    var index = availableDays.indexOf(state.readerDay);
    readerPrevDayBtn.disabled = index <= 0;
    readerNextDayBtn.disabled = index === -1 || index >= availableDays.length - 1;
  }

  function changeReaderDay(step) {
    if (state.readerDay === null) {
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
    if (readerPanel) {
      readerPanel.setAttribute("data-reader-theme", state.readerTheme);
    }
    if (readerThemeToggle) {
      readerThemeToggle.textContent = "Theme: " + (state.readerTheme === "dark" ? "Dark" : "Light");
    }
  }

  function applyReaderMode(mode) {
    state.readerMode = mode === "infinite" ? "infinite" : "paged";
    if (readerPanel) {
      readerPanel.setAttribute("data-reader-mode", state.readerMode);
    }
    readerModeInputs.forEach(function (input) {
      input.checked = input.value === state.readerMode;
    });
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
    applyReaderVisibility(false);
    syncReaderSelectors();
    updateReaderDayButtons();
    renderReaderForSelection();
    saveStore();
    readerPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeReader() {
    applyReaderVisibility(true);
    saveStore();
  }

  function applyReaderVisibility(hidden) {
    state.readerHidden = !!hidden;
    if (readerPanel) {
      readerPanel.classList.toggle("reader-collapsed", state.readerHidden);
    }
    if (readerVisibilityBtn) {
      readerVisibilityBtn.textContent = state.readerHidden ? "Reopen Reader" : "Hide Reader";
      readerVisibilityBtn.setAttribute("aria-expanded", String(!state.readerHidden));
    }
  }

  function renderReaderForSelection() {
    if (state.readerDay === null) {
      return;
    }

    var dayEntry = getPlanByDay(state.readerDay);
    var dayTrack = getTrackByWorld(state.readerDay, state.readerWorld) || getTrackByFaction(state.readerDay, state.readerFaction);
    if (dayTrack) {
      state.readerFaction = dayTrack.faction;
      state.readerWorld = dayTrack.world;
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
        applyReaderSearch();
      })
      .catch(function () {
        readerBody.innerHTML = '<p class="reader-empty">This day file is missing.</p>';
      });
  }

  function renderStructuredDay(text, factionKey) {
    var html = "";

    // Day title from first line of [[DAY]] block
    var dayTitleMatch = text.match(/\[\[DAY\]\]\s*([^\n\r]+)/);
    if (dayTitleMatch) {
      html += '<h3 class="reader-block-title reader-day-title">' + escapeHtml(dayTitleMatch[1].trim()) + "</h3>";
    }

    // System state
    var sysStateMatch = text.match(/\[\[SYSTEM_STATE\]\]([\s\S]*?)(?=\[\[)/);
    if (sysStateMatch) {
      var stateLines = sysStateMatch[1].trim().split(/\r?\n/).filter(function (l) { return l.trim(); });
      html += '<div class="reader-section reader-section--system">';
      html += '<h4 class="reader-section-label">System State</h4>';
      html += '<ul class="reader-list">' + stateLines.map(function (l) { return "<li>" + escapeHtml(l.trim()) + "</li>"; }).join("") + "</ul>";
      html += "</div>";
    }

    // Narrative
    var narrativeMatch = text.match(/\[\[NARRATIVE\]\]([\s\S]*?)(?=\[\[)/);
    if (narrativeMatch) {
      var narrativeLines = narrativeMatch[1].trim().split(/\r?\n/);
      var narrativeHtml = narrativeLines.map(function (line) {
        return line.trim() ? "<p>" + escapeHtml(line.trim()) + "</p>" : "";
      }).join("");
      html += '<div class="reader-section reader-section--narrative">';
      html += '<h4 class="reader-section-label">Narrative</h4>';
      html += narrativeHtml;
      html += "</div>";
    }

    // Faction-specific block
    var tagMap = {
      "astral-wardens": "TEAM_A_ASTRAL_WARDENS",
      "obsidian-dominion": "TEAM_B_OBSIDIAN_DOMINION",
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

      // First block of lines before blank line = member names
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
        if (!pastMembers) {
          memberLines.push(line);
        } else {
          contentLines.push(line);
        }
      }

      html += '<div class="reader-section reader-section--faction">';
      html += '<h4 class="reader-section-label">' + escapeHtml(FACTIONS[factionKey].name) + "</h4>";

      if (leader || memberLines.length) {
        html += "<div>";
        if (leader) {
          html += '<p class="leader-row"><span class="leader-tag">Leader</span><span>' + escapeHtml(leader) + "</span></p>";
        }
        if (memberLines.length) {
          html += '<ul class="reader-list">' + memberLines.map(function (m) { return "<li>" + escapeHtml(m) + "</li>"; }).join("") + "</ul>";
        }
        html += "</div>";
      }

      if (contentLines.length) {
        html += '<div class="reader-narrative">';
        contentLines.forEach(function (line) {
          html += "<p>" + escapeHtml(line) + "</p>";
        });
        html += "</div>";
      }

      html += "</div>";
    }

    // System observation
    var obsMatch = text.match(/\[\[SYSTEM_OBSERVATION\]\]([\s\S]*?)(?=\[\[|$)/);
    if (obsMatch) {
      var obsLines = obsMatch[1].trim().split(/\r?\n/).filter(function (l) { return l.trim(); });
      html += '<div class="reader-section reader-section--system">';
      html += '<h4 class="reader-section-label">System Observation</h4>';
      html += '<ul class="reader-list">' + obsLines.map(function (l) { return "<li>" + escapeHtml(l.trim()) + "</li>"; }).join("") + "</ul>";
      html += "</div>";
    }

    return html || '<p class="reader-empty">No structured content found for this faction.</p>';
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
      TEAM_B_OBSIDIAN_DOMINION: "obsidian-dominion",
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
})();
