(function (app) {
  var root = document.getElementById('app');
  var state = app.state.loadState();

  app.app.root = root;
  app.app.state = state;

  var aiTimer = null;
  var aiBusy = false;

  function scheduleComputerTurn() {
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }

    aiTimer = setTimeout(() => {
      console.log('[MAIN] scheduleComputerTurn fired', {
        phase: state.phase,
        currentIndex: state.currentIndex,
        player: state.players[state.currentIndex]
      });

      if (aiBusy) {
        console.log('[MAIN] AI busy');
        return;
      }

      if (state.phase !== 'playing') {
        console.log('[MAIN] not playing');
        return;
      }

      if (!state.players[state.currentIndex]) {
        console.log('[MAIN] no current player');
        return;
      }

      if (!state.players[state.currentIndex].isComputer) {
        console.log('[MAIN] current player is human');
        return;
      }

      if (state.diceTurn.showCardModal || state.diceTurn.showFarkleModal || state.diceTurn.showContinueRoundModal) {
        console.log('[MAIN] AI blocked by modal', {
          showCardModal: state.diceTurn.showCardModal,
          showFarkleModal: state.diceTurn.showFarkleModal,
          showContinueRoundModal: state.diceTurn.showContinueRoundModal
        });
        return;
      }

      aiBusy = true;
      try {
        console.log('[MAIN] calling AI');
        app.ai.takeTurn(state);
        app.state.saveState(state);
        app.app.render();
      } finally {
        aiBusy = false;
      }

      scheduleComputerTurn();
    }, 250);
  }

  app.app.render = function () {
    app.render.renderApp(root, state);
  };

  app.events.bindEvents({
    root: root,
    state: state,
    render: function () {
      app.app.render();
      scheduleComputerTurn();
    }
  });

  app.app.render();
  scheduleComputerTurn();
})(window.Punkteblock);