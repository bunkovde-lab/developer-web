// Девелопер — portal app. Vanilla ES modules, no build step.
import { api, validCode, newToken } from './api.js';
import { store, getToken, setToken, discoverRooms, addRoom, forgetRoom, exportProgress, importProgress } from './store.js';
import { settle, weeklyContracts, weekStreak, weekEndsIn, isoWeek, careerStats, boardSummary, unlock } from './progress.js';
import {
  ART, PLAYER_COLORS, PROFESSIONS, professionById, ZONES, SIZES, STAGES, PROF_DISCOUNT, ALBUM, RANKS, LEVELS,
  levelOf, ACHIEVEMENTS, QUIZ, XP,
} from './data.js';
import { qrSvg } from './qr.js';

const GAME = 'game.html';
const CITY_TARGET = 16;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Number(n || 0).toLocaleString('ru-RU');
const art = p => ART + p;
const NAME_RE = /^[\p{L}\p{N} ._-]+$/u;
const portalUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
const inviteLink = code => portalUrl() + '?room=' + code;
const gameLink = code => GAME + '?room=' + encodeURIComponent(code);
const initials = name => (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
const plural = (n, one, few, many) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many; };

/* ---------------- Toasts ---------------- */
function toast(text, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = text;
  $('.toasts').append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 4200);
}

/* ---------------- Router ---------------- */
const VIEWS = ['play', 'games', 'career', 'academy'];
let activeView = null;
function viewFromHash() {
  const h = location.hash.slice(1);
  if (VIEWS.includes(h)) return h;
  if (h.startsWith('ac-')) return 'academy';
  return 'play';
}
function showView(view, anchor) {
  const swap = () => {
    activeView = view;
    for (const s of $$('.view')) s.hidden = s.dataset.view !== view;
    for (const a of $$('[data-tab]')) {
      if (a.dataset.tab === view) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    renderView(view);
  };
  if (document.startViewTransition && !reduced && activeView) document.startViewTransition(swap);
  else swap();
  requestAnimationFrame(() => {
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  });
}
window.addEventListener('hashchange', () => {
  const v = viewFromHash(), h = location.hash.slice(1);
  if (v !== activeView) showView(v, h.startsWith('ac-') ? h : null);
});

/* ---------------- Header chip ---------------- */
function renderMe() {
  const d = store.data, lv = levelOf(d.xp);
  for (const s of $$('[data-seal]')) s.textContent = initials(d.profile.name);
  $('[data-me-rank]').textContent = lv.rank;
  $('[data-me-level]').textContent = `Уровень ${lv.level} · ${fmt(d.xp)} XP`;
  $('[data-me-xp]').style.width = Math.min(100, ((d.xp - lv.from) / (lv.to - lv.from)) * 100) + '%';
}

/* ---------------- Hero: a drafting sheet that builds itself ---------------- */
const HERO = [
  { art: 'od', zone: 'Деловой центр', name: 'Бизнес-центр', value: 'продажа 1600 тыс.' },
  { art: 'waterfront', zone: 'Набережная', name: 'Резиденция у воды', value: 'продажа 2000 тыс.' },
  { art: 'jk4', zone: 'Жильё Ж4', name: 'Жилой комплекс', value: 'продажа 1800 тыс.' },
  { art: 'tower', zone: 'Небоскрёб', name: 'Башня победы', value: '4 очереди × 1000 тыс.', tower: true },
  { art: 'transit', zone: 'Транспортный узел', name: 'Транспортный хаб', value: 'продажа 2200 тыс.' },
  { art: 'ret', zone: 'Торговля', name: 'Торговая галерея', value: 'продажа 1200 тыс.' },
];
const STAGE_NAMES = ['Участок', 'Проект', 'Разрешение', 'Стройка', 'Ввод'];
function heroArt(b, stage) {
  if (b.tower) return art(`atelier/tower-${Math.max(1, stage)}.svg`);
  return art(`atelier/${b.art}-${stage}.svg`);
}
function startHero() {
  const a = $('[data-art-a]'), b = $('[data-art-b]');
  if (!a) return;
  let bi = 0, stage = 0, front = a, back = b, timer = null, visible = true;
  const show = (src) => {
    back.src = src;
    back.dataset.on = 'true';
    front.dataset.on = 'false';
    [front, back] = [back, front];
  };
  const paint = () => {
    const bld = HERO[bi];
    show(heroArt(bld, stage));
    $('[data-stage-zone]').textContent = bld.zone;
    $('[data-stage-name]').textContent = stage === 4 ? bld.name : STAGE_NAMES[stage];
    $('[data-stage-value]').textContent = stage === 4 ? bld.value : `этап ${stage} / 4`;
    $('[data-sheet-no]').textContent = String(bi + 1).padStart(2, '0');
    $('[data-stage-progress]').style.width = (stage / 4) * 100 + '%';
    $$('[data-step]').forEach(s => s.classList.toggle('on', Number(s.dataset.step) <= stage));
    // Preload the next frame.
    const nb = stage === 4 ? HERO[(bi + 1) % HERO.length] : bld, ns = stage === 4 ? 0 : stage + 1;
    new Image().src = heroArt(nb, ns);
  };
  const tick = () => {
    if (!visible || document.hidden) { timer = setTimeout(tick, 800); return; }
    if (stage === 4) { bi = (bi + 1) % HERO.length; stage = 0; } else stage++;
    paint();
    timer = setTimeout(tick, stage === 4 ? 2800 : 1250);
  };
  a.dataset.on = 'false'; b.dataset.on = 'false';
  if (reduced) { stage = 4; paint(); return; }
  paint();
  timer = setTimeout(tick, 1300);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe($('.stage'));
  const fig = $('[data-tilt]');
  if (matchMedia('(pointer: fine)').matches) {
    fig.addEventListener('pointermove', e => {
      const r = fig.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      const sheet = $('.stage-sheet');
      sheet.style.setProperty('--ry', (x * 14).toFixed(2) + 'deg');
      sheet.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg');
    });
    fig.addEventListener('pointerleave', () => { const s = $('.stage-sheet'); s.style.removeProperty('--rx'); s.style.removeProperty('--ry'); });
  }
}

/* ---------------- Live rooms ---------------- */
const live = new Map(); // code -> { data, error, status, at }
let pollTimer = null, polling = false;
let notifiedTurn = new Set();

function myTurn(data) {
  return !!data?.state && !Number.isInteger(data.state.winnerIndex) && data.expectedSeat === data.seat;
}
function activeCodes() {
  return Object.values(store.data.rooms).filter(r => !r.settled && !r.dead).map(r => r.code);
}
async function pollRooms() {
  if (polling) return;
  polling = true;
  discoverRooms();
  const rewards = [];
  try {
    await Promise.all(activeCodes().map(async code => {
      const token = getToken(code);
      if (!token) { live.set(code, { error: 'Ключ места не найден в этом браузере', status: 401 }); store.update(d => { d.rooms[code].dead = 401; }); return; }
      try {
        const data = await api.room(code, token);
        const prev = live.get(code)?.data;
        live.set(code, { data, at: Date.now() });
        store.data.rooms[code] = { ...store.data.rooms[code], status: data.state ? 'playing' : 'lobby', host: data.host, seen: Date.now() };
        if (data.state && Number.isInteger(data.state.winnerIndex)) rewards.push(...settle(data));
        else if (myTurn(data) && !myTurn(prev)) announceTurn(code, data);
        if (!myTurn(data)) notifiedTurn.delete(code);
      } catch (e) {
        const prev = live.get(code) || {};
        live.set(code, { ...prev, error: e.message, status: e.status });
        if ([401, 403, 404, 410].includes(e.status)) store.data.rooms[code] = { ...store.data.rooms[code], dead: e.status, deadMsg: e.message };
      }
    }));
  } finally {
    polling = false;
    store.save();
    updateTurnIndicators();
    if (rewards.length) queueRewards(rewards);
  }
}
function schedulePoll() {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => { await pollRooms(); schedulePoll(); }, document.hidden ? 45000 : 12000);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { pollRooms(); schedulePoll(); } });
window.addEventListener('online', () => pollRooms());

