/* ミニゲーム本体(games2.js): マディーズバーガーを作ろう! / ジャックを注げ! / 俺のハンバーグを焼け! /
   だるまさんがころんだ! / 南インド風カレーを作ろう!
   games.js の後、core.js の前に読み込むこと。 */

GAMES.push(
  {
    id: 'burger', title: 'マディーズバーガーを作ろう!',
    desc: '上から落ちてくる具材を、お皿で受け止めて積み上げよう!<br>操作は「地面より下」で指を左右に動かす。<br>真ん中に乗せるほど高得点。ずれすぎると落ちる。<br>上のバンズの前にケチャップ! ウネウネ動くボトルに合わせて、いちばん上の具材で受け止めよう。<br>塔が傾きすぎると崩れる! 上のバンズまで乗せたら完成!',
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
    descBase: 'ボトルを押している間、グラスにジャックが注がれる。<br>指を離すと止まる。注ぎ足しはOK、減らせない。<br>量の数字は出ない。液面を見て「決定」!<br>グラスはふちまで<b style="color:#ffcc33">315ml</b>。あふれたら失敗。<br>お題の量に近いほど上位。',
    desc: 'ボトルを押している間、グラスにジャックが注がれる。<br>指を離すと止まる。注ぎ足しはOK、減らせない。<br>量の数字は出ない。液面を見て「決定」!<br>グラスはふちまで<b style="color:#ffcc33">315ml</b>。あふれたら失敗。<br>お題の量に近いほど上位。',
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
    descBase: 'ハンバーグ3個が焼けていく。出てくる時間も焼ける速さもバラバラ!<br>ハンバーグの色 = いま焼けている下の面の色。<br>1回タップでひっくり返す(生の面が下になる)、2回目のタップでお皿へ。<br>途中で焼ける速さが変わる! ジュージューの粒が増えたら速くなったしるし。<br>両面ともお題の焼き色に近いほど上位。焦げたらダメ!',
    desc: 'ハンバーグ3個が焼けていく。出てくる時間も焼ける速さもバラバラ!<br>ハンバーグの色 = いま焼けている下の面の色。<br>1回タップでひっくり返す(生の面が下になる)、2回目のタップでお皿へ。<br>途中で焼ける速さが変わる! ジュージューの粒が増えたら速くなったしるし。<br>両面ともお題の焼き色に近いほど上位。焦げたらダメ!',
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
    GAP: 0.15,        // 次の具材が出るまでの間(秒)
    T0: 1.6, T1: 0.8, // 1個目と10個目の落ちる時間(秒)
    DROP: 0.03,       // ケチャップを1滴出す間隔(秒)
    DROP_V: 2.4,      // ケチャップの落ちる速さ(高さ/秒)
    NOZ: 0.1          // ケチャップのボトルの口の高さ(世界のy)
  };
}

// 具材の順番と落ちる位置、ケチャップの動き。種が同じなら全員同じ
// 'K' はケチャップ(上のバンズの直前)
function burgerMake(seed) {
  const C = burgerCfg(), rnd = seededRng(seed);
  const mid = ['l', 'l', 'p', 'p', 't', 'o', 'c', 'c'];
  for (let i = mid.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [mid[i], mid[j]] = [mid[j], mid[i]];
  }
  const items = ['b', ...mid, 'u'].map((k, i) => ({
    k, x: 0.18 + rnd() * 0.64, ph: rnd() * Math.PI * 2,
    T: C.T0 + (C.T1 - C.T0) * i / 9
  }));
  const kp = {
    k: 'K',
    dur: 2.5 + rnd() * 0.5,                         // 出している時間(秒)
    dir: rnd() < 0.5 ? 1 : -1,                      // 1=左から右 -1=右から左
    sv: 0.4 + rnd() * 0.45, sk: 1 + Math.floor(rnd() * 2), sp: rnd() * Math.PI * 2,   // 速さのムラ
    a1: 0.05 + rnd() * 0.05, w1: 2 + rnd() * 2, p1: rnd() * Math.PI * 2,             // ウネウネ(大きい波)
    a2: 0.02 + rnd() * 0.03, w2: 4 + rnd() * 3, p2: rnd() * Math.PI * 2              // ウネウネ(小さい波)
  };
  items.splice(items.length - 1, 0, kp);
  return items;
}

// ケチャップのボトルの横位置。u は 0〜1(出し始め〜出し終わり)
function burgerKetchupX(kp, u) {
  // 進み方: 速くなったり遅くなったりする(でも止まったり戻ったりはしない)
  const q = u + kp.sv * (Math.cos(kp.sp) - Math.cos(2 * Math.PI * kp.sk * u + kp.sp)) / (2 * Math.PI * kp.sk);
  const base = kp.dir > 0 ? 0.15 + 0.7 * q : 0.85 - 0.7 * q;
  const x = base + kp.a1 * Math.sin(2 * Math.PI * kp.w1 * u + kp.p1) + kp.a2 * Math.sin(2 * Math.PI * kp.w2 * u + kp.p2);
  return Math.max(0.06, Math.min(0.94, x));
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
    let kc = null, kPts = 0;                  // ケチャップの最中の様子 / ケチャップの点数
    const kName = it => it.k === 'K' ? 'ケチャップ' : K[it.k].name;

    const stackH = n => { let t = 0; for (let i = 0; i < n; i++) t += K[stack[i].k].h; return t; };
    const hfOf = i => (stackH(i) + K[stack[i].k].h / 2) / 0.45;     // 高いほど揺れが大きい
    const layerX = i => px + stack[i].dx + wob * hfOf(i);
    const pop = (text, x, y, color, big) => pops.push({ text, x, y, color, big, t: sim });

    const updateHead = () => {
      dotsEl.innerHTML = items.map((it, i) => {
        const m = marks[i];
        const now = (cur && cur.idx === i) || (kc && kc.idx === i);
        const c = m === 'P' ? '#ffcc33' : m === 'G' || m === 'E' ? '#35d07f' : m === 'X' ? '#ff5c6c' : m === 'K' ? '#e8452c' : now ? '#f2f4ff' : 'rgba(242,244,255,0.25)';
        return `<span style="color:${c}">●</span>`;
      }).join('');
      const ni = next + (cur || kc ? 1 : 0);
      nxEl.textContent = ni < items.length ? kName(items[ni]) : '—';
    };

    const spawn = () => {
      const it = items[next];
      if (it.k === 'K') kc = { kp: it, idx: next, t0: sim, n: 0, hit: 0, drops: [] };   // ケチャップ開始
      else cur = Object.assign({}, it, { idx: next, t0: sim, vy: BASE / (it.T * K[it.k].f) });
      updateHead();
    };

    // ケチャップ: ボトルから1滴ずつ出して落とす。いちばん上の具材の高さで、具材の幅の中なら乗る
    const stepKetchup = dt => {
      const age = sim - kc.t0, kp = kc.kp;
      while (kc.n * C.DROP <= Math.min(age, kp.dur)) {
        kc.drops.push({ x: burgerKetchupX(kp, kc.n * C.DROP / kp.dur), y: C.NOZ, live: true });
        kc.n++;
      }
      const n = stack.length, top = BASE - stackH(n);
      for (let i = kc.drops.length - 1; i >= 0; i--) {
        const o = kc.drops[i], y0 = o.y;
        o.y += C.DROP_V * dt;
        if (o.live && y0 < top && o.y >= top) {
          o.live = false;
          if (n && Math.abs(o.x - layerX(n - 1)) <= K[stack[n - 1].k].w / 2) {   // 乗った
            kc.hit++;
            (stack[n - 1].ket = stack[n - 1].ket || []).push(o.x - layerX(n - 1));
            kc.drops.splice(i, 1);
            continue;
          }
        }
        if (o.y > C.WH + 0.1) kc.drops.splice(i, 1);
      }
      if (age > kp.dur && !kc.drops.length) {                                   // ケチャップ終わり
        kPts = Math.round(100 * kc.hit / Math.max(1, kc.n));
        marks[kc.idx] = 'K';
        pop('ケチャップ ' + kPts + '%', n ? layerX(n - 1) : px, top - 0.06, '#ff7a66', true);
        kc = null; next++; wait = C.GAP;
        updateHead();
      }
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
      const score = n * 50 + bonus + (complete ? 100 : 0) + kPts;
      const avg = offs.length ? offs.reduce((a, b) => a + b, 0) / offs.length : C.EDGE;
      const frac = Math.round(0.9 * Math.max(0, 1 - avg / C.EDGE) * 100) / 100;   // ずれが小さいほど大きい小数
      const v = score > 0 ? score + frac : 0;
      const data = { n, c: complete ? 1 : 0, kp: kPts, k: stack.map(l => l.k).join(''), d: stack.map((l, i) => Math.round((l.dx + wob * hfOf(i)) * 1000) / 1000) };
      const kl = stack.findIndex(l => l.ket && l.ket.length);                    // ケチャップが乗っている段(結果の絵用、間引く)
      if (kl >= 0) { data.kl = kl; data.kx = stack[kl].ket.filter((_, i) => i % 2 === 0).map(v => Math.round(v * 1000) / 1000); }
      if (complete) pop('完成!', px, BASE - stackH(n) - 0.12, '#ffcc33', true);
      timers.push(setTimeout(() => submit(v, data), 1000));
    };

    // 落ちていく具材を動かす(ゲームが終わったあとも動かし続ける。止めると、落ちた具材が塔の上に止まって見えてしまう)
    const moveDebris = dt => {
      for (let i = debris.length - 1; i >= 0; i--) {
        const o = debris[i];
        o.vy += 3 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.r += o.vr * dt;
        if (o.y > C.WH + 0.6) debris.splice(i, 1);
      }
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
      moveDebris(dt);
      // いま落ちている具材
      if (kc) stepKetchup(dt);
      else if (cur) {
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
      stack.forEach((l, i) => {
        drawBurgerItem(ctx, l.k, X(layerX(i)), Y(BASE - stackH(i)), K[l.k].w * s, K[l.k].h * s);
        if (l.ket) drawBurgerKetchup(ctx, l.ket, X(layerX(i)), Y(BASE - stackH(i) - K[l.k].h), s);
      });
      // ケチャップのボトルと、落ちているケチャップ
      if (kc && !done) {
        ctx.fillStyle = '#e8452c';
        kc.drops.forEach(o => { ctx.beginPath(); ctx.ellipse(X(o.x), Y(o.y), Math.max(2, s * 0.009), Math.max(3, s * 0.02), 0, 0, Math.PI * 2); ctx.fill(); });
        const age = sim - kc.t0;
        if (age <= kc.kp.dur + 0.3) drawKetchupBottle(ctx, X(burgerKetchupX(kc.kp, Math.min(1, age / kc.kp.dur))), Y(C.NOZ), s);
      }
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
          if (sim > 19) finish();                 // 念のため(必ず終わる)
        } else moveDebris(dt);                    // 終わったあとも、落ちた具材は下へ落ちていく
      }
      draw();
    }, 16);
    timers.push(iv);
  });
}

