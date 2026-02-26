(function () {
      "use strict";

      var MAX_DAY_FILES = 30;
      var TAG_RE = /^\s*\[\[(DAY|RULES|LOG|NIGHT|AUTHOR NOTE|NARRATIVE)\]\]\s*$/i;
      var DRAMATIC_RE = /(horn|alarm|match start|game ends)/i;
      var MEMBER_NAMES = [
        "pinkfml",
        "Doomfox",
        "Popcorn Rya",
        "Rabbit",
        "SomeDucks",
        "HeyNoQuest",
        "GalaxyTwentea Dinosaur",
        "Trxty",
        "Vanarknees 🇦🇷",
        "Loyal2Schwalb",
        "KennBlueDragon",
        "WavyDragons",
        "CrystalWolf",
        "Godly_Aura",
        "NinjaFlout",
        "CharliSpirit",
        "Schwonkey",
        "Smart2004",
        "Acoustyx",
        "Snowlaris",
        "Polaris",
        "Revenant",
        "lumallie",
        "Duccarian",
        "Ninnginni",
        "space_fan",
        "Golden",
        "JIKOSU",
        "BLEUG!",
        "Lysrix",
        "Akarimmu",
        "Nightmare",
        "Axlot",
        "Shroud",
        "Rally",
        "Toad",
        "janhk.",
        "kiwi",
        "Kiwi",
        "Ut",
        "Elv",
        "Bofa"
      ];
      var MEMBER_MATCHERS = buildMemberMatchers(MEMBER_NAMES);

      var STORE = {
        theme: "maze_theme",
        mode: "maze_mode",
        fontScale: "maze_font_scale",
        width: "maze_width_mode",
        povOnly: "maze_pov_only"
      };

      var state = {
        days: [],
        mode: readStore(STORE.mode, "paged"),
        currentDay: 0,
        query: "",
        selectedName: "",
        selectedNameLabel: "",
        povOnly: readStore(STORE.povOnly, "false") === "true",
        fontScale: clamp(parseFloat(readStore(STORE.fontScale, "1")), 0.85, 1.3),
        widthMode: readStore(STORE.width, "narrow"),
        theme: readStore(STORE.theme, "dark"),
        rafPending: false
      };

      var subtitleEl = document.getElementById("subtitle");
      var statusEl = document.getElementById("status");
      var readerEl = document.getElementById("reader");
      var searchInput = document.getElementById("searchInput");
      var progressLabel = document.getElementById("progressLabel");
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

      init();

      function init() {
        applyTheme(state.theme);
        applyWidthMode(state.widthMode);
        applyFontScale(state.fontScale);
        povOnlyInput.checked = state.povOnly;
        selectModeInput(state.mode);
        bindEvents();
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
        if (state.rafPending) {
          return;
        }
        state.rafPending = true;
        window.requestAnimationFrame(function () {
          state.rafPending = false;
          updateProgress();
        });
      }

      function loadAllDays() {
        statusEl.textContent = "Scanning maze day files...";
        loadExistingDayFiles(MAX_DAY_FILES)
          .then(function (loadedDays) {
            if (!loadedDays.length) {
              throw new Error("No day files found in ./content (expected day1.txt, day2.txt, ...).");
            }
            state.days = loadedDays;
            subtitleEl.textContent = "Loaded " + loadedDays.length + " maze days";
            statusEl.textContent = "Ready. Click a name to focus dialogue. Use Settings for view mode.";
            renderDays();
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
            } else if (tag === "NIGHT") {
              currentMode = "night";
            } else if (tag === "AUTHOR NOTE") {
              currentMode = "author-note";
            } else if (tag === "NARRATIVE") {
              currentMode = "narrative";
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
        return {
          raw: raw,
          text: clean,
          textLower: clean.toLowerCase(),
          dramatic: DRAMATIC_RE.test(clean)
        };
      }

      function renderDays() {
        readerEl.replaceChildren();
        if (!state.days.length) {
          return;
        }

        if (state.mode === "paged") {
          state.currentDay = clamp(state.currentDay, 0, state.days.length - 1);
          renderDaySection(state.days[state.currentDay], state.currentDay, false);
          navWrap.classList.remove("hidden");
          bottomNextWrap.classList.remove("hidden");
        } else {
          state.days.forEach(function (day, idx) {
            renderDaySection(day, idx, true);
          });
          navWrap.classList.add("hidden");
          bottomNextWrap.classList.add("hidden");
        }

        var atLastDay = state.currentDay >= state.days.length - 1;
        prevDayBtn.disabled = state.currentDay <= 0;
        nextDayBtn.disabled = atLastDay;
        nextDayBottomBtn.disabled = atLastDay;
        applyNameSelectionVisuals();
        applyFilters();
        updateProgress();
      }

      function goToPrevDay() {
        if (state.currentDay <= 0) {
          return;
        }
        state.currentDay -= 1;
        renderDays();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      function goToNextDay() {
        if (state.currentDay >= state.days.length - 1) {
          return;
        }
        state.currentDay += 1;
        renderDays();
        window.scrollTo({ top: 0, behavior: "smooth" });
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

        dayData.blocks.forEach(function (block) {
          if (block.type === "dayHeading") {
            var headingLine = block.lines[0] ? block.lines[0].raw : dayData.title;
            var h2 = document.createElement("h2");
            h2.className = "day-heading";
            h2.textContent = stripMarkup(headingLine) || dayData.title;
            section.appendChild(h2);
            return;
          }

          var blockEl = document.createElement("div");
          blockEl.className = "story-block " + block.type;

          block.lines.forEach(function (line) {
            blockEl.appendChild(renderLine(line, dayIndex));
          });

          section.appendChild(blockEl);
        });

        readerEl.appendChild(section);
      }

      function renderLine(lineData, dayIndex) {
        var lineEl = document.createElement("p");
        lineEl.className = "story-line";
        lineEl.setAttribute("data-day-index", String(dayIndex));
        lineEl.setAttribute("data-text", lineData.textLower);

        if (!lineData.raw.trim()) {
          lineEl.classList.add("blank");
          lineEl.setAttribute("aria-hidden", "true");
          return lineEl;
        }

        if (lineData.dramatic) {
          lineEl.classList.add("dramatic");
        }

        var foundNames = [];
        appendHighlightedMembers(lineEl, lineData.text, foundNames);

        lineEl.setAttribute("data-names", unique(foundNames).join("|"));
        return lineEl;
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

      function applyFilters() {
        var lines = readerEl.querySelectorAll(".story-line");
        var query = state.query;
        var focus = state.selectedName;
        var visibleCount = 0;

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
      }

      function updateProgress() {
        if (!state.days.length) {
          progressLabel.textContent = "Day 1 - 0%";
          return;
        }

        if (state.mode === "paged") {
          var section = readerEl.querySelector(".day-section");
          var pct = section ? getSectionProgress(section) : 0;
          progressLabel.textContent = "Day " + (state.currentDay + 1) + " - " + pct + "%";
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
        progressLabel.textContent = "Day " + (activeIdx + 1) + " - " + activePct + "%";
      }

      function getSectionProgress(sectionEl) {
        var rect = sectionEl.getBoundingClientRect();
        var sectionTop = rect.top + window.scrollY;
        var sectionHeight = Math.max(1, sectionEl.offsetHeight);
        var viewMid = window.scrollY + window.innerHeight * 0.5;
        var progress = ((viewMid - sectionTop) / sectionHeight) * 100;
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
        if (name === "polaris") {
          return "snowlaris";
        }
        return name;
      }

      function normalizeNewlines(text) {
        return String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      }

      function stripMarkup(text) {
        return String(text).replace(/<[^>]+>/g, "");
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
