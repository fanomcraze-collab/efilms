document.addEventListener("DOMContentLoaded", function () {

  // EmailJS init with your real public key
  emailjs.init("9uktlP7za33fhFkKV");

  var TMDB_KEY = "8265bd1679663a7ea12ac168da84d2e8";
  var TMDB_BASE = "https://api.themoviedb.org/3";
  var IMG_BASE = "https://image.tmdb.org/t/p/w300";

  var ACCOUNTS = [
    { user: "Admin", pass: "Admincreation" },
    { user: "Admin assistant", pass: "Syn12" },
    { user: "Assistant", pass: "12@12" }
  ];

  var currentUser = "";
  var searchDebounce = null;

  function show(id, displayType) {
    document.getElementById(id).style.display = displayType || "flex";
  }
  function hide(id) {
    document.getElementById(id).style.display = "none";
  }

  // ── INTRO ──────────────────────────────────────────────
  function exitIntro() {
    var intro = document.getElementById("intro");
    intro.style.transition = "opacity 0.5s ease";
    intro.style.opacity = "0";
    setTimeout(function () { hide("intro"); showLogin(); }, 500);
  }

  function initIntro() {
    var video = document.getElementById("introVideo");
    var intro = document.getElementById("intro");
    video.muted = true;
    video.playsInline = true;
    var p = video.play();
    if (p !== undefined) { p.catch(function () { exitIntro(); }); }
    var check = setInterval(function () {
      if (video.currentTime >= 2.8) { clearInterval(check); exitIntro(); }
    }, 50);
    setTimeout(function () {
      if (intro.style.display !== "none") { clearInterval(check); exitIntro(); }
    }, 5000);
  }

  // ── LOGIN ──────────────────────────────────────────────
  function showLogin() {
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    document.getElementById("error").textContent = "";
    show("loginPage", "block");
  }

  function handleLogin() {
    var user = document.getElementById("username").value.trim();
    var pass = document.getElementById("password").value;
    var err = document.getElementById("error");
    var match = ACCOUNTS.find(function (a) { return a.user === user && a.pass === pass; });
    if (match) {
      currentUser = user;
      err.textContent = "";
      hide("loginPage");
      showProfiles();
    } else {
      err.textContent = "Username or password is wrong.";
      var box = document.querySelector(".loginBox");
      box.style.animation = "none";
      void box.offsetWidth;
      box.style.animation = "shake 0.4s ease";
    }
  }

  // ── PROFILES ───────────────────────────────────────────
  function showProfiles() { show("profiles", "flex"); }

  // ── BOOT ───────────────────────────────────────────────
  function runBoot() {
    var welcome = document.getElementById("welcome");
    var lines = document.querySelectorAll("#bootLines div");
    welcome.classList.remove("exit");
    welcome.style.animation = "none";
    lines.forEach(function (l) { l.classList.remove("visible"); });
    show("boot", "flex");
    void welcome.offsetWidth;
    welcome.style.animation = "";

    var LINE_START = 1700;
    var LINE_GAP = 900;
    lines.forEach(function (line, i) {
      setTimeout(function () { line.classList.add("visible"); }, LINE_START + i * LINE_GAP);
    });

    var EXIT_AT = LINE_START + lines.length * LINE_GAP + 800;
    setTimeout(function () { welcome.classList.add("exit"); }, EXIT_AT);

    setTimeout(function () {
      show("app", "flex");
      setTimeout(function () {
        document.getElementById("app").classList.add("visible");
        loadAllMovies();
      }, 30);
    }, EXIT_AT + 1200);

    setTimeout(function () { hide("boot"); }, EXIT_AT + 2200);
  }

  // ── LOGOUT ─────────────────────────────────────────────
  function doLogout() {
    closeSearch();
    closeSupport();
    closeTrailer();
    var appEl = document.getElementById("app");
    appEl.classList.add("fadeOut");
    setTimeout(function () {
      appEl.classList.remove("visible");
      appEl.classList.remove("fadeOut");
      hide("app");
      document.querySelectorAll(".nav").forEach(function (n) { n.classList.remove("active"); });
      document.querySelector(".nav[data-section='home']").classList.add("active");
      currentUser = "";
      showLogin();
    }, 500);
  }

  // ── TMDB ───────────────────────────────────────────────
  function fetchMovies(path) {
    var url = TMDB_BASE + path + "?api_key=" + TMDB_KEY + "&language=en-US&region=US&page=1";
    return fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        return (data.results || []).filter(function (m) {
          return m.original_language === "en" && m.poster_path;
        });
      })
      .catch(function () { return []; });
  }

  function fetchTrailerKey(movieId) {
    var url = TMDB_BASE + "/movie/" + movieId + "/videos?api_key=" + TMDB_KEY + "&language=en-US";
    return fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var vids = (data.results || []).filter(function (v) { return v.site === "YouTube"; });
        var found =
          vids.find(function (v) { return v.type === "Trailer" && v.official; }) ||
          vids.find(function (v) { return v.type === "Trailer"; }) ||
          vids[0] || null;
        return found ? found.key : null;
      })
      .catch(function () { return null; });
  }

  function showSkeletons(row, n) {
    row.innerHTML = "";
    for (var i = 0; i < n; i++) {
      var s = document.createElement("div");
      s.className = "loadingCard";
      row.appendChild(s);
    }
  }

  function renderMovies(movies, row) {
    row.innerHTML = "";
    movies.forEach(function (movie) {
      var card = document.createElement("div");
      card.className = "movieCard";
      var img = document.createElement("img");
      img.src = IMG_BASE + movie.poster_path;
      img.alt = movie.title;
      img.loading = "lazy";
      var overlay = document.createElement("div");
      overlay.className = "playOverlay";
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      var pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathEl.setAttribute("d", "M8 5v14l11-7z");
      svg.appendChild(pathEl);
      overlay.appendChild(svg);
      var titleDiv = document.createElement("div");
      titleDiv.className = "cardTitle";
      titleDiv.textContent = movie.title;
      card.appendChild(img);
      card.appendChild(overlay);
      card.appendChild(titleDiv);
      card.addEventListener("click", (function (id, title) {
        return function () { openTrailer(id, title); };
      })(movie.id, movie.title));
      row.appendChild(card);
    });
  }

  function loadAllMovies() {
    var trendingRow = document.getElementById("trendingRow");
    var topRatedRow = document.getElementById("topRatedRow");
    var popularRow = document.getElementById("popularRow");
    showSkeletons(trendingRow, 10);
    showSkeletons(topRatedRow, 10);
    showSkeletons(popularRow, 10);
    Promise.all([
      fetchMovies("/trending/movie/week"),
      fetchMovies("/movie/top_rated"),
      fetchMovies("/movie/popular")
    ]).then(function (results) {
      renderMovies(results[0].slice(0, 18), trendingRow);
      renderMovies(results[1].slice(0, 18), topRatedRow);
      renderMovies(results[2].slice(0, 18), popularRow);
    });
  }

  // ── TRAILER ────────────────────────────────────────────
  function openTrailer(movieId, title) {
    var modal = document.getElementById("trailerModal");
    var frame = document.getElementById("trailerFrame");
    var mtitle = document.getElementById("modalTitle");
    var noT = modal.querySelector(".noTrailer");
    if (noT) { noT.remove(); }
    mtitle.textContent = title;
    frame.src = "";
    frame.style.display = "block";
    modal.classList.add("open");
    fetchTrailerKey(movieId).then(function (key) {
      if (key) {
        frame.src = "https://www.youtube.com/embed/" + key + "?autoplay=1&rel=0&modestbranding=1";
      } else {
        frame.style.display = "none";
        var msg = document.createElement("div");
        msg.className = "noTrailer";
        msg.textContent = "No trailer available for this title.";
        document.querySelector(".modalInner").appendChild(msg);
      }
    });
  }

  function closeTrailer() {
    var modal = document.getElementById("trailerModal");
    var frame = document.getElementById("trailerFrame");
    modal.classList.remove("open");
    frame.src = "";
    var noT = modal.querySelector(".noTrailer");
    if (noT) { noT.remove(); }
  }

  // ── SEARCH ─────────────────────────────────────────────
  function openSearch() {
    var overlay = document.getElementById("searchOverlay");
    overlay.classList.add("open");
    void overlay.offsetWidth;
    overlay.classList.add("visible");
    setTimeout(function () { document.getElementById("searchInput").focus(); }, 50);
  }

  function closeSearch() {
    var overlay = document.getElementById("searchOverlay");
    if (!overlay) return;
    overlay.classList.remove("visible");
    setTimeout(function () {
      overlay.classList.remove("open");
      document.getElementById("searchInput").value = "";
      document.getElementById("searchResults").innerHTML = "";
      var empty = document.getElementById("searchEmpty");
      if (empty) { empty.style.display = "block"; empty.textContent = "Start typing to search..."; }
    }, 300);
  }

  function doSearch(query) {
    var results = document.getElementById("searchResults");
    var empty = document.getElementById("searchEmpty");
    if (!query || query.length < 2) {
      results.innerHTML = "";
      empty.style.display = "block";
      empty.textContent = "Start typing to search...";
      return;
    }
    empty.style.display = "none";
    showSkeletons(results, 8);
    var url = TMDB_BASE + "/search/movie?api_key=" + TMDB_KEY + "&language=en-US&query=" + encodeURIComponent(query) + "&page=1";
    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var movies = (data.results || []).filter(function (m) { return m.poster_path; });
        if (movies.length === 0) {
          results.innerHTML = "";
          empty.style.display = "block";
          empty.textContent = "No results found for \"" + query + "\"";
        } else {
          renderMovies(movies.slice(0, 18), results);
          empty.style.display = "none";
        }
      })
      .catch(function () {
        results.innerHTML = "";
        empty.style.display = "block";
        empty.textContent = "Search failed. Please try again.";
      });
  }

  // ── SUPPORT ────────────────────────────────────────────
  function openSupport() {
    document.getElementById("supportUsername").value = currentUser;
    document.getElementById("supportMessage").value = "";
    document.getElementById("supportStatus").textContent = "";
    document.getElementById("supportStatus").className = "supportStatus";
    document.getElementById("supportSendBtn").disabled = false;
    document.getElementById("supportSendBtn").textContent = "SEND MESSAGE";
    var overlay = document.getElementById("supportOverlay");
    overlay.classList.add("open");
    void overlay.offsetWidth;
    overlay.classList.add("visible");
  }

  function closeSupport() {
    var overlay = document.getElementById("supportOverlay");
    if (!overlay) return;
    overlay.classList.remove("visible");
    setTimeout(function () { overlay.classList.remove("open"); }, 350);
  }

  function sendSupportMessage() {
    var username = document.getElementById("supportUsername").value;
    var message = document.getElementById("supportMessage").value.trim();
    var status = document.getElementById("supportStatus");
    var btn = document.getElementById("supportSendBtn");

    if (!message) {
      status.textContent = "Please describe your issue before sending.";
      status.className = "supportStatus error";
      return;
    }

    btn.disabled = true;
    btn.textContent = "SENDING...";
    status.textContent = "";
    status.className = "supportStatus";

    var now = new Date();
    var timeStr = now.toLocaleString();

    emailjs.send("service_6ze7suw", "template_zu65whp", {
      from_name: username,
      message: message,
      time: timeStr,
      to_email: "lifenassrf@gmail.com"
    })
    .then(function () {
      status.textContent = "Message sent! We will get back to you soon.";
      status.className = "supportStatus success";
      btn.textContent = "SEND MESSAGE";
      btn.disabled = false;
      document.getElementById("supportMessage").value = "";
    })
    .catch(function () {
      status.textContent = "Failed to send. Please try again.";
      status.className = "supportStatus error";
      btn.textContent = "SEND MESSAGE";
      btn.disabled = false;
    });
  }

  // ── NAV ────────────────────────────────────────────────
  document.querySelectorAll(".nav").forEach(function (nav) {
    nav.addEventListener("click", function () {
      var section = nav.getAttribute("data-section");
      if (section === "logout") { doLogout(); return; }
      document.querySelectorAll(".nav").forEach(function (n) { n.classList.remove("active"); });
      nav.classList.add("active");
      if (section === "search") { closeSupport(); openSearch(); }
      else if (section === "support") { closeSearch(); openSupport(); }
      else { closeSearch(); closeSupport(); }
    });
  });

  // ── EVENTS ─────────────────────────────────────────────
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document.getElementById("username").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { handleLogin(); }
  });
  document.getElementById("password").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { handleLogin(); }
  });

  document.getElementById("profiles").addEventListener("click", function (e) {
    var profile = e.target.closest(".profile");
    if (profile) { hide("profiles"); runBoot(); }
  });

  document.getElementById("modalClose").addEventListener("click", closeTrailer);
  document.getElementById("trailerModal").addEventListener("click", function (e) {
    if (e.target === this) { closeTrailer(); }
  });

  document.getElementById("searchCloseBtn").addEventListener("click", function () {
    closeSearch();
    document.querySelectorAll(".nav").forEach(function (n) { n.classList.remove("active"); });
    document.querySelector(".nav[data-section='home']").classList.add("active");
  });

  document.getElementById("searchInput").addEventListener("input", function () {
    clearTimeout(searchDebounce);
    var q = this.value.trim();
    searchDebounce = setTimeout(function () { doSearch(q); }, 350);
  });

  document.getElementById("supportCloseBtn").addEventListener("click", function () {
    closeSupport();
    document.querySelectorAll(".nav").forEach(function (n) { n.classList.remove("active"); });
    document.querySelector(".nav[data-section='home']").classList.add("active");
  });

  document.getElementById("supportSendBtn").addEventListener("click", sendSupportMessage);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeTrailer(); closeSearch(); closeSupport(); }
  });

  initIntro();

});
