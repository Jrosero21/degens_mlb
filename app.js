const DATA_URL = "./data/current-board.json";

const featuredGrid = document.getElementById("featured-grid");
const boardList = document.getElementById("board-list");
const recentResultsSection = document.getElementById("recent-results-section");
const recentResultsList = document.getElementById("recent-results-list");
const generatedAtEl = document.getElementById("generated-at");
const gameCountEl = document.getElementById("game-count");
const heroSubtitleEl = document.getElementById("hero-subtitle");
const accuracyTitleEl = document.getElementById("accuracy-title");
const accuracyCopyEl = document.getElementById("accuracy-copy");
const accuracyMoneylineValueEl = document.getElementById("accuracy-moneyline-value");
const accuracyMoneylineNoteEl = document.getElementById("accuracy-moneyline-note");
const accuracyRunlineValueEl = document.getElementById("accuracy-runline-value");
const accuracyRunlineNoteEl = document.getElementById("accuracy-runline-note");
const accuracyTotalValueEl = document.getElementById("accuracy-total-value");
const accuracyTotalNoteEl = document.getElementById("accuracy-total-note");
const featuredCardTemplate = document.getElementById("featured-card-template");
const gameCardTemplate = document.getElementById("game-card-template");
const filterChips = [...document.querySelectorAll("[data-filter]")];
const dayChips = [...document.querySelectorAll("[data-day]")];
const dictionaryToggle = document.getElementById("dictionary-toggle");
const boardDictionary = document.getElementById("board-dictionary");

let allGames = [];
let recentGames = [];
let activeFilter = "all";
let activeDay = "today";
let expandedGameId = null;
let dictionaryOpen = false;

const TEAM_DISPLAY_MAP = {
  ANA: "LAA",
  AZ: "ARI",
  CHA: "CWS",
  CHN: "CHC",
  KCA: "KC",
  LAN: "LAD",
  NYA: "NYY",
  NYN: "NYM",
  SDN: "SD",
  SFN: "SF",
  SLN: "STL",
  TBA: "TB",
  WAS: "WSH",
};

const fmtNumber = (value, digits = 1) =>
  value == null ? "—" : Number(value).toFixed(digits);

const fmtPct = (value) =>
  value == null ? "—" : `${Number(value).toFixed(1)}%`;

const fmtMl = (value) => {
  if (value == null) return "—";
  return value > 0 ? `+${value}` : `${value}`;
};

const fmtSigned = (value, digits = 3) => {
  if (value == null) return "—";
  const num = Number(value);
  return `${num > 0 ? "+" : ""}${num.toFixed(digits)}`;
};

const fmtLine = (value, digits = 1) =>
  value == null ? "—" : Number(value).toFixed(digits);

