// 广告拦截器模块
import { globalConfig, processedElements } from './config.js';

// 检测元素是否为广告元素（通用函数，适用于iframe和普通DOM元素）
export function isAdElement(element) {
    if (!element || !element.tagName) return false;
    
    // 检查是否是iframe
    if (element.tagName === 'IFRAME') {
        return isAdIframe(element);
    }
    
    // 检查普通DOM元素是否匹配广告规则
    return checkIfElementMatchesAdRules(element);
}

// 检测iframe是否为广告iframe
function isAdIframe(iframe) {
    if (!iframe || iframe.tagName !== 'IFRAME') return false;
    
    const title = iframe.getAttribute('title') || '';
    const id = iframe.id || '';
    const name = iframe.getAttribute('name') || '';
    const src = iframe.src || '';
    
    // 检查iframe属性是否包含广告标识
    if (title.includes('Advertisement') || 
        title.includes('广告') || 
        id.includes('ad_iframe') || 
        id.includes('adframe') ||
        id.includes('ad-frame') ||
        id.includes('ad_') || 
        name.includes('ad_iframe') || 
        name.includes('adframe')) {
        
        console.log('识别到广告iframe:', {
            title,
            id,
            name,
            src: src.substring(0, 100) // 只显示URL的一部分
        });
        
        return true;
    }
    
    // 检查src是否包含广告链接特征
    const adUrlPatterns = [
        'doubleclick.net', 'googleadservices', 'googlesyndication',
        'adserver', 'adservice', 'adsystem', 'adnxs', 'adroll',
        'adform', 'admeld', 'adtech', '/ad/', '/ads/', '/advert',
        'pagead', 'cpro.baidu.com', 'pos.baidu.com', 'ad.doubleclick.net'
    ];
    
    if (adUrlPatterns.some(pattern => src.includes(pattern))) {
        console.log('通过URL识别到广告iframe:', src.substring(0, 100));
        return true;
    }
    
    // 检查元素的样式特征
    const width = iframe.width || iframe.style.width;
    const height = iframe.height || iframe.style.height;
    
    // 常见广告尺寸检查 (一些标准广告尺寸)
    const commonAdSizes = [
        '300x250', '336x280', '728x90', '160x600', '320x50',
        '300x600', '970x90', '970x250', '250x250', '200x200'
    ];
    
    const iframeSize = `${width}x${height}`.replace(/px/g, '');
    if (commonAdSizes.includes(iframeSize)) {
        console.log('通过尺寸识别到可能的广告元素:', iframeSize);
        return true;
    }
    
    return false;
}

// 处理文档点击事件
export function handleDocumentClick(event) {
    if (!globalConfig.adBlockerEnabled || !globalConfig.customRulesEnabled || globalConfig.adTriggerMode !== 'click') {
        return;
    }
    
    // 输出被点击元素的关键信息
    const clickedElement = event.target;
    console.log('===== 异议扩展广告拦截调试信息 =====');
    console.log('点击元素信息:', {
        标签名: clickedElement.tagName,
        ID: clickedElement.id || '无',
        类名: clickedElement.className || '无',
        文本内容: clickedElement.innerText ? (clickedElement.innerText.substring(0, 50) + (clickedElement.innerText.length > 50 ? '...' : '')) : '无',
        href: clickedElement.href || '无'
    });
    
    // 检查点击是否发生在广告覆盖层上
    if (clickedElement.classList.contains('objection-ad-overlay')) {
        handleAdOverlayClick(event, clickedElement);
        return;
    }
    
    // 检查元素是否匹配广告规则
    let isAd = false;
    if (globalConfig.customAdSelectors && globalConfig.customAdSelectors.length > 0) {
        isAd = isAdElement(clickedElement);
        console.log('广告规则匹配结果:', isAd ? '✓ 命中广告规则' : '✗ 未命中广告规则');
        
        if (isAd) {
            console.log('匹配的选择器:', findMatchingSelectors(clickedElement));
            
            // 如果是广告元素，先显示点击特效
            import('./objection.js').then(module => {
                const showObjectionEffect = module.showObjectionEffect;
                showObjectionEffect(event.clientX, event.clientY);
                
                // 延迟处理广告，等待特效播放完成
                setTimeout(() => {
                    processAdElement(clickedElement);
                }, 1000); // 与特效持续时间保持一致
            });
            
            return;
        }
    } else {
        console.log('警告: 没有配置自定义广告规则选择器');
    }
    
    // 如果点击的不是广告元素，查找并处理附近的广告（可选功能）
    if (globalConfig.scanOnClick) {
        findAndProcessAds();
    }
}

