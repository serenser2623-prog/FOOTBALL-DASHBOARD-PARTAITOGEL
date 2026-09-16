(function () {
  "use strict";

  /* =========================================================
     CONFIG
  ========================================================= */

  var API_URL =
    "https://script.google.com/macros/s/AKfycbzXgqgcL8FcsxbDS8DSvi02StALKKzziSEU2RNs1izfy_HPHZbXIBWx2ZEuH0lFOaHa/exec";

  var APP = document.getElementById("nyuk-football-app");

  var fixtures = [];
  var leagues = [];
  var currentDate = new Date();

  var requestCounter = 0;
  var predictionCache = {};

  /* =========================================================
     INIT
  ========================================================= */

  init();

  function init() {
    renderLoading("Menghubungkan ke server pertandingan...");
    loadFixtures(currentDate);
  }

  /* =========================================================
     JSONP
  ========================================================= */

  function jsonp(params) {
    return new Promise(function (resolve, reject) {

      var callbackName =
        "nyukFootballCallback_" +
        Date.now() +
        "_" +
        Math.floor(Math.random() * 100000);

      var script = document.createElement("script");

      var timeout = setTimeout(function () {

        cleanup();

        reject(
          new Error(
            "Server tidak merespons dalam waktu yang ditentukan."
          )
        );

      }, 30000);

      function cleanup() {

        clearTimeout(timeout);

        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }

        try {
          delete window[callbackName];
        } catch (e) {
          window[callbackName] = undefined;
        }
      }

      window[callbackName] = function (data) {

        cleanup();

        resolve(data);

      };

      script.onerror = function () {

        cleanup();

        reject(
          new Error(
            "Gagal terhubung ke server Google Apps Script."
          )
        );

      };

      var query = [];

      Object.keys(params || {}).forEach(function (key) {

        var value = params[key];

        if (
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {
          query.push(
            encodeURIComponent(key) +
            "=" +
            encodeURIComponent(value)
          );
        }

      });

      query.push(
        "callback=" +
        encodeURIComponent(callbackName)
      );

      script.src =
        API_URL +
        (API_URL.indexOf("?") >= 0 ? "&" : "?") +
        query.join("&");

      document.body.appendChild(script);
    });
  }

  /* =========================================================
     LOAD FIXTURES
  ========================================================= */

  async function loadFixtures(date) {

    var requestId = ++requestCounter;

    renderLoading(
      "Menghubungkan ke server pertandingan..."
    );

    try {

      var dateString =
        formatDateForApi(date);

      var result = await jsonp({

        endpoint: "fixtures",

        date: dateString,

        timezone: "Asia/Jakarta"

      });

      console.log(
        "FOOTBALL FIXTURES RESPONSE:",
        result
      );

      if (requestId !== requestCounter) {
        return;
      }

      if (!result) {
        throw new Error(
          "Server tidak memberikan response."
        );
      }

      /*
       * Apps Script wrapper:
       * {
       *   success: true,
       *   httpCode: 200,
       *   cached: false,
       *   data: {
       *      response: [...]
       *   }
       * }
       */

      if (result.success === false) {

        var serverMessage =
          result.message ||
          result.error ||
          (
            result.data &&
            result.data.message
          ) ||
          "Server API gagal mengambil pertandingan.";

        throw new Error(serverMessage);
      }

      var responseData = [];

      /* FORMAT 1
         result.data.response
      */

      if (
        result.data &&
        Array.isArray(result.data.response)
      ) {

        responseData =
          result.data.response;

      }

      /* FORMAT 2
         result.response
      */

      else if (
        Array.isArray(result.response)
      ) {

        responseData =
          result.response;

      }

      /* FORMAT 3
         result.data
      */

      else if (
        Array.isArray(result.data)
      ) {

        responseData =
          result.data;

      }

      /* FORMAT 4
         result.data.data.response
      */

      else if (
        result.data &&
        result.data.data &&
        Array.isArray(
          result.data.data.response
        )
      ) {

        responseData =
          result.data.data.response;

      }

      /* FORMAT 5
         result.result.response
      */

      else if (
        result.result &&
        Array.isArray(result.result.response)
      ) {

        responseData =
          result.result.response;

      }

      fixtures =
        Array.isArray(responseData)
          ? responseData
          : [];

      console.log(
        "FOOTBALL FIXTURES TOTAL:",
        fixtures.length
      );

      buildLeagueList();

      renderDashboard();

    } catch (error) {

      console.error(
        "FOOTBALL LOAD FIXTURES ERROR:",
        error
      );

      if (requestId !== requestCounter) {
        return;
      }

      renderError(
        error &&
        error.message
          ? error.message
          : "Gagal mengambil data pertandingan."
      );
    }
  }

  /* =========================================================
     LEAGUE LIST
  ========================================================= */

  function buildLeagueList() {

    var map = {};

    fixtures.forEach(function (item) {

      if (!item || !item.league) {
        return;
      }

      var leagueId =
        item.league.id;

      var leagueName =
        item.league.name ||
        "Unknown League";

      var country =
        item.league.country ||
        "";

      if (leagueId === undefined) {
        return;
      }

      var key =
        String(leagueId);

      if (!map[key]) {

        map[key] = {

          id: leagueId,

          name: leagueName,

          country: country

        };

      }

    });

    leagues =
      Object.keys(map)
        .map(function (key) {
          return map[key];
        })
        .sort(function (a, b) {

          return String(a.name)
            .localeCompare(
              String(b.name)
            );

        });
  }

  /* =========================================================
     DASHBOARD
  ========================================================= */

  function renderDashboard() {

    APP.innerHTML =

      '<div class="nf-header nf-glass">' +

        '<div class="nf-brand">' +

          '<div class="nf-title">' +
            'FOOTBALL PREDIKSI PARTAITOGEL' +
          '</div>' +

          '<div class="nf-subtitle">' +
            'LIVE FOOTBALL MATCH & PREDICTION' +
          '</div>' +

        '</div>' +

        '<div class="nf-status">' +

          '<span class="nf-status-dot"></span>' +

          '<span>SERVER ONLINE</span>' +

        '</div>' +

      '</div>' +

      '<div class="nf-filter nf-glass">' +

        '<input ' +
          'type="date" ' +
          'id="nf-date-filter" ' +
          'class="nf-input" ' +
          'value="' +
            escapeAttr(
              formatDateForApi(currentDate)
            ) +
          '"' +
        '>' +

        '<select ' +
          'id="nf-league-filter" ' +
          'class="nf-select"' +
        '>' +

          '<option value="all">' +
            'SEMUA LIGA' +
          '</option>' +

          leagues.map(function (league) {

            return (
              '<option value="' +
                escapeAttr(
                  String(league.id)
                ) +
              '">' +

                escapeHtml(
                  league.name
                ) +

                (
                  league.country
                    ? " - " +
                      escapeHtml(
                        league.country
                      )
                    : ""
                ) +

              '</option>'
            );

          }).join("") +

        '</select>' +

        '<input ' +
          'type="text" ' +
          'id="nf-search-filter" ' +
          'class="nf-input nf-search" ' +
          'placeholder="Cari team / pertandingan..."' +
        '>' +

        '<button ' +
          'id="nf-refresh-btn" ' +
          'class="nf-button" ' +
          'type="button"' +
        '>' +

          'REFRESH' +

        '</button>' +

      '</div>' +

      '<div id="nf-summary" class="nf-summary nf-glass"></div>' +

      '<div id="nf-matches" class="nf-grid"></div>';

    bindFilters();

    updateMatches();
  }

  /* =========================================================
     FILTER
  ========================================================= */

  function bindFilters() {

    var dateInput =
      document.getElementById(
        "nf-date-filter"
      );

    var leagueInput =
      document.getElementById(
        "nf-league-filter"
      );

    var searchInput =
      document.getElementById(
        "nf-search-filter"
      );

    var refreshButton =
      document.getElementById(
        "nf-refresh-btn"
      );

    if (dateInput) {

      dateInput.addEventListener(
        "change",
        function () {

          var value =
            dateInput.value;

          if (!value) {
            return;
          }

          currentDate =
            parseApiDate(value);

          loadFixtures(
            currentDate
          );

        }
      );

    }

    if (leagueInput) {

      leagueInput.addEventListener(
        "change",
        updateMatches
      );

    }

    if (searchInput) {

      searchInput.addEventListener(
        "input",
        updateMatches
      );

    }

    if (refreshButton) {

      refreshButton.addEventListener(
        "click",
        function () {

          loadFixtures(
            currentDate
          );

        }
      );

    }
  }

  /* =========================================================
     UPDATE MATCHES
  ========================================================= */

  function updateMatches() {

    var container =
      document.getElementById(
        "nf-matches"
      );

    var summary =
      document.getElementById(
        "nf-summary"
      );

    if (!container) {
      return;
    }

    var leagueFilter =
      document.getElementById(
        "nf-league-filter"
      );

    var searchFilter =
      document.getElementById(
        "nf-search-filter"
      );

    var leagueValue =
      leagueFilter
        ? leagueFilter.value
        : "all";

    var searchValue =
      searchFilter
        ? searchFilter.value
            .trim()
            .toLowerCase()
        : "";

    var filtered =
      fixtures.filter(function (item) {

        if (!item) {
          return false;
        }

        var leagueId =
          item.league &&
          item.league.id;

        if (
          leagueValue !== "all" &&
          String(leagueId) !==
            String(leagueValue)
        ) {

          return false;

        }

        if (searchValue) {

          var home =
            item.teams &&
            item.teams.home &&
            item.teams.home.name
              ? item.teams.home.name
              : "";

          var away =
            item.teams &&
            item.teams.away &&
            item.teams.away.name
              ? item.teams.away.name
              : "";

          var league =
            item.league &&
            item.league.name
              ? item.league.name
              : "";

          var combined =
            (
              home +
              " " +
              away +
              " " +
              league
            ).toLowerCase();

          if (
            combined.indexOf(
              searchValue
            ) === -1
          ) {

            return false;

          }

        }

        return true;

      });

    if (summary) {

      summary.innerHTML =

        '<div class="nf-count">' +
          filtered.length +
          ' MATCH' +
          (
            filtered.length === 1
              ? ""
              : "ES"
          ) +
        '</div>' +

        '<div class="nf-date-title">' +
          formatDisplayDate(
            currentDate
          ) +
        '</div>';

    }

    if (!filtered.length) {

      container.innerHTML =

        '<div class="nf-message nf-glass">' +

          '<div class="nf-message-title">' +
            'DATA PERTANDINGAN TIDAK TERSEDIA' +
          '</div>' +

          '<div class="nf-message-text">' +
            'Tidak ada pertandingan pada tanggal atau filter yang dipilih.' +
          '</div>' +

        '</div>';

      return;
    }

    container.innerHTML =
      filtered.map(renderMatch).join("");

    bindPredictionButtons();
  }

  /* =========================================================
     RENDER MATCH
  ========================================================= */

  function renderMatch(item) {

    var fixture =
      item.fixture || {};

    var league =
      item.league || {};

    var teams =
      item.teams || {};

    var home =
      teams.home || {};

    var away =
      teams.away || {};

    var fixtureId =
      fixture.id || "";

    var date =
      fixture.date
        ? new Date(fixture.date)
        : null;

    var time =
      date
        ? date.toLocaleTimeString(
            "id-ID",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone:
                "Asia/Jakarta"
            }
          )
        : "--:--";

    var status =
      fixture.status || {};

    var statusText =
      getStatusText(status);

    var leagueName =
      league.name ||
      "Unknown League";

    var country =
      league.country ||
      "";

    var homeName =
      home.name ||
      "HOME";

    var awayName =
      away.name ||
      "AWAY";

    var homeLogo =
      home.logo || "";

    var awayLogo =
      away.logo || "";

    return (

      '<div class="nf-match nf-glass">' +

        '<div class="nf-league">' +

          '<div class="nf-league-name">' +
            escapeHtml(
              leagueName
            ) +
          '</div>' +

          (
            country
              ? '<div class="nf-country">' +
                  escapeHtml(country) +
                '</div>'
              : ""
          ) +

        '</div>' +

        '<div class="nf-time">' +

          '<div class="nf-hour">' +
            escapeHtml(time) +
          '</div>' +

          '<div class="nf-status-text">' +
            escapeHtml(statusText) +
          '</div>' +

        '</div>' +

        '<div class="nf-teams">' +

          '<div class="nf-team">' +

            (
              homeLogo
                ? '<img src="' +
                    escapeAttr(homeLogo) +
                    '" alt="" loading="lazy">'
                : ""
            ) +

            '<div class="nf-team-name">' +
              escapeHtml(homeName) +
            '</div>' +

          '</div>' +

          '<div class="nf-vs">VS</div>' +

          '<div class="nf-team nf-team-away">' +

            (
              awayLogo
                ? '<img src="' +
                    escapeAttr(awayLogo) +
                    '" alt="" loading="lazy">'
                : ""
            ) +

            '<div class="nf-team-name">' +
              escapeHtml(awayName) +
            '</div>' +

          '</div>' +

        '</div>' +

        '<div class="nf-prediction">' +

          '<div class="nf-prediction-title">' +
            'PREDIKSI' +
          '</div>' +

          '<button ' +
            'class="nf-button nf-prediction-button" ' +
            'type="button" ' +
            'data-fixture="' +
              escapeAttr(
                String(fixtureId)
              ) +
            '"' +
          '>' +

            'LIHAT PREDIKSI' +

          '</button>' +

          '<div ' +
            'class="nf-prediction-detail" ' +
            'id="nf-prediction-' +
              escapeAttr(
                String(fixtureId)
              ) +
            '"' +
          '></div>' +

        '</div>' +

      '</div>'

    );
  }

  /* =========================================================
     STATUS
  ========================================================= */

  function getStatusText(status) {

    if (!status) {
      return "UPCOMING";
    }

    var short =
      status.short || "";

    var elapsed =
      status.elapsed;

    if (
      short === "1H" ||
      short === "2H"
    ) {

      return (
        "LIVE" +
        (
          elapsed
            ? " " + elapsed + "'"
            : ""
        )
      );

    }

    if (short === "HT") {
      return "HALFTIME";
    }

    if (
      short === "FT" ||
      short === "AET" ||
      short === "PEN"
    ) {

      return "FINISHED";

    }

    if (
      short === "PST" ||
      short === "CANC" ||
      short === "ABD"
    ) {

      return (
        status.long ||
        short
      );

    }

    return (
      status.long ||
      "UPCOMING"
    );
  }

  /* =========================================================
     PREDICTION BUTTON
  ========================================================= */

  function bindPredictionButtons() {

    var buttons =
      document.querySelectorAll(
        ".nf-prediction-button"
      );

    Array.prototype.forEach.call(
      buttons,
      function (button) {

        button.addEventListener(
          "click",
          function () {

            var fixtureId =
              button.getAttribute(
                "data-fixture"
              );

            if (!fixtureId) {
              return;
            }

            loadPrediction(
              fixtureId,
              button
            );

          }
        );

      }
    );
  }

  /* =========================================================
     LOAD PREDICTION
  ========================================================= */

  async function loadPrediction(
    fixtureId,
    button
  ) {

    var detail =
      document.getElementById(
        "nf-prediction-" +
        fixtureId
      );

    if (!detail) {
      return;
    }

    if (
      detail.classList.contains(
        "nf-prediction-open"
      )
    ) {

      detail.classList.remove(
        "nf-prediction-open"
      );

      return;
    }

    detail.classList.add(
      "nf-prediction-open"
    );

    detail.innerHTML =

      '<div class="nf-prediction-loading">' +

        '<div class="nf-mini-loader"></div>' +

        '<span>' +
          'Menganalisa pertandingan...' +
        '</span>' +

      '</div>';

    button.disabled = true;

    try {

      if (
        predictionCache[
          String(fixtureId)
        ]
      ) {

        renderPrediction(
          detail,
          predictionCache[
            String(fixtureId)
          ]
        );

        button.disabled = false;

        return;
      }

      var result =
        await jsonp({

          endpoint: "predictions",

          fixture: fixtureId

        });

      console.log(
        "PREDICTION RESPONSE " +
        fixtureId +
        ":",
        result
      );

      if (!result) {
        throw new Error(
          "Response prediction kosong."
        );
      }

      if (
        result.success === false
      ) {

        throw new Error(
          result.message ||
          "Prediction API gagal."
        );

      }

      var predictionData =
        extractPredictionData(
          result
        );

      /*
       * Simpan fixture ID supaya
       * generator random stabil.
       */

      predictionData.__fixtureId =
        String(fixtureId);

      predictionCache[
        String(fixtureId)
      ] = predictionData;

      renderPrediction(
        detail,
        predictionData
      );

    } catch (error) {

      console.error(
        "PREDICTION ERROR:",
        error
      );

      detail.innerHTML =

        '<div class="nf-prediction-error">' +

          escapeHtml(
            error &&
            error.message
              ? error.message
              : "Gagal memuat prediksi."
          ) +

        '</div>';

    } finally {

      button.disabled = false;

    }
  }

  /* =========================================================
     EXTRACT PREDICTION
  ========================================================= */

  function extractPredictionData(result) {

    var response = null;

    if (
      result.data &&
      Array.isArray(
        result.data.response
      )
    ) {

      response =
        result.data.response;

    } else if (
      Array.isArray(
        result.response
      )
    ) {

      response =
        result.response;

    } else if (
      result.data &&
      result.data.data &&
      Array.isArray(
        result.data.data.response
      )
    ) {

      response =
        result.data.data.response;

    } else if (
      Array.isArray(result.data)
    ) {

      response =
        result.data;

    }

    if (
      response &&
      response.length
    ) {

      return response[0] || {};

    }

    return {};
  }

  /* =========================================================
     RANDOM PREDICTION
  ========================================================= */

  function generateRandomPrediction(
    fixtureId
  ) {

    var seed =
      createSeed(
        String(fixtureId)
      );

    var random =
      seededRandom(seed);

    /*
     * Skor dibuat tetap untuk fixture
     * yang sama, tetapi berbeda antar
     * pertandingan.
     */

    var scoreOptions = [

      [1, 0],

      [0, 1],

      [1, 1],

      [2, 0],

      [0, 2],

      [2, 1],

      [1, 2],

      [2, 2],

      [3, 0],

      [0, 3],

      [3, 1],

      [1, 3],

      [3, 2],

      [2, 3],

      [4, 1],

      [1, 4],

      [0, 0]

    ];

    var score =
      scoreOptions[
        Math.floor(
          random() *
          scoreOptions.length
        )
      ];

    var homeGoals =
      score[0];

    var awayGoals =
      score[1];

    var total =
      homeGoals +
      awayGoals;

    var ouOptions;

    if (total >= 4) {

      ouOptions = [
        "OVER 2.5",
        "OVER 3.5",
        "OVER 1.5"
      ];

    } else if (total === 3) {

      ouOptions = [
        "OVER 2.5",
        "UNDER 3.5",
        "OVER 1.5"
      ];

    } else if (total === 2) {

      ouOptions = [
        "UNDER 2.5",
        "OVER 1.5",
        "UNDER 3.5"
      ];

    } else if (total === 1) {

      ouOptions = [
        "UNDER 2.5",
        "UNDER 1.5"
      ];

    } else {

      ouOptions = [
        "UNDER 1.5",
        "UNDER 2.5"
      ];

    }

    var ou =
      ouOptions[
        Math.floor(
          random() *
          ouOptions.length
        )
      ];

    var adviceOptions = [

      "HOME WIN",

      "AWAY WIN",

      "DRAW",

      "OVER 2.5",

      "UNDER 2.5",

      "GOALS EXPECTED",

      "BALANCED MATCH"

    ];

    var advice =
      adviceOptions[
        Math.floor(
          random() *
          adviceOptions.length
        )
      ];

    /*
     * Persentase juga dibuat masuk akal
     * dan totalnya 100%.
     */

    var homePercent =
      Math.floor(
        28 +
        random() * 38
      );

    var drawPercent =
      Math.floor(
        18 +
        random() * 24
      );

    var awayPercent =
      100 -
      homePercent -
      drawPercent;

    if (awayPercent < 15) {

      awayPercent = 15;

      drawPercent =
        100 -
        homePercent -
        awayPercent;

    }

    return {

      score:
        homeGoals +
        " : " +
        awayGoals,

      homeGoals:
        homeGoals,

      awayGoals:
        awayGoals,

      under_over:
        ou,

      advice:
        advice,

      percent: {

        home:
          homePercent + "%",

        draw:
          drawPercent + "%",

        away:
          awayPercent + "%"

      }

    };
  }

  /* =========================================================
     RENDER PREDICTION
  ========================================================= */

  function renderPrediction(
    detail,
    data
  ) {

    var randomPrediction =
      generateRandomPrediction(
        data.__fixtureId ||
        Date.now()
      );

    var score =
      randomPrediction.score;

    var underOver =
      randomPrediction.under_over;

    var advice =
      randomPrediction.advice;

    var percent =
      randomPrediction.percent;

    var winnerText =
      getWinnerText(
        percent
      );

    detail.innerHTML =

      '<div class="nf-prediction-box">' +

        '<div class="nf-prediction-box-header">' +

          '<span>PREDICTION ANALYSIS</span>' +

          '<span>AI MATCH DATA</span>' +

        '</div>' +

        '<div class="nf-score-label">' +
          'PREDICTED SCORE' +
        '</div>' +

        '<div class="nf-predicted-score">' +
          escapeHtml(score) +
        '</div>' +

        '<div class="nf-prediction-grid">' +

          '<div class="nf-pick-card">' +

            '<div class="nf-pick-title">' +
              'OVER / UNDER' +
            '</div>' +

            '<div class="nf-pick-value">' +
              escapeHtml(
                underOver
              ) +
            '</div>' +

            '<div class="nf-pick-small">' +
              'GOALS MARKET' +
            '</div>' +

          '</div>' +

          '<div class="nf-pick-card">' +

            '<div class="nf-pick-title">' +
              'ADVICE' +
            '</div>' +

            '<div class="nf-pick-value">' +
              escapeHtml(advice) +
            '</div>' +

            '<div class="nf-pick-small">' +
              'MATCH OUTLOOK' +
            '</div>' +

          '</div>' +

        '</div>' +

        '<div class="nf-percent-section">' +

          '<div class="nf-percent-title">' +
            'WIN PROBABILITY' +
          '</div>' +

          '<div class="nf-percent-row">' +

            '<div class="nf-percent-item">' +

              '<span>HOME</span>' +

              '<strong>' +
                escapeHtml(
                  percent.home
                ) +
              '</strong>' +

            '</div>' +

            '<div class="nf-percent-item">' +

              '<span>DRAW</span>' +

              '<strong>' +
                escapeHtml(
                  percent.draw
                ) +
              '</strong>' +

            '</div>' +

            '<div class="nf-percent-item">' +

              '<span>AWAY</span>' +

              '<strong>' +
                escapeHtml(
                  percent.away
                ) +
              '</strong>' +

            '</div>' +

          '</div>' +

        '</div>' +

        '<div class="nf-advice">' +

          '<div class="nf-advice-title">' +
            'MATCH OUTLOOK' +
          '</div>' +

          '<div class="nf-advice-value">' +
            escapeHtml(
              winnerText
            ) +
          '</div>' +

        '</div>' +

        '<div class="nf-winner-line">' +
          'Prediction generated for this fixture' +
        '</div>' +

      '</div>';
  }

  /* =========================================================
     WINNER TEXT
  ========================================================= */

  function getWinnerText(percent) {

    var home =
      parseInt(
        percent.home,
        10
      ) || 0;

    var draw =
      parseInt(
        percent.draw,
        10
      ) || 0;

    var away =
      parseInt(
        percent.away,
        10
      ) || 0;

    if (
      home >= draw &&
      home >= away
    ) {

      return "HOME SIDE";

    }

    if (
      away >= home &&
      away >= draw
    ) {

      return "AWAY SIDE";

    }

    return "DRAW";
  }

  /* =========================================================
     RANDOM HELPERS
  ========================================================= */

  function createSeed(value) {

    var hash = 0;

    for (
      var i = 0;
      i < value.length;
      i++
    ) {

      hash =
        (
          (
            hash << 5
          ) -
          hash +
          value.charCodeAt(i)
        ) |
        0;

    }

    return Math.abs(hash) || 1;
  }

  function seededRandom(seed) {

    var x = seed;

    return function () {

      x =
        (
          x * 1664525 +
          1013904223
        ) %
        4294967296;

      return x /
        4294967296;

    };
  }

  /* =========================================================
     LOADING
  ========================================================= */

  function renderLoading(
    message
  ) {

    APP.innerHTML =

      '<div class="nf-loading-screen">' +

        '<div class="nf-loader"></div>' +

        '<div class="nf-loading-title">' +
          'FOOTBALL PREDIKSI PARTAITOGEL' +
        '</div>' +

        '<div class="nf-loading-text">' +
          escapeHtml(
            message ||
            "Memuat data pertandingan..."
          ) +
        '</div>' +

      '</div>';
  }

  /* =========================================================
     ERROR
  ========================================================= */

  function renderError(
    message
  ) {

    APP.innerHTML =

      '<div class="nf-message nf-glass">' +

        '<div class="nf-message-title">' +
          'GAGAL MEMUAT DATA' +
        '</div>' +

        '<div class="nf-message-text">' +

          escapeHtml(
            message ||
            "Terjadi kesalahan saat mengambil data."
          ) +

        '</div>' +

        '<button ' +
          'type="button" ' +
          'class="nf-button" ' +
          'id="nf-error-retry"' +
        '>' +

          'COBA LAGI' +

        '</button>' +

      '</div>';

    var retry =
      document.getElementById(
        "nf-error-retry"
      );

    if (retry) {

      retry.addEventListener(
        "click",
        function () {

          loadFixtures(
            currentDate
          );

        }
      );

    }
  }

  /* =========================================================
     DATE
  ========================================================= */

  function formatDateForApi(date) {

    var d =
      new Date(date);

    var year =
      d.getFullYear();

    var month =
      String(
        d.getMonth() + 1
      ).padStart(2, "0");

    var day =
      String(
        d.getDate()
      ).padStart(2, "0");

    return (
      year +
      "-" +
      month +
      "-" +
      day
    );
  }

  function parseApiDate(
    value
  ) {

    var parts =
      value.split("-");

    if (
      parts.length !== 3
    ) {

      return new Date();

    }

    return new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );
  }

  function formatDisplayDate(
    date
  ) {

    try {

      return new Intl.DateTimeFormat(
        "id-ID",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }
      ).format(date);

    } catch (e) {

      return formatDateForApi(
        date
      );

    }
  }

  /* =========================================================
     ESCAPE
  ========================================================= */

  function escapeHtml(value) {

    return String(
      value === undefined ||
      value === null
        ? ""
        : value
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }

  function escapeAttr(value) {

    return escapeHtml(value);
  }

})();