// 具材の上に乗ったケチャップ。xs は具材の真ん中からの位置(世界の幅)、yt は具材の上の面(px)
function drawBurgerKetchup(ctx, xs, cx, yt, sc) {
  ctx.fillStyle = '#e8452c';
  const r = Math.max(1.5, sc * 0.011);
  xs.forEach(dx => { ctx.beginPath(); ctx.arc(cx + dx * sc, yt - r * 0.4, r, 0, Math.PI * 2); ctx.fill(); });
}

// ケチャップのボトル(さかさま)。(x, y) が口の位置
function drawKetchupBottle(ctx, x, y, s) {
  const w = s * 0.07, h = s * 0.13;
  ctx.fillStyle = '#d8352a';
  rrect(ctx, x - w / 2, y - h - s * 0.03, w, h, w * 0.3); ctx.fill();
  ctx.fillStyle = '#f2f4ff';
  ctx.beginPath(); ctx.moveTo(x - w * 0.3, y - s * 0.03); ctx.lineTo(x + w * 0.3, y - s * 0.03); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x - w * 0.3, y - h * 0.9 - s * 0.03, w * 0.15, h * 0.7);
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
  const sc = size / 0.8, cx = size / 2, gy = size * 0.94;
  drawBurgerPlate(ctx, cx, gy, C.PLATE_W * sc, C.PLATE_H * sc);
  const ks = (data && typeof data.k === 'string') ? data.k : '';
  const raw = data && data.d ? data.d : [];
  const ds = Array.isArray(raw) ? raw : Object.values(raw);
  let y = gy - C.PLATE_H * sc;
  const kraw = data && data.kx ? data.kx : [];
  const kx = (Array.isArray(kraw) ? kraw : Object.values(kraw)).map(Number);
  for (let i = 0; i < ks.length; i++) {
    const kd = K[ks[i]]; if (!kd) continue;
    const x = cx + (Number(ds[i]) || 0) * sc;
    drawBurgerItem(ctx, ks[i], x, y, kd.w * sc, kd.h * sc);
    y -= kd.h * sc;
    if (data && data.kl === i && kx.length) drawBurgerKetchup(ctx, kx, x, y, sc);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  if (data && data.c) {
    ctx.fillStyle = '#ffcc33';
    ctx.font = `bold ${Math.round(size * 0.13)}px sans-serif`;
    ctx.fillText('完成!', cx, size * 0.02);
  }
  if (data && typeof data.kp === 'number') {           // ケチャップは上のバンズに隠れるので、文字でも出す
    ctx.fillStyle = '#ff7a66';
    ctx.font = `bold ${Math.round(size * 0.09)}px sans-serif`;
    ctx.fillText('ケチャップ ' + data.kp + '%', cx, size * (data.c ? 0.16 : 0.04));
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
      `<div class="center sub" id="info">ボトルを押して注ぐ(ふちまで315ml) ・ 残り <b id="left">15.0</b> 秒</div>` +
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

// お題と、3個それぞれの出方・焼け方。種が同じなら全員同じ
// 1面ごとに: r = はじめの速さ(1秒あたり)、tc = 速さが変わる時間(その面を焼きはじめてから)、m = 変わったあとの倍率
const hamCfg = {
  sideMin: 2.8, sideMax: 5.5,        // 片面がウェルダン(80)になるまでの秒数(はじめの速さ)
  changeMin: 0.8, changeMax: 3.0,    // 速さが変わるタイミング(秒)
  upChance: 0.6,                     // 速くなる確率(残りは遅くなる)
  upMin: 1.4, upMax: 1.9,            // 速くなるときの倍率
  downMin: 0.55, downMax: 0.8,       // 遅くなるときの倍率
  firstMax: 1.0,                     // 1個目が出るまで(秒)
  gapMin: 0.5, gapMax: 1.7,          // 次の1個が出るまでの間(秒)
  dur: 15
};

// お題の焼け具合になるまでの秒数
function hamReach(sd, target) {
  if (sd.r * sd.tc >= target) return target / sd.r;
  return sd.tc + (target - sd.r * sd.tc) / (sd.r * sd.m);
}
// 焼け具合 lv から 100(焦げ)になるまでの秒数(lv になった時刻 t0 から)
function hamToBurn(sd, t0, lv) {
  if (t0 >= sd.tc) return (100 - lv) / (sd.r * sd.m);
  const lvAtTc = sd.r * sd.tc;
  if (lvAtTc >= 100) return (100 - lv) / sd.r;
  return (sd.tc - t0) + (100 - lvAtTc) / (sd.r * sd.m);
}

function hamMake(seed) {
  const C = hamCfg, rnd = seededRng(seed);
  const target = HAM_LEVELS[Math.floor(rnd() * 4)][0];
  const side = () => {
    const T = C.sideMin + rnd() * (C.sideMax - C.sideMin);
    const tc = C.changeMin + rnd() * (C.changeMax - C.changeMin);
    const m = rnd() < C.upChance ? C.upMin + rnd() * (C.upMax - C.upMin) : C.downMin + rnd() * (C.downMax - C.downMin);
    return { r: 80 / T, tc, m };
  };
  // 出てくる場所の順番もバラバラ
  const slots = [0, 1, 2];
  for (let i = 2; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
  let pats = null;
  for (let tries = 0; tries < 60; tries++) {
    let enter = rnd() * C.firstMax, ok = true;
    const list = [0, 1, 2].map(i => {
      if (i > 0) enter += C.gapMin + rnd() * (C.gapMax - C.gapMin);
      return { enter, slot: slots[i], s1: side(), s2: side() };
    });
    list.forEach(p => {
      [p.s1, p.s2].forEach(sd => {
        const t = hamReach(sd, target);
        if (t < 1.0) ok = false;                                  // 早すぎて間に合わない
        if (hamToBurn(sd, t, target) < 0.6) ok = false;           // お題から焦げまでが短すぎる
      });
      if (p.enter + hamReach(p.s1, target) + hamReach(p.s2, target) + 0.8 > C.dur - 1) ok = false;  // 時間内に焼けない
    });
    pats = list;
    if (ok) break;
  }
  return { target, pats };
}

// いまの焼ける速さ(1秒あたり)。since = その面を焼きはじめてからの秒数
const hamRate = (sd, since) => since >= sd.tc ? sd.r * sd.m : sd.r;

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
    const slotPos = [[-0.45, -0.28], [0.45, -0.28], [0, 0.42]].map(([x, y]) => ({ x: pcx + x * R, y: pcy + y * R }));
    const plateY = H * 0.87;
    const pslot = [-1, 0, 1].map(i => ({ x: W / 2 + i * W * 0.26, y: plateY - H * 0.015 }));
    // st: wait(まだ) / cook1(1面目) / cook2(2面目) / plate(お皿) / burnt(焦げ)
    // a = 1面目の焼け具合、b = 2面目。t1/t2 = その面を焼きはじめた時刻
    const ps = pats.map(p => Object.assign({ st: 'wait', a: 0, b: 0, at: 0, lock: 0, t1: 0, t2: 0 }, p, { pos: slotPos[p.slot] }));
    const DUR = hamCfg.dur, t0 = performance.now();
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

    // いま焼けている面の速さ(焼いていないときは0)
    const nowRate = p => p.st === 'cook1' ? hamRate(p.s1, sim - p.t1) : p.st === 'cook2' ? hamRate(p.s2, sim - p.t2) : 0;

    const step = dt => {
      ps.forEach(p => {
        if (p.st === 'wait' && sim >= p.enter) { p.st = 'cook1'; p.at = sim; p.t1 = sim; }
        if (p.st === 'cook1') p.a = Math.min(100, p.a + nowRate(p) * dt);
        if (p.st === 'cook2') p.b = Math.min(100, p.b + nowRate(p) * dt);
        if ((p.st === 'cook1' && p.a >= 100) || (p.st === 'cook2' && p.b >= 100)) { p.st = 'burnt'; p.at = sim; }
      });
      if (!ending && ps.every(p => p.st === 'plate' || p.st === 'burnt')) {
        ending = true;
        timers.push(setTimeout(finish, 700));         // お皿に乗る動きを見せてから終わる
      }
    };

    // ハンバーグ(上から見た形)。全体を1つの色で塗る
    const drawPatty = (x, y, r, d, sq) => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.12, r * 1.02, r * 0.92 * sq, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hamColor(d);
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.92 * sq, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
      ctx.stroke();
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
        const age = sim - p.at, pos = p.pos;
        if (p.st === 'wait') {                          // まだ乗っていない場所
          ctx.strokeStyle = 'rgba(242,244,255,0.15)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
          ctx.beginPath(); ctx.arc(pos.x, pos.y, pr, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
          return;
        }
        if (p.st === 'plate') {                         // お皿へ移る動き
          const f = Math.min(1, age / 0.35), e = 1 - (1 - f) * (1 - f);
          const x = pos.x + (pslot[i].x - pos.x) * e;
          const y = pos.y + (pslot[i].y - pos.y) * e - Math.sin(Math.PI * f) * pr;
          drawPatty(x, y, pr * (1 - 0.35 * e), p.b, 1 - 0.45 * e);
          return;
        }
        let x = pos.x, y = pos.y, sq = 1, col = p.a;   // 色 = いま焼けている下の面
        if (p.st === 'cook1' && age < 0.2) { y -= (1 - age / 0.2) * pr * 0.6; }
        if (p.st === 'cook2') {
          col = p.b;
          if (age < 0.3) {                              // ひっくり返す動き(前半は焼いた面、後半から生の面)
            const f = age / 0.3;
            sq = Math.max(0.08, Math.abs(Math.cos(Math.PI * f)));
            y -= Math.sin(Math.PI * f) * pr * 0.7;
            if (f < 0.5) col = p.a;
          }
        }
        if (p.st === 'burnt') col = 100;
        drawPatty(x, y, pr, col, sq);
        if (p.st === 'cook1' || p.st === 'cook2') {     // ジュージュー。速く焼けているほど粒が多く、速く動く
          const rate = nowRate(p);
          const n = Math.max(3, Math.min(18, Math.round(rate / 3)));
          const spin = 4 + rate * 0.3;
          ctx.fillStyle = 'rgba(255,230,160,0.6)';
          for (let k = 0; k < n; k++) {
            const an = k * (Math.PI * 2 / n) + Math.floor(sim * spin + k) * 0.7;
            const rr = 1.05 + ((k * 7) % 5) * 0.04;
            ctx.beginPath(); ctx.arc(x + Math.cos(an) * pr * rr, y + Math.sin(an) * pr * rr * 0.95, 2, 0, Math.PI * 2); ctx.fill();
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
        const d = Math.hypot(mx - p.pos.x, my - p.pos.y);
        if (d < bd) { bd = d; best = i; }
      });
      if (best < 0) return;
      const p = ps[best];
      if (sim < p.lock) return;                         // ひっくり返した直後の2度押しは無視
      if (p.st === 'cook1') { p.st = 'cook2'; p.at = sim; p.t2 = sim; p.lock = sim + 0.3; }
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

// リザルト用:3個を横から見た形で並べる(上半分=1面目、下半分=2面目)。下にお題の色
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
  const w = size * 0.27, h = size * 0.24, top = size * 0.2;
  // お皿(横から見た線)
  ctx.fillStyle = 'rgba(223,228,242,0.6)';
  rrect(ctx, size * 0.04, top + h + size * 0.02, size * 0.92, size * 0.035, size * 0.015); ctx.fill();
  for (let i = 0; i < 3; i++) {
    const f = fs[i] ? (Array.isArray(fs[i]) ? fs[i] : Object.values(fs[i])) : [0, 0];
    const x = size * (0.05 + i * 0.31);
    const rad = h * 0.42;
    ctx.globalAlpha = st[i] === 'n' ? 0.45 : 1;
    ctx.save();
    rrect(ctx, x, top, w, h, rad); ctx.clip();
    ctx.fillStyle = hamColor(Number(f[0]) || 0); ctx.fillRect(x, top, w, h / 2);
    ctx.fillStyle = hamColor(Number(f[1]) || 0); ctx.fillRect(x, top + h / 2, w, h / 2);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(242,244,255,0.5)'; ctx.lineWidth = Math.max(1, size * 0.012);
    rrect(ctx, x, top, w, h, rad); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, top + h / 2); ctx.lineTo(x + w, top + h / 2); ctx.stroke();
    if (st[i] === 'b' || st[i] === 'n') {                // 焦げ=赤い×、お皿に乗せていない=?
      ctx.fillStyle = st[i] === 'b' ? '#ff5c6c' : '#f2f4ff';
      ctx.font = `bold ${Math.round(size * 0.16)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(st[i] === 'b' ? '×' : '?', x + w / 2, top + h / 2);
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

/* ---------- だるまさんがころんだ! / 南インド風カレーを作ろう! ---------- */

GAMES.push(
  {
    id: 'daruma', title: 'だるまさんがころんだ!',
    desc: 'ボタンを押している間だけ歩くよ。長く押すほど速くなる!<br>でも速いときに離すと、ズザッと少し滑ってから止まる。<br>鬼が振り向いたときに動いていたら、バレてアウト!<br>15秒すぎても、鬼が言い終わるまではラストチャンス。鬼にタッチでゴール、近いほど上位。',
    lowerBetter: true, miss: 99,
    isMiss: v => v >= 99,
    fmt: (v, x) => {
      if (v >= 99) return '進んでない';
      if (v < 0) return 'ゴール! ' + (v + 100).toFixed(2) + '秒';
      return 'あと ' + v.toFixed(1) + 'm' + (x ? (x.c ? '(バレた!)' : '(時間切れ)') : '');
    },
    play: playDaruma,
    // リザルト用:スタートから鬼までの線と、自分のいた位置
    result: drawDarumaResult
  },
  {
    id: 'curry', title: '南インド風カレーを作ろう!',
    desc: '鍋に入るスパイスを、順番どおりに覚えよう!<br>そのあと棚から、入った順にタップして同じカレーを作る。<br>スパイスも順番も合っていれば2点、入っているけど順番ちがいは1点。<br>同じスパイスが2回入ることもあるよ!',
    lowerBetter: false, miss: 0,
    isMiss: v => v < 1,
    fmt: (v, x) => v < 1 ? '0点' : Math.floor(v) + '点' + (x && typeof x.h === 'number' ? '(◎' + x.h + ' ○' + x.b + ')' : ''),
    // タイトルホルダーは、満点(個数×2)に対する%で比べる。同じ%なら早く完成した人(小数の部分)
    rec: (v, x) => { const n = curryLen(x); return n ? Math.round(Math.floor(v) / (n * 2) * 1000) / 10 + (v - Math.floor(v)) / 100 : v; },
    recFmt: (v, x) => { const n = curryLen(x); return n ? Math.round(Math.floor(v) / (n * 2) * 100) + '%(' + Math.floor(v) + '/' + n * 2 + '点)' : Math.floor(v) + '点'; },
    play: playCurry,
    // リザルト用:正しいレシピと自分の答えを並べて、◎○×をつける
    result: drawCurryResult
  }
);

/* 結果の欄用の、横長のキャンバスを作る */
function wideCanvas(el, size, wr, hr) {
  size = size || 90;
  const w = Math.min(300, size * wr), h = size * hr;
  const dpr = window.devicePixelRatio || 1;
  const cv = document.createElement('canvas');
  cv.width = w * dpr; cv.height = h * dpr;
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  el.appendChild(cv);
  return { ctx, w, h };
}

/* ============================================================
   だるまさんがころんだ!
   ============================================================ */

// 難しさの設定(ここを変えると難しさが変わる)
function darumaCfg() {
  return {
    DIST: 15,       // 鬼までの距離(m)
    V0: 0.6,        // 押し始めの速さ(m/秒)
    VMAX: 2.0,      // いちばん速いとき(m/秒)
    RAMP: 1.5,      // V0 から VMAX になるまで押し続ける秒数
    SLIDE: 0.45,    // VMAX で離したときに滑る秒数(V0 なら滑らない。あいだは比例)
    GRACE: 0.2,     // 振り向いてからセーフの秒数
    DUR: 15,        // 制限時間(秒)。最後の「だるまさんがころんだ」はこれをまたぐ
    LAST_MIN: 15.3, LAST_MAX: 17.2,   // 最後の「だ!」の時刻のはんい(秒)
    LAST_WATCH: 0.6 // 最後に振り向いてから終わるまで(秒)。このあいだもバレ判定あり
  };
}

const DARUMA_TEXT = 'だるまさんがころんだ';

// 鬼の予定を最初に全部決めておく。種が同じなら全員同じ
// calls: [{ s: 言い始め, e: 振り向く時刻, w: 見張りが終わる時刻, ch: [各文字が出る時刻] }]
// 3回か4回言う。最後の1回は DUR(15秒)をまたいで言い切り、そのあと LAST_WATCH 秒見張って終わり
function darumaMake(seed) {
  const C = darumaCfg(), rnd = seededRng(seed);
  const n = rnd() < 0.5 ? 3 : 4;
  const say = [], watch = [];
  for (let i = 0; i < n; i++) {
    say.push(n === 3 ? 3 + rnd() : 2.2 + rnd() * 0.8);
    watch.push(n === 3 ? 1.8 + rnd() * 0.6 : 1.4 + rnd() * 0.5);
  }
  const t0 = 0.4;
  const target = C.LAST_MIN + rnd() * (C.LAST_MAX - C.LAST_MIN);   // 最後の「だ!」の時刻
  const sumAll = say.reduce((a, b) => a + b, 0) + watch.slice(0, -1).reduce((a, b) => a + b, 0);
  let k = (target - t0) / sumAll;                                  // 全部を同じ割合でのばす/ちぢめる
  // 最後の1回は、15秒より前に言い始める(15秒をまたぐ)
  const before = sumAll - say[n - 1];
  if (t0 + before * k > C.DUR - 0.4) k = (C.DUR - 0.4 - t0) / before;
  if (t0 + sumAll * k < C.LAST_MIN) k = (C.LAST_MIN - t0) / sumAll;
  const calls = [];
  let t = t0;
  for (let i = 0; i < n; i++) {
    const d = say[i] * k;
    // 言い方のクセ: 0=ふつう 1=だんだん早口 2=最初だけ早口 3=「ころん……だ!」とためる
    const type = Math.floor(rnd() * 4);
    let wts = Array.from(DARUMA_TEXT, () => 1);
    if (type === 1) wts = wts.map((_, j) => j < 5 ? 1.6 : 0.45);
    if (type === 2) wts = wts.map((_, j) => j < 5 ? 0.45 : 1.6);
    if (type === 3) wts = wts.map((_, j) => j === 9 ? 3.5 : 0.8);
    const sum = wts.reduce((a, b) => a + b, 0);
    const ch = [];
    let acc = 0;
    wts.forEach(wt => { ch.push(t + d * acc / sum); acc += wt; });
    const e = t + d;
    const w = i === n - 1 ? e + C.LAST_WATCH : e + watch[i] * k;
    calls.push({ s: t, e, w, ch, type });
    t = w;
  }
  return calls;
}

// いまの鬼のようす
function darumaState(calls, e) {
  for (let i = 0; i < calls.length; i++) {
    const c = calls[i];
    if (e < c.s) return { watching: false, since: 0, text: '' };
    if (e < c.e) {
      let n = 0;
      while (n < c.ch.length && c.ch[n] <= e) n++;
      return { watching: false, since: 0, text: DARUMA_TEXT.slice(0, n) };
    }
    if (e < c.w) return { watching: true, since: e - c.e, text: DARUMA_TEXT };
  }
  return { watching: false, since: 0, text: '' };
}

function playDaruma(stage, round, submit) {
  const game = GAMES.find(g => g.id === 'daruma');
  const C = darumaCfg();
  const calls = darumaMake(Math.round((round.delay || 3000) * 1000));
  const END = calls[calls.length - 1].w;                   // ゲームが終わる時刻(15〜18秒)
  const ACC = (C.VMAX - C.V0) / C.RAMP;                    // 押している間の加速

  countdown(stage, game, round, () => {
    stage.innerHTML =
      `<div class="center sub" id="top" style="font-size:18px;margin:2px 0">あと <b id="rem" style="color:#ffcc33;font-size:26px">${C.DIST.toFixed(1)}</b> m ・ 残り <b id="left">${C.DUR.toFixed(1)}</b> 秒<b id="last" style="color:#ff5c6c;margin-left:6px"></b></div>` +
      `<canvas id="pad" style="display:block;width:100%;height:47vh;margin-top:4px;touch-action:none"></canvas>` +
      `<div style="height:8px;margin:6px 18% 0;border-radius:4px;background:rgba(255,255,255,0.12);overflow:hidden"><div id="spd" style="height:100%;width:0;background:#35d07f"></div></div>` +
      `<div style="display:flex;justify-content:center;margin-top:8px;-webkit-tap-highlight-color:transparent">` +
      `<div id="walk" style="width:min(56vw,24vh);height:min(56vw,24vh);min-width:120px;min-height:120px;border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;font-size:22px;font-weight:800;line-height:1.3;background:#4c8dff;color:#fff;border:4px solid rgba(255,255,255,0.35);user-select:none;-webkit-user-select:none;touch-action:none">押して<br>歩く</div></div>`;
    const cv = stage.querySelector('#pad');
    const top = stage.querySelector('#top');
    const remEl = stage.querySelector('#rem');
    const leftEl = stage.querySelector('#left');
    const lastEl = stage.querySelector('#last');
    const spdEl = stage.querySelector('#spd');
    const walk = stage.querySelector('#walk');
    const dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    const oy = H * 0.38, sy = H * 0.93;          // 鬼の足もと・スタートの足もと(画面のy)
    const t0 = performance.now();
    const fingers = new Set();
    let pos = 0, v = 0, dec = 0, prevE = 0;      // 位置・速さ・滑っているときの減速
    let done = false, caught = false, goal = false, iv = null;
    const now = () => (performance.now() - t0) / 1000;
    const holding = () => fingers.size > 0;

    const look = () => {
      const on = holding() && !done;
      walk.style.background = done ? 'rgba(76,141,255,0.35)' : on ? '#ffcc33' : '#4c8dff';
      walk.style.color = on ? '#1a1f3a' : '#fff';
      walk.style.transform = on ? 'scale(0.95)' : '';
      walk.innerHTML = on ? '歩いてる…' : '押して<br>歩く';
    };

    const finish = (t, how) => {
      if (done) return;
      done = true;
      caught = how === 'caught'; goal = how === 'goal';
      const rem = Math.max(0, Math.round((C.DIST - pos) * 10) / 10);
      const data = { r: rem, g: goal ? 1 : 0, c: caught ? 1 : 0, t: Math.round(t * 100) / 100 };
      if (goal) top.innerHTML = '<b style="color:#ffcc33;font-size:24px">タッチ! ' + t.toFixed(2) + '秒</b>';
      else if (caught) top.innerHTML = '<b style="color:#ff5c6c;font-size:24px">バレた!</b> あと <b style="color:#ffcc33">' + rem.toFixed(1) + '</b> m';
      else top.innerHTML = '時間切れ! あと <b style="color:#ffcc33;font-size:24px">' + rem.toFixed(1) + '</b> m';
      look();
      draw(t);
      const v2 = goal ? Math.round((t - 100) * 100) / 100 : pos <= 0 ? 99 : rem;
      timers.push(setTimeout(() => submit(v2, data), 900));   // 演出を見せてから送る
    };

    // 時間を進める(速さ・位置・バレ判定)
    const step = e => {
      const dt = Math.max(0, Math.min(0.1, e - prevE));
      prevE = e;
      if (holding()) {
        if (v < C.V0) v = C.V0;
        v = Math.min(C.VMAX, v + ACC * dt);
        dec = 0;
      } else if (v > 0) {
        if (!dec) {                                           // 離した瞬間: 速さに合わせて滑る時間を決める
          const ts = C.SLIDE * (v - C.V0) / (C.VMAX - C.V0);
          if (ts <= 0.01) { v = 0; } else dec = v / ts;
        }
        if (dec) { v = Math.max(0, v - dec * dt); if (v === 0) dec = 0; }
      }
      pos += v * dt;
      if (pos >= C.DIST) { pos = C.DIST; finish(e, 'goal'); return; }
      const st = darumaState(calls, e);
      if (st.watching && st.since > C.GRACE && v > 0) { finish(e, 'caught'); return; }   // 見られているのに動いた
      if (e >= END) finish(END, 'time');
    };

    walk.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (done) return;
      try { walk.setPointerCapture(ev.pointerId); } catch (e) { }
      step(now());                                             // ここまでの分を先に進める
      fingers.add(ev.pointerId); look();
      if (!done) step(now());
    });
    const up = ev => {
      if (!fingers.has(ev.pointerId)) return;
      if (!done) step(now());
      fingers.delete(ev.pointerId); look();
    };
    walk.addEventListener('pointerup', up);
    walk.addEventListener('pointercancel', up);
    walk.addEventListener('lostpointercapture', up);
    walk.addEventListener('contextmenu', ev => ev.preventDefault());

    const draw = e => {
      ctx.clearRect(0, 0, W, H);
      const st = darumaState(calls, e);
      // 道
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath(); ctx.moveTo(W * 0.38, oy); ctx.lineTo(W * 0.62, oy); ctx.lineTo(W * 0.8, H); ctx.lineTo(W * 0.2, H); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,204,51,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(W * 0.25, sy); ctx.lineTo(W * 0.75, sy); ctx.stroke();
      // 木と鬼
      ctx.fillStyle = '#6b4a2e'; ctx.fillRect(W / 2 + H * 0.07, oy - H * 0.2, H * 0.035, H * 0.2);
      ctx.fillStyle = '#2f7a48'; ctx.beginPath(); ctx.arc(W / 2 + H * 0.087, oy - H * 0.2, H * 0.065, 0, Math.PI * 2); ctx.fill();
      drawDarumaOni(ctx, W / 2, oy, H * 0.2, st.watching || done && caught);
      // 鬼のことば
      const said = done ? (caught ? 'みーつけた!' : goal ? 'タッチされた!' : '') : st.text;
      if (said) {
        ctx.font = `bold ${Math.round(Math.min(26, W / 13))}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = st.watching || caught ? '#ff5c6c' : '#f2f4ff';
        ctx.fillText(said, W / 2, H * 0.06);
      }
      if (st.watching && !done) {                 // 見張り中は画面のふちを赤く
        ctx.strokeStyle = 'rgba(255,92,108,0.8)'; ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, W - 6, H - 6);
      }
      // 自分(遠くにいるほど小さく描く)
      const f = pos / C.DIST;
      const y = sy + (oy + H * 0.02 - sy) * f, sc = 1 - 0.45 * f;
      const kh = H * 0.17 * sc;
      const sliding = !holding() && v > 0 && !done;
      if (sliding) {                               // 滑っているときの土けむり
        ctx.fillStyle = 'rgba(214,190,150,0.55)';
        for (let i = 0; i < 4; i++) {
          const a = (e * 7 + i * 1.7) % 1;
          ctx.beginPath(); ctx.arc(W / 2 + (i % 2 ? 1 : -1) * kh * (0.18 + a * 0.35), y + kh * 0.04 - a * kh * 0.15, kh * (0.06 + a * 0.08), 0, Math.PI * 2); ctx.fill();
        }
      }
      drawDarumaKid(ctx, W / 2, y, kh, Math.floor(pos / 0.36), done && caught, goal, sliding);
    };

    const tick = () => {
      if (done) return;
      const e = now();
      step(e);
      if (done) return;
      remEl.textContent = Math.max(0, C.DIST - pos).toFixed(1);
      leftEl.textContent = Math.max(0, C.DUR - e).toFixed(1);
      lastEl.textContent = e >= C.DUR ? 'ラスト!' : '';
      spdEl.style.width = (v / C.VMAX * 100) + '%';
      spdEl.style.background = v >= C.VMAX - 0.01 ? '#ff5c6c' : v > (C.V0 + C.VMAX) / 2 ? '#ffcc33' : '#35d07f';
      draw(e);
    };
    look();
    draw(0);
    iv = setInterval(tick, 16);
    timers.push(iv);
  });
}

