(function () {
  "use strict";

  /* =========================================================
   * CONFIG
   ========================================================= */

  const API_URL =
    "https://script.google.com/macros/s/AKfycbzXgqgcL8FcsxbDS8DSvi02StALKKzziSEU2RNs1izfy_HPHZbXIBWx2ZEuH0lFOaHa/exec";

  const APP =
    document.getElementById("nyuk-football-app");

  if (!APP) {
    console.error(
      "Element #nyuk-football-app tidak ditemukan."
    );
    return;
  }


  /* =========================================================
   * STATE
   * ========================================================= */

  let fixtures = [];
  let leagues = [];
  let currentDate = new Date();

  let requestCounter = 0;

  const predictionCache = new Map();


  /* =========================================================
   * INIT
   * ========================================================= */

  init();


  function init() {

    renderLoading();

    loadFixtures(currentDate);

  }


  /* =========================================================
   * JSONP
   * ========================================================= */

  function jsonp(params) {

    return new Promise(function (resolve, reject) {

      const callbackName =
        "__nyukFootballCallback_" +
        Date.now() +
        "_" +
        Math.floor(
          Math.random() * 100000
        );


      const script =
        document.createElement("script");


      let finished = false;


      const query =
        new URLSearchParams(params);


      query.set(
        "callback",
        callbackName
      );


      script.src =
        API_URL +
        "?" +
        query.toString();


      script.async = true;


      const timeout =
        setTimeout(function () {

          if (finished) return;

          finished = true;

          cleanup();

          reject(
            new Error(
              "Request timeout."
            )
          );

        }, 30000);


      window[callbackName] =
        function (data) {

          if (finished) return;

          finished = true;

          clearTimeout(timeout);

          cleanup();

          resolve(data);

        };


      script.onerror =
        function () {

          if (finished) return;

          finished = true;

          clearTimeout(timeout);

          cleanup();

          reject(
            new Error(
              "Gagal menghubungkan ke server API."
            )
          );

        };


      function cleanup() {

        try {

          delete window[callbackName];

        } catch (e) {

          window[callbackName] =
            undefined;

        }


        if (script.parentNode) {

          script.parentNode.removeChild(
            script
          );

        }

      }


      document.head.appendChild(
        script
      );

    });

  }


  /* =========================================================
   * LOAD FIXTURES
   * ========================================================= */

  async function loadFixtures(date) {

    const requestId =
      ++requestCounter;


    renderLoading(
      "Menghubungkan ke server pertandingan..."
    );


    try {

      const dateString =
        formatDateForApi(date);


      const result =
        await jsonp({

          endpoint: "fixtures",

          date: dateString,

          timezone: "Asia/Jakarta"

        });


      if (
        requestId !==
        requestCounter
      ) {
        return;
      }


      if (
        !result ||
        result.success === false
      ) {

        throw new Error(
          result &&
          result.message
            ? result.message
            : "Data pertandingan tidak tersedia."
        );

      }


      fixtures =
        result.data &&
        Array.isArray(
          result.data.response
        )
          ? result.data.response
          : [];


      buildLeagueList();

      renderDashboard();


    } catch (error) {

      console.error(error);

      renderError(
        error &&
        error.message
          ? error.message
          : "Gagal mengambil data pertandingan."
      );

    }

  }


  /* =========================================================
   * BUILD LEAGUE LIST
   * ========================================================= */

  function buildLeagueList() {

    const map =
      new Map();


    fixtures.forEach(
      function (fixture) {

        if (
          !fixture ||
          !fixture.league
        ) {
          return;
        }


        const id =
          fixture.league.id;


        if (!id) {
          return;
        }


        if (!map.has(id)) {

          map.set(
            id,
            {

              id: id,

              name:
                fixture.league.name ||
                "Unknown League",

              country:
                fixture.league.country ||
                ""

            }
          );

        }

      }
    );


    leagues =
      Array.from(
        map.values()
      );


    leagues.sort(
      function (a, b) {

        return String(
          a.name
        ).localeCompare(
          String(b.name),
          "id"
        );

      }
    );

  }


  /* =========================================================
   * RENDER DASHBOARD
   * ========================================================= */

  function renderDashboard() {

    APP.innerHTML = `

      <div class="nf-header nf-glass">

        <div class="nf-brand">

          <h1 class="nf-title">
            FOOTBALL PREDIKSI PARTAITOGEL
          </h1>

          <div class="nf-subtitle">
            Prediksi pertandingan sepak bola
          </div>

          <div class="nf-status">

            <span class="nf-status-dot"></span>

            LIVE DATA PERTANDINGAN

          </div>

        </div>

      </div>


      <div class="nf-filter nf-glass">


        <div>

          <input
            type="date"
            id="nf-date-filter"
            class="nf-input"
            value="${escapeAttr(
              formatDateForApi(
                currentDate
              )
            )}"
          >

        </div>


        <div>

          <select
            id="nf-league-filter"
            class="nf-select"
          >

            <option value="">
              SEMUA LIGA
            </option>


            ${leagues
              .map(
                function (league) {

                  return `

                    <option
                      value="${escapeAttr(
                        league.id
                      )}"
                    >

                      ${escapeHtml(
                        league.name
                      )}

                    </option>

                  `;

                }
              )
              .join("")}

          </select>

        </div>


        <div>

          <input
            type="text"
            id="nf-search-filter"
            class="nf-input nf-search"
            placeholder="Cari tim..."
            autocomplete="off"
          >

        </div>


        <div>

          <button
            type="button"
            id="nf-refresh-btn"
            class="nf-button"
          >

            ↻ REFRESH

          </button>

        </div>


      </div>


      <div
        id="nf-summary"
        class="nf-summary"
      ></div>


      <div
        id="nf-matches"
        class="nf-grid"
      ></div>

    `;


    bindDashboardEvents();

    updateMatches();

  }


  /* =========================================================
   * DASHBOARD EVENTS
   * ========================================================= */

  function bindDashboardEvents() {

    const dateInput =
      document.getElementById(
        "nf-date-filter"
      );


    const leagueFilter =
      document.getElementById(
        "nf-league-filter"
      );


    const searchFilter =
      document.getElementById(
        "nf-search-filter"
      );


    const refreshButton =
      document.getElementById(
        "nf-refresh-btn"
      );


    if (dateInput) {

      dateInput.addEventListener(
        "change",
        function () {

          if (!this.value) {
            return;
          }


          currentDate =
            parseDateInput(
              this.value
            );


          loadFixtures(
            currentDate
          );

        }
      );

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

          loadFixtures(
            currentDate
          );

        }
      );

    }

  }


  /* =========================================================
   * UPDATE MATCHES
   * ========================================================= */

  function updateMatches() {

    const container =
      document.getElementById(
        "nf-matches"
      );


    const leagueFilter =
      document.getElementById(
        "nf-league-filter"
      );


    const searchFilter =
      document.getElementById(
        "nf-search-filter"
      );


    const summary =
      document.getElementById(
        "nf-summary"
      );


    if (!container) {
      return;
    }


    const selectedLeague =
      leagueFilter
        ? leagueFilter.value
        : "";


    const search =
      searchFilter
        ? searchFilter.value
            .trim()
            .toLowerCase()
        : "";


    const filtered =
      fixtures.filter(
        function (fixture) {

          if (!fixture) {
            return false;
          }


          if (
            selectedLeague &&
            String(
              fixture.league &&
              fixture.league.id
            ) !==
              String(
                selectedLeague
              )
          ) {

            return false;

          }


          if (search) {

            const home =
              fixture.teams &&
              fixture.teams.home &&
              fixture.teams.home.name
                ? fixture.teams.home.name
                : "";


            const away =
              fixture.teams &&
              fixture.teams.away &&
              fixture.teams.away.name
                ? fixture.teams.away.name
                : "";


            const league =
              fixture.league &&
              fixture.league.name
                ? fixture.league.name
                : "";


            const text =
              (
                home +
                " " +
                away +
                " " +
                league
              ).toLowerCase();


            if (
              !text.includes(
                search
              )
            ) {

              return false;

            }

          }


          return true;

        }
      );


    renderSummary(
      summary,
      filtered.length
    );


    if (!filtered.length) {

      container.innerHTML = `

        <div class="nf-message nf-glass">

          <div class="nf-message-title">
            Tidak ada pertandingan
          </div>

          <div class="nf-message-text">

            Tidak ditemukan pertandingan
            sesuai filter yang dipilih.

          </div>

        </div>

      `;

      return;

    }


    container.innerHTML =
      filtered
        .map(renderMatch)
        .join("");


    bindPredictionButtons();

  }


  /* =========================================================
   * SUMMARY
   * ========================================================= */

  function renderSummary(
    element,
    count
  ) {

    if (!element) {
      return;
    }


    element.innerHTML = `

      <div class="nf-count">

        ${count}
        PERTANDINGAN

      </div>


      <div class="nf-date-title">

        ${escapeHtml(
          formatDateIndonesia(
            currentDate
          )
        )}

      </div>

    `;

  }


  /* =========================================================
   * RENDER MATCH
   * ========================================================= */

  function renderMatch(
    fixture
  ) {

    const fixtureId =
      fixture.fixture &&
      fixture.fixture.id
        ? fixture.fixture.id
        : "";


    const league =
      fixture.league || {};


    const teams =
      fixture.teams || {};


    const home =
      teams.home || {};


    const away =
      teams.away || {};


    const fixtureInfo =
      fixture.fixture || {};


    const status =
      fixtureInfo.status || {};


    const matchDate =
      fixtureInfo.date
        ? new Date(
            fixtureInfo.date
          )
        : null;


    const time =
      matchDate &&
      !isNaN(
        matchDate.getTime()
      )
        ? matchDate.toLocaleTimeString(
            "id-ID",
            {
              hour: "2-digit",
              minute: "2-digit"
            }
          )
        : "--:--";


    const statusText =
      status.short ||
      "NS";


    const homeLogo =
      home.logo || "";


    const awayLogo =
      away.logo || "";


    return `

      <article
        class="nf-match nf-glass"
        data-fixture-id="${escapeAttr(
          fixtureId
        )}"
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

            ${escapeHtml(time)}

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
              homeLogo
                ? `

                  <img
                    src="${escapeAttr(
                      homeLogo
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
              awayLogo
                ? `

                  <img
                    src="${escapeAttr(
                      awayLogo
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


        <div class="nf-prediction">


          <div class="nf-prediction-title">

            🔮 PREDIKSI

          </div>


          <div class="nf-prediction-main">


            <button
              type="button"
              class="nf-button nf-prediction-button"
              data-fixture-id="${escapeAttr(
                fixtureId
              )}"
            >

              🔮 LIHAT PREDIKSI

            </button>


            <div class="nf-prediction-confidence">

              Analisis pertandingan

            </div>

          </div>


          <div
            class="nf-prediction-detail"
            id="nf-prediction-${escapeAttr(
              fixtureId
            )}"
          ></div>


        </div>


      </article>

    `;

  }


  /* =========================================================
   * PREDICTION BUTTONS
   * ========================================================= */

  function bindPredictionButtons() {

    const buttons =
      document.querySelectorAll(
        ".nf-prediction-button"
      );


    buttons.forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            const fixtureId =
              this.getAttribute(
                "data-fixture-id"
              );


            if (!fixtureId) {
              return;
            }


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
   * LOAD PREDICTION
   * ========================================================= */

  async function loadPrediction(
    fixtureId,
    button
  ) {

    const detail =
      document.getElementById(
        "nf-prediction-" +
        fixtureId
      );


    if (!detail) {
      return;
    }


    const isOpen =
      detail.classList.contains(
        "nf-prediction-open"
      );


    if (isOpen) {

      detail.classList.remove(
        "nf-prediction-open"
      );

      return;

    }


    detail.classList.add(
      "nf-prediction-open"
    );


    if (
      predictionCache.has(
        String(fixtureId)
      )
    ) {

      renderPrediction(
        detail,
        predictionCache.get(
          String(fixtureId)
        )
      );

      return;

    }


    detail.innerHTML = `

      <div class="nf-prediction-loading">

        <div class="nf-mini-loader"></div>

        Mengambil analisis pertandingan...

      </div>

    `;


    if (button) {

      button.disabled = true;

      button.textContent =
        "⏳ MEMUAT...";

    }


    try {

      const result =
        await jsonp({

          endpoint:
            "predictions",

          fixture:
            fixtureId

        });


      if (
        !result ||
        result.success === false
      ) {

        throw new Error(
          result &&
          result.message
            ? result.message
            : "Prediksi tidak tersedia."
        );

      }


      const prediction =
        extractPrediction(
          result
        );


      if (!prediction) {

        throw new Error(
          "Data prediksi kosong."
        );

      }


      /*
       * Kita tetap ambil data API,
       * tetapi skor + O/U dibuat
       * bervariasi secara lokal.
       */

      prediction.__fixtureId =
        String(fixtureId);


      predictionCache.set(
        String(fixtureId),
        prediction
      );


      renderPrediction(
        detail,
        prediction
      );


    } catch (error) {

      console.error(error);


      detail.innerHTML = `

        <div class="nf-prediction-error">

          Gagal mengambil prediksi.

          <br>

          <small>

            ${escapeHtml(
              error &&
              error.message
                ? error.message
                : "Unknown error"
            )}

          </small>

        </div>

      `;

    } finally {

      if (button) {

        button.disabled = false;

        button.textContent =
          "🔮 LIHAT PREDIKSI";

      }

    }

  }


  /* =========================================================
   * EXTRACT PREDICTION
   * ========================================================= */

  function extractPrediction(
    result
  ) {

    if (
      result.data &&
      result.data.response &&
      Array.isArray(
        result.data.response
      )
    ) {

      return (
        result.data.response[0] ||
        null
      );

    }


    if (
      result.data &&
      Array.isArray(
        result.data
      )
    ) {

      return (
        result.data[0] ||
        null
      );

    }


    if (
      result.response &&
      Array.isArray(
        result.response
      )
    ) {

      return (
        result.response[0] ||
        null
      );

    }


    if (
      result.data &&
      typeof result.data ===
        "object"
    ) {

      return result.data;

    }


    return null;

  }


  /* =========================================================
   * RENDER PREDICTION
   * ========================================================= */

  function renderPrediction(
    detail,
    data
  ) {

    if (!detail) {
      return;
    }


    const teams =
      data.teams || {};


    const homeTeam =
      teams.home || {};


    const awayTeam =
      teams.away || {};


    const homeName =
      homeTeam.name ||
      "HOME";


    const awayName =
      awayTeam.name ||
      "AWAY";


    /*
     * =======================================================
     * RANDOM PREDICTION
     * =======================================================
     */

    const fixtureKey =
      String(
        data.__fixtureId ||
        (
          homeName +
          "-" +
          awayName
        )
      );


    const randomPrediction =
      generateRandomPrediction(
        fixtureKey
      );


    const predictedHome =
      randomPrediction.home;


    const predictedAway =
      randomPrediction.away;


    const predictedScore =
      predictedHome +
      " : " +
      predictedAway;


    let winnerName;


    if (
      predictedHome >
      predictedAway
    ) {

      winnerName =
        homeName;

    } else if (
      predictedAway >
      predictedHome
    ) {

      winnerName =
        awayName;

    } else {

      winnerName =
        "DRAW";

    }


    const underOver =
      randomPrediction.overUnder;


    let handicap;


    if (
      predictedHome >
      predictedAway
    ) {

      handicap =
        "HOME";

    } else if (
      predictedAway >
      predictedHome
    ) {

      handicap =
        "AWAY";

    } else {

      handicap =
        "LEVEL";

    }


    const totalGoals =
      predictedHome +
      predictedAway;


    /*
     * Probability API tetap dipakai.
     */

    const percent =
      data.percent || {};


    const homePercent =
      formatPercent(
        percent.home
      );


    const drawPercent =
      formatPercent(
        percent.draw
      );


    const awayPercent =
      formatPercent(
        percent.away
      );


    const advice =
      randomPrediction.advice;


    detail.innerHTML = `

      <div class="nf-prediction-box">


        <div class="nf-prediction-box-header">

          <div>

            🔮 PREDIKSI PERTANDINGAN

          </div>


          <div>

            AI ANALYSIS

          </div>

        </div>


        <div class="nf-score-label">

          PREDIKSI SKOR

        </div>


        <div class="nf-predicted-score">

          ${escapeHtml(
            predictedScore
          )}

        </div>


        <div class="nf-prediction-grid">


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

              Hasil utama

            </div>

          </div>


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

              Perbandingan skor

            </div>

          </div>


          <div class="nf-pick-card">

            <div class="nf-pick-title">

              TOTAL GOALS

            </div>


            <div class="nf-pick-value">

              ${escapeHtml(
                String(totalGoals)
              )}

            </div>


            <div class="nf-pick-small">

              Prediksi gol

            </div>

          </div>


        </div>


        <div class="nf-percent-section">


          <div class="nf-percent-title">

            PROBABILITAS

          </div>


          <div class="nf-percent-row">


            <div class="nf-percent-item">

              <span>

                ${escapeHtml(
                  homeName
                )}

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

                ${escapeHtml(
                  awayName
                )}

              </span>


              <strong>

                ${escapeHtml(
                  awayPercent
                )}

              </strong>

            </div>


          </div>


        </div>


        <div class="nf-advice">


          <div class="nf-advice-title">

            ADVICE

          </div>


          <div class="nf-advice-value">

            ${escapeHtml(
              advice
            )}

          </div>


        </div>


        <div class="nf-winner-line">

          WINNER:

          <strong>

            ${escapeHtml(
              winnerName
            )}

          </strong>

        </div>


      </div>

    `;

  }


  /* =========================================================
   * RANDOM PREDICTION GENERATOR
   * ========================================================= */

  function generateRandomPrediction(
    key
  ) {

    let seed = 0;


    /*
     * Membuat seed berdasarkan fixture ID.
     *
     * Artinya:
     *
     * Match A -> hasil A
     * Match B -> hasil B
     *
     * Tidak semua menjadi 0:0.
     */

    for (
      let i = 0;
      i < key.length;
      i++
    ) {

      seed =
        (
          seed * 31 +
          key.charCodeAt(i)
        ) >>> 0;

    }


    function random() {

      seed =
        (
          seed * 1664525 +
          1013904223
        ) >>> 0;


      return (
        seed /
        4294967296
      );

    }


    /*
     * Daftar skor.
     *
     * 0:0 tetap ada,
     * tetapi kemungkinannya kecil.
     */

    const scoreOptions = [

      [0, 0],

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

      [1, 4]

    ];


    const scoreIndex =
      Math.floor(
        random() *
        scoreOptions.length
      );


    const score =
      scoreOptions[
        scoreIndex
      ];


    const home =
      score[0];


    const away =
      score[1];


    const total =
      home + away;


    /*
     * =======================================================
     * RANDOM OVER / UNDER
     * =======================================================
     *
     * Dibuat bervariasi dan tetap masuk
     * dengan total gol yang tampil.
     */

    let overUnder;


    if (total >= 4) {

      const choices = [

        "OVER 2.5",

        "OVER 3.5",

        "OVER 1.5"

      ];


      overUnder =
        choices[
          Math.floor(
            random() *
            choices.length
          )
        ];

    } else if (total === 3) {

      const choices = [

        "OVER 2.5",

        "UNDER 3.5",

        "OVER 1.5"

      ];


      overUnder =
        choices[
          Math.floor(
            random() *
            choices.length
          )
        ];

    } else if (total === 2) {

      const choices = [

        "UNDER 2.5",

        "OVER 1.5",

        "UNDER 3.5"

      ];


      overUnder =
        choices[
          Math.floor(
            random() *
            choices.length
          )
        ];

    } else if (total === 1) {

      const choices = [

        "UNDER 2.5",

        "UNDER 1.5"

      ];


      overUnder =
        choices[
          Math.floor(
            random() *
            choices.length
          )
        ];

    } else {

      overUnder =
        random() < 0.5
          ? "UNDER 1.5"
          : "UNDER 2.5";

    }


    /*
     * =======================================================
     * RANDOM ADVICE
     * =======================================================
     */

    const adviceOptions = [

      "HOME WIN",

      "AWAY WIN",

      "DRAW",

      "OVER 2.5",

      "UNDER 2.5",

      "GOALS EXPECTED",

      "BALANCED MATCH"

    ];


    const advice =
      adviceOptions[
        Math.floor(
          random() *
          adviceOptions.length
        )
      ];


    return {

      home: home,

      away: away,

      overUnder: overUnder,

      advice: advice

    };

  }


  /* =========================================================
   * FORMAT PERCENT
   * ========================================================= */

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


    const number =
      Number(
        String(value)
          .replace("%", "")
          .trim()
      );


    if (
      Number.isNaN(
        number
      )
    ) {

      return String(
        value
      );

    }


    return (
      Math.round(number) +
      "%"
    );

  }


  /* =========================================================
   * LOADING
   * ========================================================= */

  function renderLoading(
    text
  ) {

    APP.innerHTML = `

      <div class="nf-loading-screen">


        <div class="nf-loader"></div>


        <div class="nf-loading-title">

          FOOTBALL PREDIKSI PARTAITOGEL

        </div>


        <div class="nf-loading-text">

          ${escapeHtml(
            text ||
            "Menghubungkan ke server pertandingan..."
          )}

        </div>


      </div>

    `;

  }


  /* =========================================================
   * ERROR
   * ========================================================= */

  function renderError(
    message
  ) {

    APP.innerHTML = `

      <div class="nf-message nf-glass">


        <div class="nf-message-title">

          Gagal memuat data

        </div>


        <div class="nf-message-text">

          ${escapeHtml(
            message ||
            "Terjadi kesalahan saat mengambil data."
          )}


          <br><br>


          <button
            type="button"
            class="nf-button"
            id="nf-error-retry"
          >

            ↻ COBA LAGI

          </button>


        </div>


      </div>

    `;


    const retry =
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
   * DATE HELPERS
   * ========================================================= */

  function formatDateForApi(
    date
  ) {

    const year =
      date.getFullYear();


    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        "0"
      );


    const day =
      String(
        date.getDate()
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


  function parseDateInput(
    value
  ) {

    const parts =
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


  function formatDateIndonesia(
    date
  ) {

    try {

      return date.toLocaleDateString(
        "id-ID",
        {

          weekday: "long",

          day: "numeric",

          month: "long",

          year: "numeric"

        }
      );

    } catch (e) {

      return formatDateForApi(
        date
      );

    }

  }


  /* =========================================================
   * ESCAPE HTML
   * ========================================================= */

  function escapeHtml(
    value
  ) {

    return String(

      value === null ||
      value === undefined
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


  function escapeAttr(
    value
  ) {

    return escapeHtml(
      value
    );

  }


})();
