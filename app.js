(function () {

  "use strict";


  /* ==================================================
     CONFIG
  ================================================== */

  var API_URL =
    "https://script.google.com/macros/s/AKfycbzXgqgcL8FcsxbDS8DSvi02StALKKzziSEU2RNs1izfy_HPHZbXIBWx2ZEuH0lFOaHa/exec";


  var APP =
    document.getElementById(
      "nyuk-football-app"
    );


  if (!APP) {
    return;
  }


  var fixtures = [];

  var leagues = {};

  var currentDate = getToday();

  var requestCounter = 0;

  var predictionCache = {};


  /* ==================================================
     INIT
  ================================================== */

  renderLoading();

  loadFixtures(
    currentDate
  );


  /* ==================================================
     DATE
  ================================================== */

  function getToday() {

    var d =
      new Date();


    var year =
      d.getFullYear();


    var month =
      String(
        d.getMonth() + 1
      ).padStart(
        2,
        "0"
      );


    var day =
      String(
        d.getDate()
      ).padStart(
        2,
        "0"
      );


    return (
      year +
      "-" +
      month +
      "-" +
      day
    );

  }


  /* ==================================================
     JSONP REQUEST
  ================================================== */

  function jsonp(
    params,
    callback
  ) {

    var callbackName =
      "nyukFootballCallback_" +
      Date.now() +
      "_" +
      Math.floor(
        Math.random() * 999999
      );


    window[
      callbackName
    ] = function (data) {

      try {

        callback(
          null,
          data
        );

      } finally {

        cleanup();

      }

    };


    var script =
      document.createElement(
        "script"
      );


    var query = [];


    Object.keys(
      params
    ).forEach(
      function (key) {

        query.push(

          encodeURIComponent(
            key
          ) +

          "=" +

          encodeURIComponent(
            params[key]
          )

        );

      }
    );


    query.push(

      "callback=" +

      encodeURIComponent(
        callbackName
      )

    );


    script.src =
      API_URL +
      "?" +
      query.join("&");


    script.async =
      true;


    var timeout =
      setTimeout(
        function () {

          cleanup();

          callback(
            new Error(
              "Request API timeout."
            )
          );

        },
        30000
      );


    script.onerror =
      function () {

        clearTimeout(
          timeout
        );

        cleanup();

        callback(
          new Error(
            "Gagal menghubungkan ke API."
          )
        );

      };


    function cleanup() {

      clearTimeout(
        timeout
      );


      if (
        script.parentNode
      ) {

        script.parentNode
          .removeChild(
            script
          );

      }


      try {

        delete window[
          callbackName
        ];

      } catch (e) {

        window[
          callbackName
        ] = undefined;

      }

    }


    document.body.appendChild(
      script
    );

  }


  /* ==================================================
     LOAD FIXTURES
  ================================================== */

  function loadFixtures(
    date
  ) {

    var requestId =
      ++requestCounter;


    currentDate =
      date;


    renderLoading();


    jsonp(

      {

        endpoint:
          "fixtures",

        date:
          date,

        timezone:
          "Asia/Jakarta"

      },

      function (
        error,
        result
      ) {

        if (
          requestId !==
          requestCounter
        ) {

          return;

        }


        if (error) {

          renderError(
            error.message
          );

          return;

        }


        if (
          !result ||
          !result.success
        ) {

          renderError(

            result &&
            result.error

              ? result.error

              : "API mengembalikan error."

          );

          return;

        }


        var response =
          result.data &&
          result.data.response
            ? result.data.response
            : [];


        fixtures =
          response;


        buildLeagueList();


        renderDashboard();

      }

    );

  }


  /* ==================================================
     BUILD LEAGUES
  ================================================== */

  function buildLeagueList() {

    leagues = {};


    fixtures.forEach(
      function (match) {

        var league =
          match.league || {};


        if (
          league.id ===
          undefined
        ) {

          return;

        }


        var key =
          String(
            league.id
          );


        if (
          !leagues[key]
        ) {

          leagues[key] = {

            id:
              league.id,

            name:
              league.name ||
              "Unknown League",

            country:
              league.country ||
              "",

            logo:
              league.logo ||
              ""

          };

        }

      }
    );

  }


  /* ==================================================
     RENDER DASHBOARD
  ================================================== */

  function renderDashboard() {

    APP.innerHTML = `

      <section class="nf-header nf-glass">

        <div class="nf-brand">

          <h1 class="nf-title">
            FOOTBALL PREDIKSI PARTAITOGEL
          </h1>

          <div class="nf-subtitle">
            Live Fixtures • Daily Matches • Match Predictions
          </div>

          <div class="nf-status">

            <span class="nf-status-dot"></span>

            API ONLINE

          </div>

        </div>

      </section>


      <section class="nf-filter nf-glass">

        <input
          id="nf-date"
          class="nf-input"
          type="date"
          value="${currentDate}"
        >


        <select
          id="nf-league"
          class="nf-select"
        >

          <option value="">
            Semua Liga
          </option>

          ${renderLeagueOptions()}

        </select>


        <input
          id="nf-search"
          class="nf-input nf-search"
          type="search"
          placeholder="Cari nama klub..."
        >


        <button
          id="nf-refresh"
          class="nf-button"
          type="button"
        >
          ↻ REFRESH
        </button>

      </section>


      <section class="nf-summary">

        <div
          id="nf-date-title"
          class="nf-date-title"
        ></div>

        <div
          id="nf-count"
          class="nf-count"
        ></div>

      </section>


      <section
        id="nf-grid"
        class="nf-grid"
      ></section>

    `;


    bindEvents();

    updateMatches();

  }


  /* ==================================================
     LEAGUE OPTIONS
  ================================================== */

  function renderLeagueOptions() {

    return Object.keys(
      leagues
    )
      .sort(
        function (a, b) {

          return leagues[a].name
            .localeCompare(
              leagues[b].name
            );

        }
      )
      .map(
        function (key) {

          var league =
            leagues[key];


          return `

            <option
              value="${escapeAttr(
                String(
                  league.id
                )
              )}"
            >

              ${escapeHtml(
                league.name
              )}

              ${
                league.country
                  ? " — " +
                    escapeHtml(
                      league.country
                    )
                  : ""
              }

            </option>

          `;

        }
      )
      .join("");

  }


  /* ==================================================
     EVENTS
  ================================================== */

  function bindEvents() {

    var date =
      document.getElementById(
        "nf-date"
      );


    var league =
      document.getElementById(
        "nf-league"
      );


    var search =
      document.getElementById(
        "nf-search"
      );


    var refresh =
      document.getElementById(
        "nf-refresh"
      );


    date.addEventListener(
      "change",
      function () {

        loadFixtures(
          date.value
        );

      }
    );


    league.addEventListener(
      "change",
      updateMatches
    );


    search.addEventListener(
      "input",
      updateMatches
    );


    refresh.addEventListener(
      "click",
      function () {

        loadFixtures(
          currentDate
        );

      }
    );

  }


  /* ==================================================
     FILTER
  ================================================== */

  function updateMatches() {

    var grid =
      document.getElementById(
        "nf-grid"
      );


    if (!grid) {
      return;
    }


    var league =
      document.getElementById(
        "nf-league"
      ).value;


    var search =
      document.getElementById(
        "nf-search"
      ).value
        .trim()
        .toLowerCase();


    var filtered =
      fixtures.filter(
        function (match) {

          var leagueId =
            String(
              match.league &&
              match.league.id
            );


          var home =
            (
              match.teams &&
              match.teams.home &&
              match.teams.home.name
            ) || "";


          var away =
            (
              match.teams &&
              match.teams.away &&
              match.teams.away.name
            ) || "";


          var text =
            (
              home +
              " " +
              away
            ).toLowerCase();


          var leagueOK =
            !league ||
            leagueId ===
              league;


          var searchOK =
            !search ||
            text.includes(
              search
            );


          return (
            leagueOK &&
            searchOK
          );

        }
      );


    document.getElementById(
      "nf-count"
    ).textContent =
      filtered.length +
      " pertandingan";


    document.getElementById(
      "nf-date-title"
    ).textContent =
      formatDate(
        currentDate
      );


    if (
      !filtered.length
    ) {

      grid.innerHTML = `

        <div class="nf-message nf-glass">

          <div class="nf-message-title">
            Tidak ada pertandingan
          </div>

          <div class="nf-message-text">
            Coba ganti tanggal, liga, atau kata pencarian.
          </div>

        </div>

      `;

      return;

    }


    grid.innerHTML =
      filtered
        .map(
          renderMatch
        )
        .join("");

  }


  /* ==================================================
     MATCH CARD
  ================================================== */

  function renderMatch(
    match
  ) {

    var fixture =
      match.fixture || {};


    var league =
      match.league || {};


    var teams =
      match.teams || {};


    var home =
      teams.home || {};


    var away =
      teams.away || {};


    var status =
      fixture.status || {};


    var date =
      fixture.date
        ? new Date(
            fixture.date
          )
        : null;


    var hour =
      date
        ? date.toLocaleTimeString(
            "id-ID",
            {
              hour:
                "2-digit",

              minute:
                "2-digit",

              hour12:
                false,

              timeZone:
                "Asia/Jakarta"
            }
          )
        : "--:--";


    var statusText =
      status.long ||
      "Not Started";


    var predictionButton =
      fixture.id
        ? `

          <button
            class="nf-prediction-button nf-button"
            data-fixture="${fixture.id}"
            type="button"
          >
            🔮 LIHAT PREDIKSI
          </button>

        `
        : "";


    return `

      <article
        class="nf-match nf-glass"
        data-fixture-card="${fixture.id || ""}"
      >

        <div class="nf-league">

          ${
            league.logo
              ? `
                <img
                  src="${escapeAttr(
                    league.logo
                  )}"
                  alt=""
                  loading="lazy"
                >
              `
              : ""
          }

          <div>

            <div class="nf-league-name">
              ${escapeHtml(
                league.name ||
                "Unknown League"
              )}
            </div>

            <div class="nf-country">
              ${escapeHtml(
                league.country ||
                ""
              )}
            </div>

          </div>

        </div>


        <div class="nf-time">

          <div class="nf-hour">
            ${hour}
          </div>

          <div class="nf-status-text">
            ${escapeHtml(
              statusText
            )}
          </div>

        </div>


        <div class="nf-teams">

          <div class="nf-team">

            ${
              home.logo
                ? `
                  <img
                    src="${escapeAttr(
                      home.logo
                    )}"
                    alt=""
                    loading="lazy"
                  >
                `
                : ""
            }

            <div class="nf-team-name">
              ${escapeHtml(
                home.name ||
                "Home"
              )}
            </div>

          </div>


          <div class="nf-vs">
            VS
          </div>


          <div class="nf-team nf-team-away">

            ${
              away.logo
                ? `
                  <img
                    src="${escapeAttr(
                      away.logo
                    )}"
                    alt=""
                    loading="lazy"
                  >
                `
                : ""
            }

            <div class="nf-team-name">
              ${escapeHtml(
                away.name ||
                "Away"
              )}
            </div>

          </div>

        </div>


        <div
          class="nf-prediction"
          id="prediction-${fixture.id}"
        >

          <div class="nf-prediction-title">

            <span>
              MATCH ANALYSIS
            </span>

            <span>
              #${fixture.id || ""}
            </span>

          </div>


          <div class="nf-prediction-main">

            <div class="nf-prediction-value">
              Belum dimuat
            </div>


            ${
              predictionButton
            }

          </div>


          <div
            class="nf-prediction-detail"
            id="prediction-detail-${fixture.id}"
          ></div>

        </div>

      </article>

    `;

  }


  /* ==================================================
     PREDICTION BUTTON
  ================================================== */

  document.addEventListener(
    "click",
    function (event) {

      var button =
        event.target.closest(
          ".nf-prediction-button"
        );


      if (!button) {
        return;
      }


      var fixture =
        button.getAttribute(
          "data-fixture"
        );


      loadPrediction(
        fixture,
        button
      );

    }
  );


  /* ==================================================
     LOAD PREDICTION
  ================================================== */

  function loadPrediction(
    fixture,
    button
  ) {

    var card =
      document.getElementById(
        "prediction-" +
        fixture
      );


    if (!card) {
      return;
    }


    var detail =
      document.getElementById(
        "prediction-detail-" +
        fixture
      );


    if (!detail) {
      return;
    }


    /* ==============================================
       TOGGLE
    ============================================== */

    if (
      detail.classList.contains(
        "nf-prediction-open"
      )
    ) {

      detail.classList.remove(
        "nf-prediction-open"
      );

      button.textContent =
        "🔮 LIHAT PREDIKSI";

      return;

    }


    /* ==============================================
       CACHE
    ============================================== */

    if (
      predictionCache[fixture]
    ) {

      renderPrediction(
        fixture,
        predictionCache[fixture],
        button
      );

      return;

    }


    button.disabled =
      true;


    button.textContent =
      "⏳ MENGAMBIL PREDIKSI...";


    detail.innerHTML = `

      <div class="nf-prediction-loading">

        <div class="nf-mini-loader"></div>

        <div>
          Mengambil analisis pertandingan...
        </div>

      </div>

    `;


    detail.classList.add(
      "nf-prediction-open"
    );


    jsonp(

      {

        endpoint:
          "predictions",

        fixture:
          fixture

      },

      function (
        error,
        result
      ) {

        button.disabled =
          false;


        if (error) {

          detail.innerHTML = `

            <div class="nf-prediction-error">
              ⚠️ Gagal mengambil prediksi.
              <br>
              ${escapeHtml(
                error.message
              )}
            </div>

          `;

          button.textContent =
            "🔄 COBA LAGI";

          return;

        }


        if (
          !result ||
          !result.success
        ) {

          detail.innerHTML = `

            <div class="nf-prediction-error">
              ⚠️ Data prediksi tidak tersedia.
            </div>

          `;

          button.textContent =
            "🔄 COBA LAGI";

          return;

        }


        var data =
          result.data &&
          result.data.response
            ? result.data.response[0]
            : null;


        if (!data) {

          detail.innerHTML = `

            <div class="nf-prediction-error">
              ⚠️ Belum ada prediksi untuk pertandingan ini.
            </div>

          `;

          button.textContent =
            "🔮 LIHAT PREDIKSI";

          return;

        }


        predictionCache[fixture] =
          data;


        renderPrediction(
          fixture,
          data,
          button
        );

      }

    );

  }


  /* ==================================================
     RENDER PREDICTION DETAIL
  ================================================== */

  function renderPrediction(
    fixture,
    data,
    button
  ) {

    var detail =
      document.getElementById(
        "prediction-detail-" +
        fixture
      );


    if (!detail) {
      return;
    }


    var prediction =
      data.predictions ||
      {};


    var winner =
      prediction.winner ||
      {};


    var percent =
      prediction.percent ||
      {};


    var goals =
      prediction.goals ||
      {};


    /*
     * API-Football biasanya mengirim
     * predicted goals seperti:
     *
     * home: "1.5"
     * away: "0.5"
     *
     * Kita ubah menjadi skor integer
     * yang mudah dibaca.
     */

    var homeGoal =
      convertPredictedGoal(
        goals.home
      );


    var awayGoal =
      convertPredictedGoal(
        goals.away
      );


    var score =
      homeGoal !== "—" &&
      awayGoal !== "—"

        ? homeGoal +
          " : " +
          awayGoal

        : "—";


    var winnerName =
      winner.name ||
      "Tidak ada prediksi jelas";


    /*
     * NORMALISASI OVER / UNDER
     */

    var underOver =
      normalizeOverUnder(
        prediction.under_over,
        goals
      );


    var advice =
      prediction.advice ||
      "Analisis tersedia";


    var homePercent =
      formatPercent(
        percent.home
      );


    var drawPercent =
      formatPercent(
        percent.draw
      );


    var awayPercent =
      formatPercent(
        percent.away
      );


    var handicap =
      buildHandicapPrediction(
        prediction,
        winner,
        homeGoal,
        awayGoal
      );


    detail.innerHTML = `

      <div class="nf-prediction-box">

        <div class="nf-prediction-box-header">

          <div>
            🔮 MATCH PREDICTION
          </div>

          <div>
            #${escapeHtml(
              String(fixture)
            )}
          </div>

        </div>


        <!-- =======================================
             PREDIKSI SKOR
        ======================================== -->

        <div class="nf-score-label">
          PREDIKSI SKOR
        </div>


        <div class="nf-predicted-score">

          ${escapeHtml(
            score
          )}

        </div>


        <div class="nf-prediction-grid">


          <!-- =====================================
               HANDICAP / ARAH HASIL
          ====================================== -->

          <div class="nf-pick-card">

            <div class="nf-pick-title">
              HANDICAP
            </div>

            <div class="nf-pick-value">
              ${escapeHtml(
                handicap
              )}
            </div>

            <div class="nf-pick-small">
              Arah berdasarkan prediksi skor
            </div>

          </div>


          <!-- =====================================
               OVER / UNDER
          ====================================== -->

          <div class="nf-pick-card">

            <div class="nf-pick-title">
              OVER / UNDER
            </div>

            <div class="nf-pick-value">
              ${escapeHtml(
                underOver
              )}
            </div>

            <div class="nf-pick-small">
              Total gol
            </div>

          </div>


          <!-- =====================================
               1X2
          ====================================== -->

          <div class="nf-pick-card">

            <div class="nf-pick-title">
              1X2
            </div>

            <div class="nf-pick-value">
              ${escapeHtml(
                winnerName
              )}
            </div>

            <div class="nf-pick-small">
              Match winner
            </div>

          </div>


          <!-- =====================================
               SKOR AKURAT
          ====================================== -->

          <div class="nf-pick-card">

            <div class="nf-pick-title">
              SKOR AKURAT
            </div>

            <div class="nf-pick-value">
              ${escapeHtml(
                score
              )}
            </div>

            <div class="nf-pick-small">
              Prediksi skor
            </div>

          </div>


        </div>


        <!-- =======================================
             PERCENTAGE
        ======================================== -->

        <div class="nf-percent-section">

          <div class="nf-percent-title">
            PROBABILITAS HASIL
          </div>


          <div class="nf-percent-row">


            <div class="nf-percent-item">

              <span>
                HOME
              </span>

              <strong>
                ${escapeHtml(
                  homePercent
                )}
              </strong>

            </div>


            <div class="nf-percent-item">

              <span>
                DRAW
              </span>

              <strong>
                ${escapeHtml(
                  drawPercent
                )}
              </strong>

            </div>


            <div class="nf-percent-item">

              <span>
                AWAY
              </span>

              <strong>
                ${escapeHtml(
                  awayPercent
                )}
              </strong>

            </div>


          </div>

        </div>


        <!-- =======================================
             ADVICE
        ======================================== -->

        <div class="nf-advice">

          <div class="nf-advice-title">
            💡 ADVICE
          </div>

          <div class="nf-advice-value">
            ${escapeHtml(
              advice
            )}
          </div>

        </div>


        <!-- =======================================
             PREDICTED TEAM
        ======================================== -->

        <div class="nf-winner-line">

          <span>
            PREDIKSI PEMENANG
          </span>

          <strong>
            ${escapeHtml(
              winnerName
            )}
          </strong>

        </div>


      </div>

    `;


    detail.classList.add(
      "nf-prediction-open"
    );


    button.disabled =
      false;


    button.textContent =
      "🔽 TUTUP PREDIKSI";

  }


  /* ==================================================
     CONVERT PREDICTED GOAL
  ================================================== */

  function convertPredictedGoal(
    value
  ) {

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {

      return "—";

    }


    /*
     * Bersihkan karakter aneh.
     */

    var text =
      String(value)
        .trim()
        .replace(
          ",",
          "."
        );


    /*
     * Ambil angka pertama.
     */

    var match =
      text.match(
        /-?\d+(?:\.\d+)?/
      );


    if (!match) {

      return "—";

    }


    var number =
      parseFloat(
        match[0]
      );


    if (
      isNaN(number)
    ) {

      return "—";

    }


    /*
     * Gol tidak boleh negatif.
     */

    number =
      Math.max(
        0,
        number
      );


    /*
     * Batasi angka yang terlalu
     * ekstrem agar tampilan tetap
     * masuk akal.
     */

    number =
      Math.min(
        9,
        number
      );


    /*
     * Bulatkan predicted goals.
     *
     * Contoh:
     *
     * 1.5 -> 2
     * 0.5 -> 1
     * 1.2 -> 1
     * 2.7 -> 3
     */

    return String(
      Math.round(
        number
      )
    );

  }


  /* ==================================================
     NORMALIZE OVER / UNDER
  ================================================== */

  function normalizeOverUnder(
    value,
    goals
  ) {

    if (
      value === undefined ||
      value === null ||
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


    var upper =
      raw
        .toUpperCase()
        .replace(
          ",",
          "."
        );


    /*
     * ==============================================
     * FORMAT NORMAL
     *
     * OVER 2.5
     * UNDER 2.5
     * ==============================================
     */

    var normalMatch =
      upper.match(
        /\b(OVER|UNDER)\b\s*[-+]?\s*(\d+(?:\.\d+)?)/i
      );


    if (normalMatch) {

      var direction =
        normalMatch[1]
          .toUpperCase();


      var line =
        parseFloat(
          normalMatch[2]
        );


      if (
        !isNaN(line)
      ) {

        return (
          direction +
          " " +
          formatLine(
            line
          )
        );

      }

    }


    /*
     * ==============================================
     * FORMAT SEPERTI:
     *
     * -2.5 --2.5
     * 2.5 - 2.5
     * ==============================================
     *
     * Ambil line yang tersedia.
     */

    var numbers =
      upper.match(
        /\d+(?:\.\d+)?/g
      );


    if (
      numbers &&
      numbers.length
    ) {

      var possibleLines =
        numbers
          .map(
            function (item) {

              return parseFloat(
                item
              );

            }
          )
          .filter(
            function (item) {

              return (
                !isNaN(item) &&
                item >= 0.5 &&
                item <= 6.5
              );

            }
          );


      if (
        possibleLines.length
      ) {

        /*
         * Biasanya line yang sama
         * muncul dua kali.
         *
         * Ambil nilai pertama.
         */

        var line =
          possibleLines[0];


        var projectedTotal =
          getProjectedGoalTotal(
            goals
          );


        if (
          projectedTotal !== null
        ) {

          if (
            projectedTotal >
            line
          ) {

            return (
              "OVER " +
              formatLine(
                line
              )
            );

          }


          if (
            projectedTotal <
            line
          ) {

            return (
              "UNDER " +
              formatLine(
                line
              )
            );

          }

          /*
           * Kalau tepat sama dengan line,
           * jangan memaksakan arah.
           */

          return (
            "LINE " +
            formatLine(
              line
            )
          );

        }


        return (
          "LINE " +
          formatLine(
            line
          )
        );

      }

    }


    /*
     * ==============================================
     * KALAU HANYA ADA "OVER"
     * ==============================================
     */

    if (
      upper.indexOf(
        "OVER"
      ) !== -1
    ) {

      var overNumber =
        upper.match(
          /\d+(?:\.\d+)?/
        );


      if (overNumber) {

        return (
          "OVER " +
          formatLine(
            parseFloat(
              overNumber[0]
            )
          )
        );

      }

    }


    /*
     * ==============================================
     * KALAU HANYA ADA "UNDER"
     * ==============================================
     */

    if (
      upper.indexOf(
        "UNDER"
      ) !== -1
    ) {

      var underNumber =
        upper.match(
          /\d+(?:\.\d+)?/
        );


      if (underNumber) {

        return (
          "UNDER " +
          formatLine(
            parseFloat(
              underNumber[0]
            )
          );

      }

    }


    return "—";

  }


  /* ==================================================
     PROJECTED TOTAL GOALS
  ================================================== */

  function getProjectedGoalTotal(
    goals
  ) {

    if (
      !goals
    ) {

      return null;

    }


    var home =
      getNumericGoal(
        goals.home
      );


    var away =
      getNumericGoal(
        goals.away
      );


    if (
      home === null ||
      away === null
    ) {

      return null;

    }


    return (
      home +
      away
    );

  }


  /* ==================================================
     NUMERIC GOAL
  ================================================== */

  function getNumericGoal(
    value
  ) {

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {

      return null;

    }


    var match =
      String(value)
        .replace(
          ",",
          "."
        )
        .match(
          /-?\d+(?:\.\d+)?/
        );


    if (!match) {

      return null;

    }


    var number =
      parseFloat(
        match[0]
      );


    if (
      isNaN(number)
    ) {

      return null;

    }


    return Math.max(
      0,
      number
    );

  }


  /* ==================================================
     FORMAT LINE
  ================================================== */

  function formatLine(
    value
  ) {

    if (
      value === undefined ||
      value === null ||
      isNaN(value)
    ) {

      return "—";

    }


    var number =
      parseFloat(
        value
      );


    /*
     * Line umum sepak bola:
     *
     * 0.5
     * 1.5
     * 2.5
     * 3.5
     * dst.
     */

    if (
      Number.isInteger(
        number
      )
    ) {

      return (
        number.toFixed(
          1
        )
      );

    }


    return String(
      number
    );

  }


  /* ==================================================
     HANDICAP / ARAH HASIL
  ================================================== */

  function buildHandicapPrediction(
    prediction,
    winner,
    homeGoal,
    awayGoal
  ) {

    /*
     * API-Football prediction endpoint
     * tidak memberikan sportsbook handicap
     * secara langsung.
     *
     * Jadi kita tidak mengarang
     * angka handicap.
     */


    if (
      homeGoal === "—" ||
      awayGoal === "—"
    ) {

      return "—";

    }


    var h =
      parseInt(
        homeGoal,
        10
      );


    var a =
      parseInt(
        awayGoal,
        10
      );


    if (
      isNaN(h) ||
      isNaN(a)
    ) {

      return "—";

    }


    if (
      h > a
    ) {

      return "HOME";

    }


    if (
      a > h
    ) {

      return "AWAY";

    }


    return "LEVEL";

  }


  /* ==================================================
     CLEAN PREDICTION VALUE
  ================================================== */

  function cleanPredictionValue(
    value
  ) {

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {

      return "—";

    }


    return String(
      value
    );

  }


  /* ==================================================
     FORMAT PERCENT
  ================================================== */

  function formatPercent(
    value
  ) {

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {

      return "—";

    }


    var text =
      String(
        value
      ).trim();


    /*
     * API biasanya sudah
     * mengirim "45%" atau "45".
     */

    if (
      text.indexOf(
        "%"
      ) !== -1
    ) {

      return text;

    }


    var number =
      parseFloat(
        text
      );


    if (
      !isNaN(number)
    ) {

      return (
        number +
        "%"
      );

    }


    return text;

  }


  /* ==================================================
     LOADING
  ================================================== */

  function renderLoading() {

    APP.innerHTML = `

      <div class="nf-loading-screen">

        <div class="nf-loader"></div>

        <div class="nf-loading-title">
          FOOTBALL PREDIKSI PARTAITOGEL
        </div>

        <div class="nf-loading-text">
          Mengambil pertandingan...
        </div>

      </div>

    `;

  }


  /* ==================================================
     ERROR
  ================================================== */

  function renderError(
    message
  ) {

    APP.innerHTML = `

      <div class="nf-message nf-glass">

        <div class="nf-message-title">
          ⚠️ Gagal Memuat Data
        </div>

        <div class="nf-message-text">
          ${escapeHtml(
            message ||
            "Terjadi kesalahan."
          )}
        </div>

      </div>

    `;

  }


  /* ==================================================
     DATE FORMAT
  ================================================== */

  function formatDate(
    dateString
  ) {

    var date =
      new Date(
        dateString +
        "T00:00:00"
      );


    return date.toLocaleDateString(
      "id-ID",
      {
        weekday:
          "long",

        day:
          "2-digit",

        month:
          "long",

        year:
          "numeric"
      }
    );

  }


  /* ==================================================
     ESCAPE
  ================================================== */

  function escapeHtml(
    value
  ) {

    return String(
      value || ""
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


  function escapeAttr(
    value
  ) {

    return escapeHtml(
      value
    );

  }


})();
