/* ROUTIQ landing page script. No dependencies. */
(() => {
  "use strict";

  // ---- Edit these before launch ----------------------------------------
  const CONFIG = {
    chain: {
      chainId: "0x1237", // 4663, Robinhood Chain mainnet
      chainName: "Robinhood Chain",
      rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"],
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      blockExplorerUrls: ["https://robinhoodchain.blockscout.com"],
    },
    tokenAddress: "", // official $ROUTIQ contract; empty until deployed
    links: { x: "", discord: "", github: "" }, // empty = "coming soon"
    rpcPollMs: 4000,
    swapGasUnits: 350000, // rough gas for a multi-venue swap, used for the fee estimate
  };

  // Demo reference prices in USD. Illustration only, never shown as a live quote.
  const TOKENS = {
    USDG: { usd: 1, dp: 2 },
    ETH: { usd: 3200, dp: 5 },
    TSLA: { usd: 250, dp: 4 },
    NVDA: { usd: 180, dp: 4 },
    AAPL: { usd: 230, dp: 4 },
    AMZN: { usd: 220, dp: 4 },
  };
  const VENUES = ["Uniswap", "Arcus", "Pleiades"];
  // -----------------------------------------------------------------------

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = (n, dp = 2) => n.toLocaleString("en-US", { maximumFractionDigits: dp, minimumFractionDigits: 0 });

  // ---- Toast ----
  const toastEl = $("[data-toast]");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2800);
  }

  // ---- Clipboard ----
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {
      const ta = Object.assign(document.createElement("textarea"), { value: text });
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { /* ignore */ }
      ta.remove();
      return ok;
    }
  }
  function flashCopied(btn) {
    const old = btn.textContent;
    btn.textContent = "Copied";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = old; btn.classList.remove("copied"); }, 1600);
  }

  // ---- Contract address + links ----
  const caBtn = $("[data-copy-ca]");
  if (CONFIG.tokenAddress) {
    const ca = $("[data-ca]");
    ca.textContent = CONFIG.tokenAddress;
    ca.style.color = "#fff";
    caBtn.hidden = false;
    caBtn.addEventListener("click", async () => { if (await copyText(CONFIG.tokenAddress)) flashCopied(caBtn); });
  }
  function wireLinks(root = document) {
    $$("[data-link]", root).forEach((a) => {
      const url = CONFIG.links[a.dataset.link];
      if (url) Object.assign(a, { href: url, target: "_blank", rel: "noopener" });
      else a.addEventListener("click", (e) => { e.preventDefault(); toast("Coming soon"); });
    });
  }
  wireLinks();

  // ---- Nav: glass on scroll + mobile menu ----
  const nav = $("[data-nav]");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 12);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const menuBtn = $("[data-menu-btn]");
  const menuPanel = $("[data-menu-panel]");
  const setMenu = (open) => { menuPanel.hidden = !open; menuBtn.setAttribute("aria-expanded", String(open)); };
  menuBtn.addEventListener("click", () => setMenu(menuPanel.hidden));
  $$("a", menuPanel).forEach((a) => a.addEventListener("click", () => setMenu(false)));

  // ---- Spotlight that follows the pointer on cards ----
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest?.(".spot");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });

  // ---- Scroll reveal ----
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("revealed"); revealIO.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  $$("[data-reveal]").forEach((el) => revealIO.observe(el));

  // ---- Marquee ----
  const MQ = [
    ["TSLA", "stock token"], ["Uniswap", "AMM"], ["NVDA", "stock token"], ["USDG", "stablecoin"],
    ["Arcus", "order book"], ["AAPL", "stock token"], ["ETH", "gas"], ["Pleiades", "prop AMM"],
    ["AMZN", "stock token"], ["Lending", "USDG yield"], ["Blockscout", "explorer"],
  ];
  const mqHtml = MQ.map(([b, s]) => `<span class="mq-item"><b>${b}</b><small>${s}</small></span><span class="mq-sep" aria-hidden="true"></span>`).join("");
  $("[data-marquee]").innerHTML = mqHtml + mqHtml;

  // ---- Hero network canvas ----
  (function heroNetwork() {
    const canvas = $("[data-net]");
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, nodes = [], packets = [], raf = 0, visible = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const LINK = 150;

    function resize() {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(70, Math.round((w * h) / 17000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.4 + 0.8,
      }));
      packets = [];
    }

    function spawnPacket() {
      const a = nodes[(Math.random() * nodes.length) | 0];
      let best = null, bd = Infinity;
      for (const b of nodes) {
        if (b === a) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK && d > 40 && d < bd) { bd = d; best = b; }
      }
      if (best) packets.push({ a, b: best, t: 0, sp: 0.008 + Math.random() * 0.01 });
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(124, 92, 255, ${(1 - d / LINK) * 0.22})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = "rgba(201, 201, 214, .55)";
      for (const n of nodes) { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill(); }
      if (packets.length < 9 && Math.random() < 0.08) spawnPacket();
      packets = packets.filter((p) => p.t <= 1);
      for (const p of packets) {
        p.t += p.sp;
        const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
        g.addColorStop(0, "rgba(56, 217, 245, .95)");
        g.addColorStop(1, "rgba(56, 217, 245, 0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
      }
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    }

    const start = () => { cancelAnimationFrame(raf); if (reduceMotion) frame(); else raf = requestAnimationFrame(frame); };
    resize();
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { resize(); start(); }, 150); });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); }).observe(canvas);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && visible) start(); });
    start();
  })();

  // ---- Live chain data ----
  const chain = { gasWei: null, firstBlock: null, firstAt: 0, lastBlock: null, lastAt: 0, series: [] };
  const blockEls = $$("[data-block]");
  const gasEl = $("[data-gas]");
  const liveDots = $$("[data-live-dot]");
  const liveLabel = $("[data-live-label]");
  let rpcFails = 0, pollTimer;

  async function rpc(method, params = []) {
    const res = await fetch(CONFIG.chain.rpcUrls[0], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    });
    if (!res.ok) throw new Error(`RPC ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json.result;
  }

  function drawSpark() {
    const s = chain.series;
    if (s.length < 2) return;
    const max = Math.max(...s) || 1, min = Math.min(...s);
    const span = max - min || 1;
    const pts = s.map((v, i) => [(i / (s.length - 1)) * 300, 62 - ((v - min) / span) * 50]);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    $("[data-spark]").setAttribute("d", line);
    $("[data-spark-fill]").setAttribute("d", `${line} L300 70 L0 70 Z`);
  }

  async function pollChain() {
    try {
      const [blockHex, gasHex] = await Promise.all([rpc("eth_blockNumber"), rpc("eth_gasPrice")]);
      const block = Number(BigInt(blockHex));
      const now = performance.now();
      if (chain.firstBlock === null) { chain.firstBlock = block; chain.firstAt = now; }
      if (chain.lastBlock !== null && now > chain.lastAt) {
        chain.series.push(((block - chain.lastBlock) / (now - chain.lastAt)) * 1000);
        if (chain.series.length > 30) chain.series.shift();
        drawSpark();
      }
      chain.lastBlock = block; chain.lastAt = now;
      chain.gasWei = BigInt(gasHex);

      blockEls.forEach((el) => { el.textContent = fmt(block, 0); });
      const gwei = Number(chain.gasWei) / 1e9;
      gasEl.textContent = gwei === 0 ? "0" : gwei < 0.001 ? gwei.toExponential(1) : gwei < 1 ? gwei.toFixed(3) : gwei.toFixed(2);
      const seen = block - chain.firstBlock;
      $("[data-seen]").textContent = fmt(seen, 0);
      if (seen > 0) $("[data-blocktime]").textContent = `≈ ${fmt((now - chain.firstAt) / seen, 0)} ms`;
      liveDots.forEach((d) => d.classList.add("is-live"));
      liveLabel.textContent = "· live";
      rpcFails = 0;
      renderQuote(false);
    } catch {
      rpcFails += 1;
      if (rpcFails >= 2) {
        blockEls.forEach((el) => { el.textContent = "—"; });
        gasEl.textContent = "—";
        liveDots.forEach((d) => d.classList.remove("is-live"));
        liveLabel.textContent = "· RPC unavailable, retrying";
      }
    }
    pollTimer = setTimeout(pollChain, rpcFails > 3 ? CONFIG.rpcPollMs * 4 : CONFIG.rpcPollMs);
  }
  document.addEventListener("visibilitychange", () => { clearTimeout(pollTimer); if (!document.hidden) pollChain(); });
  pollChain();

  // ---- US market hours ring (regular session, holidays not included) ----
  (function marketClock() {
    const C = 2 * Math.PI * 50;
    const open = $("[data-ring-open]");
    open.setAttribute("stroke-dasharray", `${C * (6.5 / 24)} ${C}`);
    open.setAttribute("stroke-dashoffset", `${-C * (9.5 / 24)}`);
    function tick() {
      const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23",
      }).formatToParts(new Date()).map((p) => [p.type, p.value]));
      const mins = Number(parts.hour) * 60 + Number(parts.minute);
      const weekend = parts.weekday === "Sat" || parts.weekday === "Sun";
      const isOpen = !weekend && mins >= 570 && mins < 960;
      $("[data-ring-hand]").style.transform = `rotate(${(mins / 1440) * 360}deg)`;
      const st = $("[data-mkt-status]");
      st.textContent = isOpen ? "Exchange open" : "Exchange closed";
      st.className = `mkt-status ${isOpen ? "is-open" : "is-closed"}`;
      $("[data-mkt-note]").textContent = isOpen
        ? "Stock tokens on Robinhood Chain trade now — and keep trading after the closing bell."
        : "The exchange is closed right now, but stock tokens on Robinhood Chain still trade 24/7.";
    }
    tick();
    setInterval(tick, 30000);
  })();

  // ---- Swap preview (demo routing model) ----
  const inEl = $("[data-amt-in]");
  const tokIn = $("[data-tok-in]");
  const tokOut = $("[data-tok-out]");
  const outEl = $("[data-amt-out]");
  const barsEl = $("[data-route-bars]");
  const opts = Object.keys(TOKENS).map((t) => `<option value="${t}">${t}</option>`).join("");
  tokIn.innerHTML = opts; tokOut.innerHTML = opts;
  tokIn.value = "USDG"; tokOut.value = "TSLA";
  barsEl.innerHTML = VENUES.map((v) => `<div class="rbar"><span class="rbar-name">${v}</span><span class="rbar-track"><span class="rbar-fill"></span></span><span class="rbar-pct">0%</span></div>`).join("");

  // Diagram particles that travel along each route.
  const particleG = $("[data-particles]");
  if (!reduceMotion) {
    const ns = "http://www.w3.org/2000/svg";
    VENUES.forEach((_, i) => {
      for (let k = 0; k < 3; k++) {
        const c = document.createElementNS(ns, "circle");
        c.setAttribute("r", "4");
        c.setAttribute("class", "particle");
        c.dataset.route = i;
        const am = document.createElementNS(ns, "animateMotion");
        am.setAttribute("dur", `${2.6 + i * 0.25}s`);
        am.setAttribute("begin", `${k * 0.9 + i * 0.3}s`);
        am.setAttribute("repeatCount", "indefinite");
        const mp = document.createElementNS(ns, "mpath");
        mp.setAttribute("href", `#r${i}`);
        am.appendChild(mp);
        c.appendChild(am);
        particleG.appendChild(c);
      }
    });
  }

  function quote(amount, a, b) {
    const usd = amount * TOKENS[a].usd;
    if (!(usd > 0) || a === b) return null;
    const n = usd < 1000 ? 1 : usd < 20000 ? 2 : 3;
    const base = n === 1 ? [1] : n === 2 ? [0.62, 0.38] : [0.52, 0.31, 0.17];
    const j = 0.05 * Math.sin(Math.log10(usd) * 2.7);
    let shares = base.map((s, i) => (n > 1 ? Math.max(0.05, s + (i === 0 ? j : -j / (n - 1))) : s));
    const sum = shares.reduce((x, y) => x + y, 0);
    shares = shares.map((s) => s / sum);
    while (shares.length < 3) shares.push(0);
    const single = Math.min(usd / 1.5e6, 0.15);
    const routed = n === 1 ? single : single * shares.reduce((acc, s) => acc + s * s, 0) * 1.08;
    const fee = 0.0005;
    return { usd, n, shares, single, routed, out: (usd * (1 - routed - fee)) / TOKENS[b].usd };
  }

  let shownOut = 0, tweenRaf = 0;
  function tweenOut(to, dp) {
    cancelAnimationFrame(tweenRaf);
    const from = shownOut, t0 = performance.now(), dur = reduceMotion ? 0 : 450;
    const step = (t) => {
      const k = dur ? Math.min(1, (t - t0) / dur) : 1;
      shownOut = from + (to - from) * (1 - Math.pow(1 - k, 3));
      outEl.textContent = fmt(shownOut, dp);
      if (k < 1) tweenRaf = requestAnimationFrame(step);
    };
    tweenRaf = requestAnimationFrame(step);
  }

  function feeText() {
    if (chain.gasWei === null) return "—";
    const eth = (Number(chain.gasWei) * CONFIG.swapGasUnits) / 1e18;
    return `≈ ${eth < 0.000001 ? eth.toExponential(1) : eth.toFixed(6)} ETH`;
  }

  function renderQuote(animate = true) {
    const a = tokIn.value, b = tokOut.value;
    const amount = parseFloat(inEl.value.replace(/,/g, "")) || 0;
    const q = quote(amount, a, b);
    $("[data-usd-in]").textContent = amount > 0 ? `≈ $${fmt(amount * TOKENS[a].usd, 2)}` : "";
    $("[data-fee]").textContent = feeText();
    $("[data-d-in]").textContent = `${fmt(amount, 2)} ${a}`;
    const bars = $$(".rbar", barsEl);
    if (!q) {
      outEl.textContent = "0"; shownOut = 0;
      $("[data-rate]").textContent = "—";
      ["[data-impact]", "[data-saved]"].forEach((s) => { $(s).textContent = "—"; });
      $("[data-route-count]").textContent = "—";
      $("[data-d-out]").textContent = "—";
      bars.forEach((el) => { el.classList.add("is-off"); $(".rbar-fill", el).style.width = "0"; $(".rbar-pct", el).textContent = "0%"; });
      updateDiagram([0, 0, 0]);
      return;
    }
    const dp = TOKENS[b].dp;
    if (animate) tweenOut(q.out, dp); else { outEl.textContent = fmt(q.out, dp); shownOut = q.out; }
    $("[data-rate]").textContent = `1 ${a} ≈ ${fmt(TOKENS[a].usd / TOKENS[b].usd, 6)} ${b}`;
    $("[data-impact]").textContent = `${(q.routed * 100).toFixed(2)}%`;
    $("[data-saved]").textContent = q.n === 1 ? "single venue is best" : `+${((q.single - q.routed) * 100).toFixed(2)}%`;
    $("[data-route-count]").textContent = `${q.n} venue${q.n > 1 ? "s" : ""}`;
    $("[data-d-out]").textContent = `${fmt(q.out, Math.min(dp, 2))} ${b}`;
    bars.forEach((el, i) => {
      const pct = Math.round(q.shares[i] * 100);
      el.classList.toggle("is-off", pct === 0);
      $(".rbar-fill", el).style.width = `${pct}%`;
      $(".rbar-pct", el).textContent = `${pct}%`;
    });
    updateDiagram(q.shares);
  }

  function updateDiagram(shares) {
    shares.forEach((s, i) => {
      const on = s > 0;
      const use = $(`[data-flow="${i}"] path`);
      use.style.setProperty("--w", (1.5 + s * 6).toFixed(2));
      use.style.setProperty("--o", on ? "1" : "0");
      const v = $(`[data-venue="${i}"]`);
      v.classList.toggle("is-on", on);
      v.classList.toggle("is-off", !on);
      $(`[data-share="${i}"]`).textContent = on ? `${Math.round(s * 100)}% OF ORDER` : "NOT USED";
      $$(`.particle[data-route="${i}"]`, particleG).forEach((c) => { c.style.display = on ? "" : "none"; });
    });
  }

  inEl.addEventListener("input", () => {
    const clean = inEl.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").slice(0, 14);
    if (clean !== inEl.value) inEl.value = clean;
    renderQuote();
  });
  tokIn.addEventListener("change", () => {
    if (tokIn.value === tokOut.value) tokOut.value = tokIn.value === "USDG" ? "TSLA" : "USDG";
    renderQuote();
  });
  tokOut.addEventListener("change", () => {
    if (tokIn.value === tokOut.value) tokIn.value = tokOut.value === "USDG" ? "TSLA" : "USDG";
    renderQuote();
  });
  $("[data-flip]").addEventListener("click", () => {
    const a = tokIn.value;
    const out = parseFloat(outEl.textContent.replace(/,/g, "")) || 0;
    tokIn.value = tokOut.value; tokOut.value = a;
    if (out > 0) inEl.value = String(Number(out.toFixed(TOKENS[tokIn.value].dp)));
    renderQuote();
  });
  renderQuote(false);

  // ---- Wallet connect (any EIP-1193 browser wallet) ----
  const connectBtns = $$("[data-connect]");
  const swapBtn = $("[data-swap-btn]");
  let account = null, chainOk = false;
  const eth = () => window.ethereum;
  const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
  const NO_WALLET = "No wallet found. Install MetaMask, Rabby or Robinhood Wallet.";

  function renderWallet() {
    connectBtns.forEach((btn) => {
      btn.classList.toggle("is-connected", !!account);
      btn.classList.toggle("is-wrong-chain", !!account && !chainOk);
      $("[data-connect-label]", btn).textContent = !account ? "Connect wallet" : !chainOk ? "Switch network" : short(account);
    });
    swapBtn.textContent = !account ? "Connect wallet to swap" : !chainOk ? "Switch to Robinhood Chain" : "Swap opens with router beta";
  }
  async function readChain() {
    try { chainOk = (await eth().request({ method: "eth_chainId" })).toLowerCase() === CONFIG.chain.chainId; } catch { chainOk = false; }
  }
  async function ensureChain() {
    try {
      await eth().request({ method: "wallet_switchEthereumChain", params: [{ chainId: CONFIG.chain.chainId }] });
    } catch (err) {
      const code = err?.code ?? err?.data?.originalError?.code;
      if (code === 4902 || code === -32603) await eth().request({ method: "wallet_addEthereumChain", params: [CONFIG.chain] });
      else throw err;
    }
    await readChain();
  }
  const walletError = (err) => toast(err?.code === 4001 ? "Request cancelled in wallet" : "Wallet error — please try again");

  async function connect() {
    if (!eth()) { toast(NO_WALLET); return; }
    try {
      if (account && chainOk) { if (await copyText(account)) toast(`Address copied · ${short(account)}`); return; }
      if (!account) account = (await eth().request({ method: "eth_requestAccounts" }))[0] || null;
      await ensureChain();
      renderWallet();
      if (account && chainOk) toast("Connected to Robinhood Chain");
    } catch (err) { renderWallet(); walletError(err); }
  }
  connectBtns.forEach((b) => b.addEventListener("click", connect));
  swapBtn.addEventListener("click", () => {
    if (account && chainOk) toast("Router beta is coming — follow ROUTIQ for launch news");
    else connect();
  });
  $$("[data-add-chain]").forEach((el) => el.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!eth()) { toast(NO_WALLET); return; }
    try { await ensureChain(); renderWallet(); toast("Robinhood Chain is ready in your wallet"); } catch (err) { walletError(err); }
  }));
  if (eth()) {
    eth().request({ method: "eth_accounts" }).then(async (accs) => {
      account = accs[0] || null;
      if (account) await readChain();
      renderWallet();
    }).catch(() => {});
    eth().on?.("accountsChanged", (accs) => { account = accs[0] || null; renderWallet(); });
    eth().on?.("chainChanged", async () => { await readChain(); renderWallet(); });
  }

  // ---- Code tabs ----
  const tabs = $$("[data-tab]");
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    $$("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== t.dataset.tab; });
  }));
  const codeCopy = $("[data-code-copy]");
  codeCopy.addEventListener("click", async () => {
    const panel = $$("[data-panel]").find((p) => !p.hidden);
    if (panel && (await copyText(panel.textContent))) flashCopied(codeCopy);
  });
})();
