(function (app) {
  app.actions.cardsEnabledForCurrentMode = function (state) {
    return state.diceMode || state.cardsInPointMode;
  };

  app.actions.clearEffects = function (state) {
    state.effects.scorePopup = null;
    state.effects.confetti = [];
    state.effects.confettiTimeout = false;
    state.diceTurn.confettiShown = false;
  };

  app.actions.createConfettiPieces = function (count = 60) {
    return Array.from({ length: count }, (_, index) => ({
      id: `${Date.now()}-${index}`,
      emoji:
        app.config.CONFETTI_EMOJIS[
          Math.floor(Math.random() * app.config.CONFETTI_EMOJIS.length)
        ],
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 0.25}s`,
      duration: `${0.9 + Math.random() * 0.7}s`,
      size: `${18 + Math.random() * 16}px`
    }));
  };

  app.actions.triggerVisualEffects = function (state, playerIndex, pointsAdded) {
    state.effects.scorePopup =
      pointsAdded > 0
        ? { name: state.players[playerIndex].name, total: state.players[playerIndex].score }
        : null;

    state.effects.confetti =
      pointsAdded > 500 ? app.actions.createConfettiPieces() : [];

    if (pointsAdded > 500) {
      setTimeout(() => {
        if (state.effects.confetti && state.effects.confetti.length) {
          state.effects.confetti = [];
        }
      }, 1200);
    }
  };

  app.actions.drawRandomCardKey = function () {
    const deck = [];
    app.config.CARD_DEFS.forEach((card) => {
      for (let i = 0; i < card.count; i++) {
        deck.push(card.key);
      }
    });
    return deck[Math.floor(Math.random() * deck.length)];
  };

  app.actions.drawCardForRound = function (state) {
    state.diceTurn.pendingCardKey = app.actions.drawRandomCardKey();
    state.diceTurn.showCardModal = true;
    state.diceTurn.cardOfferPending = true;
    state.diceTurn.awaitingCardConfirmation = true;
  };

  app.actions.resetDiceTurn = function (state, keepClover = true) {
    const cloverArmed = keepClover ? state.diceTurn.cloverArmed : false;
    const cloverAwaitingFinalSuccess = keepClover
      ? state.diceTurn.cloverAwaitingFinalSuccess
      : false;
    const cloverStarterPlayerIndex = keepClover
      ? state.diceTurn.cloverStarterPlayerIndex
      : null;

    state.diceTurn = {
      ...app.state.createDiceTurn(),
      cloverArmed,
      cloverAwaitingFinalSuccess,
      cloverStarterPlayerIndex
    };

    state.diceTurn.lastRollIndices = [];

    if (cloverAwaitingFinalSuccess) {
      state.diceTurn.activeCardKey = 'clover';
      state.diceTurn.cloverArmed = true;
      state.diceTurn.cardOfferPending = false;
      state.diceTurn.awaitingCardConfirmation = false;
      state.diceTurn.showCardModal = false;
      return;
    }

    if (app.actions.cardsEnabledForCurrentMode(state)) {
      app.actions.drawCardForRound(state);
    }
  };

  app.actions.nextPlayer = function (state) {
    state.currentIndex = (state.currentIndex + 1) % state.players.length;
  };

  app.actions.finishGame = function (state, winnerIndex) {
    state.phase = 'finished';
    state.winnerIndex = winnerIndex;
    state.diceTurn.showCardModal = false;
    state.diceTurn.showContinueRoundModal = false;
    state.diceTurn.showFarkleModal = false;
  };

  app.actions.endTurnAndPrepareNext = function (state) {
    app.actions.nextPlayer(state);
    app.actions.resetDiceTurn(state, true);
  };

  app.actions.startGame = function (state) {
    app.actions.clearEffects(state);
    state.players = state.players.map((player, index) => ({
      name: (player.name || `Spieler ${index + 1}`).trim() || `Spieler ${index + 1}`,
      score: 0,
      isComputer: !!player.isComputer
    }));
    state.phase = 'playing';
    state.currentIndex = 0;
    state.winnerIndex = null;
    state.undoStack = [];
    state.diceTurn = app.state.createDiceTurn();

    if (app.actions.cardsEnabledForCurrentMode(state)) {
      app.actions.drawCardForRound(state);
    }
  };

  app.actions.backToSetup = function (state) {
    app.actions.clearEffects(state);
    state.phase = 'setup';
    state.currentIndex = 0;
    state.winnerIndex = null;
    state.players = state.players.map((player, index) => ({
      name: player.name || `Spieler ${index + 1}`,
      score: 0
    }));
    state.undoStack = [];
    state.diceTurn = app.state.createDiceTurn();
  };

  app.actions.newGameSamePlayers = function (state) {
    app.actions.clearEffects(state);
    state.phase = 'playing';
    state.currentIndex = 0;
    state.winnerIndex = null;
    state.players = state.players.map((player) => ({
      name: player.name,
      score: 0,
      isComputer: !!player.isComputer
    }));
    state.undoStack = [];
    state.diceTurn = app.state.createDiceTurn();

    if (app.actions.cardsEnabledForCurrentMode(state)) {
      app.actions.drawCardForRound(state);
    }
  };

  app.actions.addPoints = function (state, amount) {
    if (
      state.phase !== 'playing' ||
      state.diceMode ||
      state.diceTurn.cardOfferPending ||
      state.diceTurn.showContinueRoundModal
    ) {
      return;
    }

    app.state.pushUndoState(state);
    const points = app.utils.normalizePoints(amount);
    const activeIndex = state.currentIndex;

    state.players[activeIndex].score += points;
    app.actions.triggerVisualEffects(state, activeIndex, points);

    if (state.players[activeIndex].score >= state.targetScore) {
      state.players[activeIndex].score = Math.max(
        state.players[activeIndex].score,
        state.targetScore
      );
      app.actions.finishGame(state, activeIndex);
      return;
    }

    app.actions.endTurnAndPrepareNext(state);
  };

  app.actions.directWin = function (state) {
    if (state.phase !== 'playing') return;

    app.state.pushUndoState(state);
    app.actions.clearEffects(state);
    state.players[state.currentIndex].score = state.targetScore;
    app.actions.finishGame(state, state.currentIndex);
  };

  app.actions.applyPlusMinusEffect = function (state) {
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
    app.actions.triggerVisualEffects(state, activeIndex, 1000);

    if (active.score >= state.targetScore) {
      active.score = Math.max(active.score, state.targetScore);
      app.actions.finishGame(state, activeIndex);
      return true;
    }

    return false;
  };

  app.actions.transferFromLeader = function (state) {
    if (state.phase !== 'playing') return;

    app.state.pushUndoState(state);
    const finished = app.actions.applyPlusMinusEffect(state);
    if (!finished) app.actions.endTurnAndPrepareNext(state);
  };

  app.actions.getActiveCard = function (state) {
    return app.config.CARD_LOOKUP[state.diceTurn.activeCardKey] || null;
  };

  app.actions.getPendingCard = function (state) {
    return app.config.CARD_LOOKUP[state.diceTurn.pendingCardKey] || null;
  };

  app.actions.confirmCurrentCard = function (state) {
    const key = state.diceTurn.pendingCardKey;
    state.diceTurn.activeCardKey = key;
    state.diceTurn.pendingCardKey = null;
    state.diceTurn.showCardModal = false;
    state.diceTurn.cardOfferPending = false;
    state.diceTurn.awaitingCardConfirmation = false;
    state.diceTurn.invalidHoldMessage = '';
    state.diceTurn.showContinueRoundModal = false;

    if (key === 'straight') {
      state.diceTurn.straightMode = true;
      state.diceTurn.straightTarget = null;
      state.diceTurn.straightLockedValues = [];
    }

    if (key === 'clover') {
      state.diceTurn.cloverArmed = true;
    }

    if (key === 'skip') {
      state.diceTurn.skipResolved = true;
      app.actions.endTurnAndPrepareNext(state);
    }
  };

  app.actions.declineHotDiceNewCard = function (state) {
    state.diceTurn.pendingCardKey = null;
    state.diceTurn.showCardModal = false;
    state.diceTurn.cardOfferPending = false;
    state.diceTurn.awaitingCardConfirmation = false;
    state.diceTurn.showContinueRoundModal = true;
  };

  app.actions.offerContinueRoundDecision = function (state) {
    state.diceTurn.showContinueRoundModal = true;
  };

  app.actions.continueRoundWithNewCard = function (state) {
    state.diceTurn.showContinueRoundModal = false;
    state.diceTurn.hotDiceCompletedOnce = false;
    state.diceTurn.hasRolled = false;
    state.diceTurn.lastRollIndices = [];
    state.diceTurn.held = [false, false, false, false, false];
    state.diceTurn.lockedFromPreviousRoll = [false, false, false, false, false];
    state.diceTurn.invalidHoldMessage = '';
    app.actions.drawCardForRound(state);
  };

  app.actions.bankRoundPointsAndEndTurn = function (state) {
    state.diceTurn.showContinueRoundModal = false;

    const total = state.diceTurn.turnPoints;
    if (total > 0) {
      app.state.pushUndoState(state);
      state.players[state.currentIndex].score += total;
      app.actions.triggerVisualEffects(state, state.currentIndex, total);

      if (state.players[state.currentIndex].score >= state.targetScore) {
        state.players[state.currentIndex].score = Math.max(
          state.players[state.currentIndex].score,
          state.targetScore
        );
        app.actions.finishGame(state, state.currentIndex);
        return;
      }
    }

    app.actions.endTurnAndPrepareNext(state);
  };

  app.actions.getExtraBonusValueFromCard = function (key) {
    switch (key) {
      case 'bonus200': return 200;
      case 'bonus300': return 300;
      case 'bonus400': return 400;
      case 'bonus500': return 500;
      case 'bonus600': return 600;
      default: return 0;
    }
  };

  app.actions.getBankableDiceTurnTotal = function (state) {
    let total = state.diceTurn.turnPoints || 0;

    if (state.diceTurn.straightMode) {
      return total;
    }

    if (!state.diceTurn.hasRolled) {
      return total;
    }

    const heldIndices = app.rules.getHeldThisRollIndices(state);
    if (!heldIndices.length) {
      return total;
    }

    const check = app.rules.isHeldSelectionValidForCurrentRoll(state);
    if (!check.valid) {
      return null;
    }

    total += check.score;

    const wouldLockAllDice = state.diceTurn.lockedFromPreviousRoll.map(
      (locked, index) => locked || heldIndices.includes(index)
    );

    const allFiveConverted = wouldLockAllDice.every(Boolean);

    if (allFiveConverted) {
      const key = state.diceTurn.activeCardKey;
      let bonus = app.actions.getExtraBonusValueFromCard(key);

      if (key === 'double') {
        bonus = total;
      }

      if (bonus > 0) {
        total += bonus;
      }
    }

    return total;
  };

  app.actions.handleAllDiceScoredBonus = function (state) {
    const key = state.diceTurn.activeCardKey;

    if (key === 'plusminus') {
      state.diceTurn.turnPoints = 0;
      const finished = app.actions.applyPlusMinusEffect(state);
      if (!finished) {
        app.actions.endTurnAndPrepareNext(state);
      }
      return;
    }

    let bonus = app.actions.getExtraBonusValueFromCard(key);
    if (key === 'double') bonus = state.diceTurn.turnPoints;
    if (bonus > 0) state.diceTurn.turnPoints += bonus;

    if (key === 'clover') {
      if (state.diceTurn.cloverAwaitingFinalSuccess) {
        state.players[state.currentIndex].score = state.targetScore;
        app.actions.finishGame(state, state.currentIndex);
        return;
      }

      state.diceTurn.cloverAwaitingFinalSuccess = true;
      state.diceTurn.cloverStarterPlayerIndex = state.currentIndex;
      state.diceTurn.hotDiceCompletedOnce = true;
      state.diceTurn.cardOfferPending = false;
      state.diceTurn.pendingCardKey = null;
      state.diceTurn.showCardModal = false;
      state.diceTurn.awaitingCardConfirmation = false;
      state.diceTurn.showContinueRoundModal = false;
      state.diceTurn.hasRolled = false;
      state.diceTurn.lastRollIndices = [];
      state.diceTurn.invalidHoldMessage = '';

      app.actions.prepareFreshFiveDiceAfterHotDice(state);
      return;
    }

    if (key === 'firework') {
      state.diceTurn.hotDiceCompletedOnce = true;
      state.diceTurn.cardOfferPending = false;
      state.diceTurn.pendingCardKey = null;
      state.diceTurn.showCardModal = false;
      state.diceTurn.awaitingCardConfirmation = false;
      state.diceTurn.showContinueRoundModal = false;
      state.diceTurn.hasRolled = false;
      state.diceTurn.lastRollIndices = [];
      state.diceTurn.invalidHoldMessage = '';

      app.actions.prepareFreshFiveDiceAfterHotDice(state);
      return;
    }

    state.diceTurn.hotDiceCompletedOnce = true;
    state.diceTurn.cardOfferPending = false;
    state.diceTurn.pendingCardKey = null;
    state.diceTurn.showCardModal = false;
    state.diceTurn.awaitingCardConfirmation = false;
    state.diceTurn.showContinueRoundModal = true;
  };

  app.actions.handleCloverFailureIfNeeded = function (state) {
    if (!state.diceTurn.cloverArmed) return;

    state.diceTurn.cloverAwaitingFinalSuccess = false;
    state.diceTurn.cloverStarterPlayerIndex = null;
  };

  app.actions.toggleDieHold = function (state, index) {
    if (state.phase !== 'playing' || !state.diceMode) return;
    if (
      !state.diceTurn.hasRolled ||
      state.diceTurn.showFarkleModal ||
      state.diceTurn.showCardModal ||
      state.diceTurn.showContinueRoundModal
    ) {
      return;
    }
    if (!state.diceTurn.lastRollIndices.includes(index)) return;
    if (state.diceTurn.lockedFromPreviousRoll[index]) return;

    state.diceTurn.held[index] = !state.diceTurn.held[index];
    state.diceTurn.invalidHoldMessage = '';
  };

  app.actions.lockHeldDiceAndAddPoints = function (state, score) {
    app.rules.getHeldThisRollIndices(state).forEach((index) => {
      state.diceTurn.lockedFromPreviousRoll[index] = true;
    });

    state.diceTurn.turnPoints += score;
    state.diceTurn.canBank = state.diceTurn.turnPoints > 0;
    state.diceTurn.lastRollIndices = [];
    state.diceTurn.hasRolled = false;
    state.diceTurn.invalidHoldMessage = '';

    if (state.diceTurn.lockedFromPreviousRoll.every(Boolean)) {
      state.diceTurn.held = [false, false, false, false, false];
      state.diceTurn.lockedFromPreviousRoll = [true, true, true, true, true];
      state.diceTurn.hotDice = true;
    } else {
      state.diceTurn.hotDice = false;
    }
  };

  app.actions.lockStraightDice = function (state) {
    const heldIndices = app.rules.getHeldThisRollIndices(state);
    const heldValues = heldIndices.map((index) => state.diceTurn.dice[index]);
    const validation = app.rules.validateStraightHold(state);

    if (!validation.valid) {
      state.diceTurn.invalidHoldMessage = validation.message;
      return 'invalid';
    }

    state.diceTurn.straightTarget = validation.target;

    heldIndices.forEach((index) => {
      state.diceTurn.lockedFromPreviousRoll[index] = true;
    });

    heldValues.forEach((value) => {
      if (!state.diceTurn.straightLockedValues.includes(value)) {
        state.diceTurn.straightLockedValues.push(value);
      }
    });

    state.diceTurn.lastRollIndices = [];
    state.diceTurn.hasRolled = false;
    state.diceTurn.invalidHoldMessage = '';

    if (
      state.diceTurn.straightLockedValues.length === 5 &&
      app.rules.isFullStraight(state.diceTurn.straightLockedValues)
    ) {
      state.diceTurn.turnPoints = 2000;
      state.diceTurn.canBank = true;
      state.diceTurn.hotDice = false;
      return 'done';
    }

    return 'continue';
  };

  app.actions.prepareFreshFiveDiceAfterHotDice = function (state) {
    state.diceTurn.held = [false, false, false, false, false];
    state.diceTurn.lockedFromPreviousRoll = [false, false, false, false, false];
    state.diceTurn.lastRollIndices = [];
    state.diceTurn.hasRolled = false;
  };

  app.actions.getStraightUsefulDiceIndices = function (state) {
    const rolledIndices = state.diceTurn.lastRollIndices.filter(
      (index) => !state.diceTurn.lockedFromPreviousRoll[index]
    );

    const lockedValues = [...state.diceTurn.straightLockedValues];
    const currentRollValues = state.diceTurn.lastRollIndices.map((i) => state.diceTurn.dice[i]);

    const currentTarget = state.diceTurn.straightTarget
      ? [...state.diceTurn.straightTarget]
      : app.rules.determineStraightTarget(
          lockedValues.length ? lockedValues : currentRollValues
        );

    if (!currentTarget) return [];

    const missingValues = currentTarget.filter(
      (value) => !lockedValues.includes(value)
    );

    return rolledIndices.filter((index) =>
      missingValues.includes(state.diceTurn.dice[index])
    );
  };

  app.actions.canStillReachStraightFromCurrentDice = function (state) {
    const rolledIndices = state.diceTurn.lastRollIndices.filter(
      (index) => !state.diceTurn.lockedFromPreviousRoll[index]
    );

    const lockedValues = [...state.diceTurn.straightLockedValues];
    const targets = [];

    if (!lockedValues.length) {
      targets.push([1, 2, 3, 4, 5]);
      targets.push([2, 3, 4, 5, 6]);
    } else {
      const target =
        state.diceTurn.straightTarget ||
        app.rules.determineStraightTarget(lockedValues);
      if (target) targets.push(target);
    }

    return targets.some((target) => {
      const missingValues = target.filter(
        (value) => !lockedValues.includes(value)
      );
      if (!missingValues.length) return true;
      return rolledIndices.some((index) =>
        missingValues.includes(state.diceTurn.dice[index])
      );
    });
  };

  app.actions.rollStraightTurn = function (state) {
    if (state.diceTurn.hasRolled) {
      const check = app.rules.validateStraightHold(state);
      if (!check.valid) {
        state.diceTurn.invalidHoldMessage = check.message;
        return;
      }

      app.state.pushUndoState(state);
      const result = app.actions.lockStraightDice(state);

      if (result === 'invalid') {
        return;
      }

      if (result === 'done') {
        state.diceTurn.canBank = true;
        state.diceTurn.hotDiceCompletedOnce = true;
        state.diceTurn.showContinueRoundModal = true;
        return;
      }
    } else {
      app.state.pushUndoState(state);
    }

    const free = state.diceTurn.held
      .map((held, index) => (!held ? index : -1))
      .filter((index) => index !== -1);

    if (!free.length) {
      state.diceTurn.invalidHoldMessage = 'Keine Würfel mehr zum Würfeln.';
      return;
    }

    free.forEach((index) => {
      state.diceTurn.dice[index] = app.utils.rollDie();
      state.diceTurn.held[index] = false;
    });

    state.diceTurn.lastRollIndices = [...free];
    state.diceTurn.hasRolled = true;
    state.diceTurn.invalidHoldMessage = '';

    if (
      app.rules.isFullStraight(state.diceTurn.straightLockedValues) ||
      app.actions.canStillReachStraightFromCurrentDice(state)
    ) {
      return;
    }

    state.diceTurn.invalidHoldMessage =
      'Mit diesem Wurf kann die Straße nicht mehr sinnvoll erweitert werden.';
    state.diceTurn.showFarkleModal = true;
  };

  app.actions.rollNormalDiceTurn = function (state) {
    if (state.diceTurn.hasRolled) {
      const check = app.rules.isHeldSelectionValidForCurrentRoll(state);
      if (!check.valid) {
        state.diceTurn.invalidHoldMessage = check.message;
        return;
      }

      app.state.pushUndoState(state);
      app.actions.lockHeldDiceAndAddPoints(state, check.score);

      if (app.rules.allFiveDiceConvertedToPoints(state)) {
        app.actions.handleAllDiceScoredBonus(state);
        if (state.phase === 'finished') return;
        if (state.diceTurn.showContinueRoundModal || state.diceTurn.showCardModal) return;
        app.actions.prepareFreshFiveDiceAfterHotDice(state);
      }
    } else {
      app.state.pushUndoState(state);
    }

    let free = app.rules.getFreeDiceIndices(state);

    if (!free.length) {
      state.diceTurn.held = [false, false, false, false, false];
      state.diceTurn.lockedFromPreviousRoll = [false, false, false, false, false];
      free = [0, 1, 2, 3, 4];
    }

    free.forEach((index) => {
      state.diceTurn.dice[index] = app.utils.rollDie();
      state.diceTurn.held[index] = false;
    });

    state.diceTurn.lastRollIndices = [...free];
    state.diceTurn.hasRolled = true;
    state.diceTurn.canBank = state.diceTurn.turnPoints > 0;
    state.diceTurn.invalidHoldMessage = '';

    if (!app.rules.hasAnyScoringDice(state, free)) {
      if (state.diceTurn.activeCardKey === 'firework') {
        state.diceTurn.fireworkProtected = true;
        state.diceTurn.showFarkleModal = true;
      } else {
        app.actions.handleCloverFailureIfNeeded(state);
        state.diceTurn.turnPoints = 0;
        state.diceTurn.canBank = false;
        state.diceTurn.showFarkleModal = true;
      }
    }
  };

  app.actions.rollDiceTurn = function (state) {
    if (state.phase !== 'playing' || !state.diceMode) return;
    if (
      state.diceTurn.showFarkleModal ||
      state.diceTurn.showCardModal ||
      state.diceTurn.showContinueRoundModal
    ) {
      return;
    }
    if (state.diceTurn.straightMode) return app.actions.rollStraightTurn(state);
    return app.actions.rollNormalDiceTurn(state);
  };

  app.actions.bankDiceTurn = function (state) {
    if (state.phase !== 'playing' || !state.diceMode) return;
    if (
      state.diceTurn.showFarkleModal ||
      state.diceTurn.showCardModal ||
      state.diceTurn.showContinueRoundModal
    ) {
      return;
    }

    if (['firework', 'plusminus', 'straight', 'clover'].includes(state.diceTurn.activeCardKey)) {
      return;
    }

    let total = 0;

    if (state.diceTurn.straightMode) {
      total = state.diceTurn.turnPoints;
      if (total !== 2000) {
        state.diceTurn.invalidHoldMessage =
          'Für die Straßenkarte musst du die Straße vollständig schaffen.';
        return;
      }
    } else {
      const computedTotal = app.actions.getBankableDiceTurnTotal(state);
      if (computedTotal === null) {
        const check = app.rules.isHeldSelectionValidForCurrentRoll(state);
        state.diceTurn.invalidHoldMessage = check.message;
        return;
      }
      total = computedTotal;
    }

    if (total <= 0) return;

    app.state.pushUndoState(state);
    state.players[state.currentIndex].score += total;
    app.actions.triggerVisualEffects(state, state.currentIndex, total);

    if (state.players[state.currentIndex].score >= state.targetScore) {
      state.players[state.currentIndex].score = Math.max(
        state.players[state.currentIndex].score,
        state.targetScore
      );
      app.actions.finishGame(state, state.currentIndex);
      return;
    }

    app.actions.endTurnAndPrepareNext(state);
  };

  app.actions.confirmFarkleModal = function (state) {
    const firework =
      state.diceTurn.activeCardKey === 'firework' &&
      state.diceTurn.fireworkProtected;

    state.diceTurn.showFarkleModal = false;

    if (firework && state.diceTurn.turnPoints > 0) {
      app.state.pushUndoState(state);
      state.players[state.currentIndex].score += state.diceTurn.turnPoints;
      app.actions.triggerVisualEffects(state, state.currentIndex, state.diceTurn.turnPoints);

      if (state.players[state.currentIndex].score >= state.targetScore) {
        state.players[state.currentIndex].score = Math.max(
          state.players[state.currentIndex].score,
          state.targetScore
        );
        app.actions.finishGame(state, state.currentIndex);
        return;
      }
    }

    app.actions.endTurnAndPrepareNext(state);
  };

  app.actions.toggleDiceMode = function (state) {
    if (state.phase !== 'setup') return;
    state.diceMode = !state.diceMode;
  };

  app.actions.toggleCardsInPointMode = function (state) {
    if (state.phase !== 'setup') return;
    state.cardsInPointMode = !state.cardsInPointMode;
  };

  app.actions.undoLastAction = function (state) {
    app.actions.clearEffects(state);
    app.state.restoreUndoState(state);
  };
})(window.Punkteblock);