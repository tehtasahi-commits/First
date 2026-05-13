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
const iconChoices = ["🍽", "🍜", "🍔", "🍛", "🍣", "🍗", "🍲", "🥗", "🍱", "🍕", "🍟", "🧋", "🥐", "🍙", "🍤", "🥟", "🍞", "☕", "🌮", "🍝"];

const state = loadState();
let editingId = null;
let selectedColor = colors[0];
let selectedIcon = "";
let rotation = 0;
let initialVisibleDays = 7;

const wheel = document.querySelector("#wheel");
const ctx = wheel.getContext("2d");
const centerPickBtn = document.querySelector("#centerPickBtn");
const addBtn = document.querySelector("#addBtn");
const listNavBtn = document.querySelector("#listNavBtn");
const dataNavBtn = document.querySelector("#dataNavBtn");
const settingsNavBtn = document.querySelector("#settingsNavBtn");
const settingsAddBtn = document.querySelector("#settingsAddBtn");
const exportBtn = document.querySelector("#exportBtn");
const importBtn = document.querySelector("#importBtn");
const backupInput = document.querySelector("#backupInput");
const resultLabel = document.querySelector("#resultLabel");
const resultNote = document.querySelector("#resultNote");
const resultLinks = document.querySelector("#resultLinks");
const restaurantList = document.querySelector("#restaurantList");
const historyList = document.querySelector("#historyList");
const dialog = document.querySelector("#editorDialog");
const resultDialog = document.querySelector("#resultDialog");
const settingsDialog = document.querySelector("#settingsDialog");
const dataDialog = document.querySelector("#dataDialog");
const form = document.querySelector("#editorForm");
const closeDialogBtn = document.querySelector("#closeDialogBtn");
const closeResultBtn = document.querySelector("#closeResultBtn");
const closeSettingsBtn = document.querySelector("#closeSettingsBtn");
const closeDataBtn = document.querySelector("#closeDataBtn");
const deleteBtn = document.querySelector("#deleteBtn");
const dialogTitle = document.querySelector("#dialogTitle");
const nameInput = document.querySelector("#nameInput");
const noteInput = document.querySelector("#noteInput");
const categoryInput = document.querySelector("#categoryInput");
const daysInput = document.querySelector("#daysInput");
const daysValue = document.querySelector("#daysValue");
const enabledInput = document.querySelector("#enabledInput");
const iconGrid = document.querySelector("#iconGrid");
const colorGrid = document.querySelector("#colorGrid");
const timelineList = document.querySelector("#timelineList");

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

