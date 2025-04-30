// UI 管理模块
import { globalConfig, updateConfig } from './config.js';
import { showMessage } from './utils.js';

/**
 * UI 元素引用存储
 */
export const elements = {
    bubbleSelect: null,
    sizeInput: null,
    toggleSwitch: null,
    adBlockerSwitch: null,
    adModeGroup: null,
    adModePlaceholder: null,
    adModeRemove: null,
    adModeImage: null,
    previewImage: null,
    customImageInput: null,
    customAudioInput: null,
    saveCustomBtn: null,
    resetCustomBtn: null,
    testCustomBtn: null,
    saveAllBtn: null,
    addToLibraryBtn: null,
    customEffectsList: null,
    adTriggerAuto: null,
    adTriggerClick: null,
    newRuleInput: null,
    addRuleBtn: null,
    rulesList: null,
    noRulesMessage: null,
    customRulesSwitch: null,
    exportRulesBtn: null,
    importRulesBtn: null,
    importRulesFile: null
};

/**
 * 初始化UI元素引用
 */
export function initializeUI() {
    // 获取所有UI元素的引用
    elements.bubbleSelect = document.getElementById('bubble-style');
    elements.sizeInput = document.getElementById('bubble-size');
    elements.toggleSwitch = document.getElementById('objection-switch');
    elements.adBlockerSwitch = document.getElementById('ad-blocker-switch');
    elements.adModeGroup = document.getElementById('ad-mode-group');
    elements.adModePlaceholder = document.getElementById('ad-mode-placeholder');
    elements.adModeRemove = document.getElementById('ad-mode-remove');
    elements.adModeImage = document.getElementById('ad-mode-image');
    elements.previewImage = document.getElementById('preview-custom-image');
    elements.customImageInput = document.getElementById('custom-image');
    elements.customAudioInput = document.getElementById('custom-audio');
    elements.saveCustomBtn = document.getElementById('save-custom');
    elements.resetCustomBtn = document.getElementById('reset-custom');
    elements.testCustomBtn = document.getElementById('test-custom-effect');
    elements.saveAllBtn = document.getElementById('save-all');
    elements.addToLibraryBtn = document.getElementById('add-to-library');
    elements.customEffectsList = document.getElementById('custom-effects-list');
    elements.adTriggerAuto = document.getElementById('ad-trigger-auto');
    elements.adTriggerClick = document.getElementById('ad-trigger-click');
    elements.newRuleInput = document.getElementById('new-rule');
    elements.addRuleBtn = document.getElementById('add-rule-btn');
    elements.rulesList = document.getElementById('rules-list');
    elements.noRulesMessage = document.getElementById('no-rules-message');
    elements.customRulesSwitch = document.getElementById('custom-rules-switch');
    elements.exportRulesBtn = document.getElementById('export-rules-btn');
    elements.importRulesBtn = document.getElementById('import-rules-btn');
    elements.importRulesFile = document.getElementById('import-rules-file');
    
    return elements;
}

/**
 * 更新UI元素状态以反映配置
 * @param {Object} config - 配置对象
 */