function announceTurn(code, data) {
  if (notifiedTurn.has(code)) return;
  notifiedTurn.add(code);
  if (document.hidden && store.data.notify && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const n = new Notification('Ваш ход в «Девелопере»', {
        body: `Комната ${code} · раунд ${data.state.round}. Соперники ждут вашего решения.`,
        icon: 'portal/icon-192.png', tag: 'turn-' + code, renotify: true,
      });
      n.onclick = () => { window.focus(); location.href = gameLink(code); };
    } catch { /* some browsers only allow notifications from a service worker */ }
  } else if (!document.hidden && activeView !== 'games') {
    toast(`Ваш ход в комнате ${code}`);
  }
}

function turnRooms() { return [...live.entries()].filter(([, v]) => myTurn(v.data)).map(([code, v]) => ({ code, data: v.data })); }
function updateTurnIndicators() {
  const turns = turnRooms();
  for (const b of $$('[data-turn-count]')) { b.hidden = !turns.length; b.textContent = turns.length; }
  document.title = (turns.length ? `(${turns.length}) Ваш ход · ` : '') + 'Девелопер — онлайн-настолка о строительстве города';
  if ('setAppBadge' in navigator) (turns.length ? navigator.setAppBadge(turns.length) : navigator.clearAppBadge()).catch(() => {});
  const alert = $('#turnAlert');
  if (turns.length) {
    const t = turns[0];
    alert.hidden = false;
    alert.innerHTML = `<img src="${art('premium/pawn-' + (t.data.seat + 1) + '.svg')}" alt="" width="40" height="40"><div class="grow"><b>Ваш ход${turns.length > 1 ? ` в ${turns.length} ${plural(turns.length, 'партии', 'партиях', 'партиях')}` : ''}</b><div class="muted small">Комната ${esc(t.code)} · раунд ${t.data.state.round}. Соперники ждут вашего решения.</div></div><a class="btn btn-gold" href="${gameLink(t.code)}">К полю →</a>`;
  } else alert.hidden = true;
  if (activeView === 'games') renderGames();
  if (activeView === 'play') renderContinue();
}

