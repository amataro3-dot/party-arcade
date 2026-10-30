/* ミニゲーム本体(games.js)。ゲームの一覧 GAMES と、全ゲーム共通の道具(seededRng / countdown)もここにある。
   このファイルはこれで完成(もうゲームは足さない)。新しいゲームは games2.js 以降に書く。 */

const GAMES = [];

GAMES.push(
  {
    id: 'just5', title: '〇秒ジャスト',   // id は昔の「5秒ジャスト」のまま(古いルームとの食い違いを防ぐため)
    descBase: 'お題の秒数(5〜9秒)ぴったりでSTOP!<br>スタートして2秒たつと、数字が見えなくなる。<br>心の中で数えよう。誤差が小さいほど上位。',
    desc: 'お題の秒数(5〜9秒)ぴったりでSTOP!<br>スタートして2秒たつと、数字が見えなくなる。<br>心の中で数えよう。誤差が小さいほど上位。',
    lowerBetter: true, miss: 99999,
    isMiss: v => v >= 99999,
    fmt: (v, x) => v >= 99999 ? T('時間切れ') : T('誤差 {n}秒', { n: (v / 1000).toFixed(3) }) + (x && x.t ? T('(お題{t})', { t: just5Sec(x.t) }) : ''),
    play: playJust5
  },
  {
    id: 'ruler', title: '定規キャッチ!',
    desc: '定規が予告なしに落ちてくる!<br>落ちたらすぐ、画面のどこでもタップしてつかもう。<br>3回勝負。つかんだ位置(何cm落ちたか)の平均が短いほど上位。<br>ピクッと揺れるだけのフェイントもあるよ。<br>落ちる前に押すとフライング(その回は40cm)。',
    lowerBetter: true, miss: 99,
    isMiss: v => v >= 99,
    fmt: v => v >= 99 ? T('全部失敗') : T('平均 {n}cm', { n: v.toFixed(1) }),
    play: playRuler,
    // リザルト用:定規に3回分のつかんだ位置を描く
    result: drawRulerResult
  },
  {
    id: 'drawcm', title: '〇センチを描け！',
    descBase: '画面を指でなぞって、お題の長さの線を描こう！<br>描いたら「決定」。10秒以内なら描き直せる。<br>始点から終点までの長さで判定。お題に近いほど上位。',
    desc: '画面を指でなぞって、お題の長さの線を描こう！<br>描いたら「決定」。10秒以内なら描き直せる。<br>始点から終点までの長さで判定。お題に近いほど上位。',
    lowerBetter: true, miss: 99,
    isMiss: v => v >= 99,
    fmt: (v, x) => {
      if (v >= 99) return T('失格');
      if (!x || typeof x.cm !== 'number') return T('誤差 {n}cm', { n: v.toFixed(2) });
      const d = Math.round((x.cm - x.t) * 100) / 100;
      return T('誤差 {n}cm', { n: (d > 0 ? '+' : '') + d.toFixed(2) }) + T(d > 0 ? '(長い)' : d < 0 ? '(短い)' : '(ぴったり)');
    },
    // 結果に出す棒。金色の目印がお題の長さ、青い棒が描いた線の長さ
    viz: (v, x) => {
      const cm = Number(x.cm), t = Number(x.t), MAX = 12;
      if (!isFinite(cm) || !isFinite(t)) return '';
      const pct = n => Math.min(100, Math.max(0, n / MAX * 100));
      return `<div class="vbar"><div class="vfill" style="width:${pct(cm)}%"></div><div class="vmark" style="left:${pct(t)}%"></div></div><div class="vlabel">${T('描いた線 {a}cm ・ お題 {b}cm', { a: cm.toFixed(2), b: t })}</div>`;
    },
    play: playDrawCm
  }
);

/* 全員同じ問題を出すための乱数。種(round.delay など)が同じなら、全員が同じ並びになる */
function seededRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function countdown(stage, game, round, onGo) {
  const m = multAt(round.index);
  const title = typeof titleHtml === 'function' ? titleHtml(game) : '';   // 👑 タイトルホルダー(core.js)
  stage.innerHTML = `<div class="rule">${m > 1 ? `<div class="bonus">${bonusLabel(round.index)} ${T('このラウンドはポイント2倍')}</div>` : ''}<h2>${h(game.title)}</h2><p>${game.desc}</p>${title}<div class="cdnum" id="cd"></div></div>`;
  const cd = stage.querySelector('#cd');
  const iv = setInterval(() => {
    const rem = round.startAt - serverNow();
    if (rem <= 0) { clearInterval(iv); onGo(); }
    else cd.textContent = Math.ceil(rem / 1000);
  }, 50);
  timers.push(iv);
}

/* --- 〇秒ジャスト --- */
const just5Sec = t => T('{n}秒', { n: t % 1 ? Number(t).toFixed(1) : String(t) });   // 7 → 「7秒」、7.5 → 「7.5秒」
function playJust5(stage, round, submit) {
  const game = GAMES.find(g => g.id === 'just5');
  // 全員共通の round.delay からお題を決める → 5〜9秒、0.5秒刻みの9通り
  const target = 5 + Math.floor(seededRng(Math.round((round.delay || 3000) * 1000))() * 9) * 0.5;
  game.desc = game.descBase + `<div style="margin-top:14px;font-size:22px">${T('お題')} <b style="color:#ffcc33">${just5Sec(target)}</b></div>`;
  countdown(stage, game, round, () => {
    stage.innerHTML = `<div class="big-num" id="t">0.00</div><div class="center" style="font-size:20px">${T('{t}ぴったりで止めろ!', { t: `<b style="color:#ffcc33">${just5Sec(target)}</b>` })}</div><button class="btn big" id="stop">STOP</button>`;
    const el = stage.querySelector('#t');
    const t0 = performance.now();
    let done = false;
    const iv = setInterval(() => {
      const e = performance.now() - t0;
      el.textContent = e < 2000 ? (e / 1000).toFixed(2) : '?.??';
      if (e > (target + 5) * 1000 && !done) { done = true; submit(game.miss, { t: target }); }   // お題+5秒で時間切れ
    }, 30);
    timers.push(iv);
    stage.querySelector('#stop').addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (done) return;
      done = true; clearInterval(iv);
      const e = performance.now() - t0;
      el.textContent = (e / 1000).toFixed(2);                 // 止めたら本当の秒数を見せる
      submit(Math.round(Math.abs(e - target * 1000)), { t: target });
    });
  });
}

/* --- 定規キャッチ! --- */
// 設定(ここを変えると難しさが変わる)
function rulerCfg() {
  return {
    LEN: 40,        // 定規の長さ(cm)。つかめなかった・フライングはこの値
    G: 600,         // 重力(cm/秒²)。本物(980)より弱め。0.2秒で約12cm、0.3秒で約27cm、0.37秒で40cm落ちきる
    TRIES: 3,       // 何回勝負か
    PAUSE: 1.1      // 1回終わってから次の回までの秒数
  };
}

// 各回の待ち時間とフェイント。種が同じなら全員同じ
function rulerMake(seed) {
  const C = rulerCfg(), rnd = seededRng(seed), tries = [];
  for (let i = 0; i < C.TRIES; i++) {
    const wait = 1.5 + rnd() * 2.5;                                  // 落ちるまで 1.5〜4秒
    const feint = rnd() < 0.45 && wait > 1.9 ? 0.6 + rnd() * (wait - 1.2) : -1;   // ピクッと揺れる時刻(なしは -1)
    tries.push({ wait, feint });
  }
  return tries;
}

