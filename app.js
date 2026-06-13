/* ДЗ2 «Основное свойство дроби» — логика 7 механик
   Данные: data.json (Методист). Математику не менять.
   v2-заглушки для sort_fracs помечены /* V2 */

'use strict';

// ── УТИЛИТЫ ──────────────────────────────────────────────────────────────────

function makeFrac(n, d) {
  return `<span class="frac lk-mono"><span class="fn">${n}</span><span class="fd">${d}</span></span>`;
}

function makeMixed(w, n, d) {
  return `<span class="mixed-num lk-mono"><span>${w}</span>${makeFrac(n, d)}</span>`;
}

// Мини-маркап Методиста: **акцент** / `моно` / 7/4 → дробь
function fmtInline(text) {
  if (text == null) return '';
  return String(text)
    .replace(/\*\*(.+?)\*\*/g, (_, s) => `<span class="lk-hl">${s}</span>`)
    .replace(/`([^`]+)`/g,     (_, s) => `<span class="lk-mono">${s}</span>`)
    .replace(/(\d+)\/(\d+)/g,  (_, n, d) => makeFrac(n, d));
}

// Разбор: массив строк или строка с \n → абзацы
function renderFeedback(fb) {
  const parts = Array.isArray(fb) ? fb : String(fb).split('\n');
  return parts.map(p => p.trim()).filter(Boolean)
    .map(p => `<p class="fb-p">${fmtInline(p)}</p>`).join('');
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Нормализация алгебраического выражения для сравнения без учёта порядка букв/цифр
// "a3" → "3a", "3*a" → "3a", "3 a" → "3a", "3a" → "3a"
function normalizeAlg(raw) {
  let s = String(raw).trim().toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[*·×]/g, '');
  // "a3" или "ab3" → "3a" / "3ab"
  s = s.replace(/^([a-z]+)(\d+)$/, '$2$1');
  return s;
}

// Для ответов-дробей вида "2a/3": нормализуем числитель и знаменатель по отдельности
function normalizeFracAnswer(raw) {
  const s = String(raw).replace(/\s+/g, '');
  return s.split('/').map(normalizeAlg).join('/');
}

// ── ПРОГРЕСС + STREAK ────────────────────────────────────────────────────────

let checkedCount = 0;
let firstTryCount = 0;
let streak = 0;
let DATA = null;

function updateStreak() {
  const pill = document.getElementById('streak-pill');
  if (streak >= 2) {
    pill.textContent = `🔥 ${streak} подряд!`;
    pill.hidden = false;
  } else {
    pill.hidden = true;
  }
}

function markChecked(taskId, isFirstTryCorrect) {
  checkedCount++;
  if (isFirstTryCorrect) {
    firstTryCount++;
    streak++;
  } else {
    streak = 0;
  }

  document.getElementById(`card-${taskId}`).classList.add('is-done');
  const total = DATA.tasks.length;
  document.getElementById('prog-label').textContent = `${checkedCount} из ${total}`;
  document.getElementById('prog-fill').style.width = `${(checkedCount / total) * 100}%`;

  updateStreak();

  if (checkedCount === total) {
    setTimeout(() => showFinal(), 700);
  }
}

function showFinal() {
  const el = document.getElementById('final-screen');
  const total = DATA.tasks.length;
  const tier = firstTryCount === total ? '🏆 Идеально, ни одной осечки!'
             : firstTryCount >= total - 2 ? '💪 Крепко держишь тему!'
             : '🔁 Загляни в разборы выше — и прорешай ещё разок.';
  document.getElementById('final-tier').textContent = tier;
  document.getElementById('final-counter').innerHTML =
    `<b>${firstTryCount}</b> ${DATA.final.counter_label} из ${total}`;
  el.classList.add('show');
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── МЕХАНИКА А: ВЕРНО / НЕВЕРНО (З1) ─────────────────────────────────────────

function buildTrueFalse(task) {
  return task.items.map(item => `
    <div class="tf-item" id="tfi-${task.id}-${item.id}">
      <div class="tf-text">${fmtInline(item.text)}</div>
      <div class="tf-btns">
        <button class="tf-btn" data-task="${task.id}" data-item="${item.id}" data-val="true">Верно</button>
        <button class="tf-btn" data-task="${task.id}" data-item="${item.id}" data-val="false">Неверно</button>
      </div>
    </div>`).join('');
}

function initTrueFalse(task, card) {
  card.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      card.querySelectorAll(`[data-item="${btn.dataset.item}"]`)
          .forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
  return {
    check() {
      let allAnswered = true, allCorrect = true;
      task.items.forEach(item => {
        const sel = card.querySelector(`[data-item="${item.id}"].selected`);
        if (!sel) { allAnswered = false; return; }
        const ok = (sel.dataset.val === 'true') === item.answer;
        if (!ok) allCorrect = false;
        card.querySelector(`#tfi-${task.id}-${item.id}`).classList.add(ok ? 'is-correct' : 'is-wrong');
        card.querySelectorAll(`[data-item="${item.id}"]`).forEach(b => b.disabled = true);
      });
      return { ok: allAnswered, correct: allCorrect };
    }
  };
}

