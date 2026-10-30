/* 言語(日本語・English・한국어)。いちばん最初に読み込む。
   - 画面の文字は T('日本語の文') で出す。下の辞書 I18N に、その文の英語・韓国語を書いておく。
     辞書にない文は、日本語のまま出る(足し忘れは tools/check-i18n.mjs で見つかる)。
   - 文の中の {n} などは、T('…{n}…', { n: 5 }) の値に置きかわる(HTMLもそのまま入る)。
   - ゲームの名前と説明は I18N_GAMES(ゲームの id ごと)。
   - Firebase には言語に関係ないデータ(数値・id)だけを保存する。文字は各自の画面で作るので、
     同じルームに日本語の人と英語の人がいてもよい。
   - 選んだ言語は localStorage の 'muddys-lang'(ja / en / ko)。Muddy's Games の全ゲームで共通。
   - URL に ?lang=en などがあれば、それを優先して覚える(サイトの各言語のページの「遊ぶ」から来たとき)。 */

const LANGS = ['ja', 'en', 'ko'];
const LANG_NAMES = { ja: '日本語', en: 'English', ko: '한국어' };
let LANG = (() => {
  // サイトの英語・韓国語ページから来たときは ?lang=en / ?lang=ko がついている。それを覚えて使う
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) { localStorage.setItem('muddys-lang', q); return q; }
  } catch (e) { }
  try { const s = localStorage.getItem('muddys-lang'); if (LANGS.includes(s)) return s; } catch (e) { }
  const n = String(navigator.language || '').toLowerCase();   // 初めての人は、スマホの言語設定で決める
  return n.startsWith('ko') ? 'ko' : n.startsWith('ja') ? 'ja' : 'en';
})();
document.documentElement.lang = LANG;

function setLang(l) {
  if (!LANGS.includes(l)) return;
  LANG = l;
  try { localStorage.setItem('muddys-lang', l); } catch (e) { }
  document.documentElement.lang = l;
}

/* 文を、いまの言語にする */
function T(ja, vars) {
  const e = I18N[ja];
  let s = LANG === 'ja' || !e ? ja : (e[LANG === 'en' ? 0 : 1] ?? ja);
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}

/* サイトのページへのリンク。サイトの英語・韓国語ページ(/en/ /ko/)があるので true(2026-10-30) */
const SITE_LANG_READY = true;
const sitePath = p => (SITE_LANG_READY && LANG !== 'ja' ? '/' + LANG + p : p);

/* 最初の画面の「日本語 / English / 한국어」 */
function langSwitchHtml() {
  return `<div class="seg lang">${LANGS.map(l => `<button class="${l === LANG ? 'on' : ''}" data-lang="${l}">${LANG_NAMES[l]}</button>`).join('')}</div>`;
}
function langSwitchInit(rerender) {
  document.querySelectorAll('[data-lang]').forEach(b => {
    b.onclick = () => { if (b.dataset.lang === LANG) return; setLang(b.dataset.lang); rerender(); };
  });
}

/* ゲームの名前(title)と説明(desc / descBase)を、読むたびに今の言語で返すようにする。core.js の最初で1回呼ぶ。
   ゲームが game.desc = game.descBase + お題 のように書きかえるのは、そのまま使える(書いた値が優先) */
function i18nGames() {
  GAMES.forEach(g => {
    if (g._ja) return;
    const ja = { title: g.title, desc: g.descBase || g.desc };
    const tr = () => (LANG !== 'ja' && I18N_GAMES[g.id] && I18N_GAMES[g.id][LANG]) || ja;
    let override = null;
    Object.defineProperty(g, '_ja', { value: ja });
    Object.defineProperty(g, 'title', { get: () => tr().title, configurable: true });
    Object.defineProperty(g, 'descBase', { get: () => tr().desc, configurable: true });
    Object.defineProperty(g, 'desc', { get: () => override ?? tr().desc, set: v => { override = v; }, configurable: true });
  });
}

