// 通信管理模块
import { globalConfig, updateConfig } from './config.js';
import { runAdBlocker, setupMutationObserver, handleDocumentClick, findAndProcessAds } from './adBlocker.js';
import { setupGlobalObjectionMode } from './objection.js';
import { interceptNetwork } from './networkInterceptor.js';

// 初始化通信
export function initializeCommunication() {
    // 接收来自 background 的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // 处理配置更新
        if (message.type === 'updateConfig') {
            console.log('内容脚本收到配置更新:', {
                bubbleType: message.config.bubbleType,
                adBlockerEnabled: message.config.adBlockerEnabled,
                hasCustomImage: !!message.config.customImage
            });
            
            // 更新全局配置
            updateConfig(message.config);
            
            // 如果广告拦截器已开启且触发方式为自动，则执行广告拦截
            if (globalConfig.adBlockerEnabled && globalConfig.adTriggerMode === 'auto' && globalConfig.customRulesEnabled) {
                runAdBlocker();
            }
            
            // 如果点击触发模式已启用，查找并处理广告元素（覆盖层会自动添加）
            if (globalConfig.adBlockerEnabled && globalConfig.adTriggerMode === 'click' && globalConfig.customRulesEnabled) {
                findAndProcessAds();
                // 在点击模式下也设置MutationObserver，以监听新元素
                setupMutationObserver();
            }
            
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
            
            // 如果广告拦截器已开启且触发方式为自动，则执行广告拦截
            if (globalConfig.adBlockerEnabled && globalConfig.adTriggerMode === 'auto' && globalConfig.customRulesEnabled) {
                runAdBlocker();
            }
            
            // 如果需要拦截 URL，添加 XHR 拦截
            if (globalConfig.adBlockerEnabled && globalConfig.customRulesEnabled) {
                interceptNetwork();
            }
            
            // 如果已启用点击触发，添加点击事件监听器（在捕获阶段）
            if (globalConfig.adBlockerEnabled && globalConfig.adTriggerMode === 'click' && globalConfig.customRulesEnabled) {
                // 设置点击事件监听
                document.addEventListener('click', handleDocumentClick, true);
                
                // 使用统一的处理逻辑查找广告元素并添加覆盖层
                findAndProcessAds();
                
                // 在点击模式下也设置MutationObserver，以监听新元素
                setupMutationObserver();
                
                console.log('已设置广告拦截点击监听和广告覆盖层，并启动DOM变化监听');
            }
            
            // 如果启用了全局异议模式，添加鼠标事件
            if (globalConfig.isEnabled) {
                setupGlobalObjectionMode();
            }
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