/* ミニゲーム本体(games2.js): 12 マディーズバーガーを作ろう! / 13 ジャックを注げ! / 14 俺のハンバーグを焼け!
   games.js の後、core.js の前に読み込むこと。 */

GAMES.push(
  {
    id: 'burger', title: 'マディーズバーガーを作ろう!',
    desc: '上から落ちてくる具材を、お皿で受け止めて積み上げよう!<br>操作は「地面より下」で指を左右に動かす。<br>真ん中に乗せるほど高得点。ずれすぎると落ちる。<br>塔が傾きすぎると崩れる! 上のバンズまで乗せたら完成!',
    lowerBetter: false, miss: 0,
    isMiss: v => v < 1,
    fmt: (v, x) => {
      if (v < 1) return '0点';
      const n = x && typeof x.n === 'number' ? x.n : null;
      return Math.floor(v) + '点' + (n !== null ? '(' + n + '個' + (x.c ? '・完成!' : '') + ')' : '');
    },
    play: playBurger,
    // リザルト用:その人のバーガーを、ずれた形のまま描く
    result: drawBurgerResult
  },
  {
    id: 'jack', title: 'ジャックを注げ!',
    descBase: 'ボトルを押している間、グラスにジャックが注がれる。<br>指を離すと止まる。注ぎ足しはOK、減らせない。<br>量の数字は出ない。液面を見て「決定」!<br>お題の量に近いほど上位。あふれたら失敗。',
    desc: 'ボトルを押している間、グラスにジャックが注がれる。<br>指を離すと止まる。注ぎ足しはOK、減らせない。<br>量の数字は出ない。液面を見て「決定」!<br>お題の量に近いほど上位。あふれたら失敗。',
    lowerBetter: true, miss: 999,
    isMiss: v => v >= 999,
    fmt: (v, x) => {
      if (v >= 999) return x && x.o ? 'あふれた!' : '注いでない';
      if (!x || typeof x.ml !== 'number') return '誤差 ' + Math.round(v) + 'ml';
      return '誤差 ' + Math.round(v) + 'ml(' + Math.round(x.ml) + 'ml / お題' + x.t + 'ml)';
    },
    play: playJack,
    // リザルト用:グラスに、お題の線と注いだ量を描く
    result: drawJackResult
  },
  {
    id: 'hamburg', title: '俺のハンバーグを焼け!',
    descBase: 'ハンバーグ3個が自動で焼けていく。<br>1回タップでひっくり返す、2回目のタップでお皿へ。<br>焼けている面(下の面)の色は、ふちに見える。<br>両面ともお題の焼き色に近いほど上位。焦げたらダメ!',
    desc: 'ハンバーグ3個が自動で焼けていく。<br>1回タップでひっくり返す、2回目のタップでお皿へ。<br>焼けている面(下の面)の色は、ふちに見える。<br>両面ともお題の焼き色に近いほど上位。焦げたらダメ!',
    lowerBetter: true, miss: 999,
    isMiss: v => v >= 999,
    fmt: (v, x) => v >= 999 ? '全部焦げた…' : '平均誤差 ' + v.toFixed(1) + (x && x.t != null ? '(' + hamName(x.t) + ')' : ''),
    play: playHamburg,
    // リザルト用:3個の両面の色と、お題の色見本を並べる
    result: drawHamburgResult
  }
);

/* 角の丸い四角(古いブラウザでも動くように自前で書く) */
function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ============================================================
   ミニゲーム12: マディーズバーガーを作ろう!
   ============================================================ */

// 具材。w=幅 h=厚み(世界の幅を1とする) k=許されるずれの倍率 f=落ちる時間の倍率 m=重さ
const BURGER_KIND = {
  b: { name: '下のバンズ', w: 0.26, h: 0.068, k: 1, f: 1, m: 1 },
  l: { name: 'レタス', w: 0.3, h: 0.038, k: 1, f: 1.2, m: 0.6, sway: true },
  p: { name: 'パティ', w: 0.25, h: 0.068, k: 1, f: 0.85, m: 1.6 },
  t: { name: 'トマト', w: 0.24, h: 0.038, k: 0.7, f: 1, m: 0.8 },
  o: { name: '玉ねぎ', w: 0.18, h: 0.03, k: 0.8, f: 1, m: 0.6 },
  c: { name: 'チーズ', w: 0.26, h: 0.022, k: 1.4, f: 1, m: 0.7, sticky: true },
  u: { name: '上のバンズ', w: 0.26, h: 0.1, k: 1, f: 1, m: 1 }
};

// 難しさの設定(ここを変えると難しさが変わる)
function burgerCfg() {
  return {
    WH: 1.2,          // 世界の高さ(幅を1とする)
    PLATE_W: 0.4,     // お皿の幅
    PLATE_H: 0.03,    // お皿の厚み
    VMAX: 1.5,        // お皿の最高速度(幅/秒)
    ACC: 9,           // お皿の加速の強さ(小さいほどもっさり)
    FOLLOW: 6,        // 指を追いかける強さ
    PERFECT: 0.018,   // これ以内のずれは Perfect
    GOOD: 0.045,      // これ以内は Good
    EDGE: 0.085,      // これ以内はギリギリ。これより大きいと落ちる
    TOPPLE: 0.85,     // 重心がすぐ下の具材の幅の半分×これを超えると崩れる
    WOB_K: 60, WOB_D: 6, WOB_G: 0.1, // 揺れ(ばねの強さ・おさまりやすさ・お皿の加速の効き)
    GAP: 0.2,         // 次の具材が出るまでの間(秒)
    T0: 2, T1: 1      // 1個目と9個目の落ちる時間(秒)
  };
}

// 具材の順番と落ちる位置。種が同じなら全員同じ
function burgerMake(seed) {
  const C = burgerCfg(), rnd = seededRng(seed);
  const mid = ['l', 'p', 'p', 't', 'o', 'c', 'c'];
  for (let i = mid.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [mid[i], mid[j]] = [mid[j], mid[i]];
  }
  return ['b', ...mid, 'u'].map((k, i) => ({
    k, x: 0.18 + rnd() * 0.64, ph: rnd() * Math.PI * 2,
    T: C.T0 + (C.T1 - C.T0) * i / 8
  }));
}