/* ---------------- Room cards ---------------- */
function plotOwnerColor(i) { return PLAYER_COLORS[i % PLAYER_COLORS.length]; }
function miniBoard(state, { highlight = [] } = {}) {
  const cells = state.plots.map((lot, i) => {
    const main = Number.isInteger(lot.reservedFor) ? state.plots[lot.reservedFor] : lot;
    const owner = Number.isInteger(main.municipalOrigin) || main.cityOwned ? 'city' : main.owner;
    const stage = main.project?.stage ?? (owner !== -1 && owner !== 'city' ? 0 : null);
    const cls = [owner === 'city' ? 'city' : '', highlight.includes(i) ? 'hl' : '', lot.skyscraperStage ? 'tower' : ''].filter(Boolean).join(' ');
    if (owner === -1 || owner === undefined) return `<i class="${cls}" title="${esc(lot.name)} · свободен"></i>`;
    if (owner === 'city') return `<i class="${cls}" title="${esc(lot.name)} · город"></i>`;
    return `<i class="${cls}" data-stage="${stage}" style="--c:${plotOwnerColor(owner)};--s:${stage}" title="${esc(lot.name)} · этап ${stage}/4"></i>`;
  }).join('');
  return `<div class="mini-board" role="img" aria-label="Карта города: 24 участка">${cells}</div>`;
}
function readyByPlayer(state) {
  const counts = state.players.map(() => 0);
  state.plots.forEach(l => { if (l.project?.stage === 4 && !Number.isInteger(l.reservedFor) && l.owner >= 0) counts[l.owner]++; });
  return counts;
}
function roomCard(code) {
  const meta = store.data.rooms[code] || { code };
  const entry = live.get(code) || {};
  const d = entry.data;
  if (meta.dead) {
    const msg = meta.dead === 410 ? 'Срок хранения комнаты истёк (30 дней).' : meta.dead === 404 ? 'Комната не найдена на сервере.' : 'Место в этой комнате принадлежит другому браузеру или устройству.';
    return `<article class="panel room"><div class="room-top"><div><span class="room-code">${esc(code)}</span><h3>Комната недоступна</h3></div><span class="badge rose">архив</span></div><p class="muted small">${esc(msg)}</p><div class="room-actions"><button class="btn btn-ghost" data-forget="${esc(code)}">Убрать из списка</button></div></article>`;
  }
  if (!d) {
    return `<article class="panel room"><div class="room-top"><div><span class="room-code">${esc(code)}</span><h3>${entry.error ? 'Нет связи' : 'Загружаем…'}</h3></div></div><p class="muted small">${esc(entry.error || 'Получаем состояние комнаты с сервера.')}</p><div class="room-actions"><a class="btn btn-ghost" href="${gameLink(code)}">Открыть поле</a></div></article>`;
  }
  if (!d.state) {
    const n = d.players.length;
    return `<article class="panel room"><div class="room-top"><div><span class="room-code">${esc(code)}</span><h3>Сбор игроков · ${n}/6</h3></div><span class="badge teal">лобби</span></div>
      <ul class="players">${d.players.map((p, i) => `<li class="${i === d.seat ? 'me' : ''}"><span class="sw" style="--c:${plotOwnerColor(i)}"></span><b>${esc(p.name)}${i === d.seat ? ' · вы' : ''}</b><small>${esc(professionById(p.profession).name)}</small></li>`).join('')}</ul>
      <p class="muted small">${n < 3 ? `Нужно ещё ${3 - n} ${plural(3 - n, 'игрок', 'игрока', 'игроков')}, чтобы начать.` : d.host ? 'Можно начинать партию.' : 'Создатель комнаты начнёт партию.'}</p>
      <div class="room-actions"><button class="btn btn-gold" data-lobby="${esc(code)}">Открыть лобби</button><button class="btn btn-ghost btn-small" data-copy="${esc(code)}" aria-label="Скопировать ссылку">Ссылка</button></div></article>`;
  }
  const s = d.state, ready = readyByPlayer(s), total = ready.reduce((a, b) => a + b, 0) + s.plots.filter(l => l.project?.stage === 4 && !Number.isInteger(l.reservedFor) && l.owner < 0).length;
  const mine = myTurn(d), deciding = d.players[d.expectedSeat]?.name || '—';
  return `<article class="panel room ${mine ? 'my-turn' : ''}">
    <div class="room-top"><div><span class="room-code">${esc(code)} · раунд ${s.round}</span><h3>${mine ? 'Ваше решение' : 'Ходит ' + esc(deciding)}</h3></div>${mine ? '<span class="badge gold">ваш ход</span>' : '<span class="badge">идёт партия</span>'}</div>
    <div class="room-body">${miniBoard(s)}
      <ul class="players">${s.players.map((p, i) => `<li class="${i === d.seat ? 'me' : ''} ${i === d.expectedSeat ? 'turn' : ''}"><span class="sw" style="--c:${plotOwnerColor(i)}"></span><b>${esc(d.players[i]?.name || p.name)}</b><small>${fmt(p.money)} · ${ready[i]} зд.</small></li>`).join('')}</ul>
    </div>
    <div class="room-progress">Город застроен на ${Math.min(total, 24)} из ${CITY_TARGET} клеток до финала<div class="bar"><i style="width:${Math.min(100, (total / CITY_TARGET) * 100)}%"></i></div></div>
    <div class="room-actions"><a class="btn ${mine ? 'btn-gold' : 'btn-ghost'}" href="${gameLink(code)}">Открыть поле →</a><button class="btn btn-ghost btn-small" data-copy="${esc(code)}" aria-label="Скопировать ссылку">Ссылка</button></div>
  </article>`;
}
function orderedActive() {
  return activeCodes().sort((a, b) => (myTurn(live.get(b)?.data) - myTurn(live.get(a)?.data)) || ((store.data.rooms[b].added || 0) - (store.data.rooms[a].added || 0)));
}
function renderContinue() {
  const deadOrActive = Object.values(store.data.rooms).filter(r => !r.settled).map(r => r.code);
  const codes = orderedActive().slice(0, 3);
  $('#continueBlock').hidden = !codes.length;
  if (codes.length) $('#continueList').innerHTML = codes.map(roomCard).join('');
  return deadOrActive;
}
function renderGames() {
  const codes = [...orderedActive(), ...Object.values(store.data.rooms).filter(r => r.dead && !r.settled).map(r => r.code)];
  $('#roomsList').innerHTML = codes.map(roomCard).join('');
  $('#roomsEmpty').hidden = codes.length > 0 || store.data.history.length > 0;
  const btn = $('[data-action="notify"]');
  btn.setAttribute('aria-pressed', String(!!store.data.notify && 'Notification' in window && Notification.permission === 'granted'));
  const h = store.data.history;
  $('#historyBlock').hidden = !h.length;
  $('[data-history]').innerHTML = h.map(r => `<li>
      <span class="res ${r.won ? 'win' : ''}">${r.won ? 'Победа' : 'Финал'}</span>
      <div><b>${r.won ? (r.winType === 'skyscraper' ? 'Победа небоскрёбом' : 'Победа линией') : 'Победил ' + esc(r.winnerName)}</b><small>Комната ${esc(r.code)} · ${r.players} игр. · ${esc(professionById(r.profession).name)} · ${r.buildings} зд. · капитал ${fmt(r.money)} · ${new Date(r.finishedAt).toLocaleDateString('ru-RU')}</small></div>
      <span class="xp">+${fmt(r.xp)} XP</span></li>`).join('');
}

document.addEventListener('click', async e => {
  const t = e.target.closest('[data-copy],[data-lobby],[data-forget],[data-action]');
  if (!t) return;
  if (t.dataset.copy) copyInvite(t.dataset.copy);
  else if (t.dataset.lobby) openLobby(t.dataset.lobby);
  else if (t.dataset.forget) { forgetRoom(t.dataset.forget); live.delete(t.dataset.forget); renderView(activeView); }
  else {
    const a = t.dataset.action;
    if (a === 'create') openCreate();
    else if (a === 'join') openJoin();
    else if (a === 'notify') toggleNotify();
    else if (a === 'export') doExport();
    else if (a === 'import') doImport();
  }
});

