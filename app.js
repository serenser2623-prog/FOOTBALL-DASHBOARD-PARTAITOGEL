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
            FOOTBALL PREDICTION CENTER
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

      <article class="nf-match nf-glass">

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

            <div
              class="nf-prediction-value"
            >
              Belum dimuat
            </div>

            ${
              predictionButton
            }

          </div>

        </div>

      </article>

    `;

  }



  /* ==================================================
     PREDICTION
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


    button.disabled =
      true;


    button.textContent =
      "LOADING...";


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

          button.textContent =
            "RETRY";

          return;

        }


        if (
          !result ||
          !result.success
        ) {

          button.textContent =
            "NO DATA";

          return;

        }


        var data =
          result.data &&
          result.data.response
            ? result.data.response[0]
            : null;


        if (!data) {

          button.textContent =
            "NO PREDICTION";

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


        var advice =
          prediction.advice ||
          "Analysis tersedia";


        var value =
          winner.name ||
          prediction.under_over ||
          "No clear prediction";


        var confidence =
          winner.comment ||
          "";


        var main =
          card.querySelector(
            ".nf-prediction-main"
          );


        main.innerHTML = `

          <div>

            <div class="nf-prediction-value">
              ${escapeHtml(
                value
              )}
            </div>

            <div class="nf-prediction-confidence">
              ${escapeHtml(
                advice
              )}
            </div>

          </div>


          <div class="nf-prediction-confidence">

            ${
              percent.home
                ? "HOME " +
                  escapeHtml(
                    percent.home
                  )
                : ""
            }

            ${
              percent.draw
                ? " • DRAW " +
                  escapeHtml(
                    percent.draw
                  )
                : ""
            }

            ${
              percent.away
                ? " • AWAY " +
                  escapeHtml(
                    percent.away
                  )
                : ""
            }

          </div>

        `;

      }

    );

  }



  /* ==================================================
     LOADING
  ================================================== */

  function renderLoading() {

    APP.innerHTML = `

      <div class="nf-loading-screen">

        <div class="nf-loader"></div>

        <div class="nf-loading-title">
          FOOTBALL PREDICTION CENTER
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