// レタスはひらひら揺れる。age 秒後の横位置
function burgerItemX(it, age) {
  const w = BURGER_KIND[it.k].w;
  const x = it.x + (BURGER_KIND[it.k].sway ? 0.07 * Math.sin(age * 4.5 + it.ph) : 0);
  return Math.max(w / 2, Math.min(1 - w / 2, x));
}

function playBurger(stage, round, submit) {
  const game = GAMES.find(g => g.id === 'burger');
  const C = burgerCfg(), K = BURGER_KIND;
  const items = burgerMake(Math.round((round.delay || 3000) * 1000));

  countdown(stage, game, round, () => {
    stage.innerHTML =
      `<div class="center sub" style="font-size:15px;margin:2px 0"><span id="dots" style="letter-spacing:2px;font-size:16px"></span> ・ つぎ <b id="nx" style="color:#ffcc33"></b></div>` +
      `<canvas id="pad" style="display:block;width:100%;height:68vh;margin-top:4px;touch-action:none"></canvas>`;
    const cv = stage.querySelector('#pad');
    const dotsEl = stage.querySelector('#dots'), nxEl = stage.querySelector('#nx');
    const dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    // 世界(幅1・高さ WH)を画面に収める。地面より下は指の操作エリア
    const s = Math.min(W, H * 0.78 / C.WH);
    const ox = (W - s) / 2, gy = s * C.WH;
    const X = x => ox + x * s, Y = y => y * s;
    const BASE = C.WH - C.PLATE_H;            // お皿の上の面(世界のy)

    let px = 0.5, pv = 0, tx = 0.5, pid = null, touching = false;
    let wob = 0, wobV = 0;                    // 塔の揺れ
    const stack = [];                         // 積んだ具材 { k, dx(お皿の中心から) }
    const debris = [];                        // 落ちていく具材(見た目だけ)
    const pops = [];                          // 「Perfect!」などの文字
    const marks = [];                         // 各具材の結果 P/G/E/X
    const offs = [];                          // 乗った具材のずれ(同点対策用)
    let bonus = 0, cur = null, next = 0, wait = 0.3, sim = 0, done = false, iv = null;

    const stackH = n => { let t = 0; for (let i = 0; i < n; i++) t += K[stack[i].k].h; return t; };
    const hfOf = i => (stackH(i) + K[stack[i].k].h / 2) / 0.45;     // 高いほど揺れが大きい
    const layerX = i => px + stack[i].dx + wob * hfOf(i);
    const pop = (text, x, y, color, big) => pops.push({ text, x, y, color, big, t: sim });

    const updateHead = () => {
      dotsEl.innerHTML = items.map((it, i) => {
        const m = marks[i];
        const c = m === 'P' ? '#ffcc33' : m === 'G' || m === 'E' ? '#35d07f' : m === 'X' ? '#ff5c6c' : (cur && cur.idx === i) ? '#f2f4ff' : 'rgba(242,244,255,0.25)';
        return `<span style="color:${c}">●</span>`;
      }).join('');
      const ni = next + (cur ? 1 : 0);
      nxEl.textContent = ni < items.length ? K[items[ni].k].name : '—';
    };

    const spawn = () => {
      const it = items[next];
      cur = Object.assign({}, it, { idx: next, t0: sim, vy: BASE / (it.T * K[it.k].f) });
      updateHead();
    };

    // 崩れる: 段 k から上を全部落とす
    const collapse = (k, lean) => {
      const dir = lean >= 0 ? 1 : -1;
      for (let j = k; j < stack.length; j++) {
        debris.push({ k: stack[j].k, x: layerX(j), y: BASE - stackH(j), vx: dir * (0.25 + 0.08 * (j - k)), vy: -0.25, r: 0, vr: dir * (2 + j - k) });
      }
      pop('崩れた!', layerX(k), BASE - stackH(k) - 0.05, '#ff5c6c', true);
      stack.length = k;
      wob *= 0.3; wobV *= 0.3;
    };

    // 下の段から順に、その段より上の重心が、すぐ下の具材(お皿)からはみ出していないか調べる
    const checkTopple = () => {
      const xs = stack.map((_, i) => layerX(i));
      for (let k = 0; k < stack.length; k++) {
        let sm = 0, sx = 0;
        for (let j = k; j < stack.length; j++) { const m = K[stack[j].k].m; sm += m; sx += m * xs[j]; }
        const sup = k ? xs[k - 1] : px;
        const hw = (k ? K[stack[k - 1].k].w : C.PLATE_W) / 2;
        const lim = hw * C.TOPPLE * (K[stack[k].k].sticky ? 1.3 : 1);   // チーズはくっつく
        const lean = sx / sm - sup;
        if (Math.abs(lean) > lim) { collapse(k, lean); return; }
      }
    };

    const land = (x, top) => {
      const n = stack.length, k = cur.k;
      const below = n ? layerX(n - 1) : px;
      const d = x - below, ad = Math.abs(d);
      const kk = K[k].k * (n ? 1 : 1.5);          // お皿の上は少しやさしい
      if (ad > C.EDGE * kk) {                       // ずれすぎ → 落ちる
        const dir = d >= 0 ? 1 : -1;
        debris.push({ k, x, y: top, vx: dir * 0.45, vy: cur.vy * 0.4, r: 0, vr: dir * 5 });
        marks[cur.idx] = 'X';
        pop('ポロッ', x, top - 0.04, '#ff5c6c');
      } else {
        stack.push({ k, dx: 0 });
        stack[n].dx = x - px - wob * hfOf(n);       // 見た目の位置のまま乗せる
        offs.push(ad / kk);
        if (ad <= C.PERFECT * kk) { bonus += 30; marks[cur.idx] = 'P'; pop('Perfect!', x, top - 0.05, '#ffcc33', true); }
        else if (ad <= C.GOOD * kk) { bonus += 15; marks[cur.idx] = 'G'; pop('Good', x, top - 0.05, '#35d07f'); }
        else { marks[cur.idx] = 'E'; pop('ギリギリ', x, top - 0.05, '#f2f4ff'); }
        wobV += d * 3;                              // 着地の勢いで少し揺れる
        checkTopple();
      }
      cur = null; next++; wait = C.GAP;
      updateHead();
    };

    const finish = () => {
      if (done) return;
      done = true; cur = null;
      const n = stack.length;
      const complete = n > 0 && stack[n - 1].k === 'u';
      const score = n * 50 + bonus + (complete ? 100 : 0);
      const avg = offs.length ? offs.reduce((a, b) => a + b, 0) / offs.length : C.EDGE;
      const frac = Math.round(0.9 * Math.max(0, 1 - avg / C.EDGE) * 100) / 100;   // ずれが小さいほど大きい小数
      const v = score > 0 ? score + frac : 0;
      const data = { n, c: complete ? 1 : 0, k: stack.map(l => l.k).join(''), d: stack.map((l, i) => Math.round((l.dx + wob * hfOf(i)) * 1000) / 1000) };
      if (complete) pop('完成!', px, BASE - stackH(n) - 0.12, '#ffcc33', true);
      timers.push(setTimeout(() => submit(v, data), 1000));
    };

    const step = dt => {
      // お皿: 指を少し遅れて追いかける
      const want = Math.max(-C.VMAX, Math.min(C.VMAX, (tx - px) * C.FOLLOW));
      const dv = Math.max(-C.ACC * dt, Math.min(C.ACC * dt, want - pv));
      pv += dv;
      px += pv * dt;
      if (px < 0.2 || px > 0.8) { px = Math.max(0.2, Math.min(0.8, px)); pv = 0; }
      // 塔の揺れ(急に動かすほど揺れる)
      wobV += (-C.WOB_K * wob - C.WOB_D * wobV - (dv / dt) * C.WOB_G) * dt;
      wob += wobV * dt;
      if (stack.length) checkTopple();
      // 落ちていく具材
      for (let i = debris.length - 1; i >= 0; i--) {
        const o = debris[i];
        o.vy += 3 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.r += o.vr * dt;
        if (o.y > C.WH + 0.6) debris.splice(i, 1);
      }
      // いま落ちている具材
      if (cur) {
        const age = sim - cur.t0, yb = cur.vy * age, top = BASE - stackH(stack.length);
        if (yb >= top) land(burgerItemX(cur, age), top);
      } else if (next < items.length) {
        wait -= dt;
        if (wait <= 0) spawn();
      } else finish();
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(ox, 0, s, gy);
      // 操作エリア
      ctx.fillStyle = 'rgba(255,204,51,0.07)';
      ctx.fillRect(0, gy, W, H - gy);
      ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      ctx.fillStyle = 'rgba(242,244,255,0.55)';
      ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('▼ ドラッグでお皿を動かす ▼', W / 2, gy + (H - gy) * 0.7);
      if (touching) {
        ctx.fillStyle = 'rgba(255,204,51,0.55)';
        ctx.beginPath(); ctx.arc(X(tx), gy + (H - gy) * 0.3, 15, 0, Math.PI * 2); ctx.fill();
      }
      // お皿と積んだ具材
      drawBurgerPlate(ctx, X(px), gy, C.PLATE_W * s, C.PLATE_H * s);
      stack.forEach((l, i) => drawBurgerItem(ctx, l.k, X(layerX(i)), Y(BASE - stackH(i)), K[l.k].w * s, K[l.k].h * s));
      // 落ちている具材と、着地する場所のガイド(点線と影)
      if (cur && !done) {
        const age = sim - cur.t0, x = burgerItemX(cur, age), yb = cur.vy * age;
        const top = BASE - stackH(stack.length), kd = K[cur.k];
        ctx.strokeStyle = 'rgba(255,204,51,0.45)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(X(x), Y(yb)); ctx.lineTo(X(x), Y(top)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(X(x), Y(top), kd.w * s * 0.45, Math.max(3, kd.w * s * 0.08), 0, 0, Math.PI * 2); ctx.fill();
        drawBurgerItem(ctx, cur.k, X(x), Y(yb), kd.w * s, kd.h * s);
      }
      // 落ちていく具材(回りながら)
      debris.forEach(o => {
        const kd = K[o.k];
        ctx.save();
        ctx.translate(X(o.x), Y(o.y - kd.h / 2));
        ctx.rotate(o.r);
        drawBurgerItem(ctx, o.k, 0, kd.h * s / 2, kd.w * s, kd.h * s);
        ctx.restore();
      });
      // 文字の演出
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i], a = (sim - p.t) / 0.9;
        if (a >= 1) { pops.splice(i, 1); continue; }
        ctx.globalAlpha = 1 - a * a;
        ctx.fillStyle = p.color;
        ctx.font = `bold ${p.big ? 26 : 18}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.text, Math.max(50, Math.min(W - 50, X(p.x))), Y(p.y) - a * 30);
        ctx.globalAlpha = 1;
      }
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
    const release = ev => { if (ev.pointerId === pid) { pid = null; touching = false; } };
    cv.addEventListener('pointerup', release);
    cv.addEventListener('pointercancel', release);

    const t0 = performance.now();
    updateHead(); draw();
    iv = setInterval(() => {
      const e = (performance.now() - t0) / 1000;
      // 処理が遅れても、すり抜けないように細かく区切って進める
      while (sim < e) {
        const dt = Math.min(0.016, e - sim);
        sim += dt;
        if (!done) {
          step(dt);
          if (sim > 17.2) finish();               // 念のため(18秒以内に必ず終わる)
        }
      }
      draw();
    }, 16);
    timers.push(iv);
  });
}

function drawBurgerPlate(ctx, cx, gy, w, h) {
  ctx.fillStyle = '#dfe4f2';
  rrect(ctx, cx - w / 2, gy - h, w, h, h / 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(cx - w * 0.42, gy - h * 0.35, w * 0.84, h * 0.35);
}

// 具材を1つ描く。cx=横の真ん中、yb=下の面のy、w/h=幅と厚み(すべてpx)
function drawBurgerItem(ctx, k, cx, yb, w, h) {
  const x0 = cx - w / 2, yt = yb - h;
  if (k === 'b') {                                   // 下のバンズ
    ctx.fillStyle = '#d9984a'; rrect(ctx, x0, yt, w, h, h * 0.45); ctx.fill();
    ctx.fillStyle = '#f3d39a'; ctx.fillRect(x0 + h * 0.3, yt, w - h * 0.6, h * 0.28);
  } else if (k === 'u') {                            // 上のバンズ(山型とゴマ)
    ctx.fillStyle = '#e0a04c';
    ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x0, yb - h * 0.3);
    ctx.bezierCurveTo(x0, yt - h * 0.25, x0 + w, yt - h * 0.25, x0 + w, yb - h * 0.3);
    ctx.lineTo(x0 + w, yb); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff4d6';
    [[0.3, 0.45], [0.5, 0.25], [0.7, 0.45], [0.42, 0.62], [0.6, 0.6]].forEach(([fx, fy]) => {
      ctx.beginPath(); ctx.ellipse(x0 + w * fx, yt + h * fy, Math.max(1, w * 0.025), Math.max(0.6, h * 0.08), 0.4, 0, Math.PI * 2); ctx.fill();
    });
  } else if (k === 'l') {                            // レタス(ギザギザ)
    ctx.fillStyle = '#5fc25a';
    ctx.beginPath(); ctx.moveTo(x0 - w * 0.02, yb);
    for (let i = 0; i <= 10; i++) ctx.lineTo(x0 - w * 0.02 + i * w * 1.04 / 10, i % 2 ? yt : yt + h * 0.45);
    for (let i = 10; i >= 0; i--) ctx.lineTo(x0 - w * 0.02 + i * w * 1.04 / 10, i % 2 ? yb : yb + h * 0.35);
    ctx.closePath(); ctx.fill();
  } else if (k === 'p') {                            // パティ
    ctx.fillStyle = '#6a3a20'; rrect(ctx, x0, yt, w, h, h * 0.4); ctx.fill();
    ctx.fillStyle = '#86502d'; ctx.fillRect(x0 + h * 0.3, yt, w - h * 0.6, h * 0.22);
    ctx.fillStyle = '#4a2614';
    [0.2, 0.45, 0.7, 0.85].forEach((fx, i) => { ctx.beginPath(); ctx.arc(x0 + w * fx, yt + h * (i % 2 ? 0.6 : 0.45), Math.max(0.8, h * 0.1), 0, Math.PI * 2); ctx.fill(); });
  } else if (k === 't') {                            // トマト
    ctx.fillStyle = '#e04a3c'; rrect(ctx, x0, yt, w, h, h * 0.5); ctx.fill();
    ctx.fillStyle = '#ff7a66'; rrect(ctx, x0 + w * 0.12, yt + h * 0.25, w * 0.76, h * 0.4, h * 0.2); ctx.fill();
  } else if (k === 'o') {                            // 玉ねぎ(輪)
    ctx.fillStyle = '#f1e6f8'; rrect(ctx, x0, yt, w, h, h * 0.5); ctx.fill();
    ctx.strokeStyle = '#b98bd4'; ctx.lineWidth = Math.max(1, h * 0.25);
    rrect(ctx, x0 + h * 0.2, yt + h * 0.2, w - h * 0.4, h * 0.6, h * 0.3); ctx.stroke();
  } else if (k === 'c') {                            // チーズ(角がとろける)
    ctx.fillStyle = '#ffc53d';
    ctx.fillRect(x0, yt, w, h);
    ctx.beginPath();
    ctx.moveTo(x0, yb); ctx.lineTo(x0 + w * 0.12, yb); ctx.lineTo(x0 + w * 0.04, yb + h * 1.6); ctx.closePath();
    ctx.moveTo(x0 + w, yb); ctx.lineTo(x0 + w * 0.88, yb); ctx.lineTo(x0 + w * 0.96, yb + h * 1.6); ctx.closePath();
    ctx.fill();
  }
}

// リザルト用:el の中に、その人のバーガーを描く
function drawBurgerResult(el, data, size) {
  size = size || 90;
  const dpr = window.devicePixelRatio || 1;
  const cv = document.createElement('canvas');
  cv.width = size * dpr; cv.height = size * dpr;
  cv.style.width = size + 'px'; cv.style.height = size + 'px';
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  const C = burgerCfg(), K = BURGER_KIND;
  const sc = size / 0.72, cx = size / 2, gy = size * 0.94;
  drawBurgerPlate(ctx, cx, gy, C.PLATE_W * sc, C.PLATE_H * sc);
  const ks = (data && typeof data.k === 'string') ? data.k : '';
  const raw = data && data.d ? data.d : [];
  const ds = Array.isArray(raw) ? raw : Object.values(raw);
  let y = gy - C.PLATE_H * sc;
  for (let i = 0; i < ks.length; i++) {
    const kd = K[ks[i]]; if (!kd) continue;
    drawBurgerItem(ctx, ks[i], cx + (Number(ds[i]) || 0) * sc, y, kd.w * sc, kd.h * sc);
    y -= kd.h * sc;
  }
  if (data && data.c) {
    ctx.fillStyle = '#ffcc33';
    ctx.font = `bold ${Math.round(size * 0.13)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('完成!', cx, size * 0.04);
  }
  el.appendChild(cv);
}

/* ============================================================
   ミニゲーム13: ジャックを注げ!
   ============================================================ */

const JACK_RATE = 30;   // 1秒に注がれる量(ml)
const JACK_MAX = 315;   // グラスのふち(ml)。ここに達するとあふれる

function playJack(stage, round, submit) {
  const game = GAMES.find(g => g.id === 'jack');
  // 全員共通の round.delay からお題を決める → 45〜300ml、15ml刻み
  const rnd = seededRng(Math.round((round.delay || 3000) * 1000));
  const target = 45 + Math.floor(rnd() * 18) * 15;

  game.desc = game.descBase +
    `<div style="margin-top:14px;font-size:22px">お題 <b style="color:#ffcc33">${target}ml</b></div>`;

  countdown(stage, game, round, () => {
    stage.innerHTML =
      `<div class="center" style="font-size:22px;margin:6px 0"><b style="color:#ffcc33">${target}ml</b> 注げ!</div>` +
      `<div class="center sub" id="info">ボトルを押して注ぐ ・ 残り <b id="left">15.0</b> 秒</div>` +
      `<canvas id="pad" style="display:block;width:100%;height:52vh;margin-top:6px;touch-action:none"></canvas>` +
      `<button class="btn" id="ok" style="margin-top:8px">決定</button>`;
    const cv = stage.querySelector('#pad');
    const info = stage.querySelector('#info');
    const ok = stage.querySelector('#ok');
    const dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    // グラスとボトルの位置
    const gh = H * 0.48, gw = Math.min(W * 0.55, gh * 1.05);
    const gx = W * 0.38, gb = H * 0.97;
    const L = H * 0.42;
    const POUR = -2.05, REST = 0;                    // ボトルの角度(注ぐとき・休むとき)
    // 休むときはグラスの右に立てて置く。傾けたときは、注ぎ口がグラスの真上(ふちより少し上)に来る
    const rx = W - L * 0.17 - 6, ry = gb - L / 2;
    const px0 = gx - gw * 0.05 + Math.sin(-POUR) * L / 2, py0 = gb - gh - L * 0.32;
    const DUR = 15000, t0 = performance.now();
    let ml = 0, pouring = false, pid = null, ang = REST, done = false, over = false, overT = 0, reveal = false;
    let last = t0, iv = null;

    const draw = now => {
      ctx.clearRect(0, 0, W, H);
      const spill = over ? Math.min(1, (now - overT) / 1000) : 0;
      drawJackGlass(ctx, gx, gb, gh, gw, ml, reveal ? target : null, spill);
      // ボトルと、注いでいる液体(傾きに合わせて、立てた位置から注ぐ位置へ動く)
      const f = Math.max(0, Math.min(1, (ang - REST) / (POUR - REST)));
      const bx = rx + (px0 - rx) * f, by = ry + (py0 - ry) * f;
      const sx = bx + Math.sin(ang) * L / 2, sy = by - Math.cos(ang) * L / 2;
      if (pouring && !done && ang < POUR + 0.6) {
        const surf = gb - gh * 0.12 - (gh * 0.88) * Math.min(1, ml / JACK_MAX);
        const wv = Math.sin(now / 40) * 1.2;
        ctx.strokeStyle = 'rgba(190,110,40,0.9)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + wv, (sy + surf) / 2, sx + wv * 0.5, surf); ctx.stroke();
      }
      drawJackBottle(ctx, bx, by, L, ang);
    };

    const finish = (v, data, delay) => {
      if (done) return;
      done = true; pouring = false;
      ok.style.opacity = '0.35';
      if (delay) timers.push(setTimeout(() => submit(v, data), delay));
      else submit(v, data);
    };
    const decide = () => {
      if (done) return;
      if (ml <= 0) { info.textContent = '注いでない…'; finish(999, { t: target, ml: 0, o: 0 }); return; }
      const err = Math.round(Math.abs(ml - target) * 10) / 10;
      reveal = true;
      draw(performance.now());
      finish(err, { t: target, ml: Math.round(ml * 10) / 10, o: 0 });
    };

    ok.addEventListener('pointerdown', ev => { ev.preventDefault(); decide(); });
    cv.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (done || pid !== null) return;
      pid = ev.pointerId; pouring = true;
      try { cv.setPointerCapture(pid); } catch (e) {}
    });
    const release = ev => { if (ev.pointerId === pid) { pid = null; pouring = false; } };
    cv.addEventListener('pointerup', release);
    cv.addEventListener('pointercancel', release);

    draw(t0);
    iv = setInterval(() => {
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!done) {
        if (pouring) {
          ml += JACK_RATE * dt;
          if (ml >= JACK_MAX) {                     // あふれた → その場で失敗
            ml = JACK_MAX; over = true; overT = now;
            info.innerHTML = '<b style="color:#ff5c6c;font-size:20px">あふれた! 失敗!</b>';
            finish(999, { t: target, ml: JACK_MAX, o: 1 }, 1300);
          }
        }
        const e = now - t0;
        if (!done) stage.querySelector('#left').textContent = Math.max(0, (DUR - e) / 1000).toFixed(1);
        if (e >= DUR && !done) decide();            // 時間切れ:入っている量で判定
      }
      const goal = pouring && !done ? POUR : REST;
      ang += (goal - ang) * Math.min(1, dt * 18);
      draw(now);
    }, 16);
    timers.push(iv);
  });
}

