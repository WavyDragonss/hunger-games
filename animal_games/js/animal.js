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

  var MAX_AUTO_DISCOVERY_DAY = 40;

  var FALLBACK_LEADERS = {
    "astral-wardens": "space_fan",
    "obsidian-dominion": "Ninnginni",
    "velocity-syndicate": "Rabbit"
  };

  var HUNTER_NAMES_BY_DAY = {
    15: ["WavyDragons", "alex_awesomeness", "Rabbit"],
    16: ["WavyDragons", "alex_awesomeness", "Rabbit"]
  };
  var HUNTER_COLOR = "#353839";

  var KNOWN_BLOCK_TAGS = [
    "TITLE",
    "DAY",
    "DAY END",
    "SYSTEM_STATE",
    "NARRATIVE",
    "RULES",
    "LOG",
    "NIGHT",
    "AUTHOR NOTE",
    "SYSTEM_OBSERVATION",
    "TEAM_A_ASTRAL_WARDENS",
    "TEAM_B_FURIOUS_FLOOFS",
    "TEAM_C_VELOCITY_SYNDICATE",
    "LEADER"
  ];

  var state = {
    activeFaction: "astral-wardens",
    focusedOnly: true,
    teamRosters: {},
    availablePlan: [],
    memberMatchers: [],
    memberFactionLookup: {},
    dayTextByDay: {},
    readerDay: null,
    readerFaction: "astral-wardens",
    readerHighlightFaction: "",
    readerWorld: "",
    readerTheme: "dark",
    readerMode: "paged",
    nameColorMode: "color",
    themeSongMode: "ask",
    hideSystemObservation: true,
    day4Compact: false,
    readerWidth: "narrow",
    readerFontScale: 1,
    readerQuery: "",
    selectedName: "",
    selectedNameLabel: "",
    progressByDay: {},
    currentRenderingDay: null
  };

  var THEME_SONG_CONFIGS = [
    {
      id: "three_houses",
      startLine: 1,
      endLine: 167,
      file: "songs/day3/Fire_Emblem_Three_Houses_Shambhala_Area_17_Redux_Rain.mp3"
    },
    {
      id: "stickerbush",
      startLine: 219,
      endLine: 338,
      file: "songs/day3/Stickerbush_Symphony_Restored_to_HD.mp3"
    },
    {
      id: "pokemon_rejuvenation",
      startLine: 339,
      endLine: 368,
      file: "songs/day3/Pokémon_Rejuvenation_Battle_of_the_Soul_ft_CatchDalgo.mp3"
    }
  ];

  var themeSongState = {
    audio: null,
    activeConfig: null,
    toast: null,
    message: null,
    allowBtn: null,
    declineBtn: null,
    isPromptVisible: false,
    cycleArmed: true,
    wasInActiveZone: false,
    suppressAutoStopUntil: 0,
    isPlaying: false,
    lastScrollY: 0,
    lastSectionTop: null,
    fadeTimer: null
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
  var readerFactionLabel = document.querySelector('label[for="readerFactionSelect"]');
  var readerThemeToggle = document.getElementById("readerThemeToggle");
  var readerWidthToggle = document.getElementById("readerWidthToggle");
  var readerFontDown = document.getElementById("readerFontDown");
  var readerFontUp = document.getElementById("readerFontUp");
  var readerPrevDayBtn = document.getElementById("readerPrevDayBtn");
  var readerNextDayBtn = document.getElementById("readerNextDayBtn");
  var readerSettings = document.getElementById("readerSettings");
  var nameColorInfoBtn = document.getElementById("nameColorInfoBtn");
  var nameColorInfoPopover = document.getElementById("nameColorInfoPopover");
  var nameColorInfoCloseBtn = document.getElementById("nameColorInfoCloseBtn");
  var scrollToTopBtn = document.getElementById("scrollToTopBtn");
  var readerModeInputs = document.querySelectorAll("input[name='readerMode']");
  var nameColorModeInputs = document.querySelectorAll("input[name='nameColorMode']");
  var themeSongModeInputs = document.querySelectorAll("input[name='themeSongMode']");
  var focusLabel = document.getElementById("focusLabel");
  var progressLabel = document.getElementById("progressLabel");
  var readerTip = document.getElementById("readerTip");
  var hideSystemObservationToggle = document.getElementById("hideSystemObservationToggle");
  var day4CompactToggle = document.getElementById("day4CompactToggle");
  var day4CompactRow = document.getElementById("day4CompactRow");

  var scrollTopState = {
    rafId: 0,
    isActive: false
  };

  var pendingScrollRestoreY = null;

  var PAGE_SCROLL_KEY = "animal_page_scroll_y";

  var STORE_KEYS = {
    faction: "animal_faction",
    focused: "animal_focused",
    readerDay: "animal_reader_day",
    readerFaction: "animal_reader_faction",
    readerHighlightFaction: "animal_reader_highlight_faction",
    readerWorld: "animal_reader_world",
    readerTheme: "animal_reader_theme",
    readerMode: "animal_reader_mode",
    nameColorMode: "animal_name_color_mode",
    themeSongMode: "animal_theme_song_mode",
    hideSystemObservation: "animal_hide_system_observation",
    day4Compact: "animal_day4_compact",
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
      localStorage.setItem(STORE_KEYS.readerHighlightFaction, state.readerHighlightFaction);
      localStorage.setItem(STORE_KEYS.readerWorld, state.readerWorld);
      localStorage.setItem(STORE_KEYS.readerTheme, state.readerTheme);
      localStorage.setItem(STORE_KEYS.readerMode, state.readerMode);
      localStorage.setItem(STORE_KEYS.nameColorMode, state.nameColorMode);
      localStorage.setItem(STORE_KEYS.themeSongMode, state.themeSongMode);
      localStorage.setItem(STORE_KEYS.hideSystemObservation, state.hideSystemObservation ? "true" : "false");
      localStorage.setItem(STORE_KEYS.day4Compact, state.day4Compact ? "true" : "false");
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

      var savedReaderHighlightFaction = localStorage.getItem(STORE_KEYS.readerHighlightFaction);
      if (!savedReaderHighlightFaction) {
        state.readerHighlightFaction = "";
      } else if (FACTIONS[savedReaderHighlightFaction]) {
        state.readerHighlightFaction = savedReaderHighlightFaction;
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

      var savedNameColorMode = localStorage.getItem(STORE_KEYS.nameColorMode);
      if (savedNameColorMode === "none" || savedNameColorMode === "color" || savedNameColorMode === "prefix") {
        state.nameColorMode = savedNameColorMode;
      }

      var savedThemeSongMode = localStorage.getItem(STORE_KEYS.themeSongMode);
      if (savedThemeSongMode === "off" || savedThemeSongMode === "ask" || savedThemeSongMode === "always") {
        state.themeSongMode = savedThemeSongMode;
      }

      var savedHideSystemObservation = localStorage.getItem(STORE_KEYS.hideSystemObservation);
      if (savedHideSystemObservation !== null) {
        state.hideSystemObservation = savedHideSystemObservation !== "false";
      }

      var savedDay4Compact = localStorage.getItem(STORE_KEYS.day4Compact);
      if (savedDay4Compact !== null) {
        state.day4Compact = savedDay4Compact === "true";
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
    pendingScrollRestoreY = getStoredPageScrollY();
    initThemeSongPrompt();
    restoreStore();
    renderReaderFactionOptions();
    bindEvents();
    applyReaderTheme(state.readerTheme);
    applyReaderMode(state.readerMode);
    applyNameColorMode(state.nameColorMode);
    applyThemeSongMode(state.themeSongMode);
    applyHideSystemObservationMode(state.hideSystemObservation);
    applyDay4CompactMode(state.day4Compact);
    applyReaderWidth(state.readerWidth);
    applyReaderFontScale(state.readerFontScale);
    updateScrollTopButton();
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
        openReader(state.readerDay, state.readerFaction, state.readerWorld, { scrollToReader: false });
        if (subtitle) {
          subtitle.textContent = "Use the controls to switch day, world, faction, and reader style.";
        }
      });
  }

  function bindEvents() {
    readerFactionSelect.addEventListener("change", function () {
      var selectedFaction = readerFactionSelect.value;
      if (state.readerDay === null) {
        return;
      }

      if (isReaderFactionHighlightMode()) {
        if (selectedFaction && !FACTIONS[selectedFaction]) {
          return;
        }
        state.readerHighlightFaction = selectedFaction || "";
        updateCharacterPickerForFaction();
        applyFactionHighlightVisuals();
        applyReaderSearch();
        saveStore();
        return;
      }

      if (!FACTIONS[selectedFaction]) {
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
      handleThemeSongScroll();
      updateScrollTopButton();
      storePageScrollY(window.scrollY || 0);
    }, { passive: true });

    window.addEventListener("resize", function () {
      updateProgress();
      handleThemeSongScroll();
      updateScrollTopButton();
    });

    window.addEventListener("beforeunload", function () {
      storePageScrollY(window.scrollY || 0);
    });

    if (scrollToTopBtn) {
      scrollToTopBtn.addEventListener("click", function () {
        if (scrollTopState.isActive) {
          abortScrollToTop();
        } else {
          startScrollToTop();
        }
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
        renderReaderForSelection();
        saveStore();
      });
    });

    themeSongModeInputs.forEach(function (input) {
      input.addEventListener("change", function () {
        if (!input.checked) {
          return;
        }
        applyThemeSongMode(input.value);
        saveStore();
        handleThemeSongScroll();
      });
    });

    if (hideSystemObservationToggle) {
      hideSystemObservationToggle.addEventListener("change", function () {
        applyHideSystemObservationMode(hideSystemObservationToggle.checked);
        renderReaderForSelection();
        saveStore();
      });
    }

    if (day4CompactToggle) {
      day4CompactToggle.addEventListener("change", function () {
        applyDay4CompactMode(day4CompactToggle.checked);
        renderReaderForSelection();
        saveStore();
      });
    }

    nameColorModeInputs.forEach(function (input) {
      input.addEventListener("change", function () {
        if (!input.checked) {
          return;
        }
        applyNameColorMode(input.value);
        renderReaderForSelection();
        saveStore();
      });
    });

    if (nameColorInfoBtn && nameColorInfoPopover) {
      nameColorInfoBtn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var willOpen = nameColorInfoPopover.hasAttribute("hidden");
        if (willOpen) {
          openNameColorInfoPopover();
        } else {
          closeNameColorInfoPopover();
        }
      });
    }

    if (nameColorInfoCloseBtn) {
      nameColorInfoCloseBtn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeNameColorInfoPopover();
      });
    }

    if (nameColorInfoPopover) {
      nameColorInfoPopover.addEventListener("click", function (event) {
        event.stopPropagation();
        closeNameColorInfoPopover();
      });
    }

    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (
        nameColorInfoPopover &&
        !nameColorInfoPopover.hasAttribute("hidden") &&
        nameColorInfoBtn &&
        !nameColorInfoPopover.contains(target) &&
        !nameColorInfoBtn.contains(target)
      ) {
        closeNameColorInfoPopover();
      }

      if (!readerSettings || !readerSettings.open) {
        return;
      }
      if (!readerSettings.contains(target)) {
        closeNameColorInfoPopover();
        readerSettings.removeAttribute("open");
      }
    });

    var themeSongWidgetPlayBtn = document.getElementById("themeSongWidgetPlayBtn");
    var themeSongWidgetIcon = document.getElementById("themeSongWidgetIcon");
    var themeSongWidget = document.getElementById("themeSongWidget");

    if (themeSongWidgetPlayBtn) {
      themeSongWidgetPlayBtn.addEventListener("click", handleThemeSongWidgetPlayClick);
    }

    if (themeSongWidgetIcon) {
      themeSongWidgetIcon.addEventListener("click", toggleThemeSongWidgetExpand);
    }

    document.addEventListener("pointerdown", function (event) {
      if (!themeSongWidget || themeSongWidget.hasAttribute("hidden")) {
        return;
      }
      var clickedIcon = themeSongWidgetIcon && themeSongWidgetIcon.contains(event.target);
      var clickedInsideWidget = themeSongWidget.contains(event.target);
      if (!clickedIcon && !clickedInsideWidget) {
        closeThemeSongWidget();
      }
    });

  }

  function storePageScrollY(value) {
    try {
      sessionStorage.setItem(PAGE_SCROLL_KEY, String(Math.max(0, Math.round(value || 0))));
    } catch (e) {}
  }

  function getStoredPageScrollY() {
    try {
      var raw = sessionStorage.getItem(PAGE_SCROLL_KEY);
      if (raw === null) {
        return null;
      }
      var parsed = parseInt(raw, 10);
      return isNaN(parsed) ? null : Math.max(0, parsed);
    } catch (e) {
      return null;
    }
  }

  function applyPendingScrollRestore() {
    if (pendingScrollRestoreY === null) {
      return;
    }
    var target = pendingScrollRestoreY;
    pendingScrollRestoreY = null;
    window.requestAnimationFrame(function () {
      window.scrollTo(0, target);
    });
  }

  function openNameColorInfoPopover() {
    if (!nameColorInfoPopover || !nameColorInfoBtn) {
      return;
    }
    nameColorInfoPopover.removeAttribute("hidden");
    nameColorInfoBtn.setAttribute("aria-expanded", "true");
  }

  function closeNameColorInfoPopover() {
    if (!nameColorInfoPopover || !nameColorInfoBtn) {
      return;
    }
    nameColorInfoPopover.setAttribute("hidden", "hidden");
    nameColorInfoBtn.setAttribute("aria-expanded", "false");
  }

  function updateScrollTopButton() {
    if (!scrollToTopBtn) {
      return;
    }

    var isDesktop = window.matchMedia("(min-width: 681px)").matches;
    var shouldShow = isDesktop && (window.scrollY || 0) > 200;
    scrollToTopBtn.classList.toggle("show", shouldShow);
    if (!scrollTopState.isActive) {
      scrollToTopBtn.textContent = "↑";
      scrollToTopBtn.setAttribute("aria-label", "Scroll to top");
      scrollToTopBtn.classList.remove("is-scrolling");
    }

    if (!isDesktop && scrollTopState.isActive) {
      abortScrollToTop();
    }
  }

  function startScrollToTop() {
    if (!scrollToTopBtn || scrollTopState.isActive) {
      return;
    }

    scrollTopState.isActive = true;
    scrollToTopBtn.textContent = "×";
    scrollToTopBtn.setAttribute("aria-label", "Stop scrolling to top");
    scrollToTopBtn.classList.add("is-scrolling");
    runScrollToTopFrame();
  }

  function abortScrollToTop() {
    if (scrollTopState.rafId) {
      window.cancelAnimationFrame(scrollTopState.rafId);
      scrollTopState.rafId = 0;
    }
    scrollTopState.isActive = false;
    if (scrollToTopBtn) {
      scrollToTopBtn.textContent = "↑";
      scrollToTopBtn.setAttribute("aria-label", "Scroll to top");
      scrollToTopBtn.classList.remove("is-scrolling");
    }
  }

  function runScrollToTopFrame() {
    if (!scrollTopState.isActive) {
      return;
    }

    var currentY = window.scrollY || 0;
    if (currentY <= 0) {
      abortScrollToTop();
      return;
    }

    var step = Math.max(18, Math.round(currentY * 0.12));
    window.scrollTo(0, Math.max(0, currentY - step));
    scrollTopState.rafId = window.requestAnimationFrame(runScrollToTopFrame);
  }

  function discoverAvailableDays() {
    var dayNumbers = [];
    for (var day = 0; day <= MAX_AUTO_DISCOVERY_DAY; day++) {
      dayNumbers.push(day);
    }

    return Promise.all(
      dayNumbers.map(function (dayNumber) {
        return loadDayFile(dayNumber)
          .then(function () {
            return dayNumber;
          })
          .catch(function () {
            return null;
          });
      })
    ).then(function (results) {
      state.availablePlan = results
        .filter(function (dayNumber) {
          return typeof dayNumber === "number";
        })
        .map(function (dayNumber) {
          return getFallbackPlanByDay(dayNumber);
        })
        .sort(function (a, b) {
          return a.day - b.day;
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
    if (!readerFactionSelect) {
      return;
    }

    var options = Object.keys(FACTIONS)
      .map(function (key) {
        return '<option value="' + key + '">' + escapeHtml(FACTIONS[key].name) + "</option>";
      });

    if (isReaderFactionHighlightMode()) {
      options.unshift('<option value="">No faction highlight</option>');
    }

    readerFactionSelect.innerHTML = options.join("");
  }

  function syncReaderSelectors() {
    renderReaderFactionOptions();
    updateReaderFactionControl();

    if (readerFactionSelect) {
      readerFactionSelect.value = isReaderFactionHighlightMode()
        ? (state.readerHighlightFaction || "")
        : state.readerFaction;
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
    applyReaderFactionTheme(state.readerFaction);
  }

  function applyReaderFactionTheme(key) {
    var faction = FACTIONS[key];
    if (!faction) {
      return;
    }

    var useMazePalette = typeof state.readerDay === "number" && state.readerDay >= 3;

    document.body.setAttribute("data-faction", key);
    if (useMazePalette) {
      var mazeAccent = state.readerTheme === "light" ? "#1d63cc" : "#7db4ff";
      var mazeSecondary = state.readerTheme === "light" ? "#d5dfef" : "#d7e3f5";
      document.documentElement.style.setProperty("--core", state.readerTheme === "light" ? "#ffffff" : "#111826");
      document.documentElement.style.setProperty("--secondary", mazeSecondary);
      document.documentElement.style.setProperty("--accent", mazeAccent);
      document.documentElement.style.setProperty("--accent-contrast", readableTextColor(mazeAccent));
      document.documentElement.style.setProperty("--glow", hexToRgba(mazeAccent, 0.45));
      document.documentElement.style.setProperty("--muted", hexToRgba(mazeSecondary, 0.72));
      return;
    }

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
    applyFactionHighlightVisuals();
  }

  function applyNameColorMode(mode) {
    var validMode = mode === "none" || mode === "prefix" ? mode : "color";
    state.nameColorMode = validMode;
    document.body.setAttribute("data-name-color-mode", validMode);
    nameColorModeInputs.forEach(function (input) {
      input.checked = input.value === validMode;
    });
  }

  function shouldUseTeamTags(dayNumber) {
    return typeof dayNumber === "number" && dayNumber < 3;
  }

  function isReaderFactionHighlightMode() {
    return state.readerMode === "paged" && typeof state.readerDay === "number" && !shouldUseTeamTags(state.readerDay);
  }

  function updateReaderFactionControl() {
    if (readerFactionLabel) {
      readerFactionLabel.textContent = isReaderFactionHighlightMode() ? "Faction Focus" : "Faction";
    }

    if (readerFactionSelect) {
      readerFactionSelect.setAttribute(
        "aria-label",
        isReaderFactionHighlightMode() ? "Faction highlight" : "Faction"
      );
      readerFactionSelect.title = isReaderFactionHighlightMode()
        ? "Highlight faction members without filtering the story"
        : "Choose the faction track for this day";
    }
  }

  function applyThemeSongMode(mode) {
    var validMode = mode === "off" || mode === "always" ? mode : "ask";
    state.themeSongMode = validMode;

    themeSongModeInputs.forEach(function (input) {
      input.checked = input.value === state.themeSongMode;
    });

    if (state.themeSongMode === "off") {
      hideThemeSongPrompt();
      stopThemeSong(true);
      return;
    }

    // Re-arm entry detection when switching between ask/always while already in view.
    themeSongState.cycleArmed = true;
    themeSongState.wasInActiveZone = false;
  }

  function applyHideSystemObservationMode(enabled) {
    state.hideSystemObservation = enabled !== false;
    if (hideSystemObservationToggle) {
      hideSystemObservationToggle.checked = state.hideSystemObservation;
    }
  }

  function applyDay4CompactMode(enabled) {
    state.day4Compact = enabled === true;
    if (day4CompactToggle) {
      day4CompactToggle.checked = state.day4Compact;
    }
  }

  function updateReaderOptionalSettingsVisibility() {
    var showDay4Compact = state.readerMode === "paged" && state.readerDay === 4;
    if (day4CompactRow) {
      day4CompactRow.hidden = !showDay4Compact;
    }
    if (readerTip) {
      readerTip.hidden = !(showDay4Compact && !state.day4Compact);
    }

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
    var activeFaction = isReaderFactionHighlightMode() ? (state.readerHighlightFaction || "") : "";
    var useSoftFocus = isReaderFactionHighlightMode();
    var lines = readerBody.querySelectorAll(".story-line");

    if (lines.length) {
      lines.forEach(function (lineEl) {
        var lineText = (lineEl.getAttribute("data-text") || "").toLowerCase();
        var lineNames = (lineEl.getAttribute("data-names") || "").split("|").filter(Boolean);
        var lineFactions = (lineEl.getAttribute("data-factions") || "").split("|").filter(Boolean);
        var matchesQuery = !query || lineText.indexOf(query) !== -1;
        var matchesSelected = !selectedName || lineNames.indexOf(selectedName) !== -1;
        var visible = matchesQuery && matchesSelected;

        if (useSoftFocus) {
          var matchesCharacter = !selectedName || lineNames.indexOf(selectedName) !== -1;
          var matchesFaction = !activeFaction || lineFactions.indexOf(activeFaction) !== -1;
          var hasSoftFocus = !!selectedName || !!activeFaction;
          var softMatch = (!selectedName && !activeFaction) || matchesCharacter || matchesFaction;

          lineEl.classList.toggle("is-hidden", !matchesQuery);
          lineEl.classList.toggle("focus-dim", hasSoftFocus && !softMatch);
          lineEl.classList.toggle("focus-match", hasSoftFocus && softMatch);
          return;
        }

        lineEl.classList.toggle("is-hidden", !visible);
        lineEl.classList.remove("focus-dim");
        lineEl.classList.remove("focus-match");
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

        if (selectedName && !useSoftFocus) {
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

    updateFocusLabel();

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

    updateFocusLabel();

    syncCharacterPickerSelection();
  }

  function updateCharacterPickerForFaction() {
    if (!characterPicker) {
      return;
    }

    var members = getCharacterPickerMembers();
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

  function getCharacterPickerMembers() {
    if (isReaderFactionHighlightMode()) {
      if (state.readerHighlightFaction) {
        return getFactionMembers(state.readerHighlightFaction);
      }
      return getAllKnownMembers();
    }

    return getFactionMembers(state.readerFaction);
  }

  function getAllKnownMembers() {
    var seen = {};
    var members = [];

    Object.keys(FACTIONS).forEach(function (factionKey) {
      getFactionMembers(factionKey).forEach(function (name) {
        var normalized = normalizeName(name);
        if (!normalized || seen[normalized]) {
          return;
        }
        seen[normalized] = true;
        members.push(name);
      });
    });

    return members.sort(function (a, b) {
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
  }

  function updateFocusLabel() {
    if (!focusLabel) {
      return;
    }

    var parts = [];
    var characterPart = "Character: " + (state.selectedNameLabel || "none");
    if (state.selectedNameLabel) {
      characterPart += " (focused)";
    }
    parts.push(characterPart);

    if (isReaderFactionHighlightMode()) {
      parts.push(
        "Faction: " + (
          state.readerHighlightFaction
            ? FACTIONS[state.readerHighlightFaction].name + " (highlighted)"
            : "none"
        )
      );
    }

    focusLabel.textContent = parts.join(" | ");
  }

  function applyFactionHighlightVisuals() {
    if (!readerBody) {
      return;
    }

    var activeFaction = isReaderFactionHighlightMode() ? state.readerHighlightFaction : "";
    readerBody.classList.toggle("reader-faction-highlight-active", !!activeFaction);
    readerBody.setAttribute("data-highlight-faction", activeFaction || "");

    var names = readerBody.querySelectorAll(".name");
    names.forEach(function (el) {
      var faction = el.getAttribute("data-faction") || "";
      var isHighlighted = !!activeFaction && faction === activeFaction;
      var isMuted = !!activeFaction && !!faction && faction !== activeFaction;
      el.classList.toggle("faction-highlighted", isHighlighted);
      el.classList.toggle("faction-muted", isMuted);
    });

    updateFocusLabel();
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

  function openReader(day, factionKey, worldName, options) {
    var shouldScroll = !options || options.scrollToReader !== false;
    state.readerDay = day;
    state.readerFaction = factionKey;
    state.readerWorld = getWorldForFaction(day, factionKey, worldName);
    applyReaderFactionTheme(state.readerFaction);
    updateReaderEraTheme();
    syncReaderSelectors();
    updateReaderDayButtons();
    renderReaderForSelection();
    saveStore();
    if (shouldScroll && readerPanel) {
      readerPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderReaderForSelection() {
    if (state.readerDay === null) {
      return;
    }

    if (state.readerMode === "infinite") {
      updateReaderOptionalSettingsVisibility();
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
    updateReaderEraTheme();
    var phaseLabel = dayEntry ? getPhaseLabel(dayEntry) : (state.readerDay === 0 ? "Phase Zero" : "Day " + state.readerDay);
    var worldLabel = state.readerWorld ? (" | " + state.readerWorld) : "";
    readerTitle.textContent = phaseLabel + " Reader";
    readerMeta.textContent = FACTIONS[state.readerFaction].name + worldLabel;
    updateReaderOptionalSettingsVisibility();
    readerBody.innerHTML = '<p class="reader-empty">Loading content...</p>';
    syncReaderSelectors();
    updateReaderDayButtons();

    loadDayFile(state.readerDay)
      .then(function (text) {
        try {
          readerBody.innerHTML = renderStructuredDay(text, state.readerFaction, state.readerDay);
          updateCharacterPickerForFaction();
          applyReaderSearch();
          applyNameSelectionVisuals();
          applyFactionHighlightVisuals();
          updateProgress();
          resetThemeSongTracking();
          handleThemeSongScroll();
          applyPendingScrollRestore();
        } catch (renderError) {
          console.error("Reader render failed:", renderError);
          readerBody.innerHTML = '<p class="reader-empty">Reader failed to render this day. Check console for details.</p>';
          updateProgress();
          stopThemeSong(true);
          applyPendingScrollRestore();
        }
      })
      .catch(function (error) {
        var message = String((error && error.message) || "").toLowerCase();
        if (message.indexOf("missing") !== -1 || message.indexOf("404") !== -1) {
          recoverFromMissingReaderDay();
          return;
        }

        console.error("Reader load failed:", error);
        readerBody.innerHTML = '<p class="reader-empty">Reader failed to load this day.</p>';
        updateProgress();
        stopThemeSong(true);
        applyPendingScrollRestore();
      });
  }

  function recoverFromMissingReaderDay() {
    var availableDays = getAvailableDayNumbers();
    var fallbackDay = availableDays.find(function (dayNumber) {
      return dayNumber !== state.readerDay;
    });

    if (fallbackDay === undefined) {
      readerBody.innerHTML = '<p class="reader-empty">This day file is missing.</p>';
      updateProgress();
      stopThemeSong(true);
      applyPendingScrollRestore();
      return;
    }

    state.readerDay = fallbackDay;
    state.readerWorld = getWorldForFaction(fallbackDay, state.readerFaction, state.readerWorld);
    saveStore();

    renderReaderForSelection();
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
    updateReaderOptionalSettingsVisibility();
    updateReaderEraTheme();
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
          var body = renderStructuredDay(entry.text, state.readerFaction, entry.day);
          return prefix + body + "</article>";
        }).join("");

        readerBody.innerHTML = html || '<p class="reader-empty">No structured content found.</p>';
        updateCharacterPickerForFaction();
        applyReaderSearch();
        applyNameSelectionVisuals();
        applyFactionHighlightVisuals();
        updateProgress();
        resetThemeSongTracking();
        handleThemeSongScroll();
        applyPendingScrollRestore();
      })
      .catch(function () {
        readerBody.innerHTML = '<p class="reader-empty">Some day files could not be loaded.</p>';
        updateProgress();
        stopThemeSong(true);
        applyPendingScrollRestore();
      });
  }

  function initThemeSongPrompt() {
    if (!document.body) {
      return;
    }

    var toast = document.createElement("div");
    toast.className = "theme-song-toast";
    toast.setAttribute("hidden", "hidden");
    toast.innerHTML = '' +
      '<p class="theme-song-toast-text" id="themeSongToastMessage">This section has a theme song. Play it?</p>' +
      '<div class="theme-song-toast-actions">' +
      '<button type="button" class="theme-song-btn theme-song-btn--allow" id="themeSongAllow">Allow</button>' +
      '<button type="button" class="theme-song-btn" id="themeSongDecline">Not now</button>' +
      "</div>";

    document.body.appendChild(toast);

    themeSongState.audio = new Audio(THEME_SONG_CONFIGS[0].file);
    themeSongState.audio.preload = "none";
    themeSongState.audio.volume = 0.55;
    themeSongState.audio.loop = true;
    themeSongState.audio.addEventListener("ended", function () {
      themeSongState.isPlaying = false;
      clearFadeTimer();
    });

    themeSongState.toast = toast;
    themeSongState.message = document.getElementById("themeSongToastMessage");
    themeSongState.allowBtn = document.getElementById("themeSongAllow");
    themeSongState.declineBtn = document.getElementById("themeSongDecline");

    if (themeSongState.allowBtn) {
      themeSongState.allowBtn.addEventListener("click", function () {
        hideThemeSongPrompt();
        playThemeSong(true);
      });
    }

    if (themeSongState.declineBtn) {
      themeSongState.declineBtn.addEventListener("click", function () {
        hideThemeSongPrompt();
      });
    }
  }

  function resetThemeSongTracking() {
    themeSongState.lastSectionTop = null;
    themeSongState.lastScrollY = window.scrollY || 0;
    themeSongState.wasInActiveZone = false;
    themeSongState.suppressAutoStopUntil = 0;
    // Re-arm on each reader render so Day 3 can trigger even after prior visits.
    themeSongState.cycleArmed = true;
  }

  function getThemeSongContainer() {
    if (!readerBody) {
      return null;
    }

    if (state.readerMode === "infinite") {
      return readerBody.querySelector('.reader-day-block[data-day-number="3"]');
    }

    return state.readerDay === 3 ? readerBody : null;
  }

  function getThemeSectionBoundsForConfig(config) {
    var container = getThemeSongContainer();
    if (!container || !config) {
      return null;
    }

    var lines = Array.from(container.querySelectorAll(".story-line"))
      .filter(function (lineEl) {
        if (lineEl.classList.contains("is-hidden")) {
          return false;
        }
        var lineNumber = parseInt(lineEl.getAttribute("data-line-number") || "", 10);
        return !isNaN(lineNumber) && lineNumber >= config.startLine && lineNumber <= config.endLine;
      });

    if (!lines.length) {
      return null;
    }

    var top = Number.POSITIVE_INFINITY;
    var bottom = Number.NEGATIVE_INFINITY;

    lines.forEach(function (lineEl) {
      var rect = lineEl.getBoundingClientRect();
      if (rect.top < top) {
        top = rect.top;
      }
      if (rect.bottom > bottom) {
        bottom = rect.bottom;
      }
    });

    var height = Math.max(1, bottom - top);
    var visible = Math.max(0, Math.min(bottom, window.innerHeight) - Math.max(top, 0));
    var visibleRatio = visible / height;

    return {
      top: top,
      bottom: bottom,
      visibleRatio: visibleRatio
    };
  }

  function getThemePromptMessageForFaction() {
    var key = state.readerFaction;
    if (key === "astral-wardens") {
      return "Celestial Bastion has a rhythm. Play it?";
    }
    if (key === "obsidian-dominion") {
      return "Black Throne Expanse has a pulse. Play it?";
    }
    if (key === "velocity-syndicate") {
      return "Redline Sector is heating up. Play it?";
    }
    return "This section has a theme song. Play it?";
  }

  function getActiveThemeSection(activeBoundaryY) {
    for (var i = 0; i < THEME_SONG_CONFIGS.length; i += 1) {
      var config = THEME_SONG_CONFIGS[i];
      var bounds = getThemeSectionBoundsForConfig(config);
      if (!bounds) {
        continue;
      }
      if (bounds.top <= activeBoundaryY && bounds.bottom >= activeBoundaryY) {
        return {
          config: config,
          top: bounds.top,
          bottom: bounds.bottom,
          visibleRatio: bounds.visibleRatio
        };
      }
    }
    return null;
  }

  function showThemeSongPrompt() {
    if (!themeSongState.toast || themeSongState.isPromptVisible) {
      return;
    }
    if (themeSongState.message) {
      themeSongState.message.textContent = getThemePromptMessageForFaction();
    }
    themeSongState.toast.hidden = false;
    themeSongState.toast.classList.add("open");
    themeSongState.isPromptVisible = true;
  }

  function hideThemeSongPrompt() {
    if (!themeSongState.toast) {
      return;
    }
    themeSongState.toast.classList.remove("open");
    themeSongState.toast.hidden = true;
    themeSongState.isPromptVisible = false;
  }

  function clearFadeTimer() {
    if (themeSongState.fadeTimer) {
      window.clearInterval(themeSongState.fadeTimer);
      themeSongState.fadeTimer = null;
    }
  }

  function toggleThemeSongOnReaderPress() {
    var audio = themeSongState.audio;
    if (!audio) {
      return;
    }

    if (state.themeSongMode === "off") {
      return;
    }

    if (!themeSongState.isPlaying || audio.ended) {
      var activeSection = getActiveThemeSection(window.innerHeight * 0.33);
      var resumeConfig = themeSongState.activeConfig || (activeSection ? activeSection.config : null);
      if (!resumeConfig) {
        return;
      }
      hideThemeSongPrompt();
      playThemeSong(true, resumeConfig, true);
      return;
    }

    clearFadeTimer();
    audio.pause();
    themeSongState.isPlaying = false;
    themeSongState.suppressAutoStopUntil = 0;
    updateThemeSongWidget();
  }

  function stopThemeSong(immediate) {
    if (!themeSongState.audio) {
      return;
    }

    clearFadeTimer();
    if (immediate || !themeSongState.isPlaying) {
      themeSongState.audio.pause();
      themeSongState.audio.currentTime = 0;
      themeSongState.audio.volume = 0.55;
      themeSongState.isPlaying = false;
      updateThemeSongWidget();
      themeSongState.suppressAutoStopUntil = 0;
      return;
    }

    var startVolume = themeSongState.audio.volume;
    var steps = 8;
    var step = 0;
    themeSongState.fadeTimer = window.setInterval(function () {
      step += 1;
      var nextVolume = Math.max(0, startVolume * (1 - step / steps));
      themeSongState.audio.volume = nextVolume;
      if (step >= steps || nextVolume <= 0.01) {
        clearFadeTimer();
        themeSongState.audio.pause();
        themeSongState.audio.currentTime = 0;
        themeSongState.audio.volume = 0.55;
        themeSongState.isPlaying = false;
        themeSongState.suppressAutoStopUntil = 0;
        updateThemeSongWidget();
      }
    }, 70);
  }

  function playThemeSong(userInitiated, config, preservePosition) {
    if (!themeSongState.audio) {
      return;
    }

    var targetConfig = config || themeSongState.activeConfig || THEME_SONG_CONFIGS[0];
    if (!targetConfig || !targetConfig.file) {
      return;
    }

    themeSongState.activeConfig = targetConfig;

    themeSongState.suppressAutoStopUntil = Date.now() + (userInitiated ? 1200 : 450);
    clearFadeTimer();
    var isSameTrack = themeSongState.audio.src.indexOf(targetConfig.file) !== -1;
    if (!preservePosition || !isSameTrack) {
      themeSongState.audio.currentTime = 0;
    }
    themeSongState.audio.volume = 0.55;
    if (!isSameTrack) {
      themeSongState.audio.src = targetConfig.file;
      themeSongState.audio.load();
    } else if (themeSongState.audio.readyState < 2) {
      themeSongState.audio.load();
    }
    var playPromise = themeSongState.audio.play();
    themeSongState.isPlaying = true;
    updateThemeSongWidget();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {
        themeSongState.audio.load();
        return themeSongState.audio.play();
      }).catch(function () {
        themeSongState.isPlaying = false;
        updateThemeSongWidget();
        // If autoplay is blocked in always mode, offer an explicit user action.
        if (!userInitiated && state.themeSongMode === "always") {
          showThemeSongPrompt();
        }
      });
    }
  }

  function handleThemeSongScroll() {
    if (state.themeSongMode === "off") {
      hideThemeSongPrompt();
      stopThemeSong(true);
      themeSongState.lastScrollY = window.scrollY || 0;
      themeSongState.wasInActiveZone = false;
      themeSongState.suppressAutoStopUntil = 0;
      return;
    }

    var scrollY = window.scrollY || 0;
    if (scrollY <= 24) {
      themeSongState.cycleArmed = true;
    }

    var activeBottom = window.innerHeight * 0.33;
    var section = getActiveThemeSection(activeBottom);
    if (!section) {
      hideThemeSongPrompt();
      stopThemeSong(true);
      themeSongState.lastScrollY = scrollY;
      themeSongState.lastSectionTop = null;
      themeSongState.wasInActiveZone = false;
      themeSongState.activeConfig = null;
      themeSongState.cycleArmed = true;
      themeSongState.suppressAutoStopUntil = 0;
      return;
    }

    var activeTop = window.innerHeight * 0.67;

    // Use reader viewport crossing so large ranges (e.g. lines 1-167) still trigger.
    var isInActiveZone = section.top <= activeBottom && section.bottom >= activeBottom;
    var enteredActiveZone = !themeSongState.wasInActiveZone && isInActiveZone;

    var belowStopBoundary = section.bottom < activeBottom;
    var aboveStopBoundary = section.top > activeTop;
    var outOfActiveZone = belowStopBoundary || aboveStopBoundary;

    if (outOfActiveZone) {
      hideThemeSongPrompt();
      if (themeSongState.isPlaying && Date.now() >= themeSongState.suppressAutoStopUntil) {
        stopThemeSong(false);
      }
      themeSongState.cycleArmed = true;
      themeSongState.activeConfig = null;
    }

    if (
      (enteredActiveZone || (state.themeSongMode === "always" && isInActiveZone && !themeSongState.isPlaying)) &&
      themeSongState.cycleArmed
    ) {
      themeSongState.cycleArmed = false;
      if (state.themeSongMode === "always") {
        hideThemeSongPrompt();
        playThemeSong(false, section.config);
      } else {
        themeSongState.activeConfig = section.config;
        showThemeSongPrompt();
      }
    }

    themeSongState.lastScrollY = scrollY;
    themeSongState.lastSectionTop = section.top;
    themeSongState.wasInActiveZone = isInActiveZone;
    updateThemeSongWidget();
  }

  function getThemeSongDisplayName(config) {
    if (!config) {
      return "—";
    }
    var nameMap = {
      "three_houses": "Fire Emblem Three Houses",
      "stickerbush": "Stickerbush Symphony",
      "pokemon_rejuvenation": "Pokémon Rejuvenation"
    };
    return nameMap[config.id] || config.file || "—";
  }

  function getThemeSongArtist(config) {
    if (!config) {
      return "—";
    }
    var artistMap = {
      "three_houses": "Nintendo",
      "stickerbush": "David Wise",
      "pokemon_rejuvenation": "CatchDalgo"
    };
    return artistMap[config.id] || "—";
  }

  function updateThemeSongWidget() {
    var widget = document.getElementById("themeSongWidget");
    var icon = document.getElementById("themeSongWidgetIcon");
    var artistEl = document.getElementById("themeSongWidgetArtist");
    var titleEl = document.getElementById("themeSongWidgetTitle");
    var playBtn = document.getElementById("themeSongWidgetPlayBtn");

    if (!widget || !icon || !artistEl || !titleEl || !playBtn) {
      return;
    }

    var displayConfig = themeSongState.isPlaying ? themeSongState.activeConfig : themeSongState.activeConfig;
    var hasActiveConfig = themeSongState.activeConfig || themeSongState.isPlaying;

    if (hasActiveConfig) {
      artistEl.textContent = getThemeSongArtist(displayConfig);
      titleEl.textContent = getThemeSongDisplayName(displayConfig);
      playBtn.textContent = themeSongState.isPlaying ? "⏸" : "▶";
      icon.classList.add("active");
    } else {
      icon.classList.remove("active");
      closeThemeSongWidget();
    }
  }

  function openThemeSongWidget() {
    var widget = document.getElementById("themeSongWidget");
    if (widget) {
      widget.removeAttribute("hidden");
    }
  }

  function closeThemeSongWidget() {
    var widget = document.getElementById("themeSongWidget");
    if (widget) {
      widget.setAttribute("hidden", "");
    }
  }

  function toggleThemeSongWidgetExpand() {
    var widget = document.getElementById("themeSongWidget");
    if (widget && widget.hasAttribute("hidden")) {
      openThemeSongWidget();
    } else {
      closeThemeSongWidget();
    }
  }

  function handleThemeSongWidgetPlayClick() {
    if (!themeSongState.audio || !themeSongState.activeConfig) {
      return;
    }

    if (themeSongState.isPlaying) {
      clearFadeTimer();
      themeSongState.audio.pause();
      themeSongState.isPlaying = false;
      themeSongState.suppressAutoStopUntil = 0;
    } else {
      playThemeSong(true, themeSongState.activeConfig, true);
    }
    updateThemeSongWidget();
  }

  function renderStructuredDay(text, factionKey, dayNumber) {
    state.currentRenderingDay = typeof dayNumber === "number" ? dayNumber : null;
    var dayScopedText = getDayScopeText(text);
    var html = "";
    var lineCounter = { value: 0 };
    var matchers = state.memberMatchers || [];
    var dayTitle = getFirstTagLine(dayScopedText, "TITLE") || getFirstTagLine(dayScopedText, "DAY");
    var systemStateText = getTagBlock(dayScopedText, "SYSTEM_STATE");
    var narrativeText = getTagBlock(dayScopedText, "NARRATIVE");
    var rulesText = getTagBlock(dayScopedText, "RULES");
    var logText = getTagBlock(dayScopedText, "LOG");
    var nightText = getTagBlock(dayScopedText, "NIGHT");
    var authorNoteText = getTagBlock(dayScopedText, "AUTHOR NOTE");
    var systemObservationText = getTagBlock(dayScopedText, "SYSTEM_OBSERVATION");
    var hideSystemObservation = state.hideSystemObservation && typeof dayNumber === "number" && dayNumber >= 3;

    if (dayNumber === 4 && state.day4Compact && narrativeText) {
      narrativeText = buildCompactNarrative(narrativeText);
    }

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

    if (shouldUseTeamTags(dayNumber)) {
      // Faction-specific block
      var tagMap = {
        "astral-wardens": "TEAM_A_ASTRAL_WARDENS",
        "obsidian-dominion": "TEAM_B_FURIOUS_FLOOFS",
        "velocity-syndicate": "TEAM_C_VELOCITY_SYNDICATE"
      };
      var teamTag = tagMap[factionKey];
      var teamRegex = new RegExp("\\[\\[" + teamTag + "\\]\\]([\\s\\S]*?)\\[\\[/" + teamTag + "\\]\\]");
      var teamMatch = dayScopedText.match(teamRegex);

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
            var inlineTitle = extractInlineTitle(line);
            if (inlineTitle) {
              html += renderInlineTitle(inlineTitle);
              return;
            }
            lineCounter.value += 1;
            html += renderNumberedLine(lineCounter.value, line, matchers);
          });
          html += "</div>";
        }

        html += "</div>";
      }
    }

    if (systemObservationText && !hideSystemObservation) {
      html += renderSystemObservationSection("System Observation", systemObservationText, "reader-section--system");
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
        var inlineTitle = extractInlineTitle(line);
        if (inlineTitle) {
          return renderInlineTitle(inlineTitle);
        }
        lineCounter.value += 1;
        return renderNumberedLine(lineCounter.value, line.trim(), matchers || []);
      }).join("") +
      '</div>';
  }

  function buildCompactNarrative(sectionText) {
    var lines = toLines(sectionText);
    if (!lines.length) {
      return sectionText;
    }

    var result = [];
    var introKept = 0;
    var keepCountForSection = 0;
    var sectionHasHeading = false;

    for (var i = 0; i < lines.length; i++) {
      var rawLine = lines[i];
      var line = String(rawLine || "");
      var trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      if (isVisualDivider(trimmed)) {
        result.push("---");
        keepCountForSection = 0;
        continue;
      }

      var inlineTitle = extractInlineTitle(trimmed);
      if (inlineTitle) {
        result.push("[[" + inlineTitle + "]]");
        sectionHasHeading = true;
        keepCountForSection = 0;
        continue;
      }

      if (!sectionHasHeading) {
        if (introKept < 3) {
          result.push(trimmed);
          introKept += 1;
        }
        continue;
      }

      if (keepCountForSection < 4) {
        result.push(trimmed);
        keepCountForSection += 1;
        continue;
      }

      if (/(challenge complete|skill unlock|day 4 is complete|tomorrow the ceiling lifts)/i.test(trimmed)) {
        result.push(trimmed);
      }
    }

    return result.join("\n");
  }

  function renderSystemObservationSection(label, sectionText, extraClass) {
    var lines = toLines(sectionText);
    if (!lines.length) {
      return "";
    }

    var rendered = lines.map(function (rawLine) {
      return renderObservationLine(rawLine);
    }).join("");

    if (!rendered.trim()) {
      return "";
    }

    return '' +
      '<div class="reader-section ' + extraClass + '">' +
      '<h4 class="reader-section-label">' + escapeHtml(label) + '</h4>' +
      '<div class="reader-observation-block">' + rendered + '</div>' +
      '</div>';
  }

  function renderObservationLine(rawLine) {
    var line = String(rawLine || "");
    if (!line.trim()) {
      return '<div class="reader-observation-spacer" aria-hidden="true"></div>';
    }

    var indent = measureLineIndent(line);
    var content = line.slice(indent).trim();
    var classNames = ["reader-observation-line"];

    if (/[:\u2014-]\s*$/.test(content)) {
      classNames.push("reader-observation-line--label");
    }

    var bulletMatch = content.match(/^(\u2014|-|•)\s*(.+)$/);
    if (bulletMatch) {
      classNames.push("reader-observation-line--bullet");
      content = bulletMatch[2].trim();
    }

    var level = Math.floor(indent / 2);
    var style = '--obs-level:' + Math.max(0, Math.min(12, level)) + ';';
    return '<p class="' + classNames.join(" ") + '" style="' + style + '">' + escapeHtml(content) + '</p>';
  }

  function measureLineIndent(line) {
    var count = 0;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (ch === " ") {
        count += 1;
      } else if (ch === "\t") {
        count += 2;
      } else {
        break;
      }
    }
    return count;
  }

  function renderVisualDivider() {
    return '<div class="reader-divider" role="separator" aria-hidden="true"></div>';
  }

  function isVisualDivider(line) {
    return /^-{3,}$/.test(String(line || "").trim());
  }

  function extractInlineTitle(line) {
    var match = String(line || "").trim().match(/^\[\[([^\]]+)\]\]$/);
    if (!match) {
      return "";
    }

    var value = String(match[1] || "").trim();
    if (!value || value.charAt(0) === "/") {
      return "";
    }

    return value;
  }

  function renderInlineTitle(title) {
    return '<p class="reader-inline-title">' + escapeHtml(title) + '</p>';
  }

  function renderNumberedLine(lineNumber, lineText, matchers) {
    var highlighted = highlightKnownNames(lineText, matchers || []);
    return '' +
      '<p class="story-line" data-line-number="' + lineNumber + '" data-text="' + escapeHtml(String(lineText || "").toLowerCase()) + '" data-names="' + escapeHtml(highlighted.names.join("|")) + '" data-factions="' + escapeHtml(highlighted.factions.join("|")) + '">' +
      '<span class="line-number" aria-hidden="true">' + lineNumber + '.</span>' +
      '<span class="line-content">' + highlighted.html + '</span>' +
      '</p>';
  }

  function highlightKnownNames(text, matchers) {
    var source = String(text || "");
    if (!source || !matchers.length) {
      return {
        html: escapeHtml(source),
        names: [],
        factions: []
      };
    }

    var lowerText = source.toLowerCase();
    var cursor = 0;
    var result = "";
    var foundNames = [];
    var foundFactions = [];

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
      var matchedFaction = getFactionForNormalizedName(bestMatcher.normalized);
      var factionAttr = matchedFaction ? ' data-faction="' + escapeHtml(matchedFaction) + '"' : "";
      var memberColor = state.nameColorMode === "none" ? "" : getMemberPrimaryColor(bestMatcher.normalized, matchedFaction);
      var colorStyle = memberColor ? ' style="--member-color:' + escapeHtml(memberColor) + '"' : "";
      var prefix = state.nameColorMode === "prefix" ? getFactionPrefix(matchedFaction) : "";
      var displayText = prefix ? (prefix + " " + matchedText) : matchedText;
      result += '<span class="name" tabindex="0" data-name="' + escapeHtml(bestMatcher.normalized) + '"' + factionAttr + colorStyle + '>' + escapeHtml(displayText) + '</span>';
      foundNames.push(bestMatcher.normalized);
      if (matchedFaction) {
        foundFactions.push(matchedFaction);
      }
      cursor = bestIndex + bestMatcher.length;
    }

    return {
      html: result,
      names: unique(foundNames),
      factions: unique(foundFactions)
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
    var factionLookup = {};

    Object.keys(FALLBACK_LEADERS).forEach(function (key) {
      pushUniqueName(names, seen, FALLBACK_LEADERS[key]);
      factionLookup[normalizeName(FALLBACK_LEADERS[key])] = key;
    });

    Object.keys(HUNTER_NAMES_BY_DAY).forEach(function (dayKey) {
      (HUNTER_NAMES_BY_DAY[dayKey] || []).forEach(function (name) {
        pushUniqueName(names, seen, name);
      });
    });

    Object.keys(state.dayTextByDay || {}).forEach(function (dayKey) {
      var text = state.dayTextByDay[dayKey];
      collectTeamNamesFromText(text).forEach(function (name) {
        pushUniqueName(names, seen, name);
      });
      collectFactionNamesFromText(text, factionLookup);
    });

    state.memberMatchers = buildMemberMatchers(names);
    state.memberFactionLookup = factionLookup;
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

  function collectFactionNamesFromText(text, factionLookup) {
    var mapping = {
      TEAM_A_ASTRAL_WARDENS: "astral-wardens",
      TEAM_B_FURIOUS_FLOOFS: "obsidian-dominion",
      TEAM_C_VELOCITY_SYNDICATE: "velocity-syndicate"
    };
    var teamRegex = /\[\[(TEAM_[A-Z_]+)\]\]([\s\S]*?)\[\[\/\1\]\]/g;
    var match;

    while ((match = teamRegex.exec(text || "")) !== null) {
      var factionKey = mapping[match[1]];
      if (!factionKey) {
        continue;
      }

      var body = match[2] || "";
      var leaderMatch = body.match(/\[\[LEADER\]\]\s*([^\n\r]+?)\s*\[\[\/LEADER\]\]/i);
      if (leaderMatch) {
        factionLookup[normalizeName(leaderMatch[1])] = factionKey;
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
          factionLookup[normalizeName(line)] = factionKey;
          teamHasNames = true;
          continue;
        }
        stopList = true;
      }
    }
  }

  function getFactionForNormalizedName(normalizedName) {
    var day = state.currentRenderingDay;
    if (day != null && HUNTER_NAMES_BY_DAY[day]) {
      var hunters = HUNTER_NAMES_BY_DAY[day];
      for (var i = 0; i < hunters.length; i++) {
        if (normalizeName(hunters[i]) === normalizedName) {
          return "hunters";
        }
      }
    }
    return state.memberFactionLookup[normalizedName] || "";
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

    var stopTagAlternation = KNOWN_BLOCK_TAGS
      .map(function (name) {
        return escapeForRegExp(name);
      })
      .join("|");
    var openPattern = new RegExp(
      "\\[\\[" + escapedTag + "\\]\\]([\\s\\S]*?)(?=\\n\\s*\\[\\[(?:" + stopTagAlternation + ")\\]\\]|$)",
      "i"
    );
    var openMatch = text.match(openPattern);
    if (openMatch) {
      return (openMatch[1] || "").trim();
    }

    return "";
  }

  function toLines(value) {
    return String(value || "").split(/\r?\n/);
  }

  function getDayScopeText(text) {
    var source = String(text || "");
    var dayMatch = source.match(/\[\[DAY\]\]([\s\S]*?)(?:\[\[DAY END\]\]|$)/i);
    if (dayMatch) {
      return dayMatch[1] || "";
    }
    return source;
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

  function updateReaderEraTheme() {
    var day3Plus = state.readerMode === "infinite"
      ? getAvailableDayNumbers().some(function (day) { return day >= 3; })
      : (typeof state.readerDay === "number" && state.readerDay >= 3);
    document.body.setAttribute("data-era", day3Plus ? "day3plus" : "classic");
  }

  function getMemberPrimaryColor(normalizedName, factionKey) {
    if (!normalizedName) {
      return "";
    }

    if (factionKey === "hunters") {
      return HUNTER_COLOR;
    }

    var baseHueByFaction = {
      "astral-wardens": 210,
      "obsidian-dominion": 2,
      "velocity-syndicate": 210
    };
    var baseHue = baseHueByFaction[factionKey] || 215;
    var hash = 0;
    for (var i = 0; i < normalizedName.length; i++) {
      hash = (hash * 31 + normalizedName.charCodeAt(i)) % 997;
    }

    var hueOffset = (hash % 17) - 8;
    var sat = 68 + (hash % 11);
    var light = 56 + (hash % 9) - 4;

    if (factionKey === "velocity-syndicate") {
      sat = 0 + (hash % 4);
      light = 65 + (hash % 9);
      hueOffset = 0;
    }

    return "hsl(" + (baseHue + hueOffset) + " " + sat + "% " + light + "%)";
  }

  function getFactionPrefix(factionKey) {
    if (factionKey === "astral-wardens") {
      return "AW";
    }
    if (factionKey === "obsidian-dominion") {
      return "FF";
    }
    if (factionKey === "velocity-syndicate") {
      return "VS";
    }
    if (factionKey === "hunters") {
      return "H";
    }
    return "";
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
    }) || state.availablePlan.find(function (entry) {
      return entry.day === dayNumber;
    }) || null;
  }

  function getFallbackPlanByDay(dayNumber) {
    var plannedEntry = DAY_PLAN.find(function (entry) {
      return entry.day === dayNumber;
    });
    if (plannedEntry) {
      return plannedEntry;
    }

    return {
      phase: dayNumber === 0 ? "Phase Zero" : "Day " + dayNumber,
      day: dayNumber,
      worlds: Object.keys(FACTIONS).map(function (factionKey) {
        return {
          faction: factionKey,
          world: getDefaultWorldForFaction(factionKey),
          note: "Auto-detected day file"
        };
      })
    };
  }

  function getDefaultWorldForFaction(factionKey) {
    for (var i = 0; i < DAY_PLAN.length; i++) {
      var worlds = DAY_PLAN[i].worlds || [];
      for (var j = 0; j < worlds.length; j++) {
        if (worlds[j].faction === factionKey) {
          return worlds[j].world;
        }
      }
    }

    return "";
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