/* ===== ゲームの名前と説明 ===== */
const I18N_GAMES = {
  just5: {
    en: { title: 'Stop at X Seconds!', desc: 'Hit STOP at exactly the target time (5–9 sec)!<br>The numbers disappear 2 seconds after the start.<br>Count in your head. The smaller the error, the higher you rank.' },
    ko: { title: '딱 ○초 맞추기!', desc: '목표 시간(5~9초)에 딱 맞춰 STOP!<br>시작하고 2초가 지나면 숫자가 보이지 않아요.<br>마음속으로 세어 보세요. 오차가 작을수록 상위.' }
  },
  ruler: {
    en: { title: 'Catch the Ruler!', desc: 'A ruler drops without warning!<br>As soon as it falls, tap anywhere on the screen to catch it.<br>3 tries. The shorter your average catch (how many cm it fell), the higher you rank.<br>Watch out for fake twitches!<br>Tapping before it drops is a false start (40cm for that try).' },
    ko: { title: '자를 잡아라!', desc: '자가 예고 없이 떨어져요!<br>떨어지면 바로 화면 아무 데나 탭해서 잡으세요.<br>3번 도전. 잡은 위치(몇 cm 떨어졌는지)의 평균이 짧을수록 상위.<br>살짝 흔들리기만 하는 페이크도 있어요.<br>떨어지기 전에 누르면 부정 출발(그 회차는 40cm).' }
  },
  drawcm: {
    en: { title: 'Draw X cm!', desc: 'Trace the screen with your finger to draw a line of the target length!<br>Tap “OK” when you’re done. You can redraw within 10 seconds.<br>Measured from start point to end point. The closer to the target, the higher you rank.' },
    ko: { title: '○센티를 그려라!', desc: '손가락으로 화면을 따라 목표 길이의 선을 그리세요!<br>다 그리면 「결정」. 10초 안이면 다시 그릴 수 있어요.<br>시작점부터 끝점까지의 길이로 판정. 목표에 가까울수록 상위.' }
  },
  cut: {
    en: { title: 'Cut It Evenly!', desc: 'Drag from the center dot to outside the circle to cut!<br>Let go and a line stays. Use “Undo” to try again.<br>It ends when you’ve made the target number of cuts.<br>The more even the pieces, the higher you rank.' },
    ko: { title: '똑같이 잘라라!', desc: '가운데 점에서 원 바깥까지 드래그해서 자르세요!<br>손을 떼면 선이 남아요. 「되돌리기」로 다시 할 수 있어요.<br>목표 개수만큼 자르면 끝.<br>조각 크기가 고를수록 상위.' }
  },
  angle: {
    en: { title: 'Draw the Angle!', desc: 'Drag from the center dot to draw a line at the target angle!<br>The angle is measured from the gray line.<br>After you let go, tap “OK!” to confirm. The closer to the target, the higher you rank.' },
    ko: { title: '각도를 그려라!', desc: '가운데 점에서 드래그해서 목표 각도의 선을 그으세요!<br>회색 선과의 사이 각도로 판정.<br>손을 뗀 뒤 「결정!」으로 확정. 목표에 가까울수록 상위.' }
  },
  hata: {
    en: { title: 'Flag Up, Flag Down!', desc: 'Raise and lower the flags just as the referee says!<br>Hold the “RED” / “WHITE” button = flag up, let go = flag down.<br>Watch for “… NOT!” at the end: move that flag even for a moment and it’s wrong. Don’t move a flag that isn’t called, either.<br>It gets faster! 15 calls (1 pt each) + streak bonus (4 in a row +1, 8 +2, 12 +3, 15 +4). Max 25 pts.' },
    ko: { title: '깃발 올려 내려!', desc: '심판이 말하는 대로 깃발을 올리고 내리세요!<br>아래 「빨강」「하양」 버튼을 누르고 있으면 올리기, 떼면 내리기.<br>끝에 오는 「~지 마」 함정에서 잠깐이라도 움직이면 아웃. 불리지 않은 깃발도 움직이지 마세요.<br>점점 빨라져요! 지시는 15개(1개 1점) + 연속 정답 보너스(4연속 +1·8연속 +2·12연속 +3·15연속 +4). 최고 25점.' }
  },
  oddcolor: {
    en: { title: 'Spot the Odd Color!', desc: 'Find and tap the one square with a slightly different color!<br>How many can you find in 15 seconds?<br>A wrong tap means a 1-second pause.<br>More correct answers rank higher. 0 found = 0 points.' },
    ko: { title: '다른 색 찾기!', desc: '색이 아주 조금 다른 칸 하나를 찾아서 터치!<br>15초 동안 몇 문제 맞히는지 승부.<br>틀리면 1초 쉬어요.<br>정답 수가 많을수록 상위. 0문제는 0점.' }
  },
  numtouch: {
    en: { title: 'Number Touch!', desc: 'Touch every number from 1 to 16 in order!<br>Everyone gets the same layout.<br>The faster you clear it, the higher you rank.<br>If you don’t finish in 17 seconds, you’re ranked by how many you got.' },
    ko: { title: '숫자 터치!', desc: '1부터 16까지 작은 순서대로 모두 터치!<br>숫자 배치는 모두 같아요.<br>빨리 클리어할수록 상위.<br>17초 안에 못 끝내면 누른 개수로 순위가 정해져요.' }
  },
  dodge: {
    en: { title: 'Dodge It!', desc: 'Keep dodging the things falling from above!<br>Move your finger left and right below the ground line.<br>Watch out for zigzag leaves, giant rocks, balls that speed up, rocks that split, and pillars that drop where it flashes red!<br>The longer you survive, the higher you rank. Last 15 seconds to clear.' },
    ko: { title: '피해라!', desc: '위에서 떨어지는 것들을 계속 피하세요!<br>조작은 「땅보다 아래」에서 손가락을 좌우로 움직여요.<br>지그재그 나뭇잎, 거대한 바위, 도중에 빨라지는 공, 쪼개지는 바위, 빨갛게 빛난 곳에 떨어지는 기둥도 조심!<br>오래 살아남을수록 상위. 15초 버티면 클리어.' }
  },
  burger: {
    en: { title: 'Build a Muddy’s Burger!', desc: 'Catch the falling ingredients on your plate and stack them up!<br>Move your finger left and right below the ground line.<br>The more centered, the higher the score. Too far off and it falls.<br>Ketchup comes before the top bun! Follow the wiggly bottle and catch it on the top ingredient.<br>Lean too much and the tower collapses! Stack up to the top bun to finish!' },
    ko: { title: '머디스 버거를 만들어라!', desc: '위에서 떨어지는 재료를 접시로 받아서 쌓아 올리세요!<br>조작은 「땅보다 아래」에서 손가락을 좌우로 움직여요.<br>가운데에 올릴수록 고득점. 너무 어긋나면 떨어져요.<br>위 번 전에 케첩! 꿈틀꿈틀 움직이는 병에 맞춰 맨 위 재료로 받으세요.<br>탑이 너무 기울면 무너져요! 위 번까지 올리면 완성!' }
  },
  jack: {
    en: { title: 'Pour the Jack!', desc: 'While you hold the bottle, Jack pours into the glass.<br>Let go to stop. You can add more, but you can’t take any out.<br>No numbers are shown. Watch the level and tap “OK”!<br>The glass holds <b style="color:#ffcc33">315ml</b> to the brim. Overflow and you fail.<br>The closer to the target amount, the higher you rank.' },
    ko: { title: '잭을 따라라!', desc: '병을 누르고 있는 동안 잔에 잭이 따라져요.<br>손가락을 떼면 멈춰요. 더 따르는 건 OK, 줄일 수는 없어요.<br>양은 숫자로 나오지 않아요. 높이를 보고 「결정」!<br>잔은 가득 채우면 <b style="color:#ffcc33">315ml</b>. 넘치면 실패.<br>목표 양에 가까울수록 상위.' }
  },
  hamburg: {
    en: { title: 'Grill My Hamburg Steak!', desc: 'Three hamburg steaks are cooking. They show up and cook at different speeds!<br>The steak’s color = the color of the side cooking underneath right now.<br>Tap once to flip it (raw side down), tap again to move it to the plate.<br>The cooking speed changes midway! More sizzle means it sped up.<br>The closer both sides are to the target doneness, the higher you rank. Don’t burn them!' },
    ko: { title: '내 함박스테이크를 구워라!', desc: '함박스테이크 3개가 구워져요. 나오는 시간도 굽는 속도도 제각각!<br>함박스테이크의 색 = 지금 구워지고 있는 아랫면의 색.<br>한 번 탭하면 뒤집기(날것인 면이 아래로), 두 번째 탭으로 접시에.<br>도중에 굽는 속도가 바뀌어요! 지글지글 알갱이가 늘면 빨라졌다는 신호.<br>양면 모두 목표 굽기에 가까울수록 상위. 태우면 안 돼요!' }
  },
  daruma: {
    en: { title: 'Red Light, Green Light!', desc: 'Drive like a car! Hold “DASH” to speed up. You won’t stop right away when you let go.<br>To stop, use “BRAKE”! If you press both, the brake wins.<br>If you’re moving when the watcher turns around, you’re caught!<br>After 15 seconds you still have a last chance until the watcher finishes the call. Touch the watcher to reach the goal. The closer you get, the higher you rank.' },
    ko: { title: '무궁화 꽃이 피었습니다!', desc: '자동차처럼 달려요! 「대시」를 누르는 동안 가속, 떼도 바로 멈추지 않아요.<br>멈추고 싶을 때는 「브레이크」! 둘 다 누르면 브레이크가 이겨요.<br>술래가 뒤돌아봤을 때 움직이고 있으면 들켜서 아웃!<br>15초가 지나도 술래가 다 말할 때까지는 마지막 찬스. 술래를 터치하면 골인, 가까울수록 상위.' }
  },
  curry: {
    en: { title: 'Make a South Indian Curry!', desc: 'Memorize the spices going into the pot, in order!<br>Then tap them on the shelf in the same order to make the same curry.<br>Right spice in the right place = 2 pts; in the curry but wrong place = 1 pt.<br>The same spice may go in twice!' },
    ko: { title: '남인도 카레를 만들어라!', desc: '냄비에 들어가는 향신료를 순서대로 외우세요!<br>그다음 선반에서 들어간 순서대로 탭해서 같은 카레를 만들어요.<br>향신료와 순서가 모두 맞으면 2점, 들어있지만 순서가 다르면 1점.<br>같은 향신료가 2번 들어갈 때도 있어요!' }
  },
  kana: {
    en: { title: 'Write in Japanese!', desc: 'Try writing Japanese! Copy the hiragana / katakana model neatly in the notebook square.<br>Write one stroke at a time with your finger. Use “Undo stroke” or “Clear” to redo, then tap “OK”.<br>Scored out of 100 on shape, size, position, stroke count, stroke order and smoothness. 15 sec.' },
    ko: { title: '일본 글자에 도전!', desc: '일본 글자에 도전! 견본의 히라가나·가타카나를 노트 칸에 예쁘게 써 보세요.<br>손가락으로 한 획씩 써요. 「한 획 지우기」「모두 지우기」로 다시 쓰기 OK. 다 쓰면 「결정」.<br>모양·크기·위치·획수·획순·매끄러움으로 100점 만점. 15초.' }
  }
};

