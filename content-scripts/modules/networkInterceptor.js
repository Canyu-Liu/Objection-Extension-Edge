// 网络拦截器模块
import { globalConfig } from './config.js';

let originalFetch = null;
let originalOpen = null;
let originalSend = null;
let interceptionActive = false;
const urlDecisionCache = new Map();
const URL_CACHE_TTL = 5000;
const URL_CACHE_LIMIT = 500;

// 检查 URL 是否应该被阻止
function checkIfUrlShouldBeBlocked(url) {
    return new Promise((resolve) => {
        try {
            chrome.runtime.sendMessage({
                type: 'checkUrlBlocking',
                url: url
            }, response => {
                if (chrome.runtime.lastError) {
                    console.error('检查URL阻止时出错:', chrome.runtime.lastError);
                    resolve(false);
                    return;
                }

                resolve(Boolean(response && response.blocked));
            });
        } catch (error) {
            console.error('检查URL阻止时发生异常:', error);
            resolve(false);
        }
    });
}

function shouldInterceptRequests() {
    return globalConfig.adBlockerEnabled && globalConfig.customRulesEnabled;
}

async function shouldBlockUrl(url) {
    const cached = urlDecisionCache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.blocked;
    }

    const blocked = await checkIfUrlShouldBeBlocked(url);
    if (urlDecisionCache.size >= URL_CACHE_LIMIT) {
        urlDecisionCache.delete(urlDecisionCache.keys().next().value);
    }
    urlDecisionCache.set(url, {
        blocked,
        expiresAt: Date.now() + URL_CACHE_TTL
    });
    return blocked;
}

export function clearNetworkDecisionCache() {
    urlDecisionCache.clear();
}

// 初始化网络请求拦截
export function interceptNetwork() {
    if (interceptionActive) {
        return;
    }

    originalFetch = window.fetch;
    window.fetch = async function(resource, init) {
        try {
            const url = typeof resource === 'string' ? resource : resource?.url;
            if (shouldInterceptRequests() && url) {
                const blocked = await shouldBlockUrl(url);
                if (blocked) {
                    console.log(`已阻止请求: ${url}`);
                    return new Response(new Blob(), { status: 200 });
                }
            }
        } catch (error) {
            console.error('检查 URL 时出错:', error);
        }

        return originalFetch.apply(this, arguments);
    };

    originalOpen = XMLHttpRequest.prototype.open;
    originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._objectionUrl = url;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(body) {
        const xhr = this;
        const url = xhr._objectionUrl;

        if (!shouldInterceptRequests() || !url) {
            return originalSend.call(xhr, body);
        }

        shouldBlockUrl(url).then(blocked => {
            if (blocked) {
                console.log(`已阻止 XHR 请求: ${url}`);
                xhr.abort();
                return;
            }

            originalSend.call(xhr, body);
        }).catch(error => {
            console.error('检查 XHR URL 时出错:', error);
            originalSend.call(xhr, body);
        });
    };

    interceptionActive = true;
}

// 移除网络请求拦截，恢复页面原始 API
export function stopNetworkInterception() {
    if (!interceptionActive) {
        return;
    }

    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.send = originalSend;

    originalFetch = null;
    originalOpen = null;
    originalSend = null;
    urlDecisionCache.clear();
    interceptionActive = false;
}