export function updateUIFromConfig(config) {
    if (!config) return;
    
    // 设置界面元素状态
    if (elements.bubbleSelect) elements.bubbleSelect.value = config.bubbleType;
    if (elements.sizeInput) elements.sizeInput.value = config.bubbleSize;
    if (elements.toggleSwitch) elements.toggleSwitch.checked = config.isEnabled;
    if (elements.adBlockerSwitch) elements.adBlockerSwitch.checked = config.adBlockerEnabled;
    if (elements.customRulesSwitch) elements.customRulesSwitch.checked = config.customRulesEnabled;
    
    // 设置广告处理方式单选按钮状态
    if (config.adRemovalMode === 'placeholder') {
        if (elements.adModePlaceholder) elements.adModePlaceholder.checked = true;
    } else if (config.adRemovalMode === 'remove') {
        if (elements.adModeRemove) elements.adModeRemove.checked = true;
    } else if (config.adRemovalMode === 'image') {
        if (elements.adModeImage) elements.adModeImage.checked = true;
    }
    
    // 设置广告拦截触发方式单选按钮状态
    if (config.adTriggerMode === 'auto') {
        if (elements.adTriggerAuto) elements.adTriggerAuto.checked = true;
    } else if (config.adTriggerMode === 'click') {
        if (elements.adTriggerClick) elements.adTriggerClick.checked = true;
    }
    
    // 如果广告拦截开启，显示处理方式选项
    if (elements.adModeGroup) {
        elements.adModeGroup.style.display = config.adBlockerEnabled ? 'block' : 'none';
    }
    
    // 加载自定义图像
    if (config.customImage && elements.previewImage) {
        elements.previewImage.src = config.customImage;
    }
}

/**
 * 获取当前的UI设置
 * @returns {Object} 当前UI设置
 */
export function getCurrentUISettings() {
    // 获取当前选中的广告处理方式
    let currentAdMode = 'placeholder';
    if (elements.adModeRemove && elements.adModeRemove.checked) {
        currentAdMode = 'remove';
    } else if (elements.adModeImage && elements.adModeImage.checked) {
        currentAdMode = 'image';
    }
    
    // 获取当前选中的广告拦截触发方式
    let currentAdTriggerMode = 'auto';
    if (elements.adTriggerClick && elements.adTriggerClick.checked) {
        currentAdTriggerMode = 'click';
    }
    
    return {
        bubbleType: elements.bubbleSelect ? elements.bubbleSelect.value : globalConfig.bubbleType,
        bubbleSize: elements.sizeInput ? elements.sizeInput.value : globalConfig.bubbleSize,
        isEnabled: elements.toggleSwitch ? elements.toggleSwitch.checked : globalConfig.isEnabled,
        adBlockerEnabled: elements.adBlockerSwitch ? elements.adBlockerSwitch.checked : globalConfig.adBlockerEnabled,
        adRemovalMode: currentAdMode,
        adTriggerMode: currentAdTriggerMode,
        customRulesEnabled: elements.customRulesSwitch ? elements.customRulesSwitch.checked : globalConfig.customRulesEnabled,
        customImage: globalConfig.customImage,
        customAudio: globalConfig.customAudio,
        customEffectsLibrary: globalConfig.customEffectsLibrary,
        adFilterRules: globalConfig.adFilterRules
    };
}

/**
 * 处理异议效果开关变化
 * @param {boolean} isEnabled - 是否启用
 */
export function handleObjectionToggle(isEnabled) {
    if (isEnabled && elements.adBlockerSwitch && elements.adBlockerSwitch.checked) {
        // 如果启用异议效果时，广告拦截也是开启状态，显示提示并禁用广告拦截
        elements.adBlockerSwitch.checked = false;
        handleAdBlockerChange(false);
        showMessage('已禁用广告拦截，两种功能不能同时启用', 'info');
        
        // 同时更新配置以保存状态
        updateConfig({ 
            isEnabled: true,
            adBlockerEnabled: false 
        });
    }
}

/**
 * 处理广告拦截开关变化
 * @param {boolean} isEnabled - 是否启用
 */
export function handleAdBlockerChange(isEnabled) {
    if (elements.adModeGroup) {
        elements.adModeGroup.style.display = isEnabled ? 'block' : 'none';
    }
    
    if (isEnabled && elements.toggleSwitch && elements.toggleSwitch.checked) {
        // 如果启用广告拦截时，异议效果也是开启状态，显示提示并禁用异议效果
        elements.toggleSwitch.checked = false;
        showMessage('已禁用异议效果，两种功能不能同时启用', 'info');
        
        // 同时更新配置以保存状态
        updateConfig({ 
            isEnabled: false,
            adBlockerEnabled: true 
        });
    }
}