// ── МЕХАНИКА Б: ВВОД НЕПРАВИЛЬНОЙ из смешанной (З2) ──────────────────────────

function buildInputImproper(task) {
  return task.items.map(item => `
    <div class="input-row" id="ii-row-${item.id}">
      <div class="input-src">${makeMixed(item.whole, item.num, item.den)}</div>
      <div class="input-arrow">→</div>
      <div class="input-frac-col">
        <div class="input-num-wrap">
          <input class="input-field" type="number" inputmode="numeric"
                 id="ii-${item.id}" min="1" max="999" placeholder="?">
        </div>
        <div class="input-den">${item.den}</div>
      </div>
    </div>`).join('');
}

function checkInputImproper(task, card) {
  let allFilled = true, allCorrect = true;
  task.items.forEach(item => {
    const val = parseInt(card.querySelector(`#ii-${item.id}`).value);
    if (isNaN(val)) { allFilled = false; return; }
    const ok = val === item.answer;
    if (!ok) allCorrect = false;
    card.querySelector(`#ii-row-${item.id}`).classList.add(ok ? 'is-correct' : 'is-wrong');
    card.querySelector(`#ii-${item.id}`).disabled = true;
  });
  return { ok: allFilled, correct: allCorrect };
}

// ── МЕХАНИКА В: МНОЖЕСТВЕННЫЙ ВЫБОР (З3) ─────────────────────────────────────

function buildMultiChoice(task) {
  return task.options.map(o => `
    <button class="mc-opt" data-key="${o.key}">
      <span class="mc-check">✓</span>
      <span class="mc-key">${o.key}</span>
      <span class="mc-text">${fmtInline(o.text)}</span>
    </button>`).join('');
}

function initMultiChoice(task, card) {
  const selected = new Set();
  card.querySelectorAll('.mc-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const key = btn.dataset.key;
      if (selected.has(key)) {
        selected.delete(key);
        btn.classList.remove('selected');
      } else {
        selected.add(key);
        btn.classList.add('selected');
      }
    });
  });
  return {
    check() {
      if (selected.size === 0) return { ok: false };
      const correctKeys = new Set(task.options.filter(o => o.correct).map(o => o.key));
      const isAllCorrect =
        correctKeys.size === selected.size &&
        [...selected].every(k => correctKeys.has(k));
      task.options.forEach(o => {
        const btn = card.querySelector(`[data-key="${o.key}"]`);
        if (o.correct)                            btn.classList.add('is-correct');
        else if (selected.has(o.key) && !o.correct) btn.classList.add('is-wrong');
        btn.disabled = true;
      });
      return { ok: true, correct: isAllCorrect };
    }
  };
}

// ── МЕХАНИКА Г: ЗАПОЛНИ ПРОПУСКИ с алгеброй (З4) ─────────────────────────────

