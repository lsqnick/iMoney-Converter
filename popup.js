const BASE_CURRENCY = "USD";
const BASE_AMOUNT = 100;

const CURRENCY_DETAILS = {
  USD: { name: "美元", en_name: "US Dollar" },
  CNY: { name: "人民币", en_name: "Chinese Yuan" },
  JPY: { name: "日元", en_name: "Japanese Yen" },
  GBP: { name: "英镑", en_name: "British Pound" },
  EUR: { name: "欧元", en_name: "Euro" },
  HKD: { name: "港币", en_name: "Hong Kong Dollar" },
  CAD: { name: "加元", en_name: "Canadian Dollar" },
  AUD: { name: "澳元", en_name: "Australian Dollar" },
  CHF: { name: "瑞士法郎", en_name: "Swiss Franc" },
  SGD: { name: "新加坡元", en_name: "Singapore Dollar" },
  KRW: { name: "韩元", en_name: "South Korean Won" },
  TWD: { name: "新台币", en_name: "New Taiwan Dollar" },
  THB: { name: "泰铢", en_name: "Thai Baht" },
  MYR: { name: "马来西亚令吉", en_name: "Malaysian Ringgit" },
  NZD: { name: "新西兰元", en_name: "New Zealand Dollar" },
  INR: { name: "印度卢比", en_name: "Indian Rupee" },
  RUB: { name: "俄罗斯卢布", en_name: "Russian Ruble" },
  BRL: { name: "巴西雷亚尔", en_name: "Brazilian Real" },
  MXN: { name: "墨西哥比索", en_name: "Mexican Peso" },
  SAR: { name: "沙特里亚尔", en_name: "Saudi Riyal" }
};

const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_DETAILS);
const LANGUAGE_STORAGE_KEY = "languagePreference";
const USER_LIST_STORAGE_KEY = "userCurrencyList";
const DEFAULT_LANGUAGE = "en";
const FLAG_BASE_URL = "https://flagcdn.com/96x72/";

const DEFAULT_DISPLAYED = ["USD", "CNY", "JPY", "GBP", "EUR"];

const TRANSLATIONS = {
  appTitle: { en: "iMoney Converter", zh: "iMoney Converter" },
  subtitle: { en: "Live Rate Conversion", zh: "实时汇率转换" },
  loading: { en: "Loading exchange rates...", zh: "正在加载汇率数据..." },
  noData: { en: "Exchange rates unavailable.", zh: "暂无汇率数据。" },
  errorGeneric: { en: "Failed to load exchange rates.", zh: "加载汇率数据失败。" },
  errorRetry: { en: "Failed to load exchange rates. Please try again later.", zh: "加载汇率数据失败，请稍后再试。" },
  settingsAria: { en: "Manage currency settings", zh: "管理货币设置" },
  languageToggleAria: { en: "Switch to Chinese", zh: "切换为英文" },
  clearLabel: { en: "Clear amount", zh: "清空金额" }
};

let displayedCurrencies = [...DEFAULT_DISPLAYED];
let cachedRates = null;
let currentBaseCode = BASE_CURRENCY;
let currentBaseAmount = BASE_AMOUNT;
let currentBaseDisplay = BASE_AMOUNT.toFixed(2);
let currentLanguage = DEFAULT_LANGUAGE;
const inputRefs = new Map();

function getCurrencyDetails(code) {
  const fallback = { name: code, en_name: code };
  return CURRENCY_DETAILS[code] || fallback;
}

function buildFlagUrl(code) {
  const countryCode = code.substring(0, 2).toLowerCase();
  return `${FLAG_BASE_URL}${countryCode}.png`;
}

function getTranslation(key, lang = currentLanguage) {
  const entry = TRANSLATIONS[key];
  if (!entry) {
    return "";
  }
  return entry[lang] || entry[DEFAULT_LANGUAGE] || "";
}

function extractErrorMessage(error) {
  if (!error) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error.message === "string") {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch (_) {
    return String(error);
  }
}

function sendRatesRequest() {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ action: "GET_RATES" }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(extractErrorMessage(chrome.runtime.lastError)));
          return;
        }

        if (!response) {
          reject(new Error("No response from background"));
          return;
        }

        if (response.error) {
          reject(new Error(extractErrorMessage(response.error)));
          return;
        }

        resolve(response.data || response);
      });
    } catch (error) {
      reject(new Error(extractErrorMessage(error)));
    }
  });
}

function getConversionListElement() {
  return document.getElementById("conversion-list");
}

function renderLoadingState() {
  const container = getConversionListElement();
  if (!container) {
    return;
  }
  container.innerHTML = "";
  const placeholder = document.createElement("div");
  placeholder.className = "currency-placeholder";
  placeholder.textContent = getTranslation("loading");
  container.appendChild(placeholder);
}

function renderErrorState(message) {
  const container = getConversionListElement();
  if (!container) {
    return;
  }
  container.innerHTML = "";
  const placeholder = document.createElement("div");
  placeholder.className = "currency-placeholder";
  placeholder.textContent = message;
  container.appendChild(placeholder);
}

