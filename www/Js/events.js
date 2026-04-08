(function (app) {
  app.events.bindEvents = function ({ root, state, render }) {
  app.ai.setRenderer(render);
    const scheduleComputerTurn = () => {
      setTimeout(() => {
        if (state.phase !== 'playing') return;
        if (!state.players[state.currentIndex]?.isComputer) return;
        app.ai.takeTurn(state);
        app.state.saveState(state);
        render();
      }, 250);
    };

    root.addEventListener('change', (event) => {
      const target = event.target;

      if (target.id === 'playerCount') {
        app.state.setPlayerCount(state, target.value);
        app.state.saveState(state);
        render();
        return;
      }

      if (target.id === 'diceModeToggle') {
        app.actions.toggleDiceMode(state);
        app.state.saveState(state);
        render();
        return;
      }

      if (target.id === 'cardsInPointModeToggle') {
        app.actions.toggleCardsInPointMode(state);
        app.state.saveState(state);
        render();
        return;
      }

      if (target.matches('[data-ai-index]')) {
        const index = Number(target.dataset.aiIndex);
        state.players[index].isComputer = target.checked;
        app.state.saveState(state);
        render();
        return;
      }
    });

    root.addEventListener('input', (event) => {
      const target = event.target;
      if (target.matches('[data-name-index]')) {
        app.state.setPlayerName(state, Number(target.dataset.nameIndex), target.value);
        app.state.saveState(state);
      }
    });

    root.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;

      if (button.dataset.dieIndex !== undefined) {
        app.actions.toggleDieHold(state, Number(button.dataset.dieIndex));
        app.state.saveState(state);
        render();
        return;
      }

      if (button.dataset.moveUp !== undefined) {
        app.state.movePlayer(state, Number(button.dataset.moveUp), -1);
        app.state.saveState(state);
        render();
        return;
      }

      if (button.dataset.moveDown !== undefined) {
        app.state.movePlayer(state, Number(button.dataset.moveDown), 1);
        app.state.saveState(state);
        render();
        return;
      }

      if (button.dataset.add !== undefined) {
        app.actions.addPoints(state, Number(button.dataset.add));
        app.state.saveState(state);
        render();
        return;
      }

      switch (button.dataset.action) {
        case 'start-game':
          app.actions.startGame(state);
          break;
        case 'roll-dice':
          app.actions.rollDiceTurn(state);
          break;
        case 'bank-dice':
          app.actions.bankDiceTurn(state);
          break;
        case 'transfer-leader':
          app.actions.transferFromLeader(state);
          break;
        case 'undo-action':
          app.actions.undoLastAction(state);
          break;
        case 'direct-win':
          app.actions.directWin(state);
          break;
        case 'back-setup':
        case 'finished-setup':
          app.actions.backToSetup(state);
          break;
        case 'same-players':
          app.actions.newGameSamePlayers(state);
          break;
        case 'confirm-card':
          app.actions.confirmCurrentCard(state);
          break;
        case 'decline-card':
          app.actions.declineHotDiceNewCard(state);
          break;
        case 'continue-round':
          app.actions.continueRoundWithNewCard(state);
          break;
        case 'bank-round-points':
          app.actions.bankRoundPointsAndEndTurn(state);
          break;
        case 'confirm-farkle':
          app.actions.confirmFarkleModal(state);
          break;
        case 'custom-add': {
          const input = root.querySelector('#customPoints');
          app.actions.addPoints(state, input ? Number(input.value) : 0);
          break;
        }
        default:
          return;
      }

      app.state.saveState(state);
      render();
      scheduleComputerTurn();
    });

    root.addEventListener('toggle', (event) => {
      const details = event.target;
      if (details.id === 'scoreboardDetails') {
        state.scoreboardOpen = details.open;
        app.state.saveState(state);
      }
    }, true);

    scheduleComputerTurn();
  };
})(window.Punkteblock);