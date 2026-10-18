/* ミニゲーム本体。ゲームを足すときは、このファイルの GAMES に項目を足して、play 関数を書く。 */

const GAMES = [
  {
    id: 'just5', title: '5秒ジャスト',
    desc: 'スタートしたら数字が見えなくなる。<br>心の中で数えて、5秒ぴったりでSTOP!<br>誤差が小さいほど上位。',
    lowerBetter: true, miss: 99999,
    isMiss: v => v >= 99999,
    fmt: v => v >= 99999 ? '時間切れ' : '誤差 ' + (v / 1000).toFixed(3) + '秒',
    play: playJust5
  },
  {
    id: 'tap', title: '連打対決',
    desc: '10秒間でボタンを連打!<br>回数が多いほど上位。',
    lowerBetter: false, miss: 0,
    isMiss: () => false,
    fmt: v => v + '回',
    play: playTap
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
];

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

/* --- ミニゲーム1: 5秒ジャスト --- */
function playJust5(stage, round, submit) {
  countdown(stage, GAMES[0], round, () => {
    stage.innerHTML = `<div class="big-num" id="t">0.00</div><div class="center sub">5.00秒ぴったりで止めろ!</div><button class="btn big" id="stop">STOP</button>`;
    const el = stage.querySelector('#t');
    const t0 = performance.now();
    let done = false;
    const iv = setInterval(() => {
      const e = performance.now() - t0;
      el.textContent = e < 2000 ? (e / 1000).toFixed(2) : '?.??';
      if (e > 12000 && !done) { done = true; submit(GAMES[0].miss); }
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

/* --- ミニゲーム2: 連打対決 --- */
function playTap(stage, round, submit) {
  countdown(stage, GAMES[1], round, () => {
    stage.innerHTML = `<div class="center sub">残り <b id="left">10.0</b> 秒</div><div class="big-num" id="cnt">0</div><button class="btn big" id="tapb">TAP!</button>`;
    const cnt = stage.querySelector('#cnt'), left = stage.querySelector('#left');
    const DUR = 10000, t0 = performance.now();
    let n = 0, done = false;
    stage.querySelector('#tapb').addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (done) return;
      n++; cnt.textContent = n;
    });
    const iv = setInterval(() => {
      const e = performance.now() - t0;
      left.textContent = Math.max(0, (DUR - e) / 1000).toFixed(1);
      if (e >= DUR && !done) { done = true; clearInterval(iv); submit(n); }
    }, 50);
    timers.push(iv);
  });
}

/* --- ミニゲーム3: 反射神経 --- */
function playReact(stage, round, submit) {
  countdown(stage, GAMES[2], round, () => {
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

/* --- ミニゲーム4: 〇センチを描け! --- */
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