// 处理广告覆盖层点击
function handleAdOverlayClick(event, overlay) {
    event.preventDefault();
    event.stopPropagation();
    
    // 获取关联的广告元素
    const adElementId = overlay.getAttribute('data-for-element');
    const adElement = document.querySelector(`[data-objection-id="${adElementId}"]`);
    
    console.log('点击了广告覆盖层', {
        目标元素类型: adElement ? adElement.tagName : '未找到',
        ID: adElement ? (adElement.id || '无') : '未找到'
    });
    
    // 播放特效
    import('./objection.js').then(module => {
        const showObjectionEffect = module.showObjectionEffect;
        showObjectionEffect(event.clientX, event.clientY);
        
        if (adElement && globalConfig.adTriggerMode === 'click') {
            // 延迟处理广告，等待特效播放完成
            setTimeout(() => {
                processAdElement(adElement);
                // 移除覆盖层
                overlay.parentElement?.removeChild(overlay);
            }, 1000); // 与特效持续时间保持一致
        }
    });
}

// 检查元素是否匹配广告规则
function checkIfElementMatchesAdRules(element) {
    if (!globalConfig.customAdSelectors || !globalConfig.customAdSelectors.length) {
        return false;
    }
    
    // 检查元素本身是否匹配
    if (matchesAnySelector(element, globalConfig.customAdSelectors)) {
        return true;
    }
    
    // 检查父元素是否匹配（最多向上查找5层）
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
        if (matchesAnySelector(parent, globalConfig.customAdSelectors)) {
            return true;
        }
        parent = parent.parentElement;
        depth++;
    }
    
    return false;
}

// 检查元素是否匹配任何选择器
function matchesAnySelector(element, selectors) {
    for (const selector of selectors) {
        try {
            if (element.matches(selector)) {
                return true;
            }
        } catch (error) {
            // 忽略无效选择器错误
        }
    }
    return false;
}

// 找出匹配的选择器
function findMatchingSelectors(element) {
    if (!globalConfig.customAdSelectors || !globalConfig.customAdSelectors.length) {
        return [];
    }
    
    const matchingSelectors = [];
    
    // 检查元素本身
    for (const selector of globalConfig.customAdSelectors) {
        try {
            if (element.matches(selector)) {
                matchingSelectors.push(selector);
            }
        } catch (error) {
            // 忽略无效选择器错误
        }
    }
    
    // 检查父元素（最多向上查找5层）
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
        for (const selector of globalConfig.customAdSelectors) {
            try {
                if (parent.matches(selector)) {
                    matchingSelectors.push(`父元素(${depth+1}层): ${selector}`);
                }
            } catch (error) {
                // 忽略无效选择器错误
            }
        }
        parent = parent.parentElement;
        depth++;
    }
    
    return matchingSelectors;
}

// 运行广告拦截器
export function runAdBlocker() {
    // 确保扩展配置允许广告拦截
    if (!globalConfig.adBlockerEnabled || !globalConfig.customRulesEnabled) {
        return;
    }
    
    console.log('正在运行广告拦截器:', {
        拦截方式: globalConfig.adRemovalMode,
        触发模式: globalConfig.adTriggerMode,
        自定义选择器数量: globalConfig.customAdSelectors?.length || 0
    });
    
    // 查找并处理广告
    findAndProcessAds();
    
    // 设置 MutationObserver 以监控 DOM 变化
    setupMutationObserver();
}

