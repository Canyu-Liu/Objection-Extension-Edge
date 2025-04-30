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
    const adTriggerAuto = document.getElementById('ad-trigger-auto');
    const adTriggerClick = document.getElementById('ad-trigger-click');
    const advancedSettingsLink = document.getElementById('advanced-settings-link');

    // 从 background.js 获取配置并初始化界面
    function loadSettings() {
        chrome.runtime.sendMessage({ 
            type: 'getConfig'
        }, function(response) {
            if (response && response.status === 'success') {
                const config = response.config;
                
                // 设置界面元素状态
                bubbleSelect.value = config.bubbleType;
                sizeInput.value = config.bubbleSize;
                toggleSwitch.checked = config.isEnabled;
                adBlockerSwitch.checked = config.adBlockerEnabled;
                
                // 设置广告处理方式单选按钮状态
                if (config.adRemovalMode === 'placeholder') {
                    adModePlaceholder.checked = true;
                } else if (config.adRemovalMode === 'remove') {
                    adModeRemove.checked = true;
                } else if (config.adRemovalMode === 'image') {
                    adModeImage.checked = true;
                }
                
                // 设置广告拦截触发方式单选按钮状态
                if (config.adTriggerMode === 'auto') {
                    adTriggerAuto.checked = true;
                } else if (config.adTriggerMode === 'click') {
                    adTriggerClick.checked = true;
                }

                // 如果广告拦截开启，显示处理方式选项
                adModeGroup.style.display = config.adBlockerEnabled ? 'block' : 'none';
                
                // 更新扩展图标状态
                updateExtensionState(config.isEnabled || config.adBlockerEnabled);
                
                console.log('从 background 加载配置成功：', {
                    bubbleType: config.bubbleType,
                    adBlockerEnabled: config.adBlockerEnabled,
                    adTriggerMode: config.adTriggerMode
                });
            } else {
                console.error('从 background 加载配置失败');
            }
        });
    }

    // 向 background.js 发送配置更新
    function sendConfig() {
        // 获取当前选中的广告处理方式
        let currentAdMode = 'placeholder';
        if (adModeRemove.checked) {
            currentAdMode = 'remove';
        } else if (adModeImage.checked) {
            currentAdMode = 'image';
        }
        
        // 获取当前选中的广告拦截触发方式
        let currentAdTriggerMode = 'auto';
        if (adTriggerClick.checked) {
            currentAdTriggerMode = 'click';
        }

        const config = {
            bubbleType: bubbleSelect.value,
            bubbleSize: sizeInput.value,
            isEnabled: toggleSwitch.checked,
            adBlockerEnabled: adBlockerSwitch.checked,
            adRemovalMode: currentAdMode,
            adTriggerMode: currentAdTriggerMode
        };

        chrome.runtime.sendMessage({ 
            type: 'updateConfig', 
            config: config 
        }, function(response) {
            if (response && response.status === 'success') {
                console.log('配置更新成功');
                updateExtensionState(config.isEnabled || config.adBlockerEnabled);
            } else {
                console.error('配置更新失败:', response);
            }
        });
    }

    // 更新扩展图标状态
    function updateExtensionState(isAnyEnabled) {
        chrome.action.setBadgeText({
            text: isAnyEnabled ? "ON" : "OFF"
        });
    }

    // 处理广告拦截开关变化，显示/隐藏广告处理方式选项
    function handleAdBlockerChange(isEnabled) {
        adModeGroup.style.display = isEnabled ? 'block' : 'none';
        
        // 如果启用广告拦截，则禁用"异议所有网页"功能
        if (isEnabled && toggleSwitch.checked) {
            toggleSwitch.checked = false;
        }
    }
    
    // 处理"异议所有网页"开关变化
    function handleToggleSwitchChange(isEnabled) {
        // 如果启用"异议所有网页"，则禁用广告拦截功能
        if (isEnabled && adBlockerSwitch.checked) {
            adBlockerSwitch.checked = false;
            handleAdBlockerChange(false);
        }
    }

    // 各种事件监听器设置
    bubbleSelect.addEventListener('change', function() {
        sendConfig();
    });

    sizeInput.addEventListener('change', function() {
        sendConfig();
    });

    toggleSwitch.addEventListener('change', function() {
        handleToggleSwitchChange(this.checked);
        sendConfig();
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
    
    // 添加广告拦截触发方式单选按钮的事件监听
    adTriggerAuto.addEventListener('change', function() {
        if (this.checked) sendConfig();
    });
    
    adTriggerClick.addEventListener('change', function() {
        if (this.checked) sendConfig();
    });

    headerLink.addEventListener('click', function(event) {
        event.preventDefault();
        chrome.tabs.create({
            url: "https://objection.yvfox.com/"
        });
    });
    
    // 添加高级设置链接点击事件
    advancedSettingsLink.addEventListener('click', function(event) {
        event.preventDefault();
        chrome.runtime.openOptionsPage();
    });
    
    // 立即加载设置
    loadSettings();
});