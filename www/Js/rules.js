(function (app) {
  const STRAIGHT_A = [1, 2, 3, 4, 5];
  const STRAIGHT_B = [2, 3, 4, 5, 6];

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
    return state.diceTurn.lastRollIndices.filter(
      (index) => !state.diceTurn.lockedFromPreviousRoll[index]
    );
  };

  app.rules.getHeldThisRollIndices = function (state) {
    return app.rules
      .getCurrentUnlockedRollIndices(state)
      .filter((index) => state.diceTurn.held[index]);
  };

  app.rules.getHeldValuesThisRoll = function (state) {
    return app.rules
      .getHeldThisRollIndices(state)
      .map((index) => state.diceTurn.dice[index]);
  };

  app.rules.getFreeDiceIndices = function (state) {
    return state.diceTurn.held
      .map((held, index) => (!held ? index : -1))
      .filter((index) => index !== -1);
  };

  app.rules.isHeldSelectionValidForCurrentRoll = function (state) {
    const values = app.rules.getHeldValuesThisRoll(state);

    if (!values.length) {
      return {
        valid: false,
        score: 0,
        message: 'Du musst mindestens einen Würfel halten.'
      };
    }

    const counts = app.utils.countValues(values);

    for (let face = 2; face <= 6; face++) {
      if (face !== 5 && counts[face] > 0 && counts[face] < 3) {
        return {
          valid: false,
          score: 0,
          message: `Die gehaltenen ${face}er sind keine gültige Kombination.`
        };
      }
    }

    const score = app.rules.getSelectionScoreFromValues(values);

    if (score <= 0) {
      return {
        valid: false,
        score: 0,
        message: 'Die gehaltenen Würfel bringen keine Punkte.'
      };
    }

    return {
      valid: true,
      score,
      message: ''
    };
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

  app.rules.getPossibleStraightTargets = function (values) {
    const unique = app.utils.getSortedUnique(values);

    return [STRAIGHT_A, STRAIGHT_B].filter((target) =>
      unique.every((v) => target.includes(v))
    );
  };

  app.rules.determineStraightTarget = function (values) {
    const candidates = app.rules.getPossibleStraightTargets(values);
    return candidates.length === 1 ? candidates[0] : null;
  };

  app.rules.validateStraightHold = function (state) {
    const heldIndices = app.rules.getHeldThisRollIndices(state);
    const heldValues = heldIndices.map((index) => state.diceTurn.dice[index]);

    if (!heldValues.length) {
      return {
        valid: false,
        message: 'Du musst mindestens einen Würfel für die Straße halten.'
      };
    }

    const lockedValues = state.diceTurn.straightLockedValues || [];
    const combined = [...lockedValues, ...heldValues];
    const uniqueCombined = app.utils.getSortedUnique(combined);

    let candidates;

    if (state.diceTurn.straightTarget) {
      const target = state.diceTurn.straightTarget;
      const stillFits = uniqueCombined.every((v) => target.includes(v));
      candidates = stillFits ? [target] : [];
    } else {
      candidates = app.rules.getPossibleStraightTargets(combined);
    }

    if (!candidates.length) {
      return {
        valid: false,
        message: 'Diese Würfel passen nicht mehr zur begonnenen Straße.'
      };
    }

    const newlyAddedUseful = heldValues.some((value) => {
      if (lockedValues.includes(value)) return false;
      return candidates.some((target) => target.includes(value));
    });

    if (!newlyAddedUseful) {
      return {
        valid: false,
        message: 'Du musst mindestens einen Würfel halten, der die Straße erweitert.'
      };
    }

    const target = candidates.length === 1 ? candidates[0] : null;

    return {
      valid: true,
      message: '',
      target
    };
  };
})(window.Punkteblock); 
