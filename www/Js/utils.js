(function (app) {
  app.utils.escapeHtml = function (value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  };

  app.utils.rollDie = function () {
    return Math.floor(Math.random() * 6) + 1;
  };

  app.utils.countValues = function (values) {
    var counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    values.forEach(function (v) {
      counts[v]++;
    });
    return counts;
  };

  app.utils.normalizePoints = function (value) {
    var num = Number(value);
    if (!Number.isFinite(num) || num < 0) return 0;
    return Math.round(num / 50) * 50;
  };

  app.utils.getSortedUnique = function (values) {
    return Array.from(new Set(values)).sort(function (a, b) {
      return a - b;
    });
  };
})(window.Punkteblock);