function playRuler(stage, round, submit) {
  const game = GAMES.find(g => g.id === 'ruler');
  const C = rulerCfg();
  const tries = rulerMake(Math.round((round.delay || 3000) * 1000));

  countdown(stage, game, round, () => {
    stage.innerHTML =
      `<div class="center sub" id="info" style="font-size:18px;margin:2px 0">${T('{k}/{n}回目 ・ 落ちたらタップ!', { k: '<b id="no" style="color:#ffcc33">1</b>', n: C.TRIES })}</div>` +
      `<div class="center sub" id="rec" style="min-height:22px"></div>` +
      `<canvas id="pad" style="display:block;width:100%;height:62vh;margin-top:4px;touch-action:none"></canvas>`;
    const cv = stage.querySelector('#pad');
    const noEl = stage.querySelector('#no'), rec = stage.querySelector('#rec');
    const dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    const hy = H * 0.86;                         // 指の高さ(定規の0cmがここ)
    const pxcm = H * 0.72 / C.LEN;              // 1cmの長さ(画面上)
    const res = [], kinds = [];                  // 各回のcm / 'o'=つかんだ 'f'=フライング 'm'=つかめず
    let k = 0, st = 'wait', tStart = 0, tDrop = 0, fallen = 0, msg = '', msgColor = '#ffcc33', done = false, iv = null;
    const now = () => performance.now() / 1000;

    const draw = e => {
      ctx.clearRect(0, 0, W, H);
      const tr = tries[k] || {};
      let shake = 0;
      if (st === 'wait' && tr.feint > 0) {      // フェイント: ピクッと揺れる
        const a = e - tStart - tr.feint;
        if (a > 0 && a < 0.18) shake = Math.sin(a * 90) * 4;
      }
      const top = hy - C.LEN * pxcm + fallen * pxcm;
      drawRulerBody(ctx, W / 2 + shake, top, pxcm, C.LEN);
      // 指(つかんだら閉じる)
      const shut = st === 'caught' || st === 'next' && kinds[k] === 'o';
      const gap = shut ? pxcm * 1.6 : pxcm * 4.5;
      ctx.fillStyle = '#f2c9a0';
      rrectR(ctx, W / 2 - gap - pxcm * 5, hy - pxcm * 1.2, pxcm * 5, pxcm * 2.4, pxcm * 1.2); ctx.fill();
      rrectR(ctx, W / 2 + gap, hy - pxcm * 1.2, pxcm * 5, pxcm * 2.4, pxcm * 1.2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,204,51,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy); ctx.stroke(); ctx.setLineDash([]);
      if (msg) {
        ctx.fillStyle = msgColor; ctx.font = 'bold 34px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(msg, W / 2, H * 0.08);
      }
    };

    const showRec = () => {
      rec.innerHTML = res.map((v, i) => kinds[i] === 'o' ? `${T('{n}回目', { n: i + 1 })} <b style="color:#f2f4ff">${v.toFixed(1)}cm</b>` : `${T('{n}回目', { n: i + 1 })} <b style="color:#ff5c6c">${kinds[i] === 'f' ? T('フライング') : T('落ちた')}</b>`).join(' ・ ');
    };

    const finish = () => {
      if (done) return;
      done = true;
      const ok = kinds.filter(s => s === 'o').length;
      const avg = Math.round(res.reduce((a, b) => a + b, 0) / res.length * 10) / 10;
      stage.querySelector('#info').innerHTML = ok ? `${T('平均')} <b style="color:#ffcc33;font-size:24px">${avg.toFixed(1)}cm</b>` : '<b style="color:#ff5c6c">' + T('全部失敗…') + '</b>';
      submit(ok ? avg : 99, { c: res.slice(), s: kinds.join('') });
    };

    const endTry = (cm, kind) => {
      res.push(Math.round(cm * 10) / 10); kinds.push(kind);
      st = 'next'; tStart = now();
      msg = kind === 'o' ? cm.toFixed(1) + 'cm!' : kind === 'f' ? T('フライング!') : T('落ちた!');
      msgColor = kind === 'o' ? '#ffcc33' : '#ff5c6c';
      showRec();
    };

    const startTry = () => {
      st = 'wait'; tStart = now(); fallen = 0; msg = '';
      noEl.textContent = k + 1;
    };

    cv.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (done) return;
      const e = now();
      if (st === 'wait') { fallen = 0; endTry(C.LEN, 'f'); }                 // 落ちる前に押した
      else if (st === 'fall') {
        fallen = Math.min(C.LEN, 0.5 * C.G * Math.pow(e - tDrop, 2));
        st = 'caught'; endTry(fallen, 'o');
      }
    });

    startTry();
    iv = setInterval(() => {
      if (done) return;
      const e = now(), tr = tries[k];
      if (st === 'wait' && e - tStart >= tr.wait) { st = 'fall'; tDrop = tStart + tr.wait; }
      if (st === 'fall') {
        fallen = 0.5 * C.G * Math.pow(e - tDrop, 2);
        if (fallen >= C.LEN) { fallen = C.LEN + 30; endTry(C.LEN, 'm'); }   // つかめなかった(画面の下へ)
      }
      if (st === 'next' && e - tStart >= C.PAUSE) {
        k++;
        if (k >= C.TRIES) { finish(); return; }
        startTry();
      }
      draw(e);
    }, 16);
    timers.push(iv);
  });
}

// 角の丸い四角(games2.js の rrect と同じもの。games.js だけでも動くように持っておく)
function rrectR(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// 縦の定規を描く。top は40cmの端(上)、下の端が0cm
function drawRulerBody(ctx, cx, top, pxcm, len) {
  const w = Math.max(28, pxcm * 3.6), x0 = cx - w / 2, hgt = len * pxcm;
  ctx.fillStyle = '#ecd9a0';
  rrectR(ctx, x0, top, w, hgt, 4); ctx.fill();
  ctx.strokeStyle = '#3a2e1a'; ctx.fillStyle = '#3a2e1a';
  ctx.font = `bold ${Math.max(9, Math.round(pxcm * 1.5))}px sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (let c = 0; c <= len; c++) {
    const y = top + hgt - c * pxcm;
    const l = c % 5 === 0 ? w * 0.42 : w * 0.22;
    ctx.lineWidth = c % 5 === 0 ? 1.6 : 1;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + l, y); ctx.stroke();
    if (c % 5 === 0 && c > 0) ctx.fillText(String(c), x0 + w * 0.5, y);
  }
}

// リザルト用:横向きの定規に、3回分のつかんだ位置を描く
function drawRulerResult(el, data, size) {
  size = size || 90;
  const w = Math.min(300, size * 2.4), h = size * 0.55;
  const dpr = window.devicePixelRatio || 1;
  const cv = document.createElement('canvas');
  cv.width = w * dpr; cv.height = h * dpr;
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  el.appendChild(cv);
  if (!data) return;
  const C = rulerCfg();
  const raw = data.c || [];
  const cs = (Array.isArray(raw) ? raw : Object.values(raw)).map(Number);
  const ks = typeof data.s === 'string' ? data.s : '';
  const x0 = w * 0.04, x1 = w * 0.96, y0 = h * 0.42, rh = h * 0.32;
  const X = cm => x0 + (x1 - x0) * Math.min(1, cm / C.LEN);
  ctx.fillStyle = '#ecd9a0'; rrectR(ctx, x0, y0, x1 - x0, rh, 3); ctx.fill();
  ctx.strokeStyle = '#3a2e1a'; ctx.fillStyle = '#3a2e1a';
  ctx.font = `${Math.max(8, Math.round(h * 0.16))}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let c = 0; c <= C.LEN; c += 5) {
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(c), y0); ctx.lineTo(X(c), y0 + rh * (c % 10 ? 0.35 : 0.55)); ctx.stroke();
    if (c % 10 === 0 && c > 0 && c < C.LEN) ctx.fillText(String(c), X(c), y0 + rh * 0.55);
  }
  cs.forEach((cm, i) => {                         // 3回分の印(番号つき)。失敗は赤
    const ok = ks[i] === 'o', x = ok ? X(cm) : X(C.LEN);
    ctx.fillStyle = ok ? '#ffcc33' : '#ff5c6c';
    ctx.beginPath(); ctx.moveTo(x, y0 - 1); ctx.lineTo(x - h * 0.1, y0 - h * 0.2); ctx.lineTo(x + h * 0.1, y0 - h * 0.2); ctx.closePath(); ctx.fill();
    ctx.font = `bold ${Math.max(8, Math.round(h * 0.17))}px sans-serif`; ctx.textBaseline = 'bottom';
    ctx.fillText(ok ? String(i + 1) : '×', x + (ok ? 0 : (i - 1) * h * 0.22), y0 - h * 0.2);
  });
}

/* --- 〇センチを描け! --- */
function playDrawCm(stage, round, submit) {
  // 番号ではなく id で自分を探すので、組み込み時に番号を直さなくてよい
  const game = GAMES.find(g => g.id === 'drawcm');
  const PX_PER_CM = 96 / 2.54; // CSSの1cm(ゲーム内の1cm)
  // 全員共通の round.delay からお題を決める → 1〜6cm、0.5刻みの11通り
  const target = 1 + (Math.floor(round.delay) % 11) * 0.5;

  // カウントダウン中(5秒)にお題と1cmの見本を見せる
  game.desc = game.descBase +
    `<div style="margin-top:14px;font-size:22px">${T('お題')} <b style="color:#ffcc33">${target}cm</b></div>` +
    `<div style="margin-top:10px">${T('見本:これが1cm')}</div>` +
    `<div style="width:1cm;height:8px;background:#ffcc33;border-radius:4px;margin:8px auto"></div>`;

  countdown(stage, game, round, () => {
    stage.innerHTML =
      `<div class="center" style="font-size:22px;margin:6px 0">${T('{t} を描け!', { t: `<b style="color:#ffcc33">${target}cm</b>` })}</div>` +
      `<div class="center sub">${T('残り {t} 秒 ・ 描き直しOK', { t: '<b id="left">10.0</b>' })}</div>` +
      `<canvas id="pad" style="display:block;width:100%;height:48vh;margin-top:8px;background:rgba(255,255,255,0.05);border-radius:12px;touch-action:none"></canvas>` +
      `<button class="btn" id="ok" disabled>${T('決定')}</button>`;

    const cv = stage.querySelector('#pad');
    const left = stage.querySelector('#left');
    const ok = stage.querySelector('#ok');
    const dpr = window.devicePixelRatio || 1;
    const r = cv.getBoundingClientRect();
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    const DUR = 10000, t0 = performance.now();
    let line = null;      // 決定できる線 { s, e }
    let cur = null;       // 今なぞっている線
    let activeId = null, done = false, iv = null;

    const pos = ev => {
      const b = cv.getBoundingClientRect();
      return { x: ev.clientX - b.left, y: ev.clientY - b.top };
    };
    const cmOf = ln => Math.hypot(ln.e.x - ln.s.x, ln.e.y - ln.s.y) / PX_PER_CM;
    const draw = ln => {
      ctx.clearRect(0, 0, r.width, r.height);
      if (!ln) return;
      ctx.strokeStyle = '#f2f4ff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ln.s.x, ln.s.y); ctx.lineTo(ln.e.x, ln.e.y); ctx.stroke();
      ctx.fillStyle = '#ffcc33';
      [ln.s, ln.e].forEach(q => { ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, Math.PI * 2); ctx.fill(); });
    };
    const setLine = ln => { line = ln; ok.disabled = !ln; draw(ln); };
    const finishWith = ln => {
      if (done) return;
      done = true;
      clearInterval(iv);
      if (!ln) { submit(99); return; } // 描いていなければ失格
      const cm = Math.round(cmOf(ln) * 100) / 100;
      const diff = Math.round((cm - target) * 100) / 100;
      submit(Math.abs(diff), { cm, t: target }); // 順位は誤差の大きさ、長さは結果の表示用
    };

    setLine(null); // 最初は線がないので、決定は押せない

    cv.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (done || activeId !== null) return;
      activeId = ev.pointerId;
      try { cv.setPointerCapture(activeId); } catch (e) {}
      const p = pos(ev);
      cur = { s: p, e: p };
      setLine(null); // 描き直し: 前の線は消す
      draw(cur);
    });
    cv.addEventListener('pointermove', ev => {
      if (done || activeId === null || ev.pointerId !== activeId) return;
      ev.preventDefault();
      cur.e = pos(ev);
      draw(cur);
    });
    cv.addEventListener('pointerup', ev => {
      if (done || activeId === null || ev.pointerId !== activeId) return;
      cur.e = pos(ev);
      activeId = null;
      if (cmOf(cur) < 0.2) { cur = null; setLine(null); return; } // 誤タップは無効
      setLine(cur);
      cur = null;
    });
    cv.addEventListener('pointercancel', ev => {
      if (done || ev.pointerId !== activeId) return;
      activeId = null; cur = null; setLine(null); // 中断されたら描き直し
    });
    ok.addEventListener('click', () => { if (line) finishWith(line); });

    iv = setInterval(() => {
      const e = performance.now() - t0;
      if (!done) left.textContent = Math.max(0, (DUR - e) / 1000).toFixed(1);
      if (e >= DUR && !done) {
        // 時間切れ: 描いてあればその線で決定、なければ失格
        finishWith(line || (cur && cmOf(cur) >= 0.2 ? cur : null));
      }
    }, 50);
    timers.push(iv);
  });
}