async function copyInvite(code) {
  const url = inviteLink(code);
  try { await navigator.clipboard.writeText(url); toast('Ссылка скопирована — отправьте её друзьям'); }
  catch { prompt('Ссылка на комнату', url); }
}
async function toggleNotify() {
  if (!('Notification' in window)) { toast('Этот браузер не поддерживает уведомления', 'err'); return; }
  if (store.data.notify && Notification.permission === 'granted') { store.update(d => { d.notify = false; }); toast('Уведомления о ходе выключены'); renderGames(); return; }
  const p = await Notification.requestPermission();
  if (p === 'granted') { store.update(d => { d.notify = true; }); toast('Сообщим, когда ваш ход, — пока эта вкладка открыта'); }
  else toast('Уведомления запрещены в настройках браузера', 'err');
  renderGames();
}

/* ---------------- Dialogs: create / join / invite / lobby ---------------- */
const roomDialog = $('#roomDialog');
const roomBody = $('[data-room-body]');
let lobbyTimer = null, lobbyCode = null;
roomDialog.addEventListener('close', () => { clearTimeout(lobbyTimer); lobbyCode = null; });

function profileFields(title = 'Профессия') {
  const p = store.data.profile;
  return `<label>Ваше имя<input name="name" maxlength="28" autocomplete="nickname" required placeholder="Например, Дмитрий" value="${esc(p.name)}"></label>
  <fieldset class="prof-pick"><legend>${title}</legend>${PROFESSIONS.map(pr => `<label><input type="radio" name="profession" value="${pr.id}" ${pr.id === p.profession ? 'checked' : ''}><img src="${art(pr.icon)}" alt=""><b>${pr.name}</b><small>${pr.stage}</small></label>`).join('')}</fieldset>`;
}
function readProfile(form) {
  const name = form.name.value.trim(), profession = form.profession.value;
  if (!name) throw new Error('Укажите имя — так вас увидят соперники');
  if (name.length > 28 || !NAME_RE.test(name)) throw new Error('Имя: до 28 букв, цифр, пробелов, точек или дефисов');
  store.update(d => { d.profile = { name, profession }; });
  return { name, profession };
}
function openDialog() { if (!roomDialog.open) roomDialog.showModal(); }
function busy(form, on, label) {
  const b = form.querySelector('button[type=submit]');
  if (!b) return;
  b.disabled = on;
  if (label) b.dataset.label ||= b.textContent, b.textContent = on ? label : b.dataset.label;
}

function openCreate() {
  roomBody.innerHTML = `<p class="eyebrow">Новая комната</p><h2 id="roomDialogTitle">Соберите стол</h2>
  <p class="muted">Вы получите ссылку и QR-код. Друзья входят со своих телефонов, нужно 3–6 игроков.</p>
  <form class="dialog-body" style="padding:0" data-create>${profileFields('Ваша профессия')}<p class="form-error" role="alert"></p>
  <button class="btn btn-gold btn-lg" type="submit">Создать комнату</button></form>`;
  openDialog();
  const form = $('[data-create]', roomBody);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('.form-error', form);
    try {
      const prof = readProfile(form);
      busy(form, true, 'Создаём…');
      const token = newToken();
      const data = await api.create(prof, token);
      setToken(data.code, token);
      addRoom(data.code, { host: true, status: 'lobby' });
      live.set(data.code, { data, at: Date.now() });
      openLobby(data.code, data);
    } catch (ex) { err.textContent = ex.message; busy(form, false); }
  });
  setTimeout(() => (form.name.value ? form.querySelector('button[type=submit]') : form.name).focus(), 60);
}

function openJoin(prefill = '', invited = false) {
  roomBody.innerHTML = `<p class="eyebrow">${invited ? 'Приглашение' : 'Вход по коду'}</p><h2 id="roomDialogTitle">${invited ? 'Вас ждут за столом' : 'Войти в комнату'}</h2>
  <p class="muted">${invited ? 'Друзья пригласили вас в партию «Девелопера». Представьтесь и выберите профессию — профессии могут повторяться.' : 'Введите восьмизначный код, который прислал создатель комнаты.'}</p>
  <form class="dialog-body" style="padding:0" data-join>
    <label>Код комнаты<input name="code" class="code-input" maxlength="8" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ABCD2345" value="${esc(prefill)}" ${invited ? 'readonly' : ''}></label>
    ${profileFields()}<p class="form-error" role="alert"></p>
    <button class="btn btn-gold btn-lg" type="submit">Войти в комнату</button></form>`;
  openDialog();
  const form = $('[data-join]', roomBody);
  form.code.addEventListener('input', () => { form.code.value = form.code.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('.form-error', form);
    const code = form.code.value.trim().toUpperCase();
    if (!validCode(code)) { err.textContent = 'Код — 8 символов: латинские буквы и цифры 2–9'; return; }
    let fresh = false;
    try {
      const prof = readProfile(form);
      busy(form, true, 'Входим…');
      let token = getToken(code);
      if (!token) { token = newToken(); fresh = true; setToken(code, token); }
      const data = await api.join(code, prof, token);
      addRoom(code, { host: data.host, status: data.state ? 'playing' : 'lobby' });
      live.set(code, { data, at: Date.now() });
      if (data.state) { location.href = gameLink(code); return; }
      openLobby(code, data);
    } catch (ex) {
      if (fresh) { try { localStorage.removeItem('developer-online-' + code); } catch { /* ignore */ } }
      err.textContent = ex.message; busy(form, false);
    }
  });
  setTimeout(() => (invited || prefill ? form.name : form.code).focus(), 60);
}