// 鬼(木の前に立つ子)。front が true なら振り向いて、こっちを見ている
function drawDarumaOni(ctx, x, yb, h, front) {
  const hr = h * 0.2;
  ctx.fillStyle = '#c0394b';                                         // 服
  rrect(ctx, x - h * 0.17, yb - h * 0.62, h * 0.34, h * 0.42, h * 0.08); ctx.fill();
  ctx.fillStyle = '#2b2f45';                                         // 足
  ctx.fillRect(x - h * 0.13, yb - h * 0.22, h * 0.1, h * 0.22);
  ctx.fillRect(x + h * 0.03, yb - h * 0.22, h * 0.1, h * 0.22);
  ctx.fillStyle = '#f2c9a0';                                         // 顔
  ctx.beginPath(); ctx.arc(x, yb - h * 0.62 - hr * 0.9, hr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  const cy = yb - h * 0.62 - hr * 0.9;
  if (front) {
    ctx.beginPath(); ctx.arc(x, cy - hr * 0.2, hr, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();   // 前髪
    ctx.fillStyle = '#ff5c6c';
    ctx.beginPath(); ctx.arc(x - hr * 0.38, cy + hr * 0.1, hr * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + hr * 0.38, cy + hr * 0.1, hr * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(x, cy + hr * 0.55, hr * 0.15, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(x, cy, hr * 1.02, Math.PI * 0.85, Math.PI * 2.15); ctx.fill();      // 後ろ頭
    ctx.fillStyle = '#c0394b';                                       // 木に当てた腕
    ctx.fillRect(x + h * 0.12, yb - h * 0.8, h * 0.07, h * 0.25);
  }
}

// 自分。steps で足を交互に動かす。trip ならつまずいて傾く、slide なら滑っていて足をふんばる
function drawDarumaKid(ctx, x, yb, h, steps, trip, goal, slide) {
  ctx.save();
  ctx.translate(x, yb);
  if (trip) ctx.rotate(0.5);
  else if (slide) ctx.rotate(-0.18);
  const sw = steps % 2 ? 1 : -1, hr = h * 0.2;
  ctx.strokeStyle = '#2b2f45'; ctx.lineWidth = Math.max(2, h * 0.1); ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-h * 0.06, -h * 0.4); ctx.lineTo(-h * 0.06 + sw * h * 0.1, 0);
  ctx.moveTo(h * 0.06, -h * 0.4); ctx.lineTo(h * 0.06 - sw * h * 0.1, 0);
  ctx.stroke();
  ctx.fillStyle = '#4c8dff';
  rrect(ctx, -h * 0.17, -h * 0.82, h * 0.34, h * 0.45, h * 0.08); ctx.fill();
  ctx.strokeStyle = '#4c8dff'; ctx.lineWidth = Math.max(2, h * 0.08);
  ctx.beginPath();
  if (goal) { ctx.moveTo(-h * 0.15, -h * 0.75); ctx.lineTo(-h * 0.3, -h * 1.15); ctx.moveTo(h * 0.15, -h * 0.75); ctx.lineTo(h * 0.3, -h * 1.15); }
  else { ctx.moveTo(-h * 0.17, -h * 0.75); ctx.lineTo(-h * 0.3 * sw, -h * 0.45); ctx.moveTo(h * 0.17, -h * 0.75); ctx.lineTo(h * 0.3 * sw, -h * 0.45); }
  ctx.stroke();
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath(); ctx.arc(0, -h * 0.82 - hr * 0.9, hr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a2a1e';                                         // 後ろ頭(鬼の方を向いている)
  ctx.beginPath(); ctx.arc(0, -h * 0.82 - hr * 0.9, hr * 1.02, Math.PI * 0.85, Math.PI * 2.15); ctx.fill();
  ctx.restore();
}

// リザルト用:スタート(左)から鬼(右)までの線に、自分のいた位置を描く
function drawDarumaResult(el, data, size) {
  const { ctx, w, h } = wideCanvas(el, size, 2.4, 0.5);
  if (!data) return;
  const C = darumaCfg();
  const x0 = w * 0.08, x1 = w * 0.86, y = h * 0.62;
  const f = Math.max(0, Math.min(1, 1 - (Number(data.r) || 0) / C.DIST));
  ctx.strokeStyle = 'rgba(242,244,255,0.3)'; ctx.lineWidth = Math.max(2, h * 0.06); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  const col = data.g ? '#ffcc33' : data.c ? '#ff5c6c' : '#f2f4ff';
  ctx.strokeStyle = col;
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + (x1 - x0) * f, y); ctx.stroke();
  ctx.fillStyle = '#c0394b';                                          // 鬼
  ctx.beginPath(); ctx.arc(x1 + h * 0.05, y - h * 0.08, h * 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col;                                                // 自分
  ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * f, y, h * 0.11, 0, Math.PI * 2); ctx.fill();
  ctx.font = `bold ${Math.round(h * 0.22)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(data.g ? 'タッチ!' : data.c ? 'バレた!' : '時間切れ', w / 2, h * 0.2);
}

/* ============================================================
   南インド風カレーを作ろう!
   ============================================================ */

// スパイス12種類。s=絵の種類 c=色
const CURRY_SPICES = [
  { n: 'マスタードシード', short: 'マスタード', s: 'seed', c: '#2b2523' },
  { n: 'クミン', short: 'クミン', s: 'cumin', c: '#8a6a3c' },
  { n: 'カレーリーフ', short: 'カレーリーフ', s: 'leaf', c: '#3f9a46' },
  { n: '赤唐辛子', short: '赤唐辛子', s: 'chili', c: '#d8352a' },
  { n: 'ターメリック', short: 'ターメリック', s: 'powder', c: '#f2b51c' },
  { n: 'コリアンダー', short: 'コリアンダー', s: 'ball', c: '#b8925a' },
  { n: 'フェヌグリーク', short: 'フェヌグリーク', s: 'cube', c: '#c99a3a' },
  { n: 'ヒング', short: 'ヒング', s: 'powder', c: '#e8dcc0' },
  { n: 'カルダモン', short: 'カルダモン', s: 'pod', c: '#8fb35a' },
  { n: 'シナモン', short: 'シナモン', s: 'stick', c: '#9a5a32' },
  { n: 'クローブ', short: 'クローブ', s: 'clove', c: '#4a2d22' },
  { n: '黒こしょう', short: '黒こしょう', s: 'pepper', c: '#1e1c1c' }
];

// 補足データからレシピの個数を出す(Firebaseから配列がオブジェクトで返ることもある)
const curryLen = x => { const r = x && x.r; return r ? (Array.isArray(r) ? r.length : Object.keys(r).length) : 0; };

// 時間の設定(ここを変えると難しさが変わる)
function curryCfg() {
  return { SHOW: 0.7, PAUSE: 0.5, ANS: 10 };    // 1つ見せる秒数・答える前の間・答える秒数
}

// レシピ(スパイスの番号の並び)。6〜8個、半分くらいの確率で同じスパイスが2回入る
function curryMake(seed) {
  const rnd = seededRng(seed);
  const n = 6 + Math.floor(rnd() * 3), dup = rnd() < 0.5;
  const pool = CURRY_SPICES.map((_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const r = pool.slice(0, dup ? n - 1 : n);
  if (dup) {
    const a = Math.floor(rnd() * r.length);              // 2回目を入れるスパイス
    let p, tries = 0;                                    // となりには入れない(すぐバレるので)
    do { p = Math.floor(rnd() * (r.length + 1)); tries++; } while ((p === a || p === a + 1) && tries < 50);
    r.splice(p, 0, r[a]);
  }
  return r;
}

// 採点。marks: 答えの各枠の判定(2=◎ 1=○ 0=×)
function curryScore(rec, ans) {
  const marks = ans.map((a, i) => (a === rec[i] ? 2 : 0));
  const rest = {};
  rec.forEach((r, i) => { if (ans[i] !== r) rest[r] = (rest[r] || 0) + 1; });
  ans.forEach((a, i) => { if (marks[i] === 0 && rest[a] > 0) { marks[i] = 1; rest[a]--; } });
  const h = marks.filter(m => m === 2).length, b = marks.filter(m => m === 1).length;
  return { h, b, pts: h * 2 + b, marks };
}

// 小皿にのせたスパイス(黒っぽいスパイスも見えるように、明るい皿を敷く)
function drawSpiceDish(ctx, i, cx, cy, r) {
  ctx.fillStyle = '#ece4d4';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9bfa9'; ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2); ctx.stroke();
  drawSpice(ctx, i, cx, cy + r * 0.05, r * 0.72);
}

// スパイスの絵を1つ描く(cx, cy が真ん中、r が大きさ)
function drawSpice(ctx, i, cx, cy, r) {
  const sp = CURRY_SPICES[i]; if (!sp) return;
  const rnd = seededRng(i * 97 + 13);
  ctx.save();
  ctx.fillStyle = sp.c; ctx.strokeStyle = sp.c;
  const dots = (k, rr, shape) => {
    for (let j = 0; j < k; j++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.72;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.8;
      ctx.beginPath();
      if (shape === 'cumin') ctx.ellipse(x, y, rr * 1.9, rr * 0.6, rnd() * 3, 0, Math.PI * 2);
      else if (shape === 'cube') ctx.rect(x - rr, y - rr * 0.8, rr * 2, rr * 1.6);
      else ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
      if (shape === 'ball') { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(0.5, rr * 0.25); ctx.beginPath(); ctx.arc(x, y, rr * 0.6, 0, Math.PI); ctx.stroke(); }
    }
  };
  if (sp.s === 'seed') dots(22, r * 0.09);
  else if (sp.s === 'pepper') { dots(9, r * 0.17); ctx.fillStyle = 'rgba(255,255,255,0.18)'; }
  else if (sp.s === 'cumin') dots(14, r * 0.11, 'cumin');
  else if (sp.s === 'ball') dots(10, r * 0.15, 'ball');
  else if (sp.s === 'cube') dots(16, r * 0.09, 'cube');
  else if (sp.s === 'powder') {
    ctx.beginPath(); ctx.moveTo(cx - r * 0.85, cy + r * 0.45);
    ctx.quadraticCurveTo(cx, cy - r * 0.9, cx + r * 0.85, cy + r * 0.45); ctx.closePath(); ctx.fill();
  } else if (sp.s === 'leaf') {
    [[-0.35, 0, -0.5], [0.3, -0.15, 0.6], [0, 0.25, 0.1]].forEach(([fx, fy, a]) => {
      ctx.save(); ctx.translate(cx + fx * r, cy + fy * r); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.45, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(0.5, r * 0.04);
      ctx.beginPath(); ctx.moveTo(-r * 0.4, 0); ctx.lineTo(r * 0.4, 0); ctx.stroke();
      ctx.restore();
    });
  } else if (sp.s === 'chili') {
    [[-0.25, -0.3], [0.25, 0.25]].forEach(([fx, a]) => {
      ctx.save(); ctx.translate(cx + fx * r, cy); ctx.rotate(a + 0.8);
      ctx.fillStyle = sp.c; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.62, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3f9a46'; ctx.fillRect(-r * 0.72, -r * 0.08, r * 0.16, r * 0.16);
      ctx.restore();
    });
  } else if (sp.s === 'pod') {
    [[-0.3, -0.2, 0.5], [0.3, 0.1, -0.4], [0, 0.3, 1.4]].forEach(([fx, fy, a]) => {
      ctx.save(); ctx.translate(cx + fx * r, cy + fy * r); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.35, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(0.5, r * 0.04);
      ctx.beginPath(); ctx.moveTo(-r * 0.3, 0); ctx.lineTo(r * 0.3, 0); ctx.stroke();
      ctx.restore();
    });
  } else if (sp.s === 'stick') {
    [[-0.2, -0.2], [0.2, 0.15]].forEach(([fy, a]) => {
      ctx.save(); ctx.translate(cx, cy + fy * r); ctx.rotate(a);
      rrect(ctx, -r * 0.75, -r * 0.13, r * 1.5, r * 0.26, r * 0.1); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = Math.max(0.5, r * 0.04);
      ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.lineTo(r * 0.7, 0); ctx.stroke();
      ctx.restore();
    });
  } else if (sp.s === 'clove') {
    [[-0.35, -0.1, -0.4], [0.05, 0.1, 0.3], [0.4, -0.15, 0.9]].forEach(([fx, fy, a]) => {
      ctx.save(); ctx.translate(cx + fx * r, cy + fy * r); ctx.rotate(a);
      ctx.fillRect(-r * 0.05, -r * 0.2, r * 0.1, r * 0.55);
      ctx.beginPath(); ctx.arc(0, -r * 0.27, r * 0.13, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }
  ctx.restore();
}

function playCurry(stage, round, submit) {
  const game = GAMES.find(g => g.id === 'curry');
  const C = curryCfg();
  const rec = curryMake(Math.round((round.delay || 3000) * 1000));
  const N = rec.length;

  countdown(stage, game, round, () => {
    stage.innerHTML =
      `<div class="center sub" id="info" style="font-size:18px;margin:2px 0">よく見て覚えて! <b id="cnt" style="color:#ffcc33">0/${N}</b></div>` +
      `<canvas id="pot" style="display:block;width:100%;height:20vh;touch-action:none"></canvas>` +
      `<div id="area" style="display:flex;flex-direction:column;gap:8px"></div>`;
    const info = stage.querySelector('#info');
    const area = stage.querySelector('#area');
    const pot = stage.querySelector('#pot');
    const dpr = window.devicePixelRatio || 1;
    const prc = pot.getBoundingClientRect();
    const W = prc.width, H = prc.height;
    pot.width = W * dpr; pot.height = H * dpr;
    const ctx = pot.getContext('2d');
    ctx.scale(dpr, dpr);

    const t0 = performance.now();
    const showEnd = N * C.SHOW + C.PAUSE;
    let phase = 'show', ans = [], done = false, ansT0 = 0, iv = null;
    let sbox = null, cnt = stage.querySelector('#cnt'), shown = -1;
    // 覚えるあいだは、いま入ったスパイスを大きく見せる
    area.innerHTML = `<div class="center"><div id="big" style="display:inline-block"></div><div id="bigname" style="font-size:30px;font-weight:800;color:#ffcc33;min-height:42px"></div></div>`;
    const showCard = k => {
      const big = area.querySelector('#big'); if (!big) return;
      big.innerHTML = '';
      if (k < N) { big.appendChild(icon(rec[k], 130)); area.querySelector('#bigname').textContent = CURRY_SPICES[rec[k]].n; }
      else { area.querySelector('#bigname').textContent = ''; }
    };

    const drawPot = (e) => {
      ctx.clearRect(0, 0, W, H);
      const px = W / 2, py = H * 0.72, pw = Math.min(W * 0.36, H * 0.75);
      // 鍋の中身
      ctx.fillStyle = '#8a4b1e';
      ctx.beginPath(); ctx.ellipse(px, py - H * 0.18, pw, H * 0.09, 0, 0, Math.PI * 2); ctx.fill();
      if (phase === 'show') {
        const k = Math.floor(e / C.SHOW), f = (e - k * C.SHOW) / C.SHOW;
        if (k < N) {
          // スパイスが鍋に落ちる
          const y = H * 0.12 + (py - H * 0.3 - H * 0.12) * Math.min(1, f / 0.55);
          if (f < 0.75) drawSpice(ctx, rec[k], px, y, H * 0.2);
        }
      }
      // 鍋
      ctx.fillStyle = '#3a3f4f';
      ctx.beginPath(); ctx.moveTo(px - pw, py - H * 0.18);
      ctx.lineTo(px - pw * 0.88, py + H * 0.18); ctx.lineTo(px + pw * 0.88, py + H * 0.18); ctx.lineTo(px + pw, py - H * 0.18);
      ctx.ellipse(px, py - H * 0.18, pw, H * 0.09, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.fillRect(px - pw - H * 0.12, py - H * 0.14, H * 0.12, H * 0.06);
      ctx.fillRect(px + pw, py - H * 0.14, H * 0.12, H * 0.06);
      // 湯気
      ctx.strokeStyle = 'rgba(242,244,255,0.18)'; ctx.lineWidth = 3;
      for (let j = -1; j <= 1; j++) {
        const x = px + j * pw * 0.45, ph = e * 3 + j;
        ctx.beginPath(); ctx.moveTo(x, py - H * 0.3);
        ctx.quadraticCurveTo(x + Math.sin(ph) * 10, py - H * 0.42, x, py - H * 0.55); ctx.stroke();
      }
    };

    const icon = (i, sz) => {
      const c = document.createElement('canvas');
      c.width = sz * dpr; c.height = sz * dpr;
      c.style.width = sz + 'px'; c.style.height = sz + 'px'; c.style.pointerEvents = 'none';
      const x = c.getContext('2d'); x.scale(dpr, dpr);
      drawSpiceDish(x, i, sz / 2, sz / 2, sz * 0.47);
      return c;
    };

    const renderSlots = () => {
      sbox.innerHTML = '';
      const sz = Math.min(42, Math.floor((W - 8 * N) / N));
      for (let i = 0; i < N; i++) {
        const d = document.createElement('div');
        d.style.cssText = `width:${sz}px;height:${sz}px;border-radius:8px;border:2px ${ans[i] === undefined ? 'dashed rgba(242,244,255,0.3)' : 'solid #ffcc33'};background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center`;
        if (ans[i] !== undefined) d.appendChild(icon(ans[i], sz - 6));
        sbox.appendChild(d);
      }
      undo.style.opacity = ans.length && !done ? '1' : '0.35';
      okb.disabled = ans.length < N || done;
    };

    let undo = null, okb = null;
    const startAnswer = () => {
      phase = 'answer'; ansT0 = performance.now();
      info.innerHTML = `入った順にタップ! ・ 残り <b id="left">${C.ANS.toFixed(1)}</b> 秒`;
      area.innerHTML =
        `<div id="slots" style="display:flex;gap:6px;justify-content:center"></div>` +
        `<div id="shelf" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;-webkit-tap-highlight-color:transparent"></div>` +
        `<div style="display:flex;gap:10px"><button class="btn sub" id="undo" style="padding:12px">↶ 1つ戻る</button><button class="btn" id="okb" style="padding:12px" disabled>完成!</button></div>`;
      sbox = area.querySelector('#slots');
      undo = area.querySelector('#undo'); okb = area.querySelector('#okb');
      const shelf = area.querySelector('#shelf');
      CURRY_SPICES.forEach((sp, i) => {
        const b = document.createElement('div');
        b.dataset.i = i;
        b.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 2px;border-radius:10px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.18);font-size:10.5px;font-weight:700;line-height:1.2;color:#f2f4ff;user-select:none;-webkit-user-select:none;touch-action:manipulation;white-space:nowrap;overflow:hidden';
        b.appendChild(icon(i, 34));
        const t = document.createElement('span'); t.textContent = sp.short; t.style.pointerEvents = 'none';
        b.appendChild(t);
        shelf.appendChild(b);
      });
      shelf.addEventListener('pointerdown', ev => {
        ev.preventDefault();
        const b = ev.target.closest('[data-i]');
        if (done || !b || ans.length >= N) return;
        ans.push(+b.dataset.i);
        b.style.background = 'rgba(255,204,51,0.35)';
        timers.push(setTimeout(() => { b.style.background = 'rgba(255,255,255,0.1)'; }, 120));
        renderSlots();
      });
      undo.addEventListener('pointerdown', ev => { ev.preventDefault(); if (done || !ans.length) return; ans.pop(); renderSlots(); });
      okb.addEventListener('pointerdown', ev => { ev.preventDefault(); if (done || ans.length < N) return; finish(); });
      renderSlots();
    };

    const finish = () => {
      if (done) return;
      done = true;
      const rest = Math.max(0, C.ANS - (performance.now() - ansT0) / 1000);
      const sc = curryScore(rec, ans);
      const frac = Math.round(0.9 * rest / C.ANS * 100) / 100;
      info.innerHTML = `<b style="color:#ffcc33;font-size:22px">${sc.pts}点</b>(◎${sc.h} ○${sc.b})`;
      renderSlots();
      submit(sc.pts > 0 ? sc.pts + frac : 0, { r: rec, a: ans.slice(), h: sc.h, b: sc.b });
    };

    drawPot(0);
    iv = setInterval(() => {
      const e = (performance.now() - t0) / 1000;
      if (phase === 'show') {
        const k = Math.floor(e / C.SHOW);
        cnt.textContent = Math.min(N, k + 1) + '/' + N;
        if (k !== shown) { shown = k; showCard(k); }
        if (e >= showEnd) startAnswer();
      } else if (!done) {
        const rest = C.ANS - (performance.now() - ansT0) / 1000;
        const l = stage.querySelector('#left');
        if (l) l.textContent = Math.max(0, rest).toFixed(1);
        if (rest <= 0) finish();                  // 時間切れ:入っている分で採点
      }
      drawPot(e);
    }, 30);
    timers.push(iv);
  });
}

