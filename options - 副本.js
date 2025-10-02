const ALL_CURRENCIES = [
  "USD", "CNY", "JPY", "GBP", "EUR", "HKD", "CAD", "AUD", "CHF", "SGD",
  "KRW", "TWD", "THB", "MYR", "NZD", "INR", "RUB", "BRL", "MXN", "SAR"
];

const CURRENCY_DETAILS = {
  USD: { name: "美元", flag: "🇺🇸" },
  CNY: { name: "人民币", flag: "🇨🇳" },
  JPY: { name: "日元", flag: "🇯🇵" },
  GBP: { name: "英镑", flag: "🇬🇧" },
  EUR: { name: "欧元", flag: "🇪🇺" },
  HKD: { name: "港币", flag: "🇭🇰" },
  CAD: { name: "加元", flag: "🇨🇦" },
  AUD: { name: "澳元", flag: "🇦🇺" },
  CHF: { name: "瑞士法郎", flag: "🇨🇭" },
  SGD: { name: "新加坡元", flag: "🇸🇬" },
  KRW: { name: "韩元", flag: "🇰🇷" },
  TWD: { name: "新台币", flag: "🇹🇼" },
  THB: { name: "泰铢", flag: "🇹🇭" },
  MYR: { name: "马来西亚令吉", flag: "🇲🇾" },
  NZD: { name: "新西兰元", flag: "🇳🇿" },
  INR: { name: "印度卢比", flag: "🇮🇳" },
  RUB: { name: "俄罗斯卢布", flag: "🇷🇺" },
  BRL: { name: "巴西雷亚尔", flag: "🇧🇷" },
  MXN: { name: "墨西哥比索", flag: "🇲🇽" },
  SAR: { name: "沙特里亚尔", flag: "🇸🇦" }
};

const USER_LIST_STORAGE_KEY = "userCurrencyList";
const DEFAULT_DISPLAYED = ["USD", "CNY", "JPY", "GBP", "EUR", "HKD"];

let displayedCurrencies = [...DEFAULT_DISPLAYED];

function getCurrencyDetails(code) {
  return CURRENCY_DETAILS[code] || { name: code, flag: "🌐" };
}

function createListItem(code, isDisplayedList) {
  const li = document.createElement("li");
  li.className = "currency-item";

  const details = getCurrencyDetails(code);

  const info = document.createElement("div");
  info.className = "currency-item__info";

  const flag = document.createElement("span");
  flag.className = "currency-item__flag";
  flag.textContent = details.flag;
  flag.setAttribute("aria-hidden", "true");

  const text = document.createElement("div");
  text.className = "currency-item__text";

  const codeLabel = document.createElement("span");
  codeLabel.className = "currency-item__code";
  codeLabel.textContent = code;

  const nameLabel = document.createElement("span");
  nameLabel.className = "currency-item__name";
  nameLabel.textContent = details.name;

  text.appendChild(codeLabel);
  text.appendChild(nameLabel);

  info.appendChild(flag);
  info.appendChild(text);

  const button = document.createElement("button");
  button.dataset.code = code;

  if (isDisplayedList) {
    button.className = "currency-item__action remove-btn";
    button.textContent = code === "USD" ? "固定" : "移除";
    button.disabled = code === "USD";
    if (button.disabled) {
      button.setAttribute("title", "USD 为基准货币，无法移除");
    }
  } else {
    button.className = "currency-item__action add-btn";
    button.textContent = "添加";
  }

  li.appendChild(info);
  li.appendChild(button);
  return li;
}

function renderCurrencyLists() {
  const displayedListEl = document.getElementById("displayed-list");
  const availableListEl = document.getElementById("available-list");

  if (!displayedListEl || !availableListEl) {
    return;
  }

  displayedListEl.innerHTML = "";
  availableListEl.innerHTML = "";

  const displayedSet = new Set(displayedCurrencies);

  displayedCurrencies.forEach((code) => {
    const item = createListItem(code, true);
    displayedListEl.appendChild(item);
  });

  ALL_CURRENCIES.forEach((code) => {
    if (!displayedSet.has(code)) {
      const item = createListItem(code, false);
      availableListEl.appendChild(item);
    }
  });
}

async function persistDisplayedCurrencies() {
  try {
    await chrome.storage.local.set({ [USER_LIST_STORAGE_KEY]: displayedCurrencies });
  } catch (error) {
    console.error("保存货币列表失败", error);
  }
}

async function handleMoveCurrency(currencyCode, type) {
  if (!currencyCode || currencyCode === "USD" && type === "remove") {
    return;
  }

  const stored = await chrome.storage.local.get(USER_LIST_STORAGE_KEY);
  const userList = Array.isArray(stored[USER_LIST_STORAGE_KEY])
    ? stored[USER_LIST_STORAGE_KEY].filter((code) => ALL_CURRENCIES.includes(code))
    : [...DEFAULT_DISPLAYED];

  displayedCurrencies = userList;

  if (type === "remove") {
    displayedCurrencies = displayedCurrencies.filter((code) => code !== currencyCode);
  } else if (type === "add") {
    if (!displayedCurrencies.includes(currencyCode)) {
      displayedCurrencies.push(currencyCode);
    }
  }

  if (!displayedCurrencies.includes("USD")) {
    displayedCurrencies.unshift("USD");
  }

  await persistDisplayedCurrencies();
  await loadOptions();
}

async function loadOptions() {
  try {
    const stored = await chrome.storage.local.get(USER_LIST_STORAGE_KEY);
    const userList = stored[USER_LIST_STORAGE_KEY];

    if (Array.isArray(userList) && userList.length > 0) {
      displayedCurrencies = userList.filter((code) => ALL_CURRENCIES.includes(code));
      if (!displayedCurrencies.includes("USD")) {
        displayedCurrencies.unshift("USD");
      }
    } else {
      displayedCurrencies = [...DEFAULT_DISPLAYED];
      await persistDisplayedCurrencies();
    }
  } catch (error) {
    console.error("加载货币列表失败", error);
    displayedCurrencies = [...DEFAULT_DISPLAYED];
  }

  renderCurrencyLists();
}

function handleDelegatedClick(event) {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.classList.contains("add-btn")) {
    const code = target.dataset.code;
    handleMoveCurrency(code, "add");
  } else if (target.classList.contains("remove-btn")) {
    const code = target.dataset.code;
    handleMoveCurrency(code, "remove");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  document.body.addEventListener("click", handleDelegatedClick);
  loadOptions();
});
