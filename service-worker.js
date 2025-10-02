console.log("Service Worker 启动了！");
const API_KEY = "c547e5a504f037e96d839ed4";
const BASE_CURRENCY = "USD";
const API_BASE_URL = "https://v6.exchangerate-api.com/v6";
const CACHE_KEY = "exchangeRates";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCacheExpiration(timestamp) {
  return Date.now() - timestamp;
}

async function readCacheEntry() {
  const stored = await chrome.storage.local.get(CACHE_KEY);
  return stored[CACHE_KEY] || null;
}

async function fetchAndCacheRates() {
  let cacheEntry = null;

  try {
    cacheEntry = await readCacheEntry();

    if (cacheEntry && cacheEntry.timestamp && getCacheExpiration(cacheEntry.timestamp) < CACHE_TTL_MS) {
      console.log("使用缓存数据");
      return cacheEntry.data;
    }

    const url = `${API_BASE_URL}/${API_KEY}/latest/${BASE_CURRENCY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();

    if (payload.result && payload.result !== "success") {
      console.error("汇率 API 返回非成功状态", payload);
      return null;
    }

    await chrome.storage.local.set({
      [CACHE_KEY]: {
        data: payload,
        timestamp: Date.now()
      }
    });

    console.log("已缓存最新汇率数据");
    return payload;
  } catch (error) {
    console.error("获取汇率数据失败", error);
    return cacheEntry ? cacheEntry.data || null : null;
  }
}

async function respondWithRates(sendResponse) {
  try {
    let data = await fetchAndCacheRates();

    if (!data) {
      const fallback = await readCacheEntry();
      data = fallback ? fallback.data : null;
    }

    if (data) {
      sendResponse({ data });
    } else {
      sendResponse({ error: "NO_DATA_AVAILABLE" });
    }
  } catch (error) {
    console.error("返回汇率数据时发生错误", error);
    sendResponse({ error: error && error.message ? error.message : String(error) });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === "GET_RATES") {
    respondWithRates(sendResponse);
    return true; // keep message channel open for async response
  }
  return undefined;
});

chrome.runtime.onInstalled.addListener(() => {
  fetchAndCacheRates();
});

chrome.runtime.onStartup?.addListener(() => {
  fetchAndCacheRates();
});