// リザルト用:上の段=正しいレシピ、下の段=自分の答えと◎○×
function drawCurryResult(el, data, size) {
  const { ctx, w, h } = wideCanvas(el, size, 2.6, 0.62);
  if (!data) return;
  const arr = v => (Array.isArray(v) ? v : v ? Object.values(v) : []).map(Number);
  const rec = arr(data.r), ans = arr(data.a), N = rec.length;
  if (!N) return;
  const marks = curryScore(rec, ans).marks;
  const cell = Math.min(w / N, h * 0.4), r = cell * 0.42;
  const x0 = (w - cell * N) / 2;
  for (let i = 0; i < N; i++) {
    const cx = x0 + cell * (i + 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(cx - cell * 0.46, h * 0.02, cell * 0.92, cell * 0.92);
    drawSpiceDish(ctx, rec[i], cx, h * 0.02 + cell * 0.46, r);
    const m = i < ans.length ? marks[i] : 0;
    ctx.strokeStyle = m === 2 ? '#ffcc33' : m === 1 ? '#35d07f' : 'rgba(255,92,108,0.7)';
    ctx.lineWidth = Math.max(1.5, cell * 0.05);
    ctx.strokeRect(cx - cell * 0.46, h * 0.02 + cell, cell * 0.92, cell * 0.92);
    if (i < ans.length) drawSpiceDish(ctx, ans[i], cx, h * 0.02 + cell * 1.46, r);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = `bold ${Math.round(cell * 0.4)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(m === 2 ? '◎' : m === 1 ? '○' : '×', cx, h * 0.02 + cell * 2);
  }
}

/* ============================================================
   キレイに書けるかな?
   国語ノートの十字マスに、お題のひらがな・カタカナを1文字書く。
   お手本の線データとくらべて、形・大きさ・位置・画数・書き順・なめらかさで100点満点
   ============================================================ */

// お手本の線(0〜100の座標。x:右、y:下)。同じ点を2回続けると、そこは角(とがる)
// 1画 = 点の列。線はなめらかにつないで描く
const KANA_DATA = [
  // ひらがな
  ['あ', [[[22, 30], [72, 26]], [[44, 14], [45, 40], [47, 62], [50, 84]], [[66, 42], [58, 60], [45, 74], [32, 80], [24, 72], [28, 60], [45, 52], [62, 52], [76, 60], [80, 72], [72, 82], [60, 86]]]],
  ['い', [[[28, 24], [26, 45], [28, 64], [33, 76], [38, 74]], [[66, 34], [74, 46], [78, 60]]]],
  ['う', [[[38, 14], [58, 20]], [[30, 40], [48, 34], [64, 36], [70, 48], [64, 64], [52, 78], [40, 88]]]],
  ['く', [[[64, 14], [36, 50], [36, 50], [64, 86]]]],
  ['こ', [[[30, 28], [64, 26], [64, 26], [57, 34]], [[28, 66], [36, 76], [56, 78], [72, 74]]]],
  ['し', [[[38, 14], [37, 50], [40, 72], [50, 80], [64, 76], [74, 64]]]],
  ['つ', [[[18, 44], [42, 36], [62, 34], [78, 42], [80, 56], [68, 70], [50, 78]]]],
  ['て', [[[20, 28], [50, 24], [76, 20], [76, 20], [56, 30], [44, 44], [42, 62], [50, 76], [64, 82]]]],
  ['の', [[[52, 30], [44, 52], [34, 72], [24, 76], [18, 64], [22, 44], [38, 30], [56, 26], [74, 34], [82, 52], [76, 70], [58, 82]]]],
  ['へ', [[[14, 58], [34, 36], [34, 36], [48, 46], [64, 60], [86, 76]]]],
  ['も', [[[46, 14], [42, 40], [40, 62], [44, 78], [56, 82], [66, 74], [70, 62]], [[24, 34], [66, 32]], [[22, 54], [64, 52]]]],
  ['ろ', [[[30, 22], [64, 20], [64, 20], [36, 50], [36, 50], [50, 46], [68, 50], [76, 62], [70, 76], [54, 84], [38, 82]]]],
  ['る', [[[30, 22], [64, 20], [64, 20], [36, 50], [36, 50], [50, 46], [68, 50], [76, 62], [70, 76], [54, 84], [40, 82], [38, 72], [48, 68], [56, 76]]]],
  ['ね', [[[34, 14], [34, 50], [34, 86]], [[16, 34], [42, 30], [42, 30], [22, 66], [16, 80], [36, 58], [56, 46], [72, 52], [76, 68], [70, 80], [58, 84], [52, 76], [60, 70], [70, 74], [80, 82]]]],
  ['め', [[[30, 30], [42, 52], [52, 74]], [[62, 16], [54, 44], [40, 70], [28, 80], [20, 72], [24, 56], [42, 44], [62, 44], [78, 54], [78, 70], [66, 80], [56, 84]]]],
  // カタカナ
  ['ア', [[[20, 24], [78, 22], [78, 22], [70, 34], [58, 46]], [[46, 38], [46, 58], [40, 74], [28, 86]]]],
  ['イ', [[[60, 14], [44, 36], [20, 58]], [[46, 40], [46, 88]]]],
  ['ウ', [[[50, 12], [50, 26]], [[24, 26], [24, 44]], [[24, 28], [76, 28], [76, 28], [72, 52], [60, 72], [42, 86]]]],
  ['エ', [[[24, 26], [76, 26]], [[50, 26], [50, 76]], [[16, 78], [84, 78]]]],
  ['カ', [[[20, 36], [72, 34], [72, 34], [70, 56], [64, 76], [54, 86]], [[46, 14], [44, 48], [36, 70], [22, 86]]]],
  ['キ', [[[22, 34], [76, 28]], [[18, 56], [82, 50]], [[44, 14], [50, 50], [56, 88]]]],
  ['ク', [[[40, 14], [30, 32], [18, 46]], [[34, 26], [76, 26], [76, 26], [70, 50], [56, 70], [32, 88]]]],
  ['コ', [[[24, 26], [74, 26], [74, 26], [74, 74]], [[24, 74], [74, 74]]]],
  ['サ', [[[16, 38], [84, 38]], [[34, 18], [34, 64]], [[64, 16], [64, 56], [56, 74], [40, 88]]]],
  ['ス', [[[22, 24], [72, 24], [72, 24], [58, 48], [40, 68], [18, 86]], [[54, 58], [72, 72], [84, 86]]]],
  ['ト', [[[40, 12], [40, 88]], [[42, 42], [68, 56]]]],
  ['ノ', [[[70, 14], [60, 44], [44, 68], [22, 86]]]],
  ['ミ', [[[30, 18], [66, 28]], [[34, 42], [62, 50]], [[26, 66], [74, 82]]]],
  ['ム', [[[46, 14], [34, 46], [22, 78], [22, 78], [76, 72]], [[62, 54], [72, 68], [80, 84]]]],
  ['ロ', [[[24, 24], [24, 78]], [[24, 24], [76, 24], [76, 24], [76, 78]], [[24, 76], [76, 76]]]]
];

const kanaCfg = {
  DUR: 15,          // 制限時間(秒)
  // 点数の配分(合計100)
  P_SHAPE: 40, P_SIZE: 15, P_POS: 15, P_COUNT: 10, P_ORDER: 10, P_SMOOTH: 10,
  // 形: 線どうしのずれ(マスの幅=1)が SHAPE_OK 以下なら満点、SHAPE_OK+SHAPE_RANGE で0点
  SHAPE_OK: 0.008, SHAPE_RANGE: 0.067,
  SIZE_FREE: 0.08, SIZE_RANGE: 0.55,  // 大きさ: |log(自分/お手本)| がこれ以下で満点 / この分で0点
  POS_OK: 0.025, POS_RANGE: 0.17,     // 位置: 中心のずれ
  SMOOTH_OK: 0.0004, SMOOTH_RANGE: 0.0014, // なめらかさ: ふるえの大きさ(真ん中の値)
  INK: 0.075,       // お手本の線の太さ(マスの幅に対して)
  PEN: 0.05         // 書くときの線の太さ
};

// お題を決める。種が同じなら全員同じ
function kanaPick(seed) {
  const rnd = seededRng(seed);
  rnd(); rnd();
  return Math.floor(rnd() * KANA_DATA.length);
}

// 点の列(0〜1)をなめらかな線にして、細かい点の列にする。同じ点が続いたところは角
function kanaSmooth(pts) {
  const out = [];
  const pieces = [[]];
  pts.forEach((p, i) => {
    const prev = pts[i - 1];
    if (prev && prev[0] === p[0] && prev[1] === p[1]) { pieces.push([p]); return; }
    pieces[pieces.length - 1].push(p);
  });
  pieces.forEach(pc => {
    if (pc.length === 1) { out.push(pc[0]); return; }
    for (let i = 0; i < pc.length - 1; i++) {
      const p0 = pc[Math.max(0, i - 1)], p1 = pc[i], p2 = pc[i + 1], p3 = pc[Math.min(pc.length - 1, i + 2)];
      for (let k = 0; k < 8; k++) {                         // Catmull-Rom
        const t = k / 8, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    out.push(pc[pc.length - 1]);
  });
  return out;
}
// お手本の各画(0〜1の細かい点の列)
const kanaRef = (() => {
  const cache = {};
  return i => cache[i] || (cache[i] = KANA_DATA[i][1].map(st => kanaSmooth(st.map(p => [p[0] / 100, p[1] / 100]))));
})();

// 線を、だいたい d ごとの点に並べ直す
function kanaResample(pts, d) {
  if (!pts.length) return [];
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    let [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    let seg = Math.hypot(x1 - x0, y1 - y0);
    if (seg === 0) continue;
    let pos = d - carry;
    while (pos <= seg) {
      const t = pos / seg;
      out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      pos += d;
    }
    carry = seg - (pos - d);
  }
  const last = pts[pts.length - 1], lo = out[out.length - 1];
  if (Math.hypot(last[0] - lo[0], last[1] - lo[1]) > d * 0.3) out.push(last);
  return out;
}

function kanaBox(strokes) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  strokes.forEach(s => s.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }));
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, size: Math.max(x1 - x0, y1 - y0, 0.02) };
}
// 字の外わくの中心を(0.5,0.5)、大きさを0.7にそろえる(形だけをくらべるため)
function kanaNorm(strokes, box) {
  const k = 0.7 / box.size;
  return strokes.map(s => s.map(([x, y]) => [0.5 + (x - box.cx) * k, 0.5 + (y - box.cy) * k]));
}
// a の点から b の点までの、いちばん近い距離の平均
function kanaNear(a, b) {
  if (!a.length || !b.length) return 1;
  let sum = 0;
  for (const p of a) {
    let m = 1e9;
    for (const q of b) { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (d < m) m = d; }
    sum += Math.sqrt(m);
  }
  return sum / a.length;
}
const kanaClamp = v => Math.max(0, Math.min(1, v));

// 採点。user = 画の配列(各画は 0〜1 の [x,y] の列)
// 返す値: { total, sc: [形, 大きさ, 位置, 画数, 書き順, なめらかさ] }
function kanaScore(ci, user) {
  const C = kanaCfg;
  const ref = kanaRef(ci);
  user = user.filter(s => s.length);
  if (!user.length) return { total: 0, sc: [0, 0, 0, 0, 0, 0] };
  const SP = 0.012;
  // 点だけの画(タップ)も、小さな線として扱う
  const uR = user.map(s => s.length === 1 ? [s[0], [s[0][0] + 0.004, s[0][1] + 0.004]] : s).map(s => kanaResample(s, SP));
  const rR = ref.map(s => kanaResample(s, SP));
  const uBox = kanaBox(uR), rBox = kanaBox(rR);
  const uN = kanaNorm(uR, uBox), rN = kanaNorm(rR, rBox);
  const uAll = [].concat(...uN), rAll = [].concat(...rN);
  // 形: おたがいの線にどれだけ近いか(両方向の大きい方。らくがきで全体をぬりつぶしてもダメ)
  const dist = Math.max(kanaNear(uAll, rAll), kanaNear(rAll, uAll));
  const fShape = kanaClamp(1 - (dist - C.SHAPE_OK) / C.SHAPE_RANGE);
  // 大きさ・位置
  const fSize = kanaClamp(1 - (Math.abs(Math.log(uBox.size / rBox.size)) - C.SIZE_FREE) / C.SIZE_RANGE);
  const fPos = kanaClamp(1 - (Math.hypot(uBox.cx - rBox.cx, uBox.cy - rBox.cy) - C.POS_OK) / C.POS_RANGE);
  // 画数
  const n = uN.length, m = rN.length;
  const fCount = n === m ? 1 : Math.abs(n - m) === 1 ? 0.5 : 0;
  // 書き順と向き: i画目が、お手本の i画目にいちばん近くて、書き始めがお手本の書き始め側なら正解
  let ord = 0;
  for (let i = 0; i < Math.min(n, m); i++) {
    const u = uN[i];
    let best = -1, bd = 1e9;
    rN.forEach((r, j) => { const d = (kanaNear(u, r) + kanaNear(r, u)) / 2; if (d < bd) { bd = d; best = j; } });
    if (best === i) ord += 0.5;
    const r = rN[i], us = u[0], ue = u[u.length - 1], rs = r[0], re = r[r.length - 1];
    const same = Math.hypot(us[0] - rs[0], us[1] - rs[1]) + Math.hypot(ue[0] - re[0], ue[1] - re[1]);
    const swap = Math.hypot(us[0] - re[0], us[1] - re[1]) + Math.hypot(ue[0] - rs[0], ue[1] - rs[1]);
    if (same <= swap) ord += 0.5;
  }
  const fOrder = ord / Math.max(n, m);
  // なめらかさ: 線を少しならした形と、どれだけずれているか(ふるえ)。角で点が下がらないように真ん中の値を使う
  const js = [];
  user.forEach(s => {
    const r = kanaResample(s, 0.006);
    for (let i = 2; i < r.length - 2; i++) {
      let ax = 0, ay = 0;
      for (let k = -2; k <= 2; k++) { ax += r[i + k][0]; ay += r[i + k][1]; }
      js.push(Math.hypot(r[i][0] - ax / 5, r[i][1] - ay / 5));
    }
  });
  js.sort((a, b) => a - b);
  const fSmooth = js.length ? kanaClamp(1 - (js[js.length >> 1] - C.SMOOTH_OK) / C.SMOOTH_RANGE) : 1;
  // 形が大きくちがう(別の字・らくがき)ときは、ほかの項目も減らす
  const k = Math.min(1, fShape / 0.5);
  const sc = [C.P_SHAPE * fShape, C.P_SIZE * fSize * k, C.P_POS * fPos * k, C.P_COUNT * fCount * k, C.P_ORDER * fOrder * k, C.P_SMOOTH * fSmooth * k];
  const total = sc.reduce((a, b) => a + b, 0);
  return { total, sc };
}

// 線を描く(ps: 0〜1 の点の列、size: マスの大きさ)
function kanaStroke(ctx, ps, ox, oy, size, width, color) {
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (ps.length === 1) { ctx.beginPath(); ctx.arc(ox + ps[0][0] * size, oy + ps[0][1] * size, width / 2, 0, Math.PI * 2); ctx.fill(); return; }
  ctx.beginPath();
  ps.forEach(([x, y], i) => i ? ctx.lineTo(ox + x * size, oy + y * size) : ctx.moveTo(ox + x * size, oy + y * size));
  ctx.stroke();
}
// ノートのマス(外わく + 十字の点線)
function kanaCell(ctx, ox, oy, size, light) {
  ctx.fillStyle = light ? '#fbfaf3' : '#f6f3e6';
  ctx.fillRect(ox, oy, size, size);
  ctx.strokeStyle = '#7fae8a'; ctx.lineWidth = Math.max(1.5, size * 0.008); ctx.setLineDash([]);
  ctx.strokeRect(ox, oy, size, size);
  ctx.strokeStyle = 'rgba(127,174,138,0.6)'; ctx.lineWidth = Math.max(1, size * 0.004);
  ctx.setLineDash([size * 0.02, size * 0.02]);
  ctx.beginPath(); ctx.moveTo(ox + size / 2, oy); ctx.lineTo(ox + size / 2, oy + size); ctx.moveTo(ox, oy + size / 2); ctx.lineTo(ox + size, oy + size / 2); ctx.stroke();
  ctx.setLineDash([]);
}
// お手本を描く
function kanaDrawRef(ctx, ci, ox, oy, size) {
  kanaCell(ctx, ox, oy, size);
  kanaRef(ci).forEach(st => kanaStroke(ctx, st, ox, oy, size, size * kanaCfg.INK, '#1d2033'));
}
// 補足データの線(0〜1000の整数を並べたもの)を、0〜1の点の列に戻す
function kanaUnpack(x) {
  const ss = x && x.s ? (Array.isArray(x.s) ? x.s : Object.values(x.s)) : [];
  return ss.map(f => { f = Array.isArray(f) ? f : Object.values(f || {}); const o = []; for (let i = 0; i + 1 < f.length; i += 2) o.push([f[i] / 1000, f[i + 1] / 1000]); return o; });
}

GAMES.push({
  id: 'kana', title: 'キレイに書けるかな?',
  desc: 'お手本のひらがな・カタカナを、ノートのマスにキレイに書こう!<br>指で1画ずつ書いてね。「1画もどす」「全部消す」で書き直しOK。書けたら「決定」。<br>形・大きさ・位置・画数・書き順・なめらかさで100点満点。15秒。',
  lowerBetter: false, miss: 0,
  isMiss: v => v <= 0,
  fmt: v => Math.floor(v) + '点',
  play: playKana,
  // リザルト用:自分の字(大きいときは、お手本とならべて項目ごとの点も出す)
  result: drawKanaResult,
  // 結果画面のいちばん上に出す、そのラウンドのお手本
  resultTop: (el, round) => {
    const ci = kanaPick(Math.round(((round && round.delay) || 3000) * 1000));
    el.innerHTML = '<div class="sub">お手本「' + KANA_DATA[ci][0] + '」</div>';
    const size = 110, dpr = window.devicePixelRatio || 1;
    const cv = document.createElement('canvas');
    cv.width = size * dpr; cv.height = size * dpr; cv.style.width = cv.style.height = size + 'px'; cv.style.display = 'block'; cv.style.margin = '6px auto 0';
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    kanaDrawRef(ctx, ci, 1, 1, size - 2);
    el.appendChild(cv);
  }
});

function playKana(stage, round, submit) {
  const game = GAMES.find(g => g.id === 'kana');
  const C = kanaCfg;
  const ci = kanaPick(Math.round((round.delay || 3000) * 1000));
  const ch = KANA_DATA[ci][0];

  countdown(stage, game, round, () => {
    const bs = 'flex:1;padding:12px 0;font-size:16px;margin:0';
    stage.innerHTML =
      `<div style="display:flex;align-items:center;gap:12px;margin:0 0 6px">` +
      `<canvas id="ref" style="width:84px;height:84px;flex:none"></canvas>` +
      `<div style="flex:1"><div class="sub">お手本どおりに書こう</div><div style="font-size:15px">画数 <b id="cnt" style="color:#ffcc33;font-size:20px">0</b> ・ 残り <b id="left">${C.DUR.toFixed(1)}</b> 秒</div></div></div>` +
      `<canvas id="pad" style="display:block;margin:0 auto;touch-action:none;border-radius:6px"></canvas>` +
      `<div style="display:flex;gap:8px;margin-top:10px">` +
      `<button class="btn ghost" id="undo" style="${bs}">1画もどす</button><button class="btn ghost" id="clr" style="${bs}">全部消す</button><button class="btn" id="ok" style="${bs};font-weight:800">決定</button></div>`;
    // お手本
    const rc = stage.querySelector('#ref');
    const dpr = window.devicePixelRatio || 1;
    rc.width = rc.height = 84 * dpr;
    const rctx = rc.getContext('2d'); rctx.scale(dpr, dpr);
    kanaDrawRef(rctx, ci, 1, 1, 82);
    // 書くマス(正方形)
    const cv = stage.querySelector('#pad');
    const sw = stage.getBoundingClientRect().width;
    const size = Math.floor(Math.min(sw, window.innerHeight * 0.5, 420));
    cv.style.width = cv.style.height = size + 'px';
    cv.width = cv.height = size * dpr;
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const cntEl = stage.querySelector('#cnt'), leftEl = stage.querySelector('#left');

    const strokes = [];
    let cur = null, pid = null, done = false;
    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      kanaCell(ctx, 0, 0, size, true);
      strokes.forEach(s => kanaStroke(ctx, s, 0, 0, size, size * C.PEN, '#1d2033'));
      cntEl.textContent = strokes.length;
    };
    const pt = ev => {
      const b = cv.getBoundingClientRect();
      return [Math.max(0, Math.min(1, (ev.clientX - b.left) / b.width)), Math.max(0, Math.min(1, (ev.clientY - b.top) / b.height))];
    };
    cv.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (done || pid !== null) return;
      pid = ev.pointerId;
      try { cv.setPointerCapture(pid); } catch (e) { }
      cur = [pt(ev)]; strokes.push(cur); draw();
    });
    cv.addEventListener('pointermove', ev => {
      if (done || ev.pointerId !== pid || !cur) return;
      ev.preventDefault();
      const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
      (evs.length ? evs : [ev]).forEach(e2 => {
        const p = pt(e2), l = cur[cur.length - 1];
        if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 0.003) cur.push(p);
      });
      draw();
    });
    const up = ev => { if (ev.pointerId !== pid) return; pid = null; cur = null; draw(); };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);

    const btn = (id, fn) => stage.querySelector(id).addEventListener('pointerdown', ev => { ev.preventDefault(); if (!done) fn(); });
    btn('#undo', () => { if (pid !== null) return; strokes.pop(); draw(); });
    btn('#clr', () => { if (pid !== null) return; strokes.length = 0; draw(); });
    btn('#ok', () => { if (strokes.length) finish(); });

    const finish = () => {
      if (done) return;
      done = true; pid = null;
      const r = kanaScore(ci, strokes);
      // 補足データ: 線(間引いて0〜1000の整数に)と、項目ごとの点
      const s = strokes.filter(st => st.length).slice(0, 12).map(st => {
        // 長い線も最後まで残るように、点の間隔を広げて80個以内にする
        let len = 0; for (let i = 1; i < st.length; i++) len += Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]);
        const rs = st.length > 1 ? kanaResample(st, Math.max(0.02, len / 78)) : st;
        const f = []; rs.slice(0, 80).forEach(([x, y]) => f.push(Math.round(x * 1000), Math.round(y * 1000)));
        return f;
      });
      const v = Math.round(r.total * 100) / 100;
      ['#undo', '#clr', '#ok'].forEach(id => { stage.querySelector(id).style.opacity = '0.4'; });
      submit(v, { c: ci, s, sc: r.sc.map(a => Math.round(a * 10) / 10) });
    };

    const t0 = performance.now();
    draw();
    const iv = setInterval(() => {
      if (done) return;
      const e = (performance.now() - t0) / 1000;
      leftEl.textContent = Math.max(0, C.DUR - e).toFixed(1);
      if (e >= C.DUR) finish();
    }, 50);
    timers.push(iv);
  });
}

// リザルト用。size が大きい(自分の記録・練習)ときは、お手本と自分の字をならべて、項目ごとの点も出す
function drawKanaResult(el, data, size) {
  if (!data) return;
  const ci = Number(data.c) || 0;
  const user = kanaUnpack(data);
  const big = (size || 90) >= 150;
  const cell = big ? 120 : 64;
  const w = big ? cell * 2 + 24 : cell, h = cell + (big ? 18 : 0);
  const dpr = window.devicePixelRatio || 1;
  const cv = document.createElement('canvas');
  cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const ink = cell * kanaCfg.PEN;
  let ux = 0;
  if (big) {
    ctx.fillStyle = '#9aa3c7'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('お手本', cell / 2, 0); ctx.fillText('あなた', cell * 1.5 + 24, 0);
    kanaDrawRef(ctx, ci, 0, 18, cell);
    ux = cell + 24;
  }
  const uy = big ? 18 : 0;
  kanaCell(ctx, ux, uy, cell, true);
  user.forEach(s => kanaStroke(ctx, s, ux, uy, cell, ink, '#1d2033'));
  el.appendChild(cv);
  if (big && data.sc) {
    const sc = Array.isArray(data.sc) ? data.sc : Object.values(data.sc);
    const C = kanaCfg;
    const names = [['形', C.P_SHAPE], ['大きさ', C.P_SIZE], ['位置', C.P_POS], ['画数', C.P_COUNT], ['書き順', C.P_ORDER], ['なめらか', C.P_SMOOTH]];
    const d = document.createElement('div');
    d.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px 10px;margin:8px auto 0;max-width:280px;font-size:13px;color:#9aa3c7';
    d.innerHTML = names.map(([n, mx], i) => `<div>${n} <b style="color:#f2f4ff">${Math.round(sc[i] || 0)}</b>/${mx}</div>`).join('');
    el.appendChild(d);
  }
}
