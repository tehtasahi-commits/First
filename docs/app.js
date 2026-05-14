const STORAGE_KEY = "lunch-roulette-pwa-v1";
const MAX_BACKUP_BYTES = 250_000;
const MAX_RESTAURANTS = 300;
const MAX_HISTORY = 500;
const MAX_TEXT_LENGTH = 500;
const UNCATEGORIZED_CATEGORY = "无类别";
const LEGACY_UNCATEGORIZED_CATEGORY = "未分类";
const colors = [
  "#FF5A45",
  "#FF7A45",
  "#FFA94D",
  "#FFC857",
  "#7ED6A5",
  "#55CDBB",
  "#63C5EA",
  "#A78BFA",
  "#F47B6B",
  "#EF476F",
  "#F9844A",
  "#F9C74F",
  "#90BE6D",
  "#43AA8B",
  "#4D96FF",
  "#B8A1FF",
  "#F15BB5",
  "#B56576"
];
const iconChoices = [
  "🍽", "🍜", "🥣", "🍲", "🥘", "🍛", "🍚", "🍙", "🍱", "🍣",
  "🍤", "🥟", "🍢", "🍡", "🥗", "🥙", "🥪", "🌯", "🌮", "🍝",
  "🍔", "🍕", "🍟", "🌭", "🍗", "🍖", "🥩", "🧆", "🫔", "🫕",
  "🥐", "🥖", "🍞", "🥯", "🍰", "🍮", "🍦", "☕", "🍵", "🧋", "🥤"
];
const LOW_PROBABILITY_PICKER_THRESHOLD = 0.04;
const WHEEL_CANDIDATE_LIMIT = 5;

const state = loadState();
let editingId = null;
let selectedColor = colors[0];
let selectedIcon = "";
let rotation = 0;
let initialVisibleDays = 7;
let selectedDataRange = "week";
let activePage = "roulette";
let historySelectionMode = false;
const selectedHistoryIDs = new Set();

const wheel = document.querySelector("#wheel");
const ctx = wheel.getContext("2d");
const roulettePage = document.querySelector("#roulettePage");
const dataPage = document.querySelector("#dataPage");
const shopsPage = document.querySelector("#shopsPage");
const settingsPage = document.querySelector("#settingsPage");
const rouletteNavBtn = document.querySelector("#rouletteNavBtn");
const centerPickBtn = document.querySelector("#centerPickBtn");
const addBtn = document.querySelector("#addBtn");
const dataNavBtn = document.querySelector("#dataNavBtn");
const shopsNavBtn = document.querySelector("#shopsNavBtn");
const settingsNavBtn = document.querySelector("#settingsNavBtn");
const settingsAddBtn = document.querySelector("#settingsAddBtn");
const openTagManagerBtn = document.querySelector("#openTagManagerBtn");
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
const restaurantDetailDialog = document.querySelector("#restaurantDetailDialog");
const wheelCandidateDialog = document.querySelector("#wheelCandidateDialog");
const tagManagerDialog = document.querySelector("#tagManagerDialog");
const cleanupDialog = document.querySelector("#cleanupDialog");
const axisDetailDialog = document.querySelector("#axisDetailDialog");
const form = document.querySelector("#editorForm");
const closeDialogBtn = document.querySelector("#closeDialogBtn");
const closeResultBtn = document.querySelector("#closeResultBtn");
const closeDetailBtn = document.querySelector("#closeDetailBtn");
const editDetailBtn = document.querySelector("#editDetailBtn");
const closeWheelCandidateBtn = document.querySelector("#closeWheelCandidateBtn");
const closeTagManagerBtn = document.querySelector("#closeTagManagerBtn");
const openCleanupBtn = document.querySelector("#openCleanupBtn");
const closeCleanupBtn = document.querySelector("#closeCleanupBtn");
const closeAxisDetailBtn = document.querySelector("#closeAxisDetailBtn");
const deleteBtn = document.querySelector("#deleteBtn");
const dialogTitle = document.querySelector("#dialogTitle");
const nameInput = document.querySelector("#nameInput");
const noteInput = document.querySelector("#noteInput");
const categoryInput = document.querySelector("#categoryInput");
const categoryPresetSelect = document.querySelector("#categoryPresetSelect");
const daysInput = document.querySelector("#daysInput");
const daysValue = document.querySelector("#daysValue");
const enabledInput = document.querySelector("#enabledInput");
const iconGrid = document.querySelector("#iconGrid");
const colorGrid = document.querySelector("#colorGrid");
const restaurantSearchInput = document.querySelector("#restaurantSearchInput");
const categoryFilterSelect = document.querySelector("#categoryFilterSelect");
const tagList = document.querySelector("#tagList");
const axisTitle = document.querySelector("#axisTitle");
const historyStats = document.querySelector("#historyStats");
const weekAxis = document.querySelector("#weekAxis");
const axisDetail = document.querySelector("#axisDetail");
const weekRangeBtn = document.querySelector("#weekRangeBtn");
const monthRangeBtn = document.querySelector("#monthRangeBtn");
const axisDialogTitle = document.querySelector("#axisDialogTitle");
const axisDialogContent = document.querySelector("#axisDialogContent");
const purgeBeforeInput = document.querySelector("#purgeBeforeInput");
const purgeHistoryBtn = document.querySelector("#purgeHistoryBtn");
const deleteSelectedHistoryBtn = document.querySelector("#deleteSelectedHistoryBtn");
const selectedHistoryCount = document.querySelector("#selectedHistoryCount");
const timelineList = document.querySelector("#timelineList");
const detailIcon = document.querySelector("#detailIcon");
const detailName = document.querySelector("#detailName");
const detailMeta = document.querySelector("#detailMeta");
const detailNote = document.querySelector("#detailNote");
const detailLinks = document.querySelector("#detailLinks");
const wheelCandidateList = document.querySelector("#wheelCandidateList");
let detailRestaurantId = null;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