// 查找并处理所有广告
export function findAndProcessAds() {
    // 查找并处理自定义规则匹配的广告元素
    findAndProcessCustomRuleAds();
    
    // 查找并处理iframe广告
    findAndProcessIframeAds();
}

// 查找并处理自定义规则匹配的广告元素
function findAndProcessCustomRuleAds() {
    // 确保有选择器可用
    if (!globalConfig.customAdSelectors || !globalConfig.customAdSelectors.length) {
        return;
    }
    
    try {
        // 根据选择器查询广告元素
        const selector = globalConfig.customAdSelectors.join(', ');
        const adElements = document.querySelectorAll(selector);
        
        if (adElements.length > 0) {
            console.log(`找到 ${adElements.length} 个匹配自定义规则的广告元素`);
            
            // 处理每个广告元素
            adElements.forEach(element => {
                handleAdElement(element, true, false);
            });
        }
    } catch (error) {
        console.error('处理自定义规则广告元素时出错:', error);
    }
}

// 查找并处理iframe广告
function findAndProcessIframeAds() {
    const iframes = document.querySelectorAll('iframe');
    console.log(`页面上发现 ${iframes.length} 个iframe，正在检查是否为广告...`);
    
    iframes.forEach(iframe => {
        if (isAdIframe(iframe)) {
            handleAdElement(iframe, false, true);
        }
    });
}

// 统一处理广告元素（iframe或普通DOM元素）
function handleAdElement(element, isCustomRuleAd, isIframeAd) {
    // 如果已处理过，跳过
    if (processedElements.has(element)) return;
    
    // 标记为已处理
    processedElements.add(element);
    
    // 为元素添加唯一标识
    const elementId = element.id || Math.random().toString(36).substring(2, 10);
    element.setAttribute('data-objection-id', elementId);
    element.setAttribute('data-is-ad', 'true');
    
    // 根据触发模式处理
    if (globalConfig.adTriggerMode === 'auto') {
        // 自动模式下直接处理广告
        processAdElement(element);
    } else if (globalConfig.adTriggerMode === 'click') {
        // 点击模式下添加覆盖层
        addOverlayToAdElement(element, isCustomRuleAd, isIframeAd);
    }
}

// 为广告元素添加覆盖层
function addOverlayToAdElement(element, isCustomRuleAd, isIframeAd) {
    try {
        // 确保元素还在DOM中
        if (!element.parentElement) return;
        
        // 检查元素是否已有覆盖层
        const elementId = element.getAttribute('data-objection-id');
        const existingOverlay = document.querySelector(`.objection-ad-overlay[data-for-element="${elementId}"]`);
        if (existingOverlay) return;
        
        // 获取元素的尺寸和位置
        const rect = element.getBoundingClientRect();
        
        // 如果元素的父元素没有定位，添加相对定位
        const parentStyle = window.getComputedStyle(element.parentElement);
        if (parentStyle.position === 'static') {
            element.parentElement.style.position = 'relative';
        }
        
        // 创建覆盖层
        const overlay = document.createElement('div');
        overlay.className = 'objection-ad-overlay';
        overlay.setAttribute('data-for-element', elementId);
        overlay.setAttribute('data-is-custom-rule', isCustomRuleAd.toString());
        overlay.setAttribute('data-is-iframe', isIframeAd.toString());
        
        // 设置覆盖层样式
        overlay.style.position = 'absolute';
        overlay.style.top = (element.offsetTop || 0) + 'px';
        overlay.style.left = (element.offsetLeft || 0) + 'px';
        overlay.style.width = (element.offsetWidth || rect.width) + 'px';
        overlay.style.height = (element.offsetHeight || rect.height) + 'px';
        overlay.style.zIndex = '9999';
        overlay.style.cursor = 'pointer';
        overlay.style.backgroundColor = 'transparent';
        
        // 添加点击事件
        overlay.addEventListener('click', (event) => {
            handleAdOverlayClick(event, overlay);
        });
        
        // 添加覆盖层到元素的父元素
        element.parentElement.appendChild(overlay);
        
        console.log('成功为广告元素添加覆盖层:', {
            元素类型: element.tagName,
            ID: element.id || elementId,
            是自定义规则广告: isCustomRuleAd,
            是iframe广告: isIframeAd
        });
        
        // 监听元素大小变化，调整覆盖层尺寸
        if ('ResizeObserver' in window) {
            const resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    if (entry.target === element) {
                        overlay.style.top = (element.offsetTop || 0) + 'px';
                        overlay.style.left = (element.offsetLeft || 0) + 'px';
                        overlay.style.width = (element.offsetWidth || entry.contentRect.width) + 'px';
                        overlay.style.height = (element.offsetHeight || entry.contentRect.height) + 'px';
                    }
                }
            });
            
            // 观察元素尺寸变化
            resizeObserver.observe(element);
        }
    } catch (error) {
        console.error('为广告元素添加覆盖层时出错:', error);
    }
}