const fmtDate = (value) => {
  if (!value) return "Unknown date";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const displayTeam = (value) => {
  if (!value) return "—";
  return TEAM_DISPLAY_MAP[value] || value;
};

const displayText = (value) => {
  if (!value) return value;
  let out = String(value);
  for (const [raw, shown] of Object.entries(TEAM_DISPLAY_MAP)) {
    out = out.replace(new RegExp(`\\b${raw}\\b`, "g"), shown);
  }
  out = out.replace(/\bmodel and market\b/gi, "model and Vegas");
  out = out.replace(/\bmarket\b/gi, "Vegas");
  out = out.replace(/\bhistorical bucket hit rate\b/gi, "similar spot win rate");
  return out;
};

function makeTag(label, className = "") {
  const span = document.createElement("span");
  span.className = `tag ${className}`.trim();
  span.textContent = label;
  return span;
}

function formatTotalSide(game) {
  const pick = game.projected_ou_pick ? displayText(game.projected_ou_pick) : "—";
  if (!game.projected_ou_pick || game.vegas_total_line == null) {
    return pick;
  }
  return `${pick} ${fmtLine(game.vegas_total_line, 1)}`;
}

function renderFeatured(featured) {
  featuredGrid.innerHTML = "";

  if (!featured.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No featured picks generated for this window yet.";
    featuredGrid.appendChild(empty);
    return;
  }

  for (const item of featured) {
    const card = featuredCardTemplate.content.firstElementChild.cloneNode(true);
    card.querySelector(".featured-card-type").textContent = (item.card_type || "Pick").replaceAll("_", " ");
    card.querySelector(".featured-card-date").textContent = fmtDate(item.board_display_date || item.game_date);
    card.querySelector(".featured-card-title").textContent = displayText(item.card_title || item.matchup_display);
    card.querySelector(".featured-card-subtitle").textContent = displayText(item.card_subtitle || item.matchup_display);
    card.querySelector(".featured-card-body").textContent = displayText(item.body_text || "No supporting note yet.");

    const chips = card.querySelector(".featured-card-chips");
    [item.chip_1, item.chip_2, item.confidence_score_pct != null ? `Confidence ${fmtPct(item.confidence_score_pct)}` : null]
      .filter(Boolean)
      .forEach((label) => chips.appendChild(makeTag(displayText(label))));

    featuredGrid.appendChild(card);
  }
}

function buildGameCard(game) {
  const card = gameCardTemplate.content.firstElementChild.cloneNode(true);
  const head = card.querySelector(".game-card-head");
  const body = card.querySelector(".game-card-body");
  if (game.model_vs_market === "DISAGREE") {
    card.classList.add("is-disagree");
  }
  if (expandedGameId === game.gamePk) {
    card.classList.add("is-open");
    body.hidden = false;
  }
  head.setAttribute("aria-expanded", expandedGameId === game.gamePk ? "true" : "false");

  card.querySelector(".game-date").textContent = fmtDate(game.board_display_date || game.game_date);
  card.querySelector(".game-matchup").textContent = `${displayTeam(game.away_team)} at ${displayTeam(game.home_team)}`;

  const badges = card.querySelector(".game-badges");
  if (Number(game.is_go_play) === 1) badges.appendChild(makeTag("Go Play", "tag-green"));
  if (Number(game.is_stay_away) === 1) badges.appendChild(makeTag("Stay Away", "tag-red"));
  if (game.edge_tier_label) badges.appendChild(makeTag(game.edge_tier_label));
  if (game.model_vs_market === "DISAGREE") badges.appendChild(makeTag("Model vs Vegas", "tag-yellow"));
  if (game.moneyline_roi_play) badges.appendChild(makeTag("ML 70%+", "tag-green"));
  if (game.runline_roi_play) badges.appendChild(makeTag("RL 70%+"));
  if (game.total_roi_play) badges.appendChild(makeTag("Total 60%+", "tag-yellow"));

  card.querySelector(".summary-winner").textContent = displayTeam(game.projected_winner);
  card.querySelector(".summary-confidence").textContent = fmtPct(game.projected_confidence_pct);
  card.querySelector(".summary-alignment").textContent = game.model_vs_market || "—";
  card.querySelector(".summary-edge").textContent = `${fmtSigned(game.projected_score_diff)} diff • ${fmtSigned(game.projected_total_edge)} total`;
  card.querySelector(".summary-bucket").textContent = `${fmtPct(game.historical_bucket_accuracy_pct)} • ${game.historical_bucket_games ?? "—"} games`;
  card.querySelector(".summary-runline").textContent = `${displayText(game.projected_runline_pick || "—")}${game.projected_runline_confidence_pct == null ? "" : ` • ${fmtPct(game.projected_runline_confidence_pct)}`}`;
  card.querySelector(".summary-ou").textContent = `${formatTotalSide(game)}${game.projected_ou_confidence_pct == null ? "" : ` • ${fmtPct(game.projected_ou_confidence_pct)}`}`;
  card.querySelector(".projected-winner").textContent = displayTeam(game.projected_winner);
  card.querySelector(".projected-score").textContent = `${fmtNumber(game.projected_away_runs, 1)} - ${fmtNumber(game.projected_home_runs, 1)}`;
  card.querySelector(".projected-diff").textContent = fmtNumber(game.projected_score_diff, 3);
  card.querySelector(".confidence-tier").textContent = game.edge_tier_label || "—";
  card.querySelector(".bucket-accuracy").textContent = `${fmtPct(game.historical_bucket_accuracy_pct)} • ${game.historical_bucket_games ?? "—"} games`;
  card.querySelector(".body-alignment").textContent = game.model_vs_market || "—";
  card.querySelector(".market-favorite").textContent = displayTeam(game.market_favorite);
  card.querySelector(".moneyline").textContent = `${displayTeam(game.away_team)} ${fmtMl(game.vegas_moneyline_away)} / ${displayTeam(game.home_team)} ${fmtMl(game.vegas_moneyline_home)}`;
  card.querySelector(".market-runline").textContent = displayText(game.market_runline || "—");
  const runlinePickEl = card.querySelector(".runline-pick");
  const runlineEdge = Number(game.projected_runline_edge ?? 0);
  runlinePickEl.textContent = `${displayText(game.projected_runline_pick || "—")}${game.projected_runline_confidence_pct == null ? "" : ` • ${fmtPct(game.projected_runline_confidence_pct)}`}${game.projected_runline_edge == null ? "" : ` • ${fmtSigned(game.projected_runline_edge)}`}`;
  if (runlineEdge > 0) runlinePickEl.style.color = "var(--green)";
  if (runlineEdge < 0) runlinePickEl.style.color = "var(--red)";
  card.querySelector(".body-projected-total").textContent = fmtNumber(game.projected_total_runs, 3);
  card.querySelector(".market-total").textContent = fmtNumber(game.vegas_total_line, 3);

  const totalPickEl = card.querySelector(".total-pick");
  const totalEdge = Number(game.projected_total_edge ?? 0);
  totalPickEl.textContent = `${formatTotalSide(game)}${game.projected_ou_confidence_pct == null ? "" : ` • ${fmtPct(game.projected_ou_confidence_pct)}`}${game.projected_total_edge == null ? "" : ` • ${fmtSigned(game.projected_total_edge)}`}`;
  if (totalEdge > 0) totalPickEl.style.color = "var(--green)";
  if (totalEdge < 0) totalPickEl.style.color = "var(--red)";

  head.addEventListener("click", () => {
    expandedGameId = expandedGameId === game.gamePk ? null : game.gamePk;
    renderGames();
    renderRecentGames();
  });

  return card;
}

function renderGameCards(targetEl, games, emptyText) {
  targetEl.innerHTML = "";

  if (!games.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = emptyText;
    targetEl.appendChild(empty);
    return;
  }

  for (const game of games) {
    targetEl.appendChild(buildGameCard(game));
  }
}

function renderGames() {
  const dateSet = [...new Set(allGames.map((game) => game.board_display_date || game.game_date).filter(Boolean))].sort();
  const boardDate = window.__boardMeta?.boardDate || dateSet[0] || null;
  const plusOne = boardDate ? new Date(`${boardDate}T12:00:00`) : null;
  if (plusOne) plusOne.setDate(plusOne.getDate() + 1);
  const resolvedTomorrowDate = plusOne ? plusOne.toISOString().slice(0, 10) : null;
  const todayCount = boardDate ? allGames.filter((game) => (game.board_display_date || game.game_date) === boardDate).length : 0;
  const tomorrowCount = resolvedTomorrowDate ? allGames.filter((game) => (game.board_display_date || game.game_date) === resolvedTomorrowDate).length : 0;

  if (activeDay === "today" && todayCount === 0 && tomorrowCount > 0) {
    activeDay = "tomorrow";
  } else if (activeDay === "tomorrow" && tomorrowCount === 0 && todayCount > 0) {
    activeDay = "today";
  }

  dayChips.forEach((chip) => {
    const label = chip.dataset.label || chip.textContent;
    if (chip.dataset.day === "today") chip.textContent = `${label} (${todayCount})`;
    if (chip.dataset.day === "tomorrow") chip.textContent = `${label} (${tomorrowCount})`;
  });

  let dayFiltered = allGames;
  if (activeDay === "today" && boardDate) {
    dayFiltered = allGames.filter((game) => (game.board_display_date || game.game_date) === boardDate);
  } else if (activeDay === "tomorrow" && resolvedTomorrowDate) {
    dayFiltered = allGames.filter((game) => (game.board_display_date || game.game_date) === resolvedTomorrowDate);
  }

  const filtered = dayFiltered.filter((game) => {
    if (activeFilter === "go_play") return Number(game.is_go_play) === 1;
    if (activeFilter === "stay_away") return Number(game.is_stay_away) === 1;
    if (activeFilter === "disagree") return game.model_vs_market === "DISAGREE";
    return true;
  });

  renderGameCards(boardList, filtered, "No games match this filter.");
}

function renderRecentGames() {
  if (!recentResultsSection || !recentResultsList) return;

  const hasRecentGames = recentGames.length > 0;
  recentResultsSection.hidden = !hasRecentGames;
  if (!hasRecentGames) {
    recentResultsList.innerHTML = "";
    return;
  }

  renderGameCards(recentResultsList, recentGames, "No recent games to show.");
}

function bindFilters() {
  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeFilter = chip.dataset.filter;
      filterChips.forEach((other) => other.classList.toggle("is-active", other === chip));
      renderGames();
    });
  });

  dayChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeDay = chip.dataset.day;
      dayChips.forEach((other) => other.classList.toggle("is-active", other === chip));
      renderGames();
    });
  });

  if (dictionaryToggle && boardDictionary) {
    dictionaryToggle.addEventListener("click", () => {
      dictionaryOpen = !dictionaryOpen;
      dictionaryToggle.classList.toggle("is-active", dictionaryOpen);
      dictionaryToggle.setAttribute("aria-expanded", dictionaryOpen ? "true" : "false");
      boardDictionary.hidden = !dictionaryOpen;
    });
  }
}