// ロックグラス・液体・氷を描く。target を渡すとお題の線、spill(0〜1)であふれる演出
function drawJackGlass(ctx, gx, gb, gh, gw, ml, target, spill) {
  const top = gb - gh, base = gh * 0.12, ib = gb - base, ih = gh - base;
  const wt = Math.max(2, gw * 0.04);
  const hwAt = y => (gw / 2) * (0.84 + 0.16 * (gb - y) / gh);        // 高さ y での外側の半分の幅
  const surfY = v => ib - ih * Math.min(1, v / JACK_MAX);
  // グラスの中(うすい色)
  ctx.fillStyle = 'rgba(200,220,255,0.08)';
  ctx.beginPath(); ctx.moveTo(gx - hwAt(top), top); ctx.lineTo(gx + hwAt(top), top);
  ctx.lineTo(gx + hwAt(gb), gb); ctx.lineTo(gx - hwAt(gb), gb); ctx.closePath(); ctx.fill();
  // 液体
  if (ml > 0) {
    const sy = surfY(ml);
    const g = ctx.createLinearGradient(0, sy, 0, ib);
    g.addColorStop(0, 'rgba(206,124,44,0.92)'); g.addColorStop(1, 'rgba(130,66,18,0.95)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(gx - hwAt(sy) + wt, sy); ctx.lineTo(gx + hwAt(sy) - wt, sy);
    ctx.lineTo(gx + hwAt(ib) - wt, ib); ctx.lineTo(gx - hwAt(ib) + wt, ib); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,120,0.5)';
    ctx.fillRect(gx - hwAt(sy) + wt, sy, (hwAt(sy) - wt) * 2, Math.max(1.5, gh * 0.012));
  }
  // 氷(見た目だけ)。液面が上がると浮かぶ
  const c = gw * 0.27, sy = surfY(ml);
  [[-0.2, 0, 0.15], [0.19, 0, -0.2], [0.0, 1, 0.35]].forEach(([fx, lv, rot], i) => {
    const rest = ib - c * 0.55 - lv * c * 0.8;
    const y = ml > 0 ? Math.min(rest, sy + c * (0.12 + i * 0.05)) : rest;
    ctx.save(); ctx.translate(gx + fx * gw, y); ctx.rotate(rot);
    ctx.fillStyle = 'rgba(230,245,255,0.32)'; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = Math.max(1, c * 0.04);
    rrect(ctx, -c / 2, -c / 2, c, c, c * 0.18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    rrect(ctx, -c * 0.32, -c * 0.32, c * 0.22, c * 0.12, c * 0.05); ctx.fill();
    ctx.restore();
  });
  // あふれる
  if (spill > 0) {
    ctx.fillStyle = 'rgba(190,110,40,0.9)';
    const len = gh * spill;
    [-1, 1].forEach(sd => {
      const x = gx + sd * hwAt(top);
      rrect(ctx, x - (sd > 0 ? 0 : 5), top - 3, 5, len + 3, 2.5); ctx.fill();
    });
    ctx.beginPath(); ctx.ellipse(gx, gb, gw * 0.7 * spill, Math.max(2, gh * 0.03), 0, 0, Math.PI * 2); ctx.fill();
  }
  // グラスのふちと厚い底
  ctx.strokeStyle = 'rgba(220,235,255,0.65)'; ctx.lineWidth = Math.max(1.5, gw * 0.02); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(gx - hwAt(top), top); ctx.lineTo(gx - hwAt(gb), gb);
  ctx.lineTo(gx + hwAt(gb), gb); ctx.lineTo(gx + hwAt(top), top); ctx.stroke();
  ctx.fillStyle = 'rgba(200,220,255,0.22)';
  ctx.beginPath(); ctx.moveTo(gx - hwAt(ib), ib); ctx.lineTo(gx + hwAt(ib), ib);
  ctx.lineTo(gx + hwAt(gb), gb); ctx.lineTo(gx - hwAt(gb), gb); ctx.closePath(); ctx.fill();
  // お題の線
  if (target != null) {
    const ty = surfY(target);
    ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = Math.max(1.5, gh * 0.012); ctx.setLineDash([gw * 0.05, gw * 0.04]);
    ctx.beginPath(); ctx.moveTo(gx - hwAt(ty) - gw * 0.08, ty); ctx.lineTo(gx + hwAt(ty) + gw * 0.08, ty); ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ボトル(黒地に白文字のラベル)。(cx, cy) を中心に ang だけ傾ける
function drawJackBottle(ctx, cx, cy, L, ang) {
  const bw = L * 0.34;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
  ctx.fillStyle = '#15161a'; ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-L * 0.055, -L * 0.5); ctx.lineTo(L * 0.055, -L * 0.5);
  ctx.lineTo(L * 0.055, -L * 0.3); ctx.lineTo(bw / 2, -L * 0.15);
  ctx.lineTo(bw / 2, L * 0.46); ctx.quadraticCurveTo(bw / 2, L * 0.5, bw / 2 - L * 0.04, L * 0.5);
  ctx.lineTo(-bw / 2 + L * 0.04, L * 0.5); ctx.quadraticCurveTo(-bw / 2, L * 0.5, -bw / 2, L * 0.46);
  ctx.lineTo(-bw / 2, -L * 0.15); ctx.lineTo(-L * 0.055, -L * 0.3); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2b2d33'; ctx.fillRect(-L * 0.065, -L * 0.5, L * 0.13, L * 0.06);   // キャップのあたり
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(-bw / 2 + L * 0.03, -L * 0.12, L * 0.035, L * 0.55);
  // ラベル
  ctx.fillStyle = '#000'; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, L * 0.008);
  rrect(ctx, -bw * 0.42, L * 0.02, bw * 0.84, L * 0.3, L * 0.02); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(L * 0.085)}px Georgia, serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('JACK', 0, L * 0.17);
  ctx.fillRect(-bw * 0.3, L * 0.08, bw * 0.6, Math.max(1, L * 0.006));
  ctx.fillRect(-bw * 0.3, L * 0.26, bw * 0.6, Math.max(1, L * 0.006));
  ctx.restore();
}

