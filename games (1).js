/* ミニゲーム本体(games.js)。ゲームの一覧 GAMES と、全ゲーム共通の道具(seededRng / countdown)もここにある。
   このファイルはこれで完成(もうゲームは足さない)。新しいゲームは games2.js 以降に書く。 */

const GAMES = [];

GAMES.push(
  {
    id: 'just5', title: '5秒ジャスト',
    desc: 'スタートしたら数字が見えなくなる。<br>心の中で数えて、5秒ぴったりでSTOP!<br>誤差が小さいほど上位。',
    lowerBetter: true, miss: 99999,
    isMiss: v => v >= 99999,
    fmt: v => v >= 99999 ? '時間切れ' : '誤差 ' + (v / 1000).toFixed(3) + '秒',
    play: playJust5
  },
  {
    id: 'react', title: '反射神経',
    desc: '赤い間は待つ。<br>緑になったらすぐタップ!<br>早すぎるとフライング。',
    lowerBetter: true, miss: 3000,
    isMiss: v => v >= 3000,
    fmt: v => v >= 9999 ? 'フライング' : v >= 3000 ? '時間切れ' : v + 'ms',
    play: playReact
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
  stage.innerHTML = `<div class="rule">${m > 1 ? `<div class="bonus">${bonusLabel(round.index)} このラウンドはポイント2倍</div>` : ''}<h2>${h(game.title)}</h2><p>${game.desc}</p><div class="cdnum" id="cd"></div></div>`;
  const cd = stage.querySelector('#cd');
  const iv = setInterval(() => {
    const rem = round.startAt - serverNow();
    if (rem <= 0) { clearInterval(iv); onGo(); }
    else cd.textContent = Math.ceil(rem / 1000);
  }, 50);
  timers.push(iv);
}

/* --- 5秒ジャスト --- */
function playJust5(stage, round, submit) {
  const game = GAMES.find(g => g.id === 'just5');
  countdown(stage, game, round, () => {
    stage.innerHTML = `<div class="big-num" id="t">0.00</div><div class="center sub">5.00秒ぴったりで止めろ!</div><button class="btn big" id="stop">STOP</button>`;
    const el = stage.querySelector('#t');
    const t0 = performance.now();
    let done = false;
    const iv = setInterval(() => {
      const e = performance.now() - t0;
      el.textContent = e < 2000 ? (e / 1000).toFixed(2) : '?.??';
      if (e > 12000 && !done) { done = true; submit(game.miss); }
    }, 30);
    timers.push(iv);
    stage.querySelector('#stop').addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (done) return;
      done = true; clearInterval(iv);
      submit(Math.round(Math.abs(performance.now() - t0 - 5000)));
    });
  });
}

