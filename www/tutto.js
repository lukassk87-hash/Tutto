const STORAGE_KEY = "punkteblock_hellblau_v5";
const TARGET_SCORE = 6000;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
const UNDO_LIMIT = 30;

const QUICK_POINTS = Array.from({ length: 41 }, (_, i) => i * 50);
const CONFETTI_EMOJIS = ["🎉", "🎊", "✨", "💛 ", "🎲", "♦️", "⭐"];

let popupTimer = null;
let confettiTimer = null;

const effects = {
  scorePopup: null,
  confetti: []
};

function scrollToTopInstant() {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "instant"
  });
}

function runGameAction(action) {
  action();
  scrollToTopInstant();
}

function createPlayers(count = 4) {
  return Array.from({ length: count }, (_, i) => ({
    name: `Spieler ${i + 1}`,
    score: 0
  }));
}

function createInitialState() {
  return {
    phase: "setup",
    currentIndex: 0,
    winnerIndex: null,
    targetScore: TARGET_SCORE,
    scoreboardOpen: false,
    players: createPlayers(4),
    undoStack: []
  };
}

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(saved);

    if (!parsed || !Array.isArray(parsed.players) || parsed.players.length < 2) {
      return createInitialState();
    }

    if (!Array.isArray(parsed.undoStack)) {
      parsed.undoStack = [];
    }

    if (typeof parsed.scoreboardOpen !== "boolean") {
      parsed.scoreboardOpen = false;
    }

    return parsed;
  } catch {
    return createInitialState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearEffects() {
  clearTimeout(popupTimer);
  clearTimeout(confettiTimer);
  effects.scorePopup = null;
  effects.confetti = [];
}

function cloneStateWithoutUndo(source) {
  return {
    phase: source.phase,
    currentIndex: source.currentIndex,
    winnerIndex: source.winnerIndex,
    targetScore: source.targetScore,
    scoreboardOpen: source.scoreboardOpen,
    players: source.players.map((player) => ({
      name: player.name,
      score: player.score
    }))
  };
}

function pushUndoState() {
  state.undoStack.push(cloneStateWithoutUndo(state));
  if (state.undoStack.length > UNDO_LIMIT) {
    state.undoStack.shift();
  }
}

function undoLastAction() {
  if (!state.undoStack.length) return;

  clearEffects();

  const previous = state.undoStack.pop();
  state.phase = previous.phase;
  state.currentIndex = previous.currentIndex;
  state.winnerIndex = previous.winnerIndex;
  state.targetScore = previous.targetScore;
  state.scoreboardOpen = previous.scoreboardOpen;
  state.players = previous.players.map((player) => ({ ...player }));

  saveState();
  render();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setPlayerCount(count) {
  const safeCount = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Number(count) || 4));
  const current = state.players.map((player) => ({
    name: player.name || "",
    score: 0
  }));

  if (safeCount > current.length) {
    for (let i = current.length; i < safeCount; i++) {
      current.push({ name: `Spieler ${i + 1}`, score: 0 });
    }
  }

  state.players = current.slice(0, safeCount).map((player, index) => ({
    name: player.name || `Spieler ${index + 1}`,
    score: 0
  }));

  state.undoStack = [];
  saveState();
  render();
}

function setPlayerName(index, value) {
  state.players[index].name = value.trim() || `Spieler ${index + 1}`;
  saveState();
}

function movePlayer(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= state.players.length) return;

  [state.players[index], state.players[newIndex]] = [state.players[newIndex], state.players[index]];
  saveState();
  render();
}

function startGame() {
  clearEffects();

  state.players = state.players.map((player, index) => ({
    name: (player.name || `Spieler ${index + 1}`).trim() || `Spieler ${index + 1}`,
    score: 0
  }));
  state.phase = "playing";
  state.currentIndex = 0;
  state.winnerIndex = null;
  state.undoStack = [];
  saveState();
  render();
}

function backToSetup() {
  clearEffects();

  state.phase = "setup";
  state.currentIndex = 0;
  state.winnerIndex = null;
  state.players = state.players.map((player, index) => ({
    name: player.name || `Spieler ${index + 1}`,
    score: 0
  }));
  state.undoStack = [];
  saveState();
  render();
}

function resetAllCompletely() {
  clearEffects();
  state = createInitialState();
  saveState();
  render();
}

function newGameSamePlayers() {
  clearEffects();

  state.phase = "playing";
  state.currentIndex = 0;
  state.winnerIndex = null;
  state.players = state.players.map((player) => ({
    name: player.name,
    score: 0
  }));
  state.undoStack = [];
  saveState();
  render();
}

function normalizePoints(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num / 50) * 50;
}

function nextPlayer() {
  state.currentIndex = (state.currentIndex + 1) % state.players.length;
}

function finishGame(winnerIndex) {
  state.phase = "finished";
  state.winnerIndex = winnerIndex;
  saveState();
  render();
}

function createConfettiPieces(count = 99) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${Date.now()}-${index}`,
    emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.25}s`,
    duration: `${0.9 + Math.random() * 0.7}s`,
    size: `${18 + Math.random() * 16}px`
  }));
}

