// 配置管理模块
import { showMessage } from './utils.js';

/**
 * 全局配置存储
 */
export const globalConfig = {
    bubbleType: '0',       // 气泡类型：0-异议，1-等等，2-看招，3-随机，custom-自定义
    bubbleSize: '10',      // 气泡大小
    isEnabled: false,      // 扩展开关状态
    adBlockerEnabled: false, // 广告拦截功能开关状态
    adRemovalMode: 'placeholder', // 广告处理方式: placeholder-占位符, remove-直接删除, image-图片替换
    adTriggerMode: 'auto', // 广告拦截触发方式: auto-自动拦截, click-点击拦截
    customRulesEnabled: true, // 是否启用自定义过滤规则
    customImage: null,      // 自定义图像的 Base64 数据
    customAudio: null,      // 自定义音频的 Base64 数据
    customEffectsLibrary: [], // 自定义特效库
    adFilterRules: []      // 广告过滤规则
};

/**
 * 从 background.js 获取配置并初始化界面
 * @param {Function} uiUpdateCallback - 界面更新回调函数
 */
export function loadSettings(uiUpdateCallback) {
    chrome.runtime.sendMessage({ 
        type: 'getConfig'
    }, function(response) {
        if (response && response.status === 'success') {
            const config = response.config;
            
            // 更新全局配置
            Object.assign(globalConfig, config);
            
            console.log('从 background 加载配置成功：', {
                bubbleType: config.bubbleType,
                hasCustomImage: !!config.customImage,
                adBlockerEnabled: config.adBlockerEnabled,
                adTriggerMode: config.adTriggerMode,
                filterRulesCount: config.adFilterRules?.length || 0,
                effectsLibraryCount: config.customEffectsLibrary?.length || 0
            });
            
            // 使用回调更新UI
            if (uiUpdateCallback) {
                uiUpdateCallback(config);
            }
        } else {
            console.error('从 background 加载配置失败');
        }
    });
}

/**
 * 向 background.js 发送配置更新
 * @param {Object} newConfig - 新配置
 * @param {string} successMessage - 成功提示消息
 * @returns {Promise<boolean>} - 更新是否成功
 */
export function updateConfig(newConfig, successMessage) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ 
            type: 'updateConfig', 
            config: newConfig
        }, function(response) {
            if (response && response.status === 'success') {
                console.log('配置更新成功:', Object.keys(newConfig));
                
                // 更新本地配置
                Object.assign(globalConfig, newConfig);
                
                if (successMessage) {
                    showMessage(successMessage, 'success');
                }
                resolve(true);
            } else {
                console.error('配置更新失败:', response);
                showMessage('保存设置失败', 'danger');
                resolve(false);
            }
        });
    });
}

/**
 * 保存自定义设置到存储
 * @param {Object} customData - 自定义设置数据
 */
export async function saveCustomSettings(customData) {
    if (!customData) return;
    
    console.log('保存自定义设置', {
        hasCustomImage: !!customData.customImage,
        customImageLength: customData.customImage ? customData.customImage.length : 0,
        hasCustomAudio: !!customData.customAudio
    });
    
    // 分别保存数据到不同存储
    // 基本设置保存到sync存储（跨设备同步）
    if (customData.bubbleType) {
        chrome.storage.sync.set({
            bubbleType: customData.bubbleType
        }, function() {
            console.log('基本设置已保存到sync存储');
        });
    }
    
    // 大型数据保存到local存储
    const localData = {};
    if (customData.customImage !== undefined) localData.customImage = customData.customImage;
    if (customData.customAudio !== undefined) localData.customAudio = customData.customAudio;
    
    if (Object.keys(localData).length > 0) {
        chrome.storage.local.set(localData, function() {
            console.log('自定义图像和音频已保存到local存储');
        });
    }
    
    // 更新配置
    return updateConfig(customData, '自定义设置已保存');
}

/**
 * 保存所有设置到存储
 * @param {Object} allSettings - 所有设置数据
 */
export async function saveAllSettings(allSettings) {
    if (!allSettings) return;
    
    console.log('保存所有设置', {
        bubbleType: allSettings.bubbleType,
        isEnabled: allSettings.isEnabled,
        adBlockerEnabled: allSettings.adBlockerEnabled,
        hasCustomImage: !!allSettings.customImage,
        hasCustomAudio: !!allSettings.customAudio,
        rulesCount: allSettings.adFilterRules?.length || 0
    });

    // 基本设置保存到sync存储
    const syncData = {};
    ['bubbleType', 'bubbleSize', 'isEnabled', 'adBlockerEnabled', 
     'adRemovalMode', 'adTriggerMode', 'customRulesEnabled'].forEach(key => {
        if (allSettings[key] !== undefined) {
            syncData[key] = allSettings[key];
        }
    });
    
    if (Object.keys(syncData).length > 0) {
        chrome.storage.sync.set(syncData, function() {
            console.log('基本设置已保存到sync存储');
        });
    }
    
    // 大型数据保存到local存储
    const localData = {};
    ['customImage', 'customAudio', 'customEffectsLibrary', 'adFilterRules'].forEach(key => {
        if (allSettings[key] !== undefined) {
            localData[key] = allSettings[key];
        }
    });
    
    if (Object.keys(localData).length > 0) {
        chrome.storage.local.set(localData, function() {
            console.log('自定义数据已保存到local存储');
        });
    }
    
    // 通知background更新配置
    return updateConfig(allSettings, '所有设置已保存');
}