/* ---------- キレイに切って! / 角度を描け! ---------- */

GAMES.push(
  {
    id: 'cut', title: 'キレイに切って!',
    descBase: '真ん中の点から円の外までドラッグして切ろう!<br>離すと線が残る。「1つ戻る」でやり直せる。<br>お題の数だけ切ったら終了。<br>1切れずつの大きさがそろうほど上位。',
    desc: '真ん中の点から円の外までドラッグして切ろう!<br>離すと線が残る。「1つ戻る」でやり直せる。<br>お題の数だけ切ったら終了。<br>1切れずつの大きさがそろうほど上位。',
    lowerBetter: true, miss: 99,
    isMiss: v => v >= 99,
    fmt: v => v >= 99 ? T('失敗') : T('ズレ {n}%', { n: v.toFixed(2) }),
    play: playCut,
    // リザルト用:その人の切った円を el の中に描く(data は submit の2つ目で送ったもの)
    result: drawCutResult
  },
  {
    id: 'angle', title: '角度を描け!',
    descBase: '真ん中の点からドラッグして、お題の角度の線を引こう!<br>灰色の線とのあいだの角度で判定。<br>離したあと「決定!」で確定。お題に近いほど上位。',
    desc: '真ん中の点からドラッグして、お題の角度の線を引こう!<br>灰色の線とのあいだの角度で判定。<br>離したあと「決定!」で確定。お題に近いほど上位。',
    lowerBetter: true, miss: 999,
    isMiss: v => v >= 999,
    fmt: v => v >= 999 ? T('失敗') : T('誤差 {n}°', { n: v.toFixed(1) }),
    play: playAngle,
    // リザルト用:その人の線を el の中に描く(data は submit の2つ目で送ったもの)
    result: drawAngleResult
  }
);

/* --- キレイに切って! --- */
function playCut(stage, round, submit) {
  // 番号ではなく id で自分を探すので、組み込み時に番号を直さなくてよい
  const game = GAMES.find(g => g.id === 'cut');
  // 全員共通の round.delay からお題を決める → 3〜9等分
  const N = 3 + (Math.floor(round.delay) % 7);

  // カウントダウン中(5秒)にお題を見せる
  game.desc = game.descBase +
    `<div style="margin-top:14px;font-size:22px">${T('お題')} <b style="color:#ffcc33">${T('{n}等分', { n: N })}</b></div>`;

  countdown(stage, game, round, () => {
    stage.innerHTML =
      `<div class="center" style="font-size:22px;margin:6px 0">${T('{p}に切って!', { p: `<b style="color:#ffcc33">${T('{n}等分', { n: N })}</b>` })}</div>` +
      `<div class="center sub" id="info">${T('あと {n} 本 ・ 残り {t} 秒', { n: `<b id="rest">${N}</b>`, t: '<b id="left">15.0</b>' })}</div>` +
      `<canvas id="pad" style="display:block;width:100%;height:50vh;margin-top:8px;touch-action:none"></canvas>` +
      `<div class="center"><button class="btn" id="undo" style="margin-top:8px;min-width:150px">↶ ${T('1つ戻る')}</button></div>`;

    const cv = stage.querySelector('#pad');
    const info = stage.querySelector('#info');
    const undoBtn = stage.querySelector('#undo');
    const dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.42;         // 円の半径
    const HIT = Math.max(30, R * 0.2);       // 真ん中の点をつかめる範囲
    const DUR = 15000, t0 = performance.now();
    const cuts = [];                          // 切った角度(ラジアン)
    let drag = null, pid = null, done = false, iv = null;

    const pos = ev => {
      const b = cv.getBoundingClientRect();
      return { x: ev.clientX - b.left, y: ev.clientY - b.top };
    };
    const dist = p => Math.hypot(p.x - cx, p.y - cy);

    const updateUI = () => {
      const rest = stage.querySelector('#rest');
      if (rest) rest.textContent = N - cuts.length;
      undoBtn.style.opacity = (cuts.length && !done) ? '1' : '0.35';
    };

    const draw = withLabels => {
      ctx.clearRect(0, 0, W, H);
      drawCutCircle(ctx, cx, cy, R, cuts, withLabels ? N : 0);
      // ドラッグ中の線(円の外に出たら黄色)
      if (drag) {
        ctx.strokeStyle = dist(drag) > R ? '#ffcc33' : 'rgba(242,244,255,0.5)';
        ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(drag.x, drag.y); ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    // 結果送信。2つ目は切った角度(度・小数1桁)。リザルトで全員の円を描くのに使う
    const finish = v => {
      if (done) return;
      done = true;
      clearInterval(iv);
      updateUI();
      submit(v, { n: N, cuts: cuts.map(a => Math.round(a * 1800 / Math.PI) / 10) });
    };

    const judge = () => {
      const dev = cutDeviation(cuts, N);
      draw(true);
      info.innerHTML = `${T('平均のズレ')} <b style="color:#ffcc33">${dev.toFixed(2)}%</b>`;
      finish(dev);
    };

    undoBtn.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (done || drag || !cuts.length) return;
      cuts.pop();
      updateUI(); draw();
    });

    cv.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (done || drag) return;
      const p = pos(ev);
      if (dist(p) > HIT) return;               // 真ん中の点から始めたときだけ
      drag = p; pid = ev.pointerId;
      try { cv.setPointerCapture(pid); } catch (e) {}
      draw();
    });
    cv.addEventListener('pointermove', ev => {
      if (done || !drag || ev.pointerId !== pid) return;
      ev.preventDefault();
      drag = pos(ev);
      draw();
    });
    cv.addEventListener('pointerup', ev => {
      if (done || !drag || ev.pointerId !== pid) return;
      const p = pos(ev);
      drag = null;
      if (dist(p) > R) cuts.push(Math.atan2(p.y - cy, p.x - cx)); // 円の外で離したら1本確定
      updateUI(); draw();
      if (cuts.length >= N) judge();
    });
    cv.addEventListener('pointercancel', ev => {
      if (done || ev.pointerId !== pid) return;
      drag = null; draw();
    });

    updateUI(); draw();
    iv = setInterval(() => {
      const e = performance.now() - t0;
      const left = stage.querySelector('#left');
      if (!done && left) left.textContent = Math.max(0, (DUR - e) / 1000).toFixed(1);
      if (e >= DUR && !done) { drag = null; draw(); finish(99); } // 時間内に切り終わらなければ失敗
    }, 50);
    timers.push(iv);
  });
}

// 平均のズレ(%)を計算する
function cutDeviation(cuts, N) {
  const s = cuts.map(a => (a % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)).sort((a, b) => a - b);
  let sum = 0;
  s.forEach((a, i) => {
    const b = i + 1 < s.length ? s[i + 1] : s[0] + Math.PI * 2;
    sum += Math.abs((b - a) / (Math.PI * 2) - 1 / N);
  });
  return Math.round(sum / N * 100 * 100) / 100;
}

