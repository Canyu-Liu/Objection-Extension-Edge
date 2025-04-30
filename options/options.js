// 后台设置页面主脚本 - 模块化版本
import { loadSettings, saveAllSettings, globalConfig } from './modules/config.js';
import { initializeUI, elements, updateUIFromConfig, getCurrentUISettings, handleAdBlockerChange, handleObjectionToggle } from './modules/ui.js';
import { renderAdFilterRules, initializeAdRulesEvents } from './modules/adRules.js';
import { initializeCustomEffectsData, renderCustomEffectsLibrary, initializeCustomEffectsEvents } from './modules/customEffects.js';
import { addBootstrapIcons, addShakeAnimation } from './modules/utils.js';

/**
 * 监听存储变化，实时更新设置页面
 */
function setupStorageChangeListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        console.log(`检测到存储变化 (${areaName}):`, Object.keys(changes));
        
        // 重新加载设置并更新界面
        loadSettings(function(config) {
            updateUIFromConfig(config);
        });
    });
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('正在初始化选项页面...');
    
    // 初始化UI元素
    initializeUI();
    
    // 添加Bootstrap图标
    addBootstrapIcons();
    
    // 添加抖动动画样式
    addShakeAnimation();
    
    // 设置存储变化监听器
    setupStorageChangeListener();
    
    // 加载设置
    loadSettings(function(config) {
        // 更新UI以反映当前配置
        updateUIFromConfig(config);
        
        // 初始化自定义特效数据
        initializeCustomEffectsData();
        
        // 渲染自定义特效库
        renderCustomEffectsLibrary();
        
        // 渲染广告过滤规则
        renderAdFilterRules();
    });
    
    // 初始化广告规则事件
    initializeAdRulesEvents();
    
    // 初始化自定义特效事件
    initializeCustomEffectsEvents();
    
    // 添加保存所有设置按钮事件
    if (elements.saveAllBtn) {
        elements.saveAllBtn.addEventListener('click', function() {
            saveAllSettings(getCurrentUISettings());
        });
    }
    
    // 处理异议效果开关变化
    if (elements.toggleSwitch) {
        elements.toggleSwitch.addEventListener('change', function() {
            handleObjectionToggle(this.checked);
        });
    }
    
    // 处理广告拦截开关变化
    if (elements.adBlockerSwitch) {
        elements.adBlockerSwitch.addEventListener('change', function() {
            handleAdBlockerChange(this.checked);
        });
    }
    
    console.log('选项页面初始化完成');
});