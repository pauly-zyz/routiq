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
    // Official $ROUTIQ contract address. Leave empty until it is deployed.
    tokenAddress: "",
    // Social / repo links. Empty = shows "coming soon".
    links: { x: "", discord: "", github: "" },
    rpcPollMs: 4000,
  };
  // -----------------------------------------------------------------------

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
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
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const src = btn.parentElement.querySelector("[data-copy-src]");
      if (src && (await copyText(src.textContent.trim()))) flashCopied(btn);
    });
  });

  // ---- Token contract address ----
  const caEl = $("[data-ca]");
  const caBtn = $("[data-copy-ca]");
  if (CONFIG.tokenAddress) {
    caEl.textContent = CONFIG.tokenAddress;
    caEl.style.color = "var(--ink)";
    caBtn.hidden = false;
    caBtn.addEventListener("click", async () => {
      if (await copyText(CONFIG.tokenAddress)) flashCopied(caBtn);
    });
  }

  // ---- External links ----
  $$("[data-link]").forEach((a) => {
    const url = CONFIG.links[a.dataset.link];
    if (url) {
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
    } else {
      a.addEventListener("click", (e) => { e.preventDefault(); toast("Coming soon"); });
    }
  });

  // ---- Mobile menu ----
  const menuBtn = $("[data-menu-btn]");
  const menuPanel = $("[data-menu-panel]");
  menuBtn.addEventListener("click", () => {
    const open = menuPanel.hidden;
    menuPanel.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  $$("a", menuPanel).forEach((a) => a.addEventListener("click", () => {
    menuPanel.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
  }));

  // ---- Hero decoration: hex digits clipped to a route-node shape ----
  $$("[data-pattern]").forEach((svg, i) => {
    const ns = "http://www.w3.org/2000/svg";
    const id = `routiq-clip-${i}`;
    const hex = "0123456789abcdef";
    let rows = "";
    for (let y = 14; y <= 820; y += 14) {
      let line = "";
      for (let x = 0; x < 100; x++) line += hex[(Math.random() * 16) | 0];
      rows += `<text x="0" y="${y}">${line}</text>`;
    }
    svg.innerHTML =
      `<defs><clipPath id="${id}"><path clip-rule="evenodd" d="` +
      "M410 40a370 370 0 1 1 0 740a370 370 0 1 1 0-740z" + // outer ring
      "M410 230a180 180 0 1 0 0 360a180 180 0 1 0 0-360z" + // hole
      `"/><circle cx="410" cy="410" r="72"/></clipPath></defs>` +
      `<g clip-path="url(#${id})">${rows}</g>`;
    svg.setAttribute("xmlns", ns);
  });

  // ---- Sources wall ----
  const SOURCES = [
    ["Uniswap", "AMM liquidity", "UNI", "dark"],
    ["Arcus", "order-book DEX", "ARC", "dark"],
    ["Lighter", "perps venue", "LIT", "dark"],
    ["Pleiades", "prop AMM", "PLD", "dark"],
    ["USDG", "stablecoin", "$", "soft"],
    ["TSLA", "stock token", "TS", "accent"],
    ["NVDA", "stock token", "NV", "accent"],
    ["AAPL", "stock token", "AA", "accent"],
    ["AMZN", "stock token", "AM", "accent"],
    ["ETH", "gas & collateral", "Ξ", "soft"],
    ["Lending pools", "yield on idle assets", "%", "soft"],
    ["Bridges", "in from Ethereum & L2s", "↔", "soft"],
    ["Blockscout", "on-chain data", "BS", "dark"],
    ["Price oracles", "fair-price checks", "OR", "dark"],
  ];
  const wall = $("[data-wall]");
  wall.innerHTML = SOURCES.map(([name, cap, mark, tone], i) => `
    <div class="tool-wall__tile" style="--reveal-delay:${(i * 0.035).toFixed(3)}s">
      <span class="bmark bmark--${tone}">${mark}</span>
      <div class="tool-wall__text"><div class="tool-wall__name">${name}</div><div class="tool-wall__cap">${cap}</div></div>
    </div>`).join("") + `
    <a class="tool-wall__tile tool-wall__cta" href="#" data-link="github" style="--reveal-delay:${(SOURCES.length * 0.035).toFixed(3)}s">
      <div class="tool-wall__text"><div class="tool-wall__name">Add your source</div><div class="tool-wall__cap">integrate with ROUTIQ</div></div>
      <span aria-hidden="true">→</span>
    </a>`;
  $("a[data-link]", wall).addEventListener("click", (e) => {
    if (!CONFIG.links.github) { e.preventDefault(); toast("Coming soon"); }
  });

  // ---- Scroll reveal ----
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("revealed");
      revealIO.unobserve(en.target);
      if (en.target.classList.contains("cv")) {
        setTimeout(() => wall.classList.add("tool-wall--settled"), 1400);
      }
      if (en.target.classList.contains("term-section")) startTerminal();
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  $$("[data-reveal]").forEach((el) => revealIO.observe(el));

  // ---- Live chain data from the public RPC ----
  const blockEls = $$("[data-block]");
  const gasEl = $("[data-gas]");
  const liveDot = $("[data-live-dot]");
  const liveLabel = $("[data-live-label]");
  let rpcFails = 0;
  let pollTimer;

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

  function formatGwei(weiHex) {
    const gwei = Number(BigInt(weiHex)) / 1e9;
    if (gwei === 0) return "0";
    if (gwei < 0.001) return gwei.toExponential(1);
    return gwei < 1 ? gwei.toFixed(3) : gwei.toFixed(2);
  }

  async function pollChain() {
    try {
      const [block, gas] = await Promise.all([rpc("eth_blockNumber"), rpc("eth_gasPrice")]);
      const n = Number(BigInt(block)).toLocaleString("en-US");
      blockEls.forEach((el) => { el.textContent = n; });
      gasEl.textContent = formatGwei(gas);
      liveDot.classList.add("is-live");
      liveLabel.textContent = "live · public RPC";
      rpcFails = 0;
    } catch {
      rpcFails += 1;
      if (rpcFails >= 2) {
        blockEls.forEach((el) => { el.textContent = "—"; });
        gasEl.textContent = "—";
        liveDot.classList.remove("is-live");
        liveLabel.textContent = "RPC unavailable · retrying";
      }
    }
    pollTimer = setTimeout(pollChain, rpcFails > 3 ? CONFIG.rpcPollMs * 4 : CONFIG.rpcPollMs);
  }
  document.addEventListener("visibilitychange", () => {
    clearTimeout(pollTimer);
    if (!document.hidden) pollChain();
  });
  pollChain();

  // ---- Wallet connect (any EIP-1193 browser wallet) ----
  const connectBtns = $$("[data-connect]");
  let account = null;
  let chainOk = false;
  const eth = () => window.ethereum;
  const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  function renderWallet() {
    connectBtns.forEach((btn) => {
      const label = $("[data-connect-label]", btn);
      btn.classList.toggle("is-connected", !!account);
      btn.classList.toggle("is-wrong-chain", !!account && !chainOk);
      if (!account) label.textContent = "Connect wallet";
      else if (!chainOk) label.textContent = "Switch network";
      else label.textContent = short(account);
    });
  }

  async function readChain() {
    try {
      const id = await eth().request({ method: "eth_chainId" });
      chainOk = id.toLowerCase() === CONFIG.chain.chainId;
    } catch { chainOk = false; }
  }

  async function ensureChain() {
    try {
      await eth().request({ method: "wallet_switchEthereumChain", params: [{ chainId: CONFIG.chain.chainId }] });
    } catch (err) {
      const code = err?.code ?? err?.data?.originalError?.code;
      if (code === 4902 || code === -32603) {
        await eth().request({ method: "wallet_addEthereumChain", params: [CONFIG.chain] });
      } else {
        throw err;
      }
    }
    await readChain();
  }

  function walletError(err) {
    if (err?.code === 4001) toast("Request cancelled in wallet");
    else toast("Wallet error — please try again");
  }

  async function onConnectClick() {
    if (!eth()) {
      toast("No wallet found. Install MetaMask, Rabby or Robinhood Wallet.");
      return;
    }
    try {
      if (account && chainOk) {
        if (await copyText(account)) toast(`Address copied · ${short(account)}`);
        return;
      }
      if (!account) {
        const accs = await eth().request({ method: "eth_requestAccounts" });
        account = accs[0] || null;
      }
      await ensureChain();
      renderWallet();
      if (account && chainOk) toast("Connected to Robinhood Chain");
    } catch (err) {
      renderWallet();
      walletError(err);
    }
  }
  connectBtns.forEach((b) => b.addEventListener("click", onConnectClick));

  $$("[data-add-chain]").forEach((el) => el.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!eth()) { toast("No wallet found. Install MetaMask, Rabby or Robinhood Wallet."); return; }
    try {
      await ensureChain();
      renderWallet();
      toast("Robinhood Chain is ready in your wallet");
    } catch (err) { walletError(err); }
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

  // ---- Terminal route preview (simulated) ----
  const term = $("[data-term]");
  const SCRIPT = [
    { k: "cmd", t: "routiq quote 2,500 USDG → TSLA" },
    { k: "muted", p: "›", t: "scanning venues on Robinhood Chain (4663)" },
    { k: "muted", p: "›", t: "1. uniswap   TSLA/USDG  depth ok", c: "62% of size" },
    { k: "muted", p: "›", t: "2. arcus     TSLA/USDG  depth ok", c: "38% of size" },
    { k: "muted", p: "›", t: "3. pleiades  skipped · spread too wide" },
    { k: "info", p: "→", t: "split route 62 / 38", c: "impact 0.04%" },
    { k: "success", p: "✓", t: "quote ready · 9.86 TSLA · valid 12 blocks" },
    { k: "cmd", t: "routiq swap --confirm" },
    { k: "info", p: "→", t: "tx 0x8f3a…c21e submitted", c: "gas 0.00004 ETH" },
    { k: "success", p: "✓", t: "settled in 1 block · saved 0.6% vs best single venue" },
  ];
  let termRunning = false;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function lineEl(item) {
    const div = document.createElement("div");
    div.className = `t-line t-line--${item.k}`;
    div.innerHTML = `<span class="t-pre">${item.k === "cmd" ? "$" : item.p}</span><span class="t-txt"></span>` +
      (item.c ? `<span class="t-cost">${item.c}</span>` : "");
    return div;
  }

  async function startTerminal() {
    if (termRunning) return;
    termRunning = true;
    if (reduceMotion) {
      SCRIPT.forEach((it) => { const el = lineEl(it); $(".t-txt", el).textContent = it.t; term.appendChild(el); });
      return;
    }
    for (;;) {
      term.innerHTML = "";
      for (const it of SCRIPT) {
        const el = lineEl(it);
        const txt = $(".t-txt", el);
        term.appendChild(el);
        if (it.k === "cmd") {
          const caret = document.createElement("span");
          caret.className = "t-caret";
          txt.after(caret);
          for (let i = 1; i <= it.t.length; i++) { txt.textContent = it.t.slice(0, i); await wait(28); }
          await wait(350);
          caret.remove();
        } else {
          txt.textContent = it.t;
          await wait(it.k === "success" ? 650 : 420);
        }
        term.scrollTop = term.scrollHeight;
      }
      await wait(5000);
    }
  }
})();
