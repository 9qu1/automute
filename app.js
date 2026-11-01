/* ═══════════ AutoMute 紹介サイト（くあぼっとの紹介サイトのしくみを流用） ═══════════ */
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 40) : ms));

/* ─── Typewriter (hero) ─── */
const phrases = [
  "タスク中は、自動でミュート。",
  "会議になったら、自動で解除。",
  "死んだ人どうしは、こっそり話せる。",
  "15人でも、すばやく切り替え。",
];
(async () => {
  const el = document.getElementById("typewriter");
  if (!el) return;
  let i = 0;
  for (;;) {
    const p = phrases[i % phrases.length];
    for (let c = 1; c <= p.length; c++) { el.textContent = p.slice(0, c); await sleep(70); }
    await sleep(2100);
    for (let c = p.length; c >= 0; c--) { el.textContent = p.slice(0, c); await sleep(26); }
    i++;
  }
})();

/* ─── Scroll reveal ─── */
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("on")),
  { threshold: 0.12 },
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

/* ─── Count up ─── */
const cio = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const target = +e.target.dataset.count;
    const start = performance.now();
    const dur = 1100;
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      e.target.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))).toLocaleString();
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}, { threshold: 0.6 });
document.querySelectorAll("[data-count]").forEach((el) => cio.observe(el));

/* ═══════════ Discord風デモエンジン ═══════════ */
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function botMsg(label = "AutoMute") {
  return el(`
    <div class="msg">
      <div class="avatar bot img"><img src="img/automute-256.webp" alt="" /></div>
      <div class="msg-main">
        <div class="msg-name">${label}<span class="bot-tag">BOT</span><span class="msg-time">今日</span></div>
        <div class="msg-text"></div>
      </div>
    </div>`);
}

function runDemoLoop(id, fn) {
  const root = document.getElementById(id);
  if (!root) return;
  const body = root.querySelector(".dw-body");
  let visible = false;
  new IntersectionObserver((es) => es.forEach((e) => (visible = e.isIntersecting)), { threshold: 0.2 }).observe(root);
  (async () => {
    for (;;) {
      while (!visible) await sleep(400);
      body.innerHTML = "";
      try { await fn(body); } catch {}
      await sleep(3200);
    }
  })();
}

/* ─── デモ1: 試合に合わせて自動でミュート ─── */
const PEOPLE = [
  ["くぁ", "user", "く"], ["みー", "user2", "み"], ["たろ", "user3", "た"], ["ゆき", "user", "ゆ"], ["ぽん", "user2", "ぽ"],
];
runDemoLoop("demo-vc", async (body) => {
  const bar = el(`<div class="phase-bar"><span class="phase-pill"></span><span class="phase-note"></span></div>`);
  const list = el(`<div class="vc-list"></div>`);
  body.append(bar, el(`<div class="vc-ch">🔊 Among Us</div>`), list);
  const rows = PEOPLE.map(([name, cls, ini]) => {
    const r = el(`
      <div class="vc-member">
        <div class="avatar ${cls}">${ini}</div>
        <span class="who">${name}<span class="ghost">👻</span></span>
        <span class="vc-icons"><svg class="ic-mic"><use href="#i-micoff"/></svg><svg class="ic-deaf"><use href="#i-deaf"/></svg></span>
      </div>`);
    list.appendChild(r);
    return r;
  });
  body.appendChild(el(`<div class="vc-legend"><span><svg><use href="#i-micoff"/></svg>ミュート</span>`
    + `<span><svg><use href="#i-deaf"/></svg>スピーカーミュート（何も聞こえない）</span><span>👻 死んだ人</span></div>`));
  const pill = bar.querySelector(".phase-pill");
  const note = bar.querySelector(".phase-note");
  const dead = new Set();
  const show = (cls, label, text, state) => {
    pill.className = "phase-pill " + cls;
    pill.textContent = label;
    note.textContent = text;
    rows.forEach((r, i) => {
      const [mute, deaf, talk] = state(dead.has(i));
      r.classList.toggle("mute", mute);
      r.classList.toggle("deaf", deaf);
      r.classList.toggle("talk", talk);
      r.classList.toggle("dead", dead.has(i) && cls !== "tasks-secret");
    });
  };
  const talkAll = () => [false, false, true];
  show("lobby", "ロビー", "みんな話せる", talkAll);
  await sleep(2200);
  show("tasks", "タスク中", "生きている人は何も聞こえない", (d) => (d ? [false, false, true] : [true, true, false]));
  await sleep(2200);
  dead.add(2);  // たろがキルされた（まだ誰も知らない）
  show("tasks", "タスク中", "たろがキルされた…でも会議まで秘密", (d) => [true, true, false]);
  rows[2].classList.remove("dead");
  await sleep(2400);
  show("meeting", "会議中", "生きている人は話せる・死んだ人は聞くだけ", (d) => (d ? [true, false, false] : [false, false, true]));
  await sleep(2600);
  show("tasks", "タスク中", "死んだ人どうしは話せる", (d) => (d ? [false, false, true] : [true, true, false]));
  await sleep(2400);
  show("end", "試合終了", "みんな話せる", talkAll);
});

