(function () {
      "use strict";

      var MAX_DAY_FILES = 30;
      var TAG_RE = /^\s*\[\[(DAY|RULES|LOG|\/LOG|NIGHT|AUTHOR NOTE|NARRATIVE|TITLE)\]\]\s*$/i;
      var DRAMATIC_RE = /(horn|alarm|match start|game ends)/i;
      var MEMBER_NAMES = [
        "-MAD$-",
        "Alter",
        "Alter(Kiwi)",
        "Axlot",
        "Cyrus",
        "Doomfox",
        "Duccarian",
        "Elv",
        "Elvvusz",
        "Galaxy",
        "GalaxyTwentea",
        "GalaxyTwentea(dino enthusiast)",
        "Golden",
        "hollow Camila",
        "janhk.",
        "JIKOSU",
        "kiwi",
        "Kiwi",
        "Lord Kalameet",
        "Lysrix",
        "Mainthemainstar",
        "Nightmare",
        "Ninnginni",
        "Polaris",
        "pinkfml",
        "Popcorn Rya",
        "Rabbit",
        "Rally",
        "Rally mally",
        "Schwalbe",
        "SomeDucks",
        "Smart2004",
        "space fan",
        "space_fan",
        "Toad",
        "Trxty",
        "Ut"
      ];
      var MEMBER_MATCHERS = buildMemberMatchers(MEMBER_NAMES);
      var RELEASE_SYSTEM = window.HungerReleaseSystem || null;
      var RELEASE_CONFIG = window.HUNGER_RELEASE_CONFIG || {};
      var RELEASE_TICK_MS = 1000;
      var IMPORTANT_DAY_NUMBERS = [8, 14];
      var DAY_CREDITS = {
        14: [
          {
            name: "Rabbit",
            avatar: "./images/rabbit_pfp.png"
          }
        ]
      };
      var releaseIntervalId = null;

      var STORE = {
        theme: "maze_theme",
        mode: "maze_mode",
        fontScale: "maze_font_scale",
        width: "maze_width_mode",
        compactHeaderOnScroll: "maze_compact_header_on_scroll",
        daytimeCollapsed: "maze_daytime_collapsed",
        povOnly: "maze_pov_only",
        lastOpenedDay: "maze_last_opened_day",
        resumeEnabled: "maze_resume_enabled",
        resumeSnapshot: "maze_resume_snapshot"
      };

      var state = {
        days: [],
        mode: readStore(STORE.mode, "paged"),
        currentDay: 0,
        query: "",
        selectedName: "",
        selectedNameLabel: "",
        povOnly: readStore(STORE.povOnly, "false") === "true",
        compactHeaderOnScroll: readStore(STORE.compactHeaderOnScroll, "true") !== "false",
        daytimeCollapsed: readStore(STORE.daytimeCollapsed, "false") === "true",
        fontScale: clamp(parseFloat(readStore(STORE.fontScale, "1")), 0.85, 1.3),
        widthMode: readStore(STORE.width, "narrow"),
        theme: readStore(STORE.theme, "dark"),
        rafPending: false,
        sessionMaxProgressByDay: {},
        previewBypass: false,
        resumeEnabled: readStore(STORE.resumeEnabled, "false") === "true",
        resumeRestoreInFlight: false,
        resumeWriteTimer: 0,
        characterPickerDayIndex: -1
      };

      var subtitleEl = document.getElementById("subtitle");
      var statusEl = document.getElementById("status");
      var readerEl = document.getElementById("reader");
      var searchInput = document.getElementById("searchInput");
      var characterPicker = document.getElementById("characterPicker");
      var progressLabel = document.getElementById("progressLabel");
      var nextUnlockLabel = document.getElementById("nextUnlockLabel");
      var focusLabel = document.getElementById("focusLabel");
      var themeToggle = document.getElementById("themeToggle");
      var widthToggle = document.getElementById("widthToggle");
      var fontDown = document.getElementById("fontDown");
      var fontUp = document.getElementById("fontUp");
      var prevDayBtn = document.getElementById("prevDay");
      var nextDayBtn = document.getElementById("nextDay");
      var nextDayBottomBtn = document.getElementById("nextDayBottom");
      var navWrap = document.getElementById("navWrap");
      var bottomNextWrap = document.getElementById("bottomNextWrap");
      var settings = document.getElementById("settings");
      var helpBtn = document.getElementById("helpBtn");
      var helpPanel = document.getElementById("helpPanel");
      var helpCloseBtn = document.getElementById("helpCloseBtn");
      var modeInputs = document.querySelectorAll("input[name='viewMode']");
      var povOnlyInput = document.getElementById("povOnly");
      var compactHeaderOnScrollInput = document.getElementById("compactHeaderOnScroll");
      var resumeReadingInput = document.getElementById("resumeReading");
      var resumeResetBtn = document.getElementById("resumeReset");
      var dayOnlyToggleBtn = document.getElementById("dayOnlyToggle");
      var skipToNightBtn = document.getElementById("skipToNight");

      init();

      function init() {
        state.previewBypass = !!(RELEASE_SYSTEM && RELEASE_SYSTEM.isPreviewEnabled(RELEASE_CONFIG));
        applyTheme(state.theme);
        applyWidthMode(state.widthMode);
        applyFontScale(state.fontScale);
        povOnlyInput.checked = state.povOnly;
        if (compactHeaderOnScrollInput) {
          compactHeaderOnScrollInput.checked = state.compactHeaderOnScroll;
        }
        if (resumeReadingInput) {
          resumeReadingInput.checked = state.resumeEnabled;
        }
        updateResumeResetButtonState();
        updateDayOnlyToggleButton();
        selectModeInput(state.mode);
        bindEvents();
        updateTopBarScrollState();
        applyDaytimeCollapseState();

        if (RELEASE_SYSTEM && typeof RELEASE_SYSTEM.syncServerTime === "function" && RELEASE_CONFIG && RELEASE_CONFIG.serverTimeUrl) {
          statusEl.textContent = "Syncing trusted server time...";
          RELEASE_SYSTEM.syncServerTime(RELEASE_CONFIG)
            .catch(function () {
              // Sync failure falls back to local time.
            })
            .then(function () {
              loadAllDays();
            });
          return;
        }

        loadAllDays();
      }

      function bindEvents() {
        themeToggle.addEventListener("click", function () {
          var next = state.theme === "dark" ? "light" : "dark";
          applyTheme(next);
          writeStore(STORE.theme, next);
        });

        widthToggle.addEventListener("click", function () {
          var next = state.widthMode === "narrow" ? "wide" : "narrow";
          applyWidthMode(next);
          writeStore(STORE.width, next);
        });

        fontDown.addEventListener("click", function () {
          applyFontScale(clamp(state.fontScale - 0.05, 0.85, 1.3));
          writeStore(STORE.fontScale, String(state.fontScale));
        });

        fontUp.addEventListener("click", function () {
          applyFontScale(clamp(state.fontScale + 0.05, 0.85, 1.3));
          writeStore(STORE.fontScale, String(state.fontScale));
        });

        searchInput.addEventListener("input", function () {
          state.query = searchInput.value.trim().toLowerCase();
          applyFilters();
          updateProgress();
        });

        if (characterPicker) {
          characterPicker.addEventListener("change", function () {
            var selected = characterPicker.value;
            if (!selected) {
              state.selectedName = "";
              state.selectedNameLabel = "";
            } else {
              state.selectedName = selected;
              state.selectedNameLabel = getDisplayNameForNormalized(selected);
            }
            applyNameSelectionVisuals();
            applyFilters();
          });
        }

        modeInputs.forEach(function (input) {
          input.addEventListener("change", function () {
            if (!input.checked) {
              return;
            }
            state.mode = input.value;
            writeStore(STORE.mode, state.mode);
            renderDays();
          });
        });

        povOnlyInput.addEventListener("change", function () {
          state.povOnly = povOnlyInput.checked;
          writeStore(STORE.povOnly, String(state.povOnly));
          applyFilters();
        });

        if (compactHeaderOnScrollInput) {
          compactHeaderOnScrollInput.addEventListener("change", function () {
            state.compactHeaderOnScroll = compactHeaderOnScrollInput.checked;
            writeStore(STORE.compactHeaderOnScroll, String(state.compactHeaderOnScroll));
            updateTopBarScrollState();
          });
        }

        if (resumeReadingInput) {
          resumeReadingInput.addEventListener("change", function () {
            state.resumeEnabled = resumeReadingInput.checked;
            writeStore(STORE.resumeEnabled, String(state.resumeEnabled));
            if (state.resumeEnabled) {
              scheduleResumeSnapshotWrite(0);
            }
            updateResumeResetButtonState();
          });
        }

        if (resumeResetBtn) {
          resumeResetBtn.addEventListener("click", function () {
            clearResumeSnapshot();
            statusEl.textContent = "Saved reading checkpoint reset.";
            updateResumeResetButtonState();
          });
        }

        if (dayOnlyToggleBtn) {
          dayOnlyToggleBtn.addEventListener("click", function () {
            state.daytimeCollapsed = !state.daytimeCollapsed;
            writeStore(STORE.daytimeCollapsed, String(state.daytimeCollapsed));
            updateDayOnlyToggleButton();
            applyDaytimeCollapseState();
          });
        }

        if (skipToNightBtn) {
          skipToNightBtn.addEventListener("click", function () {
            scrollToFirstNightTag();
          });
        }

        prevDayBtn.addEventListener("click", function () {
          goToPrevDay();
        });

        nextDayBtn.addEventListener("click", function () {
          goToNextDay();
        });

        nextDayBottomBtn.addEventListener("click", function () {
          goToNextDay();
        });

        helpBtn.addEventListener("click", function () {
          openHelp();
        });

        helpCloseBtn.addEventListener("click", function () {
          closeHelp();
        });

        helpPanel.addEventListener("click", function (event) {
          if (event.target === helpPanel) {
            closeHelp();
          }
        });

        readerEl.addEventListener("click", function (event) {
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
          applyFilters();
        });

        readerEl.addEventListener("keydown", function (event) {
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

        document.addEventListener("click", function (event) {
          var target = event.target;
          if (!(target instanceof Node)) {
            return;
          }
          if (!settings.contains(target) && settings.open) {
            settings.open = false;
          }
        });

        document.addEventListener("keydown", function (event) {
          if (event.key === "Escape") {
            closeHelp();
          }
        });

        window.addEventListener("scroll", onScrollOrResize, { passive: true });
        window.addEventListener("resize", onScrollOrResize);
      }

      function openHelp() {
        helpPanel.classList.remove("hidden");
        helpBtn.setAttribute("aria-expanded", "true");
      }

      function closeHelp() {
        helpPanel.classList.add("hidden");
        helpBtn.setAttribute("aria-expanded", "false");
      }

      function onScrollOrResize() {
        scheduleResumeSnapshotWrite(220);
        if (state.rafPending) {
          return;
        }
        state.rafPending = true;
        window.requestAnimationFrame(function () {
          state.rafPending = false;
          updateTopBarScrollState();
          updateCharacterPickerForActiveDay(false);
          updateProgress();
        });
      }

      function updateTopBarScrollState() {
        if (!state.compactHeaderOnScroll) {
          document.body.classList.remove("is-scrolled");
          return;
        }
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
        document.body.classList.toggle("is-scrolled", scrollTop > 8);
      }

      function loadAllDays() {
        statusEl.textContent = "Scanning maze day files...";
        loadExistingDayFiles(resolveDayLimit())
          .then(function (loadedDays) {
            if (!loadedDays.length) {
              throw new Error("No day files found in ./content (expected day1.txt, day2.txt, ...).");
            }
            state.days = loadedDays;
            restoreLastOpenedDay();
            var resumeSnapshot = getResumeSnapshot();
            if (state.resumeEnabled && resumeSnapshot) {
              applyResumeSnapshotState(resumeSnapshot);
            }
            subtitleEl.textContent = "Loaded " + loadedDays.length + " maze days";
            if (state.previewBypass) {
              subtitleEl.textContent += " (preview mode enabled)";
            }
            statusEl.textContent = "Ready. Click a name to focus dialogue. Use Settings for view mode.";
            renderDays();
            if (state.resumeEnabled && resumeSnapshot) {
              restoreReadingPosition(resumeSnapshot);
            }
          })
          .catch(function (err) {
            statusEl.textContent = "Could not load day files. Serve via HTTP/GitHub Pages. Error: " + err.message;
            subtitleEl.textContent = "Load failed";
          });
      }

      function loadExistingDayFiles(maxDays) {
        var requests = [];
        for (var i = 1; i <= maxDays; i += 1) {
          requests.push(loadSingleDay(i));
        }
        return Promise.all(requests).then(function (results) {
          return results
            .filter(Boolean)
            .sort(function (a, b) {
              return a.dayNumber - b.dayNumber;
            });
            });
      }

      function resolveDayLimit() {
        var configuredTotal = parseInt(RELEASE_CONFIG.totalDays, 10);
        if (Number.isFinite(configuredTotal) && configuredTotal > 0) {
          return Math.min(MAX_DAY_FILES, configuredTotal);
        }
        return MAX_DAY_FILES;
      }

      function loadSingleDay(dayNumber) {
        var file = "./content/day" + dayNumber + ".txt";
        return fetch(file, { cache: "no-store" })
          .then(function (res) {
            if (!res.ok) {
              return null;
            }
            return res.text().then(function (text) {
              return parseDayText(text, dayNumber, file);
            });
          })
          .catch(function () {
            return null;
          });
      }

      function parseDayText(rawText, dayNumber, fileName) {
        var text = normalizeNewlines(rawText);
        var lines = text.split("\n");
        var blocks = [];
        var currentMode = "narrative";
        var pendingDayTitle = false;
        var title = "Day " + dayNumber;

        lines.forEach(function (line) {
          var tagMatch = line.match(TAG_RE);
          if (tagMatch) {
            var tag = tagMatch[1].toUpperCase();
            if (tag === "DAY") {
              currentMode = "narrative";
              pendingDayTitle = true;
            } else if (tag === "RULES") {
              currentMode = "rules";
            } else if (tag === "LOG") {
              currentMode = "log";
            } else if (tag === "/LOG") {
              currentMode = "narrative";
            } else if (tag === "NIGHT") {
              currentMode = "night";
            } else if (tag === "AUTHOR NOTE") {
              currentMode = "author-note";
            } else if (tag === "NARRATIVE") {
              currentMode = "narrative";
            } else if (tag === "TITLE") {
              currentMode = "title";
            }
            return;
          }

          if (pendingDayTitle && line.trim()) {
            title = stripMarkup(line.trim());
            blocks.push({
              type: "dayHeading",
              lines: [makeLineData(line)]
            });
            pendingDayTitle = false;
            return;
          }

          if (currentMode === "narrative" && isNarrativeSubheading(line)) {
            appendLineToBlock(blocks, "subheading", line);
            return;
          }

          appendLineToBlock(blocks, currentMode, line);
        });

        if (!blocks.length) {
          appendLineToBlock(blocks, "narrative", "");
        }

        return {
          title: title,
          dayNumber: dayNumber,
          fileName: fileName,
          blocks: blocks
        };
      }

      function appendLineToBlock(blocks, type, line) {
        var last = blocks[blocks.length - 1];
        if (!last || last.type !== type) {
          last = { type: type, lines: [] };
          blocks.push(last);
        }
        last.lines.push(makeLineData(line));
      }

      function makeLineData(raw) {
        var clean = stripMarkup(raw);
        var plain = stripInlineStoryFormatting(clean);
        return {
          raw: raw,
          display: clean,
          text: clean,
          textLower: plain.toLowerCase(),
          dramatic: DRAMATIC_RE.test(plain),
          subheading: isNarrativeSubheading(raw),
          midday: /^\s*midday\s*:/i.test(plain)
        };
      }

      function renderDays() {
        stopReleaseTicker();
        readerEl.replaceChildren();
        if (!state.days.length) {
          updateNextUnlockLabel();
          return;
        }

        if (state.mode === "paged") {
          state.currentDay = clamp(state.currentDay, 0, state.days.length - 1);
          persistLastOpenedDay();
          renderDayContainer(state.days[state.currentDay], state.currentDay, false);
          navWrap.classList.remove("hidden");
          bottomNextWrap.classList.remove("hidden");
        } else {
          state.days.forEach(function (day, idx) {
            renderDayContainer(day, idx, true);
          });
          navWrap.classList.add("hidden");
          bottomNextWrap.classList.add("hidden");
        }

        var atLastDay = state.currentDay >= state.days.length - 1;
        prevDayBtn.disabled = state.currentDay <= 0;
        nextDayBtn.disabled = atLastDay;
        nextDayBottomBtn.disabled = atLastDay;
        applyNameSelectionVisuals();
        updateCharacterPickerForActiveDay(true);
        applyDaytimeCollapseState();
        applyFilters();
        updateProgress();
        updateNextUnlockLabel();
        startReleaseTicker();
        scheduleResumeSnapshotWrite(0);
      }

      function goToPrevDay() {
        if (state.currentDay <= 0) {
          return;
        }
        state.currentDay -= 1;
        persistLastOpenedDay();
        renderDays();
        window.scrollTo({ top: 0, behavior: "smooth" });
        scheduleResumeSnapshotWrite(250);
      }

      function goToNextDay() {
        if (state.currentDay >= state.days.length - 1) {
          return;
        }
        state.currentDay += 1;
        persistLastOpenedDay();
        renderDays();
        window.scrollTo({ top: 0, behavior: "smooth" });
        scheduleResumeSnapshotWrite(250);
      }

      function renderDayContainer(dayData, dayIndex, withSeparator) {
        var dayNumber = dayData.dayNumber || dayIndex + 1;
        var releaseState = getReleaseState(dayNumber);
        if (releaseState.locked) {
          renderLockedDaySection(dayData, dayIndex, withSeparator, releaseState);
          return;
        }
        renderDaySection(dayData, dayIndex, withSeparator);
      }

      function renderDaySection(dayData, dayIndex, withSeparator) {
        if (withSeparator) {
          var sep = document.createElement("div");
          sep.className = "day-separator";
          sep.textContent = "══════════════════\nDAY " + dayData.dayNumber + "\n══════════════════";
          readerEl.appendChild(sep);
        }

        var section = document.createElement("section");
        section.className = "day-section";
        section.setAttribute("data-day-index", String(dayIndex));
        section.setAttribute("data-day-title", dayData.title);
        if (isImportantDay(dayData.dayNumber || (dayIndex + 1))) {
          section.classList.add("day-important");
        }

        var dayHeadingBlock = dayData.blocks.find(function (block) {
          return block.type === "dayHeading";
        });
        var dayHeadingLine = dayHeadingBlock && dayHeadingBlock.lines[0]
          ? dayHeadingBlock.lines[0].raw
          : dayData.title;

        var heading = document.createElement("h2");
        heading.className = "day-heading";
        heading.textContent = stripMarkup(dayHeadingLine) || dayData.title;
        appendImportantBadgeIfNeeded(heading, dayData.dayNumber || (dayIndex + 1));
        section.appendChild(heading);

        var dayNumber = dayData.dayNumber || (dayIndex + 1);
        var dayCredits = getCreditsForDay(dayNumber);
        if (dayCredits.length) {
          section.appendChild(renderDayCredits(dayCredits));
        }

        var content = document.createElement("div");
        content.className = "day-content";

        var dayLineNumber = 0;
        var nightSectionCount = 0;
        var reachedNight = false;

        dayData.blocks.forEach(function (block) {
          if (block.type === "dayHeading") {
            return;
          }

          var blockEl;
          var blockBodyEl;
          if (block.type === "night") {
            reachedNight = true;
            nightSectionCount += 1;
            blockEl = document.createElement("section");
            blockEl.className = "story-block night night-section";

            var nightHeading = document.createElement("h3");
            nightHeading.className = "night-heading";
            nightHeading.textContent = nightSectionCount > 1 ? ("Night " + nightSectionCount) : "Night";
            blockEl.appendChild(nightHeading);

            blockBodyEl = document.createElement("div");
            blockBodyEl.className = "night-content";
            blockEl.appendChild(blockBodyEl);
          } else {
            blockEl = document.createElement("div");
            blockEl.className = "story-block " + block.type;
            blockBodyEl = blockEl;
          }

          blockEl.classList.add(reachedNight ? "phase-night" : "phase-day");

          block.lines.forEach(function (line) {
            if (shouldSkipCreditLine(dayCredits, line.raw)) {
              return;
            }
            var lineNumber = 0;
            if (hasLineText(line)) {
              dayLineNumber += 1;
              lineNumber = dayLineNumber;
            }
            blockBodyEl.appendChild(renderLine(line, dayIndex, lineNumber));
          });

          content.appendChild(blockEl);
        });

        section.appendChild(content);
        readerEl.appendChild(section);
      }

      function renderLockedDaySection(dayData, dayIndex, withSeparator, releaseState) {
        if (withSeparator) {
          var sep = document.createElement("div");
          sep.className = "day-separator";
          sep.textContent = "══════════════════\nDAY " + dayData.dayNumber + "\n══════════════════";
          readerEl.appendChild(sep);
        }

        var section = document.createElement("section");
        section.className = "day-section day-locked";
        section.setAttribute("data-day-index", String(dayIndex));
        section.setAttribute("data-day-number", String(dayData.dayNumber || (dayIndex + 1)));
        section.setAttribute("data-unlock-unix", String(releaseState.unlockUnix));
        if (isImportantDay(dayData.dayNumber || (dayIndex + 1))) {
          section.classList.add("day-important");
        }

        var heading = document.createElement("h2");
        heading.className = "day-heading";
        heading.textContent = dayData.title || ("Day " + (dayIndex + 1));
        appendImportantBadgeIfNeeded(heading, dayData.dayNumber || (dayIndex + 1));
        section.appendChild(heading);

        var panel = document.createElement("div");
        panel.className = "lock-panel";

        var lockTitle = document.createElement("p");
        lockTitle.className = "lock-title";
        lockTitle.textContent = "This episode is locked.";

        var lockDate = document.createElement("p");
        lockDate.className = "lock-meta";
        lockDate.textContent = "Unlocks at " + formatUnlockDate(releaseState.unlockUnix);

        var lockCountdown = document.createElement("p");
        lockCountdown.className = "lock-countdown";
        lockCountdown.textContent = "Time remaining: " + formatDuration(releaseState.secondsRemaining);

        panel.appendChild(lockTitle);
        panel.appendChild(lockDate);
        panel.appendChild(lockCountdown);
        section.appendChild(panel);
        readerEl.appendChild(section);
      }

      function renderLine(lineData, dayIndex, lineNumber) {
        var lineEl = document.createElement("p");
        lineEl.className = "story-line";
        lineEl.setAttribute("data-day-index", String(dayIndex));
        lineEl.setAttribute("data-text", lineData.textLower);
        var trimmedRaw = lineData.raw.trim();

        if (trimmedRaw === "---") {
          lineEl.classList.add("line-divider");
          lineEl.setAttribute("aria-hidden", "true");
          lineEl.setAttribute("data-text", "");
          return lineEl;
        }

        if (!trimmedRaw) {
          lineEl.classList.add("blank");
          lineEl.setAttribute("aria-hidden", "true");
          return lineEl;
        }

        if (lineData.dramatic) {
          lineEl.classList.add("dramatic");
        }
        if (lineData.subheading) {
          lineEl.classList.add("subheading");
        }
        if (lineData.midday) {
          lineEl.classList.add("midday");
        }

        if (lineNumber > 0) {
          var numberEl = document.createElement("span");
          numberEl.className = "line-number";
          numberEl.setAttribute("aria-hidden", "true");
          numberEl.textContent = String(lineNumber) + ".";
          lineEl.appendChild(numberEl);
        }

        var foundNames = [];
        appendInlineFormattedMembers(lineEl, lineData.display, foundNames);

        lineEl.setAttribute("data-names", unique(foundNames).join("|"));
        return lineEl;
      }

      function hasLineText(lineData) {
        var trimmedRaw = lineData.raw.trim();
        return !!trimmedRaw && trimmedRaw !== "---";
      }

      function appendHighlightedMembers(lineEl, text, foundNames) {
        var lowerText = text.toLowerCase();
        var cursor = 0;

        while (cursor < text.length) {
          var bestIndex = -1;
          var bestMatcher = null;

          MEMBER_MATCHERS.forEach(function (matcher) {
            var idx = lowerText.indexOf(matcher.lower, cursor);
            while (idx !== -1) {
              var end = idx + matcher.length;
              if (hasNameBoundary(text, idx, end)) {
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
            lineEl.appendChild(document.createTextNode(text.slice(cursor)));
            return;
          }

          if (bestIndex > cursor) {
            lineEl.appendChild(document.createTextNode(text.slice(cursor, bestIndex)));
          }

          var matchedText = text.slice(bestIndex, bestIndex + bestMatcher.length);
          var nameEl = document.createElement("span");
          nameEl.className = "name";
          nameEl.setAttribute("tabindex", "0");
          nameEl.setAttribute("data-name", bestMatcher.normalized);
          nameEl.textContent = matchedText;
          lineEl.appendChild(nameEl);
          foundNames.push(bestMatcher.normalized);

          cursor = bestIndex + bestMatcher.length;
        }

        if (!text.length) {
          lineEl.appendChild(document.createTextNode(""));
        }
      }

      function appendInlineFormattedMembers(lineEl, text, foundNames) {
        var segments = parseInlineFormatting(text);
        segments.forEach(function (segment) {
          appendHighlightedMembersWithStyle(lineEl, segment.text, foundNames, segment.bold, segment.italic);
        });
      }

      function appendHighlightedMembersWithStyle(lineEl, text, foundNames, isBold, isItalic) {
        var lowerText = text.toLowerCase();
        var cursor = 0;

        while (cursor < text.length) {
          var bestIndex = -1;
          var bestMatcher = null;

          MEMBER_MATCHERS.forEach(function (matcher) {
            var idx = lowerText.indexOf(matcher.lower, cursor);
            while (idx !== -1) {
              var end = idx + matcher.length;
              if (hasNameBoundary(text, idx, end)) {
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
            appendStyledText(lineEl, text.slice(cursor), isBold, isItalic);
            return;
          }

          if (bestIndex > cursor) {
            appendStyledText(lineEl, text.slice(cursor, bestIndex), isBold, isItalic);
          }

          var matchedText = text.slice(bestIndex, bestIndex + bestMatcher.length);
          var nameEl = document.createElement("span");
          nameEl.className = "name";
          if (isBold) {
            nameEl.classList.add("fmt-bold");
          }
          if (isItalic) {
            nameEl.classList.add("fmt-italic");
          }
          nameEl.setAttribute("tabindex", "0");
          nameEl.setAttribute("data-name", bestMatcher.normalized);
          nameEl.textContent = matchedText;
          lineEl.appendChild(nameEl);
          foundNames.push(bestMatcher.normalized);

          cursor = bestIndex + bestMatcher.length;
        }

        if (!text.length) {
          lineEl.appendChild(document.createTextNode(""));
        }
      }

      function appendStyledText(parent, text, isBold, isItalic) {
        if (!text) {
          return;
        }
        if (!isBold && !isItalic) {
          parent.appendChild(document.createTextNode(text));
          return;
        }

        var span = document.createElement("span");
        if (isBold) {
          span.classList.add("fmt-bold");
        }
        if (isItalic) {
          span.classList.add("fmt-italic");
        }
        span.textContent = text;
        parent.appendChild(span);
      }

      function parseInlineFormatting(text) {
        var re = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
        var segments = [];
        var last = 0;

        while (true) {
          var match = re.exec(text);
          if (!match) {
            break;
          }
          if (match.index > last) {
            segments.push({ text: text.slice(last, match.index), bold: false, italic: false });
          }

          var token = match[0];
          if (token.slice(0, 2) === "**") {
            segments.push({ text: token.slice(2, -2), bold: true, italic: false });
          } else {
            segments.push({ text: token.slice(1, -1), bold: false, italic: true });
          }
          last = match.index + token.length;
        }

        if (last < text.length || text.length === 0) {
          segments.push({ text: text.slice(last), bold: false, italic: false });
        }

        return segments;
      }

      function isImportantDay(dayNumber) {
        return IMPORTANT_DAY_NUMBERS.indexOf(dayNumber) !== -1;
      }

      function appendImportantBadgeIfNeeded(headingEl, dayNumber) {
        if (!isImportantDay(dayNumber)) {
          return;
        }
        headingEl.appendChild(document.createTextNode(" "));
        var badge = document.createElement("span");
        badge.className = "important-badge";
        badge.textContent = "IMPORTANT";
        headingEl.appendChild(badge);
      }

      function getCreditsForDay(dayNumber) {
        var entries = DAY_CREDITS[dayNumber];
        if (!Array.isArray(entries)) {
          return [];
        }
        return entries.filter(function (entry) {
          return entry && typeof entry.name === "string" && entry.name.trim();
        });
      }

      function shouldSkipCreditLine(credits, rawLine) {
        if (!Array.isArray(credits) || !credits.length || typeof rawLine !== "string") {
          return false;
        }
        var normalizedLine = normalizeCreditText(rawLine);
        if (!normalizedLine) {
          return false;
        }
        return credits.some(function (entry) {
          return normalizeCreditText(entry.note || "") === normalizedLine;
        });
      }

      function normalizeCreditText(text) {
        return String(text)
          .toLowerCase()
          .replace(/^\s*\d+\.\s*/, "")
          .replace(/\s+/g, " ")
          .trim();
      }

      function renderDayCredits(credits) {
        var panel = document.createElement("section");
        panel.className = "day-credits";
        panel.setAttribute("aria-label", "Day credits");

        var title = document.createElement("h3");
        title.className = "day-credits-title";
        title.textContent = "Credits";
        panel.appendChild(title);

        credits.forEach(function (entry) {
          var item = document.createElement("article");
          item.className = "day-credit-item";

          var avatarWrap = document.createElement("div");
          avatarWrap.className = "day-credit-avatar-wrap";

          var avatar = document.createElement("img");
          avatar.className = "day-credit-avatar";
          avatar.src = entry.avatar || "";
          avatar.alt = entry.name + " profile picture";
          avatar.loading = "lazy";
          avatarWrap.appendChild(avatar);

          var statusDot = document.createElement("span");
          statusDot.className = "day-credit-status-dot";
          statusDot.setAttribute("aria-hidden", "true");
          avatarWrap.appendChild(statusDot);

          var body = document.createElement("div");
          body.className = "day-credit-body";

          var name = document.createElement("p");
          name.className = "day-credit-name";
          name.textContent = entry.name;

          body.appendChild(name);
          if (typeof entry.note === "string" && entry.note.trim()) {
            var note = document.createElement("p");
            note.className = "day-credit-note";
            note.textContent = entry.note;
            body.appendChild(note);
          }

          item.appendChild(avatarWrap);
          item.appendChild(body);
          panel.appendChild(item);
        });

        return panel;
      }

      function hasNameBoundary(text, start, end) {
        var prevChar = start > 0 ? text.charAt(start - 1) : "";
        var nextChar = end < text.length ? text.charAt(end) : "";
        return !isWordChar(prevChar) && !isWordChar(nextChar);
      }

      function isWordChar(char) {
        return !!char && /[A-Za-z0-9_]/.test(char);
      }

      function buildMemberMatchers(names) {
        var map = {};
        names.forEach(function (name) {
          var raw = String(name).trim();
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

      function tokenizeLine(rawLine) {
        var explicitTokens = extractExplicitNameSpanTokens(rawLine);
        var output = [];

        explicitTokens.forEach(function (token) {
          if (token.type === "name") {
            output.push(token);
            return;
          }
          var withSpeaker = splitSpeakerPrefix(token.value);
          withSpeaker.forEach(function (partialToken) {
            if (partialToken.type === "name") {
              output.push(partialToken);
              return;
            }
            splitByMentions(partialToken.value).forEach(function (mentionToken) {
              output.push(mentionToken);
            });
          });
        });

        return output;
      }

      function extractExplicitNameSpanTokens(line) {
        var re = /<span\s+class=["']name["']\s*>(.*?)<\/span>/gi;
        var tokens = [];
        var last = 0;
        while (true) {
          var match = re.exec(line);
          if (!match) {
            break;
          }
          if (match.index > last) {
            tokens.push({ type: "text", value: line.slice(last, match.index) });
          }
          tokens.push({ type: "name", value: stripMarkup(match[1]).trim() });
          last = match.index + match[0].length;
        }
        if (last < line.length || line.length === 0) {
          tokens.push({ type: "text", value: line.slice(last) });
        }
        return tokens;
      }

      function splitSpeakerPrefix(text) {
        var colon = text.indexOf(":");
        if (colon < 2 || colon > 42) {
          return [{ type: "text", value: text }];
        }
        var prefix = text.slice(0, colon);
        if (!/[A-Za-z]/.test(prefix)) {
          return [{ type: "text", value: text }];
        }
        if (/^\s*(DAY|NIGHT|DEATH LOG|INJURY LOG)\b/i.test(prefix)) {
          return [{ type: "text", value: text }];
        }
        return [
          { type: "name", value: prefix.trim() },
          { type: "text", value: text.slice(colon) }
        ];
      }

      function splitByMentions(text) {
        var re = /@[A-Za-z0-9_.-]+/g;
        var out = [];
        var last = 0;
        while (true) {
          var match = re.exec(text);
          if (!match) {
            break;
          }
          if (match.index > last) {
            out.push({ type: "text", value: text.slice(last, match.index) });
          }
          out.push({ type: "name", value: match[0] });
          last = match.index + match[0].length;
        }
        if (last < text.length || text.length === 0) {
          out.push({ type: "text", value: text.slice(last) });
        }
        return out;
      }

      function getReleaseState(dayNumber) {
        if (!RELEASE_SYSTEM) {
          return {
            locked: false,
            unlockUnix: NaN,
            secondsRemaining: 0
          };
        }
        return RELEASE_SYSTEM.getDayState(dayNumber, RELEASE_CONFIG);
      }

      function startReleaseTicker() {
        if (!RELEASE_SYSTEM || releaseIntervalId !== null) {
          return;
        }
        if (!readerEl.querySelector(".day-locked")) {
          return;
        }
        releaseIntervalId = window.setInterval(function () {
          var nowUnix = RELEASE_SYSTEM.getCurrentUnix ? RELEASE_SYSTEM.getCurrentUnix() : Math.floor(Date.now() / 1000);
          var lockSections = Array.from(readerEl.querySelectorAll(".day-locked"));
          var shouldRefresh = false;

          lockSections.forEach(function (section) {
            var unlockUnix = parseInt(section.getAttribute("data-unlock-unix") || "0", 10);
            if (!Number.isFinite(unlockUnix) || unlockUnix <= 0) {
              return;
            }
            var remaining = Math.max(0, unlockUnix - nowUnix);
            var countdownEl = section.querySelector(".lock-countdown");
            if (countdownEl) {
              countdownEl.textContent = "Time remaining: " + formatDuration(remaining);
            }
            if (remaining === 0) {
              shouldRefresh = true;
            }
          });

          updateNextUnlockLabel();

          if (shouldRefresh) {
            renderDays();
          }
        }, RELEASE_TICK_MS);
      }

      function stopReleaseTicker() {
        if (releaseIntervalId === null) {
          return;
        }
        window.clearInterval(releaseIntervalId);
        releaseIntervalId = null;
      }

      function updateNextUnlockLabel() {
        if (!nextUnlockLabel) {
          return;
        }
        if (!RELEASE_SYSTEM) {
          nextUnlockLabel.textContent = "Next unlock: schedule inactive";
          return;
        }
        if (state.previewBypass) {
          nextUnlockLabel.textContent = "Next unlock: preview mode";
          return;
        }

        var info = RELEASE_SYSTEM.getNextUnlockInfo(state.days.length, RELEASE_CONFIG);
        if (!info) {
          nextUnlockLabel.textContent = "Next unlock: all released";
          return;
        }

        var prefix = RELEASE_CONFIG.nextUnlockLabelPrefix || "Next unlock";
        nextUnlockLabel.textContent = prefix + ": Day " + info.dayNumber + " in " + formatDuration(info.secondsRemaining);
      }

      function formatUnlockDate(unlockUnix) {
        if (!RELEASE_SYSTEM) {
          return "Unknown";
        }
        return RELEASE_SYSTEM.formatDateTime(unlockUnix, RELEASE_CONFIG.locale || "en-US");
      }

      function formatDuration(seconds) {
        if (!RELEASE_SYSTEM) {
          return "--";
        }
        return RELEASE_SYSTEM.formatDuration(seconds).text;
      }

      function restoreLastOpenedDay() {
        var stored = parseInt(readStore(STORE.lastOpenedDay, "1"), 10);
        if (!Number.isFinite(stored)) {
          return;
        }
        state.currentDay = clamp(stored - 1, 0, Math.max(0, state.days.length - 1));
      }

      function persistLastOpenedDay() {
        writeStore(STORE.lastOpenedDay, String(state.currentDay + 1));
      }

      function applyFilters() {
        var lines = readerEl.querySelectorAll(".story-line");
        var query = state.query;
        var focus = state.selectedName;
        var visibleCount = 0;

        if (!lines.length) {
          if (readerEl.querySelector(".day-locked")) {
            statusEl.textContent = "Episode locked. Countdown is active.";
          }
          return;
        }

        lines.forEach(function (lineEl) {
          lineEl.classList.remove("is-hidden", "dimmed", "name-hit");
          if (lineEl.classList.contains("blank")) {
            if (query || (focus && state.povOnly)) {
              lineEl.classList.add("is-hidden");
            }
            return;
          }

          var lineText = lineEl.getAttribute("data-text") || "";
          var lineNames = (lineEl.getAttribute("data-names") || "").split("|").filter(Boolean);
          var matchesSearch = !query || lineText.indexOf(query) !== -1;
          var hasFocusedName = focus ? lineNames.indexOf(focus) !== -1 : false;
          var visible = matchesSearch;

          if (focus) {
            if (state.povOnly) {
              visible = visible && hasFocusedName;
            } else if (visible) {
              if (hasFocusedName) {
                lineEl.classList.add("name-hit");
              } else {
                lineEl.classList.add("dimmed");
              }
            }
          }

          if (!visible) {
            lineEl.classList.add("is-hidden");
            return;
          }
          visibleCount += 1;
        });

        statusEl.textContent = "Showing " + visibleCount + " matching lines.";
        updateProgress();
      }

      function applyNameSelectionVisuals() {
        var selected = state.selectedName;
        var names = readerEl.querySelectorAll(".name");
        names.forEach(function (nameEl) {
          nameEl.classList.toggle("selected", (nameEl.getAttribute("data-name") || "") === selected);
        });
        focusLabel.textContent = "Character: " + (state.selectedNameLabel || "none");
        syncCharacterPickerSelection();
      }

      function applyDaytimeCollapseState() {
        readerEl.classList.toggle("daytime-collapsed", state.daytimeCollapsed);
      }

      function updateDayOnlyToggleButton() {
        if (!dayOnlyToggleBtn) {
          return;
        }
        dayOnlyToggleBtn.textContent = state.daytimeCollapsed ? "Show daytime" : "Collapse daytime";
      }

      function scrollToFirstNightTag() {
        var target = null;

        if (state.mode === "paged") {
          var currentSection = readerEl.querySelector(".day-section");
          target = currentSection ? currentSection.querySelector(".night-section") : null;
        } else {
          var activeSection = getActiveDaySection();
          target = activeSection ? activeSection.querySelector(".night-section") : null;
          if (!target) {
            target = readerEl.querySelector(".night-section");
          }
        }

        if (!target) {
          statusEl.textContent = "No night section found for this day.";
          return;
        }

        target.scrollIntoView({ behavior: "smooth", block: "start" });
        statusEl.textContent = "Jumped to first night section.";
        scheduleResumeSnapshotWrite(120);
      }

      function updateCharacterPickerForActiveDay(force) {
        if (!characterPicker) {
          return;
        }
        var dayIndex = getCharacterPickerDayIndex();
        if (!force && dayIndex === state.characterPickerDayIndex) {
          syncCharacterPickerSelection();
          return;
        }
        state.characterPickerDayIndex = dayIndex;

        var availableNames = getAvailableCharactersForDay(dayIndex);
        renderCharacterPickerOptions(availableNames);

        if (state.selectedName && availableNames.indexOf(state.selectedName) === -1) {
          state.selectedName = "";
          state.selectedNameLabel = "";
          applyNameSelectionVisuals();
          applyFilters();
          return;
        }

        syncCharacterPickerSelection();
      }

      function getCharacterPickerDayIndex() {
        if (!state.days.length) {
          return -1;
        }
        if (state.mode === "paged") {
          return clamp(state.currentDay, 0, Math.max(0, state.days.length - 1));
        }
        var activeSection = getActiveDaySection();
        if (!activeSection) {
          return clamp(state.currentDay, 0, Math.max(0, state.days.length - 1));
        }
        var parsed = parseInt(activeSection.getAttribute("data-day-index") || String(state.currentDay), 10);
        return Number.isFinite(parsed)
          ? clamp(parsed, 0, Math.max(0, state.days.length - 1))
          : clamp(state.currentDay, 0, Math.max(0, state.days.length - 1));
      }

      function getAvailableCharactersForDay(dayIndex) {
        if (!Number.isFinite(dayIndex) || dayIndex < 0) {
          return [];
        }
        var section = findSectionByDayIndex(dayIndex);
        if (!section) {
          return [];
        }
        var set = {};
        var lines = section.querySelectorAll(".story-line");
        lines.forEach(function (lineEl) {
          var names = (lineEl.getAttribute("data-names") || "").split("|").filter(Boolean);
          names.forEach(function (name) {
            set[name] = true;
          });
        });
        return Object.keys(set).sort(function (a, b) {
          return getDisplayNameForNormalized(a).localeCompare(getDisplayNameForNormalized(b));
        });
      }

      function renderCharacterPickerOptions(availableNames) {
        if (!characterPicker) {
          return;
        }
        characterPicker.replaceChildren();

        var noneOption = document.createElement("option");
        noneOption.value = "";
        noneOption.textContent = "Character: none";
        characterPicker.appendChild(noneOption);

        availableNames.forEach(function (name) {
          var option = document.createElement("option");
          option.value = name;
          option.textContent = getDisplayNameForNormalized(name);
          characterPicker.appendChild(option);
        });

        characterPicker.disabled = availableNames.length === 0;
      }

      function syncCharacterPickerSelection() {
        if (!characterPicker) {
          return;
        }
        var selected = state.selectedName || "";
        var hasSelectedOption = Array.from(characterPicker.options).some(function (option) {
          return option.value === selected;
        });
        characterPicker.value = hasSelectedOption ? selected : "";
      }

      function getDisplayNameForNormalized(normalizedName) {
        for (var i = 0; i < MEMBER_MATCHERS.length; i += 1) {
          if (MEMBER_MATCHERS[i].normalized === normalizedName) {
            return MEMBER_MATCHERS[i].raw;
          }
        }
        return normalizedName;
      }

      function updateProgress() {
        if (!state.days.length) {
          progressLabel.textContent = "Day 1 - 0%";
          return;
        }

        if (state.mode === "paged") {
          var section = readerEl.querySelector(".day-section");
          var dayIdx = state.currentDay;
          var pct = section ? getSectionProgress(section) : 0;
          var maxPct = trackMaxProgress(dayIdx, pct);
          progressLabel.textContent = "Day " + (state.currentDay + 1) + " - " + maxPct + "%";
          return;
        }

        var sections = Array.from(readerEl.querySelectorAll(".day-section"));
        if (!sections.length) {
          progressLabel.textContent = "Day 1 - 0%";
          return;
        }

        var pivot = window.innerHeight * 0.36;
        var active = sections[0];
        for (var i = 0; i < sections.length; i += 1) {
          var rect = sections[i].getBoundingClientRect();
          if (rect.top <= pivot) {
            active = sections[i];
          } else {
            break;
          }
        }

        var activeIdx = parseInt(active.getAttribute("data-day-index") || "0", 10);
        var activePct = getSectionProgress(active);
        var activeMaxPct = trackMaxProgress(activeIdx, activePct);
        progressLabel.textContent = "Day " + (activeIdx + 1) + " - " + activeMaxPct + "%";
      }

      function applyResumeSnapshotState(snapshot) {
        if (snapshot.mode === "paged" || snapshot.mode === "infinite") {
          state.mode = snapshot.mode;
          selectModeInput(state.mode);
        }
        if (Number.isFinite(snapshot.dayIndex)) {
          state.currentDay = clamp(snapshot.dayIndex, 0, Math.max(0, state.days.length - 1));
        }
      }

      function restoreReadingPosition(snapshot) {
        state.resumeRestoreInFlight = true;
        window.requestAnimationFrame(function () {
          if (scrollToSnapshotLineAnchor(snapshot)) {
            // Restored using precise line anchor.
          } else if (state.mode === "infinite" && Number.isFinite(snapshot.scrollTop) && snapshot.scrollTop >= 0) {
            window.scrollTo({ top: snapshot.scrollTop, behavior: "auto" });
          } else {
            scrollToSnapshotProgress(snapshot);
          }
          state.resumeRestoreInFlight = false;
          scheduleResumeSnapshotWrite(120);
        });
      }

      function scrollToSnapshotLineAnchor(snapshot) {
        var anchor = snapshot && snapshot.lineAnchor;
        if (!anchor || typeof anchor !== "object") {
          return false;
        }

        var targetDayIndex = Number.isFinite(anchor.dayIndex)
          ? clamp(anchor.dayIndex, 0, Math.max(0, state.days.length - 1))
          : (Number.isFinite(snapshot.dayIndex)
            ? clamp(snapshot.dayIndex, 0, Math.max(0, state.days.length - 1))
            : state.currentDay);
        var section = findSectionByDayIndex(targetDayIndex);
        if (!section) {
          return false;
        }

        var lines = getReadableLinesInSection(section);
        if (!lines.length) {
          return false;
        }

        var rawIndex = parseInt(anchor.lineIndex, 10);
        var lineIndex = Number.isFinite(rawIndex) ? clamp(rawIndex, 0, lines.length - 1) : 0;
        var lineEl = lines[lineIndex];
        var lineRect = lineEl.getBoundingClientRect();
        var lineTop = lineRect.top + window.scrollY;
        var lineHeight = Math.max(1, lineEl.offsetHeight || lineRect.height || 1);

        var rawOffsetPct = Number.isFinite(anchor.lineOffsetPct) ? anchor.lineOffsetPct : 0;
        var lineOffset = clamp(rawOffsetPct, 0, 100) / 100;
        var viewportHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
        var targetY = lineTop + (lineHeight * lineOffset);
        var targetTop = Math.max(0, targetY - (viewportHeight * 0.22));

        var sectionRect = section.getBoundingClientRect();
        var sectionTop = sectionRect.top + window.scrollY;
        var sectionHeight = Math.max(1, section.offsetHeight || sectionRect.height || 1);
        if (sectionHeight <= viewportHeight) {
          targetTop = sectionTop;
        } else {
          var maxTop = Math.max(sectionTop, (sectionTop + sectionHeight) - viewportHeight);
          targetTop = clamp(targetTop, sectionTop, maxTop);
        }

        window.scrollTo({ top: targetTop, behavior: "auto" });
        return true;
      }

      function scrollToSnapshotProgress(snapshot) {
        var targetDayIndex = Number.isFinite(snapshot.dayIndex)
          ? clamp(snapshot.dayIndex, 0, Math.max(0, state.days.length - 1))
          : state.currentDay;
        var pct = clamp(parseFloat(snapshot.progressPct || 0), 0, 100);
        var section = findSectionByDayIndex(targetDayIndex);
        if (!section) {
          return;
        }

        var sectionRect = section.getBoundingClientRect();
        var sectionTop = sectionRect.top + window.scrollY;
        var sectionHeight = Math.max(1, section.offsetHeight);
        var viewportHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);

        if (sectionHeight <= viewportHeight) {
          window.scrollTo({ top: sectionTop, behavior: "auto" });
          return;
        }

        var trackStart = sectionTop;
        var trackEnd = Math.max(trackStart + 1, (sectionTop + sectionHeight) - viewportHeight);
        var targetTop = trackStart + (pct / 100) * (trackEnd - trackStart);
        window.scrollTo({ top: Math.max(0, targetTop), behavior: "auto" });
      }

      function scheduleResumeSnapshotWrite(delayMs) {
        if (!state.resumeEnabled || state.resumeRestoreInFlight || !state.days.length) {
          return;
        }
        if (state.resumeWriteTimer) {
          window.clearTimeout(state.resumeWriteTimer);
        }
        state.resumeWriteTimer = window.setTimeout(function () {
          state.resumeWriteTimer = 0;
          persistResumeSnapshot();
        }, Math.max(0, delayMs || 0));
      }

      function persistResumeSnapshot() {
        if (!state.resumeEnabled || !state.days.length) {
          return;
        }

        var activeSection = getActiveDaySection();
        var dayIndex = activeSection
          ? parseInt(activeSection.getAttribute("data-day-index") || String(state.currentDay), 10)
          : state.currentDay;
        dayIndex = Number.isFinite(dayIndex)
          ? clamp(dayIndex, 0, Math.max(0, state.days.length - 1))
          : state.currentDay;

        var progressPct = activeSection ? getSectionProgress(activeSection) : 0;
        var lineAnchor = activeSection ? getSectionLineAnchor(activeSection, dayIndex) : null;
        var snapshot = {
          mode: state.mode,
          dayIndex: dayIndex,
          progressPct: clamp(Math.round(progressPct), 0, 100),
          scrollTop: Math.max(0, Math.round(window.scrollY || 0)),
          lineAnchor: lineAnchor,
          savedAt: Date.now()
        };
        writeStore(STORE.resumeSnapshot, JSON.stringify(snapshot));
        updateResumeResetButtonState();
      }

      function getSectionLineAnchor(sectionEl, dayIndex) {
        var lines = getReadableLinesInSection(sectionEl);
        if (!lines.length) {
          return null;
        }

        var viewportTop = Math.max(0, window.scrollY || 0);
        var viewportHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
        var probeY = viewportTop + (viewportHeight * 0.22);
        var bestIdx = 0;
        var bestDistance = Number.POSITIVE_INFINITY;

        for (var i = 0; i < lines.length; i += 1) {
          var rect = lines[i].getBoundingClientRect();
          var top = rect.top + window.scrollY;
          var height = Math.max(1, lines[i].offsetHeight || rect.height || 1);
          var bottom = top + height;
          if (probeY >= top && probeY <= bottom) {
            bestIdx = i;
            bestDistance = 0;
            break;
          }
          var distance = Math.min(Math.abs(probeY - top), Math.abs(probeY - bottom));
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIdx = i;
          }
        }

        var anchorLine = lines[bestIdx];
        var anchorRect = anchorLine.getBoundingClientRect();
        var anchorTop = anchorRect.top + window.scrollY;
        var anchorHeight = Math.max(1, anchorLine.offsetHeight || anchorRect.height || 1);
        var lineOffsetPct = clamp(Math.round(((probeY - anchorTop) / anchorHeight) * 100), 0, 100);

        return {
          dayIndex: dayIndex,
          lineIndex: bestIdx,
          lineOffsetPct: lineOffsetPct,
          sectionProgressPct: clamp(Math.round(getSectionProgress(sectionEl)), 0, 100)
        };
      }

      function getReadableLinesInSection(sectionEl) {
        return Array.from(sectionEl.querySelectorAll(".story-line")).filter(function (lineEl) {
          return !lineEl.classList.contains("blank") && !lineEl.classList.contains("line-divider");
        });
      }

      function getResumeSnapshot() {
        var raw = readStore(STORE.resumeSnapshot, "");
        if (!raw) {
          return null;
        }
        try {
          var parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== "object") {
            return null;
          }
          return parsed;
        } catch (err) {
          return null;
        }
      }

      function clearResumeSnapshot() {
        if (state.resumeWriteTimer) {
          window.clearTimeout(state.resumeWriteTimer);
          state.resumeWriteTimer = 0;
        }
        try {
          window.localStorage.removeItem(STORE.resumeSnapshot);
        } catch (err) {
          // Ignore storage errors and keep runtime state.
        }
      }

      function updateResumeResetButtonState() {
        if (!resumeResetBtn) {
          return;
        }
        var hasSnapshot = !!getResumeSnapshot();
        resumeResetBtn.disabled = !state.resumeEnabled || !hasSnapshot;
      }

      function getActiveDaySection() {
        var sections = Array.from(readerEl.querySelectorAll(".day-section"));
        if (!sections.length) {
          return null;
        }
        if (state.mode === "paged") {
          return sections[0];
        }

        var pivot = window.innerHeight * 0.36;
        var active = sections[0];
        for (var i = 0; i < sections.length; i += 1) {
          var rect = sections[i].getBoundingClientRect();
          if (rect.top <= pivot) {
            active = sections[i];
          } else {
            break;
          }
        }
        return active;
      }

      function findSectionByDayIndex(dayIndex) {
        if (state.mode === "paged") {
          return readerEl.querySelector(".day-section");
        }
        return readerEl.querySelector('.day-section[data-day-index="' + dayIndex + '"]');
      }

      function trackMaxProgress(dayIndex, nextPct) {
        if (!Number.isFinite(dayIndex) || dayIndex < 0) {
          return clamp(Math.round(nextPct || 0), 0, 100);
        }
        var key = String(dayIndex);
        var prev = state.sessionMaxProgressByDay[key];
        var safePrev = Number.isFinite(prev) ? prev : 0;
        var safeNext = clamp(Math.round(nextPct || 0), 0, 100);
        var maxPct = Math.max(safePrev, safeNext);
        state.sessionMaxProgressByDay[key] = maxPct;
        return maxPct;
      }

      function getSectionProgress(sectionEl) {
        var rect = sectionEl.getBoundingClientRect();
        var sectionTop = rect.top + window.scrollY;
        var sectionHeight = Math.max(1, sectionEl.offsetHeight);
        var sectionBottom = sectionTop + sectionHeight;
        var viewportTop = window.scrollY;
        var viewportHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);

        if (sectionHeight <= viewportHeight) {
          return viewportTop >= sectionTop ? 100 : 0;
        }

        var trackStart = sectionTop;
        var trackEnd = Math.max(trackStart + 1, sectionBottom - viewportHeight);
        var progress = ((viewportTop - trackStart) / (trackEnd - trackStart)) * 100;
        return Math.round(clamp(progress, 0, 100));
      }

      function applyTheme(theme) {
        state.theme = theme === "light" ? "light" : "dark";
        document.body.setAttribute("data-theme", state.theme);
        themeToggle.textContent = state.theme === "dark" ? "Light" : "Dark";
      }

      function applyWidthMode(mode) {
        state.widthMode = mode === "wide" ? "wide" : "narrow";
        document.body.setAttribute("data-width-mode", state.widthMode);
        widthToggle.textContent = "Width: " + (state.widthMode === "wide" ? "Wide" : "Narrow");
      }

      function applyFontScale(scale) {
        state.fontScale = clamp(scale, 0.85, 1.3);
        document.documentElement.style.setProperty("--font-scale", String(state.fontScale));
      }

      function selectModeInput(mode) {
        modeInputs.forEach(function (input) {
          input.checked = input.value === mode;
        });
      }

      function normalizeName(raw) {
        var name = raw.replace(/^@+/, "").trim().toLowerCase();
        return name;
      }

      function isNarrativeSubheading(line) {
        var text = stripMarkup(line).trim();
        if (!text) {
          return false;
        }

        if (/^(midday|morning|afternoon|evening|night|dawn|dusk)\s*:/i.test(text)) {
          return true;
        }

        if (/^the first [^:]{1,70}:/i.test(text)) {
          return true;
        }

        if (/^small human moments in an inhuman place$/i.test(text)) {
          return true;
        }

        if (text.length > 96) {
          return false;
        }

        if (/["'.,!?]$/.test(text)) {
          return false;
        }

        if (/[:]/.test(text)) {
          return true;
        }

        return /^[A-Z][A-Za-z0-9 "'()\-]+$/.test(text) && text.split(/\s+/).length <= 12;
      }

      function normalizeNewlines(text) {
        return String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      }

      function stripMarkup(text) {
        return String(text).replace(/<[^>]+>/g, "");
      }

      function stripInlineStoryFormatting(text) {
        return String(text)
          .replace(/\*\*([^*\n]+)\*\*/g, "$1")
          .replace(/\*([^*\n]+)\*/g, "$1");
      }

      function readStore(key, fallback) {
        try {
          var value = window.localStorage.getItem(key);
          return value === null ? fallback : value;
        } catch (err) {
          return fallback;
        }
      }

      function writeStore(key, value) {
        try {
          window.localStorage.setItem(key, value);
        } catch (err) {
          // Ignore storage errors and keep runtime state.
        }
      }

      function clamp(value, min, max) {
        if (Number.isNaN(value)) {
          return min;
        }
        return Math.max(min, Math.min(max, value));
      }

      function unique(arr) {
        return Array.from(new Set(arr));
      }
    })();