// 円と切った線を描く。labelN を渡すと各切れの割合も書く(プレイ画面とリザルトで共用)
function drawCutCircle(ctx, cx, cy, R, cuts, labelN) {
  ctx.fillStyle = 'rgba(255,204,51,0.15)';
  ctx.strokeStyle = '#f2f4ff'; ctx.lineWidth = Math.max(2, R / 50);
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.lineWidth = Math.max(2, R / 35); ctx.lineCap = 'round';
  cuts.forEach(a => {
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
  });
  if (labelN && cuts.length) {
    const s = cuts.map(a => (a % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)).sort((a, b) => a - b);
    ctx.fillStyle = '#ffcc33';
    ctx.font = `bold ${Math.max(10, Math.round(R / 9))}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    s.forEach((a, i) => {
      const b = i + 1 < s.length ? s[i + 1] : s[0] + Math.PI * 2;
      const m = (a + b) / 2;
      ctx.fillText(((b - a) / (Math.PI * 2) * 100).toFixed(1) + '%', cx + Math.cos(m) * R * 0.64, cy + Math.sin(m) * R * 0.64);
    });
  }
  ctx.fillStyle = '#ffcc33';
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(3, R / 14), 0, Math.PI * 2); ctx.fill();
}

// リザルト用:el(div など)の中に、その人の切った円を小さく描く
function drawCutResult(el, data, size) {
  size = size || 90;
  const dpr = window.devicePixelRatio || 1;
  const cv = document.createElement('canvas');
  cv.width = size * dpr; cv.height = size * dpr;
  cv.style.width = size + 'px'; cv.style.height = size + 'px';
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  const raw = data && data.cuts ? data.cuts : [];
  const cuts = (Array.isArray(raw) ? raw : Object.values(raw)).map(d => d * Math.PI / 180);
  drawCutCircle(ctx, size / 2, size / 2, size * 0.46, cuts, 0);
  el.appendChild(cv);
}

/* --- 角度を描け! --- */
function playAngle(stage, round, submit) {
  // 番号ではなく id で自分を探すので、組み込み時に番号を直さなくてよい
  const game = GAMES.find(g => g.id === 'angle');
  const d = Math.floor(round.delay);
  // 全員共通の round.delay からお題と基準線の向きを決める → 10〜165度(5度刻み)
  const target = 10 + (d % 32) * 5;
  const ref = (Math.floor(d / 32) % 12) * 30;

  // カウントダウン中(5秒)にお題を見せる
  game.desc = game.descBase +
    `<div style="margin-top:14px;font-size:22px">${T('お題')} <b style="color:#ffcc33">${T('{n}度', { n: target })}</b></div>`;

  countdown(stage, game, round, () => {
    stage.innerHTML =
      `<div class="center" style="font-size:22px;margin:6px 0">${T('{a} を作って!', { a: `<b style="color:#ffcc33">${T('{n}度', { n: target })}</b>` })}</div>` +
      `<div class="center sub" id="info">${T('灰色の線から {a} ・ 残り {t} 秒', { a: T('{n}度', { n: target }), t: '<b id="left">15.0</b>' })}</div>` +
      `<canvas id="pad" style="display:block;width:100%;height:50vh;margin-top:8px;touch-action:none"></canvas>` +
      `<div class="center" style="display:flex;gap:10px;justify-content:center;margin-top:8px">` +
      `<button class="btn" id="redo" style="min-width:130px">${T('やり直す')}</button>` +
      `<button class="btn" id="ok" style="min-width:130px">${T('決定!')}</button></div>`;

    const cv = stage.querySelector('#pad');
    const info = stage.querySelector('#info');
    const redo = stage.querySelector('#redo');
    const ok = stage.querySelector('#ok');
    const dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.42;
    const HIT = Math.max(36, R * 0.22);      // 真ん中の点をつかめる範囲
    const MIN = R * 0.3;                      // これより短い線は無効
    const DUR = 15000, t0 = performance.now();
    let drag = null, pid = null, cur = null, done = false, iv = null;

    const pos = ev => {
      const b = cv.getBoundingClientRect();
      return { x: ev.clientX - b.left, y: ev.clientY - b.top };
    };
    const dist = p => Math.hypot(p.x - cx, p.y - cy);
    const degOf = p => Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI;
    const ui = () => {
      const on = cur != null && !done;
      ok.style.opacity = on ? '1' : '0.35';
      redo.style.opacity = on ? '1' : '0.35';
    };
    const draw = reveal => {
      ctx.clearRect(0, 0, W, H);
      drawAngleScene(ctx, cx, cy, R, ref, drag ? degOf(drag) : cur, target, reveal);
    };
    // 結果送信。2つ目は線の向きなど。リザルトで全員の線を描くのに使う
    const finish = (v, u) => {
      if (done) return;
      done = true;
      clearInterval(iv);
      ui();
      submit(v, { t: target, r: ref, a: u == null ? null : Math.round(u * 10) / 10 });
    };
    const decide = () => {
      if (cur == null) { draw(false); finish(999, null); return; }
      const ang = angleBetween(cur, ref);
      const err = Math.round(Math.abs(ang - target) * 10) / 10;
      draw(true);
      info.innerHTML = `${T('あなたの角度')} <b style="color:#ffcc33">${ang.toFixed(1)}°</b> ・ ${T('誤差')} <b style="color:#ffcc33">${err.toFixed(1)}°</b>`;
      finish(err, cur);
    };

    ok.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (done || drag || cur == null) return;
      decide();
    });
    redo.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (done || drag || cur == null) return;
      cur = null; ui(); draw();
    });

    cv.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (done || drag) return;
      const p = pos(ev);
      if (dist(p) > HIT) return;               // 真ん中の点から始めたときだけ
      drag = p; pid = ev.pointerId; cur = null;
      try { cv.setPointerCapture(pid); } catch (e) {}
      ui(); draw();
    });
    cv.addEventListener('pointermove', ev => {
      if (done || !drag || ev.pointerId !== pid) return;
      ev.preventDefault();
      drag = pos(ev);
      draw();
    });
    cv.addEventListener('pointerup', ev => {
      if (done || !drag || ev.pointerId !== pid) return;
      const p = pos(ev);
      drag = null;
      cur = dist(p) >= MIN ? degOf(p) : null;  // 短すぎる線はやり直し
      ui(); draw();
    });
    cv.addEventListener('pointercancel', ev => {
      if (done || ev.pointerId !== pid) return;
      drag = null; cur = null; ui(); draw();
    });

    ui(); draw();
    iv = setInterval(() => {
      const e = performance.now() - t0;
      const left = stage.querySelector('#left');
      if (!done && left) left.textContent = Math.max(0, (DUR - e) / 1000).toFixed(1);
      if (e >= DUR && !done) { drag = null; decide(); } // 時間切れ:線があればそれで判定、なければ失敗
    }, 50);
    timers.push(iv);
  });
}

// 2本の線(基準線と自分の線)のあいだの角度 0〜180
function angleBetween(userDeg, refDeg) {
  let a = ((userDeg - refDeg) % 360 + 360) % 360;
  return a > 180 ? 360 - a : a;
}

// 円・基準線・自分の線を描く(プレイ画面とリザルトで共用)
// reveal が true のとき、お題の角度の位置を黄色の点線で見せる
function drawAngleScene(ctx, cx, cy, R, ref, userDeg, target, reveal) {
  const rad = d => d * Math.PI / 180;
  const w = Math.max(2, R / 35);
  const line = (deg, color, lw, dash) => {
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(rad(deg)) * R, cy + Math.sin(rad(deg)) * R);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  ctx.strokeStyle = 'rgba(242,244,255,0.25)';
  ctx.lineWidth = Math.max(1, R / 80);
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  line(ref, 'rgba(242,244,255,0.55)', w);                 // 基準線(灰色)
  if (userDeg != null) {
    if (reveal) {
      const signed = (((userDeg - ref) % 360) + 540) % 360 - 180;
      const side = signed >= 0 ? 1 : -1;                  // 自分の線と同じ側にお題を出す
      line(ref + side * target, '#ffcc33', w * 0.7, [w * 2, w * 2]);
    }
    line(userDeg, '#f2f4ff', w);                          // 自分の線
  }
  ctx.fillStyle = '#ffcc33';
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(3, R / 14), 0, Math.PI * 2); ctx.fill();
}

// リザルト用:el(div など)の中に、その人の線を小さく描く
function drawAngleResult(el, data, size) {
  size = size || 90;
  const dpr = window.devicePixelRatio || 1;
  const cv = document.createElement('canvas');
  cv.width = size * dpr; cv.height = size * dpr;
  cv.style.width = size + 'px'; cv.style.height = size + 'px';
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  if (data) drawAngleScene(ctx, size / 2, size / 2, size * 0.46, data.r, data.a, data.t, true);
  el.appendChild(cv);
}

/* ---------- 旗揚げゲーム!! / 色ちがい探し! ---------- */

GAMES.push(
  {
    id: 'hata', title: '旗揚げゲーム!!',
    desc: '審判のお題どおりに旗を上げ下げしよう!<br>下の「赤」「白」ボタンを押している間=上げる、離す=下げる。<br>「〜ない」のひっかけは、一瞬でも動かしたらアウト。お題に出ていない旗も動かさない。<br>だんだん速くなる! お題は15こ(1こ1点)+連続正解ボーナス(4連続+1・8連続+2・12連続+3・15連続+4)。最高25点。',
    lowerBetter: false, miss: 0,
    isMiss: v => v <= 0,
    fmt: v => T('{n}点', { n: v }),
    play: playHata,
    // リザルト用:15個の○×
    result: drawHataResult
  },
  {
    id: 'oddcolor', title: '色ちがい探し!',
    desc: 'ほんの少しだけ色がちがうマスを1つ探してタッチ!<br>15秒で何問正解できるか勝負。<br>まちがえると1秒おやすみ。<br>正解数が多いほど上位。0問は0点。',
    lowerBetter: false, miss: 0,
    isMiss: v => v <= 0,
    fmt: v => T('{n}問', { n: v }),
    play: playOddColor
  }
);

/* --- 旗揚げゲーム!! --- */
// 速さなどの数字。だんだん速くなる(はじめ → おわり)
const hataCfg = {
  parts: 15,                       // お題の部分の数(=最高15点。ボーナス込みで25点)
  doubleMin: 4, doubleMax: 5,      // 2点のお題(赤と白)の数
  negChance: 0.3,                  // 「〜ない」のひっかけが出る確率
  trapChance: 0.85,               // 「〜ない」が、動かしたくなる向きになる確率
  changeChance: 0.8,               // 「上げて/下げて」で、旗を動かす必要があるお題になる確率(残りは、もうその状態)
  charStart: 106, charEnd: 54,     // 1文字が出る間隔(ms)(v=17で、20こ→15こに合わせてゆっくりに)
  graceStart: 930, graceEnd: 560,  // 最後の文字が出てから判定までの猶予(ms)
  lead: 600,                       // 始まってから1文字目が出るまで(ms)
  maxTotal: 17200                  // 全体がこれより長くなったら、全部を少し速くする(ms)
};
const HATA_BONUS = { 4: 1, 8: 2, 12: 3, 15: 4 };   // 連続正解のボーナス

// お題を作る。種が同じなら全員同じ
// 部分 = { f: 'r'|'w'(旗), up: 上げ/下げ, neg: ひっかけ, text, ws: 始まり, we: 判定, q: 何問目, k: 何番目の部分 }
function hataMake(seed) {
  const C = hataCfg, rnd = seededRng(seed);
  const nDouble = C.doubleMin + Math.floor(rnd() * (C.doubleMax - C.doubleMin + 1));
  const kinds = [];
  for (let i = 0; i < nDouble; i++) kinds.push(2);
  for (let i = 0; i < C.parts - nDouble * 2; i++) kinds.push(1);
  for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  const parts = [];
  const state = { r: false, w: false };                    // 正しく遊んだときの旗(お題の出方を決めるためだけに使う)
  kinds.forEach((kind, q) => {
    const first = rnd() < 0.5 ? 'r' : 'w';
    for (let s = 0; s < kind; s++) {
      const f = s === 0 ? first : (first === 'r' ? 'w' : 'r');
      const neg = rnd() < C.negChance;
      // 「上げて/下げて」は、たいてい旗を動かすお題にする(何もしないで点が取れすぎないように)
      // 「〜ない」も、たいていは「つい動かしたくなる」向きにする(下がっているときの「上げない」など)
      const up = rnd() < (neg ? C.trapChance : C.changeChance) ? !state[f] : state[f];
      if (!neg) state[f] = up;
      const mid = kind === 2 && s === 0;                     // 2点のお題の前半は「〜て」「〜ないで」
      const text = (f === 'r' ? '赤' : '白') + (up ? '上げ' : '下げ') + (neg ? (mid ? 'ないで' : 'ない') : 'て');
      parts.push({ f, up, neg, mid, text, q, line: s });
    }
  });
  // 時間を決める
  let t = C.lead;
  parts.forEach((p, k) => {
    const g = k / (parts.length - 1);
    p.cms = C.charStart + (C.charEnd - C.charStart) * g;
    p.grace = C.graceStart + (C.graceEnd - C.graceStart) * g;
    p.ws = t; t += p.text.length * p.cms + p.grace; p.we = t;
  });
  if (t > C.maxTotal) {                                    // 長すぎたら、全部を同じ割合で速くする
    const sc = (C.maxTotal - C.lead) / (t - C.lead);
    t = C.lead;
    parts.forEach(p => { p.cms *= sc; p.grace *= sc; p.ws = t; t += p.text.length * p.cms + p.grace; p.we = t; });
  }
  parts.forEach((p, k) => { p.k = k; });
  return { parts, total: t, nq: kinds.length };
}

// 1つの部分の判定。st = 始まったときの旗、now = 判定のときの旗、moved = 期間中に動いた旗
function hataJudge(p, st, now, moved) {
  const other = p.f === 'r' ? 'w' : 'r';
  if (moved[other]) return false;                          // 出ていない旗を動かした
  if (p.neg) return !moved[p.f];                           // 「〜ない」は動かさない
  if (st[p.f] === p.up) return !moved[p.f];                // もうその状態なら、一瞬でも変えたらアウト
  return now[p.f] === p.up;                                // 判定の瞬間にその状態
}

// 部分ごとの○×(配列)から、点数・ボーナス・最大連続を出す
function hataScore(oks) {
  let pts = 0, bonus = 0, run = 0, best = 0;
  oks.forEach(ok => {
    if (ok) { pts++; run++; best = Math.max(best, run); bonus += HATA_BONUS[run] || 0; }
    else run = 0;
  });
  return { pts, bonus, best, total: pts + bonus };
}

/* 審判のお題のことば(言語ごと)。お題は [色][上げ/下げ][て/ない…] の3つの部分に分ける。
   出る速さは日本語の文字数で決める(全員同じ)。ほかの言語は、日本語の同じ部分が出るあいだに、その部分を少しずつ出す。
   どの言語でも「〜ない」かどうかがわかるのは、3つ目の部分が出はじめたとき(日本語と同じ) */
const HATA_WORDS = {
  ja: { r: '赤', w: '白', up: '上げ', down: '下げ', go: 'て', no: 'ない', goMid: 'て', noMid: 'ないで' },
  en: { r: 'Red ', w: 'White ', up: 'up', down: 'down', go: '!', no: '… NOT!', goMid: ',', noMid: '… NOT,' },
  ko: { r: '빨강 ', w: '하양 ', up: '올', down: '내', go: '려!', no: '리지 마!', goMid: '리고', noMid: '리지 말고' }
};
const hataFont = () => LANG === 'ja' ? 34 : 30;   // 英語・韓国語は字が多いので少し小さく
// お題 p を、日本語で n 文字目まで出したところの文字(HTML)。色の部分は旗の色にする
function hataShow(p, n) {
  const J = HATA_WORDS.ja, W = HATA_WORDS[LANG] || J;
  const end = p.neg ? (p.mid ? 'noMid' : 'no') : (p.mid ? 'goMid' : 'go');
  const keys = [p.f, p.up ? 'up' : 'down', end];
  let rest = n, out = '';
  keys.forEach((k, i) => {
    const j = J[k], w = W[k];
    const got = Math.max(0, Math.min(j.length, rest)); rest -= j.length;
    const s = h(w.slice(0, Math.ceil(w.length * got / j.length)));
    out += i === 0 && s ? `<span style="color:${p.f === 'r' ? '#ff5c6c' : '#ffffff'};${p.f === 'w' ? 'text-shadow:0 0 6px rgba(255,255,255,0.6)' : ''}">${s}</span>` : s;
  });
  return out;
}

function playHata(stage, round, submit) {
  const game = GAMES.find(g => g.id === 'hata');
  const { parts, total } = hataMake(Math.round((round.delay || 3000) * 1000));

  countdown(stage, game, round, () => {
    const btn = (f, label) => `<div data-f="${f}" style="flex:1;height:17vh;min-height:84px;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:bold;border-radius:18px;user-select:none;-webkit-user-select:none;touch-action:none;` +
      (f === 'r' ? 'background:#c8323f;color:#fff;border:3px solid #ff5c6c' : 'background:#e9ecf6;color:#1a1f3a;border:3px solid #ffffff') + `">${label}</div>`;
    stage.innerHTML =
      `<div class="center sub" style="font-size:16px;margin:2px 0">${T('得点')} <b id="pt" style="color:#ffcc33;font-size:22px">0</b> ・ ${T('連続')} <b id="run">0</b></div>` +
      `<div id="qbox" style="position:relative;height:96px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);border-radius:14px">` +
      `<div id="l0" style="font-size:${hataFont()}px;font-weight:bold;line-height:1.25;min-height:42px;letter-spacing:1px"></div>` +
      `<div id="l1" style="font-size:${hataFont()}px;font-weight:bold;line-height:1.25;min-height:0;letter-spacing:1px"></div>` +
      `<div id="mark" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:90px;font-weight:bold;pointer-events:none;opacity:0"></div>` +
      `<div id="combo" style="position:absolute;right:8px;top:4px;font-size:16px;font-weight:bold;color:#ffcc33;opacity:0"></div></div>` +
      `<canvas id="pad" style="display:block;width:100%;height:30vh;touch-action:none"></canvas>` +
      `<div id="btns" style="display:flex;gap:28px;width:100%;-webkit-tap-highlight-color:transparent">${btn('r', T('赤'))}${btn('w', T('白'))}</div>`;
    const ptEl = stage.querySelector('#pt'), runEl = stage.querySelector('#run');
    const lines = [stage.querySelector('#l0'), stage.querySelector('#l1')];
    const mark = stage.querySelector('#mark'), combo = stage.querySelector('#combo');
    const cv = stage.querySelector('#pad');
    const dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    const t0 = performance.now();
    const flag = { r: false, w: false };                     // true = 上げている
    const press = { r: new Set(), w: new Set() };            // 押している指
    const arm = { r: 0, w: 0 };                              // 腕の角度(0=下、1=上)の見た目
    let cur = 0, startedK = -1, moved = { r: false, w: false }, start = { r: false, w: false };
    let shownQ = -1, done = false, iv = null, markT = -9, comboT = -9;
    const oks = [];

    // 旗を動かす(ボタンの押す・離す)
    const setFlag = (f, v) => {
      if (done || flag[f] === v) return;
      const e = performance.now() - t0;
      advance(e);                                              // 時間が来た判定を先にすませる
      flag[f] = v;
      if (cur < parts.length && startedK === cur) moved[f] = true;
    };
    const btns = stage.querySelector('#btns');
    btns.querySelectorAll('[data-f]').forEach(b => {
      const f = b.dataset.f;
      const look = () => { b.style.transform = press[f].size ? 'scale(0.96)' : ''; b.style.filter = press[f].size ? 'brightness(0.85)' : ''; };
      b.addEventListener('pointerdown', ev => {
        ev.preventDefault();
        try { b.setPointerCapture(ev.pointerId); } catch (e) { }
        press[f].add(ev.pointerId); look(); setFlag(f, true);
      });
      const up = ev => { if (!press[f].has(ev.pointerId)) return; press[f].delete(ev.pointerId); look(); if (!press[f].size) setFlag(f, false); };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', ev => ev.preventDefault());
    });

    const finish = () => {
      if (done) return;
      done = true;
      const sc = hataScore(oks);
      submit(sc.total, { p: sc.pts, b: sc.bonus, c: sc.best, m: oks.map(o => o ? 'o' : 'x').join('') });
    };

    // 審判のお題の文字を出す
    const showText = e => {
      const p = parts[cur];
      if (p.q !== shownQ) { shownQ = p.q; lines[0].innerHTML = ''; lines[1].innerHTML = ''; }
      if (e < p.ws) return;
      const n = Math.min(p.text.length, Math.floor((e - p.ws) / p.cms) + 1);
      lines[p.line].innerHTML = hataShow(p, n);
    };

    // プレイヤーの後ろ姿
    const draw = sec => {
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, s = Math.min(H / 230, W / 260);
      const sy = H * 0.52;                                    // 肩の高さ
      ['r', 'w'].forEach(f => { arm[f] += ((flag[f] ? 1 : 0) - arm[f]) * 0.45; });
      // 体
      ctx.fillStyle = '#3d5bd9';
      rrectG(ctx, cx - 44 * s, sy - 6 * s, 88 * s, 110 * s, 22 * s); ctx.fill();
      // 頭(後ろから見た髪)
      ctx.fillStyle = '#e8b896'; ctx.beginPath(); ctx.arc(cx - 31 * s, sy - 34 * s, 7 * s, 0, Math.PI * 2); ctx.arc(cx + 31 * s, sy - 34 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.arc(cx, sy - 38 * s, 30 * s, 0, Math.PI * 2); ctx.fill();
      // 腕と旗(画面の左=赤、右=白)
      ['r', 'w'].forEach(f => {
        const dir = f === 'r' ? -1 : 1;
        const a = arm[f];
        const ang = (0.22 + (2.55 - 0.22) * a);               // 下からの角度(ラジアン)
        const shx = cx + dir * 40 * s, shy = sy + 6 * s, L = 62 * s;
        const hx = shx + dir * Math.sin(ang) * L, hy = shy + Math.cos(ang) * L;
        ctx.strokeStyle = '#3d5bd9'; ctx.lineCap = 'round'; ctx.lineWidth = 16 * s;
        ctx.beginPath(); ctx.moveTo(shx, shy); ctx.lineTo(hx, hy); ctx.stroke();
        // 旗の棒は、手から腕と同じ向きに伸ばす
        const px = hx + dir * Math.sin(ang) * 34 * s, py = hy + Math.cos(ang) * 34 * s;
        const bx = hx - dir * Math.sin(ang) * 8 * s, by = hy - Math.cos(ang) * 8 * s;
        ctx.strokeStyle = '#c9a36b'; ctx.lineWidth = 4 * s;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(px, py); ctx.stroke();
        // 旗の布(棒の先から外へ、少しなびく)
        const wave = Math.sin(sec * 9 + (f === 'r' ? 0 : 1.7)) * 4 * s;
        const fw = 44 * s, fh = 30 * s;
        const mx = px - Math.sin(ang) * dir * fh, my = py - Math.cos(ang) * fh;   // 棒にそって、先から fh 戻ったところ
        ctx.fillStyle = f === 'r' ? '#e8343f' : '#ffffff';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + dir * fw * 0.5, py + wave, px + dir * fw, py + wave * 0.3);
        ctx.lineTo(mx + dir * fw, my + wave * 0.3);
        ctx.quadraticCurveTo(mx + dir * fw * 0.5, my + wave, mx, my);
        ctx.closePath(); ctx.fill();
        if (f === 'w') { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5; ctx.stroke(); }
        // 手
        ctx.fillStyle = '#e8b896'; ctx.beginPath(); ctx.arc(hx, hy, 8 * s, 0, Math.PI * 2); ctx.fill();
      });
    };

    // 判定の時間が来た部分を順に判定して、次の部分を始める
    const advance = e => {
      while (cur < parts.length && e >= parts[cur].we) {
        if (startedK !== cur) { start = { r: flag.r, w: flag.w }; moved = { r: false, w: false }; startedK = cur; }
        const p = parts[cur];
        const ok = hataJudge(p, start, flag, moved);
        oks.push(ok);
        const sc = hataScore(oks);
        ptEl.textContent = sc.total;
        let run = 0; for (let i = oks.length - 1; i >= 0 && oks[i]; i--) run++;
        runEl.textContent = run;
        mark.textContent = ok ? '○' : '×';
        mark.style.color = ok ? '#35d07f' : '#ff5c6c';
        markT = e / 1000;
        if (ok && HATA_BONUS[run]) { combo.textContent = T('{n}連続! +{b}', { n: run, b: HATA_BONUS[run] }); comboT = e / 1000; }
        cur++;
      }
      if (cur < parts.length && startedK !== cur && e >= parts[cur].ws) {   // 部分の始まり:いまの旗の状態を覚える
        start = { r: flag.r, w: flag.w }; moved = { r: false, w: false }; startedK = cur;
      }
    };

    const tick = () => {
      const e = performance.now() - t0, sec = e / 1000;
      advance(e);
      if (cur < parts.length) showText(e);
      mark.style.opacity = Math.max(0, 0.45 * (1 - (sec - markT) / 0.45));
      combo.style.opacity = Math.max(0, 1 - Math.max(0, sec - comboT - 0.6) / 0.4) * (sec - comboT < 1 ? 1 : 0);
      draw(sec);
      if (cur >= parts.length && !done && e >= total + 250) finish();
    };
    tick();
    iv = setInterval(tick, 16);
    timers.push(iv);
  });
}