function seatList(d, known = 0) {
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const p = d.players[i];
    if (p) rows.push(`<li class="${i >= known ? 'arrive' : ''}" style="animation-delay:${(i - known) * 80}ms"><img src="${art('premium/pawn-' + (i + 1) + '.svg')}" alt=""><div><b>${esc(p.name)}</b> ${i === d.seat ? '<span class="you">вы</span>' : ''}${i === 0 ? ' <span class="you">создатель</span>' : ''}<br><small>${esc(professionById(p.profession).name)}</small></div><span class="muted small">${i + 1}</span></li>`);
    else rows.push(`<li class="empty-seat"><span></span><span>${i < 3 ? 'Ждём игрока…' : 'Свободное место'}</span><span class="small">${i + 1}</span></li>`);
  }
  return rows.join('');
}
function openLobby(code, initial) {
  lobbyCode = code;
  const url = inviteLink(code);
  const canShare = !!navigator.share;
  roomBody.innerHTML = `<p class="eyebrow">Комната создана · хранится 30 дней</p><h2 id="roomDialogTitle">Зовите друзей</h2>
    <div class="lobby-code" aria-label="Код комнаты ${esc(code)}"><span>${esc(code.slice(0, 4))}</span><span>${esc(code.slice(4))}</span></div>
    <div class="lobby-grid"><div class="qr">${qrSvg(url)}</div>
      <div class="share-row">
        ${canShare ? '<button class="btn btn-gold wide" data-share>Поделиться ссылкой</button>' : ''}
        <button class="btn ${canShare ? 'btn-ghost' : 'btn-gold'} wide" data-copy="${esc(code)}">Скопировать ссылку</button>
        <a class="btn btn-ghost" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Играем в «Девелопера»! Заходи в комнату:')}">Telegram</a>
        <a class="btn btn-ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('Играем в «Девелопера»! Заходи: ' + url)}">WhatsApp</a>
      </div></div>
    <ol class="seats" data-seats></ol>
    <div data-lobby-action></div>
    <p class="lobby-status" data-lobby-status role="status"></p>`;
  openDialog();
  $('[data-share]', roomBody)?.addEventListener('click', () => navigator.share({ title: 'Девелопер — комната ' + code, text: 'Играем в «Девелопера»! Заходи в комнату:', url }).catch(() => {}));
  let shown = 0, sig = '';
  const paint = d => {
    const nextSig = d.players.map(p => p.name + '/' + p.profession).join('|') + '#' + d.host;
    if (nextSig === sig) return;
    sig = nextSig;
    $('[data-seats]', roomBody).innerHTML = seatList(d, shown);
    shown = d.players.length;
    const n = d.players.length, act = $('[data-lobby-action]', roomBody), status = $('[data-lobby-status]', roomBody);
    if (d.host) {
      act.innerHTML = `<button class="btn btn-gold btn-lg" style="width:100%" data-start ${n < 3 ? 'disabled' : ''}>${n < 3 ? `Нужно ещё ${3 - n} ${plural(3 - n, 'игрок', 'игрока', 'игроков')}` : `Начать партию · ${n} ${plural(n, 'игрок', 'игрока', 'игроков')}`}</button>`;
      $('[data-start]', act)?.addEventListener('click', () => startGame(code));
      status.textContent = n < 3 ? 'Лобби обновляется автоматически.' : n < 6 ? 'Можно начинать или подождать ещё игроков.' : 'Все шесть мест заняты.';
    } else {
      act.innerHTML = '';
      status.textContent = 'Создатель комнаты начнёт партию, когда все соберутся. Не закрывайте страницу.';
    }
  };
  if (initial) paint(initial);
  const loop = async () => {
    if (lobbyCode !== code) return;
    try {
      const d = await api.room(code, getToken(code));
      live.set(code, { data: d, at: Date.now() });
      if (d.state) { $('[data-lobby-status]', roomBody).textContent = 'Партия начинается…'; setTimeout(() => { location.href = gameLink(code); }, 600); return; }
      paint(d);
    } catch (e) { $('[data-lobby-status]', roomBody).textContent = e.message; }
    lobbyTimer = setTimeout(loop, 2000);
  };
  lobbyTimer = setTimeout(loop, initial ? 1500 : 0);
}
async function startGame(code) {
  const btn = $('[data-start]', roomBody);
  if (btn) { btn.disabled = true; btn.textContent = 'Раздаём карты…'; }
  const token = getToken(code);
  try {
    let d = live.get(code)?.data || await api.room(code, token);
    try { d = await api.start(code, token, d.revision); }
    catch (e) { if (e.status !== 409) throw e; d = await api.room(code, token); if (!d.state) d = await api.start(code, token, d.revision); }
    location.href = gameLink(code);
  } catch (e) {
    toast(e.message, 'err');
    if (btn) { btn.disabled = false; btn.textContent = 'Начать партию'; }
  }
}

