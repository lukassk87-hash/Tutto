(function (app) {
  app.ai = app.ai || {};

  app.ai.decisionDelay = 700;
  app.ai.probabilityThreshold = 0.4;
  app.ai._busy = false;
  app.ai._timer = null;
  app.ai._render = null;

  app.ai.setRenderer = function (render) {
    app.ai._render = render;
  };

  app.ai._commit = function (state) {
    app.state.saveState(state);
    if (typeof app.ai._render === 'function') {
      app.ai._render();
    }
  };

  app.ai.isComputerPlayer = function (state, index) {
    return !!state.players[index]?.isComputer;
  };

  app.ai.getCurrentPlayer = function (state) {
    return state.players[state.currentIndex];
  };

  app.ai.getLeaderScore = function (state) {
    return Math.max(...state.players.map((player) => player.score));
  };

app.ai.estimateSuccessChance = function (state) {
  if (state.phase !== 'playing') return 0;
  if (
    state.diceTurn.showCardModal ||
    state.diceTurn.showFarkleModal ||
    state.diceTurn.showContinueRoundModal
  ) return 0;

  const key = state.diceTurn.activeCardKey;

  // Sonderkartenregel bleibt
  if (key === 'clover') return 1;
  if (key === 'firework') return 1;
  if (key === 'straight') return 1;
  if (key === 'plusminus') return 1;

  const current = state.players[state.currentIndex];
  const roundPoints = state.diceTurn.turnPoints || 0;
  const currentScore = current.score || 0;
  const projectedScore = currentScore + roundPoints;
  const leaderScore = app.ai.getLeaderScore(state);
  const deficit = leaderScore - projectedScore;
  const WIN_SCORE = 6000;

  if (projectedScore >= WIN_SCORE) return 0;

  if (roundPoints < 150) return 0.95;

  if (roundPoints < 250) {
    return deficit >= 0 && deficit < 1000 ? 0.72 : 0.18;
  }

  if (roundPoints < 350) {
    return deficit > 1000 ? 0.66 : 0.15;
  }

  return 0.05;
};

app.ai.shouldTakeRisk = function (state) {
  const key = state.diceTurn.activeCardKey;

  // Sonderkartenregel bleibt
  if (key === 'firework') return true;
  if (key === 'plusminus') return true;
  if (key === 'straight') return true;
  if (key === 'clover') return true;

  return app.ai.estimateSuccessChance(state) >= app.ai.probabilityThreshold;
};

app.ai.shouldContinueRound = function (state) {
  if (state.phase !== 'playing') return false;
  if (
    state.diceTurn.showCardModal ||
    state.diceTurn.showFarkleModal ||
    state.diceTurn.showContinueRoundModal
  ) return false;

  const key = state.diceTurn.activeCardKey;

  // Sonderkartenregel bleibt
  if (key === 'firework') return true;
  if (key === 'plusminus') return true;
  if (key === 'straight') return true;
  if (key === 'clover') return true;

  const current = state.players[state.currentIndex];
  const roundPoints = state.diceTurn.turnPoints || 0;
  const currentScore = current.score || 0;
  const projectedScore = currentScore + roundPoints;
  const leaderScore = app.ai.getLeaderScore(state);
  const deficit = leaderScore - projectedScore;
  const WIN_SCORE = 6000;

  if (projectedScore >= WIN_SCORE) return false;

  if (roundPoints < 150) return true;

  if (roundPoints < 200) {
    return deficit >= 0 && deficit < 1000;
  }

  if (roundPoints < 250) {
    return deficit > 1000;
  }

  return false;
};




  app.ai.getStraightTarget = function (state) {
    const locked = [...(state.diceTurn.straightLockedValues || [])].sort((a, b) => a - b);
    const targetA = [1, 2, 3, 4, 5];
    const targetB = [2, 3, 4, 5, 6];

    const fitsA = locked.every((v) => targetA.includes(v));
    const fitsB = locked.every((v) => targetB.includes(v));

    if (fitsA && !fitsB) return targetA;
    if (fitsB && !fitsA) return targetB;

    const rolledValues = state.diceTurn.lastRollIndices
      .filter((i) => !state.diceTurn.lockedFromPreviousRoll[i])
      .map((i) => state.diceTurn.dice[i]);

    const uniqueRolled = [...new Set(rolledValues)];
    const scoreA = uniqueRolled.filter((v) => targetA.includes(v) && !locked.includes(v)).length;
    const scoreB = uniqueRolled.filter((v) => targetB.includes(v) && !locked.includes(v)).length;

    if (scoreB > scoreA) return targetB;
    return targetA;
  };

  app.ai.holdStraightDice = function (state) {
    const rolled = state.diceTurn.lastRollIndices.filter(
      (i) => !state.diceTurn.lockedFromPreviousRoll[i]
    );

    rolled.forEach((index) => {
      state.diceTurn.held[index] = false;
    });

    const target = state.diceTurn.straightTarget || app.ai.getStraightTarget(state);
    state.diceTurn.straightTarget = target;

    const lockedValues = new Set(state.diceTurn.straightLockedValues || []);
    const usedValues = new Set(lockedValues);

    rolled.forEach((index) => {
      const value = state.diceTurn.dice[index];

      if (!target.includes(value)) return;
      if (usedValues.has(value)) return;

      if (value === 1 && usedValues.has(6)) return;
      if (value === 6 && usedValues.has(1)) return;

      state.diceTurn.held[index] = true;
      usedValues.add(value);
    });
  };

  app.ai.holdScoringDice = function (state) {
    const rolled = state.diceTurn.lastRollIndices.filter((i) => !state.diceTurn.lockedFromPreviousRoll[i]);
    const values = rolled.map((i) => state.diceTurn.dice[i]);
    const counts = app.utils.countValues(values);

    let heldAny = false;

    rolled.forEach((index) => {
      const value = state.diceTurn.dice[index];
      const keep = value === 1 || value === 5 || (counts[value] >= 3 && value >= 2);
      if (keep && !state.diceTurn.lockedFromPreviousRoll[index]) {
        state.diceTurn.held[index] = true;
        heldAny = true;
      } else {
        state.diceTurn.held[index] = false;
      }
    });

    if (!heldAny && rolled.length) {
      const candidate = rolled.find((index) => {
        const value = state.diceTurn.dice[index];
        return value === 1 || value === 5;
      });
      if (candidate !== undefined) {
        state.diceTurn.held[candidate] = true;
      }
    }
  };

  app.ai._clearTimer = function () {
    if (app.ai._timer) {
      clearTimeout(app.ai._timer);
      app.ai._timer = null;
    }
  };

  app.ai._schedule = function (fn) {
    app.ai._clearTimer();
    app.ai._timer = setTimeout(() => {
      app.ai._timer = null;
      fn();
    }, app.ai.decisionDelay);
  };

  app.ai.selectCardIfNeeded = function (state) {
    if (!state.diceTurn.awaitingCardConfirmation) return false;
    const key = state.diceTurn.pendingCardKey;
    if (!key) return false;

    app.ai._schedule(() => {
      app.actions.confirmCurrentCard(state);
      app.ai._commit(state);
      app.ai._busy = false;
      app.ai.takeTurn(state);
    });

    return true;
  };

  app.ai.resolveLostRound = function (state) {
    if (!state.diceTurn.showFarkleModal) return false;

    app.ai._schedule(() => {
      app.actions.confirmFarkleModal(state);
      app.ai._commit(state);
      app.ai._busy = false;
      app.ai.takeTurn(state);
    });

    return true;
  };

  app.ai.resolveContinueRound = function (state) {
    if (!state.diceTurn.showContinueRoundModal) return false;

    app.ai._schedule(() => {
      if (app.ai.shouldContinueRound(state)) {
        app.actions.continueRoundWithNewCard(state);
      } else {
        app.actions.bankRoundPointsAndEndTurn(state);
      }
      app.ai._commit(state);
      app.ai._busy = false;
      app.ai.takeTurn(state);
    });

    return true;
  };

  app.ai.afterRollDecision = function (state) {
    if (state.diceTurn.showFarkleModal || state.diceTurn.showContinueRoundModal) return;

    if (state.diceTurn.activeCardKey === 'straight') {
      if (app.rules.isFullStraight(state.diceTurn.straightLockedValues)) {
        app.ai._schedule(() => {
          if (state.diceTurn.turnPoints >= 2000) {
            app.actions.bankDiceTurn(state);
          } else {
            app.actions.rollDiceTurn(state);
          }
          app.ai._commit(state);
          app.ai._busy = false;
          app.ai.takeTurn(state);
        });
        return;
      }

      const canContinue = app.actions.canStillReachStraightFromCurrentDice(state);
      if (!canContinue) {
        state.diceTurn.showFarkleModal = true;
        app.ai._commit(state);
        app.ai._busy = false;
        app.ai.takeTurn(state);
        return;
      }

      app.ai._schedule(() => {
        app.ai.holdStraightDice(state);
        app.actions.rollDiceTurn(state);
        app.ai._commit(state);
        app.ai._busy = false;
        app.ai.takeTurn(state);
      });
      return;
    }

    if (app.rules.allFiveDiceConvertedToPoints(state)) {
      app.ai._schedule(() => {
        app.actions.handleAllDiceScoredBonus(state);
        app.ai._commit(state);
        app.ai._busy = false;
        app.ai.takeTurn(state);
      });
      return;
    }

    if (app.ai.shouldContinueRound(state)) {
      app.ai._schedule(() => {
        if (state.diceTurn.straightMode) {
          app.ai.holdStraightDice(state);
        } else {
          app.ai.holdScoringDice(state);
        }
        app.actions.rollDiceTurn(state);
        app.ai._commit(state);
        app.ai._busy = false;
        app.ai.takeTurn(state);
      });
      return;
    }

    app.ai._schedule(() => {
      app.actions.bankDiceTurn(state);
      app.ai._commit(state);
      app.ai._busy = false;
      app.ai.takeTurn(state);
    });
  };

  app.ai.takeTurn = function (state) {
    if (app.ai._busy) return;
    if (!app.ai.isComputerPlayer(state, state.currentIndex)) return;
    if (state.phase !== 'playing') return;

    app.ai._busy = true;

    if (app.ai.resolveLostRound(state)) return;
    if (app.ai.resolveContinueRound(state)) return;
    if (app.ai.selectCardIfNeeded(state)) return;

    if (
      state.diceTurn.showCardModal ||
      state.diceTurn.showFarkleModal ||
      state.diceTurn.showContinueRoundModal
    ) {
      app.ai._busy = false;
      return;
    }

    if (state.diceTurn.hasRolled) {
      if (state.diceTurn.straightMode) {
        app.ai.holdStraightDice(state);
      } else {
        app.ai.holdScoringDice(state);
      }

      app.ai._schedule(() => {
        if (app.ai.shouldContinueRound(state)) {
          app.actions.rollDiceTurn(state);
        } else {
          app.actions.bankDiceTurn(state);
        }
        app.ai._commit(state);
        app.ai._busy = false;
        app.ai.takeTurn(state);
      });
      return;
    }

    app.ai._schedule(() => {
      if (state.diceTurn.activeCardKey === 'straight' && state.diceTurn.straightMode) {
        app.actions.rollDiceTurn(state);
      } else if (app.ai.shouldTakeRisk(state)) {
        app.actions.rollDiceTurn(state);
      } else if (state.diceMode) {
        app.actions.bankDiceTurn(state);
      } else {
        app.actions.addPoints(state, 0);
      }
      app.ai._commit(state);
      app.ai._busy = false;
      app.ai.takeTurn(state);
    });
  };
})(window.Punkteblock);