addBtn.addEventListener("click", () => openEditor());
listNavBtn.addEventListener("click", openSettings);
dataNavBtn.addEventListener("click", openData);
settingsNavBtn.addEventListener("click", openSettings);
settingsAddBtn.addEventListener("click", () => {
  settingsDialog.close();
  openEditor();
});
exportBtn.addEventListener("click", exportBackup);
importBtn.addEventListener("click", () => backupInput.click());
backupInput.addEventListener("change", importBackup);
centerPickBtn.addEventListener("click", pickToday);
closeDialogBtn.addEventListener("click", () => dialog.close());
closeResultBtn.addEventListener("click", () => resultDialog.close());
closeSettingsBtn.addEventListener("click", () => settingsDialog.close());
closeDataBtn.addEventListener("click", () => dataDialog.close());
daysInput.addEventListener("input", () => {
  daysValue.textContent = daysLabel(Number(daysInput.value));
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
    icon: sanitizeIcon(selectedIcon),
    colorHex: selectedColor,
    isEnabled: enabledInput.checked,
    profileUpdatedAt: new Date().toISOString(),
  };
  const visibleDays = Number(daysInput.value);
  const visitFields = !editingId || visibleDays !== initialVisibleDays
    ? visitFieldsFromVisibleDays(visibleDays)
    : {};

  if (editingId) {
    const index = state.restaurants.findIndex((item) => item.id === editingId);
    if (index >= 0) {
      state.restaurants[index] = { ...state.restaurants[index], ...payload, ...visitFields };
    }
  } else {
    state.restaurants.push({ id: crypto.randomUUID(), baseWeight: 1, ...payload, ...visitFields });
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
      { id: crypto.randomUUID(), name: "拉面", note: "例：https://maps.apple.com", category: "拉面", colorHex: "#F97316", baseWeight: 1, lastVisitedAt: offsetDate(-3), isEnabled: true },
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
    icon: sanitizeIcon(restaurant.icon),
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

function sanitizeIcon(value) {
  const icon = String(value || "").trim();
  return iconChoices.includes(icon) ? icon : "";
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
  if (days >= 7) return "7天以上";
  return `未去 ${days} 天`;
}

function visibleDaysSinceVisit(restaurant) {
  return Math.min(daysSinceVisit(restaurant), 7);
}

function daysLabel(days) {
  if (days <= 0) return "今天";
  if (days >= 7) return "7天以上";
  return `${days}天前`;
}

function visitFieldsFromVisibleDays(days) {
  const normalizedDays = Math.min(Math.max(Number(days) || 0, 0), 7);
  const lastVisitedAt = offsetDate(-normalizedDays);
  return {
    lastVisitedAt,
    visitedUpdatedAt: new Date().toISOString(),
  };
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

function categoryWeight(category, candidates) {
  const categoryRestaurants = candidates.filter((item) => item.category === category);
  const base = categoryRestaurants.reduce((sum, item) => sum + (Number(item.baseWeight) || 1), 0) / Math.max(categoryRestaurants.length, 1);
  const days = Math.min(categoryVisitDays(category, candidates), 30);
  return Math.max(base, 0.1) * (1 + days * 0.2);
}

function enabledRestaurants() {
  return state.restaurants.filter((item) => item.isEnabled);
}

function weightedSegments() {
  const candidates = enabledRestaurants();
  if (!candidates.length) return [];

  const categories = [...new Set(candidates.map((item) => item.category))];
  const categoryWeights = categories.map((category) => ({
    category,
    weight: categoryWeight(category, candidates),
  }));
  const totalCategoryWeight = categoryWeights.reduce((sum, item) => sum + item.weight, 0);
  if (totalCategoryWeight <= 0) return [];

  return categoryWeights.flatMap((categoryItem) => {
    const restaurants = candidates.filter((item) => item.category === categoryItem.category);
    const restaurantWeights = restaurants.map((restaurant) => ({ restaurant, weight: effectiveWeight(restaurant) }));
    const totalRestaurantWeight = restaurantWeights.reduce((sum, item) => sum + item.weight, 0);
    if (totalRestaurantWeight <= 0) return [];

    return restaurantWeights.map((item) => {
      const categoryRatio = categoryItem.weight / totalCategoryWeight;
      const restaurantRatio = item.weight / totalRestaurantWeight;
      return {
        restaurant: item.restaurant,
        category: categoryItem.category,
        weight: categoryItem.weight * restaurantRatio,
        ratio: categoryRatio * restaurantRatio,
      };
    });
  });
}

function probabilityRatio(restaurant) {
  const segments = weightedSegments();
  return segments.find((segment) => segment.restaurant.id === restaurant.id)?.ratio ?? 0;
}

function pickWeighted() {
  return pickByWeight(weightedSegments())?.restaurant ?? null;
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

  const result = state.restaurants[index] ?? picked;
  saveState();
  render();
  window.setTimeout(() => renderResult(result), 900);
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

  resultDialog.showModal();
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
  selectedIcon = restaurant?.icon || (restaurant ? foodIcon(restaurant) : iconChoices[0]);
  dialogTitle.textContent = restaurant ? "编辑店铺" : "添加店铺";
  nameInput.value = restaurant?.name ?? "";
  noteInput.value = restaurant?.note ?? "";
  categoryInput.value = restaurant?.category ?? "";
  daysInput.value = restaurant ? visibleDaysSinceVisit(restaurant) : 7;
  initialVisibleDays = Number(daysInput.value);
  daysValue.textContent = daysLabel(Number(daysInput.value));
  enabledInput.checked = restaurant?.isEnabled ?? true;
  deleteBtn.hidden = !restaurant;
  renderIconGrid();
  renderColorGrid();
  dialog.showModal();
  nameInput.focus();
}

function openSettings() {
  renderRestaurants();
  settingsDialog.showModal();
}

function openData() {
  renderTimeline();
  dataDialog.showModal();
}

function renderIconGrid() {
  iconGrid.replaceChildren(...iconChoices.map((icon) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `icon-choice${icon === selectedIcon ? " selected" : ""}`;
    button.textContent = icon;
    button.setAttribute("aria-label", `选择图标 ${icon}`);
    button.addEventListener("click", () => {
      selectedIcon = icon;
      renderIconGrid();
    });
    return button;
  }));
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
    ctx.lineWidth = 5;
    ctx.stroke();
    drawWheelLabel(segment, start, end, center, radius);
    start = end;
  }

  ctx.beginPath();
  ctx.arc(center, center, radius - 4, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(17, 24, 39, 0.12)";
  ctx.lineWidth = 6;
  ctx.stroke();
}

function drawWheelLabel(segment, startAngle, endAngle, center, radius) {
  const span = endAngle - startAngle;
  if (span < 0.22) return;

  const angle = startAngle + span / 2;
  const labelRadius = radius * 0.62;
  const x = center + Math.cos(angle) * labelRadius;
  const y = center + Math.sin(angle) * labelRadius;
  const name = compactWheelName(segment.restaurant);

  ctx.save();
  ctx.translate(x, y);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(15, 23, 42, 0.24)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#fff";
  ctx.font = "42px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillText(foodIcon(segment.restaurant), 0, -22);
  ctx.font = "700 28px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillText(name, 0, 28);
  ctx.restore();
}

function compactWheelName(restaurant) {
  const text = restaurant.category && restaurant.category !== "未分类" ? restaurant.category : restaurant.name;
  return [...String(text)].slice(0, 4).join("");
}

function renderRestaurants() {
  if (!state.restaurants.length) {
    const empty = document.createElement("p");
    empty.className = "restaurant-meta";
    empty.textContent = "先添加几个午餐选项。";
    restaurantList.replaceChildren(empty);
    return;
  }

  const groups = groupRestaurantsByCategory(state.restaurants);
  restaurantList.replaceChildren(...groups.map(createRestaurantGroup));
}

function groupRestaurantsByCategory(restaurants) {
  const groups = new Map();
  for (const restaurant of restaurants) {
    const key = restaurant.category || "未分类";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(restaurant);
  }

  return [...groups.entries()]
    .map(([category, restaurants]) => ({
      category,
      restaurants: restaurants.slice().sort((a, b) => timeValue(b.visitedUpdatedAt) - timeValue(a.visitedUpdatedAt)),
    }))
    .sort((a, b) => a.category.localeCompare(b.category, "zh-Hans-CN"));
}

function createRestaurantGroup(group) {
  const section = document.createElement("section");
  section.className = "restaurant-group";

  const head = document.createElement("div");
  head.className = "restaurant-group-head";

  const title = document.createElement("strong");
  title.textContent = group.category;

  const count = document.createElement("span");
  count.textContent = `${group.restaurants.length}家`;

  head.append(title, count);
  section.append(head, ...group.restaurants.map(createRestaurantCard));
  return section;
}

function createRestaurantCard(restaurant) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "restaurant-card";
  button.setAttribute("aria-disabled", String(!restaurant.isEnabled));
  button.addEventListener("click", () => openEditor(restaurant));

  const avatar = document.createElement("span");
  avatar.className = "restaurant-avatar";
  avatar.style.background = restaurant.colorHex;
  avatar.textContent = foodIcon(restaurant);

  const main = document.createElement("span");
  main.className = "restaurant-main";

  const name = document.createElement("span");
  name.className = "restaurant-name";
  name.textContent = restaurant.name;

  const meta = document.createElement("span");
  meta.className = "restaurant-meta";
  meta.textContent = `${visitStatus(restaurant)} · 概率 ${(probabilityRatio(restaurant) * 100).toFixed(0)}%`;

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
}

function foodIcon(restaurant) {
  if (restaurant.icon) return restaurant.icon;
  const source = `${restaurant.category || ""} ${restaurant.name || ""}`.toLowerCase();
  const rules = [
    [["拉面", "麺", "ramen", "面"], "🍜"],
    [["汉堡", "burger"], "🍔"],
    [["咖喱", "curry"], "🍛"],
    [["寿司", "sushi", "日料"], "🍣"],
    [["烤", "烧鸟", "烤鸡", "鸡"], "🍗"],
    [["火锅", "锅"], "🍲"],
    [["沙拉", "salad"], "🥗"],
    [["定食", "便当"], "🍱"],
    [["披萨", "pizza"], "🍕"],
    [["炸", "薯条", "fried"], "🍟"],
    [["甜", "蛋糕", "奶茶"], "🧋"],
    [["面包", "可颂", "咖啡"], "🥐"],
  ];
  return rules.find(([keywords]) => keywords.some((keyword) => source.includes(keyword)))?.[1] ?? "🍽";
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

function renderTimeline() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const records = state.history
    .filter((record) => {
      const pickedAt = new Date(record.pickedAt);
      return pickedAt >= monthStart && pickedAt < monthEnd;
    })
    .sort((a, b) => timeValue(b.pickedAt) - timeValue(a.pickedAt));

  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "timeline-empty";
    empty.textContent = "这个月还没有记录。";
    timelineList.replaceChildren(empty);
    return;
  }

  timelineList.replaceChildren(...records.map((record) => {
    const item = document.createElement("div");
    item.className = "timeline-item";

    const pickedAt = new Date(record.pickedAt);
    const date = document.createElement("time");
    date.dateTime = record.pickedAt;
    date.textContent = pickedAt.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric", weekday: "short" });

    const name = document.createElement("strong");
    name.textContent = record.restaurantName;

    item.append(date, name);
    return item;
  }));
}

function render() {
  centerPickBtn.disabled = !enabledRestaurants().length;
  renderWheel();
  renderRestaurants();
  renderHistory();
}

render();
