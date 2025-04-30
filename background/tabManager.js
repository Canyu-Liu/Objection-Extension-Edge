// 标签页管理模块 - 处理标签页脚本注入和跟踪

import { centralConfig } from './config.js';
import { generateSelectorsForDomain } from './adBlocker.js';

// 已注入脚本的标签页集合
export const injectedTabs = new Set();

/**
 * 向标签页发送消息
 * @param {number} tabId - 标签页ID
 * @param {Object} message - 消息对象
 * @returns {Promise} - 消息发送结果Promise
 */
export function sendMessageToTab(tabId, message) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, message, function(response) {
            if (chrome.runtime.lastError) {
                console.log(`向标签页 ${tabId} 发送消息失败:`, chrome.runtime.lastError);
                resolve({ success: false, error: chrome.runtime.lastError });
            } else {
                resolve({ success: true, response });
            }
        });
    });
}

/**
 * 广播配置到所有已注入的标签页
 * @param {Object} configUpdates - 配置更新对象
 */
export function broadcastConfigToAllTabs(configUpdates = null) {
    injectedTabs.forEach(tabId => {
        chrome.tabs.get(tabId, function(tab) {
            if (chrome.runtime.lastError || !tab) {
                injectedTabs.delete(tabId);
                return;
            }

            try {
                // 获取当前网页域名
                const urlObj = new URL(tab.url);
                const domain = urlObj.hostname;
                
                // 为标签页准备配置
                const tabConfig = {...centralConfig};
                
                // 添加自定义过滤规则到配置
                if (tabConfig.adBlockerEnabled && tabConfig.customRulesEnabled) {
                    tabConfig.customAdSelectors = generateSelectorsForDomain(domain);
                }
                
                console.log(`向标签页 ${tabId} 发送配置更新:`, {
                    bubbleType: tabConfig.bubbleType,
                    hasCustomImage: !!tabConfig.customImage,
                    adBlockerEnabled: tabConfig.adBlockerEnabled,
                    adTriggerMode: tabConfig.adTriggerMode
                });
                
                // 发送配置
                sendMessageToTab(tabId, {
                    type: 'updateConfig',
                    config: tabConfig
                });
            } catch (error) {
                console.error(`向标签页 ${tabId} 发送配置时出错:`, error);
            }
        });
    });
}

/**
 * 注入内容脚本到标签页
 * @param {number} tabId - 标签页ID
 * @returns {Promise} - 脚本注入结果Promise
 */
export function injectScript(tabId) {
    if (injectedTabs.has(tabId)) {
        console.log(`标签页 ${tabId} 已注入脚本，跳过。`);
        return Promise.resolve({ alreadyInjected: true });
    }

    return new Promise((resolve) => {
        chrome.tabs.get(tabId, function(tab) {
            if (chrome.runtime.lastError || !tab.url.startsWith('http')) {
                console.log(`标签页 ${tabId} 的 URL 不支持，跳过注入。`);
                resolve({ success: false, reason: 'unsupported_url' });
                return;
            }

            // 使用 URL 对象匹配整个域名
            const urlObj = new URL(tab.url);
            if (urlObj.hostname === "objection.yvfox.com") {
                console.log(`标签页 ${tabId} 属于排除域名 objection.yvfox.com，跳过注入。`);
                resolve({ success: false, reason: 'excluded_domain' });
                return;
            }

            const unsupportedProtocols = ['chrome://', 'chrome-extension://', 'about:'];

            if (unsupportedProtocols.some(protocol => tab.url.startsWith(protocol))) {
                console.log(`标签页 ${tabId} 使用不支持的协议，跳过注入。`);
                resolve({ success: false, reason: 'unsupported_protocol' });
                return;
            }

            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content-scripts/content.js']
            }).then(() => {
                console.log(`已向标签页 ${tabId} 注入内容脚本。`);
                injectedTabs.add(tabId);
                
                try {
                    // 获取当前网页域名并准备配置
                    const domain = urlObj.hostname;
                    
                    // 为标签页准备配置
                    const tabConfig = {...centralConfig};
                    
                    // 添加自定义过滤规则到配置
                    if (tabConfig.adBlockerEnabled && tabConfig.customRulesEnabled) {
                      tabConfig.customAdSelectors = generateSelectorsForDomain(domain);
                    }
                    
                    console.log(`向标签页 ${tabId} 发送配置:`, {
                      bubbleType: tabConfig.bubbleType,
                      hasCustomImage: !!tabConfig.customImage,
                      adBlockerEnabled: tabConfig.adBlockerEnabled,
                      adTriggerMode: tabConfig.adTriggerMode
                    });
                    
                    // 发送配置
                    sendMessageToTab(tabId, {
                      type: 'updateConfig',
                      config: tabConfig
                    }).then(() => {
                      resolve({ success: true, injected: true });
                    });
                } catch (error) {
                    console.error(`向标签页 ${tabId} 发送配置时出错:`, error);
                    resolve({ success: false, error });
                }
            }).catch(err => {
                console.error(`向标签页 ${tabId} 注入内容脚本失败:`, err);
                resolve({ success: false, error: err });
            });
        });
    });
}

/**
 * 设置标签页相关的事件监听
 */
export function setupTabListeners() {
    // 监听标签页更新
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
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

    // 清理已移除的标签页记录
    chrome.tabs.onRemoved.addListener((tabId) => {
        if (injectedTabs.has(tabId)) {
            console.log(`标签页 ${tabId} 已移除，清除 injectedTabs 记录。`);
            injectedTabs.delete(tabId);
        }
    });
}