// 处理广告元素（统一处理函数）
function processAdElement(element) {
    try {
        const isIframe = element.tagName === 'IFRAME';
        console.log('正在处理广告元素:', {
            类型: isIframe ? 'iframe' : 'DOM元素',
            ID: element.id || '无',
            类名: element.className || '无',
            src: isIframe ? (element.src || '无').substring(0, 100) : '不适用',
            父元素标签: element.parentElement ? element.parentElement.tagName : '无'
        });
        
        // 获取元素尺寸
        const rect = element.getBoundingClientRect();
        const width = element.offsetWidth || rect.width || 300;
        const height = element.offsetHeight || rect.height || 250;
        
        // 检查并移除覆盖层
        const elementId = element.getAttribute('data-objection-id');
        const overlayElement = document.querySelector(`.objection-ad-overlay[data-for-element="${elementId}"]`);
        if (overlayElement) {
            overlayElement.parentElement?.removeChild(overlayElement);
        }
        
        switch (globalConfig.adRemovalMode) {
            case 'remove':
                // 直接移除元素
                element.remove();
                console.log('已移除广告元素');
                break;
                
            case 'image': {
                // 创建图像替换元素
                const replacementElement = createReplacementElement('image', width, height);
                
                // 替换元素
                replaceAdElement(element, replacementElement, width, height);
                break;
            }
                
            case 'placeholder': 
            default: {
                // 创建占位符替换元素
                const replacementElement = createReplacementElement('placeholder', width, height);
                
                // 替换元素
                replaceAdElement(element, replacementElement, width, height);
                break;
            }
        }
    } catch (error) {
        console.error('处理广告元素时出错:', error);
    }
}

// 创建替换元素
function createReplacementElement(type, width, height) {
    const element = document.createElement('div');
    element.className = 'objection-replacement-container';
    element.style.width = Math.max(width, 10) + 'px'; // 确保至少有10px的宽度
    element.style.height = Math.max(height, 10) + 'px'; // 确保至少有10px的高度
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.style.display = 'block'; // 确保显示为块级元素
    element.style.boxSizing = 'border-box'; // 确保尺寸包含内边距和边框
    
    // 添加替换内容
    const content = createAdReplacement(type, width, height);
    element.appendChild(content);
    
    return element;
}

// 替换广告元素
function replaceAdElement(original, replacement, width, height) {
    // 检查父元素是否为a标签
    const isParentAnchor = original.parentElement && original.parentElement.tagName === 'A';
    
    if (original.tagName === 'IFRAME' || isParentAnchor) {
        // 对于iframe或父元素为a标签的情况，替换整个元素
        const elementToReplace = isParentAnchor ? original.parentElement : original;
        
        // 如果要替换的元素有父元素，执行替换
        if (elementToReplace.parentElement) {
            console.log(`替换${isParentAnchor ? 'a标签中的广告元素' : 'iframe'}`);
            elementToReplace.parentElement.replaceChild(replacement, elementToReplace);
        }
    } else {
        // 处理普通DOM元素内容
        console.log('替换普通DOM元素内容');
        
        // 清空原始元素内容
        original.innerHTML = '';
        
        // 设置原始元素样式
        original.style.position = 'relative';
        original.style.overflow = 'hidden';
        original.style.width = width + 'px';
        original.style.height = height + 'px';
        original.style.display = 'block'; // 确保显示为块级元素
        
        // 阻止元素的点击事件
        original.style.pointerEvents = 'none';
        
        // 添加替换内容
        original.appendChild(replacement);
        
        // 为原始元素添加点击事件监听器，防止任何默认行为
        original.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            return false;
        }, true);
    }
    
    console.log(`广告元素已被替换为 ${globalConfig.adRemovalMode === 'image' ? '图像' : '占位符'}`);
}

