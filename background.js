// 记录已注入脚本的标签页
let injectedTabs = new Set();

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    // 移除 URL 变化时删除 injectedTabs 的逻辑，避免 spa 导航重复注入脚本
    // if (changeInfo.url) {
    //     console.log(`标签页 ${tabId} 的 URL 发生变化，清除 injectedTabs 记录。`);
    //     injectedTabs.delete(tabId);
    // }
    if (changeInfo.status === 'complete') {
        console.log(`标签页 ${tabId} 加载完成，尝试注入脚本。`);
        injectScript(tabId);
    }
});

// 监听新标签页创建
chrome.tabs.onCreated.addListener((tab) => {
    console.log(`新标签页创建，ID 为 ${tab.id}，尝试注入脚本。`);
    injectScript(tab.id);
});

// 修改后：仅在非同文档导航下清除 injectedTabs
chrome.webNavigation.onCommitted.addListener((details) => {
    // 对 full-page reload 或者正常的链接点击等全新加载才清除 injectedTabs
    if (details.frameId === 0 && 
       (details.transitionType === 'reload' || details.transitionType === 'link' || details.transitionType === 'typed')) {
        console.log(`标签页 ${details.tabId} 导航提交，transitionType 为 ${details.transitionType}，清除 injectedTabs 记录。`);
        injectedTabs.delete(details.tabId);
    }
});

// 注入内容脚本
// 跨文件通信：向目标标签页注入content.js并发送初始配置
function injectScript(tabId) {
    if (injectedTabs.has(tabId)) {
        console.log(`标签页 ${tabId} 已注入脚本，跳过。`);
        return;
    }

    chrome.tabs.get(tabId, function(tab) {
        if (chrome.runtime.lastError || !tab.url.startsWith('http')) {
            console.log(`标签页 ${tabId} 的 URL 不支持，跳过注入。`);
            return;
        }

        // 使用 URL 对象匹配整个域名
        const urlObj = new URL(tab.url);
        if (urlObj.hostname === "objection.yvfox.com") {
            console.log(`标签页 ${tabId} 属于排除域名 objection.yvfox.com，跳过注入。`);
            return;
        }

        const unsupportedProtocols = ['chrome://', 'chrome-extension://', 'about:'];

        if (unsupportedProtocols.some(protocol => tab.url.startsWith(protocol))) {
            console.log(`标签页 ${tabId} 使用不支持的协议，跳过注入。`);
            return;
        }

        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content-scripts/content.js']
        }).then(() => {
            console.log(`已向标签页 ${tabId} 注入内容脚本。`);
            injectedTabs.add(tabId);
            chrome.storage.sync.get({
                bubbleType: '0',
                bubbleSize: '10',
                isEnabled: false,
                adBlockerEnabled: false,
                adRemovalMode: 'placeholder'
            }, function(config) {
                sendMessageToTab(tabId, {
                    type: 'updateConfig',
                    config: config
                });
            });
        }).catch(err => {
            console.error(`向标签页 ${tabId} 注入内容脚本失败:`, err);
        });
    });
}

// 清理已移除的标签页记录
chrome.tabs.onRemoved.addListener((tabId) => {
    if (injectedTabs.has(tabId)) {
        console.log(`标签页 ${tabId} 已移除，清除 injectedTabs 记录。`);
        injectedTabs.delete(tabId);
    }
});

// 扩展安装/更新时初始化
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get({
        isEnabled: false
    }, function(items) {
        chrome.action.setBadgeText({
            text: items.isEnabled ? "ON" : "OFF"
        });
    });
});

// 监听存储变化
// 跨文件通信：将存储更改同步到所有已注入的标签页
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
        if (changes.isEnabled || 
            changes.bubbleType || 
            changes.bubbleSize || 
            changes.adBlockerEnabled || 
            changes.adRemovalMode) {
            console.log('存储发生变化，更新所有已注入的标签页。');
            injectedTabs.forEach(tabId => {
                chrome.tabs.get(tabId, function(tab) {
                    if (chrome.runtime.lastError || !tab) {
                        injectedTabs.delete(tabId);
                        return;
                    }

                    chrome.storage.sync.get({
                        bubbleType: '0',
                        bubbleSize: '100',
                        isEnabled: false,
                        adBlockerEnabled: false,
                        adRemovalMode: 'placeholder'
                    }, function(currentConfig) {
                        sendMessageToTab(tabId, {
                            type: 'updateConfig',
                            config: currentConfig
                        });

                        if (currentConfig.isEnabled === false) {
                            sendMessageToTab(tabId, { type: 'disable' });
                        }
                    });
                });
            });
        }
    }
});

// 处理来自popup和content script的消息
// 跨文件通信：处理配置更新
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'updateConfig') {
        console.log('收到 updateConfig 消息，更新存储。');
        chrome.storage.sync.set(message.config, () => {
            sendResponse({ status: 'success' });
        });
        return true;
    }
});

// 向标签页发送消息的通用函数
// 跨文件通信：统一的消息发送处理
function sendMessageToTab(tabId, message) {
    chrome.tabs.sendMessage(tabId, message, function(response) {
        if (chrome.runtime.lastError) {
            console.log(`向标签页 ${tabId} 发送消息失败:`, chrome.runtime.lastError);
        }
    });
}