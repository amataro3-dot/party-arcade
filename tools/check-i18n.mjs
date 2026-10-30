// 翻訳の足し忘れを見つける道具。party-arcade のフォルダで `node tools/check-i18n.mjs` と打つ。
// - .js の中の日本語の文字(文字列)が、i18n.js の辞書(I18N)にあるか調べる
//   (ゲームの名前・説明は I18N_GAMES、お手本の字など訳さないものは下の IGNORE)
// - 辞書の英語・韓国語がそろっているか、{n} などの置きかえ場所が日本語と同じかも調べる
// 何も出なければ OK。問題があると、ファイル名:行 と文字を出して、終わりのコードが 1 になる。
import fs from 'fs';
import vm from 'vm';

const FILES = ['core.js', 'battle.js', 'games.js', 'games2.js'];
const JP = /[぀-ヺー-ヿ一-鿿]/;   // ひらがな・カタカナ・漢字(「・」はのぞく)
// 訳さなくてよい日本語(お手本の字・旗揚げの日本語のお題・開発者だけが見るメッセージ)
const IGNORE = new Set([
  'だるまさんがころんだ', '赤', '白', '上げ', '下げ', 'て', 'ない', 'ないで',
  'ログインできませんでした'
]);
const IGNORE_RE = [/^[぀-ヿ]$/, /^<h1>設定が必要です/];

// i18n.js を読んで、辞書を取り出す
const ctx = { localStorage: { getItem: () => 'ja', setItem() {} }, navigator: { language: 'ja' }, document: { documentElement: {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('i18n.js', 'utf8') + '\n;globalThis.__d = { I18N, I18N_GAMES };', ctx);
const { I18N, I18N_GAMES } = ctx.__d;

// 文字列(' " `)を取り出す(コメントは飛ばす。`…${…}…` の中も見る)
function strings(src) {
  const out = []; let i = 0, line = 1;
  const stack = [];   // テンプレートの ${ } の深さ
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); line += (src.slice(i, e).match(/\n/g) || []).length; i = e + 2; continue; }
    if (c === '/' && /[(,=:[!&|?{};+]$/.test(src.slice(Math.max(0, i - 20), i).trimEnd() || ';')) {   // /…/ (正規表現)は飛ばす
      let j = i + 1, cls = false;
      while (j < src.length && src[j] !== '\n' && (cls || src[j] !== '/')) { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; j++; }
      i = j + 1; continue;
    }
    if (c === "'" || c === '"') {
      let s = '', j = i + 1;
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') { s += src[j + 1]; j += 2; } else s += src[j++]; }
      out.push({ s, line }); i = j + 1; continue;
    }
    if (c === '`' || (c === '}' && stack.length && stack[stack.length - 1] === 0)) {
      if (c === '}') stack.pop();
      let s = '', j = i + 1, l0 = line;
      while (j < src.length && src[j] !== '`' && !(src[j] === '$' && src[j + 1] === '{')) {
        if (src[j] === '\n') line++;
        if (src[j] === '\\') { s += src[j + 1]; j += 2; } else s += src[j++];
      }
      out.push({ s, line: l0, tpl: true });
      if (src[j] === '$') { stack.push(0); i = j + 2; } else i = j + 1;
      continue;
    }
    if (stack.length) { if (c === '{') stack[stack.length - 1]++; else if (c === '}') stack[stack.length - 1]--; }
    i++;
  }
  return out;
}

const gameTexts = new Set();   // ゲームの名前・説明(日本語)は I18N_GAMES で訳す
const problems = [];
for (const f of FILES) {
  for (const { s, line, tpl } of strings(fs.readFileSync(f, 'utf8'))) {
    if (!JP.test(s)) continue;
    if (I18N[s] || IGNORE.has(s) || IGNORE_RE.some(r => r.test(s))) continue;
    // ゲームの title / desc / descBase(GAMES.push の中)は I18N_GAMES で確かめる
    if (!tpl && (f === 'games.js' || f === 'games2.js')) { gameTexts.add(s); continue; }
    problems.push(`${f}:${line} 辞書にない: ${JSON.stringify(s).slice(0, 90)}`);
  }
}
// ゲームの名前・説明: GAMES を読みこんで、全部の id に en / ko があるか
const g = { T: s => s, LANG: 'ja', window: {}, document: {}, h: s => s };
vm.createContext(g);
vm.runInContext(fs.readFileSync('games.js', 'utf8') + '\n' + fs.readFileSync('games2.js', 'utf8') + '\n;globalThis.__G = GAMES;', g);
for (const game of g.__G) {
  for (const l of ['en', 'ko']) {
    const t = I18N_GAMES[game.id] && I18N_GAMES[game.id][l];
    if (!t || !t.title || !t.desc) problems.push(`I18N_GAMES.${game.id}.${l} がない`);
  }
  gameTexts.delete(game.title); gameTexts.delete(game.desc); gameTexts.delete(game.descBase);
}
for (const s of gameTexts) problems.push(`games: 辞書にない: ${JSON.stringify(s).slice(0, 90)}`);
// 辞書の中身
const ph = s => (s.match(/\{\w+\}/g) || []).sort().join(',');
for (const [ja, tr] of Object.entries(I18N)) {
  if (!Array.isArray(tr) || tr.length !== 2 || !tr[0] || !tr[1]) { problems.push(`I18N[${JSON.stringify(ja)}] は [英語, 韓国語] にする`); continue; }
  tr.forEach((t, i) => { if (ph(t) !== ph(ja)) problems.push(`I18N[${JSON.stringify(ja)}] の${i ? '韓国語' : '英語'}の {…} が日本語とちがう`); });
}
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('OK: 翻訳の足し忘れなし(' + Object.keys(I18N).length + ' 文、ゲーム ' + g.__G.length + ' 個)');
