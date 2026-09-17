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

  var currentDate =
    getToday();

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


    var finished =
      false;


    var script =
      document.createElement(
        "script"
      );


    var timeout;


    function cleanup() {

      if (timeout) {

        clearTimeout(
          timeout
        );

      }


      if (
        script &&
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


    function finish(
      error,
      data
    ) {

      if (finished) {
        return;
      }

      finished = true;

      cleanup();

      callback(
        error,
        data
      );

    }


    window[
      callbackName
    ] = function (
      data
    ) {

      finish(
        null,
        data
      );

    };


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
      query.join(
        "&"
      );


    script.async =
      true;


    script.onerror =
      function () {

        finish(

          new Error(
            "Gagal menghubungkan ke API."
          )

        );

      };


    timeout =
      setTimeout(
        function () {

          finish(

            new Error(
              "Request API timeout."
            )

          );

        },
        30000
      );


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
      function (
        match
      ) {

        var league =
          match.league ||
          {};


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
        function (
          a,
          b
        ) {

          return leagues[a].name
            .localeCompare(
              leagues[b].name
            );

        }
      )

      .map(
        function (
          key
        ) {

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


    if (date) {

      date.addEventListener(
        "change",
        function () {

          if (
            date.value
          ) {

            loadFixtures(
              date.value
            );

          }

        }
      );

    }


    if (league) {

      league.addEventListener(
        "change",
        updateMatches
      );

    }


    if (search) {

      search.addEventListener(
        "input",
        updateMatches
      );

    }


    if (refresh) {

      refresh.addEventListener(
        "click",
        function () {

          loadFixtures(
            currentDate
          );

        }
      );

    }

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


    var leagueElement =
      document.getElementById(
        "nf-league"
      );


    var searchElement =
      document.getElementById(
        "nf-search"
      );


    var league =
      leagueElement
        ? leagueElement.value
        : "";


    var search =
      searchElement
        ? searchElement.value
            .trim()
            .toLowerCase()
        : "";


    var filtered =
      fixtures.filter(
        function (
          match
        ) {

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


    var count =
      document.getElementById(
        "nf-count"
      );


    var dateTitle =
      document.getElementById(
        "nf-date-title"
      );


    if (count) {

      count.textContent =
        filtered.length +
        " pertandingan";

    }


    if (dateTitle) {

      dateTitle.textContent =
        formatDate(
          currentDate
        );

    }


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
      match.fixture ||
      {};


    var league =
      match.league ||
      {};


    var teams =
      match.teams ||
      {};


    var home =
      teams.home ||
      {};


    var away =
      teams.away ||
      {};


    var status =
      fixture.status ||
      {};


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
        data-match-id="${fixture.id || ""}"
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


            <div>

              <div class="nf-prediction-value">

                Belum dimuat

              </div>


              <div class="nf-prediction-confidence">

                Tekan tombol untuk melihat analisis

              </div>

            </div>


            ${predictionButton}

          </div>


        </div>


      </article>

    `;

  }


  /* ==================================================
     PREDICTION BUTTON
  ================================================== */

  document.addEventListener(
    "click",
    function (
      event
    ) {

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


      if (!fixture) {
        return;
      }


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


    button.disabled =
      true;


    button.textContent =
      "MENGANALISIS...";


    var main =
      card.querySelector(
        ".nf-prediction-main"
      );


    if (main) {

      main.innerHTML = `

        <div class="nf-prediction-loading">

          <span class="nf-mini-loader"></span>

          <span>
            Menganalisis pertandingan...
          </span>

        </div>

      `;

    }


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
            "🔄 COBA LAGI";


          showPredictionError(
            card,
            error.message
          );


          return;

        }


        if (
          !result ||
          !result.success
        ) {

          button.textContent =
            "🔄 COBA LAGI";


          showPredictionError(

            card,

            result &&
            result.error

              ? result.error

              : "Prediction API error."

          );


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


          showPredictionError(

            card,

            "Data prediksi belum tersedia untuk pertandingan ini."

          );


          return;

        }


        renderPrediction(
          card,
          data,
          fixture
        );


        button.remove();

      }

    );

  }


  /* ==================================================
     RENDER PREDICTION
  ================================================== */

  function renderPrediction(
    card,
    data,
    fixture
  ) {

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


    var advice =
      prediction.advice ||
      "Analisis tersedia";


    /*
      -----------------------------------------------
      WINNER
      -----------------------------------------------
    */

    var winnerName =
      winner.name ||
      "";


    var winnerComment =
      winner.comment ||
      "";


    /*
      -----------------------------------------------
      SCORE
      -----------------------------------------------
    */

    var homeGoals =
      cleanPredictionValue(
        goals.home
      );


    var awayGoals =
      cleanPredictionValue(
        goals.away
      );


    var predictedScore =
      "--";


    if (
      homeGoals !== null &&
      awayGoals !== null
    ) {

      predictedScore =
        homeGoals +
        " - " +
        awayGoals;

    }


    /*
      -----------------------------------------------
      OVER / UNDER
      -----------------------------------------------
    */

    var underOver =
      prediction.under_over ||
      "";


    var overUnder =
      formatOverUnder(
        underOver
      );


    /*
      -----------------------------------------------
      1X2
      -----------------------------------------------
    */

    var oneXTwo =
      get1X2Prediction(
        prediction,
        winner,
        homeGoals,
        awayGoals
      );


    /*
      -----------------------------------------------
      HANDICAP
      -----------------------------------------------
    */

    var handicap =
      getHandicapPrediction(
        prediction,
        winner,
        homeGoals,
        awayGoals
      );


    /*
      -----------------------------------------------
      PERCENT
      -----------------------------------------------
    */

    var homePercent =
      percent.home ||
      "--";


    var drawPercent =
      percent.draw ||
      "--";


    var awayPercent =
      percent.away ||
      "--";


    /*
      -----------------------------------------------
      MAIN
      -----------------------------------------------
    */

    var main =
      card.querySelector(
        ".nf-prediction-main"
      );


    if (!main) {
      return;
    }


    main.innerHTML = `

      <div style="width:100%;">

        <div class="nf-prediction-box">


          <div
            class="nf-prediction-box-header"
          >

            <div>
              🔮 MATCH PREDICTION
            </div>

            <div>
              FIXTURE #${escapeHtml(
                fixture
              )}
            </div>

          </div>


          <div class="nf-score-label">

            🎯 PREDIKSI SKOR

          </div>


          <div class="nf-predicted-score">

            ${escapeHtml(
              predictedScore
            )}

          </div>


          <div class="nf-prediction-grid">


            <div class="nf-pick-card">

              <div class="nf-pick-title">
                🏆 PEMENANG
              </div>

              <div class="nf-pick-value">

                ${
                  winnerName
                    ? escapeHtml(
                        winnerName
                      )
                    : "NO CLEAR WINNER"
                }

              </div>

            </div>


            <div class="nf-pick-card">

              <div class="nf-pick-title">
                ⚽ OVER / UNDER
              </div>

              <div class="nf-pick-value">

                ${
                  overUnder
                    ? escapeHtml(
                        overUnder
                      )
                    : "N/A"
                }

              </div>

            </div>


            <div class="nf-pick-card">

              <div class="nf-pick-title">
                1X2
              </div>

              <div class="nf-pick-value">

                ${escapeHtml(
                  oneXTwo
                )}

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

            </div>


          </div>


          <div class="nf-percent-section">


            <div class="nf-percent-title">

              📊 PROBABILITY HASIL

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


          <div class="nf-advice">


            <div class="nf-advice-title">

              💡 ANALYSIS / ADVICE

            </div>


            <div class="nf-advice-value">

              ${escapeHtml(
                advice
              )}

            </div>


          </div>


          ${
            winnerComment

              ? `

                <div class="nf-winner-line">

                  <span>
                    CONFIDENCE
                  </span>

                  <strong>

                    ${escapeHtml(
                      winnerComment
                    )}

                  </strong>

                </div>

              `

              : ""

          }


        </div>

      </div>

    `;

  }


  /* ==================================================
     1X2
  ================================================== */

  function get1X2Prediction(
    prediction,
    winner,
    homeGoals,
    awayGoals
  ) {

    /*
      Jika skor prediksi tersedia,
      gunakan skor terlebih dahulu.
    */

    if (
      homeGoals !== null &&
      awayGoals !== null
    ) {

      if (
        homeGoals >
        awayGoals
      ) {

        return "HOME";

      }


      if (
        awayGoals >
        homeGoals
      ) {

        return "AWAY";

      }


      return "DRAW";

    }


    /*
      Jika tidak ada skor,
      gunakan nama winner.
    */

    if (
      winner &&
      winner.name
    ) {

      var winnerName =
        String(
          winner.name
        ).toLowerCase();


      /*
        Kita tidak bisa menentukan
        HOME/AWAY secara absolut
        hanya dari nama winner
        di sini tanpa data tim pada
        objek prediction.

        Maka tampilkan nama pemenang.
      */

      return winner.name;

    }


    return "N/A";

  }


  /* ==================================================
     HANDICAP
  ================================================== */

  function getHandicapPrediction(
    prediction,
    winner,
    homeGoals,
    awayGoals
  ) {

    /*
      API-Football prediction endpoint
      tidak selalu menyediakan line handicap
      sportsbook seperti -0.5 / -1 / +0.25.

      Jadi kita tidak membuat angka handicap palsu.

      Jika ada skor prediksi, kita berikan
      arah handicap sederhana berdasarkan
      selisih skor.
    */

    if (
      homeGoals !== null &&
      awayGoals !== null
    ) {

      var diff =
        homeGoals -
        awayGoals;


      if (
        diff >= 2
      ) {

        return "HOME";

      }


      if (
        diff === 1
      ) {

        return "HOME";

      }


      if (
        diff === 0
      ) {

        return "LEVEL";

      }


      if (
        diff === -1
      ) {

        return "AWAY";

      }


      if (
        diff <= -2
      ) {

        return "AWAY";

      }

    }


    if (
      winner &&
      winner.name
    ) {

      return winner.name;

    }


    return "N/A";

  }


  /* ==================================================
     OVER / UNDER
  ================================================== */

  function formatOverUnder(
    value
  ) {

    if (
      value ===
      undefined ||
      value ===
      null
    ) {

      return "";

    }


    var text =
      String(
        value
      ).trim();


    if (!text) {
      return "";
    }


    /*
      Normalisasi beberapa bentuk
      yang mungkin dikembalikan API.
    */

    text =
      text
        .replace(
          /under/gi,
          "UNDER"
        )
        .replace(
          /over/gi,
          "OVER"
        );


    /*
      Contoh:
      "Over 2.5"
      "Under 3.5"
    */

    return text;

  }


  /* ==================================================
     CLEAN SCORE
  ================================================== */

  function cleanPredictionValue(
    value
  ) {

    if (
      value ===
      undefined ||
      value ===
      null ||
      value ===
      ""
    ) {

      return null;

    }


    var number =
      parseInt(
        value,
        10
      );


    if (
      isNaN(
        number
      )
    ) {

      return null;

    }


    return number;

  }


  /* ==================================================
     PREDICTION ERROR
  ================================================== */

  function showPredictionError(
    card,
    message
  ) {

    var main =
      card.querySelector(
        ".nf-prediction-main"
      );


    if (!main) {
      return;
    }


    main.innerHTML = `

      <div style="width:100%;">

        <div class="nf-prediction-error">

          ⚠️

          ${escapeHtml(
            message ||
            "Gagal mengambil data prediksi."
          )}

        </div>

      </div>

    `;

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


        <button
          id="nf-error-refresh"
          class="nf-button"
          type="button"
          style="margin-top:18px;"
        >

          🔄 COBA LAGI

        </button>

      </div>

    `;


    var retry =
      document.getElementById(
        "nf-error-refresh"
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
     ESCAPE HTML
  ================================================== */

  function escapeHtml(
    value
  ) {

    return String(
      value ===
      undefined ||
      value ===
      null
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


  /* ==================================================
     ESCAPE ATTRIBUTE
  ================================================== */

  function escapeAttr(
    value
  ) {

    return escapeHtml(
      value
    );

  }


})();
