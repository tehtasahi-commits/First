const STORAGE_KEY = "lunch-roulette-pwa-v1";
const MAX_BACKUP_BYTES = 250_000;
const MAX_RESTAURANTS = 300;
const MAX_HISTORY = 500;
const MAX_TEXT_LENGTH = 500;
const colors = [
  "#FF6B35",
  "#00B894",
  "#2563EB",
  "#E11D48",
  "#7C3AED",
  "#06B6D4",
  "#F59E0B",
  "#EC4899",
  "#84CC16",
  "#F43F5E",
  "#8B5CF6",
  "#14B8A6"
];

const state = loadState();
let editingId = null;
let selectedColor = colors[0];
let rotation = 0;

const wheel = document.querySelector("#wheel");
const ctx = wheel.getContext("2d");
const addBtn = document.querySelector("#addBtn");
const exportBtn = document.querySelector("#exportBtn");
const importBtn = document.querySelector("#importBtn");
const backupInput = document.querySelector("#backupInput");
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
const categoryInput = document.querySelector("#categoryInput");
const weightInput = document.querySelector("#weightInput");
const weightValue = document.querySelector("#weightValue");
const enabledInput = document.querySelector("#enabledInput");
const colorGrid = document.querySelector("#colorGrid");

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

addBtn.addEventListener("click", () => openEditor());
exportBtn.addEventListener("click", exportBackup);
importBtn.addEventListener("click", () => backupInput.click());
backupInput.addEventListener("change", importBackup);
pickBtn.addEventListener("click", pickToday);
closeDialogBtn.addEventListener("click", () => dialog.close());
weightInput.addEventListener("input", () => {
  weightValue.textContent = Number(weightInput.value).toFixed(1);
});
noteInput.addEventListener("input", fillNameFromMapLinkIfEmpty);
noteInput.addEventListener("paste", () => {
  window.setTimeout(fillNameFromMapLinkIfEmpty, 0);
});

deleteBtn.addEventListener("click", () => {
  if (!editingId) return;
  const index = state.restaurants.findIndex((item) => item.id === editingId);
  if (index >= 0) {
    rememberDeletedRestaurant(editingId);
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
    category: sanitizeCategory(categoryInput.value),
    colorHex: selectedColor,
    baseWeight: Number(weightInput.value),
    isEnabled: enabledInput.checked,
    profileUpdatedAt: new Date().toISOString(),
  };

  if (editingId) {
    const index = state.restaurants.findIndex((item) => item.id === editingId);
    if (index >= 0) {
      state.restaurants[index] = { ...state.restaurants[index], ...payload };
    }
  } else {
    state.restaurants.push({ id: crypto.randomUUID(), lastVisitedAt: null, ...payload });
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
        return normalizeState(parsed);
      }
    } catch {}
  }

  return normalizeState({
    restaurants: [
      { id: crypto.randomUUID(), name: "拉面", note: "例：https://maps.apple.com", colorHex: "#F97316", baseWeight: 1, lastVisitedAt: offsetDate(-3), isEnabled: true },
      { id: crypto.randomUUID(), name: "咖喱饭", note: "想吃辣的时候", category: "咖喱", colorHex: "#EAB308", baseWeight: 1, lastVisitedAt: offsetDate(-8), isEnabled: true },
      { id: crypto.randomUUID(), name: "定食", note: "稳定选择", category: "定食", colorHex: "#10B981", baseWeight: 1, lastVisitedAt: offsetDate(-1), isEnabled: true },
      { id: crypto.randomUUID(), name: "寿司", note: "预算高一点时", category: "日料", colorHex: "#3B82F6", baseWeight: 1, lastVisitedAt: null, isEnabled: true },
    ],
    history: [],
  });
}

