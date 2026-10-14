// General Knowledge Basics — one SCO, several pages.
// Works with both SCORM 1.2 (window.API) and SCORM 2004 (window.API_1484_11);
// the only difference between the two packages is imsmanifest.xml.
//
// What it stores:
//   location      -> current page index (bookmark for resume)
//   suspend_data  -> JSON { page, answers, visited, submitted }
//   status/score  -> set when the quiz is submitted (pass mark 60%)

var QUESTIONS = [
  { q: "How many days are there in a week?",        options: ["5", "7", "10"],                   answer: "7" },
  { q: "Which is the largest ocean on Earth?",      options: ["Atlantic", "Indian", "Pacific"],  answer: "Pacific" },
  { q: "What colour is the sky on a clear day?",    options: ["Green", "Blue", "Red"],           answer: "Blue" },
  { q: "How many continents are there?",            options: ["5", "7", "9"],                    answer: "7" },
  { q: "Which animal gives us milk?",               options: ["Cow", "Lion", "Eagle"],           answer: "Cow" },
  { q: "Which planet do we live on?",               options: ["Mars", "Earth", "Venus"],         answer: "Earth" },
  { q: "What do bees make?",                        options: ["Honey", "Silk", "Wool"],          answer: "Honey" },
  { q: "At what temperature does water boil?",      options: ["50 °C", "100 °C", "150 °C"],      answer: "100 °C" },
  { q: "How many months are there in a year?",      options: ["10", "12", "14"],                 answer: "12" },
  { q: "What is the Sun?",                          options: ["A planet", "A star", "A moon"],   answer: "A star" }
];
var PASS_MARK = 60;