function buildFillBlanks(task) {
  return task.items.map(item => {
    const leftFrac = makeFrac(item.left_n, item.left_d);
    const blankInput = `<input class="fb-input" type="text" inputmode="text"
                               id="fb-in-${item.id}" placeholder="?" autocomplete="off">`;
    const rn = item.blank_side === 'right_n' ? blankInput : item.right_n;
    const rd = item.blank_side === 'right_d' ? blankInput : item.right_d;
    const rightFrac = makeFrac(rn, rd);
    return `
      <div class="fb-row" id="fb-row-${item.id}">
        <div class="fb-eq">
          ${leftFrac}
          <span class="fb-eq-sign"> = </span>
          ${rightFrac}
        </div>
        <div class="fb-hint-text">${item.hint}</div>
      </div>`;
  }).join('');
}

function checkFillBlanks(task, card) {
  let allFilled = true, allCorrect = true;
  task.items.forEach(item => {
    const input = card.querySelector(`#fb-in-${item.id}`);
    const val = input ? input.value.trim() : '';
    if (!val) { allFilled = false; return; }
    const ok = normalizeAlg(val) === normalizeAlg(item.answer);
    if (!ok) allCorrect = false;
    card.querySelector(`#fb-row-${item.id}`).classList.add(ok ? 'is-correct' : 'is-wrong');
    if (input) input.disabled = true;
  });
  return { ok: allFilled, correct: allCorrect };
}

// ── МЕХАНИКА Д: УПОРЯДОЧИ (З5) ───────────────────────────────────────────────
/* V2-заглушка: живая числовая прямая 0…1 — ученик бросает плитки на прямую.
   Данные: task.fracs + task.correct_order — те же.
   Разместить как: <div id="number-line-t5" class="v2-placeholder"></div> */

function initSortFracs(task, card) {
  let order;
  do { order = shuffle(task.fracs.map((_, i) => i)); }
  while (order.every((v, i) => v === task.correct_order[i]));

  const list = card.querySelector('.sort-list');

  function render() {
    list.innerHTML = order.map((fi, pos) => {
      const [n, d] = task.fracs[fi];
      return `
        <div class="sort-item" draggable="true" data-pos="${pos}" data-fi="${fi}">
          <div class="sort-arrows">
            <button class="sort-arrow" data-dir="up"   data-pos="${pos}" ${pos === 0 ? 'disabled' : ''}>▲</button>
            <button class="sort-arrow" data-dir="down" data-pos="${pos}" ${pos === order.length - 1 ? 'disabled' : ''}>▼</button>
          </div>
          <div class="sort-frac">${makeFrac(n, d)}</div>
        </div>`;
    }).join('');

    list.querySelectorAll('.sort-arrow').forEach(btn => {
      btn.addEventListener('click', () => {
        const pos = parseInt(btn.dataset.pos);
        const to  = btn.dataset.dir === 'up' ? pos - 1 : pos + 1;
        if (to >= 0 && to < order.length) {
          [order[pos], order[to]] = [order[to], order[pos]];
          render();
        }
      });
    });

    let dragFrom = null;
    list.querySelectorAll('.sort-item').forEach(item => {
      item.addEventListener('dragstart', e => {
        dragFrom = parseInt(item.dataset.pos);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => item.classList.add('is-dragging'), 0);
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('is-dragging');
        list.querySelectorAll('.sort-item').forEach(i => i.classList.remove('is-drag-over'));
      });
      item.addEventListener('dragover', e => {
        e.preventDefault();
        list.querySelectorAll('.sort-item').forEach(i => i.classList.remove('is-drag-over'));
        item.classList.add('is-drag-over');
      });
      item.addEventListener('drop', e => {
        e.preventDefault();
        const to = parseInt(item.dataset.pos);
        if (dragFrom !== null && dragFrom !== to) {
          const moved = order.splice(dragFrom, 1)[0];
          order.splice(to, 0, moved);
          dragFrom = null;
          render();
        }
      });
    });
  }

  render();

  return {
    check() {
      const allCorrect = order.every((fi, i) => fi === task.correct_order[i]);
      list.querySelectorAll('.sort-item').forEach((item, pos) => {
        item.classList.add(order[pos] === task.correct_order[pos] ? 'is-correct' : 'is-wrong');
        item.setAttribute('draggable', 'false');
        item.querySelectorAll('.sort-arrow').forEach(b => b.disabled = true);
      });
      return { ok: true, correct: allCorrect };
    }
  };
}

