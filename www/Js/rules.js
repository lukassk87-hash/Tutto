(function (app) {
  app.rules.getSelectionScoreFromValues = function (values) {
    if (!values.length) return 0;
    const counts = app.utils.countValues(values);
    let score = 0;

    for (let face = 1; face <= 6; face++) {
      if (counts[face] >= 3) {
        score += face === 1 ? 1000 : face * 100;
        counts[face] -= 3;
      }
    }

    score += counts[1] * 100;
    score += counts[5] * 50;
    return score;
  };

  app.rules.getCurrentUnlockedRollIndices = function (state) {
    return state.diceTurn.lastRollIndices.filter((index) => !state.diceTurn.lockedFromPreviousRoll[index]);
  };

  app.rules.getHeldThisRollIndices = function (state) {
    return app.rules.getCurrentUnlockedRollIndices(state).filter((index) => state.diceTurn.held[index]);
  };

  app.rules.getHeldValuesThisRoll = function (state) {
    return app.rules.getHeldThisRollIndices(state).map((index) => state.diceTurn.dice[index]);
  };

  app.rules.getFreeDiceIndices = function (state) {
    return state.diceTurn.held.map((held, index) => (!held ? index : -1)).filter((index) => index !== -1);
  };

  app.rules.isHeldSelectionValidForCurrentRoll = function (state) {
    const values = app.rules.getHeldValuesThisRoll(state);
    if (!values.length) return { valid: false, score: 0, message: 'Du musst mindestens einen Würfel halten.' };

    const counts = app.utils.countValues(values);
    for (let face = 2; face <= 6; face++) {
      if (face !== 5 && counts[face] > 0 && counts[face] < 3) {
        return { valid: false, score: 0, message: `Die gehaltenen ${face}er sind keine gültige Kombination.` };
      }
    }

    const score = app.rules.getSelectionScoreFromValues(values);
    if (score <= 0) return { valid: false, score: 0, message: 'Die gehaltenen Würfel bringen keine Punkte.' };
    return { valid: true, score, message: '' };
  };

  app.rules.hasAnyScoringDice = function (state, indices) {
    const values = indices.map((index) => state.diceTurn.dice[index]);
    const counts = app.utils.countValues(values);
    if (counts[1] > 0 || counts[5] > 0) return true;
    for (let face = 2; face <= 6; face++) {
      if (counts[face] >= 3) return true;
    }
    return false;
  };

  app.rules.allFiveDiceConvertedToPoints = function (state) {
    return state.diceTurn.lockedFromPreviousRoll.every(Boolean);
  };

  app.rules.isFullStraight = function (values) {
    if (values.length !== 5) return false;
    const sorted = [...values].sort((a, b) => a - b).join(',');
    return sorted === '1,2,3,4,5' || sorted === '2,3,4,5,6';
  };

  app.rules.determineStraightTarget = function (values) {
    const unique = app.utils.getSortedUnique(values);
    const targetA = [1, 2, 3, 4, 5];
    const targetB = [2, 3, 4, 5, 6];
    const fitsA = unique.every((v) => targetA.includes(v));
    const fitsB = unique.every((v) => targetB.includes(v));
    if (fitsA && !fitsB) return targetA;
    if (!fitsA && fitsB) return targetB;
    if (fitsA && fitsB) return targetA;
     if (fitsB && fitsA) return targetB;
    return null;
  };

  app.rules.validateStraightHold = function (state) {
    const heldIndices = app.rules.getHeldThisRollIndices(state);
    const heldValues = heldIndices.map((index) => state.diceTurn.dice[index]);
    if (!heldValues.length) return { valid: false, message: 'Du musst mindestens einen Würfel für die Straße halten.' };

    const combined = [...state.diceTurn.straightLockedValues, ...heldValues];
    const unique = app.utils.getSortedUnique(combined);
    let target = state.diceTurn.straightTarget;

    if (!target) target = app.rules.determineStraightTarget(combined);
    else if (!unique.every((v) => target.includes(v))) return { valid: false, message: 'Diese Würfel passen nicht mehr zur begonnenen Straße.' };

    if (!target) return { valid: false, message: 'Diese Würfel passen zu keiner gültigen Straße.' };

    const newlyAddedUseful = heldValues.some((value) => target.includes(value) && !state.diceTurn.straightLockedValues.includes(value));
    if (!newlyAddedUseful) return { valid: false, message: 'Du musst mindestens einen Würfel halten, der die Straße erweitert.' };

    return { valid: true, message: '', target };
  };
})(window.Punkteblock);