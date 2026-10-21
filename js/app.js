/*
 * Kasir Warung — aplikasi pesanan dan pembayaran untuk warung kecil.
 * Semua data disimpan di IndexedDB pada browser ini.
 */
(function () {
  'use strict';

  const APP_ID = 'kasir-warung';
  const APP_VERSION = '1.2.0';
  const SCHEMA_VERSION = 3;
  const QUICK_CASH_AMOUNTS = [10000, 20000, 50000, 100000];
  const MAX_DISCOUNT_AMOUNT = 5000;
  const DISCOUNT_TYPES = ['student', 'ojol'];
  const MAX_ITEM_PHOTO_BYTES = 8 * 1024 * 1024;
  const MAX_QRIS_BYTES = 8 * 1024 * 1024;
  const MAX_LOGO_BYTES = 5 * 1024 * 1024;
  const PROTECTED_VIEWS = new Set(['menu', 'settings']);

  const t = function () {
    return window.AppI18n.t.apply(null, arguments);
  };

  const ICONS = {
    bowl:
      '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z"/>' +
      '<path d="M8.5 7.5c0-1.4 1.2-1.9 1.2-3.5M13.7 7.5c0-1.4 1.2-1.9 1.2-3.5"/>' +
      '<path d="M4 21h16"/>',
    register:
      '<rect x="3" y="7" width="18" height="13" rx="2"/>' +
      '<path d="M3 11h18M7 15h3M14 15h3M8 7V4h8v3"/>',
    book:
      '<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H10a3 3 0 0 1 2 3v15a3 3 0 0 0-2-3H3Z"/>' +
      '<path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H14a3 3 0 0 0-2 3v15a3 3 0 0 1 2-3h7Z"/>',
    chart:
      '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    settings:
      '<path d="M4 7h16M4 17h16"/>' +
      '<circle cx="9" cy="7" r="3"/>' +
      '<circle cx="15" cy="17" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m4 12.5 5 5L20 6.5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16.5 9"/>',
    print:
      '<path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z"/><path d="M17 11h1"/>',
    trash:
      '<path d="M3 6h18M8 6V3h8v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
    pencil:
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-5 1 1-5Z"/>',
    image:
      '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>',
    upload:
      '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    qr:
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>' +
      '<rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h1"/>',
    banknote:
      '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10h.01M18 14h.01"/>',
    arrowLeft: '<path d="M20 12H4M10 6l-6 6 6 6"/>',
    arrowRight: '<path d="M4 12h16M14 6l6 6-6 6"/>',
    lock:
      '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    alert:
      '<path d="M12 3 2.2 20.5h19.6Z"/><path d="M12 9v5M12 17.5h.01"/>',
    bag:
      '<path d="M5 7h14l1 14H4ZM9 10V5a3 3 0 0 1 6 0v5"/>',
    receipt:
      '<path d="M5 3v18l3-2 4 2 4-2 3 2V3H5Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    camera:
      '<path d="M4 8h3l2-3h6l2 3h3v12H4Z"/><circle cx="12" cy="13" r="4"/>',
    tag:
      '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/>' +
      '<circle cx="7.5" cy="7.5" r="1.2"/>',
    wifiOff:
      '<path d="m3 3 18 18M8.5 8.5A9 9 0 0 1 21 10M3 10a9 9 0 0 1 2.5-1.5M6.5 14a6 6 0 0 1 6-1M10 18a3 3 0 0 1 4 0"/>'
  };

  let state = null;
  let ui = {
    view: 'order',
    search: '',
    category: 'all',
    adminUnlocked: false,
    pinTargetView: null,
    pinChecking: false,
    pinEditing: false,
    historyLimit: 30,
    paymentMethod: null,
    cashRaw: '',
    busy: false,
    itemForm: null,
    addonItemId: null,
    lastSaleId: null,
    saveStatus: 'saved',
    storageErrorShown: false
  };

  const imageUrls = new Map();
  let saveTimer = null;
  let saveQueue = Promise.resolve();
  let saveOperation = 0;
  let itemPreviewUrl = null;
  let confirmResolver = null;
  let toastTimer = null;

  const $ = function (selector, root) {
    return (root || document).querySelector(selector);
  };
  const $$ = function (selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  };

  // ---------- Utilities ----------

  function uid(prefix) {
    let random;
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      random = window.crypto.randomUUID();
    } else {
      random = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }
    return (prefix || 'id') + '-' + random;
  }

  function cloneData(value) {
    if (typeof window.structuredClone === 'function') {
      try {
        return window.structuredClone(value);
      } catch (error) {
        /* fall through */
      }
    }
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  }

  function asText(value, fallback) {
    return typeof value === 'string' ? value : fallback == null ? '' : String(fallback);
  }

  function asId(value) {
    return typeof value === 'string' && value.trim() ? value : null;
  }

  function toInt(value, fallback) {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.round(number);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function parseMoneyInput(value) {
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value < 0) return null;
      return Math.round(value);
    }
    const digits = String(value == null ? '' : value).replace(/[^0-9]/g, '');
    if (!digits) return null;
    const number = Number(digits);
    if (!Number.isSafeInteger(number)) return null;
    return number;
  }

  function parseQuantity(value, fallback) {
    const number = toInt(value, fallback || 1);
    if (!Number.isFinite(number) || number < 1) return fallback || 1;
    return Math.min(number, 999999);
  }

  function normalizeAddons(rawAddons) {
    const addons = [];
    const usedIds = new Set();
    const usedNames = new Set();
    if (!Array.isArray(rawAddons)) return addons;
    rawAddons.forEach(function (rawAddon) {
      if (!rawAddon || typeof rawAddon !== 'object') return;
      const name = asText(rawAddon.name, '').trim().replace(/\s+/g, ' ').slice(0, 80);
      if (!name) return;
      const nameKey = name.toLowerCase();
      if (usedNames.has(nameKey)) return;
      let id = asId(rawAddon.id) || uid('addon');
      while (usedIds.has(id)) id = uid('addon');
      usedIds.add(id);
      usedNames.add(nameKey);
      addons.push({
        id: id,
        name: name,
        price: clamp(toInt(rawAddon.price, 0), 0, Number.MAX_SAFE_INTEGER)
      });
    });
    return addons;
  }

  function addonTotal(addons) {
    return (Array.isArray(addons) ? addons : []).reduce(function (sum, addon) {
      return sum + Math.max(0, toInt(addon && addon.price, 0));
    }, 0);
  }

  function unitPriceWithAddons(basePrice, addons) {
    return clamp(
      Math.max(0, toInt(basePrice, 0)) + addonTotal(addons),
      0,
      Number.MAX_SAFE_INTEGER
    );
  }

  function addonSignature(addons) {
    return (Array.isArray(addons) ? addons : [])
      .map(function (addon) {
        return [addon.id, addon.name, addon.price].join(':');
      })
      .sort()
      .join('|');
  }

  function addonBreakdownText(addons) {
    return (Array.isArray(addons) ? addons : [])
      .map(function (addon) {
        const price = Math.max(0, toInt(addon.price, 0));
        return addon.name + (price > 0 ? ' +' + money(price) : '');
      })
      .join(' · ');
  }

  function formatNumber(value) {
    const number = Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(number);
  }

  function money(value) {
    const number = Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
    return (number < 0 ? '-' : '') + 'Rp ' + formatNumber(Math.abs(number));
  }

  function formatPercent(value) {
    const number = Number.isFinite(Number(value)) ? Number(value) : 0;
    return new Intl.NumberFormat(uiLanguage() === 'en' ? 'en-GB' : 'id-ID', {
      maximumFractionDigits: 2
    }).format(number);
  }

  function uiLanguage() {
    return state && state.settings && state.settings.lang === 'en' ? 'en' : 'id';
  }

  function locale() {
    return uiLanguage() === 'en' ? 'en-GB' : 'id-ID';
  }

  function formatDateTime(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(locale(), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).format(date);
  }

  function formatTime(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(locale(), {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).format(date);
  }

  function formatDateLong(date) {
    return new Intl.DateTimeFormat(locale(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }

  function localDateKey(dateOrIso) {
    const date = dateOrIso instanceof Date ? dateOrIso : new Date(dateOrIso);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function dateFromKey(key) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return null;
    const parts = key.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }

  function dateHeading(key) {
    const today = localDateKey(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = localDateKey(yesterdayDate);
    if (key === today) return t('history.today');
    if (key === yesterday) return t('history.yesterday');
    const date = dateFromKey(key);
    return date ? formatDateLong(date) : key;
  }

  function icon(name, extraClass) {
    return (
      '<svg class="icon' +
      (extraClass ? ' ' + extraClass : '') +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      (ICONS[name] || '') +
      '</svg>'
    );
  }

  function brandName() {
    const name = state && state.settings ? asText(state.settings.restaurantName, '').trim() : '';
    return name || t('common.defaultRestaurant');
  }

  function itemCountLabel(count) {
    return t('common.items', { count: count });
  }

  function categoryLabel(category) {
    if (!category) return t('category.other');
    if (category.nameKey) return t(category.nameKey);
    return asText(category.name, t('category.other'));
  }

  function categoryById(id) {
    return state.categories.find(function (category) {
      return category.id === id;
    }) || null;
  }

  function getMenuItem(id) {
    return state.menu.find(function (item) {
      return item.id === id;
    }) || null;
  }

  function getSale(id) {
    return state.sales.find(function (sale) {
      return sale.id === id;
    }) || null;
  }

  function isPinActive() {
    return Boolean(state && state.settings && state.settings.pinHash);
  }

  function currentTaxLabel(settings) {
    const source = settings || state.settings;
    const custom = asText(source.taxLabel, '').trim();
    return custom || t('tax.defaultLabel');
  }

  function defaultDiscountSettings() {
    return {
      student: { enabled: true, type: 'percent', value: 5 },
      ojol: { enabled: true, type: 'percent', value: 5 }
    };
  }

  function normalizeDiscountEntry(rawEntry, fallback) {
    const source = rawEntry && typeof rawEntry === 'object' ? rawEntry : {};
    const type = source.type === 'amount' || source.type === 'percent' ? source.type : fallback.type;
    const maxValue = type === 'amount' ? MAX_DISCOUNT_AMOUNT : 100;
    let value = Number(source.value);
    if (!Number.isFinite(value)) value = fallback.value;
    value = clamp(value, 0, maxValue);
    if (type === 'amount') value = Math.round(value);
    else value = Math.round(value * 100) / 100;
    return {
      enabled: typeof source.enabled === 'boolean' ? source.enabled : fallback.enabled,
      type: type,
      value: value
    };
  }

  function normalizeDiscountSettings(rawDiscounts) {
    const fallback = defaultDiscountSettings();
    const source = rawDiscounts && typeof rawDiscounts === 'object' ? rawDiscounts : {};
    return {
      student: normalizeDiscountEntry(source.student, fallback.student),
      ojol: normalizeDiscountEntry(source.ojol, fallback.ojol)
    };
  }

  function discountKindLabel(kind) {
    if (kind === 'student') return t('discount.student');
    if (kind === 'ojol') return t('discount.ojol');
    return t('discount.generic');
  }

  function discountConfigFor(kind, settings) {
    const source = settings || state.settings;
    const discounts = source && source.discounts ? source.discounts : null;
    return discounts && discounts[kind] ? discounts[kind] : defaultDiscountSettings()[kind];
  }

  function foodSubtotal(lines) {
    return (Array.isArray(lines) ? lines : []).reduce(function (sum, line) {
      if (!line || line.categoryId !== 'food') return sum;
      return sum + Math.max(0, toInt(line.price, 0)) * Math.max(1, toInt(line.qty, 1));
    }, 0);
  }

  function discountOptionFor(kind, lines, settings) {
    const sourceLines = lines || state.draft.lines;
    const config = discountConfigFor(kind, settings);
    const base = foodSubtotal(sourceLines);
    let amount = 0;
    if (config.enabled && config.value > 0 && base > 0) {
      amount =
        config.type === 'percent'
          ? Math.round((base * config.value) / 100)
          : Math.round(config.value);
      amount = clamp(amount, 0, Math.min(MAX_DISCOUNT_AMOUNT, base));
    }
    return {
      kind: kind,
      config: config,
      base: base,
      amount: amount,
      available: config.enabled && config.value > 0 && base > 0
    };
  }

  function selectedDiscountOption(lines, settings) {
    const kind = state && state.draft ? state.draft.discountType : null;
    if (DISCOUNT_TYPES.indexOf(kind) === -1) return null;
    const option = discountOptionFor(kind, lines, settings);
    return option.available ? option : null;
  }

  function discountLineLabel(discount) {
    if (!discount) return t('discount.generic');
    const kind = discount.kind || discount.discountType;
    const name = discountKindLabel(kind);
    const mode =
      discount.mode ||
      discount.discountMode ||
      (discount.config ? discount.config.type : null);
    const value =
      discount.value != null
        ? discount.value
        : discount.discountValue != null
          ? discount.discountValue
          : discount.config
            ? discount.config.value
            : 0;
    return mode === 'percent'
      ? t('discount.percentLine', { name: name, percent: formatPercent(value) })
      : t('discount.amountLine', { name: name });
  }

  function discountRuleText(config) {
    if (!config) return '';
    return config.type === 'percent'
      ? t('discount.percentValue', { percent: formatPercent(config.value) })
      : t('discount.amountValue', { amount: money(config.value) });
  }

  function calculateTotals(lines, settings) {
    const sourceLines = lines || state.draft.lines;
    const sourceSettings = settings || state.settings;
    const subtotal = sourceLines.reduce(function (sum, line) {
      return sum + Math.max(0, toInt(line.price, 0)) * Math.max(1, toInt(line.qty, 1));
    }, 0);
    const discount = selectedDiscountOption(sourceLines, sourceSettings);
    const discountAmount = discount ? discount.amount : 0;
    const taxableSubtotal = Math.max(0, subtotal - discountAmount);
    const percent = clamp(Number(sourceSettings.taxPercent) || 0, 0, 100);
    const taxApplied = Boolean(sourceSettings.taxEnabled) && percent > 0;
    const taxAmount = taxApplied ? Math.round((taxableSubtotal * percent) / 100) : 0;
    return {
      subtotal: subtotal,
      discountType: discount ? discount.kind : null,
      discountMode: discount ? discount.config.type : null,
      discountValue: discount ? discount.config.value : 0,
      discountBase: discount ? discount.base : foodSubtotal(sourceLines),
      discountAmount: discountAmount,
      discountLabel: discount ? discountKindLabel(discount.kind) : '',
      taxableSubtotal: taxableSubtotal,
      taxApplied: taxApplied && taxAmount > 0,
      taxLabel: currentTaxLabel(sourceSettings),
      taxPercent: percent,
      taxAmount: taxAmount,
      total: taxableSubtotal + taxAmount
    };
  }

  function draftCount(lines) {
    return (lines || state.draft.lines).reduce(function (sum, line) {
      return sum + Math.max(1, toInt(line.qty, 1));
    }, 0);
  }

  function emptyDraft() {
    return {
      lines: [],
      note: '',
      discountType: null,
      startedAt: new Date().toISOString()
    };
  }

  function buildStepIndicator(activeStep, allDone) {
    const labels = [t('steps.menu'), t('steps.review'), t('steps.pay')];
    let html = '<ol class="step-indicator" aria-label="' + escapeHTML(t('steps.aria')) + '">';
    labels.forEach(function (label, index) {
      const stepNumber = index + 1;
      const done = allDone || stepNumber < activeStep;
      const current = !allDone && stepNumber === activeStep;
      html +=
        '<li class="step' +
        (done ? ' is-done' : '') +
        '"' +
        (current ? ' aria-current="step"' : '') +
        '>' +
        '<span class="step-number">' +
        (done ? icon('check') : String(stepNumber)) +
        '</span>' +
        '<span class="step-label">' + escapeHTML(label) + '</span>' +
        '</li>';
    });
    html += '</ol>';
    return html;
  }

  function renderSaveStatus() {
    const status = ui.saveStatus;
    const text =
      status === 'saving'
        ? t('common.saving')
        : status === 'error'
          ? t('common.saveFailed')
          : t('common.saved');
    return (
      '<span class="save-status" data-save-status="' + status + '" role="status">' +
      (status === 'error' ? icon('alert') : status === 'saving' ? icon('receipt') : icon('checkCircle')) +
      '<span>' + escapeHTML(text) + '</span></span>'
    );
  }

  function updateSaveStatusDom() {
    $$('[data-save-status]').forEach(function (node) {
      node.dataset.saveStatus = ui.saveStatus;
      let text = t('common.saved');
      let iconName = 'checkCircle';
      if (ui.saveStatus === 'saving') {
        text = t('common.saving');
        iconName = 'receipt';
      } else if (ui.saveStatus === 'error') {
        text = t('common.saveFailed');
        iconName = 'alert';
      }
      node.innerHTML = icon(iconName) + '<span>' + escapeHTML(text) + '</span>';
    });
  }

  function setSaveStatus(status) {
    ui.saveStatus = status;
    updateSaveStatusDom();
  }

  function showStorageError(error) {
    console.error('Gagal menyimpan:', error);
    setSaveStatus('error');
    if (!ui.storageErrorShown) {
      ui.storageErrorShown = true;
      showToast(t('common.saveFailed'), 'error', 7000);
    }
  }

  function saveNow() {
    if (!state) return Promise.resolve();
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const snapshot = cloneData(state);
    const operation = ++saveOperation;
    setSaveStatus('saving');
    const run = saveQueue.then(function () {
      return window.AppDB.setState(snapshot);
    });
    saveQueue = run.catch(function () {});
    return run
      .then(function () {
        if (operation === saveOperation && !saveTimer) {
          ui.storageErrorShown = false;
          setSaveStatus('saved');
        }
      })
      .catch(function (error) {
        if (operation === saveOperation) showStorageError(error);
        throw error;
      });
  }

  function saveSoon(delay) {
    if (!state) return;
    if (saveTimer) clearTimeout(saveTimer);
    setSaveStatus('saving');
    saveTimer = setTimeout(function () {
      saveTimer = null;
      saveNow().catch(function () {});
    }, typeof delay === 'number' ? delay : 160);
  }

  // ---------- Default data and normalisation ----------

  function defaultCategories() {
    return [
      { id: 'food', nameKey: 'category.food' },
      { id: 'drink', nameKey: 'category.drink' },
      { id: 'other', nameKey: 'category.other' }
    ];
  }

  function createDefaultState() {
    return {
      app: APP_ID,
      schemaVersion: SCHEMA_VERSION,
      settings: {
        restaurantName: t('common.defaultRestaurant'),
        logoImageId: null,
        qrisImageId: null,
        taxEnabled: false,
        taxLabel: '',
        taxPercent: 0,
        discounts: defaultDiscountSettings(),
        lang: window.AppI18n.getLanguage(),
        pinHash: null,
        pinSalt: null,
        pinAlgo: null
      },
      categories: defaultCategories(),
      menu: [],
      sales: [],
      draft: emptyDraft(),
      nextOrderNumber: 1,
      createdAt: new Date().toISOString()
    };
  }

  function normalizeCategories(rawCategories) {
    const result = defaultCategories();
    const known = new Set(['food', 'drink', 'other']);
    if (!Array.isArray(rawCategories)) return result;
    rawCategories.forEach(function (category) {
      if (!category || typeof category !== 'object') return;
      const id = asId(category.id);
      if (!id || known.has(id)) return;
      const name = asText(category.name, '').trim();
      if (!name) return;
      known.add(id);
      result.push({ id: id, name: name });
    });
    return result;
  }

  function normalizeDraft(rawDraft, menu) {
    const draft = emptyDraft();
    if (!rawDraft || typeof rawDraft !== 'object') return draft;
    draft.note = asText(rawDraft.note, '').slice(0, 500);
    draft.discountType =
      rawDraft.discountType === 'student' || rawDraft.discountType === 'ojol'
        ? rawDraft.discountType
        : null;
    draft.startedAt = typeof rawDraft.startedAt === 'string' ? rawDraft.startedAt : draft.startedAt;
    if (!Array.isArray(rawDraft.lines)) return draft;
    const usedLineIds = new Set();
    rawDraft.lines.forEach(function (line) {
      if (!line || typeof line !== 'object') return;
      const menuId = asId(line.menuId);
      if (!menuId) return;
      const menuItem = menu.find(function (item) {
        return item.id === menuId;
      });
      const name = asText(line.name, menuItem ? menuItem.name : '').trim();
      if (!name) return;
      const addons = normalizeAddons(line.addons);
      const addonSum = addonTotal(addons);
      const fallbackPrice = menuItem ? menuItem.price : 0;
      const rawPrice = clamp(toInt(line.price, fallbackPrice), 0, Number.MAX_SAFE_INTEGER);
      const basePrice = clamp(
        toInt(line.basePrice, Math.max(0, rawPrice - addonSum)),
        0,
        Number.MAX_SAFE_INTEGER
      );
      let lineId = asId(line.id) || uid('line');
      while (usedLineIds.has(lineId)) lineId = uid('line');
      usedLineIds.add(lineId);
      draft.lines.push({
        id: lineId,
        menuId: menuId,
        name: name,
        categoryId:
          asText(line.categoryId, '').trim() ||
          (menuItem ? menuItem.categoryId : null),
        basePrice: basePrice,
        addons: addons,
        price: unitPriceWithAddons(basePrice, addons),
        qty: parseQuantity(line.qty, 1)
      });
    });
    return draft;
  }

  function normalizeSale(rawSale) {
    if (!rawSale || typeof rawSale !== 'object') return null;
    const id = asId(rawSale.id) || uid('sale');
    const createdAt = typeof rawSale.createdAt === 'string' && !Number.isNaN(new Date(rawSale.createdAt).getTime())
      ? rawSale.createdAt
      : new Date().toISOString();
    const lines = [];
    (Array.isArray(rawSale.lines) ? rawSale.lines : []).forEach(function (line) {
      if (!line || typeof line !== 'object') return;
      const name = asText(line.name, '').trim();
      if (!name) return;
      const addons = normalizeAddons(line.addons);
      const addonSum = addonTotal(addons);
      const rawPrice = clamp(toInt(line.price, 0), 0, Number.MAX_SAFE_INTEGER);
      const basePrice = clamp(
        toInt(line.basePrice, Math.max(0, rawPrice - addonSum)),
        0,
        Number.MAX_SAFE_INTEGER
      );
      const price = unitPriceWithAddons(basePrice, addons);
      const qty = parseQuantity(line.qty, 1);
      lines.push({
        name: name,
        categoryId: asText(line.categoryId, '').trim() || null,
        basePrice: basePrice,
        addons: addons,
        price: price,
        qty: qty,
        subtotal: price * qty
      });
    });
    if (!lines.length) return null;
    const subtotal = lines.reduce(function (sum, line) {
      return sum + line.subtotal;
    }, 0);
    const taxAmount = Math.max(0, toInt(rawSale.taxAmount, 0));
    let discountType =
      rawSale.discountType === 'student' || rawSale.discountType === 'ojol'
        ? rawSale.discountType
        : null;
    let discountMode =
      rawSale.discountMode === 'percent' || rawSale.discountMode === 'amount'
        ? rawSale.discountMode
        : null;
    let discountValue = Number(rawSale.discountValue);
    if (!Number.isFinite(discountValue) || discountValue < 0) discountValue = 0;
    if (discountMode === 'percent') discountValue = clamp(discountValue, 0, 100);
    else if (discountMode === 'amount') {
      discountValue = Math.min(MAX_DISCOUNT_AMOUNT, Math.round(discountValue));
    }
    let discountAmount = Math.max(0, toInt(rawSale.discountAmount, 0));
    if (!discountType || discountAmount <= 0) {
      discountType = null;
      discountMode = null;
      discountValue = 0;
      discountAmount = 0;
    } else {
      discountAmount = Math.min(discountAmount, MAX_DISCOUNT_AMOUNT, subtotal);
    }
    const fallbackTotal = Math.max(0, subtotal - discountAmount + taxAmount);
    const method = rawSale.method === 'qris' ? 'qris' : 'cash';
    const cashReceived = method === 'cash' ? Math.max(0, toInt(rawSale.cashReceived, 0)) : null;
    const change =
      method === 'cash'
        ? rawSale.change != null
          ? Math.max(0, toInt(rawSale.change, 0))
          : Math.max(0, cashReceived - fallbackTotal)
        : null;
    return {
      id: id,
      orderNumber: Math.max(1, toInt(rawSale.orderNumber, 1)),
      createdAt: createdAt,
      lines: lines,
      note: asText(rawSale.note, '').slice(0, 500),
      subtotal: subtotal,
      discountType: discountType,
      discountMode: discountMode,
      discountValue: discountValue,
      discountBase: Math.max(0, toInt(rawSale.discountBase, 0)),
      discountAmount: discountAmount,
      taxLabel: asText(rawSale.taxLabel, '') || (taxAmount > 0 ? t('tax.defaultLabel') : ''),
      taxPercent: clamp(Number(rawSale.taxPercent) || 0, 0, 100),
      taxAmount: taxAmount,
      total: Math.max(0, toInt(rawSale.total, fallbackTotal)),
      method: method,
      cashReceived: cashReceived,
      change: change
    };
  }

  function normalizeState(rawState) {
    const base = createDefaultState();
    if (!rawState || typeof rawState !== 'object') return base;
    const rawSettings =
      rawState.settings && typeof rawState.settings === 'object' ? rawState.settings : {};
    const settings = base.settings;
    if (typeof rawSettings.restaurantName === 'string') settings.restaurantName = rawSettings.restaurantName;
    settings.logoImageId = asId(rawSettings.logoImageId);
    settings.qrisImageId = asId(rawSettings.qrisImageId);
    settings.taxEnabled = Boolean(rawSettings.taxEnabled);
    settings.taxLabel = asText(rawSettings.taxLabel, '');
    settings.taxPercent = clamp(Number(rawSettings.taxPercent) || 0, 0, 100);
    settings.discounts = normalizeDiscountSettings(rawSettings.discounts);
    settings.lang = window.AppI18n.hasLanguage(rawSettings.lang)
      ? rawSettings.lang
      : window.AppI18n.defaultLanguage;
    settings.pinHash = asId(rawSettings.pinHash);
    settings.pinSalt = asId(rawSettings.pinSalt);
    settings.pinAlgo = asId(rawSettings.pinAlgo);
    if (!settings.pinHash || !settings.pinSalt) {
      settings.pinHash = null;
      settings.pinSalt = null;
      settings.pinAlgo = null;
    }

    const categories = normalizeCategories(rawState.categories);
    const menu = [];
    const usedMenuIds = new Set();
    (Array.isArray(rawState.menu) ? rawState.menu : []).forEach(function (rawItem) {
      if (!rawItem || typeof rawItem !== 'object') return;
      const name = asText(rawItem.name, '').trim();
      if (!name) return;
      let id = asId(rawItem.id) || uid('menu');
      while (usedMenuIds.has(id)) id = uid('menu');
      usedMenuIds.add(id);
      const categoryId = categories.some(function (category) {
        return category.id === rawItem.categoryId;
      })
        ? rawItem.categoryId
        : 'other';
      menu.push({
        id: id,
        name: name,
        price: Math.max(0, toInt(rawItem.price, 0)),
        categoryId: categoryId,
        imageId: asId(rawItem.imageId),
        addons: normalizeAddons(rawItem.addons),
        soldOut: Boolean(rawItem.soldOut),
        createdAt:
          typeof rawItem.createdAt === 'string' && !Number.isNaN(new Date(rawItem.createdAt).getTime())
            ? rawItem.createdAt
            : new Date().toISOString()
      });
    });

    const sales = (Array.isArray(rawState.sales) ? rawState.sales : [])
      .map(normalizeSale)
      .filter(Boolean)
      .sort(function (a, b) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    const maxOrderNumber = sales.reduce(function (max, sale) {
      return Math.max(max, sale.orderNumber);
    }, 0);
    const nextOrderNumber = Math.max(
      maxOrderNumber + 1,
      Math.max(1, toInt(rawState.nextOrderNumber, 1))
    );
    const draft = normalizeDraft(rawState.draft, menu);
    if (draft.discountType) {
      const discountConfig = settings.discounts[draft.discountType];
      if (!discountConfig || !discountConfig.enabled || discountConfig.value <= 0) {
        draft.discountType = null;
      }
    }

    return {
      app: APP_ID,
      schemaVersion: SCHEMA_VERSION,
      settings: settings,
      categories: categories,
      menu: menu,
      sales: sales,
      draft: draft,
      nextOrderNumber: nextOrderNumber,
      createdAt: typeof rawState.createdAt === 'string' ? rawState.createdAt : base.createdAt
    };
  }

  // ---------- Images ----------

  function revokeImageUrls() {
    imageUrls.forEach(function (url) {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        /* noop */
      }
    });
    imageUrls.clear();
  }

  function imageUrl(id) {
    return id ? imageUrls.get(id) || '' : '';
  }

  async function rebuildImageUrls(records) {
    revokeImageUrls();
    (records || []).forEach(function (record) {
      if (!record || !record.id || !(record.blob instanceof Blob)) return;
      imageUrls.set(record.id, URL.createObjectURL(record.blob));
    });
  }

  async function loadImagesFromDb() {
    const records = await window.AppDB.getAllImages();
    await rebuildImageUrls(records);
  }

  async function addImageBlob(blob, name) {
    const id = uid('img');
    const record = {
      id: id,
      blob: blob,
      mime: blob.type || 'image/jpeg',
      name: asText(name, ''),
      createdAt: new Date().toISOString()
    };
    await window.AppDB.putImage(record);
    imageUrls.set(id, URL.createObjectURL(blob));
    return record;
  }

  async function deleteImageId(id) {
    if (!id) return;
    await window.AppDB.deleteImage(id);
    const url = imageUrls.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      imageUrls.delete(id);
    }
  }

  function isPngOrJpeg(file) {
    const type = (file.type || '').toLowerCase();
    if (type === 'image/png' || type === 'image/jpeg' || type === 'image/jpg') return true;
    const name = (file.name || '').toLowerCase();
    return /\.(png|jpe?g)$/.test(name);
  }

  function loadImageElement(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = function () {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Gambar tidak bisa dibaca.'));
      };
      image.src = url;
    });
  }

  function canvasBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(
        function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('Gambar tidak bisa diproses.'));
        },
        type,
        quality
      );
    });
  }

  async function resizeImage(file, maxSide, outputType) {
    const image = await loadImageElement(file);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) throw new Error('Ukuran gambar tidak valid.');
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas tidak tersedia.');
    if (outputType === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, targetWidth, targetHeight);
    }
    context.drawImage(image, 0, 0, targetWidth, targetHeight);
    return canvasBlob(canvas, outputType, outputType === 'image/jpeg' ? 0.84 : undefined);
  }

  async function prepareMenuPhoto(file) {
    if (!file) throw new Error(t('item.photoError'));
    if (!isPngOrJpeg(file)) throw new Error(t('item.photoError'));
    if (file.size > MAX_ITEM_PHOTO_BYTES) throw new Error(t('item.photoTooLarge'));
    return resizeImage(file, 1400, 'image/jpeg');
  }

  async function prepareLogo(file) {
    if (!file) throw new Error(t('settings.imageBadType'));
    if (!isPngOrJpeg(file)) throw new Error(t('settings.imageBadType'));
    if (file.size > MAX_LOGO_BYTES) {
      throw new Error(t('settings.imageTooLarge', { size: 5 }));
    }
    return resizeImage(file, 640, 'image/png');
  }

  function prepareQris(file) {
    if (!file) throw new Error(t('settings.imageBadType'));
    if (!isPngOrJpeg(file)) throw new Error(t('settings.imageBadType'));
    if (file.size > MAX_QRIS_BYTES) {
      throw new Error(t('settings.imageTooLarge', { size: 8 }));
    }
    // QRIS disimpan tanpa dikompres agar kode tetap tajam saat dipindai.
    return Promise.resolve(file);
  }

  // ---------- Toast and announcements ----------

  function announce(message) {
    const live = $('#live-region');
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () {
      live.textContent = message;
    }, 20);
  }

  function showToast(message, type, duration) {
    const region = $('#toast-region');
    if (!region) return;
    if (toastTimer) clearTimeout(toastTimer);
    region.innerHTML =
      '<div class="toast toast-' +
      escapeHTML(type || 'success') +
      '" role="status">' +
      (type === 'error' ? icon('alert') : icon('checkCircle')) +
      '<span>' +
      escapeHTML(message) +
      '</span>' +
      '</div>';
    region.hidden = false;
    toastTimer = setTimeout(function () {
      region.hidden = true;
      region.innerHTML = '';
    }, duration || 4200);
  }

  // ---------- Draft operations ----------

  function draftLineById(lineId) {
    return state.draft.lines.find(function (line) {
      return line.id === lineId;
    }) || null;
  }

  function addItemToOrder(menuId, selectedAddons) {
    const item = getMenuItem(menuId);
    if (!item || item.soldOut) return;
    const selectedIds = new Set(
      (Array.isArray(selectedAddons) ? selectedAddons : []).map(function (addon) {
        return addon.id;
      })
    );
    const addons = (item.addons || [])
      .filter(function (addon) {
        return selectedIds.has(addon.id);
      })
      .map(function (addon) {
        return { id: addon.id, name: addon.name, price: addon.price };
      });
    const signature = addonSignature(addons);
    let line = state.draft.lines.find(function (candidate) {
      return candidate.menuId === menuId && addonSignature(candidate.addons) === signature;
    });
    if (line) {
      line.qty = parseQuantity(line.qty + 1, 1);
    } else {
      state.draft.lines.push({
        id: uid('line'),
        menuId: item.id,
        name: item.name,
        categoryId: item.categoryId,
        basePrice: item.price,
        addons: addons,
        price: unitPriceWithAddons(item.price, addons),
        qty: 1
      });
    }
    if (state.draft.lines.length === 1) {
      state.draft.startedAt = new Date().toISOString();
    }
    saveSoon(90);
    refreshCartUI();
    announce(
      t('a11y.itemAdded', {
        name: item.name,
        total: money(calculateTotals().total)
      })
    );
  }

  function setLineQuantity(lineId, nextQuantity, focusKey) {
    const line = draftLineById(lineId);
    if (!line) return;
    line.qty = parseQuantity(nextQuantity, 1);
    saveSoon(90);
    refreshCartUI(focusKey || null);
  }

  function removeLine(lineId) {
    const line = draftLineById(lineId);
    if (!line) return;
    state.draft.lines = state.draft.lines.filter(function (candidate) {
      return candidate.id !== lineId;
    });
    if (state.draft.discountType && foodSubtotal(state.draft.lines) <= 0) {
      state.draft.discountType = null;
    }
    saveSoon(90);
    refreshCartUI();
    announce(t('a11y.itemRemoved', { name: line.name }));
    if (!state.draft.lines.length && ui.view === 'review') {
      ui.view = 'order';
      renderApp();
    }
  }

  function updateDraftNote(note) {
    state.draft.note = asText(note, '').slice(0, 500);
    saveSoon(220);
  }

  async function clearDraftAndRefresh() {
    state.draft = emptyDraft();
    try {
      await saveNow();
    } catch (error) {
      /* pesan sudah ditampilkan */
    }
    if (ui.view === 'review') ui.view = 'order';
    renderApp();
    announce(t('order.cleared'));
    showToast(t('order.cleared'));
  }

  // ---------- Header, navigation, and shared shell ----------

  const NAV_ITEMS = [
    { view: 'order', key: 'nav.order', icon: 'register' },
    { view: 'menu', key: 'nav.menu', icon: 'book' },
    { view: 'history', key: 'nav.history', icon: 'chart' },
    { view: 'settings', key: 'nav.settings', icon: 'settings' }
  ];

  function navKeyForView(view) {
    if (view === 'review' || view === 'payment' || view === 'success') return 'order';
    return view;
  }

  function renderBrandMark() {
    const logo = imageUrl(state.settings.logoImageId);
    if (logo) {
      return (
        '<span class="brand-mark has-image">' +
        '<img src="' + escapeHTML(logo) + '" alt="" width="56" height="56">' +
        '</span>'
      );
    }
    return '<span class="brand-mark" aria-hidden="true">' + icon('bowl') + '</span>';
  }

  function navMarkup(mobile) {
    const current = navKeyForView(ui.view);
    return NAV_ITEMS.map(function (item) {
      const active = current === item.view;
      return (
        '<button type="button" class="nav-btn' +
        (mobile ? ' nav-btn-mobile' : '') +
        '" data-action="nav" data-view="' +
        item.view +
        '"' +
        (active ? ' aria-current="page"' : '') +
        '>' +
        icon(item.icon) +
        '<span class="nav-label">' +
        escapeHTML(t(item.key)) +
        '</span>' +
        '</button>'
      );
    }).join('');
  }

  function renderChrome() {
    const header = $('#app-header');
    const bottom = $('#bottom-nav');
    if (header) {
      header.innerHTML =
        '<div class="header-inner">' +
        '<button type="button" class="brand" data-action="nav" data-view="order">' +
        renderBrandMark() +
        '<span class="brand-text">' +
        '<span class="brand-name">' + escapeHTML(brandName()) + '</span>' +
        '<span class="brand-tagline">' + escapeHTML(t('common.tagline')) + '</span>' +
        '</span>' +
        '</button>' +
        '<nav class="desktop-nav" aria-label="' + escapeHTML(t('nav.aria')) + '">' +
        navMarkup(false) +
        '</nav>' +
        '</div>';
    }
    if (bottom) {
      bottom.innerHTML = navMarkup(true);
      bottom.setAttribute('aria-label', t('nav.aria'));
    }
    const skipLink = $('#skip-link');
    if (skipLink) skipLink.textContent = t('common.skipToContent');
    document.documentElement.lang = uiLanguage();
    document.body.dataset.view = ui.view;
    const titleMap = {
      order: t('order.pageTitle'),
      review: t('review.pageTitle'),
      payment: t('pay.pageTitle'),
      success: t('success.title'),
      menu: t('menu.pageTitle'),
      history: t('history.pageTitle'),
      settings: t('settings.pageTitle')
    };
    document.title = brandName() + ' — ' + (titleMap[ui.view] || t('common.appName'));
    syncMobileCartSpace();
  }

  function syncMobileCartSpace() {
    document.body.classList.toggle(
      'has-mobile-cart',
      ui.view === 'order' && state && state.draft.lines.length > 0
    );
  }

  function showToastStorageFailure(error) {
    console.error(error);
  }

  // ---------- Shared page pieces ----------

  function stepPageHeader(stepNumber, title, subtitle) {
    return (
      '<header class="page-heading">' +
      '<div class="page-heading-main">' +
      '<p class="step-caption">' + escapeHTML(t('common.step', { number: stepNumber })) + '</p>' +
      '<h1>' + escapeHTML(title) + '</h1>' +
      '<p class="page-subtitle">' + escapeHTML(subtitle) + '</p>' +
      '</div>' +
      '</header>'
    );
  }

  function adminPageHeader(title, subtitle, actionHtml) {
    return (
      '<header class="page-heading">' +
      '<div class="page-heading-main">' +
      '<h1>' + escapeHTML(title) + '</h1>' +
      '<p class="page-subtitle">' + escapeHTML(subtitle) + '</p>' +
      '<div class="save-status-row">' + renderSaveStatus() + '</div>' +
      '</div>' +
      (actionHtml ? '<div class="page-heading-action">' + actionHtml + '</div>' : '') +
      '</header>'
    );
  }

  function totalsHTML(totals, options) {
    const settings = options || {};
    return (
      '<div class="totals">' +
      '<div class="totals-row"><span>' + escapeHTML(t('order.subtotal')) + '</span><span>' +
      escapeHTML(money(totals.subtotal)) + '</span></div>' +
      (totals.discountAmount > 0
        ? '<div class="totals-row totals-discount"><span>' +
          escapeHTML(discountLineLabel(totals)) + '</span><span>-' +
          escapeHTML(money(totals.discountAmount)) + '</span></div>'
        : '') +
      (totals.taxAmount > 0
        ? '<div class="totals-row"><span>' +
          escapeHTML(t('pay.taxLine', { label: totals.taxLabel, percent: formatPercent(totals.taxPercent) })) +
          '</span><span>' + escapeHTML(money(totals.taxAmount)) + '</span></div>'
        : '') +
      '<div class="totals-row totals-total"><span>' + escapeHTML(t('order.total')) +
      '</span><strong>' + escapeHTML(money(totals.total)) + '</strong></div>' +
      (settings.showPaymentLabel
        ? '<p class="totals-caption">' + escapeHTML(t('order.totalPayment')) + '</p>'
        : '') +
      '</div>'
    );
  }

  function itemPhotoHTML(item, className) {
    const url = imageUrl(item.imageId);
    if (url) {
      return (
        '<img class="' + className + '" src="' + escapeHTML(url) + '" alt="' +
        escapeHTML(t('menu.photoAlt', { name: item.name })) + '" loading="lazy" decoding="async">'
      );
    }
    return (
      '<span class="' + className + ' photo-placeholder" aria-hidden="true">' +
      icon('bowl') +
      '</span>'
    );
  }

  function cartLineHTML(line, options) {
    const opts = options || {};
    const perItem = money(line.price);
    const subtotal = money(line.price * line.qty);
    const lineId = line.id;
    const qtyKey = 'qty:' + lineId;
    const addonNames = (line.addons || [])
      .map(function (addon) {
        return addon.name;
      })
      .join(', ');
    const lineAriaName = addonNames ? line.name + ' (' + addonNames + ')' : line.name;
    const addonsHtml =
      line.addons && line.addons.length
        ? '<p class="cart-line-addons">' +
          '<span class="cart-line-addons-label">' + escapeHTML(t('order.addonPrefix')) + '</span> ' +
          escapeHTML(addonBreakdownText(line.addons)) +
          '</p>'
        : '';
    return (
      '<article class="cart-line" data-line-id="' + escapeHTML(lineId) + '">' +
      '<div class="cart-line-top">' +
      '<div class="cart-line-title">' +
      '<h3 class="cart-line-name">' + escapeHTML(line.name) + '</h3>' +
      '<p class="cart-line-unit">' + escapeHTML(perItem + ' ' + t('order.perItem')) + '</p>' +
      addonsHtml +
      '</div>' +
      '<p class="cart-line-subtotal">' + escapeHTML(subtotal) + '</p>' +
      '</div>' +
      '<div class="cart-line-controls">' +
      '<div class="qty-control" role="group" aria-label="' +
      escapeHTML(t('order.qtyAria', { name: lineAriaName })) + '">' +
      '<button type="button" class="qty-btn" data-action="qty-minus" data-id="' +
      escapeHTML(lineId) + '" data-focus-key="minus:' + escapeHTML(lineId) + '"' +
      (line.qty <= 1 ? ' disabled' : '') +
      ' aria-label="' + escapeHTML(t('order.decreaseAria', { name: lineAriaName })) + '">' +
      icon('minus') +
      '</button>' +
      '<input class="qty-input" type="text" inputmode="numeric" pattern="[0-9]*" value="' +
      escapeHTML(line.qty) + '" data-action="qty-input" data-id="' + escapeHTML(lineId) +
      '" data-focus-key="' + escapeHTML(qtyKey) + '" aria-label="' +
      escapeHTML(t('order.qtyAria', { name: lineAriaName })) + '">' +
      '<button type="button" class="qty-btn" data-action="qty-plus" data-id="' +
      escapeHTML(lineId) + '" data-focus-key="plus:' + escapeHTML(lineId) +
      '" aria-label="' + escapeHTML(t('order.increaseAria', { name: lineAriaName })) + '">' +
      icon('plus') +
      '</button>' +
      '</div>' +
      '<button type="button" class="btn btn-ghost-danger btn-small" data-action="remove-line" data-id="' +
      escapeHTML(lineId) + '" data-focus-key="remove:' + escapeHTML(lineId) +
      '" aria-label="' + escapeHTML(t('order.removeAria', { name: lineAriaName })) + '">' +
      icon('trash') +
      '<span>' + escapeHTML(t('common.delete')) + '</span>' +
      '</button>' +
      '</div>' +
      '</article>'
    );
  }

  function noteFieldHTML(note) {
    return (
      '<div class="form-field note-field">' +
      '<label for="order-note">' + escapeHTML(t('order.noteLabel')) + '</label>' +
      '<textarea id="order-note" rows="2" maxlength="500" data-note="1" placeholder="' +
      escapeHTML(t('order.notePlaceholder')) + '">' + escapeHTML(note || '') + '</textarea>' +
      '<p class="field-hint">' + escapeHTML(t('order.savedHint')) + '</p>' +
      '</div>'
    );
  }

  function orderPanelInnerHTML() {
    const lines = state.draft.lines;
    const totals = calculateTotals();
    const count = draftCount();
    let content;
    if (!lines.length) {
      content =
        '<div class="panel-empty">' +
        '<div class="empty-symbol" aria-hidden="true">' + icon('bag') + '</div>' +
        '<h3>' + escapeHTML(t('order.emptyTitle')) + '</h3>' +
        '<p>' + escapeHTML(t('order.emptyText')) + '</p>' +
        '</div>';
    } else {
      content =
        '<div class="cart-lines">' +
        lines.map(function (line) {
          return cartLineHTML(line);
        }).join('') +
        '</div>' +
        noteFieldHTML(state.draft.note);
    }

    return (
      '<div class="order-panel-head">' +
      '<div>' +
      '<p class="panel-eyebrow">' + escapeHTML(t('common.step', { number: 2 })) + '</p>' +
      '<h2>' + escapeHTML(t('order.panelTitle')) + '</h2>' +
      '</div>' +
      '<span class="count-badge">' + escapeHTML(itemCountLabel(count)) + '</span>' +
      '</div>' +
      '<div class="order-panel-scroll">' + content + '</div>' +
      '<div class="order-panel-foot">' +
      totalsHTML(totals) +
      '<div class="panel-actions">' +
      '<button type="button" class="btn btn-ghost-danger btn-wide" data-action="clear-order"' +
      (!lines.length ? ' disabled' : '') + '>' + icon('trash') +
      '<span>' + escapeHTML(t('order.clear')) + '</span></button>' +
      '<button type="button" class="btn btn-primary btn-wide btn-large" data-action="go-payment"' +
      (!lines.length ? ' disabled' : '') + '>' + icon('arrowRight') +
      '<span>' + escapeHTML(t('order.toPayment')) + '</span></button>' +
      '</div>' +
      '</div>'
    );
  }

  function mobileCartHTML() {
    const count = draftCount();
    const total = calculateTotals().total;
    return (
      '<div class="mobile-cart-info">' +
      '<span class="mobile-cart-label">' + escapeHTML(t('order.total')) + ' · ' +
      escapeHTML(itemCountLabel(count)) + '</span>' +
      '<strong class="mobile-cart-total">' + escapeHTML(money(total)) + '</strong>' +
      '</div>' +
      '<button type="button" class="btn btn-primary btn-large" data-action="review-order">' +
      icon('arrowRight') +
      '<span>' + escapeHTML(t('order.lookOrder')) + '</span>' +
      '</button>'
    );
  }

  function menuCardHTML(item) {
    const soldOut = item.soldOut;
    const category = categoryById(item.categoryId);
    return (
      '<button type="button" class="menu-card' + (soldOut ? ' is-sold-out' : '') +
      '" data-action="add-item" data-id="' + escapeHTML(item.id) + '"' +
      (soldOut ? ' disabled' : '') +
      '>' +
      '<span class="menu-photo">' + itemPhotoHTML(item, 'menu-photo-img') + '</span>' +
      '<span class="menu-card-body">' +
      '<span class="menu-card-top">' +
      '<span class="menu-name">' + escapeHTML(item.name) + '</span>' +
      (soldOut
        ? '<span class="status-badge is-sold-out">' + icon('x') + escapeHTML(t('order.soldOut')) + '</span>'
        : '<span class="menu-category-text">' + escapeHTML(category ? categoryLabel(category) : '') + '</span>') +
      '</span>' +
      '<span class="menu-price">' + escapeHTML(money(item.price)) + '</span>' +
      (item.addons && item.addons.length
        ? '<span class="menu-addon-hint">' + icon('plus') +
          escapeHTML(t('order.addonsAvailable', { count: item.addons.length })) + '</span>'
        : '') +
      '<span class="menu-card-action">' +
      (soldOut
        ? '<span class="sold-out-note">' + icon('lock') + escapeHTML(t('order.soldOutNote')) + '</span>'
        : '<span class="add-label">' + icon('plus') +
          escapeHTML(item.addons && item.addons.length ? t('order.chooseAddons') : t('order.add')) +
          '</span>') +
      '</span>' +
      '</span>' +
      '</button>'
    );
  }

  function normalizeSearch(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function menuGroupsForDisplay() {
    const query = normalizeSearch(ui.search);
    const result = [];
    state.categories.forEach(function (category) {
      const items = state.menu.filter(function (item) {
        if (item.categoryId !== category.id) return false;
        if (!query) return true;
        return normalizeSearch(item.name).includes(query);
      });
      if (items.length) result.push({ category: category, items: items });
    });
    return result;
  }

  function availableCategories() {
    const used = new Set(
      state.menu.map(function (item) {
        return item.categoryId;
      })
    );
    return state.categories.filter(function (category) {
      return used.has(category.id);
    });
  }

  function menuFiltersHTML() {
    const categories = availableCategories();
    let html =
      '<div class="filter-row" role="group" aria-label="' + escapeHTML(t('order.categoryLabel')) + '">' +
      '<button type="button" class="filter-chip" data-action="jump-category" data-category="all"' +
      (ui.category === 'all' ? ' aria-current="true"' : '') + '>' +
      escapeHTML(t('order.allCategories')) + '</button>';
    categories.forEach(function (category) {
      html +=
        '<button type="button" class="filter-chip" data-action="jump-category" data-category="' +
        escapeHTML(category.id) + '"' +
        (ui.category === category.id ? ' aria-current="true"' : '') + '>' +
        escapeHTML(categoryLabel(category)) +
        '</button>';
    });
    html += '</div>';
    return html;
  }

  function clearMenuSearch() {
    if (!ui.search) return false;
    ui.search = '';
    const input = $('#menu-search');
    if (input) input.value = '';
    const clearButton = $('.search-clear');
    if (clearButton) clearButton.hidden = true;
    return true;
  }

  function setActiveCategoryChip(categoryId) {
    $$('.filter-chip').forEach(function (chip) {
      if (chip.dataset.category === categoryId) chip.setAttribute('aria-current', 'true');
      else chip.removeAttribute('aria-current');
    });
  }

  function jumpToMenuCategory(categoryId) {
    const targetCategory = categoryId || 'all';
    ui.category = targetCategory;
    setActiveCategoryChip(targetCategory);
    if (clearMenuSearch()) renderCatalogOnly();
    const target =
      targetCategory === 'all'
        ? $('.menu-toolbar')
        : document.getElementById('category-' + targetCategory);
    if (target) {
      target.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
    announce(
      t('a11y.categoryJump', {
        name:
          targetCategory === 'all'
            ? t('order.allCategories')
            : categoryLabel(categoryById(targetCategory))
      })
    );
  }

  function menuCatalogHTML() {
    if (!state.menu.length) {
      return (
        '<div class="empty-state">' +
        '<div class="empty-symbol" aria-hidden="true">' + icon('book') + '</div>' +
        '<h2>' + escapeHTML(t('order.emptyMenuTitle')) + '</h2>' +
        '<p>' + escapeHTML(t('order.emptyMenuText')) + '</p>' +
        '<button type="button" class="btn btn-primary btn-large" data-action="nav" data-view="menu">' +
        icon('plus') + '<span>' + escapeHTML(t('order.openMenu')) + '</span></button>' +
        '</div>'
      );
    }

    const groups = menuGroupsForDisplay();
    if (!groups.length) {
      return (
        '<div class="empty-state compact">' +
        '<div class="empty-symbol" aria-hidden="true">' + icon('search') + '</div>' +
        '<h2>' + escapeHTML(t('order.noResultsTitle')) + '</h2>' +
        '<p>' + escapeHTML(t('order.noResultsText')) + '</p>' +
        '</div>'
      );
    }

    return groups.map(function (group) {
      return (
        '<section class="menu-group" aria-labelledby="category-' + escapeHTML(group.category.id) + '">' +
        '<div class="menu-group-heading">' +
        '<h2 id="category-' + escapeHTML(group.category.id) + '">' + escapeHTML(categoryLabel(group.category)) + '</h2>' +
        '<span class="menu-group-count">' + escapeHTML(t('order.groupCount', { count: group.items.length })) + '</span>' +
        '</div>' +
        '<div class="menu-grid">' + group.items.map(menuCardHTML).join('') + '</div>' +
        '</section>'
      );
    }).join('');
  }

  function renderOrderView() {
    const categories = availableCategories();
    if (ui.category !== 'all' && !categories.some(function (category) { return category.id === ui.category; })) {
      ui.category = 'all';
    }
    return (
      stepPageHeader(1, t('order.pageTitle'), t('order.pageSubtitle')) +
      '<div class="order-layout">' +
      '<section class="menu-pane" aria-label="' + escapeHTML(t('nav.menu')) + '">' +
      '<div class="menu-toolbar">' +
      '<div class="search-wrap">' +
      '<span class="search-icon" aria-hidden="true">' + icon('search') + '</span>' +
      '<label class="sr-only" for="menu-search">' + escapeHTML(t('order.searchLabel')) + '</label>' +
      '<input id="menu-search" class="search-input" type="search" autocomplete="off" value="' +
      escapeHTML(ui.search) + '" placeholder="' + escapeHTML(t('order.searchPlaceholder')) + '">' +
      '<button type="button" class="search-clear" data-action="clear-search" aria-label="' +
      escapeHTML(t('order.clearSearch')) + '"' + (ui.search ? '' : ' hidden') + '>' + icon('x') + '</button>' +
      '</div>' +
      menuFiltersHTML() +
      '</div>' +
      '<div id="menu-catalog" class="menu-catalog">' + menuCatalogHTML() + '</div>' +
      '</section>' +
      '<aside id="order-panel" class="order-panel" aria-label="' +
      escapeHTML(t('a11y.orderSummary')) + '">' + orderPanelInnerHTML() + '</aside>' +
      '</div>' +
      '<div id="mobile-cart" class="mobile-cart"' + (state.draft.lines.length ? '' : ' hidden') + '>' +
      mobileCartHTML() +
      '</div>'
    );
  }

  function reviewMainHTML() {
    const lines = state.draft.lines;
    return (
      '<div class="review-layout">' +
      '<section class="card review-order-card" aria-labelledby="review-items-title">' +
      '<div class="section-heading">' +
      '<h2 id="review-items-title">' + escapeHTML(t('order.panelTitle')) + '</h2>' +
      '<span class="count-badge">' + escapeHTML(itemCountLabel(draftCount())) + '</span>' +
      '</div>' +
      '<div class="cart-lines">' + lines.map(function (line) { return cartLineHTML(line); }).join('') + '</div>' +
      '</section>' +
      '<aside class="card review-summary-card">' +
      noteFieldHTML(state.draft.note) +
      totalsHTML(calculateTotals(), { showPaymentLabel: true }) +
      '<div class="panel-actions">' +
      '<button type="button" class="btn btn-primary btn-wide btn-large" data-action="go-payment">' +
      icon('arrowRight') + '<span>' + escapeHTML(t('review.payment')) + '</span></button>' +
      '<button type="button" class="btn btn-secondary btn-wide" data-action="back-to-menu">' +
      icon('arrowLeft') + '<span>' + escapeHTML(t('review.addMore')) + '</span></button>' +
      '<button type="button" class="btn btn-ghost-danger btn-wide" data-action="clear-order">' +
      icon('trash') + '<span>' + escapeHTML(t('order.clear')) + '</span></button>' +
      '</div>' +
      '</aside>' +
      '</div>'
    );
  }

  function renderReviewView() {
    if (!state.draft.lines.length) {
      return (
        stepPageHeader(2, t('review.pageTitle'), t('review.pageSubtitle')) +
        '<div class="empty-state">' +
        '<div class="empty-symbol" aria-hidden="true">' + icon('bag') + '</div>' +
        '<h2>' + escapeHTML(t('order.emptyTitle')) + '</h2>' +
        '<p>' + escapeHTML(t('review.emptyRedirect')) + '</p>' +
        '<button type="button" class="btn btn-primary btn-large" data-action="back-to-menu">' +
        icon('arrowLeft') + '<span>' + escapeHTML(t('common.back')) + '</span></button>' +
        '</div>'
      );
    }
    return (
      stepPageHeader(2, t('review.pageTitle'), t('review.pageSubtitle')) +
      reviewMainHTML()
    );
  }

  // ---------- App renderer ----------

  const STEP_VIEWS = {
    order: 1,
    review: 2,
    payment: 3,
    success: 3
  };

  function renderApp(options) {
    if (!state) return;
    const opts = options || {};
    renderChrome();
    const main = $('#app');
    if (!main) return;
    let body = '';
    if (ui.view === 'order') body = renderOrderView();
    else if (ui.view === 'review') body = renderReviewView();
    else if (ui.view === 'payment') body = renderPaymentView();
    else if (ui.view === 'success') body = renderSuccessView();
    else if (ui.view === 'menu') body = renderMenuView();
    else if (ui.view === 'history') body = renderHistoryView();
    else if (ui.view === 'settings') body = renderSettingsView();
    else body = renderOrderView();
    const activeStep = STEP_VIEWS[ui.view] || 0;
    const steps = activeStep ? buildStepIndicator(activeStep, ui.view === 'success') : '';
    main.innerHTML =
      steps +
      '<div class="view-content view-' + escapeHTML(ui.view) + '">' + body + '</div>';
    syncMobileCartSpace();
    if (opts.focusKey) restoreFocus(opts.focusKey);
  }

  function captureFocusKey() {
    const active = document.activeElement;
    if (active && active.dataset && active.dataset.focusKey) return active.dataset.focusKey;
    return null;
  }

  function restoreFocus(key) {
    if (!key) return;
    const candidates = $$('[data-focus-key]').filter(function (element) {
      return element.dataset.focusKey === key && !element.disabled && element.offsetParent !== null;
    });
    if (candidates.length) candidates[0].focus();
  }

  function refreshCartUI(focusKey) {
    syncMobileCartSpace();
    if (ui.view === 'order') {
      const panel = $('#order-panel');
      if (panel) panel.innerHTML = orderPanelInnerHTML();
      const mobileCart = $('#mobile-cart');
      if (mobileCart) {
        mobileCart.innerHTML = mobileCartHTML();
        mobileCart.hidden = !state.draft.lines.length;
      }
      if (focusKey) restoreFocus(focusKey);
      if (!state.draft.lines.length) {
        // keep the visible placeholder in sync, no navigation needed
      }
    } else if (ui.view === 'review') {
      if (!state.draft.lines.length) {
        ui.view = 'order';
        renderApp();
      } else {
        renderApp({ focusKey: focusKey });
      }
    }
  }

  function renderCatalogOnly() {
    const catalog = $('#menu-catalog');
    if (catalog) catalog.innerHTML = menuCatalogHTML();
  }

  // ---------- Payment ----------

  function billLinesHTML() {
    return state.draft.lines.map(function (line) {
      return (
        '<div class="bill-row">' +
        '<div class="bill-row-main">' +
        '<span class="bill-name">' + escapeHTML(line.name) + '</span>' +
        (line.addons && line.addons.length
          ? '<span class="bill-addons">' + escapeHTML(t('order.addonPrefix')) + ' ' +
            escapeHTML(addonBreakdownText(line.addons)) + '</span>'
          : '') +
        '<span class="bill-equation">' + escapeHTML(String(line.qty)) + ' × ' + escapeHTML(money(line.price)) + '</span>' +
        '</div>' +
        '<strong class="bill-subtotal">' + escapeHTML(money(line.price * line.qty)) + '</strong>' +
        '</div>'
      );
    }).join('');
  }

  function paymentBillHTML() {
    const totals = calculateTotals();
    return (
      '<section class="card payment-bill" aria-labelledby="payment-bill-title">' +
      '<div class="section-heading">' +
      '<h2 id="payment-bill-title">' + escapeHTML(t('pay.summaryTitle')) + '</h2>' +
      '<span class="count-badge">' + escapeHTML(itemCountLabel(draftCount())) + '</span>' +
      '</div>' +
      '<div class="bill-lines">' + billLinesHTML() + '</div>' +
      (state.draft.note.trim()
        ? '<div class="payment-note"><span class="payment-note-label">' + escapeHTML(t('receipt.note')) +
          '</span><span>' + escapeHTML(state.draft.note.trim()) + '</span></div>'
        : '') +
      '<div class="payment-total-block">' +
      '<span class="payment-total-label">' + escapeHTML(t('pay.total')) + '</span>' +
      '<strong class="amount-huge">' + escapeHTML(money(totals.total)) + '</strong>' +
      (totals.discountAmount > 0
        ? '<span class="payment-discount-caption">' + escapeHTML(discountLineLabel(totals)) +
          ' · -' + escapeHTML(money(totals.discountAmount)) + '</span>'
        : '') +
      (totals.taxAmount > 0
        ? '<span class="payment-tax-caption">' + escapeHTML(t('pay.taxLine', {
            label: totals.taxLabel,
            percent: formatPercent(totals.taxPercent)
          })) + ' · ' + escapeHTML(money(totals.taxAmount)) + '</span>'
        : '') +
      '</div>' +
      '</section>'
    );
  }

  function paymentDiscountHTML() {
    const base = foodSubtotal(state.draft.lines);
    const options = DISCOUNT_TYPES.map(function (kind) {
      return discountOptionFor(kind);
    }).filter(function (option) {
      return option.config.enabled && option.config.value > 0;
    });
    let content;
    if (!options.length) {
      content =
        '<p class="payment-discount-note">' + icon('alert') +
        escapeHTML(t('discount.noneActive')) + '</p>';
    } else if (base <= 0) {
      content =
        '<p class="payment-discount-note">' + icon('alert') +
        escapeHTML(t('discount.noFood')) + '</p>';
    } else {
      content =
        '<div class="discount-options" role="group" aria-label="' +
        escapeHTML(t('pay.discountTitle')) + '">' +
        options.map(function (option) {
          const selected =
            state.draft.discountType === option.kind && option.available;
          return (
            '<button type="button" class="discount-option" data-action="toggle-discount" data-discount="' +
            escapeHTML(option.kind) + '" data-focus-key="discount-' + escapeHTML(option.kind) +
            '" aria-pressed="' + (selected ? 'true' : 'false') + '">' +
            '<span class="discount-option-icon" aria-hidden="true">' + icon('tag') + '</span>' +
            '<span class="discount-option-copy">' +
            '<span class="discount-option-name">' + escapeHTML(discountKindLabel(option.kind)) + '</span>' +
            '<span class="discount-option-rule">' + escapeHTML(discountRuleText(option.config)) + '</span>' +
            '</span>' +
            '<span class="discount-option-value">' +
            '<strong>-' + escapeHTML(money(option.amount)) + '</strong>' +
            (selected
              ? '<span class="discount-option-selected">' + icon('check') +
                escapeHTML(t('common.selected')) + '</span>'
              : '') +
            '</span>' +
            '</button>'
          );
        }).join('') +
        '</div>' +
        '<p class="payment-discount-footnote">' +
        escapeHTML(t('discount.paymentFootnote')) + '</p>';
    }
    return (
      '<section class="card payment-discount" aria-labelledby="payment-discount-title">' +
      '<div class="section-heading">' +
      '<h2 id="payment-discount-title">' + escapeHTML(t('pay.discountTitle')) + '</h2>' +
      '<span class="count-badge">' + escapeHTML(t('discount.maxShort')) + '</span>' +
      '</div>' +
      '<p class="payment-discount-hint">' + escapeHTML(t('discount.paymentHint')) + '</p>' +
      content +
      '</section>'
    );
  }

  function cashBreakdownHTML() {
    const total = calculateTotals().total;
    const raw = String(ui.cashRaw || '').replace(/[^0-9]/g, '');
    if (!raw) {
      return (
        '<div class="change-box is-neutral">' +
        '<span class="change-label">' + escapeHTML(t('pay.change')) + '</span>' +
        '<span class="change-hint">' + escapeHTML(t('pay.cashEmptyHint')) + '</span>' +
        '</div>'
      );
    }
    const received = Number(raw);
    if (received < total) {
      return (
        '<div class="change-box is-warning" role="status">' +
        '<span class="change-label">' + icon('alert') + escapeHTML(t('pay.insufficient', {
          amount: money(total - received)
        })) + '</span>' +
        '<span class="change-amount">' + escapeHTML(money(received)) + '</span>' +
        '<span class="change-hint">' + escapeHTML(t('pay.cashReceived')) + '</span>' +
        '</div>'
      );
    }
    const change = received - total;
    return (
      '<div class="change-box is-ready" role="status">' +
      '<span class="change-label">' + escapeHTML(t('pay.change')) + '</span>' +
      '<strong class="change-amount">' + escapeHTML(money(change)) + '</strong>' +
      (change === 0
        ? '<span class="change-hint">' + icon('check') + escapeHTML(t('pay.exactChange')) + '</span>'
        : '<span class="change-hint">' + escapeHTML(t('pay.cashReceived') + ': ' + money(received)) + '</span>') +
      '</div>'
    );
  }

  function cashFormHTML() {
    const total = calculateTotals().total;
    const raw = String(ui.cashRaw || '').replace(/[^0-9]/g, '');
    const received = raw ? Number(raw) : 0;
    const enough = total <= 0 || (raw !== '' && received >= total);
    return (
      '<div class="payment-method-panel" aria-labelledby="cash-title">' +
      '<h3 id="cash-title" class="sr-only">' + escapeHTML(t('pay.cash')) + '</h3>' +
      '<div class="form-field">' +
      '<label for="cash-received">' + escapeHTML(t('pay.cashReceived')) + '</label>' +
      '<div class="cash-input-wrap">' +
      '<span class="cash-prefix" aria-hidden="true">Rp</span>' +
      '<input id="cash-received" class="cash-input" type="text" inputmode="numeric" autocomplete="off" value="' +
      (raw ? escapeHTML(formatNumber(received)) : '') + '" placeholder="' +
      escapeHTML(t('pay.cashPlaceholder')) + '">' +
      '</div>' +
      '</div>' +
      '<div class="quick-cash-block">' +
      '<p class="field-label">' + escapeHTML(t('pay.quick')) + '</p>' +
      '<div class="quick-cash-grid">' +
      QUICK_CASH_AMOUNTS.map(function (amount) {
        return (
          '<button type="button" class="quick-cash-btn" data-action="quick-cash" data-amount="' +
          amount + '">' + escapeHTML(money(amount)) + '</button>'
        );
      }).join('') +
      '<button type="button" class="quick-cash-btn" data-action="exact-cash">' +
      icon('check') + escapeHTML(t('pay.exact')) + '</button>' +
      '</div>' +
      '</div>' +
      '<div data-cash-breakdown>' + cashBreakdownHTML() + '</div>' +
      '<button type="button" class="btn btn-primary btn-wide btn-pay" data-action="pay-cash"' +
      (enough ? '' : ' disabled') + '>' +
      icon('banknote') + '<span>' + escapeHTML(t('pay.payNow')) + '</span></button>' +
      '</div>'
    );
  }

  function qrisFormHTML() {
    const qris = imageUrl(state.settings.qrisImageId);
    const total = calculateTotals().total;
    return (
      '<div class="payment-method-panel qris-panel" aria-labelledby="qris-title">' +
      '<h3 id="qris-title">' + escapeHTML(t('pay.qrisTitle')) + '</h3>' +
      '<div class="qris-total">' +
      '<span>' + escapeHTML(t('pay.total')) + '</span>' +
      '<strong>' + escapeHTML(money(total)) + '</strong>' +
      '</div>' +
      '<div class="qris-image-frame">' +
      '<img src="' + escapeHTML(qris) + '" alt="' +
      escapeHTML(t('pay.qrisAlt', { name: brandName() })) + '">' +
      '</div>' +
      '<p class="qris-instruction">' + escapeHTML(t('pay.qrisInstruction')) + '</p>' +
      '<button type="button" class="btn btn-primary btn-wide btn-pay" data-action="pay-qris">' +
      icon('checkCircle') + '<span>' + escapeHTML(t('pay.received')) + '</span></button>' +
      '</div>'
    );
  }

  function paymentMethodsHTML() {
    const qrisAvailable = Boolean(state.settings.qrisImageId && imageUrl(state.settings.qrisImageId));
    const hasQris = qrisAvailable;
    return (
      '<section class="card payment-methods" aria-labelledby="payment-method-title">' +
      '<div class="section-heading">' +
      '<h2 id="payment-method-title">' + escapeHTML(t('pay.methodTitle')) + '</h2>' +
      '</div>' +
      '<div class="method-grid">' +
      '<button type="button" class="method-btn" data-action="choose-method" data-method="cash" data-focus-key="method-cash" aria-pressed="' +
      (ui.paymentMethod === 'cash' ? 'true' : 'false') + '">' +
      icon('banknote') +
      '<span class="method-name">' + escapeHTML(t('pay.cash')) + '</span>' +
      '<span class="method-hint">' + escapeHTML(t('pay.cashHint')) + '</span>' +
      (ui.paymentMethod === 'cash'
        ? '<span class="method-selected">' + icon('check') + escapeHTML(t('common.selected')) + '</span>'
        : '') +
      '</button>' +
      '<button type="button" class="method-btn" data-action="choose-method" data-method="qris" data-focus-key="method-qris" aria-pressed="' +
      (ui.paymentMethod === 'qris' ? 'true' : 'false') + '"' +
      (!hasQris ? ' disabled' : '') + '>' +
      icon('qr') +
      '<span class="method-name">' + escapeHTML(t('pay.qris')) + '</span>' +
      '<span class="method-hint">' +
      escapeHTML(hasQris ? t('pay.qrisHint') : t('pay.qrisMissingNote')) +
      '</span>' +
      (ui.paymentMethod === 'qris'
        ? '<span class="method-selected">' + icon('check') + escapeHTML(t('common.selected')) + '</span>'
        : '') +
      '</button>' +
      '</div>' +
      (!ui.paymentMethod
        ? '<p class="payment-choose-hint">' + escapeHTML(t('pay.chooseHint')) + '</p>'
        : '') +
      (ui.paymentMethod === 'cash' ? cashFormHTML() : '') +
      (ui.paymentMethod === 'qris' ? qrisFormHTML() : '') +
      (!hasQris
        ? '<div class="inline-notice">' +
          icon('alert') +
          '<div><strong>' + escapeHTML(t('pay.qrisMissingTitle')) + '</strong><p>' +
          escapeHTML(t('pay.qrisMissingText')) + '</p></div>' +
          '</div>'
        : '') +
      '</section>'
    );
  }

  function renderPaymentView() {
    if (!state.draft.lines.length) {
      return (
        stepPageHeader(3, t('pay.pageTitle'), t('pay.pageSubtitle')) +
        '<div class="empty-state">' +
        '<div class="empty-symbol" aria-hidden="true">' + icon('banknote') + '</div>' +
        '<h2>' + escapeHTML(t('pay.noOrder')) + '</h2>' +
        '<button type="button" class="btn btn-primary btn-large" data-action="back-to-menu">' +
        icon('arrowLeft') + '<span>' + escapeHTML(t('common.back')) + '</span></button>' +
        '</div>'
      );
    }
    if (
      ui.paymentMethod === 'qris' &&
      (!state.settings.qrisImageId || !imageUrl(state.settings.qrisImageId))
    ) {
      ui.paymentMethod = null;
    }
    return (
      stepPageHeader(3, t('pay.pageTitle'), t('pay.pageSubtitle')) +
      '<div class="payment-page-grid">' +
      paymentBillHTML() +
      '<div class="payment-side">' +
      paymentDiscountHTML() +
      paymentMethodsHTML() +
      '<button type="button" class="btn btn-secondary btn-wide" data-action="back-to-review">' +
      icon('arrowLeft') + '<span>' + escapeHTML(t('pay.backToReview')) + '</span></button>' +
      '</div>' +
      '</div>'
    );
  }

  function updateCashDisplay() {
    const breakdown = $('[data-cash-breakdown]');
    if (breakdown) breakdown.innerHTML = cashBreakdownHTML();
    const payButton = $('[data-action="pay-cash"]');
    if (payButton) {
      const total = calculateTotals().total;
      const raw = String(ui.cashRaw || '').replace(/[^0-9]/g, '');
      payButton.disabled = total > 0 && (raw === '' || Number(raw) < total);
    }
  }

  function setCashAmount(amount) {
    ui.cashRaw = String(Math.max(0, toInt(amount, 0)));
    const input = $('#cash-received');
    if (input) input.value = formatNumber(Number(ui.cashRaw));
    updateCashDisplay();
  }

  function formatOrderNumber(number) {
    return String(Math.max(1, toInt(number, 1))).padStart(3, '0');
  }

  async function completePayment(method) {
    if (ui.busy || !state.draft.lines.length) return;
    const totals = calculateTotals();
    let cashReceived = null;
    let change = null;

    if (method === 'cash') {
      const raw = String(ui.cashRaw || '').replace(/[^0-9]/g, '');
      cashReceived = raw ? Number(raw) : 0;
      if (cashReceived < totals.total) {
        updateCashDisplay();
        const input = $('#cash-received');
        if (input) input.focus();
        return;
      }
      change = cashReceived - totals.total;
    }
    if (method === 'qris' && (!state.settings.qrisImageId || !imageUrl(state.settings.qrisImageId))) {
      return;
    }

    ui.busy = true;
    const activeButton = $(
      method === 'cash' ? '[data-action="pay-cash"]' : '[data-action="pay-qris"]'
    );
    if (activeButton) {
      activeButton.disabled = true;
      activeButton.innerHTML = icon('receipt') + '<span>' + escapeHTML(t('pay.processing')) + '</span>';
    }
    $$('.method-btn').forEach(function (button) {
      button.disabled = true;
    });

    const orderNumber = state.nextOrderNumber;
    const sale = {
      id: uid('sale'),
      orderNumber: orderNumber,
      createdAt: new Date().toISOString(),
      lines: state.draft.lines.map(function (line) {
        return {
          name: line.name,
          categoryId: line.categoryId || null,
          basePrice: line.basePrice,
          addons: (line.addons || []).map(function (addon) {
            return { id: addon.id, name: addon.name, price: addon.price };
          }),
          price: line.price,
          qty: line.qty,
          subtotal: line.price * line.qty
        };
      }),
      note: state.draft.note.trim(),
      subtotal: totals.subtotal,
      discountType: totals.discountAmount > 0 ? totals.discountType : null,
      discountMode: totals.discountAmount > 0 ? totals.discountMode : null,
      discountValue: totals.discountAmount > 0 ? totals.discountValue : 0,
      discountBase: totals.discountAmount > 0 ? totals.discountBase : 0,
      discountAmount: totals.discountAmount,
      taxLabel: totals.taxAmount > 0 ? totals.taxLabel : '',
      taxPercent: totals.taxAmount > 0 ? totals.taxPercent : 0,
      taxAmount: totals.taxAmount,
      total: totals.total,
      method: method,
      cashReceived: cashReceived,
      change: change
    };
    const previousSales = state.sales;
    const previousNextNumber = state.nextOrderNumber;
    const previousDraft = state.draft;
    state.sales = [sale].concat(state.sales);
    state.nextOrderNumber = orderNumber + 1;
    state.draft = emptyDraft();

    try {
      await saveNow();
    } catch (error) {
      state.sales = previousSales;
      state.nextOrderNumber = previousNextNumber;
      state.draft = previousDraft;
      ui.busy = false;
      showToast(t('pay.savingError'), 'error', 7000);
      renderApp({ focusKey: method === 'cash' ? 'method-cash' : 'method-qris' });
      return;
    }

    ui.busy = false;
    ui.lastSaleId = sale.id;
    ui.paymentMethod = null;
    ui.cashRaw = '';
    ui.view = 'success';
    ui.storageErrorShown = false;
    renderApp();
    window.scrollTo(0, 0);
    announce(t('a11y.paymentComplete', { total: money(sale.total) }));
  }

  // ---------- Success ----------

  function renderSuccessView() {
    const sale = getSale(ui.lastSaleId) || state.sales[0];
    if (!sale) {
      return (
        '<div class="empty-state">' +
        '<div class="empty-symbol" aria-hidden="true">' + icon('receipt') + '</div>' +
        '<h2>' + escapeHTML(t('history.emptyTitle')) + '</h2>' +
        '<button type="button" class="btn btn-primary btn-large" data-action="new-order">' +
        icon('plus') + '<span>' + escapeHTML(t('success.newOrder')) + '</span></button>' +
        '</div>'
      );
    }
    return (
      '<section class="success-card">' +
      '<div class="success-symbol" aria-hidden="true">' + icon('checkCircle') + '</div>' +
      '<p class="step-caption">' + escapeHTML(t('success.step')) + '</p>' +
      '<h1>' + escapeHTML(t('success.title')) + '</h1>' +
      '<p class="page-subtitle">' + escapeHTML(t('success.subtitle')) + '</p>' +
      '<div class="order-number-line">' +
      escapeHTML(t('history.orderNumber', { number: formatOrderNumber(sale.orderNumber) })) +
      '</div>' +
      '<div class="success-total">' +
      '<span>' + escapeHTML(t('success.totalPaid')) + '</span>' +
      '<strong class="amount-huge">' + escapeHTML(money(sale.total)) + '</strong>' +
      '</div>' +
      '<dl class="success-details">' +
      '<div><dt>' + escapeHTML(t('success.method')) + '</dt><dd>' +
      (sale.method === 'qris' ? escapeHTML(t('pay.qrisShort')) : escapeHTML(t('pay.cashShort'))) +
      '</dd></div>' +
      (sale.discountAmount > 0
        ? '<div><dt>' + escapeHTML(discountLineLabel(sale)) + '</dt><dd>-' +
          escapeHTML(money(sale.discountAmount)) + '</dd></div>'
        : '') +
      (sale.method === 'cash'
        ? '<div><dt>' + escapeHTML(t('success.cashReceived')) + '</dt><dd>' +
          escapeHTML(money(sale.cashReceived)) + '</dd></div>' +
          '<div><dt>' + escapeHTML(t('success.change')) + '</dt><dd>' +
          escapeHTML(money(sale.change)) + '</dd></div>'
        : '') +
      '</dl>' +
      '<p class="success-hint">' + icon('checkCircle') + escapeHTML(t('success.savedHint')) + '</p>' +
      '<div class="success-actions">' +
      '<button type="button" class="btn btn-primary btn-wide btn-large" data-action="new-order">' +
      icon('plus') + '<span>' + escapeHTML(t('success.newOrder')) + '</span></button>' +
      '<button type="button" class="btn btn-secondary btn-wide" data-action="open-receipt" data-id="' +
      escapeHTML(sale.id) + '">' + icon('print') + '<span>' +
      escapeHTML(t('success.viewReceipt')) + '</span></button>' +
      '</div>' +
      '</section>'
    );
  }

  // ---------- History ----------

  function simplePageHeader(title, subtitle) {
    return (
      '<header class="page-heading">' +
      '<div class="page-heading-main">' +
      '<h1>' + escapeHTML(title) + '</h1>' +
      '<p class="page-subtitle">' + escapeHTML(subtitle) + '</p>' +
      '</div>' +
      '</header>'
    );
  }

  function methodBadgeHTML(method) {
    return (
      '<span class="status-badge method-badge">' +
      icon(method === 'qris' ? 'qr' : 'banknote') +
      escapeHTML(method === 'qris' ? t('pay.qrisShort') : t('pay.cashShort')) +
      '</span>'
    );
  }

  function saleCardHTML(sale) {
    const itemSummary = sale.lines
      .map(function (line) {
        const addonNames = (line.addons || [])
          .map(function (addon) {
            return addon.name;
          })
          .join(', ');
        return line.qty + '× ' + line.name + (addonNames ? ' (' + addonNames + ')' : '');
      })
      .join(' · ');
    return (
      '<article class="sale-card" aria-labelledby="sale-' + escapeHTML(sale.id) + '">' +
      '<div class="sale-info">' +
      '<div class="sale-head">' +
      '<h3 id="sale-' + escapeHTML(sale.id) + '" class="sale-number">' +
      escapeHTML(t('history.orderNumber', { number: formatOrderNumber(sale.orderNumber) })) +
      '</h3>' +
      '<span class="sale-time">' + icon('receipt') + escapeHTML(formatTime(sale.createdAt)) + '</span>' +
      methodBadgeHTML(sale.method) +
      '</div>' +
      '<p class="sale-items">' + escapeHTML(itemSummary) + '</p>' +
      (sale.discountAmount > 0
        ? '<p class="sale-discount">' + icon('tag') +
          escapeHTML(discountLineLabel(sale) + ' · -' + money(sale.discountAmount)) + '</p>'
        : '') +
      (sale.note ? '<p class="sale-note">' + escapeHTML(t('history.note') + ': ' + sale.note) + '</p>' : '') +
      '</div>' +
      '<div class="sale-money">' +
      '<span class="sale-total-label">' + escapeHTML(t('history.total')) + '</span>' +
      '<strong class="sale-total">' + escapeHTML(money(sale.total)) + '</strong>' +
      '<button type="button" class="btn btn-secondary btn-small" data-action="open-receipt" data-id="' +
      escapeHTML(sale.id) + '">' + icon('receipt') + '<span>' +
      escapeHTML(t('history.receipt')) + '</span></button>' +
      '</div>' +
      '</article>'
    );
  }

  function groupSalesByDate(sales) {
    const groups = [];
    const map = new Map();
    sales.forEach(function (sale) {
      const key = localDateKey(sale.createdAt);
      if (!map.has(key)) {
        const group = { key: key, sales: [] };
        map.set(key, group);
        groups.push(group);
      }
      map.get(key).sales.push(sale);
    });
    return groups;
  }

  function renderHistoryView() {
    const today = localDateKey(new Date());
    const todaySales = state.sales.filter(function (sale) {
      return localDateKey(sale.createdAt) === today;
    });
    const todayCash = todaySales.reduce(function (sum, sale) {
      return sum + (sale.method === 'cash' ? sale.total : 0);
    }, 0);
    const todayQris = todaySales.reduce(function (sum, sale) {
      return sum + (sale.method === 'qris' ? sale.total : 0);
    }, 0);
    const todayTotal = todayCash + todayQris;
    const visibleSales = state.sales.slice(0, ui.historyLimit);
    const groups = groupSalesByDate(visibleSales);

    let historyBody;
    if (!state.sales.length) {
      historyBody =
        '<div class="empty-state">' +
        '<div class="empty-symbol" aria-hidden="true">' + icon('chart') + '</div>' +
        '<h2>' + escapeHTML(t('history.emptyTitle')) + '</h2>' +
        '<p>' + escapeHTML(t('history.emptyText')) + '</p>' +
        '</div>';
    } else {
      historyBody =
        groups.map(function (group) {
          return (
            '<section class="sales-day">' +
            '<h2 class="sales-day-heading">' + escapeHTML(dateHeading(group.key)) + '</h2>' +
            '<div class="sales-list">' + group.sales.map(saleCardHTML).join('') + '</div>' +
            '</section>'
          );
        }).join('') +
        (state.sales.length > visibleSales.length
          ? '<div class="load-more-row"><button type="button" class="btn btn-secondary btn-large" data-action="show-more-history">' +
            icon('plus') + '<span>' + escapeHTML(t('history.showMore')) + '</span></button></div>'
          : ui.historyLimit > 30
            ? '<p class="list-end-note">' + escapeHTML(t('history.noMore')) + '</p>'
            : '');
    }

    return (
      simplePageHeader(t('history.pageTitle'), t('history.pageSubtitle')) +
      '<section class="today-stats" aria-labelledby="today-stats-title">' +
      '<h2 id="today-stats-title" class="sr-only">' + escapeHTML(t('history.todayTitle')) + '</h2>' +
      '<div class="stat-card stat-total">' +
      '<span class="stat-label">' + escapeHTML(t('history.todayTitle')) + '</span>' +
      '<strong class="stat-value">' + escapeHTML(money(todayTotal)) + '</strong>' +
      '<span class="stat-hint">' + escapeHTML(t('history.txToday', { count: todaySales.length })) + '</span>' +
      '</div>' +
      '<div class="stat-card">' +
      '<span class="stat-label">' + icon('banknote') + escapeHTML(t('history.cashToday')) + '</span>' +
      '<strong class="stat-value">' + escapeHTML(money(todayCash)) + '</strong>' +
      '</div>' +
      '<div class="stat-card">' +
      '<span class="stat-label">' + icon('qr') + escapeHTML(t('history.qrisToday')) + '</span>' +
      '<strong class="stat-value">' + escapeHTML(money(todayQris)) + '</strong>' +
      '</div>' +
      (todaySales.length === 0
        ? '<p class="today-empty">' + escapeHTML(t('history.noSalesText')) + '</p>'
        : '') +
      '</section>' +
      '<section class="history-section" aria-labelledby="all-sales-title">' +
      '<div class="section-heading">' +
      '<h2 id="all-sales-title">' + escapeHTML(t('history.allTitle')) + '</h2>' +
      '<span class="count-badge">' + escapeHTML(t('common.transactions', { count: state.sales.length })) + '</span>' +
      '</div>' +
      historyBody +
      '</section>'
    );
  }

  // ---------- Receipt ----------

  function receiptPaperHTML(sale) {
    if (!sale) return '';
    const logo = imageUrl(state.settings.logoImageId);
    return (
      '<article class="receipt-paper" aria-label="' + escapeHTML(t('receipt.summaryAria')) + '">' +
      '<header class="receipt-header">' +
      (logo
        ? '<img class="receipt-logo" src="' + escapeHTML(logo) + '" alt="">'
        : '<div class="receipt-logo receipt-logo-placeholder" aria-hidden="true">' + icon('bowl') + '</div>') +
      '<h2>' + escapeHTML(brandName()) + '</h2>' +
      '<p class="receipt-paid">' + icon('checkCircle') + escapeHTML(t('receipt.paid')) + '</p>' +
      '</header>' +
      '<div class="receipt-meta">' +
      '<div><span>' + escapeHTML(t('receipt.orderNumber')) + '</span><strong>#' +
      escapeHTML(formatOrderNumber(sale.orderNumber)) + '</strong></div>' +
      '<div><span>' + escapeHTML(t('receipt.date')) + '</span><strong>' +
      escapeHTML(formatDateTime(sale.createdAt)) + '</strong></div>' +
      '</div>' +
      '<table class="receipt-table">' +
      '<thead><tr><th scope="col">' + escapeHTML(t('receipt.items')) + '</th>' +
      '<th scope="col">' + escapeHTML(t('receipt.subtotal')) + '</th></tr></thead>' +
      '<tbody>' +
      sale.lines.map(function (line) {
        return (
          '<tr><td>' +
          '<span class="receipt-item-name">' + escapeHTML(line.name) + '</span>' +
          '<span class="receipt-item-meta">' + escapeHTML(String(line.qty)) + ' × ' +
          escapeHTML(money(line.price)) + '</span>' +
          (line.addons && line.addons.length
            ? '<span class="receipt-item-addons">' + escapeHTML(t('order.addonPrefix')) + ' ' +
              escapeHTML(addonBreakdownText(line.addons)) + '</span>'
            : '') +
          '</td><td>' + escapeHTML(money(line.subtotal)) + '</td></tr>'
        );
      }).join('') +
      '</tbody>' +
      '</table>' +
      '<div class="receipt-totals">' +
      '<div><span>' + escapeHTML(t('receipt.subtotal')) + '</span><span>' +
      escapeHTML(money(sale.subtotal)) + '</span></div>' +
      (sale.discountAmount > 0
        ? '<div class="receipt-discount"><span>' + escapeHTML(discountLineLabel(sale)) +
          '</span><span>-' + escapeHTML(money(sale.discountAmount)) + '</span></div>'
        : '') +
      (sale.taxAmount > 0
        ? '<div><span>' + escapeHTML(t('receipt.taxLine', {
            label: sale.taxLabel || t('tax.defaultLabel'),
            percent: formatPercent(sale.taxPercent)
          })) + '</span><span>' + escapeHTML(money(sale.taxAmount)) + '</span></div>'
        : '') +
      '<div class="receipt-total"><span>' + escapeHTML(t('receipt.total')) + '</span><strong>' +
      escapeHTML(money(sale.total)) + '</strong></div>' +
      '</div>' +
      '<div class="receipt-payments">' +
      '<div><span>' + escapeHTML(t('receipt.method')) + '</span><strong>' +
      (sale.method === 'qris' ? escapeHTML(t('receipt.qris')) : escapeHTML(t('receipt.cash'))) +
      '</strong></div>' +
      (sale.method === 'cash'
        ? '<div><span>' + escapeHTML(t('receipt.cashReceived')) + '</span><strong>' +
          escapeHTML(money(sale.cashReceived)) + '</strong></div>' +
          '<div><span>' + escapeHTML(t('receipt.change')) + '</span><strong>' +
          escapeHTML(money(sale.change)) + '</strong></div>'
        : '') +
      '</div>' +
      (sale.note ? '<p class="receipt-note"><strong>' + escapeHTML(t('receipt.note')) +
        ':</strong> ' + escapeHTML(sale.note) + '</p>' : '') +
      '<p class="receipt-thanks">' + escapeHTML(t('receipt.thanks')) + '</p>' +
      '</article>'
    );
  }

  function openReceiptDialog(saleId) {
    const sale = getSale(saleId) || (ui.view === 'success' ? getSale(ui.lastSaleId) : null);
    if (!sale) {
      showToast(t('receipt.noReceipt'), 'error');
      return;
    }
    const dialog = $('#receipt-dialog');
    if (!dialog) return;
    dialog.innerHTML =
      '<div class="dialog-head">' +
      '<h2>' + escapeHTML(t('receipt.title')) + '</h2>' +
      '<button type="button" class="btn btn-icon btn-secondary" data-action="close-receipt" aria-label="' +
      escapeHTML(t('dialog.closeAria')) + '">' + icon('x') + '</button>' +
      '</div>' +
      '<div class="dialog-body receipt-dialog-body">' + receiptPaperHTML(sale) + '</div>' +
      '<div class="dialog-actions receipt-actions">' +
      '<button type="button" class="btn btn-secondary" data-action="close-receipt">' +
      icon('x') + '<span>' + escapeHTML(t('receipt.close')) + '</span></button>' +
      '<button type="button" class="btn btn-primary btn-large" data-action="print-receipt">' +
      icon('print') + '<span>' + escapeHTML(t('receipt.print')) + '</span></button>' +
      '</div>';
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', 'open');
    }
  }

  function printReceipt() {
    const dialog = $('#receipt-dialog');
    const paper = dialog ? $('.receipt-paper', dialog) : null;
    const printArea = $('#print-area');
    if (!paper || !printArea) return;
    printArea.innerHTML = paper.outerHTML;
    printArea.removeAttribute('aria-hidden');
    document.body.classList.add('print-mode');
    const cleanup = function () {
      document.body.classList.remove('print-mode');
      printArea.innerHTML = '';
      printArea.setAttribute('aria-hidden', 'true');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    // Safari/iOS sometimes does not fire afterprint.
    window.setTimeout(function () {
      if (document.body.classList.contains('print-mode')) cleanup();
    }, 60000);
  }

  // ---------- Menu management ----------

  function statusBadgeHTML(soldOut) {
    return (
      '<span class="status-badge ' + (soldOut ? 'is-sold-out' : 'is-available') + '">' +
      icon(soldOut ? 'x' : 'check') +
      escapeHTML(soldOut ? t('menu.soldOut') : t('menu.available')) +
      '</span>'
    );
  }

  function manageItemHTML(item) {
    const category = categoryById(item.categoryId);
    return (
      '<article class="manage-item' + (item.soldOut ? ' is-sold-out' : '') + '">' +
      '<div class="manage-photo">' + itemPhotoHTML(item, 'manage-photo-img') + '</div>' +
      '<div class="manage-main">' +
      '<div class="manage-title-row">' +
      '<h2 class="manage-name">' + escapeHTML(item.name) + '</h2>' +
      statusBadgeHTML(item.soldOut) +
      '</div>' +
      '<p class="manage-meta">' +
      '<span>' + escapeHTML(category ? categoryLabel(category) : '') + '</span>' +
      (item.addons && item.addons.length
        ? '<span class="manage-addon-count">' + icon('plus') +
          escapeHTML(t('menu.addonCount', { count: item.addons.length })) + '</span>'
        : '') +
      '<strong class="manage-price">' + escapeHTML(money(item.price)) + '</strong>' +
      '</p>' +
      '<div class="manage-actions">' +
      '<button type="button" class="btn btn-secondary btn-small" data-action="toggle-sold-out" data-id="' +
      escapeHTML(item.id) + '">' + icon(item.soldOut ? 'checkCircle' : 'x') + '<span>' +
      escapeHTML(item.soldOut ? t('menu.markAvailable') : t('menu.markSoldOut')) + '</span></button>' +
      '<button type="button" class="btn btn-secondary btn-small" data-action="edit-item" data-id="' +
      escapeHTML(item.id) + '">' + icon('pencil') + '<span>' + escapeHTML(t('common.edit')) + '</span></button>' +
      '<button type="button" class="btn btn-ghost-danger btn-small" data-action="delete-item" data-id="' +
      escapeHTML(item.id) + '">' + icon('trash') + '<span>' + escapeHTML(t('common.delete')) + '</span></button>' +
      '</div>' +
      '</div>' +
      '</article>'
    );
  }

  function renderMenuView() {
    const addButton =
      '<button type="button" class="btn btn-primary btn-large" data-action="add-item-open">' +
      icon('plus') + '<span>' + escapeHTML(t('menu.add')) + '</span></button>';
    let content;
    if (!state.menu.length) {
      content =
        '<div class="empty-state">' +
        '<div class="empty-symbol" aria-hidden="true">' + icon('book') + '</div>' +
        '<h2>' + escapeHTML(t('menu.emptyTitle')) + '</h2>' +
        '<p>' + escapeHTML(t('menu.emptyText')) + '</p>' +
        '<button type="button" class="btn btn-primary btn-large" data-action="add-item-open">' +
        icon('plus') + '<span>' + escapeHTML(t('menu.emptyAction')) + '</span></button>' +
        '</div>';
    } else {
      content =
        '<div class="manage-list-heading">' +
        '<h2>' + escapeHTML(t('nav.menu')) + '</h2>' +
        '<span class="count-badge">' + escapeHTML(t('menu.count', { count: state.menu.length })) + '</span>' +
        '</div>' +
        '<div class="manage-list">' + state.menu.map(manageItemHTML).join('') + '</div>';
    }
    return (
      adminPageHeader(t('menu.pageTitle'), t('menu.pageSubtitle'), addButton) +
      '<div class="narrow-page">' + content + '</div>'
    );
  }

  // ---------- Menu item form ----------

  function itemPhotoPreviewHTML() {
    if (!ui.itemForm) return '';
    const item = ui.itemForm.itemId ? getMenuItem(ui.itemForm.itemId) : null;
    const existing = !ui.itemForm.removeExisting && item ? imageUrl(item.imageId) : '';
    const preview = ui.itemForm.newImageBlob ? itemPreviewUrl : existing;
    let html = '<div class="item-photo-preview">';
    if (preview) {
      html +=
        '<img src="' + escapeHTML(preview) + '" alt="' +
        escapeHTML(t('item.photoPreviewAlt')) + '">';
    } else {
      html +=
        '<div class="item-photo-empty">' + icon('camera') +
        '<span>' + escapeHTML(t('common.noPhoto')) + '</span></div>';
    }
    html += '</div><div class="photo-actions">';
    html +=
      '<button type="button" class="btn btn-secondary btn-small" data-action="choose-item-photo">' +
      icon('upload') + '<span>' +
      escapeHTML(preview ? t('item.changePhoto') : t('item.choosePhoto')) + '</span></button>';
    if (preview) {
      html +=
        '<button type="button" class="btn btn-ghost-danger btn-small" data-action="remove-item-photo">' +
        icon('trash') + '<span>' + escapeHTML(t('item.removePhoto')) + '</span></button>';
    }
    html += '</div>';
    return html;
  }

  function itemCategoryOptionsHTML(selectedId) {
    return state.categories
      .map(function (category) {
        return (
          '<option value="' + escapeHTML(category.id) + '"' +
          (category.id === selectedId ? ' selected' : '') + '>' +
          escapeHTML(categoryLabel(category)) + '</option>'
        );
      })
      .join('') +
      '<option value="__new">' + escapeHTML(t('item.newCategoryOption')) + '</option>';
  }

  function addonEditorEmptyHTML() {
    return (
      '<p class="addon-editor-empty" data-addon-empty>' +
      escapeHTML(t('item.addonEmpty')) +
      '</p>'
    );
  }

  function addonEditRowHTML(addon) {
    const source = addon || {};
    const rowKey = uid('addonrow');
    const nameId = 'addon-name-' + rowKey;
    const priceId = 'addon-price-' + rowKey;
    return (
      '<div class="addon-edit-row" data-addon-row data-addon-id="' +
      escapeHTML(source.id || '') + '">' +
      '<div class="form-field addon-edit-name">' +
      '<label for="' + escapeHTML(nameId) + '">' + escapeHTML(t('item.addonNameLabel')) + '</label>' +
      '<input id="' + escapeHTML(nameId) + '" type="text" autocomplete="off" maxlength="80" value="' +
      escapeHTML(source.name || '') + '" placeholder="' +
      escapeHTML(t('item.addonNamePlaceholder')) + '" data-addon-name>' +
      '</div>' +
      '<div class="form-field addon-edit-price">' +
      '<label for="' + escapeHTML(priceId) + '">' + escapeHTML(t('item.addonPriceLabel')) + '</label>' +
      '<div class="price-input-wrap">' +
      '<span class="price-prefix" aria-hidden="true">Rp</span>' +
      '<input id="' + escapeHTML(priceId) + '" type="text" inputmode="numeric" autocomplete="off" maxlength="12" value="' +
      (source.price ? escapeHTML(formatNumber(source.price)) : '') + '" placeholder="0" data-addon-price>' +
      '</div>' +
      '</div>' +
      '<button type="button" class="btn btn-icon btn-ghost-danger addon-edit-remove" data-action="remove-addon-row" aria-label="' +
      escapeHTML(t('item.removeAddon')) + '">' + icon('trash') + '</button>' +
      '</div>'
    );
  }

  function addonEditorHTML(addons) {
    const list = Array.isArray(addons) && addons.length
      ? addons.map(addonEditRowHTML).join('')
      : addonEditorEmptyHTML();
    return (
      '<div class="form-field addon-editor-field">' +
      '<span class="field-label" id="item-addons-label">' + escapeHTML(t('item.addonsLabel')) + '</span>' +
      '<p class="field-hint" id="item-addons-hint">' + escapeHTML(t('item.addonsHint')) + '</p>' +
      '<div class="addon-editor" role="group" aria-labelledby="item-addons-label" aria-describedby="item-addons-hint">' +
      '<div class="addon-edit-list" id="item-addon-list">' + list + '</div>' +
      '<button type="button" class="btn btn-secondary btn-small addon-add-row" data-action="add-addon-row">' +
      icon('plus') + '<span>' + escapeHTML(t('item.addAddon')) + '</span></button>' +
      '</div>' +
      '</div>'
    );
  }

  function refreshAddonEditorEmptyState() {
    const list = $('#item-addon-list');
    if (!list) return;
    const empty = $('[data-addon-empty]', list);
    if ($$('[data-addon-row]', list).length) {
      if (empty) empty.remove();
    } else if (!empty) {
      list.insertAdjacentHTML('beforeend', addonEditorEmptyHTML());
    }
  }

  function addAddonEditorRow() {
    const list = $('#item-addon-list');
    if (!list) return;
    const empty = $('[data-addon-empty]', list);
    if (empty) empty.remove();
    list.insertAdjacentHTML('beforeend', addonEditRowHTML(null));
    const rows = $$('[data-addon-row]', list);
    const newRow = rows[rows.length - 1];
    const input = newRow ? $('[data-addon-name]', newRow) : null;
    if (input) input.focus();
  }

  function readAddonEditorRows() {
    const rows = $$('#item-addon-list [data-addon-row]');
    const addons = [];
    const usedNames = new Set();
    const usedIds = new Set();
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const nameInput = $('[data-addon-name]', row);
      const priceInput = $('[data-addon-price]', row);
      const name = nameInput ? nameInput.value.trim().replace(/\s+/g, ' ').slice(0, 80) : '';
      const rawPrice = priceInput ? priceInput.value.trim() : '';
      if (!name && !rawPrice) continue;
      if (!name) {
        return {
          error: {
            message: t('item.addonNameRequired'),
            focusId: nameInput ? nameInput.id : null
          }
        };
      }
      const price = rawPrice ? parseMoneyInput(rawPrice) : 0;
      if (price == null) {
        return {
          error: {
            message: t('item.addonPriceRequired'),
            focusId: priceInput ? priceInput.id : null
          }
        };
      }
      const nameKey = name.toLowerCase();
      if (usedNames.has(nameKey)) {
        return {
          error: {
            message: t('item.addonDuplicate'),
            focusId: nameInput ? nameInput.id : null
          }
        };
      }
      usedNames.add(nameKey);
      let addonId = asId(row.dataset.addonId) || uid('addon');
      while (usedIds.has(addonId)) addonId = uid('addon');
      usedIds.add(addonId);
      addons.push({ id: addonId, name: name, price: price });
    }
    return { addons: addons };
  }

  function openItemDialog(itemId) {
    if (itemPreviewUrl) {
      URL.revokeObjectURL(itemPreviewUrl);
      itemPreviewUrl = null;
    }
    let item = null;
    if (itemId) {
      item = getMenuItem(itemId);
      if (!item) {
        showToast(t('item.notFound'), 'error');
        return;
      }
    }
    ui.itemForm = {
      mode: item ? 'edit' : 'add',
      itemId: item ? item.id : null,
      categoryId: item ? item.categoryId : state.categories[0].id,
      newImageBlob: null,
      removeExisting: false,
      saving: false
    };
    const dialog = $('#item-dialog');
    if (!dialog) return;
    dialog.innerHTML =
      '<form id="item-form" novalidate>' +
      '<div class="dialog-head">' +
      '<h2 id="item-dialog-title">' + escapeHTML(item ? t('item.titleEdit') : t('item.titleAdd')) + '</h2>' +
      '<button type="button" class="btn btn-icon btn-secondary" data-action="close-item-dialog" aria-label="' +
      escapeHTML(t('dialog.closeAria')) + '">' + icon('x') + '</button>' +
      '</div>' +
      '<div class="dialog-body item-form-body">' +
      '<div class="form-error-summary" role="alert" hidden></div>' +
      '<div class="form-field">' +
      '<label for="item-name">' + escapeHTML(t('item.nameLabel')) + '</label>' +
      '<input id="item-name" type="text" autocomplete="off" maxlength="120" required value="' +
      escapeHTML(item ? item.name : '') + '" placeholder="' +
      escapeHTML(t('item.namePlaceholder')) + '">' +
      '</div>' +
      '<div class="form-field">' +
      '<label for="item-price">' + escapeHTML(t('item.priceLabel')) + '</label>' +
      '<div class="price-input-wrap">' +
      '<span class="price-prefix" aria-hidden="true">Rp</span>' +
      '<input id="item-price" type="text" inputmode="numeric" autocomplete="off" required value="' +
      (item && item.price ? escapeHTML(formatNumber(item.price)) : '') + '" placeholder="' +
      escapeHTML(t('item.pricePlaceholder')) + '">' +
      '</div>' +
      '<p class="field-hint">' + escapeHTML(t('item.priceHint')) + '</p>' +
      '</div>' +
      '<div class="form-field">' +
      '<label for="item-category">' + escapeHTML(t('item.categoryLabel')) + '</label>' +
      '<select id="item-category">' + itemCategoryOptionsHTML(ui.itemForm.categoryId) + '</select>' +
      '</div>' +
      '<div class="form-field new-category-field" hidden>' +
      '<label for="item-new-category">' + escapeHTML(t('item.newCategoryLabel')) + '</label>' +
      '<input id="item-new-category" type="text" autocomplete="off" maxlength="60" placeholder="' +
      escapeHTML(t('item.newCategoryPlaceholder')) + '">' +
      '</div>' +
      addonEditorHTML(item ? item.addons : []) +
      '<div class="form-field">' +
      '<span class="field-label">' + escapeHTML(t('item.photoLabel')) + '</span>' +
      '<div class="photo-field js-photo-field">' + itemPhotoPreviewHTML() + '</div>' +
      '<input type="file" id="item-photo-file" accept="image/png,image/jpeg" class="visually-hidden" aria-label="' +
      escapeHTML(t('item.photoLabel')) + '">' +
      '<p class="field-hint">' + escapeHTML(t('item.photoHint')) + '</p>' +
      '</div>' +
      '</div>' +
      '<div class="dialog-actions">' +
      '<button type="button" class="btn btn-secondary" data-action="close-item-dialog">' +
      icon('x') + '<span>' + escapeHTML(t('common.cancel')) + '</span></button>' +
      '<button type="submit" class="btn btn-primary btn-large">' +
      icon('check') + '<span>' +
      escapeHTML(item ? t('item.saveChanges') : t('item.save')) + '</span></button>' +
      '</div>' +
      '</form>';
    const categorySelect = $('#item-category');
    if (categorySelect) {
      categorySelect.addEventListener('change', function () {
        const newField = $('.new-category-field');
        if (newField) newField.hidden = categorySelect.value !== '__new';
        if (categorySelect.value === '__new') {
          const input = $('#item-new-category');
          if (input) input.focus();
        }
      });
    }
    const priceInput = $('#item-price');
    if (priceInput) {
      priceInput.addEventListener('input', function () {
        const raw = priceInput.value.replace(/[^0-9]/g, '');
        priceInput.value = raw ? formatNumber(Number(raw)) : '';
      });
    }
    const fileInput = $('#item-photo-file');
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        handleItemPhotoFile(fileInput.files && fileInput.files[0]);
        fileInput.value = '';
      });
    }
    const form = $('#item-form');
    if (form) form.addEventListener('submit', handleItemSubmit);
    dialog.setAttribute('aria-labelledby', 'item-dialog-title');
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', 'open');
    }
    window.setTimeout(function () {
      const nameInput = $('#item-name');
      if (nameInput && !item) nameInput.focus();
    }, 40);
  }

  function closeItemDialog() {
    const dialog = $('#item-dialog');
    if (dialog && dialog.open) dialog.close();
    else if (dialog) dialog.removeAttribute('open');
    if (itemPreviewUrl) {
      URL.revokeObjectURL(itemPreviewUrl);
      itemPreviewUrl = null;
    }
    ui.itemForm = null;
  }

  function refreshItemPhotoField() {
    const field = $('.js-photo-field');
    if (field) field.innerHTML = itemPhotoPreviewHTML();
  }

  function showItemFormError(message, focusId) {
    const summary = $('.form-error-summary');
    if (summary) {
      summary.textContent = message;
      summary.hidden = false;
    }
    if (focusId) {
      const field = $('#' + focusId);
      if (field) field.focus();
    }
  }

  function clearItemFormError() {
    const summary = $('.form-error-summary');
    if (summary) {
      summary.textContent = '';
      summary.hidden = true;
    }
  }

  async function handleItemPhotoFile(file) {
    if (!file || !ui.itemForm) return;
    clearItemFormError();
    try {
      const blob = await prepareMenuPhoto(file);
      if (itemPreviewUrl) URL.revokeObjectURL(itemPreviewUrl);
      itemPreviewUrl = URL.createObjectURL(blob);
      ui.itemForm.newImageBlob = blob;
      ui.itemForm.removeExisting = false;
      refreshItemPhotoField();
    } catch (error) {
      showItemFormError(error.message || t('item.photoError'));
    }
  }

  function removeItemPhoto() {
    if (!ui.itemForm) return;
    const item = ui.itemForm.itemId ? getMenuItem(ui.itemForm.itemId) : null;
    const hasExisting = Boolean(item && item.imageId && !ui.itemForm.removeExisting);
    if (hasExisting) {
      ui.itemForm.removeExisting = true;
    }
    if (ui.itemForm.newImageBlob) {
      ui.itemForm.newImageBlob = null;
      if (itemPreviewUrl) {
        URL.revokeObjectURL(itemPreviewUrl);
        itemPreviewUrl = null;
      }
    }
    refreshItemPhotoField();
  }

  async function handleItemSubmit(event) {
    event.preventDefault();
    if (!ui.itemForm || ui.itemForm.saving) return;
    clearItemFormError();
    const nameInput = $('#item-name');
    const priceInput = $('#item-price');
    const categorySelect = $('#item-category');
    const newCategoryInput = $('#item-new-category');
    const name = nameInput ? nameInput.value.trim() : '';
    const price = priceInput ? parseMoneyInput(priceInput.value) : null;
    let categoryId = categorySelect ? categorySelect.value : '';
    let newCategoryName = newCategoryInput ? newCategoryInput.value.trim() : '';

    if (!name) {
      showItemFormError(t('item.nameRequired'), 'item-name');
      return;
    }
    if (price == null) {
      showItemFormError(t('item.priceRequired'), 'item-price');
      return;
    }
    if (!categoryId) {
      showItemFormError(t('item.categoryRequired'), 'item-category');
      return;
    }
    if (categoryId === '__new') {
      if (!newCategoryName) {
        showItemFormError(t('item.newCategoryRequired'), 'item-new-category');
        return;
      }
      const existing = state.categories.find(function (category) {
        return categoryLabel(category).trim().toLowerCase() === newCategoryName.toLowerCase();
      });
      if (existing) {
        categoryId = existing.id;
      } else {
        categoryId = uid('category');
      }
    }

    const addonResult = readAddonEditorRows();
    if (addonResult.error) {
      showItemFormError(addonResult.error.message, addonResult.error.focusId);
      return;
    }
    const addons = addonResult.addons;

    const form = $('#item-form');
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;
    ui.itemForm.saving = true;
    if (submitButton) submitButton.disabled = true;

    const previousMenu = state.menu;
    const previousCategories = state.categories;
    let newImageRecord = null;

    try {
      if (ui.itemForm.newImageBlob) {
        newImageRecord = await addImageBlob(
          ui.itemForm.newImageBlob,
          name + '.jpg'
        );
      }

      if (categoryId !== '__new' && !state.categories.some(function (category) { return category.id === categoryId; })) {
        state.categories = state.categories.concat([
          { id: categoryId, name: newCategoryName }
        ]);
      }

      const currentItem = ui.itemForm.itemId ? getMenuItem(ui.itemForm.itemId) : null;
      const oldImageId = currentItem ? currentItem.imageId : null;
      const nextImageId = newImageRecord
        ? newImageRecord.id
        : ui.itemForm.removeExisting
          ? null
          : oldImageId;

      if (currentItem) {
        state.menu = state.menu.map(function (item) {
          if (item.id !== currentItem.id) return item;
          return Object.assign({}, item, {
            name: name,
            price: price,
            categoryId: categoryId,
            imageId: nextImageId,
            addons: addons
          });
        });
      } else {
        state.menu = [
          {
            id: uid('menu'),
            name: name,
            price: price,
            categoryId: categoryId,
            imageId: nextImageId,
            addons: addons,
            soldOut: false,
            createdAt: new Date().toISOString()
          }
        ].concat(state.menu);
      }

      await saveNow();
      if (oldImageId && oldImageId !== nextImageId) {
        try {
          await deleteImageId(oldImageId);
        } catch (error) {
          console.warn('Gambar lama tidak dapat dihapus.', error);
        }
      }
      closeItemDialog();
      renderApp();
      showToast(t('menu.saved'));
    } catch (error) {
      state.menu = previousMenu;
      state.categories = previousCategories;
      if (newImageRecord) {
        try {
          await deleteImageId(newImageRecord.id);
        } catch (cleanupError) {
          console.warn(cleanupError);
        }
      }
      ui.itemForm.saving = false;
      if (submitButton) submitButton.disabled = false;
      showItemFormError(
        error && error.name === 'QuotaExceededError'
          ? t('common.saveFailed')
          : t('item.imageSaveFailed')
      );
      console.error(error);
    }
  }

  // ---------- Add-on selection ----------

  function updateAddonDialogSummary() {
    const item = ui.addonItemId ? getMenuItem(ui.addonItemId) : null;
    const total = $('#addon-running-total');
    if (!item || !total) return;
    const selectedIds = new Set(
      $$('#addon-dialog [data-addon-choice]:checked').map(function (input) {
        return input.value;
      })
    );
    const selected = (item.addons || []).filter(function (addon) {
      return selectedIds.has(addon.id);
    });
    total.textContent = money(unitPriceWithAddons(item.price, selected));
  }

  function openAddonDialog(itemId) {
    const item = getMenuItem(itemId);
    if (!item || item.soldOut || !item.addons || !item.addons.length) return;
    ui.addonItemId = item.id;
    const dialog = $('#addon-dialog');
    if (!dialog) return;
    dialog.innerHTML =
      '<form id="addon-form" novalidate>' +
      '<div class="dialog-head">' +
      '<h2 id="addon-dialog-title">' + escapeHTML(t('order.addonDialogTitle')) + '</h2>' +
      '<button type="button" class="btn btn-icon btn-secondary" data-action="close-addon-dialog" aria-label="' +
      escapeHTML(t('dialog.closeAria')) + '">' + icon('x') + '</button>' +
      '</div>' +
      '<div class="dialog-body addon-dialog-body">' +
      '<div class="addon-item-summary">' +
      '<div class="addon-item-summary-copy">' +
      '<span class="addon-item-name">' + escapeHTML(item.name) + '</span>' +
      '<span class="addon-item-base">' + escapeHTML(t('order.addonBasePrice') + ' · ' + money(item.price)) + '</span>' +
      '</div>' +
      '<strong class="addon-item-price">' + escapeHTML(money(item.price)) + '</strong>' +
      '</div>' +
      '<p class="addon-dialog-hint">' + escapeHTML(t('order.addonDialogHint')) + '</p>' +
      '<div class="addon-options" role="group" aria-label="' + escapeHTML(t('order.addonDialogTitle')) + '">' +
      item.addons.map(function (addon, index) {
        const choiceId = 'addon-choice-' + index;
        return (
          '<label class="addon-option">' +
          '<input type="checkbox" id="' + choiceId + '" value="' + escapeHTML(addon.id) + '" data-addon-choice>' +
          '<span class="addon-option-copy">' +
          '<span class="addon-option-name">' + escapeHTML(addon.name) + '</span>' +
          '<span class="addon-option-price">' +
          escapeHTML(addon.price > 0 ? '+' + money(addon.price) : t('order.addonFree')) +
          '</span>' +
          '</span>' +
          '</label>'
        );
      }).join('') +
      '</div>' +
      '<div class="addon-running-total" role="status" aria-live="polite">' +
      '<span>' + escapeHTML(t('order.addonPerItem')) + '</span>' +
      '<strong id="addon-running-total">' + escapeHTML(money(item.price)) + '</strong>' +
      '</div>' +
      '</div>' +
      '<div class="dialog-actions">' +
      '<button type="button" class="btn btn-secondary" data-action="close-addon-dialog">' +
      icon('x') + '<span>' + escapeHTML(t('common.cancel')) + '</span></button>' +
      '<button type="submit" class="btn btn-primary btn-large">' +
      icon('plus') + '<span>' + escapeHTML(t('order.addToOrder')) + '</span></button>' +
      '</div>' +
      '</form>';
    const form = $('#addon-form');
    if (form) {
      form.addEventListener('submit', handleAddonSubmit);
      form.addEventListener('change', updateAddonDialogSummary);
    }
    dialog.setAttribute('aria-labelledby', 'addon-dialog-title');
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', 'open');
    }
    window.setTimeout(function () {
      if (!dialog.open) return;
      const firstChoice = $('#addon-dialog [data-addon-choice]');
      if (firstChoice) firstChoice.focus();
    }, 40);
  }

  function closeAddonDialog() {
    const dialog = $('#addon-dialog');
    if (dialog && dialog.open) dialog.close();
    else if (dialog) dialog.removeAttribute('open');
    ui.addonItemId = null;
  }

  function handleAddonSubmit(event) {
    event.preventDefault();
    if (!ui.addonItemId) return;
    const item = getMenuItem(ui.addonItemId);
    if (!item) {
      closeAddonDialog();
      return;
    }
    const selectedIds = new Set(
      $$('#addon-dialog [data-addon-choice]:checked').map(function (input) {
        return input.value;
      })
    );
    const selected = (item.addons || []).filter(function (addon) {
      return selectedIds.has(addon.id);
    });
    closeAddonDialog();
    addItemToOrder(item.id, selected);
  }

  // ---------- Settings ----------


  function settingsImagePreviewHTML(kind) {
    const isLogo = kind === 'logo';
    const imageId = isLogo ? state.settings.logoImageId : state.settings.qrisImageId;
    const url = imageUrl(imageId);
    const altText = isLogo
      ? t('settings.logoAlt', { name: brandName() })
      : t('settings.qrisAlt', { name: brandName() });
    if (url) {
      return (
        '<div class="' + (isLogo ? 'logo-preview' : 'qris-preview') + '">' +
        '<img src="' + escapeHTML(url) + '" alt="' + escapeHTML(altText) + '">' +
        '</div>'
      );
    }
    return (
      '<div class="' + (isLogo ? 'logo-preview' : 'qris-preview') + ' image-empty-preview">' +
      icon(isLogo ? 'image' : 'qr') +
      '<span>' + escapeHTML(isLogo ? t('settings.noLogo') : t('settings.noQris')) + '</span>' +
      '</div>'
    );
  }

  function pinSectionHTML() {
    const active = isPinActive();
    let html =
      '<section class="settings-card" aria-labelledby="pin-title">' +
      '<div class="settings-card-head">' +
      '<div>' +
      '<h2 id="pin-title">' + escapeHTML(t('settings.pinTitle')) + '</h2>' +
      '<p>' + escapeHTML(t('settings.pinDesc')) + '</p>' +
      '</div>' +
      '<span class="status-badge ' + (active ? 'is-available' : '') + '">' +
      icon(active ? 'lock' : 'checkCircle') +
      escapeHTML(active ? t('settings.pinActive') : t('settings.pinInactive')) +
      '</span>' +
      '</div>';

    if (ui.pinEditing) {
      html +=
        '<div class="pin-form">' +
        '<div class="form-field">' +
        '<label for="pin-new">' + escapeHTML(t('settings.pinNew')) + '</label>' +
        '<input id="pin-new" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8" placeholder="' +
        escapeHTML(t('settings.pinPlaceholder')) + '">' +
        '</div>' +
        '<div class="form-field">' +
        '<label for="pin-confirm">' + escapeHTML(t('settings.pinConfirm')) + '</label>' +
        '<input id="pin-confirm" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8" placeholder="' +
        escapeHTML(t('settings.pinPlaceholder')) + '">' +
        '</div>' +
        '<p class="form-error" id="pin-error" role="alert" hidden></p>' +
        '<div class="inline-actions">' +
        '<button type="button" class="btn btn-primary" data-action="save-pin">' +
        icon('lock') + '<span>' + escapeHTML(t('settings.pinSave')) + '</span></button>' +
        '<button type="button" class="btn btn-secondary" data-action="cancel-pin-edit">' +
        icon('x') + '<span>' + escapeHTML(t('common.cancel')) + '</span></button>' +
        '</div>' +
        '</div>';
    } else if (active) {
      html +=
        '<p class="settings-status-line">' + icon('checkCircle') + escapeHTML(t('settings.pinActiveHint')) + '</p>' +
        '<div class="inline-actions">' +
        '<button type="button" class="btn btn-secondary" data-action="edit-pin">' +
        icon('pencil') + '<span>' + escapeHTML(t('settings.pinChange')) + '</span></button>' +
        '<button type="button" class="btn btn-ghost-danger" data-action="remove-pin">' +
        icon('x') + '<span>' + escapeHTML(t('settings.pinRemove')) + '</span></button>' +
        '</div>';
    } else {
      html +=
        '<div class="inline-actions"><button type="button" class="btn btn-primary" data-action="edit-pin">' +
        icon('lock') + '<span>' + escapeHTML(t('settings.pinSet')) + '</span></button></div>';
    }
    html += '</section>';
    return html;
  }

  function discountSettingHTML(kind) {
    const config = state.settings.discounts[kind];
    const isAmount = config.type === 'amount';
    return (
      '<div class="discount-setting">' +
      '<label class="toggle-row" for="discount-' + escapeHTML(kind) + '-enabled">' +
      '<input id="discount-' + escapeHTML(kind) + '-enabled" type="checkbox" data-discount-toggle="' +
      escapeHTML(kind) + '"' + (config.enabled ? ' checked' : '') + '>' +
      '<span class="toggle-label">' + escapeHTML(discountKindLabel(kind)) + '</span>' +
      '</label>' +
      '<fieldset class="discount-fields" id="discount-' + escapeHTML(kind) + '-fields"' +
      (!config.enabled ? ' disabled' : '') + '>' +
      '<div class="form-grid">' +
      '<div class="form-field">' +
      '<label for="discount-' + escapeHTML(kind) + '-type">' +
      escapeHTML(t('settings.discountType')) + '</label>' +
      '<select id="discount-' + escapeHTML(kind) + '-type" data-discount-type="' +
      escapeHTML(kind) + '">' +
      '<option value="percent"' + (!isAmount ? ' selected' : '') + '>' +
      escapeHTML(t('settings.discountTypePercent')) + '</option>' +
      '<option value="amount"' + (isAmount ? ' selected' : '') + '>' +
      escapeHTML(t('settings.discountTypeAmount')) + '</option>' +
      '</select>' +
      '</div>' +
      '<div class="form-field">' +
      '<label id="discount-' + escapeHTML(kind) + '-value-label" for="discount-' +
      escapeHTML(kind) + '-value">' +
      escapeHTML(isAmount ? t('settings.discountValueAmount') : t('settings.discountValuePercent')) +
      '</label>' +
      '<input id="discount-' + escapeHTML(kind) + '-value" type="number" inputmode="' +
      (isAmount ? 'numeric' : 'decimal') + '" min="0" max="' +
      (isAmount ? MAX_DISCOUNT_AMOUNT : 100) + '" step="' + (isAmount ? '1' : '0.5') +
      '" data-discount-value="' + escapeHTML(kind) + '" value="' +
      escapeHTML(String(config.value)) + '">' +
      '<p class="field-hint" id="discount-' + escapeHTML(kind) + '-value-hint">' +
      escapeHTML(isAmount ? t('settings.discountAmountHint') : t('settings.discountPercentHint')) +
      '</p>' +
      '</div>' +
      '</div>' +
      '<p class="form-error" id="discount-' + escapeHTML(kind) + '-error" role="alert" hidden></p>' +
      '</fieldset>' +
      '</div>'
    );
  }

  function discountSettingsHTML() {
    return (
      '<section class="settings-card" aria-labelledby="discount-settings-title">' +
      '<div class="settings-card-head"><div>' +
      '<h2 id="discount-settings-title">' + escapeHTML(t('settings.discountTitle')) + '</h2>' +
      '<p>' + escapeHTML(t('settings.discountHint')) + '</p>' +
      '</div></div>' +
      '<p class="discount-settings-note">' + icon('tag') +
      escapeHTML(t('settings.discountFoodNote')) + '</p>' +
      '<div class="discount-settings">' +
      DISCOUNT_TYPES.map(discountSettingHTML).join('') +
      '</div>' +
      '</section>'
    );
  }

  function renderSettingsView() {
    const logo = imageUrl(state.settings.logoImageId);
    const qris = imageUrl(state.settings.qrisImageId);
    return (
      adminPageHeader(t('settings.pageTitle'), t('settings.pageSubtitle')) +
      '<div class="settings-grid">' +
      '<section class="settings-card" aria-labelledby="identity-title">' +
      '<div class="settings-card-head"><div>' +
      '<h2 id="identity-title">' + escapeHTML(t('settings.identityTitle')) + '</h2>' +
      '<p>' + escapeHTML(t('settings.nameHint')) + '</p>' +
      '</div></div>' +
      '<div class="form-field">' +
      '<label for="restaurant-name">' + escapeHTML(t('settings.nameLabel')) + '</label>' +
      '<input id="restaurant-name" type="text" autocomplete="organization" maxlength="80" data-setting="restaurant-name" value="' +
      escapeHTML(state.settings.restaurantName) + '" placeholder="' +
      escapeHTML(t('settings.namePlaceholder')) + '">' +
      '</div>' +
      '<div class="asset-field">' +
      '<span class="field-label">' + escapeHTML(t('settings.logoLabel')) + '</span>' +
      settingsImagePreviewHTML('logo') +
      '<p class="field-hint">' + escapeHTML(t('settings.logoHint')) + '</p>' +
      '<div class="inline-actions">' +
      '<button type="button" class="btn btn-secondary btn-small" data-action="choose-logo">' +
      icon('upload') + '<span>' + escapeHTML(logo ? t('settings.changeLogo') : t('settings.uploadLogo')) + '</span></button>' +
      (logo
        ? '<button type="button" class="btn btn-ghost-danger btn-small" data-action="remove-logo">' +
          icon('trash') + '<span>' + escapeHTML(t('settings.removeLogo')) + '</span></button>'
        : '') +
      '</div>' +
      '<input type="file" id="logo-file" accept="image/png,image/jpeg" class="visually-hidden" aria-label="' +
      escapeHTML(t('settings.logoLabel')) + '">' +
      '</div>' +
      '</section>' +

      '<section class="settings-card" aria-labelledby="qris-settings-title">' +
      '<div class="settings-card-head"><div>' +
      '<h2 id="qris-settings-title">' + escapeHTML(t('settings.qrisTitle')) + '</h2>' +
      '<p>' + escapeHTML(t('settings.qrisHint')) + '</p>' +
      '</div></div>' +
      settingsImagePreviewHTML('qris') +
      '<div class="inline-actions">' +
      '<button type="button" class="btn btn-secondary btn-small" data-action="choose-qris">' +
      icon('upload') + '<span>' + escapeHTML(qris ? t('settings.changeQris') : t('settings.uploadQris')) + '</span></button>' +
      (qris
        ? '<button type="button" class="btn btn-ghost-danger btn-small" data-action="remove-qris">' +
          icon('trash') + '<span>' + escapeHTML(t('settings.removeQris')) + '</span></button>'
        : '') +
      '</div>' +
      '<input type="file" id="qris-file" accept="image/png,image/jpeg" class="visually-hidden" aria-label="' +
      escapeHTML(t('settings.qrisTitle')) + '">' +
      '</section>' +

      '<section class="settings-card" aria-labelledby="tax-settings-title">' +
      '<div class="settings-card-head"><div>' +
      '<h2 id="tax-settings-title">' + escapeHTML(t('settings.taxTitle')) + '</h2>' +
      '<p>' + escapeHTML(t('settings.taxToggleHint')) + '</p>' +
      '</div></div>' +
      '<label class="toggle-row" for="tax-enabled">' +
      '<input id="tax-enabled" type="checkbox" data-setting="tax-enabled"' +
      (state.settings.taxEnabled ? ' checked' : '') + '>' +
      '<span class="toggle-label">' + escapeHTML(t('settings.taxToggle')) + '</span>' +
      '</label>' +
      '<fieldset class="tax-fields" id="tax-fields"' + (!state.settings.taxEnabled ? ' disabled' : '') + '>' +
      '<div class="form-grid">' +
      '<div class="form-field">' +
      '<label for="tax-label-input">' + escapeHTML(t('settings.taxLabel')) + '</label>' +
      '<input id="tax-label-input" type="text" autocomplete="off" maxlength="40" data-setting="tax-label" value="' +
      escapeHTML(state.settings.taxLabel) + '" placeholder="' +
      escapeHTML(t('settings.taxLabelPlaceholder')) + '">' +
      '</div>' +
      '<div class="form-field">' +
      '<label for="tax-percent">' + escapeHTML(t('settings.taxPercent')) + '</label>' +
      '<input id="tax-percent" type="number" inputmode="decimal" min="0" max="100" step="1" data-setting="tax-percent" value="' +
      escapeHTML(state.settings.taxPercent) + '">' +
      '<p class="field-hint">' + escapeHTML(t('settings.taxPercentHint')) + '</p>' +
      '</div>' +
      '</div>' +
      '<p class="form-error" id="tax-error" role="alert" hidden></p>' +
      '</fieldset>' +
      '</section>' +

      discountSettingsHTML() +

      '<section class="settings-card" aria-labelledby="display-title">' +
      '<div class="settings-card-head"><div>' +
      '<h2 id="display-title">' + escapeHTML(t('settings.displayTitle')) + '</h2>' +
      '<p>' + escapeHTML(t('settings.languageHint')) + '</p>' +
      '</div></div>' +
      '<div class="form-field">' +
      '<label for="language-select">' + escapeHTML(t('settings.languageLabel')) + '</label>' +
      '<select id="language-select" data-setting="language">' +
      '<option value="id"' + (uiLanguage() === 'id' ? ' selected' : '') + '>' +
      escapeHTML(t('settings.languageId')) + '</option>' +
      '<option value="en"' + (uiLanguage() === 'en' ? ' selected' : '') + '>' +
      escapeHTML(t('settings.languageEn')) + '</option>' +
      '</select>' +
      '</div>' +
      '</section>' +

      pinSectionHTML() +

      '<section class="settings-card" aria-labelledby="backup-title">' +
      '<div class="settings-card-head"><div>' +
      '<h2 id="backup-title">' + escapeHTML(t('settings.backupTitle')) + '</h2>' +
      '<p>' + escapeHTML(t('settings.backupDesc')) + '</p>' +
      '</div></div>' +
      '<div class="inline-actions">' +
      '<button type="button" class="btn btn-secondary btn-small" data-action="export-backup">' +
      icon('upload') + '<span>' + escapeHTML(t('settings.export')) + '</span></button>' +
      '<button type="button" class="btn btn-secondary btn-small" data-action="import-backup">' +
      icon('receipt') + '<span>' + escapeHTML(t('settings.import')) + '</span></button>' +
      '</div>' +
      '<p class="field-hint">' + escapeHTML(t('settings.backupPinNote')) + '</p>' +
      '<input type="file" id="backup-file" accept="application/json,.json" class="visually-hidden" aria-label="' +
      escapeHTML(t('settings.import')) + '">' +
      '</section>' +

      '<section class="settings-card settings-note-card" aria-labelledby="storage-title">' +
      '<div class="settings-card-head"><div>' +
      '<h2 id="storage-title">' + escapeHTML(t('settings.storageNoteTitle')) + '</h2>' +
      '</div></div>' +
      '<p>' + icon('alert') + escapeHTML(t('settings.storageNote')) + '</p>' +
      '<p class="app-version">' + escapeHTML(t('settings.version')) + ': ' + escapeHTML(APP_VERSION) + '</p>' +
      '</section>' +
      '</div>'
    );
  }

  // ---------- PIN ----------

  function randomSalt() {
    const bytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }
    return Array.prototype.map
      .call(bytes, function (byte) {
        return byte.toString(16).padStart(2, '0');
      })
      .join('');
  }

  function fallbackHash(text) {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let index = 0; index < text.length; index += 1) {
      const char = text.charCodeAt(index);
      h1 = Math.imul(h1 ^ char, 2654435761);
      h2 = Math.imul(h2 ^ char, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  }

  async function hashPin(pin, salt) {
    const text = salt + ':' + pin;
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      try {
        const encoded = new TextEncoder().encode(text);
        const digest = await window.crypto.subtle.digest('SHA-256', encoded);
        const hex = Array.prototype.map
          .call(new Uint8Array(digest), function (byte) {
            return byte.toString(16).padStart(2, '0');
          })
          .join('');
        return { hash: hex, salt: salt, algo: 'sha256' };
      } catch (error) {
        /* fall through */
      }
    }
    return { hash: fallbackHash(text), salt: salt, algo: 'fallback' };
  }

  async function pinMatches(pin) {
    if (!isPinActive()) return true;
    const settings = state.settings;
    const text = settings.pinSalt + ':' + pin;
    let hash;
    if (settings.pinAlgo === 'sha256' && window.crypto && window.crypto.subtle && window.TextEncoder) {
      const encoded = new TextEncoder().encode(text);
      const digest = await window.crypto.subtle.digest('SHA-256', encoded);
      hash = Array.prototype.map
        .call(new Uint8Array(digest), function (byte) {
          return byte.toString(16).padStart(2, '0');
        })
        .join('');
    } else {
      hash = fallbackHash(text);
    }
    return hash === settings.pinHash;
  }

  function setPinError(message) {
    const error = $('#pin-error');
    if (error) {
      error.textContent = message || '';
      error.hidden = !message;
    }
  }

  function openPinDialog(targetView) {
    const dialog = $('#pin-dialog');
    if (!dialog) return;
    ui.pinTargetView = targetView;
    dialog.innerHTML =
      '<form id="pin-form">' +
      '<div class="dialog-head">' +
      '<h2>' + escapeHTML(t('settings.pinEnterTitle')) + '</h2>' +
      '</div>' +
      '<div class="dialog-body">' +
      '<div class="pin-lock-symbol" aria-hidden="true">' + icon('lock') + '</div>' +
      '<p class="dialog-copy">' + escapeHTML(t('settings.pinEnterText')) + '</p>' +
      '<div class="form-field">' +
      '<label for="pin-access">' + escapeHTML(t('settings.pinTitle')) + '</label>' +
      '<input id="pin-access" type="password" inputmode="numeric" autocomplete="current-password" maxlength="8" placeholder="' +
      escapeHTML(t('settings.pinPlaceholder')) + '">' +
      '</div>' +
      '<p class="form-error" id="pin-access-error" role="alert" hidden></p>' +
      '</div>' +
      '<div class="dialog-actions">' +
      '<button type="button" class="btn btn-secondary" data-action="close-pin">' +
      icon('x') + '<span>' + escapeHTML(t('common.cancel')) + '</span></button>' +
      '<button type="submit" class="btn btn-primary btn-large">' +
      icon('lock') + '<span>' + escapeHTML(t('settings.pinUnlock')) + '</span></button>' +
      '</div>' +
      '</form>';
    const input = $('#pin-access');
    if (input) {
      input.addEventListener('input', function () {
        input.value = input.value.replace(/[^0-9]/g, '');
        const error = $('#pin-access-error');
        if (error) error.hidden = true;
      });
    }
    const form = $('#pin-form');
    if (form) form.addEventListener('submit', handlePinSubmit);
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', 'open');
    }
    window.setTimeout(function () {
      if (input) input.focus();
    }, 40);
  }

  function closePinDialog() {
    const dialog = $('#pin-dialog');
    if (dialog && dialog.open) dialog.close();
    else if (dialog) dialog.removeAttribute('open');
    ui.pinTargetView = null;
    ui.pinChecking = false;
  }

  async function handlePinSubmit(event) {
    event.preventDefault();
    if (ui.pinChecking) return;
    const input = $('#pin-access');
    const error = $('#pin-access-error');
    const submit = $('#pin-form button[type="submit"]');
    const pin = input ? input.value.trim() : '';
    if (!/^\d{4,8}$/.test(pin)) {
      if (error) {
        error.textContent = t('settings.pinErrorLength');
        error.hidden = false;
      }
      if (input) input.focus();
      return;
    }
    ui.pinChecking = true;
    if (submit) submit.disabled = true;
    try {
      const matches = await pinMatches(pin);
      if (!matches) {
        if (error) {
          error.textContent = t('settings.pinWrong');
          error.hidden = false;
        }
        if (input) {
          input.value = '';
          input.focus();
        }
        return;
      }
      const target = ui.pinTargetView;
      ui.adminUnlocked = true;
      closePinDialog();
      navigateTo(target || 'menu', { bypassPin: true });
    } catch (pinError) {
      console.error(pinError);
      if (error) {
        error.textContent = t('common.errorGeneric');
        error.hidden = false;
      }
    } finally {
      ui.pinChecking = false;
      if (submit) submit.disabled = false;
    }
  }

  async function saveNewPin() {
    const newInput = $('#pin-new');
    const confirmInput = $('#pin-confirm');
    const pin = newInput ? newInput.value.trim() : '';
    const confirm = confirmInput ? confirmInput.value.trim() : '';
    setPinError('');
    if (!/^\d{4,8}$/.test(pin)) {
      setPinError(t('settings.pinErrorLength'));
      if (newInput) newInput.focus();
      return;
    }
    if (pin !== confirm) {
      setPinError(t('settings.pinErrorMismatch'));
      if (confirmInput) confirmInput.focus();
      return;
    }
    const button = $('[data-action="save-pin"]');
    if (button) button.disabled = true;
    try {
      const salt = randomSalt();
      const record = await hashPin(pin, salt);
      state.settings.pinHash = record.hash;
      state.settings.pinSalt = record.salt;
      state.settings.pinAlgo = record.algo;
      await saveNow();
      ui.pinEditing = false;
      renderApp();
      showToast(t('settings.pinSuccess'));
    } catch (error) {
      setPinError(t('common.saveFailed'));
      if (button) button.disabled = false;
    }
  }

  // ---------- Confirmation dialog ----------

  function showConfirm(options) {
    const opts = options || {};
    return new Promise(function (resolve) {
      const dialog = $('#confirm-dialog');
      if (!dialog) {
        resolve(false);
        return;
      }
      if (dialog.open) {
        resolve(false);
        return;
      }
      const danger = opts.danger !== false;
      confirmResolver = resolve;
      dialog.returnValue = '';
      dialog.innerHTML =
        '<div class="dialog-head">' +
        '<h2>' + escapeHTML(opts.title || t('dialog.confirmTitle')) + '</h2>' +
        '</div>' +
        '<div class="dialog-body">' +
        '<div class="confirm-symbol' + (danger ? ' is-danger' : '') + '" aria-hidden="true">' +
        icon(danger ? 'alert' : 'checkCircle') +
        '</div>' +
        '<p class="dialog-copy">' + escapeHTML(opts.text || '') + '</p>' +
        '</div>' +
        '<div class="dialog-actions">' +
        '<button type="button" class="btn btn-secondary" data-confirm-choice="no">' +
        icon('x') + '<span>' + escapeHTML(t('common.cancel')) + '</span></button>' +
        '<button type="button" class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + ' btn-large" data-confirm-choice="yes">' +
        icon(danger ? 'trash' : 'check') + '<span>' +
        escapeHTML(opts.confirmLabel || t('dialog.yes')) + '</span></button>' +
        '</div>';
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute('open', 'open');
      }
    });
  }

  function closeConfirmDialog(choice) {
    const dialog = $('#confirm-dialog');
    if (!dialog) return;
    dialog.returnValue = choice;
    if (dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  // ---------- Settings image helpers ----------

  function setBusyButtons(selector, busy) {
    $$(selector).forEach(function (button) {
      button.disabled = busy;
    });
  }

  async function handleSettingsAsset(kind, file) {
    if (!file || ui.assetBusy) return;
    ui.assetBusy = true;
    setBusyButtons('[data-action="choose-logo"], [data-action="choose-qris"]', true);
    setSaveStatus('saving');
    const isLogo = kind === 'logo';
    const imageKey = isLogo ? 'logoImageId' : 'qrisImageId';
    const oldImageId = state.settings[imageKey];
    let newRecord = null;
    try {
      const blob = isLogo ? await prepareLogo(file) : await prepareQris(file);
      newRecord = await addImageBlob(blob, file.name || kind);
      state.settings[imageKey] = newRecord.id;
      await saveNow();
      if (oldImageId && oldImageId !== newRecord.id) {
        try {
          await deleteImageId(oldImageId);
        } catch (cleanupError) {
          console.warn(cleanupError);
        }
      }
      ui.assetBusy = false;
      setBusyButtons('[data-action="choose-logo"], [data-action="choose-qris"]', false);
      renderApp();
      announce(t('a11y.imageUpdated'));
      showToast(t('a11y.imageUpdated'));
    } catch (error) {
      console.error(error);
      state.settings[imageKey] = oldImageId || null;
      if (newRecord) {
        try {
          await deleteImageId(newRecord.id);
        } catch (cleanupError) {
          console.warn(cleanupError);
        }
      }
      ui.assetBusy = false;
      setBusyButtons('[data-action="choose-logo"], [data-action="choose-qris"]', false);
      setSaveStatus('saved');
      showToast(error && error.message ? error.message : t('settings.imageSaveFailed'), 'error', 6500);
    }
  }

  async function removeSettingsAsset(kind) {
    const isLogo = kind === 'logo';
    const imageKey = isLogo ? 'logoImageId' : 'qrisImageId';
    const oldImageId = state.settings[imageKey];
    if (!oldImageId) return;
    const confirmed = await showConfirm({
      title: isLogo ? t('settings.removeLogoTitle') : t('settings.removeQrisTitle'),
      text: isLogo ? t('settings.removeLogoText') : t('settings.removeQrisText'),
      confirmLabel: t('settings.removeImageYes')
    });
    if (!confirmed) return;
    state.settings[imageKey] = null;
    try {
      await saveNow();
    } catch (error) {
      state.settings[imageKey] = oldImageId;
      return;
    }
    try {
      await deleteImageId(oldImageId);
    } catch (error) {
      console.warn('Gambar tidak dapat dihapus:', error);
    }
    renderApp();
    announce(t('a11y.imageRemoved'));
    showToast(t('a11y.imageRemoved'));
  }

  // ---------- Backup ----------

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result || ''));
      };
      reader.onerror = function () {
        reject(reader.error || new Error('Gagal membaca gambar.'));
      };
      reader.readAsDataURL(blob);
    });
  }

  function dataUrlToBlob(dataUrl) {
    if (typeof dataUrl !== 'string') throw new Error('Data gambar tidak valid.');
    const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(dataUrl);
    if (!match) throw new Error('Data gambar tidak valid.');
    const mime = match[1] || 'application/octet-stream';
    if (!/^image\/(png|jpe?g|webp)$/i.test(mime)) throw new Error('Jenis gambar tidak didukung.');
    let binary;
    if (match[2]) {
      binary = atob(match[3]);
    } else {
      binary = decodeURIComponent(match[3]);
    }
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mime });
  }

  function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 2000);
  }

  async function exportBackup() {
    if (ui.backupBusy) return;
    ui.backupBusy = true;
    setBusyButtons('[data-action="export-backup"], [data-action="import-backup"]', true);
    try {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
        await saveNow();
      }
      const records = await window.AppDB.getAllImages();
      const images = [];
      for (const record of records) {
        if (!record || !record.id || !(record.blob instanceof Blob)) continue;
        images.push({
          id: record.id,
          mime: record.mime || record.blob.type || 'image/jpeg',
          name: record.name || '',
          data: await blobToDataUrl(record.blob)
        });
      }
      const backup = {
        app: APP_ID,
        schemaVersion: SCHEMA_VERSION,
        appVersion: APP_VERSION,
        exportedAt: new Date().toISOString(),
        state: cloneData(state),
        images: images
      };
      const json = JSON.stringify(backup);
      const blob = new Blob([json], { type: 'application/json' });
      downloadFile(blob, 'cadangan-kasir-warung-' + localDateKey(new Date()) + '.json');
      showToast(t('settings.exported'));
    } catch (error) {
      console.error(error);
      showToast(t('settings.exportError'), 'error', 6500);
    } finally {
      ui.backupBusy = false;
      setBusyButtons('[data-action="export-backup"], [data-action="import-backup"]', false);
    }
  }

  function readJsonFile(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result || ''));
      };
      reader.onerror = function () {
        reject(reader.error || new Error('Gagal membaca file.'));
      };
      reader.readAsText(file);
    });
  }

  function pruneMissingImageRefs(nextState, imageIds) {
    const present = new Set(imageIds);
    if (!present.has(nextState.settings.logoImageId)) nextState.settings.logoImageId = null;
    if (!present.has(nextState.settings.qrisImageId)) nextState.settings.qrisImageId = null;
    nextState.menu.forEach(function (item) {
      if (item.imageId && !present.has(item.imageId)) item.imageId = null;
    });
  }

  async function importBackupFile(file) {
    if (!file || ui.backupBusy) return;
    if (!/\.json$/i.test(file.name || '') && file.type !== 'application/json') {
      showToast(t('settings.importFileType'), 'error');
      return;
    }
    ui.backupBusy = true;
    let parsed;
    let imageRecords;
    let nextState;
    try {
      const text = await readJsonFile(file);
      parsed = JSON.parse(text);
      if (!parsed || parsed.app !== APP_ID || !parsed.state || typeof parsed.state !== 'object') {
        throw new Error(t('settings.importInvalid'));
      }
      const rawImages = Array.isArray(parsed.images) ? parsed.images : [];
      imageRecords = [];
      for (const entry of rawImages) {
        if (!entry || !entry.id || typeof entry.data !== 'string') continue;
        const blob = dataUrlToBlob(entry.data);
        imageRecords.push({
          id: entry.id,
          blob: blob,
          mime: entry.mime || blob.type || 'image/jpeg',
          name: entry.name || '',
          createdAt: parsed.exportedAt || new Date().toISOString()
        });
      }
      nextState = normalizeState(parsed.state);
      pruneMissingImageRefs(
        nextState,
        imageRecords.map(function (record) {
          return record.id;
        })
      );
    } catch (error) {
      console.error(error);
      ui.backupBusy = false;
      showToast(error && error.message === t('settings.importInvalid')
        ? error.message
        : t('settings.importReadError'), 'error', 7000);
      return;
    }

    const confirmed = await showConfirm({
      title: t('settings.importConfirmTitle'),
      text: t('settings.importConfirmText'),
      confirmLabel: t('settings.importConfirmYes')
    });
    if (!confirmed) {
      ui.backupBusy = false;
      return;
    }

    setSaveStatus('saving');
    try {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      await saveQueue.catch(function () {});
      await window.AppDB.replaceAll(nextState, imageRecords);
      state = nextState;
      window.AppI18n.setLanguage(state.settings.lang);
      await rebuildImageUrls(imageRecords);
      ui.view = 'order';
      ui.search = '';
      ui.category = 'all';
      ui.adminUnlocked = false;
      ui.pinEditing = false;
      ui.pinTargetView = null;
      ui.paymentMethod = null;
      ui.cashRaw = '';
      ui.itemForm = null;
      ui.lastSaleId = null;
      ui.historyLimit = 30;
      ui.storageErrorShown = false;
      ui.backupBusy = false;
      setSaveStatus('saved');
      renderApp();
      window.scrollTo(0, 0);
      showToast(t('settings.imported'));
    } catch (error) {
      console.error(error);
      ui.backupBusy = false;
      saveOperation += 1;
      setSaveStatus('error');
      showToast(t('common.saveFailed'), 'error', 7000);
    }
  }

  // ---------- Navigation ----------

  function navigateTo(view, options) {
    const opts = options || {};
    const allowed = ['order', 'review', 'payment', 'success', 'menu', 'history', 'settings'];
    if (!allowed.includes(view)) return;

    if (PROTECTED_VIEWS.has(view) && isPinActive() && !ui.adminUnlocked && !opts.bypassPin) {
      openPinDialog(view);
      return;
    }

    if ((view === 'review' || view === 'payment') && !state.draft.lines.length) {
      showToast(t('pay.noOrder'));
      view = 'order';
    }
    if (view === 'success' && !ui.lastSaleId) {
      view = 'order';
    }

    if (PROTECTED_VIEWS.has(view)) {
      ui.adminUnlocked = true;
    } else {
      ui.adminUnlocked = false;
    }

    if (view === 'payment') {
      ui.paymentMethod = null;
      ui.cashRaw = '';
    }
    if (view === 'menu' || view === 'settings') {
      if (ui.view !== view) ui.pinEditing = false;
    }
    if (view === 'history') {
      // batasi daftar saat pertama kali dibuka
      if (ui.view !== 'history') ui.historyLimit = 30;
    }
    ui.view = view;
    renderApp();
    window.scrollTo(0, 0);
  }

  // ---------- Menu actions ----------

  async function deleteMenuItem(itemId) {
    const item = getMenuItem(itemId);
    if (!item) return;
    const confirmed = await showConfirm({
      title: t('menu.deleteTitle'),
      text: t('menu.deleteText', { name: item.name }),
      confirmLabel: t('menu.deleteYes')
    });
    if (!confirmed) return;
    const previousMenu = state.menu;
    const imageId = item.imageId;
    state.menu = state.menu.filter(function (candidate) {
      return candidate.id !== itemId;
    });
    try {
      await saveNow();
    } catch (error) {
      state.menu = previousMenu;
      return;
    }
    if (imageId) {
      try {
        await deleteImageId(imageId);
      } catch (error) {
        console.warn('Foto menu tidak dapat dihapus:', error);
      }
    }
    if (ui.itemForm && ui.itemForm.itemId === itemId) closeItemDialog();
    renderApp();
    showToast(t('menu.deleted'));
  }

  async function toggleSoldOut(itemId) {
    const item = getMenuItem(itemId);
    if (!item) return;
    const previous = item.soldOut;
    item.soldOut = !item.soldOut;
    try {
      await saveNow();
    } catch (error) {
      item.soldOut = previous;
      renderApp();
      return;
    }
    renderApp();
    showToast(
      item.soldOut
        ? t('menu.soldOutToast', { name: item.name })
        : t('menu.availableToast', { name: item.name })
    );
  }

  // ---------- PIN settings actions ----------

  function beginPinEditing() {
    ui.pinEditing = true;
    renderApp();
    window.setTimeout(function () {
      const input = $('#pin-new');
      if (input) input.focus();
    }, 40);
  }

  function cancelPinEditing() {
    ui.pinEditing = false;
    renderApp();
  }

  async function disablePin() {
    if (!isPinActive()) return;
    const confirmed = await showConfirm({
      title: t('settings.pinRemoveTitle'),
      text: t('settings.pinRemoveText'),
      confirmLabel: t('settings.pinRemoveYes')
    });
    if (!confirmed) return;
    const previous = {
      pinHash: state.settings.pinHash,
      pinSalt: state.settings.pinSalt,
      pinAlgo: state.settings.pinAlgo
    };
    state.settings.pinHash = null;
    state.settings.pinSalt = null;
    state.settings.pinAlgo = null;
    try {
      await saveNow();
    } catch (error) {
      Object.assign(state.settings, previous);
      return;
    }
    ui.pinEditing = false;
    renderApp();
    showToast(t('settings.pinRemoved'));
  }

  // ---------- Settings input actions ----------

  async function changeAppLanguage(language) {
    if (!window.AppI18n.hasLanguage(language) || language === state.settings.lang) return;
    state.settings.lang = language;
    window.AppI18n.setLanguage(language);
    renderApp();
    try {
      await saveNow();
    } catch (error) {
      /* status penyimpanan sudah ditampilkan */
    }
  }

  function updateBrandInHeader() {
    const brandNode = $('.brand-name');
    if (brandNode) brandNode.textContent = brandName();
    const titleMap = {
      order: t('order.pageTitle'),
      review: t('review.pageTitle'),
      payment: t('pay.pageTitle'),
      success: t('success.title'),
      menu: t('menu.pageTitle'),
      history: t('history.pageTitle'),
      settings: t('settings.pageTitle')
    };
    document.title = brandName() + ' — ' + (titleMap[ui.view] || t('common.appName'));
  }

  // ---------- Event handling ----------

  async function handleDocumentClick(event) {
    const confirmButton = event.target.closest('[data-confirm-choice]');
    if (confirmButton) {
      event.preventDefault();
      closeConfirmDialog(confirmButton.dataset.confirmChoice === 'yes' ? 'yes' : 'no');
      return;
    }

    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const action = target.dataset.action;
    const id = target.dataset.id;

    try {
      switch (action) {
        case 'nav':
          navigateTo(target.dataset.view);
          break;
        case 'reload-app':
          window.location.reload();
          break;
        case 'add-item': {
          const item = getMenuItem(id);
          if (!item || item.soldOut) break;
          if (item.addons && item.addons.length) openAddonDialog(item.id);
          else addItemToOrder(item.id, []);
          break;
        }
        case 'qty-minus': {
          const line = draftLineById(id);
          if (line && line.qty > 1) {
            setLineQuantity(id, line.qty - 1, target.dataset.focusKey);
          }
          break;
        }
        case 'qty-plus': {
          const line = draftLineById(id);
          if (line) setLineQuantity(id, line.qty + 1, target.dataset.focusKey);
          break;
        }
        case 'remove-line':
          removeLine(id);
          break;
        case 'close-addon-dialog':
          closeAddonDialog();
          break;
        case 'add-addon-row':
          addAddonEditorRow();
          break;
        case 'remove-addon-row': {
          const row = target.closest('[data-addon-row]');
          if (!row) break;
          row.remove();
          refreshAddonEditorEmptyState();
          break;
        }
        case 'jump-category':
          jumpToMenuCategory(target.dataset.category || 'all');
          break;
        case 'clear-search': {
          ui.search = '';
          const input = $('#menu-search');
          if (input) {
            input.value = '';
            input.focus();
          }
          const clearButton = $('.search-clear');
          if (clearButton) clearButton.hidden = true;
          renderCatalogOnly();
          break;
        }
        case 'review-order':
          navigateTo('review');
          break;
        case 'go-payment':
          navigateTo('payment');
          break;
        case 'back-to-menu':
          navigateTo('order');
          break;
        case 'back-to-review':
          navigateTo('review');
          break;
        case 'clear-order': {
          const confirmed = await showConfirm({
            title: t('order.clearConfirmTitle'),
            text: t('order.clearConfirmText'),
            confirmLabel: t('order.clearConfirmYes')
          });
          if (confirmed) await clearDraftAndRefresh();
          break;
        }
        case 'toggle-discount': {
          if (ui.busy) break;
          const kind = target.dataset.discount;
          if (DISCOUNT_TYPES.indexOf(kind) === -1) break;
          const option = discountOptionFor(kind);
          if (!option.available) break;
          state.draft.discountType = state.draft.discountType === kind ? null : kind;
          saveSoon(90);
          renderApp({ focusKey: 'discount-' + kind });
          announce(
            state.draft.discountType === kind
              ? t('discount.applied', { name: discountKindLabel(kind) })
              : t('discount.removed')
          );
          break;
        }
        case 'choose-method':
          if (ui.busy) break;
          ui.paymentMethod = target.dataset.method === 'qris' ? 'qris' : 'cash';
          renderApp({ focusKey: 'method-' + ui.paymentMethod });
          break;
        case 'quick-cash':
          setCashAmount(Number(target.dataset.amount));
          break;
        case 'exact-cash':
          setCashAmount(calculateTotals().total);
          break;
        case 'pay-cash':
          await completePayment('cash');
          break;
        case 'pay-qris':
          await completePayment('qris');
          break;
        case 'new-order':
          ui.lastSaleId = null;
          ui.paymentMethod = null;
          ui.cashRaw = '';
          navigateTo('order');
          break;
        case 'open-receipt':
          openReceiptDialog(id);
          break;
        case 'print-receipt':
          printReceipt();
          break;
        case 'close-receipt': {
          const dialog = $('#receipt-dialog');
          if (dialog && dialog.open) dialog.close();
          else if (dialog) dialog.removeAttribute('open');
          break;
        }
        case 'add-item-open':
          openItemDialog(null);
          break;
        case 'edit-item':
          openItemDialog(id);
          break;
        case 'delete-item':
          await deleteMenuItem(id);
          break;
        case 'toggle-sold-out':
          await toggleSoldOut(id);
          break;
        case 'close-item-dialog':
          if (!ui.itemForm || !ui.itemForm.saving) closeItemDialog();
          break;
        case 'choose-item-photo': {
          const input = $('#item-photo-file');
          if (input) {
            input.value = '';
            input.click();
          }
          break;
        }
        case 'remove-item-photo':
          removeItemPhoto();
          break;
        case 'show-more-history':
          ui.historyLimit += 30;
          renderApp();
          break;
        case 'edit-pin':
          beginPinEditing();
          break;
        case 'cancel-pin-edit':
          cancelPinEditing();
          break;
        case 'save-pin':
          await saveNewPin();
          break;
        case 'remove-pin':
          await disablePin();
          break;
        case 'choose-logo': {
          const input = $('#logo-file');
          if (input) {
            input.value = '';
            input.click();
          }
          break;
        }
        case 'remove-logo':
          await removeSettingsAsset('logo');
          break;
        case 'choose-qris': {
          const input = $('#qris-file');
          if (input) {
            input.value = '';
            input.click();
          }
          break;
        }
        case 'remove-qris':
          await removeSettingsAsset('qris');
          break;
        case 'export-backup':
          await exportBackup();
          break;
        case 'import-backup': {
          const input = $('#backup-file');
          if (input) {
            input.value = '';
            input.click();
          }
          break;
        }
        case 'close-pin':
          closePinDialog();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(error);
      showToast(t('common.errorGeneric'), 'error', 6000);
    }
  }

  function applyTaxPercentInput(target) {
    const raw = target.value.trim();
    const value = Number(raw);
    const error = $('#tax-error');
    if (raw === '') {
      state.settings.taxPercent = 0;
      if (error) error.hidden = true;
      saveSoon(180);
    } else if (Number.isFinite(value) && value >= 0 && value <= 100) {
      state.settings.taxPercent = value;
      if (error) error.hidden = true;
      saveSoon(180);
    } else if (error) {
      error.textContent = t('settings.taxInvalid');
      error.hidden = false;
    }
  }

  function setDiscountError(kind, message) {
    const error = $('#discount-' + kind + '-error');
    if (!error) return;
    error.textContent = message || '';
    error.hidden = !message;
  }

  function updateDiscountSettingUI(kind) {
    const config = state.settings.discounts[kind];
    if (!config) return;
    const fieldset = $('#discount-' + kind + '-fields');
    const typeSelect = $('#discount-' + kind + '-type');
    const valueInput = $('#discount-' + kind + '-value');
    const valueLabel = $('#discount-' + kind + '-value-label');
    const valueHint = $('#discount-' + kind + '-value-hint');
    const isAmount = config.type === 'amount';
    if (fieldset) fieldset.disabled = !config.enabled;
    if (typeSelect) typeSelect.value = config.type;
    if (valueInput) {
      valueInput.max = String(isAmount ? MAX_DISCOUNT_AMOUNT : 100);
      valueInput.step = isAmount ? '1' : '0.5';
      valueInput.inputMode = isAmount ? 'numeric' : 'decimal';
      valueInput.value = String(config.value);
    }
    if (valueLabel) {
      valueLabel.textContent = isAmount
        ? t('settings.discountValueAmount')
        : t('settings.discountValuePercent');
    }
    if (valueHint) {
      valueHint.textContent = isAmount
        ? t('settings.discountAmountHint')
        : t('settings.discountPercentHint');
    }
  }

  function applyDiscountValueInput(target) {
    const kind = target.dataset.discountValue;
    const config = state.settings.discounts[kind];
    if (!config) return;
    const raw = target.value.trim();
    const value = Number(raw);
    const isAmount = config.type === 'amount';
    if (raw === '') {
      config.value = 0;
      setDiscountError(kind, '');
      if (state.draft.discountType === kind) state.draft.discountType = null;
      saveSoon(180);
      return;
    }
    if (!Number.isFinite(value) || value < 0 || (isAmount ? value > MAX_DISCOUNT_AMOUNT : value > 100)) {
      setDiscountError(
        kind,
        isAmount ? t('settings.discountInvalidAmount') : t('settings.discountInvalidPercent')
      );
      return;
    }
    config.value = isAmount ? Math.round(value) : Math.round(value * 100) / 100;
    setDiscountError(kind, '');
    if (state.draft.discountType === kind && config.value <= 0) {
      state.draft.discountType = null;
    }
    saveSoon(180);
  }

  function toggleDiscountSetting(kind, enabled) {
    const config = state.settings.discounts[kind];
    if (!config) return;
    config.enabled = enabled;
    if (!enabled && state.draft.discountType === kind) {
      state.draft.discountType = null;
    }
    setDiscountError(kind, '');
    updateDiscountSettingUI(kind);
    saveSoon(120);
  }

  function changeDiscountType(kind, type) {
    const config = state.settings.discounts[kind];
    if (!config) return;
    const nextType = type === 'amount' ? 'amount' : 'percent';
    if (config.type === nextType) return;
    config.type = nextType;
    config.value = 0;
    if (state.draft.discountType === kind) state.draft.discountType = null;
    setDiscountError(kind, '');
    updateDiscountSettingUI(kind);
    saveSoon(120);
  }

  async function handleDocumentChange(event) {
    const target = event.target;
    try {
      if (target.matches('#logo-file')) {
        const file = target.files && target.files[0];
        if (file) await handleSettingsAsset('logo', file);
        target.value = '';
        return;
      }
      if (target.matches('#qris-file')) {
        const file = target.files && target.files[0];
        if (file) await handleSettingsAsset('qris', file);
        target.value = '';
        return;
      }
      if (target.matches('#backup-file')) {
        const file = target.files && target.files[0];
        if (file) await importBackupFile(file);
        target.value = '';
        return;
      }
      if (target.matches('[data-action="qty-input"]')) {
        const line = draftLineById(target.dataset.id);
        if (!line) return;
        const digits = target.value.replace(/[^0-9]/g, '');
        if (!digits) {
          target.value = line.qty;
          return;
        }
        setLineQuantity(line.id, parseQuantity(digits, line.qty), null);
        return;
      }
      if (target.matches('[data-setting="tax-enabled"]')) {
        state.settings.taxEnabled = target.checked;
        const fieldset = $('#tax-fields');
        if (fieldset) fieldset.disabled = !target.checked;
        saveSoon(120);
        return;
      }
      if (target.matches('[data-discount-toggle]')) {
        toggleDiscountSetting(target.dataset.discountToggle, target.checked);
        return;
      }
      if (target.matches('[data-discount-type]')) {
        changeDiscountType(target.dataset.discountType, target.value);
        return;
      }
      if (target.matches('[data-discount-value]')) {
        const kind = target.dataset.discountValue;
        const config = state.settings.discounts[kind];
        const error = $('#discount-' + kind + '-error');
        if (config && (!error || error.hidden)) target.value = String(config.value);
        return;
      }
      if (target.matches('[data-setting="language"]')) {
        await changeAppLanguage(target.value);
        return;
      }
      if (target.matches('#tax-percent')) {
        applyTaxPercentInput(target);
        return;
      }
      if (target.matches('#tax-label-input')) {
        state.settings.taxLabel = target.value;
        saveSoon(250);
        return;
      }
      if (target.matches('#restaurant-name')) {
        updateBrandInHeader();
        return;
      }
    } catch (error) {
      console.error(error);
      showToast(t('common.errorGeneric'), 'error', 6000);
    }
  }

  function handleDocumentInput(event) {
    const target = event.target;
    if (target.matches('[data-addon-price]')) {
      const digits = target.value.replace(/[^0-9]/g, '').slice(0, 12);
      target.value = digits ? formatNumber(Number(digits)) : '';
      return;
    }
    if (target.id === 'menu-search') {
      ui.search = target.value;
      if (ui.category !== 'all') {
        ui.category = 'all';
        setActiveCategoryChip('all');
      }
      const clearButton = $('.search-clear');
      if (clearButton) clearButton.hidden = !target.value;
      renderCatalogOnly();
      return;
    }
    if (target.matches('[data-note]')) {
      updateDraftNote(target.value);
      return;
    }
    if (target.id === 'cash-received') {
      const digits = target.value.replace(/[^0-9]/g, '').slice(0, 12);
      ui.cashRaw = digits;
      target.value = digits ? formatNumber(Number(digits)) : '';
      updateCashDisplay();
      return;
    }
    if (target.id === 'restaurant-name') {
      state.settings.restaurantName = target.value;
      updateBrandInHeader();
      saveSoon(220);
      return;
    }
    if (target.id === 'tax-percent') {
      applyTaxPercentInput(target);
      return;
    }
    if (target.matches('[data-discount-value]')) {
      applyDiscountValueInput(target);
      return;
    }
    if (target.id === 'tax-label-input') {
      state.settings.taxLabel = target.value;
      saveSoon(220);
      return;
    }
    if (target.id === 'pin-new' || target.id === 'pin-confirm') {
      const next = target.value.replace(/[^0-9]/g, '').slice(0, 8);
      if (target.value !== next) target.value = next;
      return;
    }
    if (target.id === 'pin-access') {
      const next = target.value.replace(/[^0-9]/g, '').slice(0, 8);
      if (target.value !== next) target.value = next;
    }
  }

  function handleDocumentKeydown(event) {
    if (event.key === 'Enter' && event.target.matches('[data-action="qty-input"]')) {
      event.preventDefault();
      event.target.blur();
    }
  }

  function bindEvents() {
    document.addEventListener('click', function (event) {
      handleDocumentClick(event);
    });
    document.addEventListener('change', function (event) {
      handleDocumentChange(event);
    });
    document.addEventListener('input', handleDocumentInput);
    document.addEventListener('keydown', handleDocumentKeydown);

    const confirmDialog = $('#confirm-dialog');
    if (confirmDialog) {
      confirmDialog.addEventListener('close', function () {
        const resolve = confirmResolver;
        confirmResolver = null;
        if (resolve) resolve(confirmDialog.returnValue === 'yes');
      });
    }

    const itemDialog = $('#item-dialog');
    if (itemDialog) {
      itemDialog.addEventListener('close', function () {
        if (itemPreviewUrl) {
          URL.revokeObjectURL(itemPreviewUrl);
          itemPreviewUrl = null;
        }
        if (ui.itemForm && !ui.itemForm.saving) ui.itemForm = null;
      });
    }

    const addonDialog = $('#addon-dialog');
    if (addonDialog) {
      addonDialog.addEventListener('close', function () {
        ui.addonItemId = null;
      });
    }

    const pinDialog = $('#pin-dialog');
    if (pinDialog) {
      pinDialog.addEventListener('close', function () {
        ui.pinTargetView = null;
        ui.pinChecking = false;
      });
    }

    window.addEventListener('pagehide', function () {
      if (!state) return;
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
        window.AppDB.setState(cloneData(state)).catch(function () {});
      }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
        saveNow().catch(function () {});
      }
    });
  }

  // ---------- Boot ----------

  function renderBootScreen() {
    const main = $('#app');
    if (!main) return;
    main.innerHTML =
      '<div class="boot-screen" role="status">' +
      '<div class="boot-mark" aria-hidden="true">' + icon('bowl') + '</div>' +
      '<p class="step-caption">' + escapeHTML(t('common.appName')) + '</p>' +
      '<h1>' + escapeHTML(t('common.loading')) + '</h1>' +
      '<p>' + escapeHTML(t('common.loadingData')) + '</p>' +
      '</div>';
  }

  function renderBootError() {
    const main = $('#app');
    if (!main) return;
    main.innerHTML =
      '<div class="boot-screen boot-error" role="alert">' +
      '<div class="boot-mark is-error" aria-hidden="true">' + icon('alert') + '</div>' +
      '<h1>' + escapeHTML(t('common.loadErrorTitle')) + '</h1>' +
      '<p>' + escapeHTML(t('common.loadErrorText')) + '</p>' +
      '<button type="button" class="btn btn-primary btn-large" data-action="reload-app">' +
      icon('receipt') + '<span>' + escapeHTML(t('common.retry')) + '</span></button>' +
      '</div>';
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(window.location.protocol)) return;
    const register = function () {
      navigator.serviceWorker.register('./sw.js').catch(function (error) {
        console.warn('Service worker tidak terdaftar:', error);
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }

  async function boot() {
    bindEvents();
    window.AppI18n.setLanguage(window.AppI18n.defaultLanguage);
    renderBootScreen();
    try {
      const rawState = await window.AppDB.getState();
      if (rawState) {
        state = normalizeState(rawState);
      } else {
        state = createDefaultState();
        await window.AppDB.setState(state);
      }
      window.AppI18n.setLanguage(state.settings.lang);
      await loadImagesFromDb();
      ui.saveStatus = 'saved';
      renderChrome();
      renderApp();
      registerServiceWorker();
    } catch (error) {
      console.error('Gagal memulai aplikasi:', error);
      renderBootError();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
