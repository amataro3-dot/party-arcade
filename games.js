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
    fmt: (v, x) => v >= 99999 ? '時間切れ' : '誤差 ' + (v / 1000).toFixed(3) + '秒' + (x && x.t ? '(お題' + just5Sec(x.t) + ')' : ''),
    play: playJust5
  },
  {
    id: 'ruler', title: '定規キャッチ!',
    desc: '定規が予告なしに落ちてくる!<br>落ちたらすぐ、画面のどこでもタップしてつかもう。<br>3回勝負。つかんだ位置(何cm落ちたか)の平均が短いほど上位。<br>ピクッと揺れるだけのフェイントもあるよ。<br>落ちる前に押すとフライング(その回は40cm)。',
    lowerBetter: true, miss: 99,
    isMiss: v => v >= 99,
    fmt: v => v >= 99 ? '全部失敗' : '平均 ' + v.toFixed(1) + 'cm',
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
      if (v >= 99) return '失格';
      if (!x || typeof x.cm !== 'number') return '誤差 ' + v.toFixed(2) + 'cm';
      const d = Math.round((x.cm - x.t) * 100) / 100;
      return '誤差 ' + (d > 0 ? '+' : '') + d.toFixed(2) + 'cm(' + (d > 0 ? '長い' : d < 0 ? '短い' : 'ぴったり') + ')';
    },
    // 結果に出す棒。金色の目印がお題の長さ、青い棒が描いた線の長さ
    viz: (v, x) => {
      const cm = Number(x.cm), t = Number(x.t), MAX = 12;
      if (!isFinite(cm) || !isFinite(t)) return '';
      const pct = n => Math.min(100, Math.max(0, n / MAX * 100));
      return `<div class="vbar"><div class="vfill" style="width:${pct(cm)}%"></div><div class="vmark" style="left:${pct(t)}%"></div></div><div class="vlabel">描いた線 ${cm.toFixed(2)}cm ・ お題 ${t}cm</div>`;
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
  stage.innerHTML = `<div class="rule">${m > 1 ? `<div class="bonus">${bonusLabel(round.index)} このラウンドはポイント2倍</div>` : ''}<h2>${h(game.title)}</h2><p>${game.desc}</p>${title}<div class="cdnum" id="cd"></div></div>`;
  const cd = stage.querySelector('#cd');
  const iv = setInterval(() => {
    const rem = round.startAt - serverNow();
    if (rem <= 0) { clearInterval(iv); onGo(); }
    else cd.textContent = Math.ceil(rem / 1000);
  }, 50);
  timers.push(iv);
}