function triggerVisualEffects(playerIndex, pointsAdded) {
  clearTimeout(popupTimer);
  clearTimeout(confettiTimer);

  if (pointsAdded > 0) {
    effects.scorePopup = {
      name: state.players[playerIndex].name,
      total: state.players[playerIndex].score
    };

    popupTimer = setTimeout(() => {
      effects.scorePopup = null;
      render();
    }, 1000);
  } else {
    effects.scorePopup = null;
  }

  if (pointsAdded > 500) {
    effects.confetti = createConfettiPieces();

    confettiTimer = setTimeout(() => {
      effects.confetti = [];
      render();
    }, 1000);
  } else {
    effects.confetti = [];
  }
}

function addPoints(amount) {
  if (state.phase !== "playing") return;

  pushUndoState();

  const points = normalizePoints(amount);
  const activeIndex = state.currentIndex;
  const active = state.players[activeIndex];

  active.score += points;
  triggerVisualEffects(activeIndex, points);

  if (active.score >= state.targetScore) {
    active.score = Math.max(active.score, state.targetScore);
    finishGame(activeIndex);
    return;
  }

  nextPlayer();
  saveState();
  render();
}

function directWin() {
  if (state.phase !== "playing") return;

  pushUndoState();
  clearEffects();

  state.players[state.currentIndex].score = state.targetScore;
  finishGame(state.currentIndex);
}

function transferFromLeader() {
  if (state.phase !== "playing") return;

  pushUndoState();

  const activeIndex = state.currentIndex;
  const active = state.players[activeIndex];

  const maxScore = Math.max(...state.players.map((player) => player.score));
  const activeIsLeader = active.score === maxScore;

  if (!activeIsLeader) {
    const leaders = state.players
      .map((player, index) => ({ ...player, index }))
      .filter(
        (player) =>
          player.index !== activeIndex &&
          player.score === maxScore &&
          player.score >= 1000
      );

    leaders.forEach((leader) => {
      state.players[leader.index].score -= 1000;
    });
  }

  active.score += 1000;
  triggerVisualEffects(activeIndex, 1000);

  if (active.score >= state.targetScore) {
    active.score = Math.max(active.score, state.targetScore);
    finishGame(activeIndex);
    return;
  }

  nextPlayer();
  saveState();
  render();
}

function renderEffects() {
  const popupHtml = effects.scorePopup
    ? `
      <div class="effect-layer">
        <div class="score-popup">
          <div class="score-popup-name">${escapeHtml(effects.scorePopup.name)}</div>
          <div class="score-popup-total">${effects.scorePopup.total}</div>
        </div>
      </div>
    `
    : "";

  const confettiHtml = effects.confetti.length
    ? `
      <div class="effect-layer">
        ${effects.confetti.map((piece) => `
          <span
            class="confetti"
            style="--left:${piece.left}; --delay:${piece.delay}; --duration:${piece.duration}; --size:${piece.size};"
          >${piece.emoji}</span>
        `).join("")}
      </div>
    `
    : "";

  return popupHtml + confettiHtml;
}

function renderSetup() {
  const playerRows = state.players.map((player, index) => `
    <div class="player-row">
      <input
        type="text"
        value="${escapeHtml(player.name)}"
        data-name-index="${index}"
        placeholder="Name Spieler ${index + 1}"
      />
      <div class="row-actions">
        <button class="btn-muted" data-move-up="${index}" ${index === 0 ? "disabled" : ""}>↑</button>
        <button class="btn-muted" data-move-down="${index}" ${index === state.players.length - 1 ? "disabled" : ""}>↓</button>
      </div>
    </div>
  `).join("");

  return `
    <div class="shell">
      <div class="card">
        <h1 class="title">Punkteblock</h1>
        <p class="subtitle">Spielerzahl wählen, Namen eintragen und Reihenfolge vor dem Start festlegen.</p>

        <div class="setup-grid">
          <div class="field">
            <label for="playerCount">Spielerzahl</label>
            <select id="playerCount">
              ${Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => {
                const value = i + MIN_PLAYERS;
                return `<option value="${value}" ${value === state.players.length ? "selected" : ""}>${value}</option>`;
              }).join("")}
            </select>
          </div>

          <div class="field">
            <label>Reihenfolge</label>
            <div class="player-list">${playerRows}</div>
          </div>

          <button class="btn-primary" id="startGame">Spiel starten</button>
        </div>
      </div>
    </div>
  `;
}

function renderPointsButtons() {
  return QUICK_POINTS.map((points) => `
    <button class="${points === 0 ? "zero-btn" : "points-btn"}" data-add="${points}">
      ${points === 0 ? "0" : "+" + points}
    </button>
  `).join("");
}

function renderScoreboard() {
  const rows = state.players.map((player, index) => `
    <div class="score-row ${index === state.currentIndex ? "is-active" : ""}">
      <div class="score-row-left">
        <span class="score-order">${index + 1}</span>
        <span class="score-name">${escapeHtml(player.name)}</span>
      </div>
      <span class="score-points">${player.score}</span>
    </div>
  `).join("");

  return `
    <details class="scoreboard" id="scoreboardDetails" ${state.scoreboardOpen ? "open" : ""}>
      <summary>Punkteübersicht</summary>
      <div class="scoreboard-body">
        ${rows}
      </div>
    </details>
  `;
}