// 设置 MutationObserver 监控 DOM 变化
export function setupMutationObserver() {
    if (!globalConfig.adBlockerEnabled || !globalConfig.customRulesEnabled || window._adBlockObserver) {
        return;
    }
    
    // 创建观察者
    window._adBlockObserver = new MutationObserver(function(mutations) {
        let needsCheck = false;
        
        // 检查是否有新元素添加
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                needsCheck = true;
                break;
            }
        }
        
        // 如果有新元素，重新运行广告检测
        if (needsCheck) {
            // 延迟处理，确保元素已完全加载
            setTimeout(findAndProcessAds, 300);
        }
    });
    
    // 开始观察
    window._adBlockObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('已设置 MutationObserver 监控 DOM 变化');
}

// 创建广告替换元素 - 通用函数，处理所有类型的广告元素
function createAdReplacement(type, width, height) {
    const container = document.createElement('div');
    container.className = `objection-ad-replacement objection-${type}`;
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    container.style.display = 'flex';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.zIndex = '9999'; // 确保在最上层
    
    if (type === 'image') {
        // 添加图像替换
        const bgImage = document.createElement('img');
        bgImage.src = chrome.runtime.getURL('images/fill.jpg');
        bgImage.style.width = '100%';
        bgImage.style.height = '100%';
        bgImage.style.objectFit = 'contain';
        bgImage.style.position = 'absolute';
        bgImage.style.top = '0';
        bgImage.style.left = '0';
        bgImage.style.zIndex = '1';
        bgImage.style.backgroundColor = '#f0f0f0';
        bgImage.style.display = 'block'; // 确保显示
        
        // 添加图像尺寸属性
        bgImage.width = Math.max(width, 10);
        bgImage.height = Math.max(height, 10);
        
        // 错误处理
        bgImage.onerror = () => {
            bgImage.style.display = 'none';
            container.style.backgroundColor = '#f0f0f0';
        };
        
        container.appendChild(bgImage);
        
        // 添加尺寸指示
        const sizeIndicator = document.createElement('div');
        sizeIndicator.style.position = 'absolute';
        sizeIndicator.style.bottom = '5px';
        sizeIndicator.style.right = '5px';
        sizeIndicator.style.fontSize = '10px';
        sizeIndicator.style.color = '#fff';
        sizeIndicator.style.backgroundColor = 'rgba(0,0,0,0.5)';
        sizeIndicator.style.padding = '2px 4px';
        sizeIndicator.style.borderRadius = '2px';
        sizeIndicator.style.zIndex = '2';
        sizeIndicator.textContent = `${Math.round(width)} × ${Math.round(height)}`;
        container.appendChild(sizeIndicator);
    } else {
        // 占位符替换
        container.style.backgroundColor = '#f0f0f0';
        container.style.border = '1px dashed #ccc';
        container.style.borderRadius = '4px';
        container.style.color = '#888';
        container.style.padding = '8px';
        container.style.boxSizing = 'border-box';
        container.style.flexDirection = 'column';
        
        // 添加图标和文本
        container.innerHTML = `
            <div style="font-size: 16px; margin-bottom: 5px;">🚫</div>
            <div>广告内容已被屏蔽</div>
            <div style="font-size: 10px; margin-top: 5px;">${Math.round(width)} × ${Math.round(height)}</div>
        `;
    }
    
    // 添加点击阻止
    container.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }, true);
    
    return container;
}