/* ---------------- Rewards ---------------- */
const rewardDialog = $('#rewardDialog');
const rewardQueue = [];
function queueRewards(events) {
  const result = events.find(e => e.type === 'result');
  const quiz = events.find(e => e.type === 'quiz');
  rewardQueue.push({ result, quiz, unlocks: events.filter(e => ['achievement', 'album', 'contract'].includes(e.type)), level: events.find(e => e.type === 'level') });
  renderAllLight();
  if (!rewardDialog.open) nextReward();
}
function nextReward() {
  const r = rewardQueue.shift();
  if (!r) return;
  const res = r.result, xp = res ? res.xp : r.quiz?.xp || 0;
  const title = res ? (res.result.won ? 'Победа!' : 'Партия доиграна') : 'Экзамен сдан';
  const sub = res ? (res.result.won ? (res.result.winType === 'skyscraper' ? 'Ваш небоскрёб поднялся над городом.' : 'Четыре здания в линию — город ваш.') : `Победил ${esc(res.result.winnerName)}. Опыт остаётся с вами.`) : 'Все ответы верны — вы готовы к первой партии.';
  const parts = res ? res.parts : r.quiz?.parts || [];
  $('[data-reward-body]').innerHTML = `<p class="eyebrow">${res ? 'Комната ' + esc(res.result.code) : 'Академия'}</p>
    <h2 id="rewardTitle">${title}</h2><p class="muted">${sub}</p>
    <div class="reward-xp" data-count="${xp}">+0</div>
    <ul class="reward-parts">${parts.map(([t, v], i) => `<li style="animation-delay:${200 + i * 90}ms"><span>${esc(t)}</span><b>+${fmt(v)}</b></li>`).join('')}</ul>
    ${r.unlocks.length ? `<div class="reward-unlocks">${r.unlocks.map(u => `<span class="unlock"><img src="${art(u.type === 'album' ? `atelier/${u.key}-4.svg` : u.icon || 'premium/icon-deal.svg')}" alt="">${u.type === 'album' ? 'В альбом: ' : u.type === 'contract' ? 'Контракт: ' : ''}${esc(u.title)}</span>`).join('')}</div>` : ''}
    ${r.level ? `<div class="level-up">Новое звание<b>${esc(r.level.rank)}</b>Уровень ${r.level.level}</div>` : ''}
    <button class="btn btn-gold btn-lg" style="width:100%" data-reward-ok>Отлично</button>`;
  rewardDialog.showModal();
  countUp($('[data-count]'), xp);
  if ((res && res.result.won) || r.level || r.quiz) confetti(rewardDialog.querySelector('.confetti'));
  $('[data-reward-ok]').onclick = () => rewardDialog.close();
}
rewardDialog.addEventListener('close', () => { renderAllLight(); setTimeout(nextReward, 250); });
function countUp(el, to) {
  if (reduced) { el.textContent = '+' + fmt(to); return; }
  const t0 = performance.now(), dur = 1300;
  const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = '+' + fmt(Math.round(to * e)) + ' XP'; if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function confetti(canvas) {
  if (reduced || !canvas) return;
  const ctx = canvas.getContext('2d'), dpr = devicePixelRatio || 1;
  const W = canvas.width = canvas.offsetWidth * dpr, H = canvas.height = canvas.offsetHeight * dpr;
  const colors = ['#f3d998', '#d9b46a', '#68d9b5', '#f2ecdb', '#e77ca6'];
  const ps = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 14 * dpr, vy: (-Math.random() * 13 - 4) * dpr, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3, w: (5 + Math.random() * 6) * dpr, h: (8 + Math.random() * 8) * dpr, c: colors[(Math.random() * colors.length) | 0] }));
  const t0 = performance.now();
  const frame = t => {
    ctx.clearRect(0, 0, W, H);
    for (const p of ps) { p.vy += .35 * dpr; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); ctx.restore(); }
    if (t - t0 < 3200 && rewardDialog.open) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
  };
  requestAnimationFrame(frame);
}

/* ---------------- Contracts, album, ranks ---------------- */
const TIER = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' };
function renderContracts() {
  const list = weeklyContracts();
  const html = list.map(c => `<li class="contract ${c.done ? 'done' : ''}" data-tier="${c.tier}"><span class="tier">${TIER[c.tier]}</span><div><b>${esc(c.title)}</b><small>${c.done ? 'Выполнено на этой неделе' : 'По итогам доигранной партии'}</small></div><span class="xp">+${c.xp} XP</span></li>`).join('');
  $$('[data-contracts]').forEach(el => { el.innerHTML = html; });
  $$('[data-week-left]').forEach(el => { el.textContent = 'обновятся через ' + weekEndsIn(); });
  const weeks = new Set(store.data.weeks), now = isoWeek();
  const cells = [];
  let cur = new Date();
  for (let i = 0; i < 6; i++) { const w = isoWeek(cur); cells.unshift(`<i class="${weeks.has(w) ? 'on' : ''} ${w === now ? 'now' : ''}" title="${w}"></i>`); cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() - 7); }
  const st = weekStreak();
  const bonus = Math.min(50, Math.max(0, st - 1) * 10);
  $$('[data-streak]').forEach(el => { el.innerHTML = `<span class="weeks" aria-hidden="true">${cells.join('')}</span><span>${st ? `Серия: <b>${st} ${plural(st, 'неделя', 'недели', 'недель')}</b>${bonus ? ` · бонус +${bonus}% XP` : ' · со второй недели подряд — бонус к опыту'}` : 'Доиграйте партию на этой неделе, чтобы начать серию. Каждая следующая неделя подряд даёт +10% опыта.'}</span>`; });
}
function albumItem(a, big) {
  const got = !!store.data.album[a.key];
  const src = a.key === 'tower' ? art('atelier/tower-4.svg') : art(`atelier/${a.key}-4.svg`);
  return `<figure class="${got ? '' : 'locked'}" title="${esc(a.name)}"><img src="${src}" alt="${got ? esc(a.name) : 'Ещё не построено'}" loading="lazy">${big ? `<figcaption><b>${esc(a.name)}</b><small>${got ? 'Получено ' + new Date(store.data.album[a.key]).toLocaleDateString('ru-RU') : 'Постройте: ' + esc(a.zone)}</small></figcaption>` : ''}</figure>`;
}
function renderAlbum() {
  const strip = $('[data-album-strip]');
  if (strip) strip.innerHTML = [...ALBUM].sort((a, b) => !!store.data.album[b.key] - !!store.data.album[a.key]).map(a => albumItem(a, false)).join('');
  const full = $('[data-album]');
  if (full) full.innerHTML = ALBUM.map(a => albumItem(a, true)).join('');
  const got = ALBUM.filter(a => store.data.album[a.key]).length;
  $('[data-album-count]').textContent = `${got} из ${ALBUM.length}`;
  const lv = levelOf(store.data.xp), next = RANKS[Math.min(RANKS.length - 1, lv.level)] || lv.rank;
  $('[data-rank-ladder]').innerHTML = `<div class="row"><span>Звание <b>${esc(lv.rank)}</b></span><span class="muted">→ ${esc(next)}</span></div><div class="bar"><i style="width:${Math.min(100, ((store.data.xp - lv.from) / (lv.to - lv.from)) * 100)}%"></i></div><div class="row muted small"><span>${fmt(store.data.xp)} XP</span><span>${fmt(lv.to)} XP</span></div>`;
}