function saveState() {
  const stored = readStoredState();
  const merged = stored ? mergeStates(stored, state) : normalizeState(state);
  Object.assign(state, merged, { savedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function readStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function normalizeState(value) {
  const legacyDeletedIDs = Array.isArray(value?.deletedRestaurantIDs) ? value.deletedRestaurantIDs : [];
  const deletedRestaurants = Array.isArray(value?.deletedRestaurants) ? value.deletedRestaurants : [];

  return {
    schemaVersion: 4,
    savedAt: value?.savedAt || null,
    deletedRestaurants: [
      ...deletedRestaurants.map(normalizeDeletedRestaurant),
      ...legacyDeletedIDs.map((id) => normalizeDeletedRestaurant({ id, deletedAt: "9999-12-31T23:59:59.999Z" })),
    ].filter((item) => item.id),
    restaurants: Array.isArray(value?.restaurants) ? value.restaurants.slice(0, MAX_RESTAURANTS).map(normalizeRestaurant) : [],
    history: Array.isArray(value?.history) ? value.history.slice(0, MAX_HISTORY).map(normalizeHistoryRecord) : [],
  };
}

function normalizeRestaurant(restaurant) {
  const updatedAt = restaurant.updatedAt || restaurant.lastVisitedAt || "1970-01-01T00:00:00.000Z";
  return {
    id: restaurant.id || crypto.randomUUID(),
    name: sanitizeText(restaurant.name, 40),
    note: sanitizeText(restaurant.note, MAX_TEXT_LENGTH),
    category: sanitizeCategory(restaurant.category),
    colorHex: colors.includes(restaurant.colorHex) ? restaurant.colorHex : colors[0],
    baseWeight: clampNumber(restaurant.baseWeight, 0.5, 5, 1),
    lastVisitedAt: restaurant.lastVisitedAt || null,
    isEnabled: restaurant.isEnabled !== false,
    profileUpdatedAt: restaurant.profileUpdatedAt || updatedAt,
    visitedUpdatedAt: restaurant.visitedUpdatedAt || restaurant.lastVisitedAt || "1970-01-01T00:00:00.000Z",
  };
}

function normalizeHistoryRecord(record) {
  return {
    id: record.id || crypto.randomUUID(),
    restaurantID: record.restaurantID || "",
    restaurantName: sanitizeText(record.restaurantName, 40),
    pickedAt: record.pickedAt || new Date().toISOString(),
  };
}

function normalizeDeletedRestaurant(record) {
  return {
    id: record.id || "",
    deletedAt: record.deletedAt || new Date().toISOString(),
  };
}

function mergeStates(left, right) {
  const deletedByID = new Map();
  for (const deleted of [...left.deletedRestaurants, ...right.deletedRestaurants]) {
    const existing = deletedByID.get(deleted.id);
    if (!existing || timeValue(deleted.deletedAt) > timeValue(existing.deletedAt)) {
      deletedByID.set(deleted.id, deleted);
    }
  }

  const restaurantsByID = new Map();

  for (const restaurant of [...left.restaurants, ...right.restaurants]) {
    const deleted = deletedByID.get(restaurant.id);
    const restaurantTime = Math.max(timeValue(restaurant.profileUpdatedAt), timeValue(restaurant.visitedUpdatedAt));
    if (deleted && timeValue(deleted.deletedAt) >= restaurantTime) continue;

    const existing = restaurantsByID.get(restaurant.id);
    if (!existing) {
      restaurantsByID.set(restaurant.id, restaurant);
      continue;
    }

    restaurantsByID.set(restaurant.id, mergeRestaurant(existing, restaurant));
  }

  const historyByID = new Map();
  for (const record of [...left.history, ...right.history]) {
    historyByID.set(record.id, record);
  }

  return {
    schemaVersion: 4,
    savedAt: new Date().toISOString(),
    deletedRestaurants: [...deletedByID.values()],
    restaurants: [...restaurantsByID.values()],
    history: [...historyByID.values()]
      .sort((a, b) => timeValue(b.pickedAt) - timeValue(a.pickedAt))
      .slice(0, 50),
  };
}

function mergeRestaurant(left, right) {
  const profileSource = timeValue(right.profileUpdatedAt) >= timeValue(left.profileUpdatedAt) ? right : left;
  const visitSource = timeValue(right.visitedUpdatedAt) >= timeValue(left.visitedUpdatedAt) ? right : left;
  return {
    ...profileSource,
    lastVisitedAt: visitSource.lastVisitedAt,
    visitedUpdatedAt: visitSource.visitedUpdatedAt,
  };
}

function timeValue(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function rememberDeletedRestaurant(id) {
  const deletedAt = new Date().toISOString();
  const existing = new Map((state.deletedRestaurants || []).map((item) => [item.id, item]));
  existing.set(id, { id, deletedAt });
  state.deletedRestaurants = [...existing.values()];
}

function sanitizeText(value, maxLength) {
  return String(value || "").slice(0, maxLength);
}
function sanitizeCategory(value) {
  const category = sanitizeText(value, 24).trim();
  return category || "未分类";
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
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
function categoryVisitDays(category, candidates) {
  const timestamps = candidates
    .filter((item) => item.category === category && item.lastVisitedAt)
    .map((item) => item.lastVisitedAt);
  if (!timestamps.length) return 30;
  const latestVisit = timestamps.sort((a, b) => timeValue(b) - timeValue(a))[0];
  return daysSinceVisit({ lastVisitedAt: latestVisit });
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

function probabilityRatio(restaurant) {
  const segments = weightedSegments();
  return segments.find((segment) => segment.restaurant.id === restaurant.id)?.ratio ?? 0;
}

function pickWeighted() {
  const candidates = enabledRestaurants();
  if (!candidates.length) return null;
  const categories = [...new Set(candidates.map((item) => item.category))];
  const categoryWeights = categories.map((category) => {
    const categoryRestaurants = candidates.filter((item) => item.category === category);
    const base = categoryRestaurants.reduce((sum, item) => sum + (Number(item.baseWeight) || 1), 0) / Math.max(categoryRestaurants.length, 1);
    const days = Math.min(categoryVisitDays(category, candidates), 30);
    return { category, weight: Math.max(base, 0.1) * (1 + days * 0.2) };
  });
  const pickedCategory = pickByWeight(categoryWeights)?.category;
  if (!pickedCategory) return null;
  const restaurantWeights = candidates
    .filter((item) => item.category === pickedCategory)
    .map((restaurant) => ({ restaurant, weight: effectiveWeight(restaurant) }));
  return pickByWeight(restaurantWeights)?.restaurant ?? null;
}

function pickByWeight(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let threshold = Math.random() * total;
  for (const item of items) {
    threshold -= item.weight;
    if (threshold <= 0) return item;
  }
  return items.at(-1) ?? null;
}

function pickToday() {
  const picked = pickWeighted();
  if (!picked) return;

  rotation += 720 + Math.random() * 1080;
  wheel.style.setProperty("--rotation", `${rotation}deg`);

  const index = state.restaurants.findIndex((item) => item.id === picked.id);
  if (index >= 0) {
    state.restaurants[index].lastVisitedAt = new Date().toISOString();
    state.restaurants[index].visitedUpdatedAt = new Date().toISOString();
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
  const links = extractLinks(restaurant.note);
  const noteText = stripLinks(restaurant.note);

  resultLabel.textContent = restaurant.name;
  resultNote.textContent = noteText || "已记录为今天去过，之后概率会先降低，再随未去天数慢慢升高。";
  resultLinks.replaceChildren(...links.map((url) => {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.className = "link-pill";
    link.textContent = linkLabel(url);
    return link;
  }));
}

function exportBackup() {
  const backup = normalizeState(state);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const date = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `lunch-roulette-backup-${date}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

async function importBackup() {
  const file = backupInput.files?.[0];
  backupInput.value = "";
  if (!file) return;
  if (file.size > MAX_BACKUP_BYTES) {
    window.alert("备份文件太大，未导入。");
    return;
  }

  try {
    const imported = normalizeState(JSON.parse(await file.text()));
    if (!window.confirm("将把备份与当前数据合并。继续导入吗？")) return;
    const merged = mergeStates(state, imported);
    Object.assign(state, merged);
    saveState();
    render();
  } catch {
    window.alert("备份文件无法读取。");
  }
}

function extractLinks(text) {
  return [...new Set(text.match(/https?:\/\/[^\s]+/g) ?? [])];
}

function fillNameFromMapLinkIfEmpty() {
  if (nameInput.value.trim()) return;

  const detectedName = extractPlaceNameFromMapURL(noteInput.value);
  if (detectedName) {
    nameInput.value = detectedName;
  }
}

function extractPlaceNameFromMapURL(text) {
  for (const link of extractLinks(text)) {
    const name = parsePlaceNameFromURL(link);
    if (name) return name;
  }
  return "";
}

function parsePlaceNameFromURL(rawURL) {
  let url;
  try {
    url = new URL(rawURL);
  } catch {
    return "";
  }

  const host = url.hostname.replace(/^www\./, "");
  if (!/(^|\.)google\.[^/]+$/.test(host) && host !== "maps.app.goo.gl") {
    return "";
  }

  const pathParts = url.pathname.split("/").filter(Boolean);
  const placeIndex = pathParts.findIndex((part) => part.toLowerCase() === "place");
  if (placeIndex >= 0 && pathParts[placeIndex + 1]) {
    return cleanPlaceName(pathParts[placeIndex + 1]);
  }

  const searchIndex = pathParts.findIndex((part) => part.toLowerCase() === "search");
  if (searchIndex >= 0 && pathParts[searchIndex + 1]) {
    return cleanPlaceName(pathParts[searchIndex + 1]);
  }

  const query = url.searchParams.get("query") || url.searchParams.get("q");
  if (query) {
    return cleanPlaceName(query);
  }

  return "";
}

function cleanPlaceName(value) {
  return safeDecodeURIComponent(value)
    .replace(/\+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*Google Maps$/i, "")
    .trim();
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stripLinks(text) {
  return text
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function linkLabel(url) {
  try {
    const parsed = new URL(url);
    return `打开链接：${parsed.hostname}`;
  } catch {
    return "打开链接";
  }
}

function openEditor(restaurant = null) {
  editingId = restaurant?.id ?? null;
  selectedColor = restaurant?.colorHex ?? colors[0];
  dialogTitle.textContent = restaurant ? "编辑店铺" : "添加店铺";
  nameInput.value = restaurant?.name ?? "";
  noteInput.value = restaurant?.note ?? "";
  categoryInput.value = restaurant?.category ?? "";
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
    ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
    ctx.lineWidth = 8;
    ctx.stroke();
    start = end;
  }

  ctx.beginPath();
  ctx.arc(center, center, radius - 4, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(17, 24, 39, 0.12)";
  ctx.lineWidth = 10;
  ctx.stroke();
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

    const avatar = document.createElement("span");
    avatar.className = "restaurant-avatar";
    avatar.style.background = restaurant.colorHex;
    avatar.textContent = restaurantInitial(restaurant.name);

    const main = document.createElement("span");
    main.className = "restaurant-main";

    const name = document.createElement("span");
    name.className = "restaurant-name";
    name.textContent = restaurant.name;

    const meta = document.createElement("span");
    meta.className = "restaurant-meta";
    meta.textContent = `${restaurant.category} · ${visitStatus(restaurant)} · 概率 ${(probabilityRatio(restaurant) * 100).toFixed(0)}% · 权重 ${effectiveWeight(restaurant).toFixed(1)}`;

    const bar = document.createElement("span");
    bar.className = "probability-bar";

    const fill = document.createElement("span");
    fill.style.width = `${Math.max(probabilityRatio(restaurant) * 100, restaurant.isEnabled ? 4 : 0)}%`;
    fill.style.background = restaurant.colorHex;
    bar.append(fill);

    const arrow = document.createElement("span");
    arrow.className = "row-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";

    main.append(name, meta, bar);
    button.append(avatar, main, arrow);
    return button;
  }));
}

function restaurantInitial(name) {
  return [...String(name || "?").trim()][0]?.toUpperCase() || "?";
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
