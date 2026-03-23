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
    teamRosters: {}
  };

  var factionGrid = document.getElementById("factionGrid");
  var timeline = document.getElementById("timeline");
  var detailsTitle = document.getElementById("detailsTitle");
  var detailsSummary = document.getElementById("detailsSummary");
  var coreColor = document.getElementById("coreColor");
  var secondaryColor = document.getElementById("secondaryColor");
  var accentColor = document.getElementById("accentColor");
  var focusText = document.getElementById("focusText");
  var rosterPanel = document.getElementById("rosterPanel");
  var activeFactionLabel = document.getElementById("activeFactionLabel");
  var focusModeLabel = document.getElementById("focusModeLabel");
  var showAllBtn = document.getElementById("showAllBtn");
  var showFocusedBtn = document.getElementById("showFocusedBtn");

  init();

  function init() {
    renderFactionButtons();
    applyFactionTheme(state.activeFaction);
    renderTimeline();
    loadTaggedRosters();

    showAllBtn.addEventListener("click", function () {
      state.focusedOnly = false;
      renderTimeline();
    });

    showFocusedBtn.addEventListener("click", function () {
      state.focusedOnly = true;
      renderTimeline();
    });
  }

  function loadTaggedRosters() {
    fetch("./content/phase0.txt", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("phase0 roster file not found");
        }
        return response.text();
      })
      .catch(function () {
        return fetch("./content/day1.txt", { cache: "no-store" }).then(function (fallbackResponse) {
          if (!fallbackResponse.ok) {
            throw new Error("fallback day1 roster file not found");
          }
          return fallbackResponse.text();
        });
      })
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
      });
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
    document.documentElement.style.setProperty("--glow", hexToRgba(faction.accent, 0.45));
    document.documentElement.style.setProperty("--text", readableTextColor(faction.core));
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

    if (!DAY_PLAN.length) {
      timeline.innerHTML = '<p class="panel-note">No day plan configured yet.</p>';
      return;
    }

    var html = DAY_PLAN.map(function (dayEntry) {
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
          var phaseLabel = dayEntry.phase || (dayEntry.day === 0 ? "Phase Zero" : "Day " + dayEntry.day);
          return "" +
            '<article class="day-card">' +
              '<div><strong>' + escapeHtml(phaseLabel) + " - " + escapeHtml(track.world) + '</strong><div>' + escapeHtml(track.note) + "</div></div>" +
              '<div class="day-tag">' + escapeHtml(FACTIONS[track.faction].name) + "</div>" +
            "</article>";
      })
        .join("");
    }).join("");

    timeline.innerHTML = html || '<p class="panel-note">No world tracks matched this filter.</p>';
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