// リザルト用:el の中に、グラスとお題の線を描く
function drawJackResult(el, data, size) {
  size = size || 90;
  const dpr = window.devicePixelRatio || 1;
  const cv = document.createElement('canvas');
  cv.width = size * dpr; cv.height = size * dpr;
  cv.style.width = size + 'px'; cv.style.height = size + 'px';
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  if (data) drawJackGlass(ctx, size / 2, size * 0.95, size * 0.78, size * 0.7, Number(data.ml) || 0, Number(data.t), data.o ? 1 : 0);
  el.appendChild(cv);
}

/* ============================================================
   ミニゲーム14: 俺のハンバーグを焼け!
   ============================================================ */

const HAM_LEVELS = [[30, 'レア'], [45, 'ミディアムレア'], [60, 'ミディアム'], [80, 'ウェルダン']];
const hamName = t => (HAM_LEVELS.find(l => l[0] === Number(t)) || [0, ''])[1];

// 焼け具合(0〜100)の色。なめらかに変わる
function hamColor(d) {
  const P = [[0, [239, 143, 148]], [30, [222, 166, 125]], [45, [201, 134, 82]], [60, [170, 102, 48]], [80, [110, 60, 28]], [100, [28, 20, 16]]];
  d = Math.max(0, Math.min(100, d));
  let i = 0;
  while (i < P.length - 2 && d > P[i + 1][0]) i++;
  const [a, ca] = P[i], [b, cb] = P[i + 1], f = (d - a) / (b - a);
  return 'rgb(' + ca.map((c, k) => Math.round(c + (cb[k] - c) * f)).join(',') + ')';
}

