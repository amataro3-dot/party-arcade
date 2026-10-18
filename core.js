/* 起動・ホーム・練習モード・ルームの作成と入室。Firebaseの設定もここ。 */

/* ===== ここを自分のFirebaseの値に書き換える ===== */
const firebaseConfig = {
  apiKey: "AIzaSyBxf-38qXL-cUFIdJFd_x0JCJyXlHOKZHE",
  authDomain: "labyrinth-game-bc5aa.firebaseapp.com",
  databaseURL: "https://labyrinth-game-bc5aa-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "labyrinth-game-bc5aa",
  storageBucket: "labyrinth-game-bc5aa.firebasestorage.app",
  messagingSenderId: "534431752677",
  appId: "1:534431752677:web:677413dac8ba95b0e50f0c",
  measurementId: "G-4E4V3WDX6R"
};
/* ================================================ */

const MAX_PLAYERS = 8;
const POINTS = [10, 8, 6, 5, 4, 3, 2, 1]; // 順位ポイント
const COUNTDOWN_MS = 5000;
const $ = s => document.querySelector(s);
const $app = document.getElementById('app');
const h = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const setApp = html => { $app.innerHTML = html; };

let db = null, offset = 0, pid = '', myName = '';
let roomId = null, room = null, roomRef = null, roomCb = null, adminTimer = null;
let viewKey = '', roundState = null, timers = [], busy = false;

const serverNow = () => Date.now() + offset;
const getRes = i => (room && room.results && room.results['g' + i]) || {};
const getExtra = i => (room && room.extras && room.extras['g' + i]) || {};
/* 結果画面が出た直後0.7秒は、ボタンを押しても動かない(指が触れたままの誤タップ対策) */
let guardUntil = 0;
const guarded = fn => () => { if (Date.now() < guardUntil) return; fn(); };

function toast(t) {
  const el = $('#toast'); el.textContent = t; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1500);
}
function clearTimers() { timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = []; }

/* ---------- 起動 ---------- */
function init() {
  pid = localStorage.getItem('pid');
  if (!pid) { pid = 'p' + Math.random().toString(36).slice(2, 10); localStorage.setItem('pid', pid); }
  myName = localStorage.getItem('name') || '';

  if (typeof firebase === 'undefined') {
    setApp('<h1>読み込みエラー</h1><div class="card">Firebaseを読み込めませんでした。通信状況を確認して、ページを再読み込みしてね。</div>');
    return;
  }
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'YOUR_API_KEY') {
    setApp('<h1>設定が必要です</h1><div class="card">index.html の一番上にある <b>firebaseConfig</b> を、自分のFirebaseプロジェクトの値に書き換えてね。<br><br>(READMEに手順あり)</div>');
    return;
  }
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
  db.ref('.info/serverTimeOffset').on('value', s => { offset = s.val() || 0; });

  const saved = localStorage.getItem('room');
  if (saved) {
    db.ref('minigame-rooms/' + saved).once('value').then(s => {
      const r = s.val();
      if (r && r.players && r.players[pid]) enterRoom(saved);
      else { localStorage.removeItem('room'); renderHome(); }
    }).catch(() => renderHome());
  } else renderHome();
}

/* ---------- ホーム ---------- */
function renderHome(msg) {
  setApp(`
    <h1>🎮 ミニゲームバトル</h1>
    <div class="card">
      <label>なまえ</label>
      <input id="name" maxlength="10" placeholder="なまえを入力" value="${h(myName)}">
    </div>
    <div class="card">
      <button class="btn" id="create">ルームを作る(管理者になる)</button>
    </div>
    <div class="card">
      <label>ルームID</label>
      <input id="rid" inputmode="numeric" maxlength="4" placeholder="4けたの数字">
      <button class="btn sub" id="join">入室する</button>
    </div>
    <div class="card">
      <button class="btn sub" id="practice">練習モード(1人で遊ぶ)</button>
    </div>
    <div class="msg" id="msg">${h(msg || '')}</div>`);
  $('#create').onclick = createRoom;
  $('#join').onclick = joinRoom;
  $('#practice').onclick = renderPractice;
}

/* ---------- 練習モード(ルームの外・1人用) ---------- */
function renderPractice() {
  clearTimers();
  setApp(`
    <h1>練習モード</h1>
    <div class="card">
      <div class="sub">遊ぶゲームを選ぶ(記録は保存されない)</div>
      ${GAMES.map(g => `<button class="btn sub" data-pg="${h(g.id)}">${h(g.title)}</button>`).join('')}
    </div>
    <button class="btn ghost" id="back">ホームに戻る</button>`);
  document.querySelectorAll('[data-pg]').forEach(b => { b.onclick = () => startPractice(b.dataset.pg); });
  $('#back').onclick = () => renderHome();
}
function startPractice(id) {
  const g = GAMES.find(x => x.id === id); if (!g) return;
  clearTimers();
  const round = { index: 0, startAt: serverNow() + COUNTDOWN_MS, delay: 2000 + Math.floor(Math.random() * 3000) };
  setApp(`
    <div class="top"><span>練習モード</span><span>${h(g.title)}</span></div>
    <div id="stage" class="stage"></div>
    <button class="btn ghost" id="quit">やめる</button>`);
  let done = false;
  $('#quit').onclick = () => { done = true; clearTimers(); renderPractice(); };
  g.play($('#stage'), round, (v, x) => { if (done) return; done = true; clearTimers(); practiceResult(g, v, x); });
}
function practiceResult(g, v, x) {
  guardUntil = Date.now() + 700;
  setApp(`
    <h1>${h(g.title)}</h1>
    <div class="card center"><div class="sub">あなたの記録</div><div class="big-num" style="font-size:44px">${h(g.fmt(v, x))}</div>${g.viz && x ? g.viz(v, x) : ''}</div>
    <button class="btn" id="again">もう一度</button>
    <button class="btn sub" id="pick">ゲームを選ぶ</button>
    <button class="btn ghost" id="home">ホームに戻る</button>`);
  $('#again').onclick = guarded(() => startPractice(g.id));
  $('#pick').onclick = guarded(renderPractice);
  $('#home').onclick = guarded(() => renderHome());
}
const setMsg = t => { const m = $('#msg'); if (m) m.textContent = t; };
function getName() {
  const v = $('#name').value.trim();
  if (!v) { setMsg('なまえを入力してね'); return null; }
  myName = v; localStorage.setItem('name', v); return v;
}