// ── МЕХАНИКА Е: НАЙДИ ОШИБКУ (З6) ────────────────────────────────────────────

function buildFindError(task) {
  const opts = task.options.map(o => `
    <button class="lk-opt" data-key="${o.key}">
      <span class="lk-key">${o.key}</span>
      <span>${fmtInline(o.text)}</span>
    </button>`).join('');
  const shownWork = task.shown_work
    ? `<div class="shown-work">${fmtInline(task.shown_work)}</div>` : '';
  return `${shownWork}<div class="find-q">${fmtInline(task.question)}</div><div class="lk-opts">${opts}</div>`;
}

function initFindError(task, card) {
  let selected = null;
  card.querySelectorAll('.lk-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('is-locked')) return;
      card.querySelectorAll('.lk-opt').forEach(b => {
        b.style.borderColor = ''; b.style.background = '';
      });
      selected = btn.dataset.key;
      btn.style.borderColor = 'var(--lk-violet)';
      btn.style.background  = 'rgba(168,85,247,.10)';
    });
  });
  return {
    check() {
      if (!selected) return { ok: false };
      const selOpt = task.options.find(o => o.key === selected);
      task.options.forEach(o => {
        const btn = card.querySelector(`[data-key="${o.key}"]`);
        btn.style.borderColor = ''; btn.style.background = '';
        if (o.correct)              btn.classList.add('is-correct');
        else if (o.key === selected) btn.classList.add('is-wrong');
        btn.classList.add('is-locked');
      });
      return { ok: true, correct: selOpt?.correct ?? false };
    }
  };
}

// ── МЕХАНИКА Ж: СОКРАТИ ИЛИ НЕЛЬЗЯ (З7) ─────────────────────────────────────

function buildReduceOrCannot(task) {
  return task.items.map(item => `
    <div class="rnc-row" id="rnc-row-${item.id}">
      <div class="rnc-frac-box">${makeFrac(item.n, item.d)}</div>
      <div class="rnc-arrow">→</div>
      <div class="rnc-controls">
        <input class="rnc-text-input" type="text" inputmode="text"
               id="rnc-in-${item.id}" placeholder="ответ" autocomplete="off">
        <span class="rnc-or">или</span>
        <button class="rnc-cannot-btn" id="rnc-btn-${item.id}" data-id="${item.id}">нельзя</button>
      </div>
    </div>`).join('');
}

function initReduceOrCannot(task, card) {
  // state per item id → 'text' | 'cannot' | null
  const state = {};
  task.items.forEach(item => { state[item.id] = null; });

  task.items.forEach(item => {
    const input  = card.querySelector(`#rnc-in-${item.id}`);
    const canBtn = card.querySelector(`#rnc-btn-${item.id}`);

    input.addEventListener('input', () => {
      if (input.value.trim()) {
        state[item.id] = 'text';
        canBtn.classList.remove('selected');
      } else {
        state[item.id] = null;
      }
    });

    canBtn.addEventListener('click', () => {
      if (canBtn.disabled) return;
      state[item.id] = 'cannot';
      canBtn.classList.add('selected');
      input.value = '';
      input.disabled = true;
    });
  });

  return {
    check() {
      const allAnswered = task.items.every(item => state[item.id] !== null);
      if (!allAnswered) return { ok: false };

      let allCorrect = true;
      task.items.forEach(item => {
        const row = card.querySelector(`#rnc-row-${item.id}`);
        const input  = card.querySelector(`#rnc-in-${item.id}`);
        const canBtn = card.querySelector(`#rnc-btn-${item.id}`);
        let ok;

        if (item.cannot) {
          ok = state[item.id] === 'cannot';
        } else {
          const userVal = normalizeFracAnswer(input.value);
          const expected = normalizeFracAnswer(item.answer);
          ok = userVal === expected;
        }

        if (!ok) allCorrect = false;
        row.classList.add(ok ? 'is-correct' : 'is-wrong');
        input.disabled = true;
        canBtn.disabled = true;
      });
      return { ok: true, correct: allCorrect };
    }
  };
}