// 色見本(HTML)。お題を黄色の枠で目立たせる
function hamSwatches(t, big) {
  return `<div style="display:flex;gap:6px;justify-content:center;margin-top:${big ? 12 : 4}px">` + HAM_LEVELS.map(([v, name]) =>
    `<div style="flex:1;max-width:90px;text-align:center;font-size:${big ? 12 : 10}px;line-height:1.3;color:${v === t ? '#ffcc33' : '#9aa3c7'};font-weight:${v === t ? 'bold' : 'normal'}">` +
    `<div style="height:${big ? 26 : 16}px;border-radius:6px;background:${hamColor(v)};border:${v === t ? '3px solid #ffcc33' : '1px solid rgba(255,255,255,0.2)'}"></div>${name}</div>`).join('') + `</div>`;
}

// お題と、3個それぞれの焼ける速さ(1秒あたり)。種が同じなら全員同じ
function hamMake(seed) {
  const rnd = seededRng(seed);
  const target = HAM_LEVELS[Math.floor(rnd() * 4)][0];
  const pats = [0, 1.5, 3].map(enter => {
    const r1 = 20 * (0.8 + rnd() * 0.45);          // 片面およそ4秒でウェルダン(80)くらい
    return { enter, r1, r2: r1 * (0.9 + rnd() * 0.2) };
  });
  return { target, pats };
}