// 角丸(games2.js の rrect は後から読み込まれるので、ここ用に持っておく)
function rrectG(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// リザルト用:○×を2段に並べる(15個なら 8+7)
function drawHataResult(el, data, size) {
  const { ctx, w, h: H } = wideCanvas(el, size, 3, 0.68);
  if (!data || typeof data.m !== 'string') return;
  const h = H * 0.74;
  const m = data.m, n = m.length || hataCfg.parts, per = Math.max(1, Math.ceil(n / 2));
  const cw = w / per, ch = h / 2;
  ctx.fillStyle = '#9aa3c7'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${Math.max(11, Math.round(Math.min(H * 0.13, w / 23)))}px sans-serif`;
  ctx.fillText(T('正解 {p}/{n} ・ 最大 {c}連続 ・ ボーナス +{b}', { p: data.p != null ? data.p : '?', n, c: data.c != null ? data.c : '?', b: data.b || 0 }), w / 2, H * 0.88);
  for (let i = 0; i < n; i++) {
    const x = (i % per + 0.5) * cw, y = (Math.floor(i / per) + 0.5) * ch;
    const r = Math.min(cw, ch) * 0.32;
    ctx.lineWidth = Math.max(1.5, r * 0.3);
    if (m[i] === 'o') { ctx.strokeStyle = '#35d07f'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
    else { ctx.strokeStyle = '#ff5c6c'; ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke(); }
  }
}

/* --- 色ちがい探し! --- */
function playOddColor(stage, round, submit) {
  // 番号ではなく id で自分を探すので、組み込み時に番号を直さなくてよい
  const game = GAMES.find(g => g.id === 'oddcolor');
  const seed = Math.round((round.delay || 3000) * 1000);
  const DUR = 15000, LOCK = 1000;

  countdown(stage, game, round, () => {
    stage.innerHTML =
      `<div class="center sub" style="font-size:18px;margin:4px 0">${T('正解 {n} 問 ・ 残り {t} 秒', { n: '<b id="ok" style="color:#ffcc33;font-size:26px">0</b>', t: '<b id="left">15.0</b>' })}</div>` +
      `<div class="center sub" id="msg" style="min-height:24px;color:#ff8a8a"></div>` +
      `<div id="grid" style="display:grid;gap:6px;width:100%;max-width:440px;margin:6px auto 0;-webkit-tap-highlight-color:transparent"></div>`;
    const grid = stage.querySelector('#grid');
    const okEl = stage.querySelector('#ok');
    const left = stage.querySelector('#left');
    const msg = stage.querySelector('#msg');

    const t0 = performance.now();
    let n = 0, q = null, lock = false, done = false, iv = null;

    const render = () => {
      q = oddcolorQuestion(seed, n);
      const base = `hsl(${q.hue},${q.s}%,${q.l}%)`;
      const odd = `hsl(${q.hue},${q.s}%,${q.l + q.sign * q.delta}%)`;
      grid.style.gridTemplateColumns = `repeat(${q.size},1fr)`;
      let h = '';
      for (let k = 0; k < q.size * q.size; k++) {
        h += `<div data-i="${k}" style="aspect-ratio:1;border-radius:8px;touch-action:manipulation;background:${k === q.odd ? odd : base}"></div>`;
      }
      grid.innerHTML = h;
    };
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(iv);
      grid.style.opacity = '0.35';
      msg.style.color = '#ffcc33';
      msg.textContent = T('終了!') + ' ' + T('{n}問', { n });
      submit(n);
    };

    grid.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      const c = ev.target.closest('[data-i]');
      if (done || lock || !c) return;
      if (+c.dataset.i === q.odd) {              // 正解:すぐ次の問題
        n++;
        okEl.textContent = n;
        render();
      } else {                                   // まちがい:1秒おやすみ(同じ問題のまま)
        lock = true;
        grid.style.opacity = '0.35';
        msg.textContent = T('ちがう! 1秒おやすみ');
        timers.push(setTimeout(() => {
          if (done) return;
          lock = false;
          grid.style.opacity = '1';
          msg.textContent = '';
        }, LOCK));
      }
    });

    render();
    iv = setInterval(() => {
      const e = performance.now() - t0;
      if (!done) left.textContent = Math.max(0, (DUR - e) / 1000).toFixed(1);
      if (e >= DUR) finish();
    }, 50);
    timers.push(iv);
  });
}

// i 問目の問題。種が同じなら全員同じ問題になる。
// かんたんから始めて、1問ごとに難しくする。色の差は15%から1問ごとに2割ずつ小さくなり、2%で止まる
// マスは 3x3 → 4x4 → 5x5 → 6x6 → 7x7。ここの数字を変えると難しさが変わる
function oddcolorQuestion(seed, i) {
  const r = seededRng(seed * 31 + i * 7919 + 1);
  const size = i < 2 ? 3 : i < 4 ? 4 : i < 7 ? 5 : i < 10 ? 6 : 7;
  const hue = Math.floor(r() * 360);
  const s = 50 + Math.floor(r() * 25);
  const l = 46 + Math.floor(r() * 14);
  const delta = Math.max(2, 15 * Math.pow(0.8, i));   // 明るさの差(%)
  const odd = Math.floor(r() * size * size);
  const sign = r() < 0.5 ? -1 : 1;
  return { size, hue, s, l, delta, odd, sign };
}

/* ---------- 数字タッチ! / よけろ! ---------- */

GAMES.push(
  {
    id: 'numtouch', title: '数字タッチ!',
    desc: '1から16まで、小さい順に全部タッチ!<br>数字の並びは全員同じ。<br>早くクリアするほど上位。<br>17秒以内に終わらなければ、押せた数で順位が決まる。',
    lowerBetter: true, miss: 99,
    isMiss: v => v >= 99,
    fmt: v => v >= 99 ? T('失敗') : v >= 20 ? T('{n}個まで', { n: 36 - Math.round(v) }) : T('{n}秒', { n: v.toFixed(2) }),
    play: playNumTouch
  },
  {
    id: 'dodge', title: 'よけろ!',
    desc: '上から降ってくる物をよけ続けよう!<br>操作は「地面より下」で指を左右に動かす。<br>ジグザグの葉っぱ、巨大岩、途中で速くなる玉、割れる岩、赤く光った所に落ちる柱にも注意!<br>長く生き残るほど上位。15秒耐えればクリア。',
    lowerBetter: false, miss: 0,
    isMiss: v => v <= 0,
    fmt: v => T('{n}秒', { n: v.toFixed(2) }),
    play: playDodge
  }
);

/* --- 数字タッチ! --- */
function playNumTouch(stage, round, submit) {
  // 番号ではなく id で自分を探すので、組み込み時に番号を直さなくてよい
  const game = GAMES.find(g => g.id === 'numtouch');
  const N = 16, LIMIT = 17000;
  // 全員同じ並びにするため、round.delay を種にして並べ替える
  const rnd = seededRng(Math.round((round.delay || 3000) * 1000));
  const nums = Array.from({ length: N }, (_, i) => i + 1);
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }

  countdown(stage, game, round, () => {
    stage.innerHTML =
      `<div class="center sub" style="font-size:18px;margin:4px 0">${T('次は {n} ・ {t} 秒', { n: '<b id="next" style="color:#ffcc33;font-size:30px">1</b>', t: '<b id="time">0.00</b>' })}</div>` +
      `<div id="grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:100%;max-width:440px;margin:10px auto 0;-webkit-tap-highlight-color:transparent"></div>`;
    const grid = stage.querySelector('#grid');
    const nextEl = stage.querySelector('#next');
    const timeEl = stage.querySelector('#time');
    const BG = 'rgba(255,255,255,0.1)';
    nums.forEach(n => {
      const c = document.createElement('div');
      c.dataset.n = n;
      c.textContent = n;
      c.style.cssText = 'aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:bold;color:#f2f4ff;border:2px solid rgba(255,255,255,0.25);border-radius:12px;user-select:none;-webkit-user-select:none;touch-action:manipulation;background:' + BG;
      grid.appendChild(c);
    });

    const t0 = performance.now();
    let next = 1, done = false, iv = null;
    const finish = v => {
      if (done) return;
      done = true;
      clearInterval(iv);
      submit(v);
    };

    grid.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      const c = ev.target.closest('[data-n]');
      if (done || !c) return;
      const n = +c.dataset.n;
      if (n < next) return;                     // 押し終わったマスは無視
      if (n === next) {
        c.style.opacity = '0.18';
        next++;
        if (next > N) {
          nextEl.textContent = '✓';
          const sec = Math.round((performance.now() - t0) / 10) / 100;
          timeEl.textContent = sec.toFixed(2);
          finish(sec);
        } else {
          nextEl.textContent = next;
        }
      } else {                                  // まちがい:赤く光るだけ
        c.style.background = 'rgba(255,90,90,0.55)';
        timers.push(setTimeout(() => { c.style.background = BG; }, 150));
      }
    });

    iv = setInterval(() => {
      const e = performance.now() - t0;
      if (!done) timeEl.textContent = (e / 1000).toFixed(2);
      if (e >= LIMIT && !done) {
        const got = next - 1;                   // 押せた数
        finish(got === 0 ? 99 : 20 + (N - got)); // 20以上=未クリア(多く押せた方が上位)、0個は失敗
      }
    }, 30);
    timers.push(iv);
  });
}

/* --- よけろ! --- */
// 落ちてくる物の種類: rock(岩) plank(板) leaf(葉っぱ・ジグザグ) giant(巨大岩) accel(加速する玉) split(割れる岩) pillar(柱・前ぶれつき)
function playDodge(stage, round, submit) {
  // 番号ではなく id で自分を探すので、組み込み時に番号を直さなくてよい
  const game = GAMES.find(g => g.id === 'dodge');
  const C = dodgeCfg();
  // 全員同じ落ち方にするため、round.delay を種にして落とす物を決める
  const objs = dodgeMake(Math.round((round.delay || 3000) * 1000));

  countdown(stage, game, round, () => {
    stage.innerHTML =
      `<div class="center sub" id="top" style="font-size:18px;margin:4px 0">${T('生き残り {t} 秒', { t: '<b id="t" style="color:#ffcc33;font-size:26px">0.00</b>' })}</div>` +
      `<canvas id="pad" style="display:block;width:100%;height:68vh;margin-top:4px;touch-action:none"></canvas>`;
    const cv = stage.querySelector('#pad');
    const top = stage.querySelector('#top');
    const tEl = stage.querySelector('#t');
    const dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    // 世界(幅1・高さ WH)を画面に収める。どの機種でも同じ広さ。地面より下は指の操作エリア
    const s = Math.min(W, H * 0.62 / C.WH);
    const ox = (W - s) / 2, gy = s * C.WH;
    const X = x => ox + x * s;

    let px = 0.5, tx = 0.5, pid = null, touching = false, done = false, dead = false;
    let sim = 0, iv = null;

    const circle = (b, fill) => {
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.arc(X(b.x), b.y * s, b.r * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(X(b.x) - b.r * s * 0.3, b.y * s - b.r * s * 0.3, b.r * s * 0.25, 0, Math.PI * 2); ctx.fill();
    };

    const draw = e => {
      ctx.clearRect(0, 0, W, H);
      // 世界
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(ox, 0, s, gy);
      // 操作エリア
      ctx.fillStyle = 'rgba(255,204,51,0.07)';
      ctx.fillRect(0, gy, W, H - gy);
      ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      ctx.fillStyle = 'rgba(242,244,255,0.55)';
      ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('▼ ' + T('ここで指を左右に動かす') + ' ▼', W / 2, gy + (H - gy) * 0.72);
      if (touching) {
        ctx.fillStyle = 'rgba(255,204,51,0.55)';
        ctx.beginPath(); ctx.arc(X(tx), gy + (H - gy) * 0.3, 15, 0, Math.PI * 2); ctx.fill();
      }
      // 降ってくる物(世界の外にははみ出さない)
      ctx.save();
      ctx.beginPath(); ctx.rect(ox, 0, s, gy); ctx.clip();
      for (let i = 0; i < objs.length; i++) {
        const o = objs[i], age = e - o.t;
        if (age < 0) break;
        if (o.kind === 'pillar' && age < C.WARN) {            // 柱の前ぶれ: 落ちてくる場所が赤く光る
          const a = 0.12 + 0.12 * Math.abs(Math.sin(age * 12));
          ctx.fillStyle = `rgba(255,92,108,${a})`;
          ctx.fillRect(X(o.x - o.w / 2), 0, o.w * s, gy);
          ctx.fillStyle = '#ff5c6c';
          ctx.beginPath(); ctx.moveTo(X(o.x - 0.04), 6); ctx.lineTo(X(o.x + 0.04), 6); ctx.lineTo(X(o.x), 6 + 0.05 * s); ctx.closePath(); ctx.fill();
        }
        const bs = dodgeBoxes(o, age);
        for (const b of bs) {
          if (b.k === 'plank') { ctx.fillStyle = '#d98a6a'; ctx.fillRect(X(b.x - b.hw), (b.y - b.hh) * s, b.hw * 2 * s, b.hh * 2 * s); }
          else if (b.k === 'pillar') {
            ctx.fillStyle = '#8c7ae6'; ctx.fillRect(X(b.x - b.hw), (b.y - b.hh) * s, b.hw * 2 * s, b.hh * 2 * s);
            ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(X(b.x - b.hw), (b.y - b.hh) * s, b.hw * 0.6 * s, b.hh * 2 * s);
          } else if (b.k === 'leaf') {
            ctx.save(); ctx.translate(X(b.x), b.y * s); ctx.rotate(b.rot || 0);
            ctx.fillStyle = '#4caf6a';
            ctx.beginPath(); ctx.ellipse(0, 0, b.hw * 1.15 * s, b.hh * 1.15 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#2d7a45'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-b.hw * s, 0); ctx.lineTo(b.hw * s, 0); ctx.stroke();
            ctx.restore();
          } else if (b.k === 'giant') circle(b, '#6f7aa8');
          else if (b.k === 'accel') {
            if (b.hot) { ctx.fillStyle = 'rgba(255,92,108,0.35)'; ctx.beginPath(); ctx.arc(X(b.x), b.y * s, b.r * 1.8 * s, 0, Math.PI * 2); ctx.fill(); }
            circle(b, b.hot ? '#ff5c6c' : '#e0a050');
          } else if (b.k === 'split') {
            circle(b, '#b58a6a');
            if (!b.half) { ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(b.x), (b.y - b.r) * s); ctx.lineTo(X(b.x) + 3, b.y * s); ctx.lineTo(X(b.x) - 2, (b.y + b.r) * s); ctx.stroke(); }
          }
          else circle(b, '#9aa6d6');
        }
      }
      ctx.restore();
      // 自分
      const bw = C.PW * 2 * s, bh = C.PH * s;
      ctx.fillStyle = dead ? '#ff6b6b' : '#ffcc33';
      ctx.fillRect(X(px) - bw / 2, gy - bh, bw, bh);
      ctx.fillStyle = '#1a1f3a';
      ctx.fillRect(X(px) - bw * 0.27, gy - bh * 0.72, bw * 0.16, bh * 0.2);
      ctx.fillRect(X(px) + bw * 0.11, gy - bh * 0.72, bw * 0.16, bh * 0.2);
    };

    const end = (t, hit) => {
      if (done) return;
      done = true; dead = hit;
      clearInterval(iv);
      const v = Math.max(0.01, Math.round(t * 100) / 100);
      tEl.textContent = v.toFixed(2);
      top.innerHTML = T(hit ? 'ヒット!' : 'クリア!') + ' ' + T('生き残り {t} 秒', { t: '<b style="color:#ffcc33;font-size:26px">' + v.toFixed(2) + '</b>' });
      draw(t);
      submit(v);
    };

    const pos = ev => {
      const b = cv.getBoundingClientRect();
      return { x: ev.clientX - b.left, y: ev.clientY - b.top };
    };
    const toTx = p => Math.max(0.05, Math.min(0.95, (p.x - ox) / s));
    cv.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (done || pid !== null) return;
      const p = pos(ev);
      if (p.y < gy) return;                     // 地面より上では操作できない
      pid = ev.pointerId; touching = true; tx = toTx(p);
      try { cv.setPointerCapture(pid); } catch (e) {}
    });
    cv.addEventListener('pointermove', ev => {
      if (done || ev.pointerId !== pid) return;
      ev.preventDefault();
      tx = toTx(pos(ev));
    });
    const release = ev => {
      if (ev.pointerId !== pid) return;
      pid = null; touching = false;
    };
    cv.addEventListener('pointerup', release);
    cv.addEventListener('pointercancel', release);

    const t0 = performance.now();
    draw(0);
    iv = setInterval(() => {
      if (done) return;
      const e = (performance.now() - t0) / 1000;
      // 処理が遅れても、すり抜けないように細かく区切って進める
      while (sim < e && !done) {
        const step = Math.min(0.016, e - sim);
        sim += step;
        const d = tx - px, mv = C.VMAX * step;
        px += Math.abs(d) <= mv ? d : Math.sign(d) * mv;
        if (dodgeHit(objs, sim, px)) { end(sim, true); return; }
        if (sim >= C.DUR) { end(C.DUR, false); return; }
      }
      tEl.textContent = sim.toFixed(2);
      draw(sim);
    }, 16);
    timers.push(iv);
  });
}

// 難しさの設定
function dodgeCfg() {
  return {
    WH: 0.95,     // 世界の高さ(幅を1とする)
    PW: 0.045,    // 自分の半分の幅
    PH: 0.09,     // 自分の高さ
    VMAX: 2.6,    // 自分の最高速度(幅/秒)
    DUR: 15,      // クリアまでの秒数
    FULL: 10,     // この秒数で一番むずかしくなる
    WARN: 1.0,    // 柱の前ぶれの秒数
    // 種類ごとの出やすさと、出始める秒(岩・板は最初から)
    KINDS: [
      { k: 'rock', w: 40, from: 0 }, { k: 'plank', w: 14, from: 0 },
      { k: 'leaf', w: 12, from: 2 }, { k: 'accel', w: 10, from: 5 },
      { k: 'split', w: 10, from: 6 }, { k: 'pillar', w: 9, from: 8 }
    ],
    GIANT_FROM: 3, GIANT_EVERY: 4   // 巨大岩は3秒から、だいたい4秒に1個
  };
}

// 落ちてくる物を、出る時間順に最初に全部決めておく(時間が進むほど多く・速く)
function dodgeMake(seed) {
  const C = dodgeCfg(), rnd = seededRng(seed), objs = [];
  let t = 0.7;
  while (t < C.DUR + 0.5) {
    const d = Math.min(1, t / C.FULL);
    const pool = C.KINDS.filter(q => t >= q.from);
    let r = rnd() * pool.reduce((a, q) => a + q.w, 0), kind = pool[0].k;
    for (const q of pool) { r -= q.w; if (r < 0) { kind = q.k; break; } }
    const vy = (0.71 + rnd() * 0.29) * (1 + 0.45 * d) * 1.15;      // 落ちる速さ(v=19でさらに15%速く)
    const vx = (rnd() - 0.5) * 0.39 * d;                             // ななめ(v=19で1.4倍)
    const x = 0.05 + rnd() * 0.9;
    const o = { t, kind, x, vy, vx };
    if (kind === 'plank') { o.w = 0.2 + rnd() * 0.14; o.h = 0.045; }
    else if (kind === 'rock') { o.w = o.h = 0.07 + rnd() * 0.05; }
    else if (kind === 'leaf') { o.w = 0.085; o.h = 0.05; o.vy = vy * 0.62; o.vx = 0; o.amp = 0.08 + rnd() * 0.06; o.fq = 3 + rnd() * 1.5; o.ph = rnd() * 6.3; }
    else if (kind === 'accel') { o.w = o.h = 0.075; o.vy = vy * 0.5; o.vy2 = vy * 2; o.ay = 0.25 + rnd() * 0.15; o.vx = 0; }
    else if (kind === 'split') { o.w = o.h = 0.11; o.vx = 0; o.sy = 0.3 + rnd() * 0.15; o.svx = 0.26 + rnd() * 0.1; o.x = 0.15 + rnd() * 0.7; }
    else if (kind === 'pillar') { o.w = 0.1; o.h = 0.32; o.vy = 2.3; o.vx = 0; o.x = 0.08 + rnd() * 0.84; }
    objs.push(o);
    t += (0.52 - 0.35 * d) * (0.7 + rnd() * 0.6) * 0.8;              // 出る間隔(v=19で量を25%増やす)
  }
  // 巨大岩(ゆっくり、幅の4割)
  for (let g = C.GIANT_FROM + rnd() * 0.8; g < C.DUR - 1; g += C.GIANT_EVERY * (0.85 + rnd() * 0.3)) {
    objs.push({ t: g, kind: 'giant', w: 0.4, h: 0.4, x: 0.2 + rnd() * 0.6, vy: 0.36 + rnd() * 0.08, vx: 0 });
  }
  objs.sort((a, b) => a.t - b.t);
  // どうやってもよけられない場面があったら、その少し前に出た物を1つずつ減らす(全員同じ結果になる)
  for (let tries = 0; tries < 12; tries++) {
    const T = dodgeEscape(objs);
    if (T >= C.DUR) break;
    let k = -1;
    for (let i = 0; i < objs.length; i++) if (objs[i].t < T && objs[i].t > T - 2.5 && objs[i].kind !== 'giant') k = i;
    if (k < 0) for (let i = 0; i < objs.length; i++) if (objs[i].t < T) k = i;
    if (k < 0) break;
    objs.splice(k, 1);
  }
  return objs;
}

// 動ける場所を全部しらべて、何秒までなら生き残れる道があるかを返す(DUR なら、よけきれる)
function dodgeEscape(objs) {
  const C = dodgeCfg(), dt = 0.016, stp = 0.02;
  const xs = [];
  for (let x = 0.05; x <= 0.9501; x += stp) xs.push(x);
  const reach = Math.floor(C.VMAX * dt / stp);
  const pw = C.PW - 0.012, pt = C.WH - C.PH + 0.012;   // dodgeHit と同じ当たり判定
  let R = xs.map(x => Math.abs(x - 0.5) < stp / 2 + 1e-9);
  for (let t = dt; t <= C.DUR + 1e-9; t += dt) {
    // この時刻に、自分の高さにある物の「当たる x のはんい」を先に集める
    const iv = [];
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      if (t - o.t < 0) break;
      const k = (o.kind === 'plank' || o.kind === 'pillar') ? 0.96 : 0.85;
      for (const b of dodgeBoxes(o, t - o.t)) {
        const hw = b.hw * k, hh = b.hh * k;
        if (b.y + hh > pt && b.y - hh < C.WH) iv.push(b.x - hw - pw, b.x + hw + pw);
      }
    }
    const N = xs.map((x, i) => {
      let ok = false;
      for (let k = -reach; k <= reach && !ok; k++) ok = !!R[i + k];
      if (!ok) return false;
      for (let j = 0; j < iv.length; j += 2) if (x > iv[j] && x < iv[j + 1]) return false;
      return true;
    });
    if (!N.some(Boolean)) return t;
    R = N;
  }
  return C.DUR;
}

// その時の、物の当たり判定の箱(世界の座標、中心 x,y と半分の幅 hw,hh)。描くのにも使う
function dodgeBoxes(o, age) {
  const C = dodgeCfg();
  if (age < 0) return [];
  if (o.kind === 'pillar') {
    if (age < C.WARN) return [];
    const y = -o.h + o.vy * (age - C.WARN);
    if (y > C.WH) return [];
    return [{ k: 'pillar', x: o.x, y: y + o.h / 2, hw: o.w / 2, hh: o.h / 2 }];
  }
  if (o.kind === 'accel') {
    const ta = (o.ay + o.h) / o.vy;                                   // 加速する時刻
    const y = age < ta ? -o.h + o.vy * age : o.ay + o.vy2 * (age - ta);
    if (y > C.WH) return [];
    return [{ k: 'accel', x: o.x, y: y + o.h / 2, r: o.w / 2, hw: o.w / 2, hh: o.h / 2, hot: age > ta - 0.35 }];
  }
  if (o.kind === 'split') {
    const y = -o.h + o.vy * age;
    if (y > C.WH) return [];
    const ts = (o.sy + o.h) / o.vy;                                   // 割れる時刻
    if (age < ts) return [{ k: 'split', x: o.x, y: y + o.h / 2, r: o.w / 2, hw: o.w / 2, hh: o.h / 2 }];
    const dx = o.svx * (age - ts), r = o.w * 0.36;
    return [-1, 1].map(sg => ({ k: 'split', half: true, x: o.x + sg * (o.w * 0.25 + dx), y: y + o.h / 2, r, hw: r, hh: r }));
  }
  const y = -o.h + o.vy * age;
  if (y > C.WH) return [];
  if (o.kind === 'leaf') {
    const sw = Math.sin(age * o.fq + o.ph);
    return [{ k: 'leaf', x: Math.max(0.05, Math.min(0.95, o.x + o.amp * sw)), y: y + o.h / 2, hw: o.w / 2, hh: o.h / 2, rot: Math.cos(age * o.fq + o.ph) * 0.5 }];
  }
  const x = o.x + o.vx * age;
  if (o.kind === 'plank') return [{ k: 'plank', x, y: y + o.h / 2, hw: o.w / 2, hh: o.h / 2 }];
  return [{ k: o.kind, x, y: y + o.h / 2, r: o.w / 2, hw: o.w / 2, hh: o.h / 2 }];
}

function dodgeHit(objs, e, px) {
  const C = dodgeCfg();
  const pl = px - C.PW + 0.012, pr = px + C.PW - 0.012, pt = C.WH - C.PH + 0.012;
  for (let i = 0; i < objs.length; i++) {
    const o = objs[i], age = e - o.t;
    if (age < 0) break;                          // 出る順に並んでいるので、以降はまだ出ていない
    const k = (o.kind === 'plank' || o.kind === 'pillar') ? 0.96 : 0.85;   // 当たり判定は見た目より少し小さめ
    for (const b of dodgeBoxes(o, age)) {
      const hw = b.hw * k, hh = b.hh * k;
      if (b.x + hw > pl && b.x - hw < pr && b.y + hh > pt && b.y - hh < C.WH) return true;
    }
  }
  return false;
}
