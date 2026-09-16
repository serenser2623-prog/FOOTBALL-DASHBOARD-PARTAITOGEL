(function () {
  "use strict";

  /* =========================================================
     CONFIG
  ========================================================= */

  var API_URL =
    "https://script.google.com/macros/s/AKfycbzXgqgcL8FcsxbDS8DSvi02StALKKzziSEU2RNs1izfy_HPHZbXIBWx2ZEuH0lFOaHa/exec";

  var APP = document.getElementById("nyuk-football-app");

  if (!APP) {
    console.error("Element #nyuk-football-app tidak ditemukan.");
    return;
  }

  var fixtures = [];
  var leagues = [];
  var currentDate = new Date();
  var requestCounter = 0;
  var predictionCache = {};

  /* =========================================================
     INIT
  ========================================================= */

  renderLoading();
  loadFixtures(currentDate);

  /* =========================================================
     JSONP
  ========================================================= */

  function jsonp(params, callback) {
    var callbackName =
      "nyukFootballCallback_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 100000);

    var script = document.createElement("script");

    var query = [];

    Object.keys(params).forEach(function (key) {
      query.push(
        encodeURIComponent(key) +
          "=" +
          encodeURIComponent(params[key])
      );
    });

    query.push("callback=" + encodeURIComponent(callbackName));

    var finished = false;

    window[callbackName] = function (data) {
      if (finished) return;

      finished = true;

      cleanup();

      callback(null, data);
    };

    function cleanup() {
      try {
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      } catch (e) {}

      try {
        delete window[callbackName];
      } catch (e) {
        window[callbackName] = undefined;
      }
    }

    script.onerror = function () {
      if (finished) return;

      finished = true;

      cleanup();

      callback(new Error("Gagal menghubungi server API."));
    };

    script.src = API_URL + "?" + query.join("&");

    document.body.appendChild(script);

    /* timeout */
    setTimeout(function () {
      if (finished) return;

      finished = true;

      cleanup();

      callback(
        new Error(
          "Request timeout. Server tidak memberikan respons."
        )
      );
    }, 30000);
  }

  /* =========================================================
     LOAD FIXTURES
  ========================================================= */

  function loadFixtures(date) {
    var requestId = ++requestCounter;

    renderLoading();

    var dateString = formatDate(date);

    jsonp(
      {
        endpoint: "fixtures",
        date: dateString,
        timezone: "Asia/Jakarta"
      },
      function (error, result) {
        if (requestId !== requestCounter) return;

        if (error) {
          console.error(error);

          renderError(
            "Gagal memuat pertandingan.<br>" +
              escapeHtml(error.message || "Unknown error")
          );

          return;
        }

        if (!result || !result.success) {
          renderError(
            (result && result.message) ||
              "Data pertandingan tidak tersedia."
          );

          return;
        }

        var response =
          result.data &&
          Array.isArray(result.data.response)
            ? result.data.response
            : [];

        fixtures = response;

        buildLeagueList();
        renderDashboard();
      }
    );
  }

  /* =========================================================
     BUILD LEAGUE LIST
  ========================================================= */

  function buildLeagueList() {
    var map = {};

    fixtures.forEach(function (match) {
      var league =
        match &&
        match.league
          ? match.league
          : {};

      var id = league.id;

      if (!id) return;

      if (!map[id]) {
        map[id] = {
          id: id,
          name: league.name || "Unknown League",
          logo: league.logo || ""
        };
      }
    });

    leagues = Object.keys(map).map(function (key) {
      return map[key];
    });

    leagues.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
  }

  /* =========================================================
     DASHBOARD
  ========================================================= */

  function renderDashboard() {
    APP.innerHTML =
      '<div class="nyuk-football-header">' +
        '<div>' +
          '<h1>FOOTBALL PREDIKSI PARTAITOGEL</h1>' +
          '<div class="nyuk-football-subtitle">' +
            'Prediksi pertandingan sepak bola' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="nyuk-football-filters">' +

        '<div class="nyuk-filter-group">' +
          '<label>TANGGAL</label>' +
          '<input ' +
            'type="date" ' +
            'id="nyuk-date-filter" ' +
            'value="' + formatDate(currentDate) + '"' +
          '>' +
        '</div>' +

        '<div class="nyuk-filter-group">' +
          '<label>LEAGUE</label>' +
          '<select id="nyuk-league-filter">' +
            '<option value="">SEMUA LEAGUE</option>' +
            leagues.map(function (league) {
              return (
                '<option value="' +
                escapeAttr(String(league.id)) +
                '">' +
                escapeHtml(league.name) +
                '</option>'
              );
            }).join("") +
          '</select>' +
        '</div>' +

        '<div class="nyuk-filter-group">' +
          '<label>CARI TEAM</label>' +
          '<input ' +
            'type="text" ' +
            'id="nyuk-search-filter" ' +
            'placeholder="Cari nama team..."' +
          '>' +
        '</div>' +

        '<button id="nyuk-refresh-btn" type="button">' +
          '🔄 REFRESH' +
        '</button>' +

      '</div>' +

      '<div id="nyuk-summary"></div>' +

      '<div id="nyuk-matches" class="nyuk-matches-grid"></div>';

    var dateFilter =
      document.getElementById("nyuk-date-filter");

    var leagueFilter =
      document.getElementById("nyuk-league-filter");

    var searchFilter =
      document.getElementById("nyuk-search-filter");

    var refreshButton =
      document.getElementById("nyuk-refresh-btn");

    if (dateFilter) {
      dateFilter.addEventListener("change", function () {
        var value = this.value;

        if (!value) return;

        var parts = value.split("-");

        currentDate = new Date(
          Number(parts[0]),
          Number(parts[1]) - 1,
          Number(parts[2])
        );

        loadFixtures(currentDate);
      });
    }

    if (leagueFilter) {
      leagueFilter.addEventListener(
        "change",
        updateMatches
      );
    }

    if (searchFilter) {
      searchFilter.addEventListener(
        "input",
        updateMatches
      );
    }

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        function () {
          loadFixtures(currentDate);
        }
      );
    }

    updateMatches();
  }

  /* =========================================================
     UPDATE MATCHES
  ========================================================= */

  function updateMatches() {
    var container =
      document.getElementById("nyuk-matches");

    if (!container) return;

    var leagueValue =
      document.getElementById(
        "nyuk-league-filter"
      );

    var searchValue =
      document.getElementById(
        "nyuk-search-filter"
      );

    var leagueId =
      leagueValue ? leagueValue.value : "";

    var search =
      searchValue
        ? searchValue.value.trim().toLowerCase()
        : "";

    var filtered = fixtures.filter(function (match) {
      var league =
        match && match.league
          ? match.league
          : {};

      var teams =
        match && match.teams
          ? match.teams
          : {};

      var home =
        teams.home && teams.home.name
          ? teams.home.name
          : "";

      var away =
        teams.away && teams.away.name
          ? teams.away.name
          : "";

      if (
        leagueId &&
        String(league.id) !== String(leagueId)
      ) {
        return false;
      }

      if (search) {
        var text =
          (home + " " + away + " " +
            (league.name || "")).toLowerCase();

        if (text.indexOf(search) === -1) {
          return false;
        }
      }

      return true;
    });

    var summary =
      document.getElementById("nyuk-summary");

    if (summary) {
      summary.innerHTML =
        "<strong>" +
        filtered.length +
        "</strong> pertandingan ditemukan";
    }

    if (!filtered.length) {
      container.innerHTML =
        '<div class="nyuk-empty">' +
          "Tidak ada pertandingan." +
        "</div>";

      return;
    }

    container.innerHTML = filtered
      .map(renderMatch)
      .join("");

    bindPredictionButtons();
  }

  /* =========================================================
     RENDER MATCH
  ========================================================= */

  function renderMatch(match) {
    var fixture =
      match && match.fixture
        ? match.fixture
        : {};

    var league =
      match && match.league
        ? match.league
        : {};

    var teams =
      match && match.teams
        ? match.teams
        : {};

    var home =
      teams.home || {};

    var away =
      teams.away || {};

    var fixtureId =
      fixture.id || "";

    var dateTime =
      fixture.date
        ? new Date(fixture.date)
        : null;

    var time =
      dateTime
        ? dateTime.toLocaleTimeString(
            "id-ID",
            {
              hour: "2-digit",
              minute: "2-digit"
            }
          )
        : "--:--";

    var status =
      fixture.status &&
      fixture.status.short
        ? fixture.status.short
        : "";

    return (
      '<div class="nyuk-match-card" data-fixture="' +
        escapeAttr(String(fixtureId)) +
      '">' +

        '<div class="nyuk-match-league">' +

          (
            league.logo
              ? '<img src="' +
                escapeAttr(league.logo) +
                '" alt="">'
              : ""
          ) +

          '<span>' +
            escapeHtml(
              league.name || "Unknown League"
            ) +
          '</span>' +

        '</div>' +

        '<div class="nyuk-match-time">' +
          '<strong>' +
            escapeHtml(time) +
          '</strong>' +

          (
            status
              ? '<span>' +
                  escapeHtml(status) +
                '</span>'
              : ""
          ) +

        '</div>' +

        '<div class="nyuk-teams">' +

          '<div class="nyuk-team">' +

            (
              home.logo
                ? '<img src="' +
                  escapeAttr(home.logo) +
                  '" alt="">'
                : ""
            ) +

            '<span>' +
              escapeHtml(
                home.name || "Home"
              ) +
            '</span>' +

          '</div>' +

          '<div class="nyuk-vs">VS</div>' +

          '<div class="nyuk-team">' +

            (
              away.logo
                ? '<img src="' +
                  escapeAttr(away.logo) +
                  '" alt="">'
                : ""
            ) +

            '<span>' +
              escapeHtml(
                away.name || "Away"
              ) +
            '</span>' +

          '</div>' +

        '</div>' +

        '<div class="nyuk-prediction-area">' +

          '<button ' +
            'type="button" ' +
            'class="nyuk-prediction-btn" ' +
            'data-fixture="' +
              escapeAttr(String(fixtureId)) +
            '">' +
            '🔮 LIHAT PREDIKSI' +
          '</button>' +

          '<div ' +
            'class="nyuk-prediction-detail" ' +
            'id="nyuk-prediction-' +
              escapeAttr(String(fixtureId)) +
            '">' +
          '</div>' +

        '</div>' +

      '</div>'
    );
  }

  /* =========================================================
     PREDICTION BUTTON
  ========================================================= */

  function bindPredictionButtons() {
    var buttons =
      APP.querySelectorAll(
        ".nyuk-prediction-btn"
      );

    Array.prototype.forEach.call(
      buttons,
      function (button) {
        button.addEventListener(
          "click",
          function () {
            var fixtureId =
              this.getAttribute(
                "data-fixture"
              );

            if (!fixtureId) return;

            loadPrediction(
              fixtureId,
              this
            );
          }
        );
      }
    );
  }

  /* =========================================================
     LOAD PREDICTION
  ========================================================= */

  function loadPrediction(
    fixtureId,
    button
  ) {
    var detail =
      document.getElementById(
        "nyuk-prediction-" +
        fixtureId
      );

    if (!detail) return;

    if (
      detail.classList.contains(
        "is-open"
      )
    ) {
      detail.classList.remove(
        "is-open"
      );

      detail.innerHTML = "";

      button.textContent =
        "🔮 LIHAT PREDIKSI";

      return;
    }

    detail.classList.add("is-open");

    button.textContent =
      "⏳ MEMUAT PREDIKSI...";

    if (
      predictionCache[fixtureId]
    ) {
      renderPrediction(
        detail,
        predictionCache[fixtureId]
      );

      button.textContent =
        "🔽 TUTUP PREDIKSI";

      return;
    }

    detail.innerHTML =
      '<div class="nyuk-prediction-loading">' +
        "⏳ Mengambil analisa..." +
      "</div>";

    jsonp(
      {
        endpoint: "predictions",
        fixture: fixtureId
      },
      function (error, result) {
        if (error) {
          detail.innerHTML =
            '<div class="nyuk-prediction-error">' +
              escapeHtml(
                error.message ||
                "Gagal mengambil prediksi."
              ) +
            "</div>";

          button.textContent =
            "🔮 COBA LAGI";

          return;
        }

        if (
          !result ||
          !result.success
        ) {
          detail.innerHTML =
            '<div class="nyuk-prediction-error">' +
              escapeHtml(
                (
                  result &&
                  result.message
                ) ||
                "Prediksi tidak tersedia."
              ) +
            "</div>";

          button.textContent =
            "🔮 COBA LAGI";

          return;
        }

        var response =
          result.data &&
          Array.isArray(
            result.data.response
          )
            ? result.data.response
            : [];

        if (!response.length) {
          detail.innerHTML =
            '<div class="nyuk-prediction-error">' +
              "Prediksi untuk pertandingan ini belum tersedia." +
            "</div>";

          button.textContent =
            "🔮 COBA LAGI";

          return;
        }

        var prediction =
          response[0];

        predictionCache[
          fixtureId
        ] = prediction;

        renderPrediction(
          detail,
          prediction
        );

        button.textContent =
          "🔽 TUTUP PREDIKSI";
      }
    );
  }

  /* =========================================================
     RENDER PREDICTION
  ========================================================= */

  function renderPrediction(
    detail,
    data
  ) {
    var prediction =
      data.predictions || {};

    var winner =
      prediction.winner || {};

    var percent =
      prediction.percent || {};

    var goals =
      prediction.goals || {};

    /*
     * API-FOOTBALL dapat mengirim nilai seperti:
     *
     * home = "-2.5"
     * away = "-1.5"
     *
     * Itu BUKAN berarti -2.5 dan -1.5 gol.
     *
     * Untuk tampilan dashboard kita konversi:
     *
     * -2.5 -> 2
     * -1.5 -> 1
     *
     * sehingga menjadi:
     *
     * 2 : 1
     */

    var homeGoal =
      normalizePredictionGoal(
        goals.home
      );

    var awayGoal =
      normalizePredictionGoal(
        goals.away
      );

    var score =
      homeGoal !== "—" &&
      awayGoal !== "—"
        ? homeGoal + " : " + awayGoal
        : "—";

    var winnerName =
      winner.name ||
      "No clear prediction";

    var underOver =
      normalizeUnderOver(
        prediction.under_over
      );

    var advice =
      prediction.advice ||
      "Analisa tersedia";

    var handicap =
      buildHandicapPrediction(
        prediction,
        winner,
        homeGoal,
        awayGoal
      );

    detail.innerHTML =
      '<div class="nyuk-prediction-box">' +

        '<div class="nyuk-prediction-title">' +
          '🔮 PREDIKSI PERTANDINGAN' +
        '</div>' +

        '<div class="nyuk-prediction-grid">' +

          '<div class="nyuk-prediction-item score">' +
            '<small>PREDIKSI SKOR</small>' +
            '<strong>' +
              escapeHtml(score) +
            '</strong>' +
          '</div>' +

          '<div class="nyuk-prediction-item">' +
            '<small>HANDICAP</small>' +
            '<strong>' +
              escapeHtml(handicap) +
            '</strong>' +
          '</div>' +

          '<div class="nyuk-prediction-item">' +
            '<small>OVER / UNDER</small>' +
            '<strong>' +
              escapeHtml(underOver) +
            '</strong>' +
          '</div>' +

          '<div class="nyuk-prediction-item">' +
            '<small>1X2</small>' +
            '<strong>' +
              escapeHtml(winnerName) +
            '</strong>' +
          '</div>' +

        '</div>' +

        '<div class="nyuk-prediction-extra">' +

          '<div>' +
            '<span>SKOR AKURAT</span>' +
            '<b>' +
              escapeHtml(score) +
            '</b>' +
          '</div>' +

          '<div>' +
            '<span>HOME</span>' +
            '<b>' +
              escapeHtml(
                formatPercent(
                  percent.home
                )
              ) +
            '</b>' +
          '</div>' +

          '<div>' +
            '<span>DRAW</span>' +
            '<b>' +
              escapeHtml(
                formatPercent(
                  percent.draw
                )
              ) +
            '</b>' +
          '</div>' +

          '<div>' +
            '<span>AWAY</span>' +
            '<b>' +
              escapeHtml(
                formatPercent(
                  percent.away
                )
              ) +
            '</b>' +
          '</div>' +

        '</div>' +

        '<div class="nyuk-prediction-advice">' +
          '<small>ADVICE</small>' +
          '<div>' +
            escapeHtml(advice) +
          '</div>' +
        '</div>' +

      '</div>';
  }

  /* =========================================================
     NORMALIZE PREDICTED GOALS
  ========================================================= */

  function normalizePredictionGoal(
    value
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    var raw =
      String(value)
        .trim()
        .replace(",", ".");

    var number =
      parseFloat(raw);

    if (isNaN(number)) {
      return "—";
    }

    /*
     * API-Football prediction goal values
     * dapat memakai format negatif seperti
     * -2.5 / -1.5 sebagai batas jumlah gol.
     *
     * Untuk UI skor:
     * -2.5 -> 2
     * -1.5 -> 1
     * -0.5 -> 0
     */

    if (number < 0) {
      return String(
        Math.floor(
          Math.abs(number)
        )
      );
    }

    return String(
      Math.round(number)
    );
  }

  /* =========================================================
     NORMALIZE OVER / UNDER
  ========================================================= */

  function normalizeUnderOver(
    value
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    var raw =
      String(value)
        .trim();

    if (!raw) {
      return "—";
    }

    var lower =
      raw.toLowerCase();

    /*
     * Kalau API sudah mengirim:
     *
     * Over 2.5
     * Under 2.5
     *
     * kita langsung rapikan.
     */

    var numberMatch =
      raw.match(
        /(\d+(?:\.\d+)?)/
      );

    var number =
      numberMatch
        ? numberMatch[1]
        : "";

    if (
      lower.indexOf("under") !== -1
    ) {
      return number
        ? "UNDER " + number
        : "UNDER";
    }

    if (
      lower.indexOf("over") !== -1
    ) {
      return number
        ? "OVER " + number
        : "OVER";
    }

    /*
     * Format API yang menggunakan:
     *
     * -3.5 = UNDER 3.5
     *  3.5 = OVER 3.5
     */

    var numeric =
      parseFloat(
        raw.replace(",", ".")
      );

    if (!isNaN(numeric)) {
      var absoluteValue =
        Math.abs(numeric);

      if (numeric < 0) {
        return (
          "UNDER " +
          absoluteValue
        );
      }

      return (
        "OVER " +
        absoluteValue
      );
    }

    /*
     * Fallback kalau format aneh
     * seperti "--2.5"
     */

    var fallback =
      raw.match(
        /(\d+(?:\.\d+)?)/
      );

    if (fallback) {
      if (
        raw.indexOf("-") !== -1
      ) {
        return (
          "UNDER " +
          fallback[1]
        );
      }

      return (
        "OVER " +
        fallback[1]
      );
    }

    return raw;
  }

  /* =========================================================
     HANDICAP
  ========================================================= */

  function buildHandicapPrediction(
    prediction,
    winner,
    homeGoal,
    awayGoal
  ) {
    if (
      homeGoal === "—" ||
      awayGoal === "—"
    ) {
      return "—";
    }

    var home =
      Number(homeGoal);

    var away =
      Number(awayGoal);

    if (home > away) {
      return "HOME";
    }

    if (away > home) {
      return "AWAY";
    }

    return "LEVEL";
  }

  /* =========================================================
     FORMAT PERCENT
  ========================================================= */

  function formatPercent(
    value
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    var raw =
      String(value).trim();

    if (
      raw.indexOf("%") !== -1
    ) {
      return raw;
    }

    return raw + "%";
  }

  /* =========================================================
     LOADING
  ========================================================= */

  function renderLoading() {
    APP.innerHTML =
      '<div class="nyuk-loading">' +
        '<div class="nyuk-loading-spinner"></div>' +
        '<div>MEMUAT PERTANDINGAN...</div>' +
      '</div>';
  }

  /* =========================================================
     ERROR
  ========================================================= */

  function renderError(
    message
  ) {
    APP.innerHTML =
      '<div class="nyuk-error">' +
        '<strong>⚠️ TERJADI KESALAHAN</strong>' +
        '<div>' +
          message +
        '</div>' +
      '</div>';
  }

  /* =========================================================
     DATE
  ========================================================= */

  function formatDate(
    date
  ) {
    var year =
      date.getFullYear();

    var month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    var day =
      String(
        date.getDate()
      ).padStart(2, "0");

    return (
      year +
      "-" +
      month +
      "-" +
      day
    );
  }

  /* =========================================================
     ESCAPE HTML
  ========================================================= */

  function escapeHtml(
    value
  ) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* =========================================================
     ESCAPE ATTRIBUTE
  ========================================================= */

  function escapeAttr(
    value
  ) {
    return escapeHtml(value);
  }

})();