// ── РЕНДЕР ЗАДАНИЯ ────────────────────────────────────────────────────────────

function buildTask(task) {
  let body = '';
  if      (task.mechanic === 'true_false')         body = buildTrueFalse(task);
  else if (task.mechanic === 'input_improper')      body = buildInputImproper(task);
  else if (task.mechanic === 'multi_choice')        body = buildMultiChoice(task);
  else if (task.mechanic === 'fill_blanks')         body = buildFillBlanks(task);
  else if (task.mechanic === 'sort_fracs')          body = `<div class="sort-list"></div>`;
  else if (task.mechanic === 'find_error')          body = buildFindError(task);
  else if (task.mechanic === 'reduce_or_cannot')    body = buildReduceOrCannot(task);

  const card = document.createElement('div');
  card.className = 'task-card lk-card lk-screen';
  card.id = `card-${task.id}`;
  card.innerHTML = `
    <div class="task-head">
      <div class="task-label-wrap">
        <span class="task-label">${task.label}</span>
        <span class="task-done-check">✓</span>
      </div>
      <span class="task-diff">${task.difficulty}</span>
    </div>
    <p class="task-intro">${fmtInline(task.intro)}</p>
    <div class="task-body">${body}</div>
    <div class="task-feedback" id="fb-${task.id}">
      <div class="fb-label">Разбор</div>
      ${renderFeedback(task.feedback)}
    </div>
    <button class="lk-btn check-btn" id="btn-${task.id}">Проверить</button>`;
  return card;
}

// ── ИНИЦИАЛИЗАЦИЯ ─────────────────────────────────────────────────────────────

function init(data) {
  DATA = data;

  document.getElementById('cv-kicker').textContent = data.meta.kicker;
  document.getElementById('cv-title').textContent  = data.meta.title;
  document.getElementById('cv-lead').textContent   = data.meta.cover_lead || data.meta.subtitle;
  document.getElementById('cv-meta').textContent   =
    `${data.tasks.length} заданий · ~${data.meta.minutes || 12} мин`;

  document.getElementById('final-unlock').textContent = data.final.unlock;
  document.getElementById('final-tease').textContent  = data.final.tease;

  document.getElementById('cv-start').addEventListener('click', () => {
    document.getElementById('cover').hidden           = true;
    document.getElementById('hw-header').hidden       = false;
    document.getElementById('tasks-container').hidden = false;
    window.scrollTo(0, 0);
  });

  const container = document.getElementById('tasks-container');

  data.tasks.forEach(task => {
    const card = buildTask(task);
    container.appendChild(card);

    let checker;
    if      (task.mechanic === 'true_false')      checker = initTrueFalse(task, card);
    else if (task.mechanic === 'multi_choice')     checker = initMultiChoice(task, card);
    else if (task.mechanic === 'sort_fracs')       checker = initSortFracs(task, card);
    else if (task.mechanic === 'find_error')       checker = initFindError(task, card);
    else if (task.mechanic === 'reduce_or_cannot') checker = initReduceOrCannot(task, card);

    const btn = document.getElementById(`btn-${task.id}`);
    btn.addEventListener('click', () => {
      let result;
      if      (task.mechanic === 'input_improper') result = checkInputImproper(task, card);
      else if (task.mechanic === 'fill_blanks')    result = checkFillBlanks(task, card);
      else if (checker)                            result = checker.check();

      if (!result || !result.ok) {
        btn.classList.remove('shake');
        void btn.offsetWidth;
        btn.classList.add('shake');
        btn.addEventListener('animationend', () => btn.classList.remove('shake'), { once: true });
        return;
      }

      document.getElementById(`fb-${task.id}`).classList.add('show');
      btn.disabled = true;
      markChecked(task.id, result.correct);
    });
  });
}

// ── СТАРТ ─────────────────────────────────────────────────────────────────────

fetch('data.json')
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(init)
  .catch(() => {
    document.getElementById('tasks-container').innerHTML =
      '<p style="color:var(--lk-bad);padding:20px;font-size:15px">Ошибка загрузки данных. Обновите страницу.</p>';
  });
