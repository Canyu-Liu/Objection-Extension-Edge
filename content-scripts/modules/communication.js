// 通信管理模块
import { globalConfig, updateConfig } from './config.js';
import {
    runAdBlocker,
    setupMutationObserver,
    stopMutationObserver,
    setupAdBlockerClickMode,
    teardownAdBlockerClickMode,
    findAndProcessAds,
    handleDocumentClick
} from './adBlocker.js';
import { setupGlobalObjectionMode, teardownGlobalObjectionMode } from './objection.js';
import { interceptNetwork, stopNetworkInterception, clearNetworkDecisionCache } from './networkInterceptor.js';

function syncFeatureState(shouldRescan = false) {
    if (globalConfig.isEnabled) {
        setupGlobalObjectionMode();
    } else {
        teardownGlobalObjectionMode();
    }

    if (!globalConfig.adBlockerEnabled) {
        teardownAdBlockerClickMode();
        stopMutationObserver();
        stopNetworkInterception();
        return;
    }

    if (globalConfig.adTriggerMode === 'click') {
        setupAdBlockerClickMode();
        if (shouldRescan) {
            findAndProcessAds();
        }
        setupMutationObserver();
    } else {
        teardownAdBlockerClickMode();
        if (shouldRescan) {
            runAdBlocker();
        } else {
            setupMutationObserver();
        }
    }

    if (globalConfig.customRulesEnabled) {
        if (shouldRescan) {
            clearNetworkDecisionCache();
        }
        interceptNetwork();
    } else {
        stopNetworkInterception();
    }
}

// 初始化通信
export function initializeCommunication() {
    if (window._objectionCommunicationInitialized) {
        return;
    }
    window._objectionCommunicationInitialized = true;

    // 接收来自 background 的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // 处理配置更新
        if (message.type === 'updateConfig') {
            console.log('内容脚本收到配置更新:', {
                bubbleType: message.config.bubbleType,
                adBlockerEnabled: message.config.adBlockerEnabled,
                hasCustomImage: !!message.config.customImage
            });
            
            const changedKeys = Array.isArray(message.changedKeys)
                ? message.changedKeys
                : Object.keys(message.config);
            const shouldRescan = [
                'adBlockerEnabled',
                'adTriggerMode',
                'adRemovalMode',
                'customRulesEnabled',
                'customAdSelectors',
                'adFilterRules'
            ].some(key => changedKeys.includes(key));

            // 更新全局配置并同步所有功能生命周期
            updateConfig(message.config);
            syncFeatureState(shouldRescan);

            sendResponse({status: 'success'});
            return true;
        }
    });
    
    // 初始化时从 background 获取配置
    chrome.runtime.sendMessage({
        type: 'getConfig'
    }, (response) => {
        if (response && response.status === 'success') {
            // 更新全局配置
            updateConfig(response.config);
            
            console.log('内容脚本初始化配置:', {
                bubbleType: globalConfig.bubbleType,
                isEnabled: globalConfig.isEnabled,
                adBlockerEnabled: globalConfig.adBlockerEnabled,
                adTriggerMode: globalConfig.adTriggerMode,
                hasCustomImage: !!globalConfig.customImage,
                hasCustomAdSelectors: globalConfig.customAdSelectors?.length || 0
            });
            
            syncFeatureState(true);
        } else {
            console.error('未能获取配置。');
        }
    });
}

// 处理点击事件（高性能版本）
function handleIframeClickInterception(event) {
    // 检查是否应该处理该事件
    if (!globalConfig.adBlockerEnabled || !globalConfig.customRulesEnabled || globalConfig.adTriggerMode !== 'click') {
        return;
    }
    
    // 获取点击的元素
    const clickedElement = event.target;
    
    // 记录点击位置
    const clickX = event.clientX;
    const clickY = event.clientY;
    
    console.log('===== 异议扩展广告拦截调试信息 =====');
    console.log('点击元素信息:', {
        标签名: clickedElement.tagName,
        ID: clickedElement.id || '无',
        类名: clickedElement.className || '无',
        文本内容: clickedElement.innerText ? (clickedElement.innerText.substring(0, 50) + (clickedElement.innerText.length > 50 ? '...' : '')) : '无'
    });
    
    // 检查点击的是否为iframe或其容器
    let targetElement = clickedElement;
    let isIframeRelated = false;
    
    // 检查是否直接点击了iframe
    if (clickedElement.tagName === 'IFRAME') {
        isIframeRelated = true;
        console.log('直接点击了iframe元素');
    } 
    // 检查点击位置是否在任何iframe上方
    else {
        // 使用document.elementsFromPoint获取点击位置下的所有元素
        const elementsAtPoint = document.elementsFromPoint(clickX, clickY);
        for (const element of elementsAtPoint) {
            if (element.tagName === 'IFRAME') {
                targetElement = element;
                isIframeRelated = true;
                console.log('点击位置下方存在iframe元素');
                break;
            }
        }
    }
    
    // 如果是iframe相关的点击，输出iframe信息
    if (isIframeRelated) {
        console.log('iframe信息:', {
            ID: targetElement.id || '无',
            类名: targetElement.className || '无',
            源地址: targetElement.src || '无',
            尺寸: `${targetElement.width || 'auto'} x ${targetElement.height || 'auto'}`
        });
    }
    
    // 使用统一的文档点击处理函数处理
    handleDocumentClick(event);
}