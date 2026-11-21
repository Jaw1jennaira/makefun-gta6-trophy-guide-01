/* Vice City Neon — GTA VI trophy guide & tracker.
   Static, offline, no network calls after load. Progress lives in localStorage. */
(function () {
  "use strict";
  var STORE_KEY = "vice-city-neon-v1";
  var POINTS = { platinum: 300, gold: 90, silver: 30, bronze: 15 };
  var GRADE_LETTER = { platinum: "P", gold: "G", silver: "S", bronze: "B" };
  var SRC_LABEL = { ppx: "PPX", kg: "KG", snap: "SNAP", tgw: "TGW", spot: "SPOT" };
  var SRC_NAME = {
    ppx: "PowerPyx Trophy Guide", kg: "KeenGamer Trophy Guide",
    snap: "GTASnaps Guide", tgw: "TheGamesWiki", spot: "GTASpotter"
  };
  var KIND_LABEL = {
    story: "Story", contacts: "Contacts", crime: "Crime", money: "Money",
    activities: "Activities", collectibles: "Collectibles", secret: "Secret", completion: "Completion"
  };
  var STAGE_ORDER = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9"];

  var data = { trophies: [], sources: [], stages: [] };
  var byId = {};
  var state = {
    earned: {}, counts: {}, revealed: {},
    spoilerOn: true, kind: "all", grade: "all", query: "",
    hideEarned: false, onlyMissable: false, selected: 28
  };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function srcTags(srcs) {
    return (srcs || []).map(function (s) {
      return '<span class="src-tag" title="' + esc(SRC_NAME[s] || s) + '">[' + esc(SRC_LABEL[s] || s) + "]</span>";
    }).join("");
  }
  function fmtMoney(n) { return "$" + Number(n).toLocaleString("en-US"); }

  /* ---------- state ---------- */
  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s.earned) state.earned = s.earned;
      if (s.counts) state.counts = s.counts;
      if (s.revealed) state.revealed = s.revealed;
      if (typeof s.spoilerOn === "boolean") state.spoilerOn = s.spoilerOn;
      if (s.selected) state.selected = s.selected;
    } catch (e) { /* corrupt state: start fresh */ }
  }
  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        earned: state.earned, counts: state.counts, revealed: state.revealed,
        spoilerOn: state.spoilerOn, selected: state.selected
      }));
      var el = $("saveStatus");
      el.textContent = "✓ Saved in this browser";
    } catch (e) { /* storage unavailable: keep going in memory */ }
  }
  function isEarned(id) { return !!state.earned[id]; }
  function isMasked(t) {
    return state.spoilerOn && t.hidden && !isEarned(t.id) && !state.revealed[t.id];
  }
  function earnedCount() { return data.trophies.filter(function (t) { return isEarned(t.id); }).length; }
  function psnPoints() {
    var n = 0;
    data.trophies.forEach(function (t) { if (isEarned(t.id)) n += POINTS[t.grade] || 0; });
    return n;
  }

  /* ---------- header / audit ---------- */
  function renderHeader() {
    var total = data.trophies.length, got = earnedCount();
    var pct = total ? Math.round(got / total * 100) : 0;
    $("earnedCount").textContent = got;
    $("psnCount").textContent = psnPoints().toLocaleString("en-US");
    var g = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    data.trophies.forEach(function (t) { if (isEarned(t.id)) g[t.grade]++; });
    $("gradeCounts").textContent = g.platinum + "P · " + g.gold + "G · " + g.silver + "S · " + g.bronze + "B";
    $("ringPct").textContent = pct + "%";
    $("ringFg").style.strokeDashoffset = String(238.76 * (1 - got / total));
    var badge = $("missableBadge");
    if (badge) badge.textContent = isEarned(28) ? "0" : "1";
  }
  function renderAudit() {
    var steps = 0, cited = 0;
    data.trophies.forEach(function (t) {
      (t.steps || []).forEach(function (s) { steps++; if (s.src && s.src.length) cited++; });
    });
    var trackers = data.trophies.filter(function (t) { return t.target; }).length;
    var hidden = data.trophies.filter(function (t) { return t.hidden; }).length;
    var items = [
      { n: data.trophies.length, c: "trophies", cls: "pink" },
      { n: cited + "/" + steps, c: "steps cited", cls: "cyan" },
      { n: "55/55", c: "guides cite sources", cls: "" },
      { n: hidden, c: "hidden on PSN", cls: "gold" },
      { n: 1, c: "potentially missable", cls: "pink" },
      { n: trackers, c: "count trackers", cls: "cyan" },
      { n: data.sources.length, c: "sources read", cls: "" },
      { n: "1,350", c: "PSN points", cls: "gold" }
    ];
    $("auditStrip").innerHTML = items.map(function (it) {
      return '<div class="audit-item"><span class="audit-num ' + it.cls + '">' + it.n +
        '</span><span class="audit-cap">' + it.c + "</span></div>";
    }).join("");
  }

  /* ---------- filters ---------- */
  function passingFilters(t) {
    if (state.kind !== "all" && (t.kinds || []).indexOf(state.kind) === -1) return false;
    if (state.grade !== "all" && t.grade !== state.grade) return false;
    if (state.hideEarned && isEarned(t.id)) return false;
    if (state.onlyMissable && !t.missable && !t.risk) return false;
    if (state.query) {
      var q = state.query.toLowerCase();
      var hay = (t.name + " " + t.description + " " + (t.where || "")).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }
  function renderChips() {
    var kinds = ["all"].concat(Object.keys(KIND_LABEL));
    $("kindChips").innerHTML = kinds.map(function (k) {
      var n = k === "all" ? data.trophies.length
        : data.trophies.filter(function (t) { return (t.kinds || []).indexOf(k) !== -1; }).length;
      return '<button type="button" class="chip' + (state.kind === k ? " active" : "") +
        '" data-kind="' + k + '">' + (k === "all" ? "All" : KIND_LABEL[k]) + " · " + n + "</button>";
    }).join("");
    var grades = ["all", "platinum", "gold", "silver", "bronze"];
    $("gradeChips").innerHTML = grades.map(function (g) {
      var n = g === "all" ? data.trophies.length
        : data.trophies.filter(function (t) { return t.grade === g; }).length;
      var label = g === "all" ? "All grades" : GRADE_LETTER[g] + " · " + g;
      return '<button type="button" class="chip grade' + (state.grade === g ? " active" : "") +
        '" data-grade="' + g + '">' + label + " · " + n + "</button>";
    }).join("");
  }
  function renderNextUp() {
    var order = roadmapOrder().filter(function (t) { return !isEarned(t.id); }).slice(0, 5);
    $("nextUp").innerHTML = order.length ? order.map(function (t) {
      var label = isMasked(t) ? (t.mask || "Hidden trophy") : t.name;
      return '<li><b>' + esc(label) + '</b><span class="mini">' + esc(t.where || "") + "</span></li>";
    }).join("") : '<li><b>Platinum done.</b><span class="mini">All 55 earned — enjoy Leonida.</span></li>';
  }

  /* ---------- tracker list ---------- */
  function roadmapOrder() {
    var out = [];
    STAGE_ORDER.forEach(function (sid) {
      data.trophies.filter(function (t) { return t.stage === sid; })
        .sort(function (a, b) { return a.id - b.id; })
        .forEach(function (t) { out.push(t); });
    });
    return out;
  }
  function trophyRow(t) {
    var masked = isMasked(t);
    var name = masked ? "Hidden trophy" : t.name;
    var desc = masked ? (t.mask || "A story trophy — hidden on PSN until earned.") : t.description;
    var pills = '<span class="pill ' + t.grade + '">' + GRADE_LETTER[t.grade] + " · " + t.grade + "</span>";
    if (t.hidden && !masked) pills += '<span class="pill">Hidden</span>';
    if (t.missable) pills += '<span class="pill miss">⚠ Missable</span>';
    else if (t.risk) pills += '<span class="pill risk">At risk</span>';
    if (t.risk && /nconfirmed/.test(t.risk)) pills += '<span class="pill unconf">Unconfirmed</span>';
    var count = "";
    if (t.target) {
      var cur = state.counts[t.id] || 0;
      var val = t.target >= 1000 ? fmtMoney(cur) + " / " + fmtMoney(t.target)
        : cur + " / " + t.target + " " + esc(t.targetLabel || "");
      count = '<span class="tcount">' + val + "</span>";
    }
    return '<button type="button" class="trow' + (isEarned(t.id) ? " earned" : "") +
      (state.selected === t.id ? " selected" : "") + '" data-id="' + t.id + '">' +
      '<input type="checkbox" ' + (isEarned(t.id) ? "checked" : "") +
      ' data-check="' + t.id + '" aria-label="Mark ' + esc(name) + ' earned">' +
      '<span class="tbody"><span class="tname">' + esc(name) +
      (t.hidden && !masked ? '<span class="hid">HIDDEN</span>' : "") + "</span>" +
      '<span class="tdesc' + (masked ? " masked" : "") + '">' + esc(desc) + "</span>" +
      '<span class="tmeta">' + pills + count +
      (t.where && !masked ? '<span class="twhere">' + esc(t.where) + "</span>" : "") +
      "</span></span></button>";
  }
  function renderList() {
    var stages = data.stages.length ? data.stages : STAGE_ORDER.map(function (s) { return { id: s, title: s, where: "" }; });
    var html = "";
    stages.forEach(function (st) {
      var list = data.trophies.filter(function (t) { return t.stage === st.id && passingFilters(t); })
        .sort(function (a, b) { return a.id - b.id; });
      if (!list.length) return;
      var got = data.trophies.filter(function (t) { return t.stage === st.id && isEarned(t.id); }).length;
      var all = data.trophies.filter(function (t) { return t.stage === st.id; }).length;
      html += '<div class="stage-head"><h3>' + esc(st.title) + '</h3><span>' + esc(st.where || "") +
        " · " + got + "/" + all + "</span></div>";
      html += list.map(trophyRow).join("");
    });
    $("trophyList").innerHTML = html ||
      '<div class="card empty">No trophies match these filters. Clear the search or a filter to see the list again.</div>';
  }

  /* ---------- guide pane + counts ---------- */
  function renderGuide() {
    var t = byId[state.selected];
    var pane = $("guidePane");
    if (!t) { pane.innerHTML = "<h2>Pick a trophy</h2><p class='muted'>Select any trophy on the left to read its guide.</p>"; return; }
    var masked = isMasked(t);
    var name = masked ? "Hidden trophy" : t.name;
    var html = "<h2>Guide</h2>";
    html += '<div class="g-name">' + esc(name) + ' <span class="pill ' + t.grade + '">' +
      GRADE_LETTER[t.grade] + " · " + t.grade + "</span></div>";
    if (masked) {
      html += '<p class="g-desc masked">' + esc(t.mask || "A story trophy — hidden on PSN until earned.") + "</p>";
      html += "<p>This trophy's name, description and guide are hidden by the spoiler shield until you earn it or reveal it.</p>";
      html += '<button type="button" class="reveal-btn" data-reveal="' + t.id + '">Reveal this trophy</button>';
    } else {
      html += '<p class="g-desc">“' + esc(t.description) + '”</p>';
      if (t.missable) html += '<div class="g-risk"><b>⚠ Potentially missable.</b> ' + esc(t.risk || "") + "</div>";
      else if (t.risk) html += '<div class="g-risk"><b>At risk.</b> ' + esc(t.risk) + "</div>";
      html += '<p class="g-guide">' + esc(t.guide || "") + "</p>";
      html += '<ol class="steps">' + (t.steps || []).map(function (s) {
        return "<li>" + esc(s.text) + srcTags(s.src) + "</li>";
      }).join("") + "</ol>";
      html += '<p class="g-where">Where: ' + esc(t.where || "—") + "</p>";
      if (t.target) {
        var cur = state.counts[t.id] || 0;
        var done = cur >= t.target;
        html += '<p class="g-where">Counted: <b>' + (t.target >= 1000 ? fmtMoney(cur) + " / " + fmtMoney(t.target)
          : cur + " / " + t.target + " " + esc(t.targetLabel || "")) + "</b>" +
          (done ? ' — target reached, mark it earned below.' : "") + "</p>";
      }
    }
    pane.innerHTML = html;
    renderCountCard(t);
  }
  function renderCountCard(t) {
    var card = $("countCard");
    if (!t || !t.target || isMasked(t)) { card.hidden = true; return; }
    card.hidden = false;
    var cur = state.counts[t.id] || 0;
    var pct = Math.min(100, Math.round(cur / t.target * 100));
    var val = t.target >= 1000 ? fmtMoney(cur) + " <small>/ " + fmtMoney(t.target) + "</small>"
      : cur + " <small>/ " + t.target + " " + esc(t.targetLabel || "") + "</small>";
    $("countBody").innerHTML =
      '<div class="count-ctl"><button type="button" data-count="-1" aria-label="Decrease">−</button>' +
      '<span class="cval">' + val + '</span>' +
      '<button type="button" data-count="1" aria-label="Increase">+</button></div>' +
      '<div class="bar"><div style="width:' + pct + '%"></div></div>' +
      (cur >= t.target
        ? '<p><b>Target reached.</b> Tick the trophy on the left to mark it earned.</p>'
        : "<p>Saved with your progress. The bar fills as the count grows.</p>");
  }

  /* ---------- roadmap / missables / ledger / disputes / sources ---------- */
  var DISPUTES = [
    { q: "How long does the platinum really take?",
      a: "PowerPyx, KeenGamer, GTABase and eGamers say about 200 hours.",
      b: "Push Square says 250+ hours in its summary and up to 300 hours or more in its intro; Sixshore says 200–250+.",
      call: "Plan 200 hours for the checklist route; budget 200–300 if you play at a relaxed pace. The gap is pace, not a different list." },
    { q: "Difficulty: 4/10 or 7/10?",
      a: "PowerPyx rates the platinum 4/10 and says the shooting-range and racing golds “aren't too difficult”.",
      b: "Some other guides rate it 7/10 (reported by GTASnaps).",
      call: "Our call is 4/10: there are no hard skill checks, no mission gold medals and no difficulty settings. The cost is time, not reflexes." },
    { q: "How many trophies are hidden — 28 or 26?",
      a: "PlayStation's own list marks 28 as hidden, and this guide follows it.",
      b: "TheGamesWiki's table marks 26 as hidden; GTASpotter counts 26 story-spoiling trophies.",
      call: "28. The two extra hidden trophies are non-story secrets, so the story-only count of 26 and the PSN count of 28 are both right about different things." },
    { q: "Is the Chapter 1 balcony meditation actually required?",
      a: "PowerPyx: it raises the meditation counter by 1, but it is not marked as a Meditation Spot like the rest.",
      b: "The same guide says it is “currently unclear if it's required for the trophy or not”.",
      call: "Do it anyway. It costs one minute in Chapter 1 and it is the only safety net if the trophy does require it." },
    { q: "Do the hidden one-off trophies have confirmed methods?",
      a: "PowerPyx gives locations and triggers for most of them (VCIA gates, the air station, the Ocean Beach bar).",
      b: "KeenGamer notes some hidden trophy solutions are still being confirmed.",
      call: "We print locations as guide-reported, and we mark Bad Luck, I Guess and The Truth Is Out There as unconfirmed instead of inventing a method." }
  ];
  function renderRoadmap() {
    var el = $("roadmapStages");
    var stages = data.stages.length ? data.stages : [];
    el.innerHTML = stages.map(function (st) {
      var list = data.trophies.filter(function (t) { return t.stage === st.id; })
        .sort(function (a, b) { return a.id - b.id; });
      var items = list.map(function (t) {
        var label = isMasked(t) ? (t.mask || "Hidden trophy") : t.name;
        return "<li><b>" + esc(label) + "</b> — " + esc(t.missable ? "⚠ missable" : (t.target ? (t.target >= 1000 ? fmtMoney(t.target) + " " + (t.targetLabel || "") : t.target + " " + (t.targetLabel || "")) : (t.where || ""))) + "</li>";
      }).join("");
      return '<div class="card stage-card"><span class="when">' + esc(st.hours || "") + '</span><h3>' +
        esc(st.title) + '</h3><p class="muted">' + esc(st.where || "") + '</p><ul>' + items + "</ul></div>";
    }).join("");
  }
  function renderMissables() {
    var t = byId[28];
    var hero = "";
    if (t) {
      hero = '<div class="card miss-hero"><h3>⚠ ' + esc(t.name) + ' — the one potentially missable trophy</h3>' +
        '<p class="lede">Meditate at every spot across Leonida: 18 spots across 10 locations. The danger is one unmarked meditation in Chapter 1.</p>' +
        '<ol class="steps">' + (t.steps || []).map(function (s) {
          return "<li>" + esc(s.text) + srcTags(s.src) + "</li>";
        }).join("") + "</ol>" +
        '<p><b>Our call:</b> do the balcony meditation even though it is unconfirmed whether it counts. One minute in Chapter 1 protects the whole trophy.</p></div>';
    }
    $("missableList").innerHTML = hero;
    var atRisk = data.trophies.filter(function (x) { return x.risk && !x.missable; });
    $("atRiskGrid").innerHTML = atRisk.map(function (x) {
      var label = isMasked(x) ? (x.mask || "Hidden trophy") : x.name;
      return '<div class="card risk-card"><h3>' + esc(label) + ' <span class="pill ' + x.grade + '">' +
        GRADE_LETTER[x.grade] + "</span></h3><p>" + esc(x.risk) + "</p><p class='muted'>" +
        esc(x.where || "") + "</p></div>";
    }).join("") +
    '<div class="card risk-card"><h3>Irredeemable profile</h3><p>Your criminal profile affects how police treat you. The Irredeemable profile is permanent — police get far more aggressive. Avoid it; it is the one profile choice you cannot undo.</p><p class="muted">PowerPyx [PPX]</p></div>';
    var safe = [
      ["Optional missions disappearing", "Many optional missions vanish after a while. It does not matter for trophies: the 100% checklist needs 100 optional missions and 200–300+ exist."],
      ["Quest givers going quiet", "Some quest givers become temporarily unavailable during the story (Kenton, for example). Every trophy-related character comes back later."],
      ["Fences disappearing", "Some fences become permanently unavailable. It does not impact trophies or 100%: new fences unlock as you go."],
      ["Magazine collectibles in story buildings", "A few magazines sit in buildings that become permanently inaccessible. They also spawn elsewhere, and trophies do not need all of them."],
      ["Hourglass quests expiring", "Timed quests fail after a while. They are not relevant for trophies — do them as they appear and move on."],
      ["Strangers & Freaks after the story", "Open-world Strangers & Freaks are still there after the story. Nothing forces you to do them before the credits."],
      ["Relationship status", "The relationship status of Jason and Lucia does not matter for trophies."],
      ["Criminal profile (except Irredeemable)", "A violent profile only changes how police treat you. You can do all content with it — just avoid Irredeemable."]
    ];
    $("safeList").innerHTML = safe.map(function (s) {
      return '<div class="safe-item"><b>✓ ' + esc(s[0]) + "</b><br>" + esc(s[1]) + "</div>";
    }).join("");
  }
  function renderLedger() {
    var rows = [
      ["Stunts", "250", "300 of 397", "Cunning Stunts"],
      ["Vehicles scanned", "100 discovered", "200 of 277 base models", "Whip It Good"],
      ["Animals studied", "—", "100 of 255", "—"],
      ["Challenges", "50", "70 of 80", "One Last Thing"],
      ["Optional missions", "—", "100 of 200–300+", "—"],
      ["Shooting range golds", "42", "42 — all of them", "The Shootist"],
      ["Drone time trials", "win every location", "42 — all of them", "Top Fun"],
      ["Underwater discoveries", "—", "33 — all of them", "—"],
      ["Bret's Target Decks", "—", "15 — all of them", "Fair Game"],
      ["Meditation spots", "18 spots", "18 (×2 with both characters)", "Positive Mental Attitude"],
      ["Card sets", "3 sets", "not required", "Don't Touch My Deck"],
      ["WAiNK locations", "100", "not required", "You WAiNKer!"],
      ["Races won", "20 different", "not required", "Earn Cash, Not Kudos"],
      ["Bank vaults", "5 escaped", "all robberies", "Maximum Withdrawal"],
      ["Gang operations", "one per gang", "all robberies", "Pest Control"]
    ];
    $("ledgerTable").querySelector("tbody").innerHTML = rows.map(function (r) {
      return "<tr><td><b>" + esc(r[0]) + "</b></td><td class='num'>" + esc(r[1]) + "</td><td class='num'>" +
        esc(r[2]) + "</td><td>" + esc(r[3]) + "</td></tr>";
    }).join("");
    $("notNeededList").innerHTML = [
      "<b>Most side quests</b> — the majority are not needed for 100% at all.",
      "<b>Most collectible types</b> — many are not required, others only partially.",
      "<b>Mission gold medals</b> — there are none this time, so nothing to chase.",
      "<b>Optional missions past 100</b> — 200–300+ exist; missable ones do not matter.",
      "<b>Magazine collectibles in story buildings</b> — they spawn elsewhere too."
    ].map(function (x) { return "<li>" + x + "</li>"; }).join("");
    $("moneyList").innerHTML = [
      "<b>Dime on the Dollar</b> — earn $250,000 laundering Marked Bills through contacts.",
      "<b>Treat Yo Self</b> — spend $100,000 across all shops.",
      "Money lines are dollars, not items, so they sit outside the counted ledger."
    ].map(function (x) { return "<li>" + x + "</li>"; }).join("");
  }
  function renderDisputes() {
    $("disputeList").innerHTML = DISPUTES.map(function (d, i) {
      return '<div class="card dispute-card"><h3><span class="n">#' + (i + 1) + "</span> " + esc(d.q) + "</h3>" +
        '<div class="vs"><div><b>One side says</b>' + esc(d.a) + "</div><div><b>The other side says</b>" +
        esc(d.b) + '</div></div><div class="call"><b>Our call: </b>' + esc(d.call) + "</div></div>";
    }).join("");
  }
  function renderSources() {
    var counts = {};
    data.trophies.forEach(function (t) {
      (t.steps || []).forEach(function (s) {
        (s.src || []).forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
      });
    });
    var label = { ppx: "PowerPyx", kg: "KeenGamer", snap: "GTASnaps", tgw: "TheGamesWiki", spot: "GTASpotter" };
    $("sourceTable").querySelector("tbody").innerHTML = data.sources.map(function (s) {
      return "<tr><td><b>" + esc(label[s.id] || s.id) + "</b></td><td><a href='" + esc(s.url) +
        "' target='_blank' rel='noopener'>" + esc(s.title) + "</a><br><span class='muted'>" +
        esc(s.backs || "") + "</span></td><td>" + esc(s.depth || "") + "</td><td class='num'>" +
        (counts[s.id] || 0) + "</td></tr>";
    }).join("");
  }

  /* ---------- tabs ---------- */
  function switchView(name) {
    document.querySelectorAll("#viewTabs button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === name);
    });
    document.querySelectorAll("#viewRoot .view").forEach(function (v) {
      v.hidden = v.id !== "view-" + name;
      v.classList.toggle("active", v.id === "view-" + name);
    });
    if (name === "roadmap") renderRoadmap();
    if (name === "missables") renderMissables();
    if (name === "ledger") renderLedger();
    if (name === "disputes") renderDisputes();
    if (name === "sources") renderSources();
  }

  /* ---------- export / import ---------- */
  function exportProgress() {
    var payload = {
      app: "vice-city-neon", version: 1, exportedAt: new Date().toISOString(),
      earned: state.earned, counts: state.counts, revealed: state.revealed, spoilerOn: state.spoilerOn
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gta6-trophy-progress.json";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var s = JSON.parse(String(reader.result));
        if (s.earned) state.earned = s.earned;
        if (s.counts) state.counts = s.counts;
        if (s.revealed) state.revealed = s.revealed;
        if (typeof s.spoilerOn === "boolean") state.spoilerOn = s.spoilerOn;
        $("spoilerInput").checked = state.spoilerOn;
        saveState(); renderAll();
        $("saveStatus").textContent = "✓ Progress imported";
      } catch (e) {
        $("saveStatus").textContent = "Import failed: not a valid progress file";
      }
    };
    reader.readAsText(file);
  }

  /* ---------- events ---------- */
  function wireEvents() {
    $("viewTabs").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-view]");
      if (!b) return;
      var view = b.getAttribute("data-view");
      try { history.replaceState(null, "", "#/" + view); } catch (err) { /* hash optional */ }
      switchView(view);
    });
    $("spoilerInput").addEventListener("change", function (e) {
      state.spoilerOn = e.target.checked; saveState(); renderList(); renderGuide(); renderNextUp();
    });
    $("searchBox").addEventListener("input", function (e) {
      state.query = e.target.value; renderList();
    });
    $("kindChips").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-kind]");
      if (!b) return;
      state.kind = b.getAttribute("data-kind"); renderChips(); renderList();
    });
    $("gradeChips").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-grade]");
      if (!b) return;
      state.grade = b.getAttribute("data-grade"); renderChips(); renderList();
    });
    $("hideEarned").addEventListener("change", function (e) {
      state.hideEarned = e.target.checked; renderList();
    });
    $("onlyMissable").addEventListener("change", function (e) {
      state.onlyMissable = e.target.checked; renderList();
    });
    $("trophyList").addEventListener("click", function (e) {
      var check = e.target.closest("input[data-check]");
      if (check) {
        var id = Number(check.getAttribute("data-check"));
        if (check.checked) state.earned[id] = true; else delete state.earned[id];
        saveState(); renderHeader(); renderList(); renderGuide(); renderNextUp();
        return;
      }
      var row = e.target.closest(".trow");
      if (row) { state.selected = Number(row.getAttribute("data-id")); saveState(); renderList(); renderGuide(); }
    });
    $("guidePane").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-reveal]");
      if (!b) return;
      state.revealed[Number(b.getAttribute("data-reveal"))] = true;
      saveState(); renderList(); renderGuide(); renderNextUp();
    });
    $("countCard").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-count]");
      if (!b) return;
      var t = byId[state.selected];
      if (!t || !t.target) return;
      var cur = (state.counts[t.id] || 0) + Number(b.getAttribute("data-count"));
      state.counts[t.id] = Math.max(0, Math.min(t.target, cur));
      saveState(); renderList(); renderGuide(); renderHeader();
    });
    $("exportBtn").addEventListener("click", exportProgress);
    $("importBtn").addEventListener("click", function () { $("importFile").click(); });
    $("importFile").addEventListener("change", function (e) {
      if (e.target.files && e.target.files[0]) importProgress(e.target.files[0]);
      e.target.value = "";
    });
  }

  function renderAll() {
    renderHeader(); renderAudit(); renderChips(); renderNextUp();
    renderList(); renderGuide(); renderRoadmap(); renderMissables(); renderLedger(); renderDisputes(); renderSources();
  }

  function fail(msg) {
    $("trophyList").innerHTML = '<div class="card empty"><b>Could not load the trophy data.</b><br>' +
      esc(msg) + "<br>Open this guide through a local server (for example: <code>python3 -m http.server</code> in the app folder) — browsers block local file reads from file://.</div>";
  }

  function boot() {
    loadState();
    /* Demo mode (?demo=1): seed a mid-game save the first time the guide is
       opened with no saved progress, so the tracker shows what it looks like
       in use. Real progress is never overwritten. */
    if (new URLSearchParams(location.search).get("demo") === "1" &&
        Object.keys(state.earned).length === 0) {
      [2, 3, 4, 5, 8, 15, 16, 20, 21, 33, 35, 53].forEach(function (id) { state.earned[id] = true; });
      state.counts = { 15: 87, 28: 6, 31: 41, 35: 63, 32: 23 };
      state.selected = 28;
      saveState();
    }
    $("spoilerInput").checked = state.spoilerOn;
    Promise.all([
      fetch("data/trophies.json").then(function (r) { if (!r.ok) throw new Error("trophies.json: HTTP " + r.status); return r.json(); }),
      fetch("data/sources.json").then(function (r) { if (!r.ok) throw new Error("sources.json: HTTP " + r.status); return r.json(); })
    ]).then(function (parts) {
      var tj = parts[0], sj = parts[1];
      data.trophies = tj.trophies || [];
      data.stages = tj.stages || [];
      data.sources = sj.sources || [];
      data.trophies.forEach(function (t) { byId[t.id] = t; });
      if (!byId[state.selected]) state.selected = 28;
      wireEvents();
      renderAll();
      /* Deep link: #/roadmap, #/missables, #/ledger, #/disputes, #/sources. */
      var hashView = (location.hash || "").replace(/^#\/?/, "");
      if (["tracker", "roadmap", "missables", "ledger", "disputes", "sources"].indexOf(hashView) !== -1) {
        switchView(hashView);
      }
    }).catch(function (err) { fail(err && err.message ? err.message : String(err)); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
