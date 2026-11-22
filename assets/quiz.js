(function () {
  var Q = window.QUIZ.questions;
  var KEY = 'rh134quiz-' + window.QUIZ.key;
  var LETTERS = ['A', 'B', 'C', 'D'];
  var state = { picks: {}, shown: {}, graded: false, score: 0 };

  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.picks) state = saved;
  } catch (e) {}

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  var list = document.getElementById('questions');
  var scoreEl = document.getElementById('score');
  var resultEl = document.getElementById('result');

  Q.forEach(function (item, i) {
    var li = document.createElement('li');
    li.className = 'q';
    li.id = 'q' + (i + 1);
    var opts = item.o.map(function (text, j) {
      return '<label class="opt" data-j="' + j + '">' +
        '<input type="radio" name="q' + i + '" value="' + j + '">' +
        '<span class="letter">' + LETTERS[j] + '</span>' +
        '<span class="text"></span></label>';
    }).join('');
    li.innerHTML =
      '<div class="q-head"><span class="num">' + (i + 1) + '</span><p class="stem"></p></div>' +
      '<div class="opts">' + opts + '</div>' +
      '<div class="q-foot"><button type="button" class="reveal">顯示答案</button></div>' +
      '<div class="answer" hidden></div>';
    li.querySelector('.stem').textContent = item.q;
    li.querySelectorAll('.opt .text').forEach(function (el, j) { el.textContent = item.o[j]; });
    list.appendChild(li);

    li.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('change', function () {
        state.picks[i] = Number(inp.value);
        if (state.shown[i]) paint(i);
        markPicked(i);
        updateScore();
        save();
      });
    });
    li.querySelector('.reveal').addEventListener('click', function () {
      state.shown[i] = !state.shown[i];
      paint(i);
      save();
    });
  });

  function markPicked(i) {
    var li = document.getElementById('q' + (i + 1));
    li.querySelectorAll('.opt').forEach(function (lab) {
      lab.classList.toggle('picked', Number(lab.dataset.j) === state.picks[i]);
    });
  }

  function paint(i) {
    var item = Q[i];
    var li = document.getElementById('q' + (i + 1));
    var box = li.querySelector('.answer');
    var btn = li.querySelector('.reveal');
    var pick = state.picks[i];
    var on = !!state.shown[i];
    li.classList.remove('right', 'wrong');
    li.querySelectorAll('.opt').forEach(function (lab) {
      var j = Number(lab.dataset.j);
      lab.classList.toggle('correct', on && j === item.a);
      lab.classList.toggle('incorrect', on && j === pick && pick !== item.a);
    });
    if (!on) { box.hidden = true; btn.textContent = '顯示答案'; return; }
    var verdict;
    if (pick === undefined) verdict = '<span class="badge none">尚未作答</span>';
    else if (pick === item.a) { verdict = '<span class="badge ok">答對了</span>'; li.classList.add('right'); }
    else { verdict = '<span class="badge ng">答錯了，你選 ' + LETTERS[pick] + '</span>'; li.classList.add('wrong'); }
    box.innerHTML = '<p class="ans-line">' + verdict + ' 正確答案：<strong>' + LETTERS[item.a] + '</strong></p>' +
      '<p class="explain"></p><p class="ref">出處：' + window.QUIZ.key + ' 簡報第 ' + item.s + ' 頁</p>';
    box.querySelector('.explain').textContent = item.e;
    box.hidden = false;
    btn.textContent = '隱藏答案';
  }

  function updateScore() {
    var done = Object.keys(state.picks).length;
    var txt = '已作答 ' + done + ' / ' + Q.length;
    if (state.graded) txt += ' · 得分 ' + state.score + ' / ' + Q.length;
    scoreEl.textContent = txt;
  }

  function grade() {
    var right = 0, blank = 0;
    Q.forEach(function (item, i) {
      if (state.picks[i] === undefined) blank++;
      else if (state.picks[i] === item.a) right++;
      state.shown[i] = true;
      paint(i);
    });
    state.graded = true;
    state.score = right;
    var pct = Math.round(right / Q.length * 100);
    resultEl.hidden = false;
    resultEl.innerHTML = '<strong>得分 ' + right + ' / ' + Q.length + ' (' + pct + '%)</strong>' +
      '<span>答錯 ' + (Q.length - right - blank) + ' 題，未作答 ' + blank + ' 題。答錯的題目已標示紅色，可按「只看答錯的題目」複習。</span>';
    updateScore();
    save();
  }

  document.getElementById('btn-grade').addEventListener('click', function () {
    var blank = Q.length - Object.keys(state.picks).length;
    if (blank > 0) {
      resultEl.hidden = false;
      resultEl.innerHTML = '<span>還有 ' + blank + ' 題未作答，未作答的題目以答錯計分。</span>';
    }
    grade();
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  var revealAll = document.getElementById('btn-reveal');
  revealAll.addEventListener('click', function () {
    var allOn = Q.every(function (_, i) { return state.shown[i]; });
    Q.forEach(function (_, i) { state.shown[i] = !allOn; paint(i); });
    revealAll.textContent = allOn ? '全部顯示答案' : '全部隱藏答案';
    save();
  });

  var wrongBtn = document.getElementById('btn-wrong');
  var wrongOnly = false;
  wrongBtn.addEventListener('click', function () {
    wrongOnly = !wrongOnly;
    Q.forEach(function (item, i) {
      var li = document.getElementById('q' + (i + 1));
      var isWrong = state.picks[i] === undefined || state.picks[i] !== item.a;
      li.hidden = wrongOnly && !isWrong;
      if (wrongOnly && isWrong) { state.shown[i] = true; paint(i); }
    });
    wrongBtn.textContent = wrongOnly ? '顯示全部題目' : '只看答錯的題目';
    wrongBtn.classList.toggle('active', wrongOnly);
  });

  document.getElementById('btn-reset').addEventListener('click', function () {
    state = { picks: {}, shown: {}, graded: false, score: 0 };
    save();
    document.querySelectorAll('input[type=radio]').forEach(function (r) { r.checked = false; });
    Q.forEach(function (_, i) {
      document.getElementById('q' + (i + 1)).hidden = false;
      markPicked(i); paint(i);
    });
    wrongOnly = false;
    wrongBtn.textContent = '只看答錯的題目';
    wrongBtn.classList.remove('active');
    revealAll.textContent = '全部顯示答案';
    resultEl.hidden = true;
    updateScore();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // restore saved state
  Q.forEach(function (_, i) {
    if (state.picks[i] !== undefined) {
      var r = document.querySelector('input[name=q' + i + '][value="' + state.picks[i] + '"]');
      if (r) r.checked = true;
      markPicked(i);
    }
    if (state.shown[i]) paint(i);
  });
  if (state.graded) {
    resultEl.hidden = false;
    resultEl.innerHTML = '<strong>上次得分 ' + state.score + ' / ' + Q.length + '</strong><span>按「重新作答」可清除紀錄。</span>';
  }
  updateScore();
})();
