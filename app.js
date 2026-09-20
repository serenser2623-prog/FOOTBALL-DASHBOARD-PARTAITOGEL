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


  /* ==================================================
     STATE
  ================================================== */

  var state = {

    date: "",
    league: "ALL",
    search: "",
    fixtures: [],
    filtered: [],
    loading: true,
    error: "",
    selectedPrediction: null

  };


  /* ==================================================
     PREMIUM HERO STYLE
  ================================================== */

  function injectPremiumHeroStyles() {

    if (document.getElementById("nyuk-premium-hero-style")) {
      return;
    }

    var style = document.createElement("style");

    style.id = "nyuk-premium-hero-style";

    style.textContent = `

      .nf-hero-header {

        position: relative;

        width: 100%;

        min-height: 150px;

        display: flex;

        align-items: center;

        justify-content: center;

        gap: 22px;

        padding: 18px 20px;

        box-sizing: border-box;

        overflow: hidden;

      }


      .nf-hero-gif {

        width: 120px;

        height: 120px;

        flex: 0 0 120px;

        display: flex;

        align-items: center;

        justify-content: center;

        position: relative;

        z-index: 2;

        animation: nfHeroFloat 4s ease-in-out infinite;

      }


      .nf-hero-gif-right {

        animation-delay: -2s;

      }


      .nf-hero-gif img {

        width: 100%;

        height: 100%;

        object-fit: contain;

        display: block;

        filter:

          drop-shadow(0 0 7px rgba(0,255,255,.55))

          drop-shadow(0 0 18px rgba(0,210,255,.35));

      }


      .nf-hero-center {

        min-width: 0;

        flex: 1;

        max-width: 700px;

        text-align: center;

        position: relative;

        z-index: 3;

      }


      .nf-hero-title {

        margin: 0;

        font-size: clamp(24px, 4vw, 42px);

        line-height: 1.05;

        font-weight: 900;

        letter-spacing: .7px;

        color: #ffffff;

        text-shadow:

          0 0 5px rgba(255,255,255,.75),

          0 0 12px rgba(0,238,255,.85),

          0 0 28px rgba(0,210,255,.55),

          0 0 50px rgba(0,180,255,.25);

      }


      .nf-hero-subtitle {

        margin-top: 10px;

        font-size: 12px;

        font-weight: 700;

        letter-spacing: 2px;

        text-transform: uppercase;

        color: rgba(215,250,255,.82);

        text-shadow:

          0 0 8px rgba(0,220,255,.35);

      }


      .nf-hero-lights {

        display: flex;

        align-items: center;

        justify-content: center;

        gap: 6px;

        margin-top: 12px;

      }


      .nf-hero-lights span {

        width: 5px;

        height: 5px;

        border-radius: 50%;

        background: #00eaff;

        box-shadow:

          0 0 6px #00eaff,

          0 0 15px rgba(0,234,255,.8);

        animation: nfHeroPulse 1.8s ease-in-out infinite;

      }


      .nf-hero-lights span:nth-child(2) {

        animation-delay: .25s;

      }


      .nf-hero-lights span:nth-child(3) {

        animation-delay: .5s;

      }


      @keyframes nfHeroFloat {

        0%,

        100% {

          transform: translateY(0) scale(1);

        }

        50% {

          transform: translateY(-6px) scale(1.025);

        }

      }


      @keyframes nfHeroPulse {

        0%,

        100% {

          opacity: .35;

          transform: scale(.75);

        }

        50% {

          opacity: 1;

          transform: scale(1.15);

        }

      }


      @media (max-width: 760px) {

        .nf-hero-header {

          gap: 10px;

          padding: 14px 8px;

        }

        .nf-hero-gif {

          width: 92px;

          height: 92px;

          flex-basis: 92px;

        }

        .nf-hero-title {

          font-size: clamp(20px, 6vw, 30px);

        }

        .nf-hero-subtitle {

          font-size: 9px;

          letter-spacing: 1.2px;

        }

      }


      @media (max-width: 480px) {

        .nf-hero-header {

          gap: 4px;

          padding: 12px 4px;

        }

        .nf-hero-gif {

          width: 62px;

          height: 62px;

          flex-basis: 62px;

        }

        .nf-hero-title {

          font-size: 18px;

          letter-spacing: .3px;

        }

        .nf-hero-subtitle {

          font-size: 7px;

          letter-spacing: .8px;

          margin-top: 6px;

        }

        .nf-hero-lights {

          margin-top: 7px;

        }

        .nf-hero-lights span {

          width: 3px;

          height: 3px;

        }

      }


      @media (max-width: 360px) {

        .nf-hero-gif {

          width: 50px;

          height: 50px;

          flex-basis: 50px;

        }

        .nf-hero-title {

          font-size: 16px;

        }

      }

    `;

    document.head.appendChild(style);

  }


  injectPremiumHeroStyles();


  /* ==================================================
     HELPERS
  ================================================== */

  function escapeHtml(value) {

    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  function normalize(value) {

    return String(value || "")
      .toLowerCase()
      .trim();

  }


  function formatDate(date) {

    var d = new Date(date);

    if (isNaN(d.getTime())) {
      return "";
    }

    var y = d.getFullYear();

    var m = String(d.getMonth() + 1).padStart(2, "0");

    var day = String(d.getDate()).padStart(2, "0");

    return y + "-" + m + "-" + day;

  }


  function todayLocal() {

    var now = new Date();

    return formatDate(now);

  }


  function formatTime(value) {

    if (!value) {
      return "-";
    }

    var d = new Date(value);

    if (!isNaN(d.getTime())) {

      return d.toLocaleTimeString(
        "id-ID",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );

    }

    var text = String(value);

    var match = text.match(/(\d{1,2}):(\d{2})/);

    if (match) {

      return match[1].padStart(2, "0") +
        ":" +
        match[2];

    }

    return text;

  }


  function formatDateId(value) {

    if (!value) {
      return "-";
    }

    var d = new Date(value);

    if (isNaN(d.getTime())) {
      return value;
    }

    return d.toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );

  }


  function safeNumber(value, fallback) {

    var n = Number(value);

    return Number.isFinite(n)
      ? n
      : (fallback || 0);

  }


  /* ==================================================
     API REQUEST
  ================================================== */

  function apiRequest(params) {

    return new Promise(function (resolve, reject) {

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


      var callbackName =
        "nyukCallback_" +
        Date.now() +
        "_" +
        Math.floor(Math.random() * 100000);


      query.push(
        "callback=" +
        encodeURIComponent(callbackName)
      );


      var script =
        document.createElement("script");


      var finished = false;


      function cleanup() {

        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }

        try {
          delete window[callbackName];
        } catch (e) {
          window[callbackName] = undefined;
        }

      }


      var timer =
        setTimeout(function () {

          if (finished) {
            return;
          }

          finished = true;

          cleanup();

          reject(
            new Error(
              "Request API timeout."
            )
          );

        }, 30000);


      window[callbackName] =
        function (data) {

          if (finished) {
            return;
          }

          finished = true;

          clearTimeout(timer);

          cleanup();

          resolve(data);

        };


      script.onerror =
        function () {

          if (finished) {
            return;
          }

          finished = true;

          clearTimeout(timer);

          cleanup();

          reject(
            new Error(
              "Tidak dapat menghubungi server API."
            )
          );

        };


      script.src =
        API_URL +
        "?" +
        query.join("&");


      document.body.appendChild(script);

    });

  }


  /* ==================================================
     FIXTURE NORMALIZER
  ================================================== */

  function normalizeFixture(item) {

    item = item || {};

    var fixture =
      item.fixture ||
      item.match ||
      {};

    var league =
      item.league ||
      {};

    var teams =
      item.teams ||
      {};

    var home =
      teams.home ||
      item.home ||
      {};

    var away =
      teams.away ||
      item.away ||
      {};


    return {

      id:
        fixture.id ||
        item.fixture_id ||
        item.id ||
        "",


      date:
        fixture.date ||
        item.date ||
        item.match_date ||
        "",


      status:
        fixture.status ||
        item.status ||
        {},


      league: {

        id:
          league.id ||
          item.league_id ||
          "",

        name:
          league.name ||
          item.league_name ||
          "Unknown League",

        country:
          league.country ||
          item.country ||
          "",

        logo:
          league.logo ||
          item.league_logo ||
          ""

      },


      home: {

        id:
          home.id ||
          item.home_id ||
          "",

        name:
          home.name ||
          item.home_name ||
          "Home",

        logo:
          home.logo ||
          item.home_logo ||
          ""

      },


      away: {

        id:
          away.id ||
          item.away_id ||
          "",

        name:
          away.name ||
          item.away_name ||
          "Away",

        logo:
          away.logo ||
          item.away_logo ||
          ""

      },


      goals: {

        home:
          item.goals &&
          item.goals.home !== undefined
            ? item.goals.home
            : null,

        away:
          item.goals &&
          item.goals.away !== undefined
            ? item.goals.away
            : null

      },


      raw: item

    };

  }


  function normalizeFixtures(data) {

    if (!data) {
      return [];
    }


    var response =
      data.response ||
      data.results ||
      data.fixtures ||
      data.data ||
      [];


    if (!Array.isArray(response)) {

      if (
        response &&
        typeof response === "object"
      ) {

        response =
          Object.values(response);

      } else {

        response = [];

      }

    }


    return response.map(
      normalizeFixture
    );

  }


  /* ==================================================
     RENDER DASHBOARD
  ================================================== */

  function renderDashboard() {

    APP.innerHTML = `

      <section class="nf-header nf-glass">

        <div class="nf-hero-header">

          <div class="nf-hero-gif nf-hero-gif-left">

            <img
              src="https://cdn.areabermain.club/assets/cdn/az1/2026/09/15/20260915/9c68e0a06106a1426538a60003bf4ae6/gif-partaitogel1.gif"
              alt=""
              loading="eager"
            >

          </div>


          <div class="nf-hero-center">

            <h1 class="nf-hero-title">
              FOOTBALL PREDIKSI PARTAITOGEL
            </h1>

            <div class="nf-hero-subtitle">
              Live Fixtures • Daily Matches • Match Predictions
            </div>

            <div class="nf-hero-lights">

              <span></span>
              <span></span>
              <span></span>

            </div>

          </div>


          <div class="nf-hero-gif nf-hero-gif-right">

            <img
              src="https://cdn.areabermain.club/assets/cdn/az1/2026/09/15/20260915/beac7a1d613afd8af5984dbf3554a6bc/gif-partaitogel2.gif"
              alt=""
              loading="eager"
            >

          </div>

        </div>

      </section>


      <section class="nf-filter nf-glass">

        <div class="nf-filter-row">

          <div class="nf-filter-item">

            <label>
              TANGGAL
            </label>

            <input
              id="nf-date"
              type="date"
              value="${escapeHtml(state.date)}"
            >

          </div>


          <div class="nf-filter-item">

            <label>
              LIGA
            </label>

            <select id="nf-league">

              <option value="ALL">
                SEMUA LIGA
              </option>

            </select>

          </div>


          <div class="nf-filter-item nf-search-wrap">

            <label>
              CARI KLUB
            </label>

            <input
              id="nf-search"
              type="search"
              placeholder="Nama klub..."
              value="${escapeHtml(state.search)}"
              autocomplete="off"
            >

          </div>


          <div class="nf-filter-actions">

            <button
              id="nf-refresh"
              class="nf-btn nf-btn-primary"
              type="button"
            >
              REFRESH
            </button>

          </div>

        </div>

      </section>


      <section class="nf-summary">

        <div class="nf-summary-card nf-glass">

          <div class="nf-summary-label">
            TOTAL MATCH
          </div>

          <div
            id="nf-total"
            class="nf-summary-value"
          >
            0
          </div>

        </div>


        <div class="nf-summary-card nf-glass">

          <div class="nf-summary-label">
            LIGA
          </div>

          <div
            id="nf-total-leagues"
            class="nf-summary-value"
          >
            0
          </div>

        </div>


        <div class="nf-summary-card nf-glass">

          <div class="nf-summary-label">
            STATUS
          </div>

          <div
            id="nf-summary-status"
            class="nf-summary-value"
          >
            -
          </div>

        </div>

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
     EVENTS
  ================================================== */

  function bindEvents() {

    var dateInput =
      document.getElementById("nf-date");

    var leagueInput =
      document.getElementById("nf-league");

    var searchInput =
      document.getElementById("nf-search");

    var refreshButton =
      document.getElementById("nf-refresh");


    if (dateInput) {

      dateInput.addEventListener(
        "change",
        function () {

          state.date =
            this.value ||
            todayLocal();

          updateMatches();

        }
      );

    }


    if (leagueInput) {

      leagueInput.addEventListener(
        "change",
        function () {

          state.league =
            this.value ||
            "ALL";

          applyFilters();

        }
      );

    }


    if (searchInput) {

      searchInput.addEventListener(
        "input",
        function () {

          state.search =
            this.value || "";

          applyFilters();

        }
      );

    }


    if (refreshButton) {

      refreshButton.addEventListener(
        "click",
        function () {

          updateMatches(true);

        }
      );

    }

  }


  /* ==================================================
     LOAD FIXTURES
  ================================================== */

  async function updateMatches(force) {

    if (!state.date) {
      state.date = todayLocal();
    }


    state.loading = true;

    state.error = "";

    renderLoading();


    try {

      var data =
        await apiRequest({

          endpoint: "fixtures",

          date: state.date,

          timezone: "Asia/Jakarta",

          _: force
            ? Date.now()
            : ""

        });


      if (
        data &&
        data.success === false
      ) {

        throw new Error(
          data.message ||
          data.error ||
          "API mengembalikan error."
        );

      }


      state.fixtures =
        normalizeFixtures(data);


      state.loading = false;


      populateLeagues();

      applyFilters();


    } catch (error) {

      state.loading = false;

      state.error =
        error &&
        error.message
          ? error.message
          : "Terjadi kesalahan.";

      renderError();

    }

  }


  /* ==================================================
     LOADING
  ================================================== */

  function renderLoading() {

    var grid =
      document.getElementById("nf-grid");

    if (!grid) {
      return;
    }


    grid.innerHTML = `

      <div class="nf-loading-card nf-glass">

        <div class="nf-mini-loader"></div>

        <div class="nf-prediction-loading">
          Mengambil pertandingan...
        </div>

      </div>

    `;


    var status =
      document.getElementById(
        "nf-summary-status"
      );

    if (status) {
      status.textContent =
        "LOADING";
    }

  }


  /* ==================================================
     ERROR
  ================================================== */

  function renderError() {

    var grid =
      document.getElementById("nf-grid");

    if (!grid) {
      return;
    }


    grid.innerHTML = `

      <div class="nf-error-card nf-glass">

        <div class="nf-prediction-error">

          ${escapeHtml(
            state.error ||
            "Terjadi kesalahan."
          )}

        </div>

        <button
          id="nf-error-refresh"
          class="nf-btn nf-btn-primary"
          type="button"
        >
          COBA LAGI
        </button>

      </div>

    `;


    var button =
      document.getElementById(
        "nf-error-refresh"
      );


    if (button) {

      button.addEventListener(
        "click",
        function () {

          updateMatches(true);

        }
      );

    }


    var status =
      document.getElementById(
        "nf-summary-status"
      );

    if (status) {
      status.textContent =
        "ERROR";
    }

  }


  /* ==================================================
     LEAGUES
  ================================================== */

  function populateLeagues() {

    var select =
      document.getElementById(
        "nf-league"
      );


    if (!select) {
      return;
    }


    var current =
      state.league ||
      "ALL";


    var map = {};


    state.fixtures.forEach(
      function (fixture) {

        var id =
          fixture.league.id ||
          normalize(
            fixture.league.name
          );


        if (!map[id]) {

          map[id] = {

            id: fixture.league.id,

            name:
              fixture.league.name ||
              "Unknown League"

          };

        }

      }
    );


    var leagues =
      Object.values(map)
        .sort(function (a, b) {

          return String(a.name)
            .localeCompare(
              String(b.name)
            );

        });


    select.innerHTML =
      `<option value="ALL">
        SEMUA LIGA
      </option>`;


    leagues.forEach(
      function (league) {

        var option =
          document.createElement(
            "option"
          );


        option.value =
          league.id ||
          league.name;


        option.textContent =
          league.name;


        select.appendChild(option);

      }
    );


    select.value =
      current;


    if (select.value !== current) {
      select.value = "ALL";
      state.league = "ALL";
    }

  }


  /* ==================================================
     FILTERS
  ================================================== */

  function applyFilters() {

    var search =
      normalize(state.search);


    state.filtered =
      state.fixtures.filter(
        function (fixture) {

          var leagueMatch =
            state.league === "ALL" ||
            String(
              fixture.league.id
            ) ===
              String(state.league) ||
            fixture.league.name ===
              state.league;


          if (!leagueMatch) {
            return false;
          }


          if (!search) {
            return true;
          }


          var home =
            normalize(
              fixture.home.name
            );


          var away =
            normalize(
              fixture.away.name
            );


          var league =
            normalize(
              fixture.league.name
            );


          return (
            home.indexOf(search) !== -1 ||
            away.indexOf(search) !== -1 ||
            league.indexOf(search) !== -1
          );

        }
      );


    renderFixtures();

    updateSummary();

  }


  /* ==================================================
     SUMMARY
  ================================================== */

  function updateSummary() {

    var total =
      document.getElementById(
        "nf-total"
      );


    var totalLeagues =
      document.getElementById(
        "nf-total-leagues"
      );


    var status =
      document.getElementById(
        "nf-summary-status"
      );


    if (total) {

      total.textContent =
        state.filtered.length;

    }


    if (totalLeagues) {

      var leagues = {};

      state.filtered.forEach(
        function (fixture) {

          leagues[
            fixture.league.id ||
            fixture.league.name
          ] = true;

        }
      );


      totalLeagues.textContent =
        Object.keys(leagues).length;

    }


    if (status) {

      status.textContent =
        state.filtered.length
          ? "READY"
          : "NO MATCH";

    }

  }


  /* ==================================================
     FIXTURE RENDER
  ================================================== */

  function renderFixtures() {

    var grid =
      document.getElementById(
        "nf-grid"
      );


    if (!grid) {
      return;
    }


    if (!state.filtered.length) {

      grid.innerHTML = `

        <div class="nf-empty-card nf-glass">

          <div class="nf-empty-title">
            TIDAK ADA PERTANDINGAN
          </div>

          <div class="nf-empty-text">
            Tidak ditemukan pertandingan
            sesuai filter yang dipilih.
          </div>

        </div>

      `;

      return;

    }


    grid.innerHTML =
      state.filtered
        .map(renderFixtureCard)
        .join("");


    bindPredictionButtons();

  }


  /* ==================================================
     FIXTURE CARD
  ================================================== */

  function renderFixtureCard(
    fixture,
    index
  ) {

    var time =
      formatTime(
        fixture.date
      );


    var date =
      formatDateId(
        fixture.date
      );


    var homeLogo =
      fixture.home.logo ||
      "";


    var awayLogo =
      fixture.away.logo ||
      "";


    var statusText =
      getStatusText(
        fixture.status
      );


    var fixtureId =
      fixture.id ||
      ("fixture-" + index);


    return `

      <article
        class="nf-match-card nf-glass"
        data-fixture-id="${escapeHtml(
          fixtureId
        )}"
      >

        <div class="nf-match-top">

          <div class="nf-league-info">

            ${
              fixture.league.logo
                ? `
                  <img
                    class="nf-league-logo"
                    src="${escapeHtml(
                      fixture.league.logo
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
                  fixture.league.name
                )}
              </div>

              <div class="nf-league-country">
                ${escapeHtml(
                  fixture.league.country
                )}
              </div>

            </div>

          </div>


          <div class="nf-match-time">

            <div class="nf-time">
              ${escapeHtml(time)}
            </div>

            <div class="nf-date">
              ${escapeHtml(date)}
            </div>

          </div>

        </div>


        <div class="nf-teams">

          <div class="nf-team nf-team-home">

            ${
              homeLogo
                ? `
                  <img
                    class="nf-team-logo"
                    src="${escapeHtml(
                      homeLogo
                    )}"
                    alt=""
                    loading="lazy"
                  >
                `
                : `
                  <div class="nf-team-logo nf-team-logo-placeholder">
                    ⚽
                  </div>
                `
            }

            <div class="nf-team-name">
              ${escapeHtml(
                fixture.home.name
              )}
            </div>

          </div>


          <div class="nf-vs">

            <span>VS</span>

            <small>
              ${escapeHtml(
                statusText
              )}
            </small>

          </div>


          <div class="nf-team nf-team-away">

            ${
              awayLogo
                ? `
                  <img
                    class="nf-team-logo"
                    src="${escapeHtml(
                      awayLogo
                    )}"
                    alt=""
                    loading="lazy"
                  >
                `
                : `
                  <div class="nf-team-logo nf-team-logo-placeholder">
                    ⚽
                  </div>
                `
            }

            <div class="nf-team-name">
              ${escapeHtml(
                fixture.away.name
              )}
            </div>

          </div>

        </div>


        <div class="nf-match-footer">

          <button
            type="button"
            class="nf-prediction-btn"
            data-prediction-id="${escapeHtml(
              fixtureId
            )}"
          >
            LIHAT PREDIKSI
          </button>

        </div>


        <div
          id="nf-prediction-${escapeHtml(
            fixtureId
          )}"
          class="nf-prediction-detail"
        ></div>

      </article>

    `;

  }


  /* ==================================================
     STATUS
  ================================================== */

  function getStatusText(status) {

    if (!status) {
      return "";
    }


    if (
      typeof status === "string"
    ) {
      return status;
    }


    return (
      status.short ||
      status.long ||
      ""
    );

  }


  /* ==================================================
     PREDICTION BUTTONS
  ================================================== */

  function bindPredictionButtons() {

    var buttons =
      document.querySelectorAll(
        ".nf-prediction-btn"
      );


    buttons.forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            var fixtureId =
              this.getAttribute(
                "data-prediction-id"
              );


            var fixture =
              state.filtered.find(
                function (item) {

                  return String(
                    item.id
                  ) ===
                    String(fixtureId);

                }
              );


            if (!fixture) {
              return;
            }


            var container =
              document.getElementById(
                "nf-prediction-" +
                fixtureId
              );


            if (!container) {
              return;
            }


            var isOpen =
              container.classList.contains(
                "nf-prediction-open"
              );


            document
              .querySelectorAll(
                ".nf-prediction-detail"
              )
              .forEach(
                function (item) {

                  item.classList.remove(
                    "nf-prediction-open"
                  );

                }
              );


            if (isOpen) {
              return;
            }


            container.innerHTML =
              renderPrediction(
                fixture
              );


            container.classList.add(
              "nf-prediction-open"
            );

          }
        );

      }
    );

  }


  /* ==================================================
     LOCAL PREDICTION ENGINE
  ================================================== */

  function hashString(value) {

    var hash = 0;

    value =
      String(value || "");


    for (
      var i = 0;
      i < value.length;
      i++
    ) {

      hash =
        (
          (hash << 5) -
          hash +
          value.charCodeAt(i)
        ) |
        0;

    }


    return Math.abs(hash);

  }


  function getPrediction(
    fixture
  ) {

    var seed =
      hashString(
        String(
          fixture.id
        ) +
        "|" +
        fixture.home.name +
        "|" +
        fixture.away.name
      );


    var scores = [

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
      [1, 4],
      [4, 1],
      [0, 0]

    ];


    var score =
      scores[
        seed %
        scores.length
      ];


    var homeScore =
      score[0];


    var awayScore =
      score[1];


    var total =
      homeScore +
      awayScore;


    var ou =
      total >= 3
        ? "OVER 2.5"
        : "UNDER 2.5";


    var diff =
      homeScore -
      awayScore;


    var handicap;


    if (diff >= 2) {

      handicap =
        "HOME -1.0";

    } else if (diff === 1) {

      handicap =
        "HOME -0.5";

    } else if (diff === 0) {

      handicap =
        "HOME 0";

    } else if (diff === -1) {

      handicap =
        "AWAY -0.5";

    } else {

      handicap =
        "AWAY -1.0";

    }


    return {

      homeScore:
        homeScore,

      awayScore:
        awayScore,

      score:
        homeScore +
        " : " +
        awayScore,

      ou:
        ou,

      handicap:
        handicap

    };

  }


  /* ==================================================
     PREDICTION RENDER
  ================================================== */

  function renderPrediction(
    fixture
  ) {

    var prediction =
      getPrediction(
        fixture
      );


    return `

      <div class="nf-prediction">

        <div class="nf-prediction-main">

          <div class="nf-prediction-box">

            <div class="nf-prediction-box-header">
              PREDIKSI PERTANDINGAN
            </div>


            <div class="nf-score-label">
              PREDIKSI SKOR
            </div>


            <div class="nf-predicted-score">

              <span>
                ${escapeHtml(
                  prediction.homeScore
                )}
              </span>

              <b>:</b>

              <span>
                ${escapeHtml(
                  prediction.awayScore
                )}
              </span>

            </div>


            <div class="nf-prediction-grid">

              <div class="nf-pick-card">

                <div class="nf-pick-title">
                  OVER / UNDER
                </div>

                <div class="nf-pick-value">
                  ${escapeHtml(
                    prediction.ou
                  )}
                </div>

                <div class="nf-pick-small">
                  LINE 2.5
                </div>

              </div>


              <div class="nf-pick-card">

                <div class="nf-pick-title">
                  HANDICAP
                </div>

                <div class="nf-pick-value">
                  ${escapeHtml(
                    prediction.handicap
                  )}
                </div>

                <div class="nf-pick-small">
                  ASIAN HANDICAP
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    `;

  }


  /* ==================================================
     INIT
  ================================================== */

  state.date =
    todayLocal();


  renderDashboard();


})();
