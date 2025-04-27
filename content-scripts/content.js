(function() {
    // 如果脚本已注入则退出，防止重复初始化
    // if (window.__objectionInjected) {
    //     console.warn("Objection 扩展已注入，跳过重复初始化。");
    //     return;
    // }
    window.__objectionInjected = true;

    // 添加抖动动画样式
    if (!document.getElementById('shake-style')) {
        document.head.appendChild(
            Object.assign(document.createElement('style'), {
                id: 'shake-style',
                innerHTML: `
                    @keyframes shake {
                        0% { transform: translate(calc(-50% + 1px), calc(-50% + 1px)) rotate(0deg); }
                        10% { transform: translate(calc(-50% - 1px), calc(-50% - 2px)) rotate(-1deg); }
                        20% { transform: translate(calc(-50% - 3px), -50%) rotate(1deg); }
                        30% { transform: translate(calc(-50% + 3px), calc(-50% + 2px)) rotate(0deg); }
                        40% { transform: translate(calc(-50% + 1px), calc(-50% - 1px)) rotate(1deg); }
                        50% { transform: translate(calc(-50% - 1px), calc(-50% + 2px)) rotate(-1deg); }
                        60% { transform: translate(calc(-50% - 3px), calc(-50% + 1px)) rotate(0deg); }
                        70% { transform: translate(calc(-50% + 3px), calc(-50% + 1px)) rotate(-1deg); }
                        80% { transform: translate(calc(-50% - 1px), calc(-50% - 1px)) rotate(1deg); }
                        90% { transform: translate(calc(-50% + 1px), calc(-50% + 2px)) rotate(0deg); }
                        100% { transform: translate(calc(-50% + 1px), calc(-50% - 2px)) rotate(-1deg); }
                    }
                    .shake {
                        animation: shake 0.5s;
                        animation-iteration-count: 1;
                    }
                    .objection-ad-blocked {
                        position: relative;
                        min-height: 50px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        background-color: #f8f9fa;
                        border: 1px dashed #ccc;
                        text-align: center;
                        color: #666;
                        font-size: 14px;
                        margin: 10px 0;
                    }
                `
            })
        );
    }
    
    // 当前配置存储
    let currentConfig = {
        bubbleType: '0',
        bubbleSize: '10',
        isEnabled: false,
        adBlockerEnabled: false,
        adRemovalMode: 'placeholder'
    };
    
    // 识别广告元素
    function isAdElement(element) {
        if (!element) return false;

        // 调试信息收集
        const debugInfo = {
            element: element.tagName,
            className: (typeof element.className === 'string') ? element.className : '',
            id: element.id || '',
            reason: null
        };

        // 专门检查iframe广告
        if (element.tagName === 'IFRAME') {
            const title = element.getAttribute('title') || '';
            const id = element.id || '';
            const name = element.getAttribute('name') || '';
            
            // 检查是否为广告iframe
            if (title.includes('Advertisement') || 
                title.includes('广告') || 
                id.includes('ad_iframe') || 
                id.includes('adframe') || 
                name.includes('ad_iframe') || 
                name.includes('adframe')) {
                debugInfo.reason = `广告iframe: title=${title}, id=${id}, name=${name}`;
                console.log('识别到广告元素:', debugInfo);
                return true;
            }
        }

        // 检查元素和其父元素的类名、ID和属性
        const checkElement = (el) => {
            if (!el) return false;

            // 获取元素的所有类名、ID和属性进行检查
            const className = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
            const id = el.id ? el.id.toLowerCase() : '';
            
            // 常见广告标识词 - 排除某些常见的误判词
            const adKeywords = [
                'ad-', '-ad', 'adsby', 'adcontainer', 'adslot', 'adunit', 
                'advertisement', 'googlead', 'adsense', 'adwords', 'doubleclick',
                'sponsor', 'sponsored', 'guanggao', '广告'
            ];
            // 移除了容易误判的通用词: ad, ads, adv, banner, promo, promotion, commercial

            // 检查类名
            if (adKeywords.some(keyword => className.includes(keyword))) {
                debugInfo.reason = `类名包含广告关键词: ${className}`;
                console.log('识别到广告元素:', debugInfo);
                return true;
            }

            // 检查ID
            if (adKeywords.some(keyword => id.includes(keyword))) {
                debugInfo.reason = `ID包含广告关键词: ${id}`;
                console.log('识别到广告元素:', debugInfo);
                return true;
            }

            // 检查特定属性
            if (el.hasAttribute('data-ad') || 
                el.hasAttribute('data-ad-client') || 
                el.hasAttribute('data-adtest') || 
                el.hasAttribute('data-ad-slot') ||
                el.hasAttribute('data-ad-layout') ||
                el.hasAttribute('data-ad-format')) {
                
                debugInfo.reason = `元素包含广告相关属性`;
                console.log('识别到广告元素:', debugInfo);
                return true;
            }

            // 检查标记为广告的特定元素
            if (el.getAttribute('aria-label') === '广告' || 
                el.textContent.trim() === '广告' ||
                el.textContent.trim() === 'Ad' ||
                el.textContent.trim() === 'Sponsored') {
                
                debugInfo.reason = `元素文本为广告标识: ${el.textContent.trim()}`;
                console.log('识别到广告元素:', debugInfo);
                return true;
            }

            return false;
        };

        // 检查当前元素
        if (checkElement(element)) {
            return true;
        }

        // 检查元素内部是否有广告标识
        const adLabels = element.querySelectorAll('span[role="text"], div[role="heading"], span.tHlp8d');
        for (let i = 0; i < adLabels.length; i++) {
            const label = adLabels[i];
            const text = label.textContent.toLowerCase().trim();
            if (text === '广告' || text === 'ad' || text === 'sponsored' || text === 'ads') {
                debugInfo.reason = `子元素包含广告文本: ${text}`;
                console.log('识别到广告元素:', debugInfo);
                return true;
            }
        }

        // 向上查找最多5层父元素
        let parent = element.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
            if (checkElement(parent)) {
                debugInfo.parentElement = parent.tagName;
                debugInfo.parentClass = parent.className;
                debugInfo.reason = `父元素(深度${depth+1})被识别为广告`;
                console.log('识别到广告元素:', debugInfo);
                return true;
            }
            parent = parent.parentElement;
            depth++;
        }

        // 百度广告特殊处理
        if (window.location.hostname.includes('baidu.com')) {
            // 检查百度搜索结果页的广告
            if (element.closest('.ec_wise_ad') || 
                element.closest('[data-ecimtimesign]') || 
                element.closest('.ec-result') ||
                element.closest('.ec_ad') ||
                element.closest('.ad-wrapper')) {
                
                debugInfo.reason = `百度广告特征`;
                console.log('识别到广告元素:', debugInfo);
                return true;
            }
            
            // 检查广告标志
            const adMarks = element.querySelectorAll('.c-icon-ad, .c-icon-xpglad, .vip-sign, .baprod-icon');
            if (adMarks && adMarks.length > 0) {
                debugInfo.reason = `包含百度广告图标`;
                console.log('识别到广告元素:', debugInfo);
                return true;
            }
        }
        
        // 谷歌广告特殊处理
        if (window.location.hostname.includes('google')) {
            // 检查谷歌搜索页广告
            if (element.closest('[data-text-ad]') || 
                element.closest('[data-sokoban-tracked]') ||
                element.closest('[data-dtld="true"]') ||
                element.closest('.ads-fr') ||
                element.closest('.ads-ad') ||
                element.closest('.commercial-unit') ||
                element.closest('.GoogleActiveViewElement') ||
                element.closest('.adsbygoogle')) {
                
                debugInfo.reason = `谷歌广告特征`;
                console.log('识别到广告元素:', debugInfo);
                return true;
            }
            
            // 搜索结果中的广告通常有特定的布局标记
            const parentDiv = element.closest('div[data-hveid]');
            if (parentDiv) {
                // 检查是否有广告标识
                const hasAdTag = Array.from(parentDiv.querySelectorAll('span, div')).some(el => {
                    const text = el.textContent.trim().toLowerCase();
                    return text === 'ad' || text === 'ads' || text === '广告' || text === 'sponsored';
                });
                
                if (hasAdTag) {
                    debugInfo.reason = `谷歌搜索结果中的广告`;
                    console.log('识别到广告元素:', debugInfo);
                    return true;
                }
            }
            
            // 检查顶部的广告链接
            if (element.closest('#tads, #tadsb')) {
                debugInfo.reason = `谷歌顶部广告区域`;
                console.log('识别到广告元素:', debugInfo);
                return true;
            }
        }
        
        // 检查URL中的广告特征
        if (element.tagName === 'A' || element.tagName === 'AREA') {
            const href = element.getAttribute('href') || '';
            const adUrlPatterns = [
                '/adclick', 
                '/pagead/', 
                'doubleclick.net', 
                'googleadservices',
                'googlesyndication',
                '/ads/',
                'cpro.baidu.com',
                'pos.baidu.com',
                'amazon-adsystem.com',
                'googleads',
                'adservice'
            ];
            // 移除了容易误判的通用模式：'/ad/'
            
            if (adUrlPatterns.some(pattern => href.includes(pattern))) {
                debugInfo.reason = `链接URL包含广告特征: ${href}`;
                console.log('识别到广告元素:', debugInfo);
                return true;
            }
            
            // 检查URL参数
            try {
                const url = new URL(href);
                if (url.searchParams.has('adurl') || 
                    url.searchParams.has('adid') || 
                    url.searchParams.has('adfrom') ||
                    url.pathname.includes('aclk')) {
                    
                    debugInfo.reason = `链接URL参数包含广告特征: ${href}`;
                    console.log('识别到广告元素:', debugInfo);
                    return true;
                }
            } catch (e) {
                // 忽略无效的URL
            }
        }

        return false;
    }
    
    // 删除广告元素
    function removeAdElement(element) {
        if (element && element.parentNode) {
            setTimeout(() => {
                try {
                    switch (currentConfig.adRemovalMode) {
                        case 'remove':
                            // 直接删除广告元素
                            element.parentNode.removeChild(element);
                            console.log('广告元素已直接移除');
                            break;
                            
                        case 'image':
                            // 使用图片替换广告元素
                            const imageReplacement = document.createElement('div');
                            imageReplacement.className = 'objection-ad-blocked';
                            imageReplacement.style.width = element.offsetWidth > 0 ? element.offsetWidth + 'px' : '100%';
                            imageReplacement.style.height = element.offsetHeight > 30 ? element.offsetHeight + 'px' : '100px';
                            imageReplacement.style.position = 'relative';
                            imageReplacement.style.overflow = 'hidden';
                            
                            // 添加背景图片 - 修复图片加载问题
                            const fillImageURL = chrome.runtime.getURL("images/fill.jpg");
                            console.log('使用图片替换广告，图片URL:', fillImageURL);
                            
                            const bgImage = document.createElement('img');
                            bgImage.src = fillImageURL;
                            bgImage.style.width = '100%';
                            bgImage.style.height = '100%';
                            bgImage.style.objectFit = 'contain'; // 使用 contain 模式，保持宽高比
                            bgImage.style.position = 'absolute';
                            bgImage.style.top = '0';
                            bgImage.style.left = '0';
                            bgImage.style.backgroundColor = '#f8f9fa'; // 添加背景色，让图片不填满时更美观
                            
                            // 添加一个错误处理，在图片加载失败时提供后备方案
                            bgImage.onerror = () => {
                                console.error('广告替换图片加载失败:', fillImageURL);
                                bgImage.style.display = 'none';
                                imageReplacement.style.backgroundColor = '#f0f0f0';
                            };
                            
                            // 移除了文字覆盖层，让图片完整显示
                            
                            imageReplacement.appendChild(bgImage);
                            element.parentNode.replaceChild(imageReplacement, element);
                            console.log('广告元素已被图片替换');
                            break;
                            
                        case 'placeholder':
                        default:
                            // 默认使用占位符替换广告
                            const placeholder = document.createElement('div');
                            placeholder.className = 'objection-ad-blocked';
                            placeholder.textContent = '广告已被异议！';
                            placeholder.style.width = element.offsetWidth > 0 ? element.offsetWidth + 'px' : '100%';
                            placeholder.style.height = element.offsetHeight > 30 ? element.offsetHeight + 'px' : '50px';
                            
                            // 替换广告元素
                            element.parentNode.replaceChild(placeholder, element);
                            console.log('广告元素已移除并替换为占位符');
                    }
                } catch (e) {
                    console.error('移除广告元素失败:', e);
                }
            }, 1000); // 延迟1秒后删除，让用户先看到特效
        }
    }
    
    // 检测并处理广告iframe
    function handleAdIframes() {
        if (!currentConfig.adBlockerEnabled) return;
        
        // 查找所有可能的广告iframe
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            const title = iframe.getAttribute('title') || '';
            const id = iframe.id || '';
            const name = iframe.getAttribute('name') || '';
            
            // 识别广告iframe
            if (title.includes('Advertisement') || 
                title.includes('广告') || 
                id.includes('ad_iframe') || 
                id.includes('adframe') || 
                name.includes('ad_iframe') || 
                name.includes('adframe')) {
                
                // 对iframe添加覆盖层拦截点击
                const overlay = document.createElement('div');
                overlay.style.position = 'absolute';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.zIndex = '1000';
                overlay.style.cursor = 'pointer';
                
                // 为iframe创建定位父元素（如果还没有）
                if (iframe.parentElement.style.position === '') {
                    iframe.parentElement.style.position = 'relative';
                }
                
                // 添加点击事件
                overlay.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // 显示异议特效
                    showObjection(e);
                    
                    // 删除广告iframe
                    removeAdElement(iframe);
                });
                
                // 添加覆盖层到父元素
                iframe.parentElement.appendChild(overlay);
                console.log('已为广告iframe添加覆盖层');
            }
        });
    }
    
    // 接收来自 background.js 的消息
    // 跨文件通信：处理配置更新和禁用命令
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        if (message.type === 'updateConfig') {
            const prevAdBlockerEnabled = currentConfig.adBlockerEnabled;
            currentConfig = { ...currentConfig, ...message.config };
    
            // 根据扩展开关状态添加或移除点击事件监听
            if (currentConfig.isEnabled) {
                document.addEventListener("click", handleClick);
            } else {
                document.removeEventListener("click", handleClick);
            }
            
            // 如果广告拦截状态发生变化，处理iframe
            if (prevAdBlockerEnabled !== currentConfig.adBlockerEnabled && currentConfig.adBlockerEnabled) {
                handleAdIframes();
            }
            
            sendResponse({ status: 'config updated' });
        } else if (message.type === 'disable') {
            currentConfig.isEnabled = false;
            document.removeEventListener("click", handleClick);
            sendResponse({ status: 'disabled' });
        }
        return true;
    });
    
    // 处理点击事件
    function handleClick(event) {
        // 如果扩展被禁用，直接返回
        if (!currentConfig.isEnabled) {
            return;
        }
        
        // 如果启用了广告拦截功能，检查是否点击了广告
        if (currentConfig.adBlockerEnabled) {
            const clickedElement = event.target;
            
            // 处理链接元素或其祖先元素
            let adElement = null;
            let element = clickedElement;
            
            // 向上查找最多5层祖先元素，检查是否有广告元素
            let depth = 0;
            while (element && depth < 5) {
                // 如果当前元素是广告
                if (isAdElement(element)) {
                    adElement = element;
                    break;
                }
                
                // 如果是链接，且链接指向广告
                if (element.tagName === 'A') {
                    const href = element.getAttribute('href') || '';
                    if (href.includes('/adclick') || 
                        href.includes('/pagead/') || 
                        href.includes('doubleclick') || 
                        href.includes('googleadservices') ||
                        href.includes('ad.doubleclick.net') ||
                        href.includes('/ad/') ||
                        href.includes('cpro.baidu.com')) {
                        adElement = element;
                        break;
                    }
                }
                
                element = element.parentElement;
                depth++;
            }
            
            // 如果找到广告元素
            if (adElement) {
                event.preventDefault();
                event.stopPropagation();
                
                // 在广告位置显示特效
                showObjection(event);
                
                // 删除广告元素
                removeAdElement(adElement);
                return;
            }
            
            // 如果开启了广告拦截功能，但点击的不是广告，则不显示特效
            return;
        }
        
        // 如果未启用广告拦截功能，则对所有点击显示特效
        showObjection(event);
    }
    
    // 显示异议气泡
    function showObjection(event) {
        console.log('showObjection');
        if (!currentConfig.isEnabled) {
            return;
        }
    
        const img = document.createElement("img");
        let audio = new Audio();
    
        switch (currentConfig.bubbleType) {
            case '1':
                img.src = chrome.runtime.getURL("./images/jp_holdit.png");
                audio.src = chrome.runtime.getURL("./audio/phoenix_wright_holdit_jp.wav");
                break;
            case '2':
                img.src = chrome.runtime.getURL("./images/jp_takethat.png");
                audio.src = chrome.runtime.getURL("./audio/phoenix_wright_takethat_jp.wav");
                break;
            case '3':
                const imagesArr = ["jp_objection.png", "jp_holdit.png", "jp_takethat.png"];
                const randomImage = imagesArr[Math.floor(Math.random() * imagesArr.length)];
                img.src = chrome.runtime.getURL(`./images/${randomImage}`);
                switch (randomImage) {
                    case "jp_objection.png":
                        audio.src = chrome.runtime.getURL("./audio/phoenix_wright_objection_jp.wav");
                        break;
                    case "jp_holdit.png":
                        audio.src = chrome.runtime.getURL("./audio/phoenix_wright_holdit_jp.wav");
                        break;
                    case "jp_takethat.png":
                        audio.src = chrome.runtime.getURL("./audio/phoenix_wright_takethat_jp.wav");
                        break;
                }
                break;
            case '0':
            default:
                img.src = chrome.runtime.getURL("./images/jp_objection.png");
                audio.src = chrome.runtime.getURL("./audio/phoenix_wright_objection_jp.wav");
        }
        //将图像平移使其中心对齐鼠标点击位置
        img.style.transform = "translate(-50%, -50%)";
        img.style.position = "absolute";
        img.style.zIndex = 1000;
        img.style.width = `${currentConfig.bubbleSize * 10}px`;
    
        if (event) {
            img.style.left = event.pageX + "px";
            img.style.top = event.pageY + "px";
        } else {
            img.style.left = "50%";
            img.style.top = "50%";
        }
    
        img.classList.add('shake');
        document.body.appendChild(img);
    
        audio.play().catch(error => {
            console.error(error);
        });
    
        setTimeout(function () {
            if (img.parentNode) {
                document.body.removeChild(img);
            }
        }, 1000);
    }
    
    // 监听DOM变化，处理动态加载的广告iframe
    function setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            if (!currentConfig.adBlockerEnabled) return;
            
            let hasNewIframe = false;
            
            // 检查是否有新iframe添加
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    const addedNodes = Array.from(mutation.addedNodes);
                    for (const node of addedNodes) {
                        // 检查是否为iframe或包含iframe
                        if (node.nodeName === 'IFRAME' || 
                            (node.nodeType === Node.ELEMENT_NODE && node.querySelector('iframe'))) {
                            hasNewIframe = true;
                            break;
                        }
                    }
                }
                if (hasNewIframe) break;
            }
            
            // 如果发现新iframe，处理广告iframe
            if (hasNewIframe) {
                setTimeout(handleAdIframes, 500); // 稍微延迟以确保iframe加载完属性
            }
        });
        
        // 监视整个文档的变化
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
        
        return observer;
    }
    
    // 初始化触发器
    function initializeTrigger() {
        // 如果扩展开启，添加点击事件监听器
        if (currentConfig.isEnabled) {
            document.addEventListener("click", handleClick);
        }
        
        // 处理页面上的广告iframe
        if (currentConfig.adBlockerEnabled) {
            // 页面加载完成后处理广告iframe
            if (document.readyState === 'complete') {
                handleAdIframes();
            } else {
                window.addEventListener('load', handleAdIframes);
            }
            
            // 设置DOM变化监听，处理动态加载的广告
            setupMutationObserver();
        }
    }
    
    initializeTrigger();
})();