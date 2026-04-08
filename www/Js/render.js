(function (app) {
  app.render.renderEffects = function (state) {
    const popupHtml = state.effects.scorePopup
      ? `<div class="effect-layer"><div class="score-popup"><div>${app.utils.escapeHtml(state.effects.scorePopup.name)}</div><div>${state.effects.scorePopup.total}</div></div></div>`
      : '';

    const confettiHtml = state.effects.confetti.length
      ? `<div class="effect-layer">${state.effects.confetti
          .map((piece) => `<span class="confetti" style="--left:${piece.left}; --delay:${piece.delay}; --duration:${piece.duration}; --size:${piece.size};">${piece.emoji}</span>`)
          .join('')}</div>`
      : '';

    return popupHtml + confettiHtml;
  };

  app.render.renderContinueRoundModal = function (state) {
    if (!state.diceTurn.showContinueRoundModal) return '';

    return `
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-pill">Runde erfolgreich</div>
          <h3>Weiterspielen?</h3>
          <p>Du hast in dieser Runde bisher <strong>${state.diceTurn.turnPoints}</strong> Punkte erspielt.</p>
          <p>Bei „Ja“ spielst du sofort weiter, ziehst eine neue Karte und deine Punkte sind noch nicht gesichert. Bei „Nein“ werden die Punkte übernommen und der nächste Spieler ist an der Reihe.</p>
          <div class="modal-actions">
            <button type="button" class="btn-primary" data-action="continue-round">Ja, weiterspielen</button>
            <button type="button" class="btn-secondary" data-action="bank-round-points">Nein, Punkte sichern</button>
          </div>
        </div>
      </div>
    `;
  };

  app.render.renderCardModal = function (state) {
    if (!state.diceTurn.awaitingCardConfirmation) return '';
    const card = app.actions.getPendingCard(state);
    if (!card) return '';

    const isStartOfRound = !state.diceTurn.hotDiceCompletedOnce && state.diceMode;
    const isFollowupRound = state.diceTurn.hotDiceCompletedOnce || state.diceTurn.turnPoints > 0;

    return `
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-pill">Neue Karte</div>
          <h3>${app.utils.escapeHtml(card.title)}</h3>
          <p>${app.utils.escapeHtml(card.description)}</p>
          <p>${
            isStartOfRound
              ? 'Zu Beginn dieser Runde musst du zuerst die gezogene Karte bestätigen, bevor du würfeln kannst.'
              : isFollowupRound
                ? `Du spielst weiter. Deine bisherige Rundensumme von ${state.diceTurn.turnPoints} Punkten bleibt ungesichert, bis du sie übernimmst oder die Runde verlierst.`
                : 'Bitte bestätige die gezogene Karte, um fortzufahren.'
          }</p>
          <div class="modal-actions">
            <button type="button" class="btn-primary" data-action="confirm-card">Karte bestätigen</button>
          </div>
        </div>
      </div>
    `;
  };

  app.render.renderFarkleModal = function (state) {
    if (!state.diceTurn.showFarkleModal) return '';
    const firework = state.diceTurn.activeCardKey === 'firework' && state.diceTurn.fireworkProtected;

    const lastRoll = state.diceTurn.lastRollIndices.length
      ? state.diceTurn.lastRollIndices.map((index) => state.diceTurn.dice[index]).join(', ')
      : state.diceTurn.dice.join(', ');

    const text = firework
      ? 'Ungültiger Wurf. Dank Feuerwerk bleiben die bereits in dieser Runde gesammelten Punkte erhalten und werden jetzt übernommen.'
      : state.diceTurn.straightMode
        ? 'Die Straße kann nicht mehr sinnvoll erweitert werden. Diese Runde ist verloren.'
        : 'Dieser Wurf hat keine gültige Wertung gebracht. Die Rundensumme verfällt.';

    return `
      <div class="modal-backdrop">
        <div class="modal">
          <h3>${firework ? 'Feuerwerk!' : 'Runde beendet'}</h3>
          <p>${text}</p>
          <p><strong>Würfelergebnis:</strong> ${app.utils.escapeHtml(lastRoll)}</p>
          <button type="button" class="btn-modal" data-action="confirm-farkle">OK</button>
        </div>
      </div>
    `;
  };

  app.render.renderSetup = function (state) {
    const playerRows = state.players.map((player, index) => `
      <div class="player-row">
        <input type="text" value="${app.utils.escapeHtml(player.name)}" data-name-index="${index}" placeholder="Name Spieler ${index + 1}" />
        <label class="player-ai-toggle">
          <input type="checkbox" data-ai-index="${index}" ${player.isComputer ? 'checked' : ''} />
          KI
        </label>
        <div class="row-actions">
          <button type="button" class="btn-muted" data-move-up="${index}" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="btn-muted" data-move-down="${index}" ${index === state.players.length - 1 ? 'disabled' : ''}>↓</button>
        </div>
      </div>
    `).join('');

    const cardStats = app.config.CARD_DEFS.map((card) => `
      <div class="card-prob-row">
        <span>${app.utils.escapeHtml(card.title)}</span>
        <span>${card.count}x</span>
      </div>
    `).join('');

    return `
      <div class="card">
        <h1 class="title">Punkteblock</h1>
        <p class="subtitle">Spielerzahl wählen, Namen eintragen und Modi festlegen.</p>
        <div class="setup-grid">
          <div class="field">
            <label for="playerCount">Spielerzahl</label>
            <select id="playerCount">
              ${Array.from({ length: app.config.MAX_PLAYERS - app.config.MIN_PLAYERS + 1 }, (_, i) => {
                const value = i + app.config.MIN_PLAYERS;
                return `<option value="${value}" ${value === state.players.length ? 'selected' : ''}>${value}</option>`;
              }).join('')}
            </select>
          </div>

          <label><input type="checkbox" id="diceModeToggle" ${state.diceMode ? 'checked' : ''} /> Würfelmodus aktivieren</label>
          <label><input type="checkbox" id="cardsInPointModeToggle" ${state.cardsInPointMode ? 'checked' : ''} /> Karten im Punktmodus aktivieren</label>

          <div class="field">
            <label>Reihenfolge</label>
            <div class="player-list">${playerRows}</div>
          </div>

          <div class="field">
            <label>Kartenverteilung</label>
            <div class="card-prob-list">${cardStats}</div>
          </div>

          <button type="button" class="btn-primary" data-action="start-game">Spiel starten</button>
        </div>
      </div>
    `;
  };

  app.render.renderPointsButtons = function () {
    return app.config.QUICK_POINTS.map((points) => `
      <button type="button" class="${points === 0 ? 'zero-btn' : 'points-btn'}" data-add="${points}">
        ${points === 0 ? '0' : '+' + points}
      </button>
    `).join('');
  };

  app.render.renderScoreboard = function (state) {
    const rows = state.players.map((player, index) => `
      <div class="score-row ${index === state.currentIndex ? 'is-active' : ''}">
        <div><strong>${index + 1}.</strong> ${app.utils.escapeHtml(player.name)}</div>
        <span>${player.score}</span>
      </div>
    `).join('');

    return `
      <details class="details-reset" id="scoreboardDetails" ${state.scoreboardOpen ? 'open' : ''}>
        <summary>Punkteübersicht</summary>
        <div class="scoreboard-body">${rows}</div>
      </details>
    `;
  };

  app.render.renderActiveCardBox = function (state) {
    const card = app.actions.getActiveCard(state);
    if (!(state.diceMode || state.cardsInPointMode)) return '';
    if (!card) return '';

    return `
      <div class="active-card-box">
        <div class="turn-label">Aktive Karte</div>
        <div class="active-name">${app.utils.escapeHtml(card.title)}</div>
        <div class="note">${app.utils.escapeHtml(card.description)}</div>
      </div>
    `;
  };

  app.render.renderDiceSection = function (state) {
    const heldThisRoll = app.rules.getHeldThisRollIndices(state);
    const currentCheck = state.diceTurn.straightMode
      ? app.rules.validateStraightHold(state)
      : heldThisRoll.length
        ? app.rules.isHeldSelectionValidForCurrentRoll(state)
        : null;

    const straightInfo = state.diceTurn.straightMode
      ? `<div>Straßenziel: 1-2-3-4-5 oder 2-3-4-5-6</div><div>Bereits gesichert: ${state.diceTurn.straightLockedValues.length ? app.utils.escapeHtml([...state.diceTurn.straightLockedValues].sort((a, b) => a - b).join(', ')) : 'noch keine'}</div>`
      : '';

    const controlsDisabled = state.diceTurn.showFarkleModal
      || state.diceTurn.showCardModal
      || state.diceTurn.showContinueRoundModal;

    return `
      <div class="dice-panel">
        <div class="dice-grid">
          ${state.diceTurn.dice.map((value, index) => {
            const classNames = ['die'];
            if (state.diceTurn.lockedFromPreviousRoll[index]) classNames.push('is-held');
            else if (state.diceTurn.held[index]) classNames.push('is-selected');
            else if (state.diceTurn.hasRolled && state.diceTurn.lastRollIndices.includes(index)) classNames.push('is-rollable');

            return `<button type="button" class="${classNames.join(' ')}" data-die-index="${index}" ${state.diceTurn.lockedFromPreviousRoll[index] || controlsDisabled ? 'disabled' : ''}>${value}</button>`;
          }).join('')}
        </div>

        <div class="setup-grid">
          <div>Rundensumme: ${state.diceTurn.turnPoints}</div>
          <div>Im aktuellen Wurf gehalten: ${heldThisRoll.length}</div>
          <div>${currentCheck ? (state.diceTurn.straightMode ? 'Auswahl wird für Straße geprüft' : `Wert dieser Auswahl: ${currentCheck.score}`) : 'Beliebige Würfel antippen'}</div>
          ${straightInfo}
        </div>

        ${state.diceTurn.invalidHoldMessage ? `<p class="note note-warning">${app.utils.escapeHtml(state.diceTurn.invalidHoldMessage)}</p>` : ''}

        <div class="dice-actions">
          <button type="button" class="btn-primary" data-action="roll-dice" ${controlsDisabled ? 'disabled' : ''}>${state.diceTurn.hasRolled ? 'Gehaltene prüfen und weiterwürfeln' : 'Würfeln'}</button>
          <button type="button" class="btn-transfer" data-action="bank-dice" ${controlsDisabled || state.diceTurn.activeCardKey === 'clover' || state.diceTurn.activeCardKey === 'firework' || state.diceTurn.activeCardKey === 'plusminus' || state.diceTurn.activeCardKey === 'straight' ? 'disabled' : ''}>Punkte behalten</button>
        </div>
      </div>
    `;
  };

  app.render.renderGame = function (state) {
    const active = state.players[state.currentIndex];

    return `
      <div class="card">
        ${app.render.renderEffects(state)}
        <div class="topline">
          <span class="pill">Ziel: ${state.targetScore} Punkte</span>
          <span class="pill">Spieler ${state.currentIndex + 1} von ${state.players.length}</span>
          <span class="pill">${state.diceMode ? 'Würfelmodus' : 'Punktmodus'}</span>
          ${(state.diceMode || state.cardsInPointMode) ? '<span class="pill">Karten aktiv</span>' : ''}
          ${state.storageAvailable ? '<span class="pill">Speichern aktiv</span>' : '<span class="pill">Nur Sitzung</span>'}
        </div>

        ${app.render.renderScoreboard(state)}
        ${app.render.renderActiveCardBox(state)}

        <div class="active-area">
          <div class="turn-label">Aktiver Spieler</div>
          <div class="active-name">${app.utils.escapeHtml(active.name)}</div>
          <div class="active-score">${active.score}</div>
        </div>

        ${state.diceMode ? app.render.renderDiceSection(state) : `
          <div class="points-grid">${app.render.renderPointsButtons()}</div>
          <div class="custom-row">
            <input id="customPoints" type="number" min="0" step="50" value="50" />
            <button type="button" class="btn-secondary" data-action="custom-add">Punkte hinzufügen</button>
          </div>
        `}

        <div class="action-row">
         ${!state.diceMode ? `<button type="button" class="btn-transfer" data-action="transfer-leader">+1000 / Führendem -1000</button>` : ''}
          <button type="button" class="btn-undo" data-action="undo-action" ${state.undoStack.length ? '' : 'disabled'}>Rückgängig</button>
        ${!state.diceMode ? `<button type="button" class="btn-win" data-action="direct-win">Direktgewinn</button>` : ''}
          <button type="button" class="btn-warning" data-action="back-setup">Zur Startmaske</button>
        </div>

        <p class="note">Im Würfelmodus kannst du im aktuellen Wurf jeden Würfel halten. Geprüft wird erst beim Weiterwürfeln.</p>
      </div>
      ${app.render.renderContinueRoundModal(state)}
      ${app.render.renderCardModal(state)}
      ${app.render.renderFarkleModal(state)}
    `;
  };

  app.render.renderFinished = function (state) {
    const winner = state.players[state.winnerIndex];
    const ranking = [...state.players]
      .sort((a, b) => b.score - a.score)
      .map((player, index) => `
        <div class="rank-row">
          <span>${index + 1}. ${app.utils.escapeHtml(player.name)}</span>
          <span>${player.score}</span>
        </div>
      `).join('');

    return `
      <div class="card">
        <div class="winner-box">
          <p class="muted">Spiel beendet</p>
          <div class="winner-name">${app.utils.escapeHtml(winner.name)}</div>
          <p>${winner.score} Punkte erreicht.</p>
        </div>

        <div class="ranking">${ranking}</div>

        <div class="footer-actions">
          <button type="button" class="btn-primary" data-action="same-players">Nochmal mit gleichen Spielern</button>
          <button type="button" class="btn-warning" data-action="finished-setup">Zur Startmaske</button>
        </div>
      </div>
    `;
  };

  app.render.renderApp = function (root, state) {
    if (state.phase === 'setup') {
      root.innerHTML = app.render.renderSetup(state);
      return;
    }

    if (state.phase === 'playing') {
      root.innerHTML = app.render.renderGame(state);
      return;
    }

    root.innerHTML = app.render.renderFinished(state);
  };
})(window.Punkteblock);