/* ===== 画面の文字 ===== 日本語: [English, 한국어] */
const I18N = {
  // --- 共通・ホーム・練習モード(core.js) ---
  '終了!': ['Finish!', '끝!'],
  'タイトルホルダー': ['Title holder', '타이틀 홀더'],
  'ここではタイトルは取れません(アーケード・2人以上のときだけ)': ['No title can be won here (Arcade with 2+ players only)', '여기서는 타이틀을 얻을 수 없어요 (아케이드·2명 이상일 때만)'],
  'まだいない! 最初の記録を出そう': ['Nobody yet! Set the first record', '아직 없어요! 첫 기록을 세워 보세요'],
  '読み込みエラー': ['Loading error', '불러오기 오류'],
  'Firebaseを読み込めませんでした。通信状況を確認して、ページを再読み込みしてね。': ['Couldn’t load Firebase. Check your connection and reload the page.', 'Firebase를 불러오지 못했어요. 인터넷 연결을 확인하고 페이지를 새로고침해 주세요.'],
  '接続中…': ['Connecting…', '연결 중…'],
  'なまえ': ['Name', '이름'],
  'なまえを入力': ['Enter your name', '이름을 입력'],
  'ルームを作る(管理者になる)': ['Create a room (you’ll be the host)', '방 만들기 (방장이 돼요)'],
  'ルームID': ['Room ID', '방 ID'],
  '4けたの数字': ['4-digit number', '4자리 숫자'],
  '入室する': ['Join', '입장하기'],
  '練習モード(1人で遊ぶ)': ['Practice mode (play alone)', '연습 모드 (혼자 하기)'],
  "Muddy's Games トップ": ["Muddy's Games home", "Muddy's Games 홈"],
  'プライバシーポリシー': ['Privacy policy', '개인정보 처리방침'],
  '練習モード': ['Practice mode', '연습 모드'],
  '遊ぶゲームを回して選ぶ(記録は保存されない)': ['Spin to choose a game (records aren’t saved)', '돌려서 게임을 고르세요 (기록은 저장되지 않아요)'],
  'このゲームで遊ぶ': ['Play this game', '이 게임 하기'],
  'ホームに戻る': ['Back to home', '홈으로'],
  'やめる': ['Quit', '그만하기'],
  'あなたの記録': ['Your result', '내 기록'],
  'もう一度': ['Play again', '한 번 더'],
  'ゲームを選ぶ': ['Choose a game', '게임 고르기'],
  'なまえを入力してね': ['Please enter your name', '이름을 입력해 주세요'],
  '作成中…': ['Creating…', '만드는 중…'],
  'ルームを作れませんでした。もう一度試してね': ['Couldn’t create a room. Please try again', '방을 만들지 못했어요. 다시 시도해 주세요'],
  'エラー: ': ['Error: ', '오류: '],
  'ルームIDは4けたの数字だよ': ['The room ID is a 4-digit number', '방 ID는 4자리 숫자예요'],
  '入室中…': ['Joining…', '입장 중…'],
  'そのルームIDは見つかりません': ['Room not found', '그 방 ID를 찾을 수 없어요'],
  'ゲーム中なので入れません': ['A game is in progress, so you can’t join', '게임 중이라 들어갈 수 없어요'],
  '満員です(最大{n}人)': ['The room is full (max {n})', '인원이 다 찼어요 (최대 {n}명)'],
  'ルームが閉じられました': ['The room was closed', '방이 닫혔어요'],
  'ルームから外れました': ['You were removed from the room', '방에서 나가게 되었어요'],
  'ルームから出る?': ['Leave the room?', '방에서 나갈까요?'],
  'ルームから出る?({name} が新しい管理者になります)': ['Leave the room? ({name} will be the new host)', '방에서 나갈까요? ({name} 님이 새 방장이 돼요)'],
  'ルームを解散する?': ['Close the room?', '방을 없앨까요?'],

  // --- ロビー・進行・結果(battle.js) ---
  'ファイナルアップ!': ['Final Up!', '파이널 업!'],
  'ダブルアップ!': ['Double Up!', '더블 업!'],
  'ルームを解散': ['Close room', '방 없애기'],
  '退出': ['Leave', '나가기'],
  '選んだゲームを1回だけ遊ぶ。ポイントは付かない。': ['Play the chosen game once. No points.', '고른 게임을 한 번만 해요. 포인트는 없어요.'],
  'ゲーム(回して選ぶ)': ['Game (spin to choose)', '게임 (돌려서 고르기)'],
  'ゲーム': ['Game', '게임'],
  'ランダムなゲームを続けて遊び、合計ポイントで優勝を決める。': ['Play random games in a row. The highest total wins.', '랜덤 게임을 이어서 하고, 합계 포인트로 우승을 정해요.'],
  'ラウンド数': ['Rounds', '라운드 수'],
  'ボーナス(チェックしなければなし)': ['Bonus (none if unchecked)', '보너스 (체크하지 않으면 없음)'],
  'ダブルアップ': ['Double Up', '더블 업'],
  'ランダムな1ラウンドのポイントが2倍。そのゲームの開始前に発表される。': ['Points are doubled in one random round, announced before that game starts.', '랜덤한 1라운드의 포인트가 2배. 그 게임 시작 전에 발표돼요.'],
  'ファイナルアップ': ['Final Up', '파이널 업'],
  '最終ラウンドのポイントが2倍。': ['Points are doubled in the final round.', '마지막 라운드의 포인트가 2배.'],
  'モード': ['Mode', '모드'],
  'モード(管理者が決める)': ['Mode (the host decides)', '모드 (방장이 정해요)'],
  'アーケード': ['Arcade', '아케이드'],
  'ソロゲーム': ['Single Game', '단판 게임'],
  'アーケードは2人からです': ['Arcade needs 2 or more players', '아케이드는 2명부터예요'],
  'ロビー': ['Lobby', '로비'],
  'ルームID(タップでコピー)': ['Room ID (tap to copy)', '방 ID (탭해서 복사)'],
  '参加者': ['Players', '참가자'],
  'あなた': ['You', '나'],
  '管理者にする': ['Make host', '방장 넘기기'],
  '外す': ['Remove', '내보내기'],
  '管理者のスタートを待っています…': ['Waiting for the host to start…', '방장이 시작하기를 기다리는 중…'],
  'ゲームスタート': ['Start game', '게임 시작'],
  'アーケードは2人から遊べます(1人ならソロゲームへ)': ['Arcade needs 2 or more players (alone? try Single Game)', '아케이드는 2명부터 할 수 있어요 (혼자라면 단판 게임으로)'],
  'コピーしました': ['Copied', '복사했어요'],
  '{name} をルームから外す?': ['Remove {name} from the room?', '{name} 님을 방에서 내보낼까요?'],
  '{name} に管理者を渡す?': ['Make {name} the host?', '{name} 님에게 방장을 넘길까요?'],
  'ラウンド': ['Round', '라운드'],
  '新記録! タイトル獲得!': ['New record! Title won!', '신기록! 타이틀 획득!'],
  'みんなを待っています…': ['Waiting for everyone…', '모두를 기다리는 중…'],
  '管理者の操作を待っています…': ['Waiting for the host…', '방장을 기다리는 중…'],
  'ロビーに戻る': ['Back to lobby', '로비로'],
  '最終結果へ': ['See final results', '최종 결과로'],
  '次のラウンドへ': ['Next round', '다음 라운드로'],
  '{title} の結果': ['{title} – Results', '{title} 결과'],
  'ポイント2倍': ['Double points', '포인트 2배'],
  'このラウンドはポイント2倍': ['Double points this round', '이번 라운드는 포인트 2배'],
  '未提出': ['No result', '미제출'],
  'ここまでの合計': ['Total so far', '지금까지 합계'],
  '最終結果': ['Final results', '최종 결과'],
  '優勝': ['Winner', '우승'],
  'ポイント2倍のラウンド': ['double-point round', '포인트 2배 라운드'],
  'ロビーに戻る(もう一度)': ['Back to lobby (play again)', '로비로 (한 번 더)'],

  // --- ゲームで共通に使うことば ---
  'お題': ['Target', '목표'],
  '{n}秒': ['{n} sec', '{n}초'],
  '{n}点': ['{n} pts', '{n}점'],
  '残り {t} 秒': ['{t} sec left', '남은 시간 {t}초'],
  '時間切れ': ['Time’s up', '시간 초과'],
  '時間切れ!': ['Time’s up!', '시간 초과!'],
  '失敗': ['Failed', '실패'],
  '決定': ['OK', '결정'],
  '決定!': ['OK!', '결정!'],
  '1つ戻る': ['Undo', '되돌리기'],
  '平均': ['Avg', '평균'],
  '誤差': ['Off by', '오차'],
  '完成!': ['Done!', '완성!'],

  // --- 〇秒ジャスト ---
  '誤差 {n}秒': ['Off by {n} sec', '오차 {n}초'],
  '(お題{t})': [' (target {t})', ' (목표 {t})'],
  '{t}ぴったりで止めろ!': ['Stop at exactly {t}!', '딱 {t}에 멈춰라!'],

  // --- 定規キャッチ! ---
  '全部失敗': ['All missed', '모두 실패'],
  '全部失敗…': ['All missed…', '모두 실패…'],
  '平均 {n}cm': ['Avg {n}cm', '평균 {n}cm'],
  '{k}/{n}回目 ・ 落ちたらタップ!': ['Try {k}/{n} · Tap when it drops!', '{k}/{n}번째 · 떨어지면 탭!'],
  '{n}回目': ['#{n}', '{n}번째'],
  'フライング': ['False start', '부정 출발'],
  'フライング!': ['False start!', '부정 출발!'],
  '落ちた': ['Dropped', '놓침'],
  '落ちた!': ['Dropped!', '놓쳤다!'],

  // --- 〇センチを描け! ---
  '失格': ['Disqualified', '실격'],
  '誤差 {n}cm': ['Off by {n}cm', '오차 {n}cm'],
  '(長い)': [' (too long)', ' (김)'],
  '(短い)': [' (too short)', ' (짧음)'],
  '(ぴったり)': [' (perfect)', ' (딱 맞음)'],
  '描いた線 {a}cm ・ お題 {b}cm': ['Your line {a}cm · Target {b}cm', '그린 선 {a}cm · 목표 {b}cm'],
  '見本:これが1cm': ['Example: this is 1cm', '견본: 이게 1cm'],
  '{t} を描け!': ['Draw {t}!', '{t}를 그려라!'],
  '残り {t} 秒 ・ 描き直しOK': ['{t} sec left · Redraw OK', '남은 시간 {t}초 · 다시 그리기 OK'],

  // --- キレイに切って! ---
  'ズレ {n}%': ['Off by {n}%', '오차 {n}%'],
  '{n}等分': ['{n} equal pieces', '{n}등분'],
  '{p}に切って!': ['Cut into {p}!', '{p}으로 잘라라!'],
  'あと {n} 本 ・ 残り {t} 秒': ['{n} cuts to go · {t} sec left', '남은 선 {n}개 · 남은 시간 {t}초'],
  '平均のズレ': ['Avg error', '평균 오차'],

  // --- 角度を描け! ---
  '誤差 {n}°': ['Off by {n}°', '오차 {n}°'],
  '{n}度': ['{n}°', '{n}도'],
  '{a} を作って!': ['Make {a}!', '{a}를 만들어라!'],
  '灰色の線から {a} ・ 残り {t} 秒': ['{a} from the gray line · {t} sec left', '회색 선에서 {a} · 남은 시간 {t}초'],
  'やり直す': ['Redo', '다시 하기'],
  'あなたの角度': ['Your angle', '내 각도'],

  // --- 旗揚げゲーム!! ---
  '得点': ['Score', '점수'],
  '連続': ['Streak', '연속'],
  '赤': ['RED', '빨강'],
  '白': ['WHITE', '하양'],
  '{n}連続! +{b}': ['{n} in a row! +{b}', '{n}연속! +{b}'],
  '正解 {p}/{n} ・ 最大 {c}連続 ・ ボーナス +{b}': ['Correct {p}/{n} · Best streak {c} · Bonus +{b}', '정답 {p}/{n} · 최대 {c}연속 · 보너스 +{b}'],

  // --- 色ちがい探し! ---
  '{n}問': ['{n} found', '{n}문제'],
  '正解 {n} 問 ・ 残り {t} 秒': ['Found {n} · {t} sec left', '정답 {n}문제 · 남은 시간 {t}초'],
  'ちがう! 1秒おやすみ': ['Wrong! 1 sec pause', '틀렸다! 1초 쉬기'],

  // --- 数字タッチ! ---
  '{n}個まで': ['Reached {n}', '{n}까지'],
  '次は {n} ・ {t} 秒': ['Next: {n} · {t} sec', '다음 {n} · {t}초'],

  // --- よけろ! ---
  '生き残り {t} 秒': ['Survived {t} sec', '생존 {t}초'],
  'ここで指を左右に動かす': ['Slide your finger here', '여기서 손가락을 좌우로'],
  'ヒット!': ['Hit!', '맞았다!'],
  'クリア!': ['Clear!', '클리어!'],

  // --- マディーズバーガーを作ろう! ---
  '({n}個・完成!)': [' ({n} stacked · Complete!)', ' ({n}개 · 완성!)'],
  '({n}個)': [' ({n} stacked)', ' ({n}개)'],
  'つぎ': ['Next', '다음'],
  'ケチャップ': ['Ketchup', '케첩'],
  '崩れた!': ['Collapsed!', '무너졌다!'],
  'ポロッ': ['Oops', '툭'],
  'ギリギリ': ['Close one', '아슬아슬'],
  'ドラッグでお皿を動かす': ['Drag to move the plate', '드래그해서 접시를 움직여요'],
  '下のバンズ': ['Bottom bun', '아래 번'],
  'レタス': ['Lettuce', '양상추'],
  'パティ': ['Patty', '패티'],
  'トマト': ['Tomato', '토마토'],
  '玉ねぎ': ['Onion', '양파'],
  'チーズ': ['Cheese', '치즈'],
  '上のバンズ': ['Top bun', '위 번'],

  // --- ジャックを注げ! ---
  'あふれた!': ['Overflowed!', '넘쳤다!'],
  'あふれた! 失敗!': ['Overflowed! Failed!', '넘쳤다! 실패!'],
  '注いでない': ['Didn’t pour', '안 따름'],
  '注いでない…': ['Didn’t pour…', '안 따랐다…'],
  '誤差 {n}ml': ['Off by {n}ml', '오차 {n}ml'],
  '({a}ml / お題{b}ml)': [' ({a}ml / target {b}ml)', ' ({a}ml / 목표 {b}ml)'],
  '{t} 注げ!': ['Pour {t}!', '{t} 따라라!'],
  'ボトルを押して注ぐ(ふちまで315ml) ・ 残り {t} 秒': ['Hold the bottle to pour (315ml to the brim) · {t} sec left', '병을 눌러서 따르기 (가득 315ml) · 남은 시간 {t}초'],

  // --- 俺のハンバーグを焼け! ---
  '全部焦げた…': ['All burnt…', '전부 탔다…'],
  '平均誤差 {n}': ['Avg error {n}', '평균 오차 {n}'],
  '焦げた!': ['Burnt!', '탔다!'],
  'レア': ['Rare', '레어'],
  'ミディアムレア': ['Medium rare', '미디엄 레어'],
  'ミディアム': ['Medium', '미디엄'],
  'ウェルダン': ['Well-done', '웰던'],

  // --- だるまさんがころんだ! ---
  '進んでない': ['Didn’t move', '안 움직임'],
  'ゴール!': ['Goal!', '골인!'],
  'あと {n}m': ['{n}m to go', '{n}m 남음'],
  'あと {n} m': ['{n} m to go', '{n} m 남음'],
  '(バレた!)': [' (caught!)', ' (들켰다!)'],
  '(時間切れ)': [' (time’s up)', ' (시간 초과)'],
  'あと {n} m ・ 残り {t} 秒': ['{n} m to go · {t} sec left', '{n} m 남음 · 남은 시간 {t}초'],
  'ブレーキ': ['BRAKE', '브레이크'],
  'ダッシュ': ['DASH', '대시'],
  '長押しで加速': ['Hold to speed up', '길게 눌러 가속'],
  'タッチ!': ['Touch!', '터치!'],
  'バレた!': ['Caught!', '들켰다!'],
  'みーつけた!': ['Caught you!', '찾았다!'],
  'タッチされた!': ['You got me!', '잡혔다!'],
  'ラスト!': ['Last!', '마지막!'],

  // --- 南インド風カレーを作ろう! ---
  'よく見て覚えて!': ['Watch and remember!', '잘 보고 외워요!'],
  '入った順にタップ! ・ 残り {t} 秒': ['Tap them in order! · {t} sec left', '들어간 순서대로 탭! · 남은 시간 {t}초'],
  'マスタードシード': ['Mustard seed', '머스터드씨'],
  'マスタード': ['Mustard', '머스터드'],
  'クミン': ['Cumin', '커민'],
  'カレーリーフ': ['Curry leaf', '커리잎'],
  '赤唐辛子': ['Red chili', '홍고추'],
  'ターメリック': ['Turmeric', '강황'],
  'コリアンダー': ['Coriander', '고수씨'],
  'フェヌグリーク': ['Fenugreek', '호로파'],
  'ヒング': ['Hing', '힝'],
  'カルダモン': ['Cardamom', '카다멈'],
  'シナモン': ['Cinnamon', '시나몬'],
  'クローブ': ['Clove', '정향'],
  '黒こしょう': ['Black pepper', '흑후추'],

  // --- キレイに書けるかな?(お手本の字は日本の字のまま) ---
  'お手本': ['Model', '견본'],
  'お手本「{c}」': ['Model 「{c}」', '견본 「{c}」'],
  'お手本どおりに書こう': ['Copy the model', '견본대로 써 보세요'],
  '画数': ['Strokes', '획수'],
  '1画もどす': ['Undo stroke', '한 획 지우기'],
  '全部消す': ['Clear', '모두 지우기'],
  '形': ['Shape', '모양'],
  '大きさ': ['Size', '크기'],
  '位置': ['Position', '위치'],
  '書き順': ['Order', '획순'],
  'なめらか': ['Smooth', '매끄러움']
};
