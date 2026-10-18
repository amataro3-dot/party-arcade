/* ロビー・ラウンドの進行・プレイ画面・結果。最後に init() で起動する。 */

/* ---------- 設定・ラウンド構成 ---------- */
const DEFAULT_SETTINGS = { mode: 'arcade', rounds: 4, doubleUp: false, finalUp: false, soloGame: GAMES[0].id };
const settings = () => Object.assign({}, DEFAULT_SETTINGS, room.settings || {});
const gameAt = i => GAMES.find(g => g.id === room.config.playlist[i]) || GAMES[0];
const multAt = i => {
  const c = room && room.config;
  if (!c) return 1; // 練習モードなど、ルームの外
  if (c.doubleUp && i === c.doubleRound) return 2;
  if (c.finalUp && i === c.rounds - 1) return 2;
  return 1;
};
const bonusLabel = i => (room.config.finalUp && i === room.config.rounds - 1) ? 'ファイナルアップ!' : 'ダブルアップ!';
const leaveLabel = () => (room.admin === pid && Object.keys(room.players).length === 1) ? 'ルームを解散' : '退出';

/* 全ゲームを1周ずつシャッフルして並べる(ゲーム数より多いラウンドだけ重複する) */
function makePlaylist(n) {
  const ids = GAMES.map(g => g.id), out = [];
  while (out.length < n) {
    const bag = ids.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    if (out.length && bag.length > 1 && bag[0] === out[out.length - 1]) [bag[0], bag[1]] = [bag[1], bag[0]];
    out.push(...bag);
  }
  return out.slice(0, n);
}

function settingsCard() {
  const st = settings(), isAdmin = room.admin === pid, dis = isAdmin ? '' : 'disabled';
  const seg = (key, opts, cur, cls) => `<div class="seg ${cls || ''}">${opts.map(([v, label]) =>
    `<button ${dis} class="${String(cur) === String(v) ? 'on' : ''}" data-set="${key}" data-v="${h(v)}">${h(label)}</button>`).join('')}</div>`;
  let body;
  if (st.mode === 'solo') {
    body = `<div class="sub">選んだゲームを1回だけ遊ぶ。ポイントは付かない。</div>
      <div class="sub">ゲーム${isAdmin ? '(回して選ぶ)' : ''}</div>${pickerHtml('sp', st.soloGame, isAdmin)}`;
  } else {
    body = `<div class="sub">ランダムなゲームを続けて遊び、合計ポイントで優勝を決める。</div>
      <div class="sub">ラウンド数</div>${seg('rounds', [4, 5, 6, 7, 8].map(n => [n, String(n)]), st.rounds, 'num')}
      <div class="sub">ボーナス(チェックしなければなし)</div>
      <label class="chk"><input type="checkbox" ${dis} ${st.doubleUp ? 'checked' : ''} data-chk="doubleUp"><span><b>ダブルアップ</b><small>ランダムな1ラウンドのポイントが2倍。そのゲームの開始前に発表される。</small></span></label>
      <label class="chk"><input type="checkbox" ${dis} ${st.finalUp ? 'checked' : ''} data-chk="finalUp"><span><b>ファイナルアップ</b><small>最終ラウンドのポイントが2倍。</small></span></label>`;
  }
  return `<div class="card"><div class="sub">モード${isAdmin ? '' : '(管理者が決める)'}</div>${seg('mode', [['arcade', 'アーケード'], ['solo', 'ソロゲーム']], st.mode)}${body}</div>`;
}

function setSetting(k, v) {
  if (room.admin !== pid) return;
  if (k === 'rounds') v = Number(v);
  db.ref('minigame-rooms/' + roomId + '/settings/' + k).set(v);
}