/* ---------------- Career ---------------- */
function renderCareer() {
  const d = store.data, lv = levelOf(d.xp), st = careerStats();
  const pct = Math.min(100, ((d.xp - lv.from) / (lv.to - lv.from)) * 100);
  const ring = $('[data-ring]');
  requestAnimationFrame(() => ring.style.setProperty('--p', pct.toFixed(1)));
  $('[data-career-level]').textContent = `Уровень ${lv.level}`;
  $('[data-career-rank]').textContent = lv.rank;
  $('[data-career-xp]').textContent = fmt(d.xp) + ' XP';
  $('[data-career-next]').textContent = RANKS[Math.min(RANKS.length - 1, lv.level)] || lv.rank;
  $('[data-career-left]').textContent = fmt(Math.max(0, lv.to - d.xp));
  const form = $('[data-profile-form]');
  if (document.activeElement !== form.name) form.name.value = d.profile.name;
  form.profession.value = d.profile.profession;
  $('[data-stats]').innerHTML = [
    ['Партий', st.games], ['Побед', st.wins], ['Процент побед', st.rate + '%'], ['Зданий введено', st.buildings],
    ['Лучший капитал', fmt(st.bestMoney)], ['Серия недель', st.streak],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const got = ACHIEVEMENTS.filter(a => d.achievements[a.id]).length;
  $('[data-ach-count]').textContent = `${got} из ${ACHIEVEMENTS.length}`;
  $('[data-achievements]').innerHTML = ACHIEVEMENTS.map(a => `<div class="ach ${d.achievements[a.id] ? 'got' : 'locked'}"><img src="${art(a.icon)}" alt=""><div><b>${esc(a.title)}</b><small>${esc(a.text)}</small></div></div>`).join('');
  $('[data-ranks]').innerHTML = RANKS.map((r, i) => `<li class="${d.xp >= LEVELS[i] ? 'reached' : ''} ${lv.level === i + 1 || (i === RANKS.length - 1 && lv.level > RANKS.length) ? 'current' : ''}"><b>${esc(r)}</b><span>${fmt(LEVELS[i])} XP</span></li>`).join('');
  renderContracts();
  renderAlbum();
}
function bindProfileForm() {
  const form = $('[data-profile-form]');
  form.profession.innerHTML = PROFESSIONS.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  let t;
  form.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const name = form.name.value.trim();
      if (name && (!NAME_RE.test(name) || name.length > 28)) { toast('Имя: буквы, цифры, пробелы, точки и дефисы', 'err'); return; }
      store.update(d => { d.profile = { name, profession: form.profession.value }; });
    }, 350);
  });
  form.addEventListener('submit', e => e.preventDefault());
}
function doExport() {
  const code = exportProgress();
  navigator.clipboard.writeText(code).then(() => toast('Код переноса скопирован. Вставьте его на другом устройстве.'), () => { $('[data-import-text]').value = code; toast('Скопируйте код из поля ниже'); });
}
function doImport() {
  const ta = $('[data-import-text]');
  try { importProgress(ta.value); ta.value = ''; toast('Прогресс и места перенесены'); pollRooms(); renderView(activeView); }
  catch (e) { toast(e.message, 'err'); }
}