function getCurrencyDisplayName(details) {
  if (currentLanguage === "en") {
    return details.en_name || details.name;
  }
  return details.name || details.en_name || "";
}

function sanitizeCurrencyCode(code) {
  if (typeof code !== "string") {
    return null;
  }
  const value = code.trim().toUpperCase();
  return value ? value : null;
}

function normalizeCurrencyList(list) {
  if (!Array.isArray(list)) {
    return [...DEFAULT_DISPLAYED];
  }

  const normalized = [];
  list.forEach((code) => {
    const normalizedCode = sanitizeCurrencyCode(code);
    if (!normalizedCode) {
      return;
    }
    if (!SUPPORTED_CURRENCIES.includes(normalizedCode)) {
      return;
    }
    if (!normalized.includes(normalizedCode)) {
      normalized.push(normalizedCode);
    }
  });

  if (!normalized.includes(BASE_CURRENCY)) {
    normalized.unshift(BASE_CURRENCY);
  }

  return normalized.length ? normalized : [...DEFAULT_DISPLAYED];
}

async function loadDisplayedCurrencies() {
  try {
    const stored = await chrome.storage.local.get(USER_LIST_STORAGE_KEY);
    displayedCurrencies = normalizeCurrencyList(stored[USER_LIST_STORAGE_KEY]);
  } catch (error) {
    console.warn("Failed to load currency list", error);
    displayedCurrencies = [...DEFAULT_DISPLAYED];
  }
}

function renderCurrencyList(ratePayload) {
  const container = getConversionListElement();
  if (!container) {
    return;
  }

  container.innerHTML = "";
  inputRefs.clear();

  const conversionRates = ratePayload && ratePayload.conversion_rates ? ratePayload.conversion_rates : {};
  const baseRate = Number(conversionRates[BASE_CURRENCY]) || 1;

  displayedCurrencies.forEach((code) => {
    const details = getCurrencyDetails(code);
    const displayName = getCurrencyDisplayName(details);
    const rate = Number(conversionRates[code]);
    let amount = BASE_AMOUNT;

    if (code === BASE_CURRENCY) {
      amount = BASE_AMOUNT;
    } else if (Number.isFinite(rate) && rate > 0 && baseRate > 0) {
      amount = (BASE_AMOUNT * rate) / baseRate;
    }

    const item = document.createElement("article");
    item.className = "currency-item";

    const flagImg = document.createElement("img");
    flagImg.className = "currency-flag-img";
    flagImg.src = buildFlagUrl(code);
    flagImg.alt = `Flag of ${code}`;
    flagImg.loading = "lazy";

    const textRow = document.createElement("div");
    textRow.className = "currency-text";

    const codeLabel = document.createElement("span");
    codeLabel.className = "currency-code";
    codeLabel.textContent = "" + code;

    const nameLabel = document.createElement("span");
    nameLabel.className = "currency-name";
    nameLabel.textContent = displayName;

    textRow.appendChild(codeLabel);
    textRow.appendChild(nameLabel);

    const inputWrapper = document.createElement("div");
    inputWrapper.className = "input-wrapper";

    const input = document.createElement("input");
    input.className = "amount-input";
    input.type = "number";
    input.inputMode = "decimal";
    input.min = "0";
    input.step = "0.01";
    const rounded = amount.toFixed(2);
    input.value = rounded;
    input.dataset.code = code;
    input.dataset.lastValue = rounded;

    const clearBtn = document.createElement("span");
    clearBtn.className = "clear-amount";
    clearBtn.textContent = "×";
    clearBtn.setAttribute("role", "button");
    clearBtn.setAttribute("tabindex", "0");
    clearBtn.setAttribute("aria-label", getTranslation("clearLabel"));
    clearBtn.title = getTranslation("clearLabel");

    const clearValue = () => {
      const formattedZero = "0.00";
      input.value = formattedZero;
      input.dataset.lastValue = formattedZero;
      calculateAll(code, 0, formattedZero);
      input.focus();
    };

    clearBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      clearValue();
    });

    clearBtn.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        clearValue();
      }
    });

    inputWrapper.appendChild(input);
    inputWrapper.appendChild(clearBtn);

    item.appendChild(flagImg);
    item.appendChild(textRow);
    item.appendChild(inputWrapper);

    container.appendChild(item);
    inputRefs.set(code, input);
  });
}