function startGame() {
  const st = settings();
  let cfg;
  if (st.mode === 'solo') {
    // 回した直後にスタートを押しても、画面で選んでいるゲームが始まるようにする
    const shown = pickerValue('sp');
    const want = shown || st.soloGame;
    const id = GAMES.some(g => g.id === want) ? want : GAMES[0].id;
    if (id !== st.soloGame) setSetting('soloGame', id);
    cfg = { mode: 'solo', rounds: 1, doubleUp: false, finalUp: false, doubleRound: -1, playlist: [id] };
  } else {
    const n = Math.min(8, Math.max(4, Number(st.rounds) || 4));
    const doubleUp = !!st.doubleUp, finalUp = !!st.finalUp;
    const pool = finalUp ? n - 1 : n; // 両方ONなら、最終ラウンドは除いて選ぶ
    cfg = {
      mode: 'arcade', rounds: n, doubleUp, finalUp,
      doubleRound: doubleUp ? Math.floor(Math.random() * pool) : -1,
      playlist: makePlaylist(n)
    };
  }
  startRound(0, cfg);
}

/* ---------- ロビー ---------- */
function renderLobby() {
  const ps = Object.entries(room.players).sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
  const isAdmin = room.admin === pid;
  setApp(`
    <h1>ロビー</h1>
    <div class="card center"><div class="sub">ルームID(タップでコピー)</div><div class="roomid" id="ridv">${h(roomId)}</div></div>
    <div class="card">
      <div class="sub">参加者 ${ps.length}/${MAX_PLAYERS}</div>
      ${ps.map(([id, p]) => `<div class="pl"><span class="plname">${id === room.admin ? '👑 ' : ''}${h(p.name)}${id === pid ? '<span class="you">あなた</span>' : ''}</span>${isAdmin && id !== pid ? `<button class="mini" data-act="admin" data-id="${h(id)}">管理者にする</button><button class="mini ng" data-act="kick" data-id="${h(id)}">外す</button>` : ''}</div>`).join('')}
    </div>
    ${settingsCard()}
    ${isAdmin ? '<button class="btn" id="start">ゲームスタート</button>' : '<div class="center sub">管理者のスタートを待っています…</div>'}
    <button class="btn ghost" id="leave">${leaveLabel()}</button>`);
  $('#ridv').onclick = () => { if (navigator.clipboard) navigator.clipboard.writeText(roomId).then(() => toast('コピーしました')); };
  $('#leave').onclick = leaveRoom;
  if (isAdmin) $('#start').onclick = startGame;
  document.querySelectorAll('[data-set]').forEach(b => { b.onclick = () => setSetting(b.dataset.set, b.dataset.v); });
  if ($('#sp')) pickerInit('sp', id => setSetting('soloGame', id));
  document.querySelectorAll('[data-chk]').forEach(i => { i.onchange = () => setSetting(i.dataset.chk, i.checked); });
  document.querySelectorAll('[data-act]').forEach(b => { b.onclick = () => playerAction(b.dataset.act, b.dataset.id); });
}

/* 管理者の操作(ロビーのみ): プレイヤーを外す / 管理者を渡す */
function playerAction(act, id) {
  if (room.admin !== pid || room.phase !== 'lobby' || id === pid || !room.players[id]) return;
  const name = room.players[id].name;
  const ref = db.ref('minigame-rooms/' + roomId);
  if (act === 'kick') { if (confirm(name + ' をルームから外す?')) ref.child('players/' + id).remove(); }
  else if (act === 'admin') { if (confirm(name + ' に管理者を渡す?')) ref.child('admin').set(id); }
}

function startRound(i, cfg) {
  const upd = {
    phase: 'playing',
    round: { index: i, startAt: serverNow() + COUNTDOWN_MS, delay: 2000 + Math.floor(Math.random() * 3000) }
  };
  if (cfg) upd.config = cfg;
  if (i === 0) { upd.results = null; upd.extras = null; }
  db.ref('minigame-rooms/' + roomId).update(upd);
}

/* 管理者: 全員提出 or タイムアウトで結果へ */
function adminCheck() {
  if (!room || room.admin !== pid || room.phase !== 'playing' || !room.round) return;
  const res = getRes(room.round.index);
  const n = Object.keys(room.players).length;
  const c = Object.keys(res).filter(k => room.players[k]).length;
  if (c >= n || serverNow() > room.round.startAt + 25000) {
    db.ref('minigame-rooms/' + roomId + '/phase').set('roundResult');
  }
}