function playHamburg(stage, round, submit) {
  const game = GAMES.find(g => g.id === 'hamburg');
  const { target, pats } = hamMake(Math.round((round.delay || 3000) * 1000));

  game.desc = game.descBase +
    `<div style="margin-top:12px;font-size:22px">お題 <b style="color:#ffcc33">${hamName(target)}</b></div>` + hamSwatches(target, true);

  countdown(stage, game, round, () => {
    stage.innerHTML =
      `<div class="center sub" style="font-size:16px;margin:2px 0">お題 <b style="color:#ffcc33;font-size:20px">${hamName(target)}</b> ・ 残り <b id="left">15.0</b> 秒</div>` +
      hamSwatches(target, false) +
      `<canvas id="pad" style="display:block;width:100%;height:60vh;margin-top:6px;touch-action:none"></canvas>`;
    const cv = stage.querySelector('#pad');
    const left = stage.querySelector('#left');
    const dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    const pcx = W / 2, pcy = H * 0.38, R = Math.min(W * 0.47, H * 0.36);  // フライパン
    const pr = R * 0.32;                                                 // ハンバーグの半径
    const slot = [[-0.45, -0.28], [0.45, -0.28], [0, 0.42]].map(([x, y]) => ({ x: pcx + x * R, y: pcy + y * R }));
    const plateY = H * 0.87;
    const pslot = [-1, 0, 1].map(i => ({ x: W / 2 + i * W * 0.26, y: plateY - H * 0.015 }));
    // st: wait(まだ) / cook1(1面目) / cook2(2面目) / plate(お皿) / burnt(焦げ)
    const ps = pats.map(p => Object.assign({ st: 'wait', a: 0, b: 0, at: 0, lock: 0 }, p));
    const DUR = 15, t0 = performance.now();
    let sim = 0, done = false, ending = false, iv = null;

    const finish = () => {
      if (done) return;
      done = true;
      const errs = [];
      ps.forEach(p => { if (p.st === 'plate') errs.push(Math.abs(p.a - target), Math.abs(p.b - target)); else errs.push(100, 100); });
      const allBurnt = ps.every(p => p.st === 'burnt');
      const v = allBurnt ? 999 : Math.round(errs.reduce((x, y) => x + y, 0) / 6 * 10) / 10;
      const data = {
        t: target,
        f: ps.map(p => [Math.round(p.a), Math.round(p.b)]),
        s: ps.map(p => p.st === 'plate' ? 'p' : p.st === 'burnt' ? 'b' : 'n').join('')
      };
      left.textContent = '0.0';
      submit(v, data);
    };

    const step = dt => {
      ps.forEach(p => {
        if (p.st === 'wait' && sim >= p.enter) { p.st = 'cook1'; p.at = sim; }
        if (p.st === 'cook1') p.a = Math.min(100, p.a + p.r1 * dt);
        if (p.st === 'cook2') p.b = Math.min(100, p.b + p.r2 * dt);
        if ((p.st === 'cook1' && p.a >= 100) || (p.st === 'cook2' && p.b >= 100)) { p.st = 'burnt'; p.at = sim; }
      });
      if (!ending && ps.every(p => p.st === 'plate' || p.st === 'burnt')) {
        ending = true;
        timers.push(setTimeout(finish, 700));         // お皿に乗る動きを見せてから終わる
      }
    };

    const drawPatty = (x, y, r, topD, rimD, sq) => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.12, r * 1.02, r * 0.92 * sq, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hamColor(rimD);                   // ふち = 焼けている面の色
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.92 * sq, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hamColor(topD);                   // 上の面
      ctx.beginPath(); ctx.ellipse(x, y - r * 0.04 * sq, r * 0.82, r * 0.74 * sq, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.13)';
      [[-0.35, -0.2], [0.25, -0.35], [0.3, 0.2], [-0.15, 0.3], [0.05, -0.02]].forEach(([fx, fy]) => {
        ctx.beginPath(); ctx.arc(x + fx * r, y + fy * r * sq, r * 0.07, 0, Math.PI * 2); ctx.fill();
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      // フライパン
      ctx.fillStyle = '#3a3f4f';
      ctx.save(); ctx.translate(pcx, pcy); ctx.rotate(0.75);                 // 取っ手
      rrect(ctx, R * 0.85, -R * 0.08, R * 0.32, R * 0.16, R * 0.08); ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.arc(pcx, pcy, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#23262f'; ctx.beginPath(); ctx.arc(pcx, pcy, R * 0.9, 0, Math.PI * 2); ctx.fill();
      // お皿
      ctx.fillStyle = '#dfe4f2'; ctx.beginPath(); ctx.ellipse(W / 2, plateY, W * 0.44, H * 0.075, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c3c9db'; ctx.beginPath(); ctx.ellipse(W / 2, plateY, W * 0.34, H * 0.05, 0, 0, Math.PI * 2); ctx.fill();
      ps.forEach((p, i) => {
        const age = sim - p.at;
        if (p.st === 'wait') {                          // まだ乗っていない場所
          ctx.strokeStyle = 'rgba(242,244,255,0.15)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
          ctx.beginPath(); ctx.arc(slot[i].x, slot[i].y, pr, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
          return;
        }
        if (p.st === 'plate') {                         // お皿へ移る動き
          const f = Math.min(1, age / 0.35), e = 1 - (1 - f) * (1 - f);
          const x = slot[i].x + (pslot[i].x - slot[i].x) * e;
          const y = slot[i].y + (pslot[i].y - slot[i].y) * e - Math.sin(Math.PI * f) * pr;
          drawPatty(x, y, pr * (1 - 0.35 * e), p.a, p.b, 1 - 0.45 * e);
          return;
        }
        let x = slot[i].x, y = slot[i].y, sq = 1, top = p.b, rim = p.a;
        if (p.st === 'cook1' && age < 0.2) { sq = 1; y -= (1 - age / 0.2) * pr * 0.6; }
        if (p.st === 'cook2') {
          top = p.a; rim = p.b;
          if (age < 0.3) {                              // ひっくり返す動き
            const f = age / 0.3;
            sq = Math.max(0.08, Math.abs(Math.cos(Math.PI * f)));
            y -= Math.sin(Math.PI * f) * pr * 0.7;
            if (f < 0.5) { top = 0; rim = p.a; }
          }
        }
        if (p.st === 'burnt') { top = 100; rim = 100; }
        drawPatty(x, y, pr, top, rim, sq);
        if (p.st === 'cook1' || p.st === 'cook2') {     // ジュージュー
          ctx.fillStyle = 'rgba(255,230,160,0.55)';
          for (let k = 0; k < 6; k++) {
            const an = k * 1.05 + Math.floor(sim * 8 + k) * 0.7;
            ctx.beginPath(); ctx.arc(x + Math.cos(an) * pr * 1.1, y + Math.sin(an) * pr * 1.0, 2, 0, Math.PI * 2); ctx.fill();
          }
        }
        if (p.st === 'burnt') {                         // 煙
          for (let k = 0; k < 6; k++) {
            const ph = (age * 0.8 + k / 6) % 1;
            ctx.fillStyle = `rgba(180,185,200,${(1 - ph) * 0.45})`;
            ctx.beginPath(); ctx.arc(x + Math.sin(k * 2.1 + ph * 4) * pr * 0.4, y - ph * pr * 2.2, pr * (0.2 + ph * 0.35), 0, Math.PI * 2); ctx.fill();
          }
          if (age < 1) {
            ctx.fillStyle = '#ff5c6c'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('焦げた!', x, y - pr * 1.2 - age * 20);
          }
        }
      });
    };

    cv.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (done || ending) return;
      const b = cv.getBoundingClientRect();
      const mx = ev.clientX - b.left, my = ev.clientY - b.top;
      let best = -1, bd = pr * 1.2;
      ps.forEach((p, i) => {
        if (p.st !== 'cook1' && p.st !== 'cook2') return;
        const d = Math.hypot(mx - slot[i].x, my - slot[i].y);
        if (d < bd) { bd = d; best = i; }
      });
      if (best < 0) return;
      const p = ps[best];
      if (sim < p.lock) return;                         // ひっくり返した直後の2度押しは無視
      if (p.st === 'cook1') { p.st = 'cook2'; p.at = sim; p.lock = sim + 0.3; }
      else { p.st = 'plate'; p.at = sim; }
    });

    draw();
    iv = setInterval(() => {
      const e = (performance.now() - t0) / 1000;
      while (sim < e && !done) {
        const dt = Math.min(0.016, e - sim);
        sim += dt;
        if (!ending) step(dt);
        if (sim >= DUR) { finish(); break; }            // 15秒:お皿にないものは誤差100
      }
      if (!done) left.textContent = Math.max(0, DUR - sim).toFixed(1);
      draw();
    }, 16);
    timers.push(iv);
  });
}

// リザルト用:3個の両面(上半分=1面目、下半分=2面目)と、お題の色を並べる
function drawHamburgResult(el, data, size) {
  size = size || 90;
  const dpr = window.devicePixelRatio || 1;
  const cv = document.createElement('canvas');
  cv.width = size * dpr; cv.height = size * dpr;
  cv.style.width = size + 'px'; cv.style.height = size + 'px';
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  if (!data) { el.appendChild(cv); return; }
  const raw = data.f || [];
  const fs = Array.isArray(raw) ? raw : Object.values(raw);
  const st = typeof data.s === 'string' ? data.s : '';
  const r = size * 0.14, cy = size * 0.36;
  for (let i = 0; i < 3; i++) {
    const f = fs[i] ? (Array.isArray(fs[i]) ? fs[i] : Object.values(fs[i])) : [0, 0];
    const x = size * (0.2 + i * 0.3);
    ctx.globalAlpha = st[i] === 'n' ? 0.45 : 1;
    ctx.fillStyle = hamColor(Number(f[0]) || 0);
    ctx.beginPath(); ctx.arc(x, cy, r, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hamColor(Number(f[1]) || 0);
    ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(242,244,255,0.5)'; ctx.lineWidth = Math.max(1, size * 0.012);
    ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.moveTo(x - r, cy); ctx.lineTo(x + r, cy); ctx.stroke();
    if (st[i] === 'b' || st[i] === 'n') {                // 焦げ=赤い×、お皿に乗せていない=?
      ctx.fillStyle = st[i] === 'b' ? '#ff5c6c' : '#f2f4ff';
      ctx.font = `bold ${Math.round(size * 0.16)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(st[i] === 'b' ? '×' : '?', x, cy);
    }
  }
  // お題の色見本
  const t = Number(data.t);
  ctx.fillStyle = hamColor(t);
  rrect(ctx, size * 0.08, size * 0.62, size * 0.84, size * 0.13, size * 0.04); ctx.fill();
  ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = Math.max(1.5, size * 0.02); ctx.stroke();
  ctx.fillStyle = '#ffcc33';
  ctx.font = `bold ${Math.round(size * 0.11)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('お題 ' + hamName(t), size / 2, size * 0.8);
  el.appendChild(cv);
}