/* --- 反射神経 --- */
function playReact(stage, round, submit) {
  const game = GAMES.find(g => g.id === 'react');
  countdown(stage, game, round, () => {
    stage.innerHTML = `<div class="reactzone wait" id="rz"><div>待て…<small>緑になったらタップ!</small></div></div>`;
    const z = stage.querySelector('#rz');
    let state = 'wait', t0 = 0;
    const goTimer = setTimeout(() => {
      state = 'go'; z.className = 'reactzone go'; z.innerHTML = '<div>今!</div>';
      t0 = performance.now();
      timers.push(setTimeout(() => { if (state === 'go') { state = 'done'; submit(3000); } }, 3000));
    }, round.delay);
    timers.push(goTimer);
    z.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (state === 'wait') { state = 'done'; clearTimeout(goTimer); submit(9999); }
      else if (state === 'go') { state = 'done'; submit(Math.min(2999, Math.round(performance.now() - t0))); }
    });
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

/* ---------- 後出しジャンケン! / 色ちがい探し! ---------- */

GAMES.push(
  {
    id: 'janken', title: '後出しジャンケン!',
    desc: '相手の手を見て、「勝って!」なら勝つ手、「負けて!」なら負ける手をすばやく出そう!<br>15秒で何問正解できるか勝負。<br>まちがえると0.8秒おやすみ。<br>正解数が多いほど上位。0問は0点。',
    lowerBetter: false, miss: 0,
    isMiss: v => v <= 0,
    fmt: v => v + '問',
    play: playJanken
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

/* --- 後出しジャンケン! --- */
function playJanken(stage, round, submit) {
  // 番号ではなく id で自分を探すので、組み込み時に番号を直さなくてよい
  const game = GAMES.find(g => g.id === 'janken');
  const NAME = ['グー', 'チョキ', 'パー'], EMO = ['✊', '✌️', '✋'];
  const DUR = 15000, LOCK = 800;
  // 全員同じ問題:相手の手と「勝って/負けて」。正解の手が2問続けて同じにならないようにする
  const rnd = seededRng(Math.round((round.delay || 3000) * 1000));
  const qs = [];
  let prev = -1;
  while (qs.length < 300) {
    const hand = Math.floor(rnd() * 3), win = rnd() < 0.5;
    const ans = win ? (hand + 2) % 3 : (hand + 1) % 3;   // 0=グー 1=チョキ 2=パー
    if (ans === prev) continue;
    prev = ans;
    qs.push({ hand, win, ans });
  }

  countdown(stage, game, round, () => {
    const btn = i => `<div data-h="${i}" style="flex:1;height:22vh;min-height:92px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:52px;line-height:1.1;border:2px solid rgba(255,255,255,0.25);border-radius:16px;background:rgba(255,255,255,0.1);user-select:none;-webkit-user-select:none;touch-action:manipulation">${EMO[i]}<span style="font-size:15px;margin-top:4px">${NAME[i]}</span></div>`;
    stage.innerHTML =
      `<div class="center sub" style="font-size:18px;margin:4px 0">正解 <b id="ok" style="color:#ffcc33;font-size:26px">0</b> 問 ・ 残り <b id="left">15.0</b> 秒</div>` +
      `<div class="center" style="margin-top:4px"><div class="sub">相手</div>` +
      `<div id="hand" style="font-size:110px;line-height:1.15"></div>` +
      `<div id="mode" style="display:inline-block;padding:6px 26px;border-radius:999px;font-size:30px;font-weight:bold"></div>` +
      `<div class="sub" id="msg" style="min-height:24px;margin-top:6px;color:#ff8a8a"></div></div>` +
      `<div id="btns" style="display:flex;gap:10px;margin:8px auto 0;width:100%;max-width:460px;-webkit-tap-highlight-color:transparent">${btn(0)}${btn(1)}${btn(2)}</div>`;
    const okEl = stage.querySelector('#ok');
    const left = stage.querySelector('#left');
    const handEl = stage.querySelector('#hand');
    const modeEl = stage.querySelector('#mode');
    const msg = stage.querySelector('#msg');
    const btns = stage.querySelector('#btns');

    const t0 = performance.now();
    let n = 0, lock = false, done = false, iv = null;

    const show = () => {
      const q = qs[n];
      handEl.textContent = EMO[q.hand];
      modeEl.textContent = q.win ? '勝って!' : '負けて!';
      modeEl.style.background = q.win ? '#ffcc33' : '#5b8cff';
      modeEl.style.color = q.win ? '#1a1f3a' : '#ffffff';
    };
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(iv);
      btns.style.opacity = '0.35';
      msg.style.color = '#ffcc33';
      msg.textContent = '終了! ' + n + '問';
      submit(n);
    };

    btns.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      const c = ev.target.closest('[data-h]');
      if (done || lock || !c) return;
      if (+c.dataset.h === qs[n].ans) {          // 正解:すぐ次の問題
        n++;
        okEl.textContent = n;
        show();
      } else {                                   // まちがい:0.8秒おやすみ(同じ問題のまま)
        lock = true;
        btns.style.opacity = '0.35';
        msg.textContent = 'ちがう!';
        timers.push(setTimeout(() => {
          if (done) return;
          lock = false;
          btns.style.opacity = '1';
          msg.textContent = '';
        }, LOCK));
      }
    });

    show();
    iv = setInterval(() => {
      const e = performance.now() - t0;
      if (!done) left.textContent = Math.max(0, (DUR - e) / 1000).toFixed(1);
      if (e >= DUR) finish();
    }, 50);
    timers.push(iv);
  });
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
// 色の差は3.2%から始まり、1.6%まで小さくなる。ここの数字を変えると難しさが変わる
function oddcolorQuestion(seed, i) {
  const r = seededRng(seed * 31 + i * 7919 + 1);
  const size = i < 3 ? 5 : i < 7 ? 6 : 7;        // 5x5 → 6x6 → 7x7
  const hue = Math.floor(r() * 360);
  const s = 50 + Math.floor(r() * 25);
  const l = 46 + Math.floor(r() * 14);
  const delta = Math.max(1.6, 3.2 - i * 0.12);   // 明るさの差(%)
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
