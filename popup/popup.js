document.addEventListener('DOMContentLoaded', function() {
    // 获取所有UI元素的引用
    const bubbleSelect = document.getElementById('bubble-style');
    const sizeInput = document.getElementById('bubble-size');
    const toggleSwitch = document.getElementById('objection-switch');
    const headerLink = document.getElementById('header-link');
    const adBlockerSwitch = document.getElementById('ad-blocker-switch');
    const adModeGroup = document.getElementById('ad-mode-group');
    const adModePlaceholder = document.getElementById('ad-mode-placeholder');
    const adModeRemove = document.getElementById('ad-mode-remove');
    const adModeImage = document.getElementById('ad-mode-image');

    // 从存储中获取配置并初始化界面
    // 跨文件通信：从 storage 获取配置数据
    chrome.storage.sync.get({
        bubbleType: '0',      // 气泡类型：0-异议，1-等等，2-看招，3-随机
        bubbleSize: '10',     // 气泡大小
        isEnabled: false,     // 扩展开关状态
        adBlockerEnabled: false, // 广告拦截功能开关状态
        adRemovalMode: 'placeholder' // 广告处理方式: placeholder-占位符, remove-直接删除, image-图片替换
    }, function(items) {
        bubbleSelect.value = items.bubbleType;
        sizeInput.value = items.bubbleSize;
        toggleSwitch.checked = items.isEnabled;
        adBlockerSwitch.checked = items.adBlockerEnabled;
        
        // 设置广告处理方式单选按钮状态
        if (items.adRemovalMode === 'placeholder') {
            adModePlaceholder.checked = true;
        } else if (items.adRemovalMode === 'remove') {
            adModeRemove.checked = true;
        } else if (items.adRemovalMode === 'image') {
            adModeImage.checked = true;
        }

        // 如果广告拦截开启，显示处理方式选项
        adModeGroup.style.display = items.adBlockerEnabled ? 'block' : 'none';

        updateExtensionState(items.isEnabled);
    });

    // 发送配置更新到 background.js
    // 跨文件通信：将新的配置发送给 background.js，由其转发给 content.js
    function sendConfig() {
        // 获取当前选中的广告处理方式
        let currentAdMode = 'placeholder';
        if (adModeRemove.checked) {
            currentAdMode = 'remove';
        } else if (adModeImage.checked) {
            currentAdMode = 'image';
        }

        const config = {
            bubbleType: bubbleSelect.value,
            bubbleSize: sizeInput.value,
            isEnabled: toggleSwitch.checked,
            adBlockerEnabled: adBlockerSwitch.checked,
            adRemovalMode: currentAdMode
        };

        chrome.runtime.sendMessage({ type: 'updateConfig', config: config }, function(response) {
            if (response && response.status === 'success') {
                updateExtensionState(config.isEnabled);
            }
        });
    }

    // 更新扩展图标状态
    function updateExtensionState(isEnabled) {
        chrome.action.setBadgeText({
            text: isEnabled ? "ON" : "OFF"
        });
    }

    // 处理广告拦截开关变化，显示/隐藏广告处理方式选项
    function handleAdBlockerChange(isEnabled) {
        adModeGroup.style.display = isEnabled ? 'block' : 'none';
    }

    // 各种事件监听器设置
    bubbleSelect.addEventListener('change', function() {
        sendConfig();
    });

    sizeInput.addEventListener('change', function() {
        sendConfig();
    });

    toggleSwitch.addEventListener('change', function() {
        sendConfig();
        updateExtensionState(this.checked);
    });

    // 添加广告拦截开关的事件监听
    adBlockerSwitch.addEventListener('change', function() {
        handleAdBlockerChange(this.checked);
        sendConfig();
    });

    // 添加广告处理方式单选按钮的事件监听
    adModePlaceholder.addEventListener('change', function() {
        if (this.checked) sendConfig();
    });

    adModeRemove.addEventListener('change', function() {
        if (this.checked) sendConfig();
    });
    
    adModeImage.addEventListener('change', function() {
        if (this.checked) sendConfig();
    });

    headerLink.addEventListener('click', function(event) {
        event.preventDefault();
        chrome.tabs.create({
            url: "https://objection.yvfox.com/"
        });
    });
});