function getValidRate(code) {
  if (!cachedRates) {
    return null;
  }
  const value = Number(cachedRates[code]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function calculateAll(sourceCode, sourceAmount, sourceDisplayValue = null) {
  if (!cachedRates) {
    return;
  }

  if (!Number.isFinite(sourceAmount)) {
    return;
  }

  const sourceRate = getValidRate(sourceCode);
  if (!sourceRate) {
    console.warn("Missing rate for", sourceCode);
    return;
  }

  currentBaseCode = sourceCode;
  currentBaseAmount = sourceAmount;
  currentBaseDisplay = sourceDisplayValue ?? sourceAmount.toFixed(2);

  inputRefs.forEach((input, code) => {
    const targetRate = getValidRate(code);
    if (!targetRate) {
      return;
    }

    if (code === sourceCode) {
      const formattedBase = sourceDisplayValue ?? sourceAmount.toFixed(2);
      input.value = formattedBase;
      input.dataset.lastValue = formattedBase;
      return;
    }

    const computed = sourceAmount * (targetRate / sourceRate);
    const formatted = Number.isFinite(computed) ? computed.toFixed(2) : "0.00";
    input.value = formatted;
    input.dataset.lastValue = formatted;
  });
}

function attachInputListeners() {
  inputRefs.forEach((input, code) => {
    input.addEventListener("input", (event) => {
      const raw = event.target.value.trim();
      if (raw === "") {
        return;
      }
      const amount = Number(raw);
      if (!Number.isFinite(amount)) {
        return;
      }
      calculateAll(code, amount, raw);
    });

    input.addEventListener("blur", (event) => {
      const raw = event.target.value.trim();
      if (raw === "") {
        calculateAll(currentBaseCode, currentBaseAmount, currentBaseDisplay);
        return;
      }

      const amount = Number(raw);
      if (!Number.isFinite(amount)) {
        const restore = event.target.dataset.lastValue ?? "0.00";
        event.target.value = restore;
        return;
      }

      calculateAll(code, amount);
    });
  });
}

function bindSettingsButton() {
  const button = document.getElementById("open-settings");
  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("options.html"));
    }
  });
}

function bindLanguageToggle() {
  const button = document.getElementById("language-toggle");
  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    switchLanguage();
  });

  button.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      switchLanguage();
    }
  });
}

function updateDocumentLangAttr() {
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";
}

function updateStaticTexts() {
  document.title = getTranslation("appTitle");
  const titleEl = document.querySelector(".popup__title");
  if (titleEl) {
    titleEl.textContent = getTranslation("appTitle");
  }

  const subtitleEl = document.querySelector(".popup__subtitle");
  if (subtitleEl) {
    subtitleEl.textContent = getTranslation("subtitle");
  }

  const settingsButton = document.getElementById("open-settings");
  if (settingsButton) {
    const settingsLabel = getTranslation("settingsAria");
    settingsButton.setAttribute("aria-label", settingsLabel);
    settingsButton.title = settingsLabel;
  }
}

function updateLanguageToggle() {
  const button = document.getElementById("language-toggle");
  if (!button) {
    return;
  }

  button.textContent = currentLanguage === "en" ? "中文" : "EN";
  button.setAttribute("aria-label", getTranslation("languageToggleAria"));
  button.title = getTranslation("languageToggleAria");
}

async function loadLanguagePreference() {
  try {
    const stored = await chrome.storage.local.get(LANGUAGE_STORAGE_KEY);
    const value = stored[LANGUAGE_STORAGE_KEY];
    if (value === "en" || value === "zh") {
      return value;
    }
  } catch (error) {
    console.warn("Failed to load language preference", error);
  }
  return DEFAULT_LANGUAGE;
}

async function saveLanguagePreference(language) {
  try {
    await chrome.storage.local.set({ [LANGUAGE_STORAGE_KEY]: language });
  } catch (error) {
    console.warn("Failed to save language preference", error);
  }
}

async function switchLanguage() {
  currentLanguage = currentLanguage === "en" ? "zh" : "en";
  await saveLanguagePreference(currentLanguage);
  updateDocumentLangAttr();
  updateStaticTexts();
  updateLanguageToggle();

  if (cachedRates) {
    renderCurrencyList({ conversion_rates: cachedRates });
    attachInputListeners();
    calculateAll(currentBaseCode, currentBaseAmount, currentBaseDisplay);
  } else {
    renderLoadingState();
  }
}

async function initializeLanguage() {
  currentLanguage = await loadLanguagePreference();
  updateDocumentLangAttr();
  updateStaticTexts();
  updateLanguageToggle();
  renderLoadingState();
}

async function loadRatesAndRender() {
  renderLoadingState();

  try {
    const rates = await sendRatesRequest();
    if (!rates || !rates.conversion_rates) {
      renderErrorState(getTranslation("noData"));
      return;
    }

    cachedRates = rates.conversion_rates;
    renderCurrencyList({ conversion_rates: cachedRates });
    attachInputListeners();
    calculateAll(BASE_CURRENCY, BASE_AMOUNT, BASE_AMOUNT.toFixed(2));
  } catch (error) {
    const message = extractErrorMessage(error);
    console.error("Failed to load exchange rates:", message, error);
    renderErrorState(getTranslation("errorRetry"));
  }
}

if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (changes[USER_LIST_STORAGE_KEY]) {
      loadDisplayedCurrencies()
        .then(() => {
          if (cachedRates) {
            renderCurrencyList({ conversion_rates: cachedRates });
            attachInputListeners();
            calculateAll(currentBaseCode, currentBaseAmount, currentBaseDisplay);
          } else {
            renderLoadingState();
          }
        })
        .catch((error) => {
          console.warn("Failed to refresh currency list", error);
        });
    }
  });
}
document.addEventListener("DOMContentLoaded", async () => {
  await initializeLanguage();
  await loadDisplayedCurrencies();
  bindSettingsButton();
  bindLanguageToggle();
  await loadRatesAndRender();
});