function renderAccuracy(accuracy) {
  if (!accuracy) return;

  accuracyTitleEl.textContent = accuracy.season || "Season tracking";

  const moneyline = accuracy.lanes?.moneyline;
  const runline = accuracy.lanes?.runline;
  const total = accuracy.lanes?.total;

  const formatLane = (lane, valueEl, noteEl, options = {}) => {
    if (!lane || lane.accuracyPct == null) {
      valueEl.textContent = "--";
      noteEl.textContent = "Waiting on graded games";
      return;
    }
    valueEl.textContent = fmtPct(lane.accuracyPct);

    const pushes = Number(lane.pushes ?? 0);
    const settledGames = Number(accuracy.gradedGames ?? lane.gradedGames ?? 0);
    if (options.includePushes && pushes > 0) {
      const gradedGames = Number(lane.gradedGames ?? 0);
      noteEl.textContent = `${lane.correct}/${gradedGames} correct • ${pushes} push${pushes === 1 ? "" : "es"}`;
      return;
    }

    noteEl.textContent = `${lane.correct}/${lane.gradedGames} correct`;
  };

  formatLane(moneyline, accuracyMoneylineValueEl, accuracyMoneylineNoteEl);
  formatLane(runline, accuracyRunlineValueEl, accuracyRunlineNoteEl);
  formatLane(total, accuracyTotalValueEl, accuracyTotalNoteEl, { includePushes: true });

  if (accuracy.gradedGames > 0) {
    accuracyCopyEl.textContent = `${accuracy.gradedGames} settled game${accuracy.gradedGames === 1 ? "" : "s"} graded so far.`;
  }
}

