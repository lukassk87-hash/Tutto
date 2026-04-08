(function (app) {
  const { STORAGE_KEY, TARGET_SCORE, MIN_PLAYERS, MAX_PLAYERS, UNDO_LIMIT } = app.config;

app.state.createPlayers = function (count = 4) {
  return Array.from({ length: count }, (_, i) => ({
    name: `Spieler ${i + 1}`,
    score: 0,
    isComputer: false
  }));
};

  app.state.createDiceTurn = function () {
    return {
      dice: [1, 1, 1, 1, 1],
      held: [false, false, false, false, false],
      lockedFromPreviousRoll: [false, false, false, false, false],
      lastRollIndices: [],
      turnPoints: 0,
      hasRolled: false,
      canBank: false,
      hotDice: false,
      showFarkleModal: false,
      invalidHoldMessage: '',
      activeCardKey: null,
      pendingCardKey: null,
      showCardModal: false,
      cardsEnabledThisRound: true,
      hotDiceCompletedOnce: false,
      straightMode: false,
      straightTarget: null,
      straightLockedValues: [],
      cloverArmed: false,
      cloverAwaitingFinalSuccess: false,
      cloverStarterPlayerIndex: null,
      fireworkProtected: false,
      skipResolved: false,
      awaitingCardConfirmation: false,
      cardOfferPending: false,
      showContinueRoundModal: false
    };
  };

  app.state.isStorageAvailable = function () {
    try {
      const key = '__punkteblock_test__';
      window.localStorage.setItem(key, '1');
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  };

  app.state.createInitialState = function () {
    return {
      phase: 'setup',
      currentIndex: 0,
      winnerIndex: null,
      targetScore: TARGET_SCORE,
      scoreboardOpen: false,
      diceMode: true,
      cardsInPointMode: false,
      players: app.state.createPlayers(4),
      undoStack: [],
      effects: { scorePopup: null, confetti: [], confettiTimeout: false },
      diceTurn: app.state.createDiceTurn(),
      storageAvailable: app.state.isStorageAvailable()
    };
  };

  app.state.loadState = function () {
    const initial = app.state.createInitialState();
    if (!initial.storageAvailable) return initial;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initial;

    try {
      const parsed = JSON.parse(saved);
      if (!parsed || !Array.isArray(parsed.players) || parsed.players.length < MIN_PLAYERS) {
        return initial;
      }

      if (!Array.isArray(parsed.undoStack)) {
        parsed.undoStack = [];
      }

      if (!parsed.diceTurn) {
        parsed.diceTurn = app.state.createDiceTurn();
      }

      parsed.diceTurn.showFarkleModal = false;
      parsed.diceTurn.showCardModal = false;
      parsed.diceTurn.showContinueRoundModal = false;
      parsed.diceTurn.awaitingCardConfirmation = false;
      parsed.diceTurn.cardOfferPending = false;
      parsed.diceTurn.invalidHoldMessage = '';
      parsed.diceTurn.pendingCardKey = null;
      parsed.diceTurn.cardsEnabledThisRound = true;

      if (typeof parsed.diceTurn.cloverArmed !== 'boolean') {
        parsed.diceTurn.cloverArmed = false;
      }

      if (typeof parsed.diceTurn.cloverAwaitingFinalSuccess !== 'boolean') {
        parsed.diceTurn.cloverAwaitingFinalSuccess = false;
      }

      if (
        parsed.diceTurn.cloverStarterPlayerIndex !== null &&
        typeof parsed.diceTurn.cloverStarterPlayerIndex !== 'number'
      ) {
        parsed.diceTurn.cloverStarterPlayerIndex = null;
      }

      parsed.effects = {
        scorePopup: null,
        confetti: [],
        confettiTimeout: false
      };

      parsed.storageAvailable = true;

      return parsed;
    } catch {
      return initial;
    }
  };

  app.state.saveState = function (state) {
    if (!state.storageAvailable) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  app.state.cloneStateWithoutUndo = function (source) {
    return {
      phase: source.phase,
      currentIndex: source.currentIndex,
      winnerIndex: source.winnerIndex,
      targetScore: source.targetScore,
      scoreboardOpen: source.scoreboardOpen,
      diceMode: source.diceMode,
      cardsInPointMode: source.cardsInPointMode,
      players: source.players.map((player) => ({
        name: player.name,
        score: player.score
      })),
      diceTurn: JSON.parse(JSON.stringify(source.diceTurn))
    };
  };

  app.state.pushUndoState = function (state) {
    state.undoStack.push(app.state.cloneStateWithoutUndo(state));
    if (state.undoStack.length > UNDO_LIMIT) {
      state.undoStack.shift();
    }
  };

  app.state.restoreUndoState = function (state) {
    if (!state.undoStack.length) return;

    const previous = state.undoStack.pop();
    state.phase = previous.phase;
    state.currentIndex = previous.currentIndex;
    state.winnerIndex = previous.winnerIndex;
    state.targetScore = previous.targetScore;
    state.scoreboardOpen = previous.scoreboardOpen;
    state.diceMode = previous.diceMode;
    state.cardsInPointMode = previous.cardsInPointMode;
    state.players = previous.players.map((player) => ({ ...player }));
    state.diceTurn = JSON.parse(JSON.stringify(previous.diceTurn));
  };

  app.state.setPlayerCount = function (state, count) {
    const safeCount = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Number(count) || 4));
    const current = state.players.map((player) => ({ name: player.name || '', score: 0 }));

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
  };

  app.state.setPlayerName = function (state, index, value) {
    state.players[index].name = value.trim() || `Spieler ${index + 1}`;
  };

  app.state.movePlayer = function (state, index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.players.length) return;
    [state.players[index], state.players[newIndex]] = [state.players[newIndex], state.players[index]];
  };
})(window.Punkteblock);