const apiConfig = {
  model: "moni-chat",
  baseUrl: "https://api.monimoni.ai/v1",
};

const storageKey = "monimoni-api-access";
const defaultAmount = 2;
let selectedAmount = defaultAmount;

const elements = {
  title: document.querySelector("[data-result-title]"),
  note: document.querySelector("[data-result-note]"),
  selectedPlan: document.querySelector("[data-selected-plan]"),
  panelState: document.querySelector("[data-panel-state]"),
  modelName: document.querySelector("[data-model-name]"),
  baseUrl: document.querySelector("[data-base-url]"),
  apiKey: document.querySelector("[data-api-key]"),
  copyKey: document.querySelector("[data-copy-key]"),
  copyAll: document.querySelector("[data-copy-all]"),
  clearKey: document.querySelector("[data-clear-key]"),
  feedback: document.querySelector("[data-feedback]"),
  resultShell: document.querySelector(".result-shell"),
  resultSection: document.querySelector("#result"),
  selectedAmount: document.querySelector("[data-selected-amount]"),
  amountCards: document.querySelectorAll("[data-amount]"),
  customAmount: document.querySelector("#custom-amount"),
  customRecharge: document.querySelector(".custom-recharge"),
  buySelected: document.querySelector("[data-buy-selected]"),
};

function formatAmount(amount) {
  return `$${Number(amount).toLocaleString("en-US")}`;
}

function parseAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 1 ? Math.floor(amount) : null;
}

function randomSegment(length) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let value = "";

  crypto.getRandomValues(new Uint8Array(length)).forEach((number) => {
    value += alphabet[number % alphabet.length];
  });

  return value;
}

function generateApiKey() {
  return `mk_live_${randomSegment(32)}`;
}

function getPurchaseText(purchase) {
  return [
    `Amount: ${formatAmount(purchase.amount)}`,
    `Model: ${apiConfig.model}`,
    `API Base URL: ${apiConfig.baseUrl}`,
    `API Key: ${purchase.apiKey}`,
  ].join("\n");
}

function savePurchase(amount) {
  const purchase = {
    amount,
    apiKey: generateApiKey(),
    model: apiConfig.model,
    baseUrl: apiConfig.baseUrl,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(storageKey, JSON.stringify(purchase));
  return purchase;
}

function loadPurchase() {
  try {
    const raw = localStorage.getItem(storageKey);
    const purchase = raw ? JSON.parse(raw) : null;

    if (!purchase?.apiKey || !parseAmount(purchase.amount)) {
      return null;
    }

    return purchase;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

function setFeedback(message) {
  elements.feedback.textContent = message;

  if (!message) {
    return;
  }

  window.clearTimeout(setFeedback.timeoutId);
  setFeedback.timeoutId = window.setTimeout(() => {
    elements.feedback.textContent = "";
  }, 2400);
}

function setSelectedAmount(amount, source = "preset") {
  selectedAmount = amount;
  elements.selectedAmount.textContent = formatAmount(amount);
  elements.buySelected.disabled = false;

  elements.amountCards.forEach((card) => {
    const isSelected = source === "preset" && parseAmount(card.dataset.amount) === amount;
    card.classList.toggle("is-selected", isSelected);
    card.setAttribute("aria-pressed", String(isSelected));
  });

  elements.customRecharge.classList.toggle("is-selected", source === "custom");
}

function renderEmptyState() {
  elements.resultShell.dataset.empty = "true";
  elements.title.textContent = "购买后这里会展示 API Key";
  elements.note.textContent = "完成购买后，请复制并妥善保存以下信息。";
  elements.selectedPlan.textContent = "未完成购买";
  elements.panelState.textContent = "WAITING";
  elements.modelName.textContent = "---";
  elements.baseUrl.textContent = "---";
  elements.apiKey.textContent = "购买后生成";
  elements.copyKey.disabled = true;
  elements.copyAll.disabled = true;
}

function renderPurchase(purchase) {
  elements.resultShell.dataset.empty = "false";
  elements.title.textContent = "Your API key is ready";
  elements.note.textContent = "请立即保存 API key。它仅保存在当前浏览器本地。";
  elements.selectedPlan.textContent = `Recharge / ${formatAmount(purchase.amount)}`;
  elements.panelState.textContent = "READY";
  elements.modelName.textContent = purchase.model || apiConfig.model;
  elements.baseUrl.textContent = purchase.baseUrl || apiConfig.baseUrl;
  elements.apiKey.textContent = purchase.apiKey;
  elements.copyKey.disabled = false;
  elements.copyAll.disabled = false;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some embedded browsers expose clipboard APIs but deny write permission.
    }
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();

  if (!copied) {
    throw new Error("Copy command failed");
  }
}

function scrollToResult() {
  elements.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

elements.amountCards.forEach((card) => {
  card.addEventListener("click", () => {
    const amount = parseAmount(card.dataset.amount);

    if (!amount) {
      return;
    }

    elements.customAmount.value = "";
    setSelectedAmount(amount);
  });
});

elements.customAmount.addEventListener("input", () => {
  const amount = parseAmount(elements.customAmount.value);

  if (!amount) {
    elements.selectedAmount.textContent = "请输入金额";
    elements.buySelected.disabled = true;
    elements.amountCards.forEach((card) => {
      card.classList.remove("is-selected");
      card.setAttribute("aria-pressed", "false");
    });
    elements.customRecharge.classList.add("is-selected");
    return;
  }

  setSelectedAmount(amount, "custom");
});

elements.customAmount.addEventListener("focus", () => {
  const amount = parseAmount(elements.customAmount.value);

  if (amount) {
    setSelectedAmount(amount, "custom");
  } else {
    elements.customRecharge.classList.add("is-selected");
    elements.amountCards.forEach((card) => {
      card.classList.remove("is-selected");
      card.setAttribute("aria-pressed", "false");
    });
  }
});

elements.buySelected.addEventListener("click", () => {
  const amount = parseAmount(selectedAmount);

  if (!amount) {
    setFeedback("请输入有效的充值金额。");
    return;
  }

  const purchase = savePurchase(amount);
  renderPurchase(purchase);
  setFeedback(`${formatAmount(amount)} 购买成功，API key 已生成。`);
  scrollToResult();
});

elements.copyKey.addEventListener("click", async () => {
  const purchase = loadPurchase();

  if (!purchase) {
    return;
  }

  try {
    await copyText(purchase.apiKey);
    setFeedback("API key 已复制。");
  } catch {
    setFeedback("复制失败，请手动复制 API key。");
  }
});

elements.copyAll.addEventListener("click", async () => {
  const purchase = loadPurchase();

  if (!purchase) {
    return;
  }

  try {
    await copyText(getPurchaseText(purchase));
    setFeedback("全部 API 信息已复制。");
  } catch {
    setFeedback("复制失败，请手动复制页面信息。");
  }
});

elements.clearKey.addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  renderEmptyState();
  setFeedback("本地 API key 已清除。");
});

setSelectedAmount(defaultAmount);

const existingPurchase = loadPurchase();

if (existingPurchase) {
  renderPurchase(existingPurchase);
} else {
  renderEmptyState();
}