/* ─── デモ2: 状態パネル（キャラを選んで紐付け） ─── */
runDemoLoop("demo-panel", async (body) => {
  const m = botMsg();
  const embed = el(`
    <div class="embed panel ok">
      <div class="embed-title">🎮 オートミュート</div>
      <div class="embed-desc">🟢 AmongUsCapture がつながっています</div>
      <div class="embed-grid">
        <div class="embed-field"><div class="f-name">場面</div><div class="f-value">ロビー</div></div>
        <div class="embed-field"><div class="f-name">ルームコード</div><div class="f-value">ABCDEF</div></div>
        <div class="embed-field"><div class="f-name">紐付け</div><div class="f-value count">2 / 3 人</div></div>
        <div class="embed-field"><div class="f-name">🔴 くぁ</div><div class="f-value">@くぁ</div></div>
        <div class="embed-field"><div class="f-name">🔵 みー</div><div class="f-value mii">まだ（下で選ぶ）</div></div>
        <div class="embed-field"><div class="f-name">🟢 たろ</div><div class="f-value">@たろ</div></div>
      </div>
      <div class="d-select"><span>自分のキャラを選ぶ（1 回選べば、次からは自動）</span><span>▾</span></div>
    </div>`);
  m.querySelector(".msg-text").replaceChildren(embed);
  body.appendChild(m);
  await sleep(1500);
  const sel = embed.querySelector(".d-select");
  sel.classList.add("open");
  const opts = el(`<div class="d-options"><div class="d-option">🔴 赤 くぁ</div><div class="d-option">🔵 青 みー</div><div class="d-option">🟢 緑 たろ</div></div>`);
  sel.after(opts);
  await sleep(800);
  opts.children[1].classList.add("hl");
  await sleep(700);
  opts.remove();
  sel.classList.remove("open");
  embed.querySelector(".mii").textContent = "@みー";
  embed.querySelector(".count").textContent = "3 / 3 人";
  await sleep(400);
  const reply = botMsg();
  reply.querySelector(".msg-text").innerHTML = `「みー」に紐付けました。次からは自動で紐付きます。<div class="ephemeral">👁 あなただけに表示されています</div>`;
  body.appendChild(reply);
});

/* ─── デモ3: ボタン 1 つでつながる ─── */
runDemoLoop("demo-connect", async (body) => {
  const m = botMsg();
  const embed = el(`
    <div class="embed panel">
      <div class="embed-title">🎮 オートミュート</div>
      <div class="embed-desc state">🔴 AmongUsCapture がつながっていません
PC 版で遊ぶ誰か 1 人が、Among Us と同じ PC で下の「AmongUsCapture とつなぐ」を押してください。</div>
      <div class="btn-row"><button class="d-btn link cap">🔌 AmongUsCapture とつなぐ ↗</button></div>
      <div class="btn-row"><button class="d-btn">⏹️ 終了</button><button class="d-btn">🔄 再起動</button><button class="d-btn">🔊 全員のミュートを外す</button></div>
    </div>`);
  m.querySelector(".msg-text").replaceChildren(embed);
  body.appendChild(m);
  await sleep(1600);
  const cap = embed.querySelector(".cap");
  cap.classList.add("pressed");
  await sleep(1400);
  embed.classList.add("ok");
  embed.querySelector(".state").textContent = "🟢 AmongUsCapture がつながっています\n本家 Capture 1: 場面: ロビー";
});
