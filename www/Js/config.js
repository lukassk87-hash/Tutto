(function (app) {
  app.config.STORAGE_KEY = 'punkteblock_hellblau_v15_cards';
  app.config.TARGET_SCORE = 6000;
  app.config.MIN_PLAYERS = 2;
  app.config.MAX_PLAYERS = 8;
  app.config.UNDO_LIMIT = 30;

  app.config.QUICK_POINTS = Array.from({ length: 41 }, (_, i) => i * 50);
  app.config.CONFETTI_EMOJIS = ['🎉', '🎊', '✨', '💛', '🎲', '♦️', '⭐'];

  app.config.CARD_DEFS = [
    { key: 'skip', title: 'Aussetzen', count: 10, description: 'Diese Runde entfällt sofort.', color: 'warning' },
    { key: 'firework', title: 'Feuerwerk', count: 5, description: 'Bei ungültigem Wurf bleiben die in dieser Runde erspielten Punkte erhalten.', color: 'success' },
    { key: 'bonus200', title: '200 Extrapunkte', count: 5, description: 'Wenn alle 5 Würfel in Punkte umgewandelt werden, gibt es 200 Extrapunkte.', color: 'primary' },
    { key: 'bonus300', title: '300 Extrapunkte', count: 5, description: 'Wenn alle 5 Würfel in Punkte umgewandelt werden, gibt es 300 Extrapunkte.', color: 'primary' },
    { key: 'bonus400', title: '400 Extrapunkte', count: 5, description: 'Wenn alle 5 Würfel in Punkte umgewandelt werden, gibt es 400 Extrapunkte.', color: 'primary' },
    { key: 'bonus500', title: '500 Extrapunkte', count: 5, description: 'Wenn alle 5 Würfel in Punkte umgewandelt werden, gibt es 500 Extrapunkte.', color: 'primary' },
    { key: 'bonus600', title: '600 Extrapunkte', count: 5, description: 'Wenn alle 5 Würfel in Punkte umgewandelt werden, gibt es 600 Extrapunkte.', color: 'primary' },
    { key: 'double', title: 'Punkte verdoppeln', count: 2, description: 'Wenn alle 5 Würfel in Punkte umgewandelt werden, werden diese Bonuspunkte verdoppelt.', color: 'accent' },
    { key: 'plusminus', title: 'Plus/Minus', count: 5, description: 'Wenn alle 5 Würfel in Punkte umgewandelt werden, gilt +1000 für dich und -1000 für den Führenden. Geworfene Punkte zählen dann nicht.', color: 'danger' },
    { key: 'straight', title: 'Straße', count: 5, description: 'Statt normaler Wertung musst du 1-2-3-4-5 oder 2-3-4-5-6 schaffen. Erfolg bringt 2000 Punkte.', color: 'accent' },
    { key: 'clover', title: 'Kleeblatt', count: 1, description: 'Schaffe in zwei eigenen Runden hintereinander alle 5 Würfel in Punkte umzuwandeln. Dann gewinnst du sofort.', color: 'success' }
  ];

  app.config.CARD_TOTAL = app.config.CARD_DEFS.reduce(function (sum, card) {
    return sum + card.count;
  }, 0);

  app.config.CARD_LOOKUP = Object.fromEntries(
    app.config.CARD_DEFS.map(function (card) {
      return [
        card.key,
        {
          ...card,
          probability: Number(((card.count / app.config.CARD_TOTAL) * 100).toFixed(2))
        }
      ];
    })
  );
})(window.Punkteblock);