addBtn.addEventListener("click", () => openEditor());
rouletteNavBtn.addEventListener("click", () => showPage("roulette"));
dataNavBtn.addEventListener("click", () => showPage("data"));
shopsNavBtn.addEventListener("click", () => showPage("shops"));
settingsNavBtn.addEventListener("click", () => showPage("settings"));
settingsAddBtn.addEventListener("click", () => {
  openEditor();
});
openTagManagerBtn.addEventListener("click", openTagManager);
exportBtn.addEventListener("click", exportBackup);
importBtn.addEventListener("click", () => backupInput.click());
backupInput.addEventListener("change", importBackup);
centerPickBtn.addEventListener("click", pickToday);
wheel.addEventListener("click", handleWheelClick);
closeDialogBtn.addEventListener("click", () => dialog.close());
closeResultBtn.addEventListener("click", () => resultDialog.close());
closeDetailBtn.addEventListener("click", () => restaurantDetailDialog.close());
editDetailBtn.addEventListener("click", editDetailRestaurant);
closeWheelCandidateBtn.addEventListener("click", () => wheelCandidateDialog.close());
closeTagManagerBtn.addEventListener("click", () => tagManagerDialog.close());
openCleanupBtn.addEventListener("click", openCleanup);
closeCleanupBtn.addEventListener("click", () => cleanupDialog.close());
closeAxisDetailBtn.addEventListener("click", () => axisDetailDialog.close());
purgeHistoryBtn.addEventListener("click", purgeHistoryBeforeDate);
deleteSelectedHistoryBtn.addEventListener("click", deleteSelectedHistoryRecords);
restaurantSearchInput.addEventListener("input", renderRestaurants);
categoryFilterSelect.addEventListener("change", renderRestaurants);
categoryPresetSelect.addEventListener("change", () => {
  if (categoryPresetSelect.value) {
    categoryInput.value = categoryPresetSelect.value;
  }
});
categoryInput.addEventListener("input", () => {
  if (!categoryInput.value.trim()) {
    categoryPresetSelect.value = "";
    return;
  }
  const value = sanitizeCategory(categoryInput.value);
  categoryPresetSelect.value = existingCategories().includes(value) ? value : "";
});
weekRangeBtn.addEventListener("click", () => setDataRange("week"));
monthRangeBtn.addEventListener("click", () => setDataRange("month"));
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
  const visitFields = editingId
    ? (visibleDays !== initialVisibleDays ? visitFieldsFromVisibleDays(visibleDays) : {})
    : newRestaurantVisitFields(visibleDays);

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
      { id: crypto.randomUUID(), name: "拉面", note: "例：https://maps.apple.com", category: "拉面", colorHex: "#FFA94D", baseWeight: 1, lastVisitedAt: offsetDate(-3), isEnabled: true },
      { id: crypto.randomUUID(), name: "咖喱饭", note: "想吃辣的时候", category: "咖喱", colorHex: "#FFC857", baseWeight: 1, lastVisitedAt: offsetDate(-8), isEnabled: true },
      { id: crypto.randomUUID(), name: "定食", note: "稳定选择", category: "定食", colorHex: "#7ED6A5", baseWeight: 1, lastVisitedAt: offsetDate(-1), isEnabled: true },
      { id: crypto.randomUUID(), name: "寿司", note: "预算高一点时", category: "日料", colorHex: "#55CDBB", baseWeight: 1, lastVisitedAt: null, isEnabled: true },
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
  const deletedHistoryRecords = Array.isArray(value?.deletedHistoryRecords) ? value.deletedHistoryRecords : [];

  return {
    schemaVersion: 4,
    savedAt: value?.savedAt || null,
    historyDeletedBefore: value?.historyDeletedBefore || null,
    deletedHistoryRecords: deletedHistoryRecords.map(normalizeDeletedHistoryRecord).filter((item) => item.id),
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
    colorHex: sanitizeColorHex(restaurant.colorHex),
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

function normalizeDeletedHistoryRecord(record) {
  return {
    id: record.id || "",
    deletedAt: record.deletedAt || new Date().toISOString(),
  };
}

function mergeStates(left, right) {
  const historyDeletedBefore = timeValue(right.historyDeletedBefore) > timeValue(left.historyDeletedBefore)
    ? right.historyDeletedBefore
    : left.historyDeletedBefore;
  const historyDeletedBeforeTime = timeValue(historyDeletedBefore);
  const deletedHistoryByID = new Map();
  for (const deleted of [...left.deletedHistoryRecords, ...right.deletedHistoryRecords]) {
    const existing = deletedHistoryByID.get(deleted.id);
    if (!existing || timeValue(deleted.deletedAt) > timeValue(existing.deletedAt)) {
      deletedHistoryByID.set(deleted.id, deleted);
    }
  }
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
    if (historyDeletedBeforeTime && timeValue(record.pickedAt) < historyDeletedBeforeTime) continue;
    if (deletedHistoryByID.has(record.id)) continue;
    historyByID.set(record.id, record);
  }

  return {
    schemaVersion: 4,
    savedAt: new Date().toISOString(),
    historyDeletedBefore,
    deletedHistoryRecords: [...deletedHistoryByID.values()],
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
  if (!category || category === LEGACY_UNCATEGORIZED_CATEGORY) return UNCATEGORIZED_CATEGORY;
  return category;
}

function sanitizeIcon(value) {
  const icon = String(value || "").trim();
  return iconChoices.includes(icon) ? icon : "";
}

function sanitizeColorHex(value) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : colors[0];
}

function renameCategoryOnRestaurants(restaurants, fromCategory, toCategory) {
  const from = sanitizeCategory(fromCategory);
  const to = sanitizeCategory(toCategory);
  if (from === UNCATEGORIZED_CATEGORY || from === to) return 0;
  const now = new Date().toISOString();
  let changed = 0;
  for (const restaurant of restaurants) {
    if (sanitizeCategory(restaurant.category) !== from) continue;
    restaurant.category = to;
    restaurant.profileUpdatedAt = now;
    changed += 1;
  }
  return changed;
}