/* ---------- プレイ画面 ---------- */
function buildPlay() {
  const r = room.round, g = gameAt(r.index), c = room.config, m = multAt(r.index);
  roundState = { index: r.index, submitted: false };
  setApp(`
    <div class="top"><span>${c.mode === 'solo' ? 'ソロゲーム' : 'ラウンド ' + (r.index + 1) + '/' + c.rounds}${m > 1 ? ' ×2' : ''}</span><span>${h(g.title)}</span></div>
    <div id="stage" class="stage"></div>
    <div id="wait" class="center sub"></div>`);
  const mine = getRes(r.index)[pid];
  if (mine !== undefined && mine !== null) { roundState.submitted = true; showSubmitted(mine, getExtra(r.index)[pid]); return; }
  if (serverNow() - r.startAt > 1500) { submit(g.miss); return; } // 途中復帰は不参加扱い
  g.play($('#stage'), r, submit);
}

/* v = 順位を決める数値。x = 結果の表示に使う補足(線の長さなど。なくてもよい) */
function submit(v, x) {
  if (!roundState || roundState.submitted) return;
  roundState.submitted = true;
  clearTimers();
  const base = 'minigame-rooms/' + roomId;
  if (x !== undefined) db.ref(base + '/extras/g' + roundState.index + '/' + pid).set(x);
  db.ref(base + '/results/g' + roundState.index + '/' + pid).set(v);
  showSubmitted(v, x);
}
function showSubmitted(v, x) {
  const g = gameAt(roundState.index);
  $('#stage').innerHTML = `<div class="center"><div class="sub">あなたの記録</div><div class="big-num" style="font-size:44px">${h(g.fmt(v, x))}</div>${g.result && x !== undefined ? '<div class="viz" id="rbox"></div>' : (g.viz && x ? g.viz(v, x) : '')}</div>`;
  if (g.result && x !== undefined) callResult(g, $('#rbox'), x, 200);
  updateWaiting();
}
function updateWaiting() {
  const w = $('#wait'); if (!w || !roundState) return;
  if (!roundState.submitted) { w.textContent = ''; return; }
  const n = Object.keys(room.players).length;
  const c = Object.keys(getRes(roundState.index)).filter(k => room.players[k]).length;
  w.textContent = 'みんなを待っています… ' + c + '/' + n;
}

/* ---------- 集計 ---------- */
function rankGame(gi) {
  const g = gameAt(gi), res = getRes(gi), ex = getExtra(gi);
  const list = Object.keys(room.players).map(id => ({
    id, name: room.players[id].name, v: res[id] === undefined ? null : res[id], x: ex[id]
  }));
  const better = (a, b) => a.v !== null && (b.v === null || (g.lowerBetter ? a.v < b.v : a.v > b.v));
  list.forEach(p => {
    p.rank = 1 + list.filter(q => better(q, p)).length;
    p.pts = ((p.v === null || g.isMiss(p.v)) ? 0 : (POINTS[p.rank - 1] !== undefined ? POINTS[p.rank - 1] : 1)) * multAt(gi);
  });
  list.sort((a, b) => a.rank - b.rank);
  return list;
}
function standing(upTo) {
  const m = {};
  Object.keys(room.players).forEach(id => { m[id] = []; });
  for (let i = 0; i <= upTo; i++) rankGame(i).forEach(p => m[p.id].push(p.pts));
  const list = Object.keys(m).map(id => ({
    id, name: room.players[id].name, pts: m[id], total: m[id].reduce((a, b) => a + b, 0)
  }));
  list.forEach(p => { p.rank = 1 + list.filter(q => q.total > p.total).length; });
  list.sort((a, b) => a.rank - b.rank);
  return list;
}