/* ---------------- Academy ---------------- */
function buildAcademy() {
  // Example winning column (indices 3, 9, 15, 21 on the 6×4 grid).
  const demo = Array.from({ length: 24 }, (_, i) => ({ owner: [3, 9, 15, 21].includes(i) ? 0 : [1, 8, 14, 20].includes(i) ? 1 : [6, 18].includes(i) ? 2 : -1, project: { stage: [3, 9, 15, 21, 1, 8, 6].includes(i) ? 4 : [14, 20, 18].includes(i) ? 2 : 0 }, name: 'Участок ' + (i + 1) }));
  $('[data-line-demo]').innerHTML = miniBoard({ plots: demo }, { highlight: [3, 9, 15, 21] }).replace(/^<div class="mini-board"[^>]*>|<\/div>$/g, '');
  $('[data-prof-grid]').innerHTML = PROFESSIONS.map(p => `<article class="prof"><img src="${art(p.icon)}" alt=""><span class="stage-tag">${esc(p.stage)}</span><h3>${esc(p.name)}</h3><p>${esc(p.pitch)}</p><ul>${p.perks.map(x => `<li>${esc(x)}</li>`).join('')}</ul></article>`).join('');
  const cell = v => v == null ? '<td class="na">—</td>' : `<td>${fmt(v)}</td>`;
  $('[data-zone-grid]').innerHTML = ZONES.map(z => `<article class="zone"><img src="${art(`atelier/${z.art}-4.svg`)}" alt="" loading="lazy"><div><b>${esc(z.name)}</b><span class="muted small">Земля от ${fmt(z.land)}</span>
    <table><thead><tr><th></th><th>М</th><th>С</th><th>К</th></tr></thead><tbody><tr><th>Аренда</th>${z.rent.map(cell).join('')}</tr><tr><th>Продажа</th>${z.sale.map(cell).join('')}</tr></tbody></table></div></article>`).join('');
  buildCalc();
  buildQuiz();
}
function buildCalc() {
  const f = $('[data-calc]');
  f.zone.innerHTML = ZONES.map((z, i) => `<option value="${i}" ${z.id === 'OD' ? 'selected' : ''}>${z.name}</option>`).join('');
  f.prof.innerHTML = '<option value="">Без скидки</option>' + PROFESSIONS.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  const fillSizes = () => {
    const z = ZONES[f.zone.value], cur = Number(f.size.value);
    f.size.innerHTML = SIZES.map((s, i) => z.sale[i] == null ? '' : `<option value="${i}">${s}</option>`).join('');
    if (z.sale[cur] != null) f.size.value = cur;
  };
  const calc = () => {
    const z = ZONES[f.zone.value], s = Number(f.size.value), v = Number(f.variant.value), prof = f.prof.value;
    const buyer = Number(f.buyer.value), tenant = Number(f.tenant.value), nets = Number(f.nets.value), nb = Number(f.nb.value);
    f.netOut.value = nets; f.nbOut.value = nb;
    const land = z.land * (s === 2 ? 2 : 1);
    const stages = STAGES.map(st => { const base = st.costs[s][v]; const disc = prof === st.prof ? PROF_DISCOUNT[s] : 0; return { name: st.name, cost: base - disc, disc }; });
    const netCost = nets * 50;
    const invest = land + stages.reduce((a, b) => a + b.cost, 0) + netCost;
    const sale = z.sale[s] + buyer + nets * 100;
    const profit = sale - invest;
    const rent = z.rent[s] * tenant + 25 * nb + 25 * nets;
    const laps = Math.ceil(invest / rent);
    $('[data-calc-art]').src = art(`atelier/${z.art}-4.svg`);
    $('[data-calc-art]').alt = z.name;
    $('[data-calc-result]').innerHTML = `
      <dt>Земля${s === 2 ? ' · два участка' : ''}</dt><dd>${fmt(land)}</dd>
      ${stages.map(x => `<dt>${x.name}${x.disc ? ` <span class="muted small">−${x.disc} профессия</span>` : ''}</dt><dd>${fmt(x.cost)}</dd>`).join('')}
      ${nets ? `<dt>Сети · ${nets} × 50</dt><dd>${fmt(netCost)}</dd>` : ''}
      <span class="sep"></span>
      <dt><b>Вложения</b></dt><dd>${fmt(invest)}</dd>
      <dt>Продажа${buyer ? ` (покупатель +${buyer})` : ''}${nets ? ` · сети +${nets * 100}` : ''}</dt><dd>${fmt(sale)}</dd>
      <dt><b>Прибыль от продажи</b></dt><dd class="big ${profit < 0 ? 'neg' : ''}">${profit >= 0 ? '+' : ''}${fmt(profit)}</dd>
      <span class="sep"></span>
      <dt>Аренда за проход «Старта»</dt><dd>${fmt(rent)}</dd>
      <dt>Окупаемость арендой</dt><dd>≈ ${laps} ${plural(laps, 'круг', 'круга', 'кругов')}</dd>
      <p class="note">Цена земли — стартовая ставка зоны; реальный аукцион может быть дороже. Надбавка покупателя действует для здания один раз за партию.</p>`;
  };
  f.zone.addEventListener('change', () => { fillSizes(); calc(); });
  f.addEventListener('input', calc);
  fillSizes();
  f.size.value = '1';
  calc();
}
function buildQuiz() {
  const box = $('[data-quiz]');
  let i = 0, marks = [];
  const render = () => {
    const bar = `<div class="quiz-progress">${QUIZ.map((_, k) => `<i class="${marks[k] === true ? 'ok' : marks[k] === false ? 'bad' : k === i ? 'now' : ''}"></i>`).join('')}</div>`;
    if (i >= QUIZ.length) {
      const score = marks.filter(Boolean).length, perfect = score === QUIZ.length;
      box.innerHTML = `${bar}<h3>${perfect ? 'Безупречно!' : `Верно ${score} из ${QUIZ.length}`}</h3><p class="muted">${perfect ? (store.data.quiz.rewarded ? 'Вы уже получили награду академии — знания подтверждены.' : 'Награда академии начислена.') : 'Перечитайте разделы выше и попробуйте ещё раз — за 100% академия даёт опыт и достижение.'}</p><div><button class="btn btn-gold" data-quiz-restart>Пройти снова</button></div>`;
      $('[data-quiz-restart]', box).onclick = () => { i = 0; marks = []; render(); };
      store.update(d => { d.quiz.best = Math.max(d.quiz.best, score); });
      if (perfect && !store.data.quiz.rewarded) {
        store.update(d => { d.quiz.rewarded = true; d.xp += XP.quiz; });
        const evs = [{ type: 'quiz', xp: XP.quiz, parts: [['Экзамен академии', XP.quiz]] }];
        const a = unlock('academy'); store.save();
        if (a) evs.push(a);
        const before = levelOf(store.data.xp - XP.quiz), after = levelOf(store.data.xp);
        if (after.level > before.level) evs.push({ type: 'level', level: after.level, rank: after.rank });
        queueRewards(evs);
      }
      return;
    }
    const q = QUIZ[i];
    box.innerHTML = `${bar}<p class="eyebrow">Вопрос ${i + 1} из ${QUIZ.length}</p><h3>${esc(q.q)}</h3><div class="answers">${q.a.map((a, k) => `<button data-k="${k}">${esc(a)}</button>`).join('')}</div><div data-why></div>`;
    $$('.answers button', box).forEach(b => b.addEventListener('click', () => {
      const k = Number(b.dataset.k), ok = k === q.ok;
      marks[i] = ok;
      $$('.answers button', box).forEach(x => { x.disabled = true; if (Number(x.dataset.k) === q.ok) x.classList.add('ok'); });
      if (!ok) b.classList.add('bad');
      $('[data-why]', box).innerHTML = `<p class="why">${ok ? '<b>Верно.</b> ' : '<b>Не совсем.</b> '}${esc(q.why)}</p><p style="margin-top:12px"><button class="btn btn-gold" data-next>${i + 1 < QUIZ.length ? 'Следующий вопрос' : 'Результат'}</button></p>`;
      $('[data-next]', box).onclick = () => { i++; render(); };
      $('[data-next]', box).focus();
    }));
  };
  render();
}

/* ---------------- Render orchestration ---------------- */
function renderView(v) {
  renderMe();
  if (v === 'play') { renderContracts(); renderAlbum(); renderContinue(); }
  if (v === 'games') renderGames();
  if (v === 'career') renderCareer();
}
function renderAllLight() { renderMe(); renderView(activeView); }

/* ---------------- Invite links ---------------- */
async function handleInvite() {
  const params = new URLSearchParams(location.search);
  const code = (params.get('room') || '').toUpperCase();
  if (params.has('create')) { history.replaceState(null, '', location.pathname + location.hash); openCreate(); return; }
  if (!code) return;
  history.replaceState(null, '', location.pathname + location.hash);
  if (!validCode(code)) { toast('Неверный код комнаты в ссылке', 'err'); return; }
  const token = getToken(code);
  if (!token) { openJoin(code, true); return; }
  addRoom(code);
  try {
    const d = await api.room(code, token);
    live.set(code, { data: d, at: Date.now() });
    if (d.state) { location.replace(gameLink(code)); return; }
    openLobby(code, d);
  } catch (e) {
    if (e.status === 403 || e.status === 401) openJoin(code, true);
    else toast(e.message, 'err');
  }
}

/* ---------------- Boot ---------------- */
function boot() {
  bindProfileForm();
  buildAcademy();
  startHero();
  store.subscribe(() => renderMe());
  showView(viewFromHash(), location.hash.startsWith('#ac-') ? location.hash.slice(1) : null);
  handleInvite();
  pollRooms().then(schedulePoll);
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
boot();