/* 作成から12時間たった古いルームを消す(ルームを作るときに実行) */
const ROOM_TTL_MS = 12 * 60 * 60 * 1000;
async function cleanupOldRooms() {
  try {
    const snap = await db.ref('minigame-rooms').orderByChild('createdAt').endAt(serverNow() - ROOM_TTL_MS).once('value');
    snap.forEach(c => { c.ref.remove(); });
  } catch (e) { /* 失敗しても部屋作成は続ける */ }
}

async function createRoom() {
  if (busy) return;
  const name = getName(); if (!name) return;
  busy = true; setMsg('作成中…');
  try {
    await cleanupOldRooms();
    for (let t = 0; t < 10; t++) {
      const id = String(Math.floor(1000 + Math.random() * 9000));
      const ref = db.ref('minigame-rooms/' + id);
      const s = await ref.once('value');
      if (s.exists()) continue;
      await ref.set({
        admin: pid, phase: 'lobby',
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        players: { [pid]: { name, joinedAt: firebase.database.ServerValue.TIMESTAMP } }
      });
      busy = false; enterRoom(id); return;
    }
    setMsg('ルームを作れませんでした。もう一度試してね');
  } catch (e) { setMsg('エラー: ' + e.message); }
  busy = false;
}

async function joinRoom() {
  if (busy) return;
  const name = getName(); if (!name) return;
  const id = $('#rid').value.trim();
  if (!/^\d{4}$/.test(id)) { setMsg('ルームIDは4けたの数字だよ'); return; }
  busy = true; setMsg('入室中…');
  try {
    const ref = db.ref('minigame-rooms/' + id);
    const r = (await ref.once('value')).val();
    if (!r) { setMsg('そのルームIDは見つかりません'); busy = false; return; }
    const players = r.players || {};
    if (!players[pid]) {
      if (r.phase !== 'lobby') { setMsg('ゲーム中なので入れません'); busy = false; return; }
      let nm = name, k = 2;
      const names = Object.values(players).map(p => p.name);
      while (names.includes(nm)) nm = name + (k++);
      const tr = await ref.child('players').transaction(p => {
        p = p || {};
        if (p[pid]) return p;
        if (Object.keys(p).length >= MAX_PLAYERS) return; // abort
        p[pid] = { name: nm, joinedAt: Date.now() };
        return p;
      });
      if (!tr.committed) { setMsg('満員です(最大' + MAX_PLAYERS + '人)'); busy = false; return; }
    }
    busy = false; enterRoom(id);
  } catch (e) { setMsg('エラー: ' + e.message); busy = false; }
}

/* ---------- ルーム ---------- */
function enterRoom(id) {
  roomId = id; localStorage.setItem('room', id); viewKey = '';
  roomRef = db.ref('minigame-rooms/' + id);
  roomCb = roomRef.on('value', s => {
    room = s.val();
    if (!room) { leaveLocal('ルームが閉じられました'); return; }
    if (!room.players || !room.players[pid]) { leaveLocal('ルームから外れました'); return; }
    render();
    adminCheck();
  });
  adminTimer = setInterval(adminCheck, 500);
}

function leaveLocal(msg) {
  if (roomRef && roomCb) roomRef.off('value', roomCb);
  clearInterval(adminTimer); clearTimers();
  roomRef = null; roomCb = null; roomId = null; room = null; roundState = null; viewKey = '';
  localStorage.removeItem('room');
  renderHome(msg || '');
}

function leaveRoom() {
  const isAdmin = room.admin === pid;
  const others = Object.entries(room.players).filter(([id]) => id !== pid)
    .sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
  const msg = !isAdmin ? 'ルームから出る?'
    : others.length ? 'ルームから出る?(' + others[0][1].name + ' が新しい管理者になります)'
    : 'ルームを解散する?';
  if (!confirm(msg)) return;
  const ref = db.ref('minigame-rooms/' + roomId), me = pid;
  leaveLocal('');
  if (!isAdmin) ref.child('players/' + me).remove();
  else if (others.length) ref.update({ admin: others[0][0], ['players/' + me]: null });
  else ref.remove();
}

function render() {
  const phase = room.phase;
  if (phase === 'playing') {
    const key = 'playing:' + room.round.index;
    if (viewKey !== key) { clearTimers(); viewKey = key; buildPlay(); }
    else updateWaiting();
    return;
  }
  if (viewKey !== phase) guardUntil = Date.now() + 700;
  clearTimers(); viewKey = phase;
  if (phase === 'lobby') renderLobby();
  else if (phase === 'roundResult') renderRoundResult();
  else if (phase === 'final') renderFinal();
}