function renderGame() {
  const active = state.players[state.currentIndex];

  return `
    <div class="shell">
      <div class="card">
        ${renderEffects()}

        <div class="topline">
          <span class="pill">Ziel: ${state.targetScore} Punkte</span>
          <span class="pill">Spieler ${state.currentIndex + 1} von ${state.players.length}</span>
        </div>

        ${renderScoreboard()}

        <div class="active-area">
          <div class="turn-label">Aktiver Spieler</div>
          <div class="active-name">${escapeHtml(active.name)}</div>
          <div class="active-score">${active.score}</div>
        </div>

        <div class="points-grid">
          ${renderPointsButtons()}
        </div>

        <div class="custom-row">
          <input id="customPoints" type="number" min="0" step="50" value="50" />
          <button class="btn-secondary" id="customAdd">Punkte hinzufügen</button>
        </div>

        <div class="action-row">
          <button class="btn-transfer" id="transferLeader">+1000 / Führendem -1000</button>
          <button class="btn-undo" id="undoAction" ${state.undoStack.length ? "" : "disabled"}>Rückgängig</button>
          <button class="btn-win" id="directWin">Direktgewinn</button>
        </div>

        <p class="note">
        </p>

        <div class="footer-actions">
          <div></div>
          <div class="footer-actions-right">
            <button class="btn-warning" id="backSetup">Zurück zur Startmaske</button>
            <button class="btn-danger" id="resetAll">Alles zurücksetzen</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFinished() {
  const winner = state.players[state.winnerIndex];
  const ranking = [...state.players]
    .sort((a, b) => b.score - a.score)
    .map((player, index) => `
      <div class="rank-row">
        <span class="rank-name">${index + 1}. ${escapeHtml(player.name)}</span>
        <span class="rank-score">${player.score}</span>
      </div>
    `)
    .join("");

  return `
    <div class="shell">
      <div class="card">
        <div class="winner-box">
          <p class="muted">Spiel beendet</p>
          <div class="winner-name">${escapeHtml(winner.name)}</div>
          <p>${winner.score} Punkte erreicht.</p>
        </div>

        <div class="ranking">${ranking}</div>

        <div class="footer-actions" style="margin-top: 20px;">
          <button class="btn-primary" id="samePlayers">Nochmal mit gleichen Spielern</button>
          <button class="btn-warning" id="finishedSetup">Zur Startmaske</button>
        </div>
      </div>
    </div>
  `;
}

function render() {
  const app = document.getElementById("app");

  if (state.phase === "setup") {
    app.innerHTML = renderSetup();
    bindSetupEvents();
    return;
  }

  if (state.phase === "playing") {
    app.innerHTML = renderGame();
    bindGameEvents();
    return;
  }

  app.innerHTML = renderFinished();
  bindFinishedEvents();
}

function bindSetupEvents() {
  document.getElementById("playerCount").addEventListener("change", (event) => {
    setPlayerCount(event.target.value);
  });

  document.querySelectorAll("[data-name-index]").forEach((input) => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.nameIndex);
      setPlayerName(index, input.value);
    });
  });

  document.querySelectorAll("[data-move-up]").forEach((button) => {
    button.addEventListener("click", () => {
      movePlayer(Number(button.dataset.moveUp), -1);
    });
  });

  document.querySelectorAll("[data-move-down]").forEach((button) => {
    button.addEventListener("click", () => {
      movePlayer(Number(button.dataset.moveDown), 1);
    });
  });

  document.getElementById("startGame").addEventListener("click", startGame);
}

function bindGameEvents() {
  document.getElementById("scoreboardDetails").addEventListener("toggle", (event) => {
    state.scoreboardOpen = event.currentTarget.open;
    saveState();
  });

  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      runGameAction(() => addPoints(Number(button.dataset.add)));
    });
  });

  document.getElementById("customAdd").addEventListener("click", () => {
    const input = document.getElementById("customPoints");
    runGameAction(() => addPoints(input.value));
    input.value = 50;
  });

  document.getElementById("customPoints").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      runGameAction(() => addPoints(event.target.value));
      event.target.value = 50;
    }
  });

  document.getElementById("transferLeader").addEventListener("click", () => {
    runGameAction(transferFromLeader);
  });

  document.getElementById("undoAction").addEventListener("click", () => {
    runGameAction(undoLastAction);
  });

  document.getElementById("directWin").addEventListener("click", () => {
    runGameAction(directWin);
  });

  document.getElementById("backSetup").addEventListener("click", () => {
    runGameAction(backToSetup);
  });

  document.getElementById("resetAll").addEventListener("click", () => {
    runGameAction(resetAllCompletely);
  });
}

function bindFinishedEvents() {
  document.getElementById("samePlayers").addEventListener("click", newGameSamePlayers);
  document.getElementById("finishedSetup").addEventListener("click", backToSetup);
}

render();