function deleteCategoryOnRestaurants(restaurants, category) {
  const target = sanitizeCategory(category);
  if (target === UNCATEGORIZED_CATEGORY) return 0;
  const now = new Date().toISOString();
  let changed = 0;
  for (const restaurant of restaurants) {
    if (sanitizeCategory(restaurant.category) !== target) continue;
    restaurant.category = UNCATEGORIZED_CATEGORY;
    restaurant.profileUpdatedAt = now;
    changed += 1;
  }
  return changed;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function syncRestaurantVisitsFromHistory(restaurants, history, restaurantIDs, updatedAt = new Date().toISOString()) {
  const ids = new Set([...restaurantIDs].filter(Boolean));
  if (!ids.size) return 0;

  let changed = 0;
  for (const restaurant of restaurants) {
    if (!ids.has(restaurant.id)) continue;
    const latest = history
      .filter((record) => record.restaurantID === restaurant.id)
      .sort((a, b) => timeValue(b.pickedAt) - timeValue(a.pickedAt))[0] || null;
    const nextVisitedAt = latest?.pickedAt || null;
    if (restaurant.lastVisitedAt === nextVisitedAt) continue;
    restaurant.lastVisitedAt = nextVisitedAt;
    restaurant.visitedUpdatedAt = updatedAt;
    changed += 1;
  }
  return changed;
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

function newRestaurantVisitFields(days) {
  const normalizedDays = Math.min(Math.max(Number(days) || 0, 0), 7);
  if (normalizedDays >= 7) {
    return {
      lastVisitedAt: null,
      visitedUpdatedAt: new Date().toISOString(),
    };
  }
  return visitFieldsFromVisibleDays(normalizedDays);
}

function effectiveWeight(restaurant) {
  const days = Math.min(daysSinceVisit(restaurant), 30);
  return Math.max(Number(restaurant.baseWeight) || 1, 0.1) * (1 + days * 0.18);
}

function isNewRestaurant(restaurant) {
  return !restaurant.lastVisitedAt;
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
  const categoryRestaurants = categorySecondRoundRestaurants(category, candidates);
  if (!categoryRestaurants.length) return 0;
  const average = categoryRestaurants.reduce((sum, item) => sum + effectiveWeight(item), 0) / categoryRestaurants.length;
  return Math.max(average, 0.1) * recentCategoryPenalty(category, categoryRestaurants);
}

function recentCategoryPenalty(category, restaurants) {
  const recentCount = restaurants.filter((item) => item.category === category && item.lastVisitedAt && daysSinceVisit(item) <= 3).length;
  return Math.pow(0.72, recentCount);
}

function categorySecondRoundRestaurants(category, candidates) {
  return candidates.filter((item) => item.category === category && item.category !== UNCATEGORIZED_CATEGORY && !isNewRestaurant(item));
}

function enabledRestaurants() {
  return state.restaurants.filter((item) => item.isEnabled);
}

function recordDisplayName(record, restaurants = state.restaurants) {
  return restaurants.find((restaurant) => restaurant.id === record.restaurantID)?.name
    || record.restaurantName
    || "已删除店铺";
}

function firstRoundCandidates(candidates = enabledRestaurants()) {
  const directRestaurants = candidates
    .filter((restaurant) => restaurant.category === UNCATEGORIZED_CATEGORY || isNewRestaurant(restaurant))
    .map((restaurant) => ({
      type: "restaurant",
      restaurant,
      category: restaurant.category,
      weight: effectiveWeight(restaurant),
    }));

  const categories = [...new Set(candidates
    .filter((restaurant) => restaurant.category !== UNCATEGORIZED_CATEGORY && !isNewRestaurant(restaurant))
    .map((restaurant) => restaurant.category))];
  const categoryGroups = categories
    .map((category) => ({
      type: "category",
      category,
      restaurants: categorySecondRoundRestaurants(category, candidates),
      weight: categoryWeight(category, candidates),
    }))
    .filter((item) => item.weight > 0 && item.restaurants.length);

  return [...directRestaurants, ...categoryGroups];
}

function weightedSegments() {
  const candidates = enabledRestaurants();
  if (!candidates.length) return [];

  const firstRound = firstRoundCandidates(candidates);
  const totalFirstRoundWeight = firstRound.reduce((sum, item) => sum + item.weight, 0);
  if (totalFirstRoundWeight <= 0) return [];

  return firstRound.flatMap((candidate) => {
    const firstRoundRatio = candidate.weight / totalFirstRoundWeight;
    if (candidate.type === "restaurant") {
      return {
        restaurant: candidate.restaurant,
        category: candidate.category,
        firstRoundType: "restaurant",
        weight: candidate.weight,
        ratio: firstRoundRatio,
      };
    }

    const restaurantWeights = candidate.restaurants.map((restaurant) => ({ restaurant, weight: effectiveWeight(restaurant) }));
    const totalRestaurantWeight = restaurantWeights.reduce((sum, item) => sum + item.weight, 0);
    if (totalRestaurantWeight <= 0) return [];

    return restaurantWeights.map((item) => {
      const restaurantRatio = item.weight / totalRestaurantWeight;
      return {
        restaurant: item.restaurant,
        category: candidate.category,
        firstRoundType: "category",
        weight: candidate.weight * restaurantRatio,
        ratio: firstRoundRatio * restaurantRatio,
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

function normalizeAngle(angle) {
  const full = Math.PI * 2;
  return ((angle % full) + full) % full;
}

function wheelSegmentsNearAngle(targetOffset, segments, limit = WHEEL_CANDIDATE_LIMIT) {
  const ranges = segmentRanges(segments);
  const smallRanges = ranges.filter((item) => item.segment.ratio <= LOW_PROBABILITY_PICKER_THRESHOLD);
  const pool = smallRanges.length ? smallRanges : ranges;
  return pool
    .map((item) => ({
      ...item,
      distance: circularDistance(targetOffset, item.center),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((item) => item.segment);
}

function segmentRanges(segments) {
  let start = 0;
  return segments.map((segment) => {
    const span = Math.PI * 2 * segment.ratio;
    const item = {
      segment,
      start,
      end: start + span,
      center: start + span / 2,
    };
    start += span;
    return item;
  });
}

function circularDistance(left, right) {
  const full = Math.PI * 2;
  const delta = Math.abs(normalizeAngle(left) - normalizeAngle(right));
  return Math.min(delta, full - delta);
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
  resultLinks.replaceChildren(...createLinkPills(links));

  resultDialog.showModal();
}

function createLinkPills(links) {
  return links.map((url) => {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.className = "link-pill";
    link.textContent = linkLabel(url);
    return link;
  });
}

function renderRestaurantDetail(restaurant) {
  detailRestaurantId = restaurant.id;
  const links = extractLinks(restaurant.note);
  const noteText = stripLinks(restaurant.note);
  const probability = (probabilityRatio(restaurant) * 100).toFixed(0);

  detailIcon.textContent = foodIcon(restaurant);
  detailIcon.style.background = restaurant.colorHex;
  detailIcon.style.color = "#fff";
  detailName.textContent = restaurant.name;
  detailMeta.textContent = `${restaurant.category || UNCATEGORIZED_CATEGORY} · ${visitStatus(restaurant)} · 概率 ${probability}%`;
  detailNote.textContent = noteText || "没有备注。";
  detailLinks.replaceChildren(...createLinkPills(links));
  restaurantDetailDialog.showModal();
}

function editDetailRestaurant() {
  const restaurant = state.restaurants.find((item) => item.id === detailRestaurantId);
  restaurantDetailDialog.close();
  if (restaurant) openEditor(restaurant);
}

function openTagManager() {
  renderTagManager();
  tagManagerDialog.showModal();
}

function openCleanup() {
  if (!purgeBeforeInput.value) {
    purgeBeforeInput.value = new Date().toISOString().slice(0, 10);
  }
  cleanupDialog.showModal();
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
  renderCategoryPresetSelect();
  renderIconGrid();
  renderColorGrid();
  dialog.showModal();
}

function openSettings() {
  showPage("shops");
}

function openData() {
  showPage("data");
}

function showPage(page) {
  activePage = ["roulette", "data", "shops", "settings"].includes(page) ? page : "roulette";
  roulettePage.classList.toggle("active", activePage === "roulette");
  dataPage.classList.toggle("active", activePage === "data");
  shopsPage.classList.toggle("active", activePage === "shops");
  settingsPage.classList.toggle("active", activePage === "settings");
  rouletteNavBtn.classList.toggle("active", activePage === "roulette");
  dataNavBtn.classList.toggle("active", activePage === "data");
  shopsNavBtn.classList.toggle("active", activePage === "shops");
  settingsNavBtn.classList.toggle("active", activePage === "settings");

  if (activePage === "shops") {
    renderRestaurantFilters();
    renderTagManager();
    renderRestaurants();
  }
  if (activePage === "data") {
    if (!purgeBeforeInput.value) {
      purgeBeforeInput.value = new Date().toISOString().slice(0, 10);
    }
    renderTimeline();
  }
}

function setDataRange(range) {
  selectedDataRange = range === "month" ? "month" : "week";
  weekRangeBtn.classList.toggle("active", selectedDataRange === "week");
  monthRangeBtn.classList.toggle("active", selectedDataRange === "month");
  renderTimeline();
}

function existingCategories() {
  return [...new Set(state.restaurants.map((restaurant) => sanitizeCategory(restaurant.category)))]
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

function editableCategories() {
  return existingCategories().filter((category) => category !== UNCATEGORIZED_CATEGORY);
}

function renderCategoryPresetSelect() {
  const current = categoryInput.value.trim() ? sanitizeCategory(categoryInput.value) : "";
  const categories = existingCategories();
  categoryPresetSelect.replaceChildren(
    createOption("", categories.length ? "选择标签" : "暂无标签"),
    ...categories.map((category) => createOption(category, category))
  );
  categoryPresetSelect.value = categories.includes(current) ? current : "";
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
    ctx.fillStyle = "#f5e7d7";
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  let start = -Math.PI / 2;
  const labelQueue = [];
  segments.forEach((segment) => {
    const end = start + Math.PI * 2 * segment.ratio;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = segment.restaurant.colorHex;
    ctx.fill();
    paintSliceLighting(center, radius, start, end);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.58)";
    ctx.lineWidth = 3;
    ctx.stroke();
    labelQueue.push({ segment, start, end });
    start = end;
  });

  paintWheelGrain(center, radius);
  paintWheelFinish(center, radius);
  labelQueue.forEach((item) => drawWheelLabel(item.segment, item.start, item.end, center, radius));
}

function paintSliceLighting(center, radius, startAngle, endAngle) {
  ctx.save();
  ctx.clip();
  const highlight = ctx.createRadialGradient(center - radius * 0.34, center - radius * 0.44, radius * 0.08, center, center, radius);
  highlight.addColorStop(0, "rgba(255, 255, 255, 0.26)");
  highlight.addColorStop(0.48, "rgba(255, 255, 255, 0.04)");
  highlight.addColorStop(1, "rgba(17, 24, 39, 0.14)");
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.moveTo(center, center);
  ctx.arc(center, center, radius, startAngle, endAngle);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function paintWheelGrain(center, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, radius - 3, 0, Math.PI * 2);
  ctx.clip();
  for (let index = 0; index < 120; index += 1) {
    const seed = Math.sin(index * 91.7) * 10000;
    const seed2 = Math.sin(index * 37.3 + 4.2) * 10000;
    const angle = (seed - Math.floor(seed)) * Math.PI * 2;
    const distance = Math.sqrt(seed2 - Math.floor(seed2)) * (radius - 18);
    const x = center + Math.cos(angle) * distance;
    const y = center + Math.sin(angle) * distance;
    ctx.fillStyle = index % 2 ? "rgba(255, 255, 255, 0.10)" : "rgba(17, 24, 39, 0.055)";
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();
}

function paintWheelFinish(center, radius) {
  ctx.beginPath();
  ctx.arc(center, center, radius - 4, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(center, center, radius - 16, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(17, 24, 39, 0.12)";
  ctx.lineWidth = 4;
  ctx.stroke();

  const gloss = ctx.createLinearGradient(center - radius, center - radius, center + radius, center + radius);
  gloss.addColorStop(0, "rgba(255, 255, 255, 0.20)");
  gloss.addColorStop(0.52, "rgba(255, 255, 255, 0)");
  gloss.addColorStop(1, "rgba(17, 24, 39, 0.10)");
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, radius - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = gloss;
  ctx.fillRect(center - radius, center - radius, radius * 2, radius * 2);
  ctx.restore();
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
  ctx.rotate(-((rotation % 360) * Math.PI / 180));
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
  return [...String(restaurant.name || "店铺")].slice(0, 4).join("");
}

function handleWheelClick(event) {
  const hit = wheelSegmentFromEvent(event);
  if (!hit) return;
  if (hit.segment.ratio <= LOW_PROBABILITY_PICKER_THRESHOLD) {
    const candidates = uniqueRestaurantSegments(wheelSegmentsNearAngle(hit.offset, hit.segments));
    if (candidates.length > 1) {
      renderWheelCandidatePicker(candidates);
      return;
    }
  }
  renderRestaurantDetail(hit.segment.restaurant);
}

function wheelSegmentFromEvent(event) {
  const segments = weightedSegments();
  if (!segments.length) return null;

  const rect = wheel.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;
  const radius = Math.min(rect.width, rect.height) / 2;
  const distance = Math.hypot(dx, dy);
  if (distance > radius || distance < radius * 0.24) return null;

  const visualAngle = Math.atan2(dy, dx);
  const unrotatedAngle = visualAngle - (rotation % 360) * Math.PI / 180;
  const offset = normalizeAngle(unrotatedAngle - (-Math.PI / 2));
  let accumulated = 0;
  for (const segment of segments) {
    accumulated += Math.PI * 2 * segment.ratio;
    if (offset <= accumulated) return { segment, offset, segments };
  }
  const segment = segments.at(-1) ?? null;
  return segment ? { segment, offset, segments } : null;
}

function uniqueRestaurantSegments(segments) {
  const seen = new Set();
  return segments.filter((segment) => {
    if (seen.has(segment.restaurant.id)) return false;
    seen.add(segment.restaurant.id);
    return true;
  });
}

function renderWheelCandidatePicker(segments) {
  wheelCandidateList.replaceChildren(...segments.map(createWheelCandidateButton));
  wheelCandidateDialog.showModal();
}

function createWheelCandidateButton(segment) {
  const restaurant = segment.restaurant;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "candidate-row";
  button.addEventListener("click", () => {
    wheelCandidateDialog.close();
    renderRestaurantDetail(restaurant);
  });

  const icon = document.createElement("span");
  icon.className = "candidate-icon";
  icon.style.background = restaurant.colorHex;
  icon.textContent = foodIcon(restaurant);

  const main = document.createElement("span");
  main.className = "candidate-main";

  const name = document.createElement("strong");
  name.textContent = restaurant.name;

  const meta = document.createElement("span");
  meta.textContent = `${visitStatus(restaurant)} · 概率 ${(segment.ratio * 100).toFixed(1)}%`;

  main.append(name, meta);
  button.append(icon, main);
  return button;
}

function renderTagManager() {
  const categories = editableCategories();
  if (!categories.length) {
    const empty = document.createElement("p");
    empty.className = "tag-empty";
    empty.textContent = "还没有可管理的标签。给店铺填写标签后会出现在这里。";
    tagList.replaceChildren(empty);
    return;
  }

  tagList.replaceChildren(...categories.map(createTagRow));
}

function createTagRow(category) {
  const row = document.createElement("div");
  row.className = "tag-row";

  const main = document.createElement("div");
  main.className = "tag-row-main";

  const name = document.createElement("strong");
  name.textContent = category;

  const count = document.createElement("span");
  count.textContent = `${state.restaurants.filter((restaurant) => restaurant.category === category).length}家店铺`;

  const renameBtn = document.createElement("button");
  renameBtn.type = "button";
  renameBtn.className = "tag-rename-btn";
  renameBtn.textContent = "改名";
  renameBtn.addEventListener("click", () => renameCategory(category));

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "tag-delete-btn";
  deleteBtn.textContent = "删除";
  deleteBtn.addEventListener("click", () => deleteCategory(category));

  main.append(name, count);
  row.append(main, renameBtn, deleteBtn);
  return row;
}

function renameCategory(category) {
  const next = window.prompt(`将“${category}”改名为：`, category);
  if (next === null) return;
  const nextCategory = sanitizeCategory(next);
  if (nextCategory === category) return;
  const changed = renameCategoryOnRestaurants(state.restaurants, category, nextCategory);
  if (!changed) return;
  saveState();
  render();
  renderRestaurantFilters();
  renderTagManager();
  renderCategoryPresetSelect();
}

function deleteCategory(category) {
  const count = state.restaurants.filter((restaurant) => restaurant.category === category).length;
  if (!count) return;
  if (!window.confirm(`将 ${count} 家“${category}”店铺改为${UNCATEGORIZED_CATEGORY}。店铺、历史和权重不会删除。继续吗？`)) return;
  const changed = deleteCategoryOnRestaurants(state.restaurants, category);
  if (!changed) return;
  saveState();
  render();
  renderRestaurantFilters();
  renderTagManager();
  renderCategoryPresetSelect();
}

function renderRestaurants() {
  const restaurants = filteredRestaurants();

  if (!restaurants.length) {
    const empty = document.createElement("p");
    empty.className = "restaurant-meta";
    empty.textContent = state.restaurants.length ? "没有符合条件的店铺。" : "先添加几个午餐选项。";
    restaurantList.replaceChildren(empty);
    return;
  }

  const groups = groupRestaurantsByCategory(restaurants);
  restaurantList.replaceChildren(...groups.map(createRestaurantGroup));
}

function renderRestaurantFilters() {
  const current = categoryFilterSelect.value || "all";
  const categories = existingCategories();
  const options = [
    createOption("all", "全部标签"),
    ...categories.map((category) => createOption(category, category)),
  ];
  categoryFilterSelect.replaceChildren(...options);
  categoryFilterSelect.value = categories.includes(current) ? current : "all";
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function filteredRestaurants() {
  const query = restaurantSearchInput.value.trim().toLowerCase();
  const category = categoryFilterSelect.value || "all";
  return state.restaurants.filter((restaurant) => {
    const matchesCategory = category === "all" || restaurant.category === category;
    const haystack = `${restaurant.name} ${restaurant.category} ${restaurant.note}`.toLowerCase();
    return matchesCategory && (!query || haystack.includes(query));
  });
}

function groupRestaurantsByCategory(restaurants) {
  const groups = new Map();
  for (const restaurant of restaurants) {
    const key = restaurant.category || UNCATEGORIZED_CATEGORY;
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
  section.append(head, ...group.restaurants.map(createRestaurantRow));
  return section;
}

function createRestaurantRow(restaurant) {
  const row = document.createElement("div");
  row.className = "restaurant-row";
  row.append(createRestaurantCard(restaurant));
  return row;
}

function createRestaurantCard(restaurant) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "restaurant-card";
  button.setAttribute("aria-disabled", String(!restaurant.isEnabled));
  let longPressTimer = null;
  let didLongPress = false;

  button.addEventListener("pointerdown", () => {
    didLongPress = false;
    window.clearTimeout(longPressTimer);
    longPressTimer = window.setTimeout(() => {
      didLongPress = true;
      deleteRestaurantFromList(restaurant);
    }, 650);
  });

  for (const eventName of ["pointerup", "pointerleave", "pointercancel", "pointermove"]) {
    button.addEventListener(eventName, () => {
      window.clearTimeout(longPressTimer);
    });
  }

  button.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    deleteRestaurantFromList(restaurant);
  });

  button.addEventListener("click", (event) => {
    window.clearTimeout(longPressTimer);
    if (didLongPress) {
      event.preventDefault();
      return;
    }
    openEditor(restaurant);
  });

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

function deleteRestaurantFromList(restaurant) {
  if (!restaurant?.id) return;
  if (!window.confirm(`删除“${restaurant.name}”？历史记录不会删除。`)) return;
  const index = state.restaurants.findIndex((item) => item.id === restaurant.id);
  if (index < 0) return;
  rememberDeletedRestaurant(restaurant.id);
  state.restaurants.splice(index, 1);
  saveState();
  render();
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
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  cutoff.setHours(0, 0, 0, 0);

  const records = state.history
    .filter((record) => timeValue(record.pickedAt) >= cutoff.getTime())
    .sort((a, b) => timeValue(b.pickedAt) - timeValue(a.pickedAt));

  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "history-item";
    empty.textContent = "近7天还没有记录";
    historyList.replaceChildren(empty);
    return;
  }

  const track = document.createElement("div");
  const shouldRoll = records.length > 3;
  track.className = `history-track${shouldRoll ? " rolling" : ""}`;
  track.style.setProperty("--ticker-count", String(records.length));
  track.replaceChildren(...records.map((record) => createHistoryItem(record)));

  if (shouldRoll) {
    track.append(...records.map((record) => createHistoryItem(record, true)));
  }

  historyList.replaceChildren(track);
}

function createHistoryItem(record, isDuplicate = false) {
  const item = document.createElement("div");
  item.className = "history-item";
  if (isDuplicate) item.setAttribute("aria-hidden", "true");

  const name = document.createElement("strong");
  name.textContent = recordDisplayName(record);

  const date = document.createElement("span");
  date.textContent = new Date(record.pickedAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });

  item.append(name, date);
  return item;
}

function renderTimeline() {
  const period = dataPeriod(selectedDataRange);
  const records = recordsInRange(period.start, period.end).sort((a, b) => timeValue(b.pickedAt) - timeValue(a.pickedAt));

  renderHistoryStats();
  renderDataAxis(period, records);

  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "timeline-empty";
    empty.textContent = selectedDataRange === "month" ? "这个月还没有记录。" : "这周还没有记录。";
    timelineList.replaceChildren(empty);
    selectedHistoryIDs.clear();
    historySelectionMode = false;
    renderSelectedHistoryState();
    return;
  }

  const visibleIDs = new Set(records.map((record) => record.id));
  for (const id of [...selectedHistoryIDs]) {
    if (!visibleIDs.has(id)) selectedHistoryIDs.delete(id);
  }

  timelineList.replaceChildren(...records.map(createTimelineItem));
  renderSelectedHistoryState();
}

function createTimelineItem(record) {
  const item = document.createElement("div");
  item.className = `timeline-item${historySelectionMode ? " selection-mode" : ""}`;

  const pickedAt = new Date(record.pickedAt);
  const date = document.createElement("time");
  date.dateTime = record.pickedAt;
  date.textContent = pickedAt.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric", weekday: "short" });

  const name = document.createElement("strong");
  name.textContent = recordDisplayName(record);

  if (historySelectionMode) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedHistoryIDs.has(record.id);
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleHistorySelection(record.id);
    });
    item.append(checkbox, date, name);
  } else {
    item.append(date, name);
  }

  let longPressTimer = null;
  let didLongPress = false;

  item.addEventListener("pointerdown", () => {
    didLongPress = false;
    window.clearTimeout(longPressTimer);
    longPressTimer = window.setTimeout(() => {
      didLongPress = true;
      historySelectionMode = true;
      selectedHistoryIDs.add(record.id);
      renderTimeline();
    }, 520);
  });

  for (const eventName of ["pointerup", "pointerleave", "pointercancel", "pointermove"]) {
    item.addEventListener(eventName, () => {
      window.clearTimeout(longPressTimer);
    });
  }

  item.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    historySelectionMode = true;
    selectedHistoryIDs.add(record.id);
    renderTimeline();
  });

  item.addEventListener("click", () => {
    window.clearTimeout(longPressTimer);
    if (didLongPress || !historySelectionMode) return;
    toggleHistorySelection(record.id);
  });

  return item;
}

function toggleHistorySelection(id) {
  if (selectedHistoryIDs.has(id)) {
    selectedHistoryIDs.delete(id);
  } else {
    selectedHistoryIDs.add(id);
  }
  if (!selectedHistoryIDs.size) {
    historySelectionMode = false;
  }
  renderTimeline();
}

function renderSelectedHistoryState() {
  const count = selectedHistoryIDs.size;
  selectedHistoryCount.hidden = count === 0;
  selectedHistoryCount.textContent = count ? `已选 ${count}` : "";
  deleteSelectedHistoryBtn.hidden = count === 0;
  deleteSelectedHistoryBtn.disabled = count === 0;
}

function renderHistoryStats() {
  const count = state.history.length;
  if (!count) {
    historyStats.textContent = "0条记录";
    return;
  }

  const oldest = state.history.reduce((min, record) => Math.min(min, timeValue(record.pickedAt)), Infinity);
  const oldestText = Number.isFinite(oldest)
    ? new Date(oldest).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
    : "未知";
  historyStats.textContent = `${count}条 · 最早 ${oldestText}`;
}

function renderDataAxis(period, records) {
  axisTitle.textContent = selectedDataRange === "month" ? "本月总结" : "本周总结";
  if (selectedDataRange === "month") {
    renderMonthlySummary(records);
    return;
  }

  weekAxis.className = "week-axis";
  weekAxis.style.setProperty("--axis-days", String(period.days.length));
  axisDetail.replaceChildren(...(records.length ? [] : [createAxisHint("当前范围还没有数据点。")]));

  const byDate = new Map(period.days.map((date) => [dateKey(date), []]));
  for (const record of records.slice().sort((a, b) => timeValue(a.pickedAt) - timeValue(b.pickedAt))) {
    const key = dateKey(new Date(record.pickedAt));
    if (byDate.has(key)) byDate.get(key).push(record);
  }

  weekAxis.replaceChildren(...period.days.map((date) => createAxisDay(date, byDate.get(dateKey(date)) || [])));
}

function renderMonthlySummary(records) {
  weekAxis.className = "month-summary";
  weekAxis.style.removeProperty("--axis-days");
  axisDetail.replaceChildren(...(records.length ? [] : [createAxisHint("这个月还没有记录。")]));

  const grouped = new Map();
  for (const record of records) {
    const key = record.restaurantID || record.restaurantName;
    const restaurant = restaurantForRecord(record);
    const existing = grouped.get(key) || {
      name: recordDisplayName(record),
      count: 0,
      restaurant,
      color: restaurant?.colorHex || colors[grouped.size % colors.length],
      icon: foodIcon(restaurant || { name: record.restaurantName, category: "" }),
    };
    existing.count += 1;
    if (!existing.restaurant && restaurant) {
      existing.restaurant = restaurant;
      existing.color = restaurant.colorHex;
      existing.icon = foodIcon(restaurant);
    }
    grouped.set(key, existing);
  }

  const items = [...grouped.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-Hans-CN"))
    .slice(0, 10);
  const maxCount = Math.max(...items.map((item) => item.count), 1);
  weekAxis.replaceChildren(...items.map((item) => createMonthBar(item, maxCount)));
}

function createMonthBar(item, maxCount) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "month-bar-item";
  button.addEventListener("click", () => showMonthlySummaryDetail(item));

  const count = document.createElement("strong");
  count.textContent = `${item.count}`;

  const bar = document.createElement("span");
  bar.className = "month-bar";
  bar.style.height = `${Math.max(14, Math.round((item.count / maxCount) * 51))}px`;
  bar.style.background = item.color;

  const icon = document.createElement("span");
  icon.className = "month-bar-icon";
  icon.textContent = item.icon;

  const name = document.createElement("span");
  name.className = "month-bar-name";
  name.textContent = [...String(item.name)].slice(0, 4).join("");

  button.append(count, bar, icon, name);
  return button;
}

function showMonthlySummaryDetail(item) {
  const detail = document.createElement("section");
  detail.className = "axis-detail-card";

  const title = document.createElement("strong");
  title.textContent = `${item.name} · 本月 ${item.count} 次`;

  const note = document.createElement("p");
  note.className = "axis-hint";
  note.textContent = item.restaurant ? `${item.restaurant.category || UNCATEGORIZED_CATEGORY} · ${visitStatus(item.restaurant)}` : "历史记录中的店铺";

  detail.append(title, note);
  axisDetail.replaceChildren(detail);
}

function createAxisDay(date, records) {
  const day = document.createElement("button");
  day.type = "button";
  day.className = "axis-day";
  day.disabled = !records.length;
  if (records.length) {
    day.addEventListener("click", () => showAxisDetails(date, records));
  }

  const label = document.createElement("span");
  label.className = "axis-label";
  label.textContent = selectedDataRange === "month"
    ? String(date.getDate())
    : date.toLocaleDateString("zh-CN", { weekday: "short" });

  const rail = document.createElement("div");
  rail.className = "axis-rail";

  const visibleRecords = records.slice(0, 5);
  const dotWrap = document.createElement("div");
  dotWrap.className = "axis-dots stacked";
  dotWrap.replaceChildren(...visibleRecords.map(createAxisDot));

  if (records.length > visibleRecords.length) {
    const more = document.createElement("span");
    more.className = "axis-more";
    more.textContent = `+${records.length - visibleRecords.length}`;
    dotWrap.append(more);
  }

  const dateText = document.createElement("span");
  dateText.className = "axis-date";
  dateText.textContent = selectedDataRange === "month"
    ? date.toLocaleDateString("zh-CN", { weekday: "short" })
    : date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });

  rail.append(dotWrap);
  day.append(label, rail, dateText);
  return day;
}

function createAxisDot(record) {
  const restaurant = restaurantForRecord(record);
  const dot = document.createElement("span");
  dot.className = "axis-dot";
  dot.style.background = restaurant?.colorHex || "#63C5EA";
  dot.title = recordDisplayName(record);
  dot.setAttribute("aria-label", recordDisplayName(record));
  dot.textContent = foodIcon(restaurant || { name: record.restaurantName, category: "" });
  return dot;
}

function restaurantForRecord(record) {
  return state.restaurants.find((restaurant) => restaurant.id === record.restaurantID)
    || state.restaurants.find((restaurant) => restaurant.name === record.restaurantName)
    || null;
}

function showAxisDetails(date, records) {
  axisDialogTitle.textContent = `${date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric", weekday: "long" })} · ${records.length}条`;
  axisDialogContent.replaceChildren(...records
    .slice()
    .sort((a, b) => timeValue(a.pickedAt) - timeValue(b.pickedAt))
    .map(createAxisDetailItem));
  axisDetailDialog.showModal();
}

function createAxisDetailItem(record) {
  const restaurant = restaurantForRecord(record);
  const item = document.createElement("div");
  item.className = "axis-detail-item";

  const dot = document.createElement("span");
  dot.className = "axis-detail-dot";
  dot.style.background = restaurant?.colorHex || "#63C5EA";
  dot.textContent = foodIcon(restaurant || { name: record.restaurantName, category: "" });

  const name = document.createElement("strong");
  name.textContent = recordDisplayName(record);

  const time = document.createElement("time");
  time.dateTime = record.pickedAt;
  time.textContent = new Date(record.pickedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

  item.append(dot, name, time);
  return item;
}

function createAxisHint(text) {
  const hint = document.createElement("p");
  hint.className = "axis-hint";
  hint.textContent = text;
  return hint;
}

function dataPeriod(range) {
  const now = new Date();
  const start = range === "month" ? startOfMonth(now) : startOfWeek(now);
  const end = range === "month"
    ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
    : addDays(start, 7);
  const length = Math.round((end - start) / 86400000);
  const days = Array.from({ length }, (_, index) => addDays(start, index));
  return { start, end, days };
}

function recordsInRange(start, end) {
  return state.history.filter((record) => {
    const pickedAt = new Date(record.pickedAt);
    return pickedAt >= start && pickedAt < end;
  });
}

function purgeHistoryBeforeDate() {
  if (!purgeBeforeInput.value) return;
  const cutoff = new Date(`${purgeBeforeInput.value}T00:00:00`);
  if (!Number.isFinite(cutoff.getTime())) return;

  const beforeCount = state.history.length;
  const removedRecords = state.history.filter((record) => timeValue(record.pickedAt) < cutoff.getTime());
  const remaining = state.history.filter((record) => timeValue(record.pickedAt) >= cutoff.getTime());
  const removed = beforeCount - remaining.length;
  if (!removed) {
    window.alert("没有可删除的历史记录。");
    return;
  }

  if (!window.confirm(`将删除 ${removed} 条抽取历史记录，店铺和权重不会删除。继续吗？`)) return;
  state.historyDeletedBefore = cutoff.toISOString();
  state.history = remaining;
  syncRestaurantVisitsFromHistory(state.restaurants, state.history, removedRecords.map((record) => record.restaurantID));
  selectedHistoryIDs.clear();
  historySelectionMode = false;
  saveState();
  render();
  renderTimeline();
  cleanupDialog.close();
}

function deleteSelectedHistoryRecords() {
  if (!selectedHistoryIDs.size) return;
  const ids = new Set(selectedHistoryIDs);
  const removed = state.history.filter((record) => ids.has(record.id)).length;
  if (!removed) {
    selectedHistoryIDs.clear();
    historySelectionMode = false;
    renderTimeline();
    return;
  }

  if (!window.confirm(`将删除 ${removed} 条选中的抽取历史记录。继续吗？`)) return;
  const deletedAt = new Date().toISOString();
  const removedRecords = state.history.filter((record) => ids.has(record.id));
  const existing = new Map((state.deletedHistoryRecords || []).map((record) => [record.id, record]));
  for (const id of ids) {
    existing.set(id, { id, deletedAt });
  }
  state.deletedHistoryRecords = [...existing.values()];
  state.history = state.history.filter((record) => !ids.has(record.id));
  syncRestaurantVisitsFromHistory(state.restaurants, state.history, removedRecords.map((record) => record.restaurantID));
  selectedHistoryIDs.clear();
  historySelectionMode = false;
  saveState();
  render();
  renderTimeline();
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  return start;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function render() {
  centerPickBtn.disabled = !enabledRestaurants().length;
  renderWheel();
  if (activePage === "shops") {
    renderRestaurantFilters();
    renderTagManager();
  }
  renderRestaurants();
  renderHistory();
}

render();
