const STORAGE_KEY = "lunch-roulette-pwa-v1";
const colors = ["#F97316", "#10B981", "#3B82F6", "#EF4444", "#A855F7", "#14B8A6", "#EAB308", "#EC4899"];

const state = loadState();
let editingId = null;
let selectedColor = colors[0];
let rotation = 0;

const wheel = document.querySelector("#wheel");
const ctx = wheel.getContext("2d");
const addBtn = document.querySelector("#addBtn");
const pickBtn = document.querySelector("#pickBtn");
const resultLabel = document.querySelector("#resultLabel");
const resultNote = document.querySelector("#resultNote");
const resultLinks = document.querySelector("#resultLinks");
const restaurantList = document.querySelector("#restaurantList");
const historyList = document.querySelector("#historyList");
const dialog = document.querySelector("#editorDialog");
const form = document.querySelector("#editorForm");
const closeDialogBtn = document.querySelector("#closeDialogBtn");
const deleteBtn = document.querySelector("#deleteBtn");
const dialogTitle = document.querySelector("#dialogTitle");
const nameInput = document.querySelector("#nameInput");
const noteInput = document.querySelector("#noteInput");
const weightInput = document.querySelector("#weightInput");
const weightValue = document.querySelector("#weightValue");
const enabledInput = document.querySelector("#enabledInput");
const colorGrid = document.querySelector("#colorGrid");

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

addBtn.addEventListener("click", () => openEditor());
pickBtn.addEventListener("click", pickToday);
closeDialogBtn.addEventListener("click", () => dialog.close());
weightInput.addEventListener("input", () => {
  weightValue.textContent = Number(weightInput.value).toFixed(1);
});

