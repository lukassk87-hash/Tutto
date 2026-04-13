(function (app) {
  function uniqueValues(values) {
    return [...new Set(values)];
  }

  function hasDuplicates(values) {
    return uniqueValues(values).length !== values.length;
  }

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

  app.rules.getStraightLockedValues = function (state) {
    return Array.isArray(state.diceTurn.straightLockedValues)
      ? [...state.diceTurn.straightLockedValues]
      : [];
  };

  app.rules.getStraightHeldValuesThisRoll = function (state) {
    return app.rules.getHeldValuesThisRoll(state);
  };

  app.rules.getStraightCombinedValues = function (state, extraValues) {
    return [
      ...app.rules.getStraightLockedValues(state),
      ...(extraValues || [])
    ];
  };

  app.rules.isStraightCombinationValid = function (values) {
    if (!values.length) {
      return {
        valid: false,
        message: 'Du musst mindestens einen Würfel für die Straße halten.',
        score: 0,
        complete: false
      };
    }

    if (hasDuplicates(values)) {
      return {
        valid: false,
        message: 'Ein gleichwertiger Würfel darf für die Straße nicht mehrfach gehalten werden.',
        score: 0,
        complete: false
      };
    }

    const unique = uniqueValues(values);

    if (unique.includes(1) && unique.includes(6)) {
      return {
        valid: false,
        message: 'Für die Straße dürfen 1 und 6 nicht gleichzeitig gehalten werden.',
        score: 0,
        complete: false
      };
    }

    const complete = unique.length === 5;

    return {
      valid: true,
      message: '',
      score: complete ? 2000 : 0,
      complete
    };
  };

  app.rules.validateStraightHold = function (state) {
    const heldValues = app.rules.getStraightHeldValuesThisRoll(state);

    if (!heldValues.length) {
      return {
        valid: false,
        message: 'Du musst mindestens einen Würfel für die Straße halten.',
        score: 0,
        complete: false
      };
    }

    const lockedValues = app.rules.getStraightLockedValues(state);
    const combined = [...lockedValues, ...heldValues];
    const result = app.rules.isStraightCombinationValid(combined);

    if (!result.valid) return result;

    const newUniqueHeld = uniqueValues(heldValues).filter(
      (value) => !lockedValues.includes(value)
    );

    if (!newUniqueHeld.length) {
      return {
        valid: false,
        message: 'Du musst die Straße mit mindestens einem neuen Wert erweitern.',
        score: 0,
        complete: false
      };
    }

    return result;
  };

  app.rules.canStraightBeExtendedFromRoll = function (state) {
    const lockedValues = app.rules.getStraightLockedValues(state);
    const rollValues = app.rules
      .getCurrentUnlockedRollIndices(state)
      .map((index) => state.diceTurn.dice[index]);

    if (!rollValues.length) return false;

    const uniqueRollValues = uniqueValues(rollValues);

    return uniqueRollValues.some((value) => {
      if (lockedValues.includes(value)) return false;
      return app.rules.isStraightCombinationValid([...lockedValues, value]).valid;
    });
  };

  app.rules.getStraightExtendableValuesFromRoll = function (state) {
    const lockedValues = app.rules.getStraightLockedValues(state);
    const rollValues = app.rules
      .getCurrentUnlockedRollIndices(state)
      .map((index) => state.diceTurn.dice[index]);

    return uniqueValues(rollValues).filter((value) => {
      if (lockedValues.includes(value)) return false;
      return app.rules.isStraightCombinationValid([...lockedValues, value]).valid;
    });
  };

  app.rules.isFullStraight = function (values) {
    return app.rules.isStraightCombinationValid(values).complete === true;
  };

  app.rules.getStraightScore = function (values) {
    return app.rules.isFullStraight(values) ? 2000 : 0;
  };
})(window.Punkteblock);