// ---------------------------------------------------------------- SCORM wrapper
var scorm = (function () {
  function find(name) {
    var w = window, tries = 0;
    while (w && !w[name] && w.parent && w.parent !== w && tries++ < 10) w = w.parent;
    return (w && w[name]) || (window.opener && window.opener[name]) || null;
  }
  var api2004 = find("API_1484_11");
  var api12 = api2004 ? null : find("API");
  var version = api2004 ? "2004" : api12 ? "1.2" : null;

  var KEYS = {
    "1.2":  { name: "cmi.core.student_name", location: "cmi.core.lesson_location", suspend: "cmi.suspend_data",
              exit: "cmi.core.exit", sessionTime: "cmi.core.session_time",
              raw: "cmi.core.score.raw", min: "cmi.core.score.min", max: "cmi.core.score.max" },
    "2004": { name: "cmi.learner_name", location: "cmi.location", suspend: "cmi.suspend_data",
              exit: "cmi.exit", sessionTime: "cmi.session_time",
              raw: "cmi.score.raw", min: "cmi.score.min", max: "cmi.score.max" }
  }[version];

  var started = Date.now(), finished = false;
  function call(fn12, fn2004, a, b) { return version === "1.2" ? api12[fn12](a, b) : api2004[fn2004](a, b); }
  function get(k) { return call("LMSGetValue", "GetValue", KEYS[k] || k); }
  function set(k, v) { return call("LMSSetValue", "SetValue", KEYS[k] || k, String(v)); }
  function commit() { return call("LMSCommit", "Commit", ""); }

  // SCORM 1.2 wants HHHH:MM:SS.SS, SCORM 2004 wants an ISO 8601 duration
  function sessionTime() {
    var secs = (Date.now() - started) / 1000;
    if (version === "2004") return "PT" + secs.toFixed(1) + "S";
    var h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = (secs % 60).toFixed(2);
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  return {
    version: version,
    available: !!version,
    init: function () {
      call("LMSInitialize", "Initialize", "");
      // first launch -> mark as started
      if (version === "1.2") {
        var st = get("cmi.core.lesson_status");
        if (!st || st === "not attempted") set("cmi.core.lesson_status", "incomplete");
      } else if (get("cmi.completion_status") !== "completed") {
        set("cmi.completion_status", "incomplete");
      }
    },
    get: get, set: set, commit: commit,
    progress: function (fraction) { if (version === "2004") set("cmi.progress_measure", fraction.toFixed(2)); },
    result: function (score, passed) {
      set("raw", score); set("min", 0); set("max", 100);
      if (version === "1.2") {
        set("cmi.core.lesson_status", passed ? "passed" : "failed");
      } else {
        set("cmi.score.scaled", (score / 100).toFixed(2));
        set("cmi.completion_status", "completed");
        set("cmi.success_status", passed ? "passed" : "failed");
      }
      commit();
    },
    finish: function () {
      if (finished) return;
      finished = true;
      set("exit", "suspend");          // keep data so the learner resumes where they left
      set("sessionTime", sessionTime());
      call("LMSFinish", "Terminate", "");
    },
    isFinished: function () { return finished; }
  };
})();

// ---------------------------------------------------------------- course state
var pages = Array.prototype.slice.call(document.querySelectorAll(".page"));
var RESULTS = pages.length - 1;
var LAST_QUIZ = RESULTS - 1;
var state = { page: 0, answers: {}, visited: [0], submitted: false };
var $ = function (id) { return document.getElementById(id); };
var statusEl = $("status");

function save() {
  if (!scorm.available) return;
  scorm.set("location", state.page);
  scorm.set("suspend", JSON.stringify(state));
  scorm.progress(state.submitted ? 1 : state.visited.length / pages.length);
  scorm.commit();
}

// ---------------------------------------------------------------- rendering
function renderQuestions() {
  pages.forEach(function (page) {
    var range = page.getAttribute("data-questions");
    if (!range) return;
    var bounds = range.split("-").map(Number), box = page.querySelector(".questions");
    for (var i = bounds[0]; i <= bounds[1]; i++) {
      var q = QUESTIONS[i], html = '<div class="question"><fieldset><legend>' + (i + 1) + ". " + q.q + "</legend>";
      q.options.forEach(function (opt) {
        html += '<label><input type="radio" name="q' + i + '" value="' + opt + '"> ' + opt + "</label>";
      });
      box.insertAdjacentHTML("beforeend", html + "</fieldset></div>");
    }
  });
  document.querySelectorAll("input[type=radio]").forEach(function (input) {
    input.addEventListener("change", function () {
      state.answers[input.name] = input.value;
      $("warn").hidden = true;
      save();
    });
  });
}

function restoreAnswers() {
  document.querySelectorAll("input[type=radio]").forEach(function (input) {
    input.checked = state.answers[input.name] === input.value;
  });
}

function show(index) {
  state.page = Math.max(0, Math.min(index, pages.length - 1));
  if (state.page === RESULTS && !state.submitted) state.page = LAST_QUIZ; // results only after submitting
  if (state.visited.indexOf(state.page) < 0) state.visited.push(state.page);

  pages.forEach(function (p, i) { p.classList.toggle("active", i === state.page); });
  $("pageno").textContent = "Page " + (state.page + 1) + " of " + pages.length + " · " + pages[state.page].getAttribute("data-title");
  $("bar").style.width = ((state.page + 1) / pages.length) * 100 + "%";
  $("prev").disabled = state.page === 0;
  $("next").hidden = state.page === RESULTS;
  $("next").textContent = state.page === LAST_QUIZ ? "Submit answers ✓" : "Next →";
  if (state.page === RESULTS) renderResults();
  window.scrollTo(0, 0);
  save();
}

function score() {
  var correct = QUESTIONS.filter(function (q, i) { return state.answers["q" + i] === q.answer; }).length;
  return { correct: correct, percent: Math.round((correct / QUESTIONS.length) * 100) };
}

function submit() {
  var missing = QUESTIONS.filter(function (q, i) { return !state.answers["q" + i]; }).length;
  if (missing) {
    $("warn").textContent = "Please answer all questions — " + missing + " left. (Use ← Previous to check Part 1.)";
    $("warn").hidden = false;
    return;
  }
  var s = score();
  state.submitted = true;
  if (scorm.available) scorm.result(s.percent, s.percent >= PASS_MARK);
  show(RESULTS);
}

function renderResults() {
  var s = score(), passed = s.percent >= PASS_MARK;
  $("resultTitle").textContent = passed ? "🎉 Well done, you passed!" : "Almost there — try again!";
  $("scoreCard").className = "score card " + (passed ? "pass" : "fail");
  $("scoreCard").innerHTML = '<div class="big">' + s.percent + "%</div>" +
    "<div>" + s.correct + " of " + QUESTIONS.length + " correct · pass mark " + PASS_MARK + "%</div>";
  $("review").innerHTML = QUESTIONS.map(function (q, i) {
    var mine = state.answers["q" + i], ok = mine === q.answer;
    return "<li>" + q.q + "<br><span class=\"" + (ok ? "ok" : "bad") + "\">" + (ok ? "✓ " : "✗ ") + (mine || "No answer") + "</span>" +
           (ok ? "" : ' <span class="muted">— correct answer: ' + q.answer + "</span>") + "</li>";
  }).join("");
  statusEl.textContent = "Result saved: " + s.percent + "% — " + (passed ? "passed" : "failed") + ". Click Exit to finish.";
}

// ---------------------------------------------------------------- start
renderQuestions();

if (!scorm.available) {
  statusEl.textContent = "No SCORM API found — open this course through the player. (Preview mode, nothing is saved.)";
} else {
  scorm.init();
  $("learnerName").textContent = scorm.get("name") || "Learner";
  try {
    var saved = JSON.parse(scorm.get("suspend") || "null");
    if (saved && saved.answers) state = saved;   // ignore data from older versions of this course
  } catch (e) {}
  statusEl.textContent = "SCORM " + scorm.version + " · " + (state.page ? "Welcome back — resumed where you left off." : "Progress is saved automatically.");
}

restoreAnswers();
show(state.page);

$("prev").onclick = function () { show(state.page - 1); };
$("next").onclick = function () { state.page === LAST_QUIZ ? submit() : show(state.page + 1); };
$("retake").onclick = function () {
  state.answers = {};
  state.submitted = false;
  restoreAnswers();
  show(LAST_QUIZ - 1);
};
$("exit").onclick = function () {
  if (!scorm.available) return;
  save();
  scorm.finish();
  statusEl.textContent = "Progress saved. You can close this course.";
};
// Learner closed the tab or left via the player's "← Courses" link without clicking Exit
window.addEventListener("pagehide", function () {
  if (scorm.available && !scorm.isFinished()) { save(); scorm.finish(); }
});