/* --- 〇秒ジャスト --- */
const just5Sec = t => (t % 1 ? Number(t).toFixed(1) : String(t)) + '秒';   // 7 → 「7秒」、7.5 → 「7.5秒」
function playJust5(stage, round, submit) {
  const game = GAMES.find(g => g.id === 'just5');
  // 全員共通の round.delay からお題を決める → 5〜9秒、0.5秒刻みの9通り
  const target = 5 + Math.floor(seededRng(Math.round((round.delay || 3000) * 1000))() * 9) * 0.5;
  game.desc = game.descBase + `<div style="margin-top:14px;font-size:22px">お題 <b style="color:#ffcc33">${just5Sec(target)}</b></div>`;
  countdown(stage, game, round, () => {
    stage.innerHTML = `<div class="big-num" id="t">0.00</div><div class="center" style="font-size:20px"><b style="color:#ffcc33">${just5Sec(target)}</b>ぴったりで止めろ!</div><button class="btn big" id="stop">STOP</button>`;
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
    G: 980,         // 重力(cm/秒²)。本物と同じ。0.2秒で約20cm落ちる
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
      `<div class="center sub" id="info" style="font-size:18px;margin:2px 0"><b id="no" style="color:#ffcc33">1</b>/${C.TRIES}回目 ・ 落ちたらタップ!</div>` +
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
      rec.innerHTML = res.map((v, i) => kinds[i] === 'o' ? `${i + 1}回目 <b style="color:#f2f4ff">${v.toFixed(1)}cm</b>` : `${i + 1}回目 <b style="color:#ff5c6c">${kinds[i] === 'f' ? 'フライング' : '落ちた'}</b>`).join(' ・ ');
    };

    const finish = () => {
      if (done) return;
      done = true;
      const ok = kinds.filter(s => s === 'o').length;
      const avg = Math.round(res.reduce((a, b) => a + b, 0) / res.length * 10) / 10;
      stage.querySelector('#info').innerHTML = ok ? `平均 <b style="color:#ffcc33;font-size:24px">${avg.toFixed(1)}cm</b>` : '<b style="color:#ff5c6c">全部失敗…</b>';
      submit(ok ? avg : 99, { c: res.slice(), s: kinds.join('') });
    };

    const endTry = (cm, kind) => {
      res.push(Math.round(cm * 10) / 10); kinds.push(kind);
      st = 'next'; tStart = now();
      msg = kind === 'o' ? cm.toFixed(1) + 'cm!' : kind === 'f' ? 'フライング!' : '落ちた!';
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
    `<div style="margin-top:14px;font-size:22px">お題 <b style="color:#ffcc33">${target}cm</b></div>` +
    `<div style="margin-top:10px">見本:これが1cm</div>` +
    `<div style="width:1cm;height:8px;background:#ffcc33;border-radius:4px;margin:8px auto"></div>`;

  countdown(stage, game, round, () => {
    stage.innerHTML =
      `<div class="center" style="font-size:22px;margin:6px 0"><b style="color:#ffcc33">${target}cm</b> を描け!</div>` +
      `<div class="center sub">残り <b id="left">10.0</b> 秒 ・ 描き直しOK</div>` +
      `<canvas id="pad" style="display:block;width:100%;height:48vh;margin-top:8px;background:rgba(255,255,255,0.05);border-radius:12px;touch-action:none"></canvas>` +
      `<button class="btn" id="ok" disabled>決定</button>`;

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
    fmt: v => v >= 99 ? '失敗' : 'ズレ ' + v.toFixed(2) + '%',
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
    fmt: v => v >= 999 ? '失敗' : '誤差 ' + v.toFixed(1) + '°',
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
    `<div style="margin-top:14px;font-size:22px">お題 <b style="color:#ffcc33">${N}等分</b></div>`;

  countdown(stage, game, round, () => {
    stage.innerHTML =
      `<div class="center" style="font-size:22px;margin:6px 0"><b style="color:#ffcc33">${N}等分</b>に切って!</div>` +
      `<div class="center sub" id="info">あと <b id="rest">${N}</b> 本 ・ 残り <b id="left">15.0</b> 秒</div>` +
      `<canvas id="pad" style="display:block;width:100%;height:50vh;margin-top:8px;touch-action:none"></canvas>` +
      `<div class="center"><button class="btn" id="undo" style="margin-top:8px;min-width:150px">↶ 1つ戻る</button></div>`;

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
      info.innerHTML = `平均のズレ <b style="color:#ffcc33">${dev.toFixed(2)}%</b>`;
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
    `<div style="margin-top:14px;font-size:22px">お題 <b style="color:#ffcc33">${target}度</b></div>`;

  countdown(stage, game, round, () => {
    stage.innerHTML =
      `<div class="center" style="font-size:22px;margin:6px 0"><b style="color:#ffcc33">${target}度</b> を作って!</div>` +
      `<div class="center sub" id="info">灰色の線から ${target}度 ・ 残り <b id="left">15.0</b> 秒</div>` +
      `<canvas id="pad" style="display:block;width:100%;height:50vh;margin-top:8px;touch-action:none"></canvas>` +
      `<div class="center" style="display:flex;gap:10px;justify-content:center;margin-top:8px">` +
      `<button class="btn" id="redo" style="min-width:130px">やり直す</button>` +
      `<button class="btn" id="ok" style="min-width:130px">決定!</button></div>`;

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
      info.innerHTML = `あなたの角度 <b style="color:#ffcc33">${ang.toFixed(1)}°</b> ・ 誤差 <b style="color:#ffcc33">${err.toFixed(1)}°</b>`;
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
    desc: '審判のお題どおりに旗を上げ下げしよう!<br>下の「赤」「白」ボタンを押している間=上げる、離す=下げる。<br>「〜ない」のひっかけは、一瞬でも動かしたらアウト。お題に出ていない旗も動かさない。<br>だんだん速くなる! 全部で20点+連続正解ボーナス(4連続+1 … 20連続+5)。',
    lowerBetter: false, miss: 0,
    isMiss: v => v <= 0,
    fmt: v => v + '点',
    play: playHata,
    // リザルト用:20個の○×
    result: drawHataResult
  },
  {
    id: 'oddcolor', title: '色ちがい探し!',
    desc: 'ほんの少しだけ色がちがうマスを1つ探してタッチ!<br>15秒で何問正解できるか勝負。<br>まちがえると1秒おやすみ。<br>正解数が多いほど上位。0問は0点。',
    lowerBetter: false, miss: 0,
    isMiss: v => v <= 0,
    fmt: v => v + '問',
    play: playOddColor
  }
);

/* --- 旗揚げゲーム!! --- */
// 速さなどの数字。だんだん速くなる(はじめ → おわり)
const hataCfg = {
  parts: 20,                       // お題の部分の数(=最高20点)
  doubleMin: 5, doubleMax: 7,      // 2点のお題(赤と白)の数
  negChance: 0.3,                  // 「〜ない」のひっかけが出る確率
  trapChance: 0.85,               // 「〜ない」が、動かしたくなる向きになる確率
  changeChance: 0.8,               // 「上げて/下げて」で、旗を動かす必要があるお題になる確率(残りは、もうその状態)
  charStart: 80, charEnd: 40,      // 1文字が出る間隔(ms)
  graceStart: 700, graceEnd: 420,  // 最後の文字が出てから判定までの猶予(ms)
  lead: 600,                       // 始まってから1文字目が出るまで(ms)
  maxTotal: 17200                  // 全体がこれより長くなったら、全部を少し速くする(ms)
};
const HATA_BONUS = { 4: 1, 8: 2, 12: 3, 16: 4, 20: 5 };   // 連続正解のボーナス

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
      parts.push({ f, up, neg, text, q, line: s });
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

function playHata(stage, round, submit) {
  const game = GAMES.find(g => g.id === 'hata');
  const { parts, total } = hataMake(Math.round((round.delay || 3000) * 1000));

  countdown(stage, game, round, () => {
    const btn = (f, label) => `<div data-f="${f}" style="flex:1;height:17vh;min-height:84px;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:bold;border-radius:18px;user-select:none;-webkit-user-select:none;touch-action:none;` +
      (f === 'r' ? 'background:#c8323f;color:#fff;border:3px solid #ff5c6c' : 'background:#e9ecf6;color:#1a1f3a;border:3px solid #ffffff') + `">${label}</div>`;
    stage.innerHTML =
      `<div class="center sub" style="font-size:16px;margin:2px 0">得点 <b id="pt" style="color:#ffcc33;font-size:22px">0</b> ・ 連続 <b id="run">0</b></div>` +
      `<div id="qbox" style="position:relative;height:96px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);border-radius:14px">` +
      `<div id="l0" style="font-size:34px;font-weight:bold;line-height:1.25;min-height:42px;letter-spacing:1px"></div>` +
      `<div id="l1" style="font-size:34px;font-weight:bold;line-height:1.25;min-height:0;letter-spacing:1px"></div>` +
      `<div id="mark" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:90px;font-weight:bold;pointer-events:none;opacity:0"></div>` +
      `<div id="combo" style="position:absolute;right:8px;top:4px;font-size:16px;font-weight:bold;color:#ffcc33;opacity:0"></div></div>` +
      `<canvas id="pad" style="display:block;width:100%;height:30vh;touch-action:none"></canvas>` +
      `<div id="btns" style="display:flex;gap:28px;width:100%;-webkit-tap-highlight-color:transparent">${btn('r', '赤')}${btn('w', '白')}</div>`;
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

    const colorText = s => s.replace(/^(赤|白)/, m => `<span style="color:${m === '赤' ? '#ff5c6c' : '#ffffff'};${m === '白' ? 'text-shadow:0 0 6px rgba(255,255,255,0.6)' : ''}">${m}</span>`);

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
      lines[p.line].innerHTML = colorText(p.text.slice(0, n));
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
        if (ok && HATA_BONUS[run]) { combo.textContent = run + '連続! +' + HATA_BONUS[run]; comboT = e / 1000; }
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

// リザルト用:20個の○×を並べる
function drawHataResult(el, data, size) {
  const { ctx, w, h: H } = wideCanvas(el, size, 3, 0.68);
  if (!data || typeof data.m !== 'string') return;
  const h = H * 0.74;
  const m = data.m, n = m.length || 20, per = 10;
  const cw = w / per, ch = h / 2;
  ctx.fillStyle = '#9aa3c7'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${Math.max(11, Math.round(Math.min(H * 0.13, w / 23)))}px sans-serif`;
  ctx.fillText('正解 ' + (data.p != null ? data.p : '?') + '/20 ・ 最大 ' + (data.c != null ? data.c : '?') + '連続 ・ ボーナス +' + (data.b || 0), w / 2, H * 0.88);
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
      `<div class="center sub" style="font-size:18px;margin:4px 0">正解 <b id="ok" style="color:#ffcc33;font-size:26px">0</b> 問 ・ 残り <b id="left">15.0</b> 秒</div>` +
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
      msg.textContent = '終了! ' + n + '問';
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
        msg.textContent = 'ちがう! 1秒おやすみ';
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
    fmt: v => v >= 99 ? '失敗' : v >= 20 ? (36 - Math.round(v)) + '個まで' : v.toFixed(2) + '秒',
    play: playNumTouch
  },
  {
    id: 'dodge', title: 'よけろ!',
    desc: '上から降ってくる岩や板をよけ続けよう!<br>操作は「地面より下」で指を左右に動かす。<br>長く生き残るほど上位。15秒耐えればクリア。',
    lowerBetter: false, miss: 0,
    isMiss: v => v <= 0,
    fmt: v => v.toFixed(2) + '秒',
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
      `<div class="center sub" style="font-size:18px;margin:4px 0">次は <b id="next" style="color:#ffcc33;font-size:30px">1</b> ・ <b id="time">0.00</b> 秒</div>` +
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
function playDodge(stage, round, submit) {
  // 番号ではなく id で自分を探すので、組み込み時に番号を直さなくてよい
  const game = GAMES.find(g => g.id === 'dodge');
  const C = dodgeCfg();
  // 全員同じ落ち方にするため、round.delay を種にして落とす物を決める
  const objs = dodgeMake(Math.round((round.delay || 3000) * 1000));

  countdown(stage, game, round, () => {
    stage.innerHTML =
      `<div class="center sub" id="top" style="font-size:18px;margin:4px 0">生き残り <b id="t" style="color:#ffcc33;font-size:26px">0.00</b> 秒</div>` +
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
      ctx.fillText('▼ ここで指を左右に動かす ▼', W / 2, gy + (H - gy) * 0.72);
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
        const y = -o.h + o.vy * age;
        if (y > C.WH) continue;
        const cx = o.x + o.vx * age;
        if (o.plank) {
          ctx.fillStyle = '#d98a6a';
          ctx.fillRect(X(cx - o.w / 2), (y) * s, o.w * s, o.h * s);
        } else {
          ctx.fillStyle = '#9aa6d6';
          ctx.beginPath(); ctx.arc(X(cx), (y + o.h / 2) * s, o.w / 2 * s, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.beginPath(); ctx.arc(X(cx) - o.w * s * 0.14, (y + o.h / 2) * s - o.w * s * 0.14, o.w * s * 0.12, 0, Math.PI * 2); ctx.fill();
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
      top.innerHTML = (hit ? 'ヒット! ' : 'クリア! ') + '生き残り <b style="color:#ffcc33;font-size:26px">' + v.toFixed(2) + '</b> 秒';
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

// 難しさの設定(ここを変えると難しさが変わる)
function dodgeCfg() {
  return {
    WH: 0.95,     // 世界の高さ(幅を1とする)
    PW: 0.045,    // 自分の半分の幅
    PH: 0.09,     // 自分の高さ
    VMAX: 2.6,    // 自分の最高速度(幅/秒)
    DUR: 15       // クリアまでの秒数
  };
}

// 落ちてくる物を、出る時間順に最初に全部決めておく(時間が進むほど多く・速く)
function dodgeMake(seed) {
  const C = dodgeCfg(), rnd = seededRng(seed), objs = [];
  let t = 0.7;
  while (t < C.DUR + 0.5) {
    const d = Math.min(1, t / 12);
    const plank = rnd() < 0.22;
    const w = plank ? 0.2 + rnd() * 0.14 : 0.07 + rnd() * 0.05;
    objs.push({
      t, plank, w, h: plank ? 0.045 : w,
      x: 0.05 + rnd() * 0.9,
      vy: (0.71 + rnd() * 0.29) * (1 + 0.45 * d),   // 落ちる速さ(前より約15%速い)
      vx: (rnd() - 0.5) * 0.28 * d
    });
    t += (0.52 - 0.35 * d) * (0.7 + rnd() * 0.6);  // 出る間隔(前より約20%短い=量が増える)
  }
  return objs;
}

// 時間 e に、位置 px の自分が何かに当たっているか
function dodgeHit(objs, e, px) {
  const C = dodgeCfg();
  const pl = px - C.PW + 0.012, pr = px + C.PW - 0.012, pt = C.WH - C.PH + 0.012;
  for (let i = 0; i < objs.length; i++) {
    const o = objs[i], age = e - o.t;
    if (age < 0) break;                          // 出る順に並んでいるので、以降はまだ出ていない
    const y = -o.h + o.vy * age;
    if (y > C.WH) continue;
    const k = o.plank ? 0.96 : 0.85;             // 当たり判定は見た目より少し小さめ
    const hw = o.w / 2 * k, hh = o.h / 2 * k;
    const cx = o.x + o.vx * age, cy = y + o.h / 2;
    if (cx + hw > pl && cx - hw < pr && cy + hh > pt && cy - hh < C.WH) return true;
  }
  return false;
}