async function loadBoard() {
  const response = await fetch(`${DATA_URL}?ts=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load board: ${response.status}`);

  const payload = await response.json();
  window.__boardMeta = payload.meta || {};
  allGames = payload.games || [];
  recentGames = payload.recentGames || [];

  generatedAtEl.textContent = payload.meta?.generatedAt
    ? `Updated ${new Date(payload.meta.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
    : "Updated just now";
  gameCountEl.textContent = `${payload.meta?.gameCount ?? allGames.length} games`;
  heroSubtitleEl.textContent = payload.meta?.refreshStartDate
    ? `Showing the live board for ${payload.meta.boardDate} plus tomorrow when available. Prior dates move into Recent Results.`
    : `Using the latest exported board for ${payload.meta?.boardTimezone || "the current board timezone"}.`;

  renderAccuracy(payload.accuracy);
  renderFeatured(payload.featured || []);
  renderGames();
  renderRecentGames();
}

bindFilters();
loadBoard().catch((error) => {
  console.error(error);
  featuredGrid.innerHTML = '<div class="empty-state">Failed to load featured picks.</div>';
  boardList.innerHTML = '<div class="empty-state">Failed to load the game board.</div>';
  if (recentResultsList) {
    recentResultsList.innerHTML = '<div class="empty-state">Failed to load recent results.</div>';
  }
});