deleteBtn.addEventListener("click", () => {
  if (!editingId) return;
  const index = state.restaurants.findIndex((item) => item.id === editingId);
  if (index >= 0) {
    state.restaurants.splice(index, 1);
    saveState();
    render();
  }
  dialog.close();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;

  const payload = {
    name,
    note: noteInput.value.trim(),
    colorHex: selectedColor,
    baseWeight: Number(weightInput.value),
    lastVisitedAt: null,
    isEnabled: enabledInput.checked,
  };

  if (editingId) {
    const index = state.restaurants.findIndex((item) => item.id === editingId);
    if (index >= 0) {
      state.restaurants[index] = { ...state.restaurants[index], ...payload };
    }
  } else {
    state.restaurants.push({ id: crypto.randomUUID(), ...payload });
  }

  saveState();
  render();
  dialog.close();
});

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.restaurants) && Array.isArray(parsed.history)) {
        return parsed;
      }
    } catch {}
  }

  return {
    restaurants: [
      { id: crypto.randomUUID(), name: "拉面", note: "例：https://maps.apple.com", colorHex: "#F97316", baseWeight: 1, lastVisitedAt: offsetDate(-3), isEnabled: true },
      { id: crypto.randomUUID(), name: "咖喱饭", note: "想吃辣的时候", colorHex: "#EAB308", baseWeight: 1, lastVisitedAt: offsetDate(-8), isEnabled: true },
      { id: crypto.randomUUID(), name: "定食", note: "稳定选择", colorHex: "#10B981", baseWeight: 1, lastVisitedAt: offsetDate(-1), isEnabled: true },
      { id: crypto.randomUUID(), name: "寿司", note: "预算高一点时", colorHex: "#3B82F6", baseWeight: 1, lastVisitedAt: null, isEnabled: true },
    ],
    history: [],
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function daysSinceVisit(restaurant) {
  if (!restaurant.lastVisitedAt) return 30;
  const start = new Date(restaurant.lastVisitedAt);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.max(Math.floor((today - start) / 86400000), 0);
}

function visitStatus(restaurant) {
  if (!restaurant.lastVisitedAt) return "从未吃过";
  const days = daysSinceVisit(restaurant);
  if (days === 0) return "今天吃过";
  return `未去 ${days} 天`;
}

function effectiveWeight(restaurant) {
  const days = Math.min(daysSinceVisit(restaurant), 30);
  return Math.max(Number(restaurant.baseWeight) || 1, 0.1) * (1 + days * 0.18);
}

function enabledRestaurants() {
  return state.restaurants.filter((item) => item.isEnabled);
}

function weightedSegments() {
  const candidates = enabledRestaurants();
  const weights = candidates.map((restaurant) => ({ restaurant, weight: effectiveWeight(restaurant) }));
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return [];
  return weights.map((item) => ({ ...item, ratio: item.weight / total }));
}

function pickWeighted() {
  const segments = weightedSegments();
  const total = segments.reduce((sum, item) => sum + item.weight, 0);
  let threshold = Math.random() * total;
  for (const segment of segments) {
    threshold -= segment.weight;
    if (threshold <= 0) return segment.restaurant;
  }
  return segments.at(-1)?.restaurant ?? null;
}

function pickToday() {
  const picked = pickWeighted();
  if (!picked) return;

  rotation += 720 + Math.random() * 1080;
  wheel.style.setProperty("--rotation", `${rotation}deg`);

  const index = state.restaurants.findIndex((item) => item.id === picked.id);
  if (index >= 0) {
    state.restaurants[index].lastVisitedAt = new Date().toISOString();
  }

  state.history.unshift({
    id: crypto.randomUUID(),
    restaurantID: picked.id,
    restaurantName: picked.name,
    pickedAt: new Date().toISOString(),
  });
  state.history = state.history.slice(0, 50);

  saveState();
  renderResult(state.restaurants[index] ?? picked);
  render();
}

function renderResult(restaurant) {
  resultLabel.textContent = restaurant.name;
  resultNote.textContent = restaurant.note || "已记录为今天去过，之后概率会先降低，再随未去天数慢慢升高。";
  resultLinks.replaceChildren(...extractLinks(restaurant.note).map((url) => {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = url;
    return link;
  }));
}

function extractLinks(text) {
  return text.match(/https?:\/\/[^\s]+/g) ?? [];
}

function openEditor(restaurant = null) {
  editingId = restaurant?.id ?? null;
  selectedColor = restaurant?.colorHex ?? colors[0];
  dialogTitle.textContent = restaurant ? "编辑店铺" : "添加店铺";
  nameInput.value = restaurant?.name ?? "";
  noteInput.value = restaurant?.note ?? "";
  weightInput.value = restaurant?.baseWeight ?? 1;
  weightValue.textContent = Number(weightInput.value).toFixed(1);
  enabledInput.checked = restaurant?.isEnabled ?? true;
  deleteBtn.hidden = !restaurant;
  renderColorGrid();
  dialog.showModal();
  nameInput.focus();
}

function renderColorGrid() {
  colorGrid.replaceChildren(...colors.map((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `color-btn${color === selectedColor ? " selected" : ""}`;
    button.style.background = color;
    button.setAttribute("aria-label", `选择颜色 ${color}`);
    button.addEventListener("click", () => {
      selectedColor = color;
      renderColorGrid();
    });
    return button;
  }));
}

function renderWheel() {
  const size = wheel.width;
  const center = size / 2;
  const radius = size / 2 - 8;
  const segments = weightedSegments();
  ctx.clearRect(0, 0, size, size);

  if (!segments.length) {
    ctx.fillStyle = "#d8dee7";
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  let start = -Math.PI / 2;
  for (const segment of segments) {
    const end = start + Math.PI * 2 * segment.ratio;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = segment.restaurant.colorHex;
    ctx.fill();
    start = end;
  }
}

function renderRestaurants() {
  if (!state.restaurants.length) {
    const empty = document.createElement("p");
    empty.className = "restaurant-meta";
    empty.textContent = "先添加几个午餐选项。";
    restaurantList.replaceChildren(empty);
    return;
  }

  restaurantList.replaceChildren(...state.restaurants.map((restaurant) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "restaurant-card";
    button.setAttribute("aria-disabled", String(!restaurant.isEnabled));
    button.addEventListener("click", () => openEditor(restaurant));

    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = restaurant.colorHex;

    const main = document.createElement("span");
    main.className = "restaurant-main";

    const name = document.createElement("span");
    name.className = "restaurant-name";
    name.textContent = restaurant.name;

    const meta = document.createElement("span");
    meta.className = "restaurant-meta";
    meta.textContent = `${visitStatus(restaurant)} · 当前权重 ${effectiveWeight(restaurant).toFixed(1)}`;

    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";

    main.append(name, meta);
    button.append(swatch, main, arrow);
    return button;
  }));
}

function renderHistory() {
  if (!state.history.length) {
    const empty = document.createElement("p");
    empty.className = "history-item";
    empty.textContent = "还没有抽取记录";
    historyList.replaceChildren(empty);
    return;
  }

  historyList.replaceChildren(...state.history.slice(0, 5).map((record) => {
    const item = document.createElement("div");
    item.className = "history-item";

    const name = document.createElement("strong");
    name.textContent = record.restaurantName;

    const date = document.createElement("span");
    date.textContent = new Date(record.pickedAt).toLocaleDateString();

    item.append(name, date);
    return item;
  }));
}

function render() {
  pickBtn.disabled = !enabledRestaurants().length;
  renderWheel();
  renderRestaurants();
  renderHistory();
}

render();