/* ---------- 結果 ---------- */
function toLobby() {
  db.ref('minigame-rooms/' + roomId).update({ phase: 'lobby', results: null, extras: null, round: null, config: null });
}

function renderRoundResult() {
  const gi = room.round.index, g = gameAt(gi), c = room.config;
  const solo = c.mode === 'solo', m = multAt(gi);
  const list = rankGame(gi), st = solo ? [] : standing(gi);
  const hasRes = p => !!g.result && p.x !== undefined && p.v !== null;
  const isAdmin = room.admin === pid, last = gi >= c.rounds - 1;
  const title = solo ? g.title : 'ラウンド ' + (gi + 1) + '/' + c.rounds + ' ' + g.title;
  let actions;
  if (!isAdmin) actions = '<div class="center sub">管理者の操作を待っています…</div>';
  else if (solo) actions = '<button class="btn" id="again1">もう一度</button><button class="btn sub" id="tolobby">ロビーに戻る</button>';
  else actions = `<button class="btn" id="next">${last ? '最終結果へ' : '次のラウンドへ'}</button>`;
  setApp(`
    <h1>${h(title)} の結果</h1>
    ${m > 1 ? `<div class="bonus">${bonusLabel(gi)} ポイント2倍</div>` : ''}
    <div class="card">
      ${list.map(p => `<div class="rk"><span class="rn">${p.rank}</span><span class="nm">${h(p.name)}${p.id === pid ? ' (あなた)' : ''}</span><span class="val">${p.v === null ? '未提出' : h(g.fmt(p.v, p.x))}</span>${solo ? '' : `<span class="pt">+${p.pts}</span>`}${hasRes(p) ? '<div class="viz" data-rp></div>' : ((g.viz && p.x !== undefined && p.v !== null) ? `<div class="viz">${g.viz(p.v, p.x)}</div>` : '')}</div>`).join('')}
    </div>
    ${solo ? '' : `<div class="card">
      <div class="sub">ここまでの合計</div>
      ${st.map(p => `<div class="rk"><span class="rn">${p.rank}</span><span class="nm">${h(p.name)}${p.id === pid ? ' (あなた)' : ''}</span><span class="tot">${p.total}</span></div>`).join('')}
    </div>`}
    ${actions}`);
  const boxes = document.querySelectorAll('[data-rp]');
  list.filter(hasRes).forEach((p, i) => { if (boxes[i]) callResult(g, boxes[i], p.x); });
  if (isAdmin && solo) {
    $('#again1').onclick = guarded(() => startRound(0));
    $('#tolobby').onclick = guarded(toLobby);
  } else if (isAdmin) {
    $('#next').onclick = guarded(() => {
      if (last) db.ref('minigame-rooms/' + roomId + '/phase').set('final');
      else startRound(gi + 1);
    });
  }
}

function renderFinal() {
  const c = room.config;
  const st = standing(c.rounds - 1);
  const winners = st.filter(p => p.rank === 1).map(p => h(p.name)).join(' & ');
  const isAdmin = room.admin === pid;
  setApp(`
    <h1>最終結果</h1>
    <div class="win">🏆 優勝: ${winners}</div>
    <div class="card">
      ${st.map(p => `<div class="rk"><span class="rn">${p.rank}</span><span class="nm">${h(p.name)}${p.id === pid ? ' (あなた)' : ''}<div class="detail">${p.pts.map((v, i) => multAt(i) > 1 ? v + '★' : v).join(' / ')}</div></span><span class="tot">${p.total}</span></div>`).join('')}
    </div>
    ${(c.doubleUp || c.finalUp) ? '<div class="center sub">★ = ポイント2倍のラウンド</div>' : ''}
    ${isAdmin ? '<button class="btn" id="again">ロビーに戻る(もう一度)</button>' : '<div class="center sub">管理者の操作を待っています…</div>'}
    <button class="btn ghost" id="leave">${leaveLabel()}</button>`);
  $('#leave').onclick = guarded(leaveRoom);
  if (isAdmin) $('#again').onclick = guarded(toLobby);
}

init();
