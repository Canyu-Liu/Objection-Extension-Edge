// 背景脚本主入口模块 - 初始化和协调所有模块

import { 
  initializeCentralConfig, 
  setupStorageChangeListener,
  updateExtensionBadge 
} from './config.js';

import { 
  updateFilterRules, 
  organizeRules 
} from './adBlocker.js';

import { 
  setupTabListeners, 
  broadcastConfigToAllTabs 
} from './tabManager.js';

import { 
  setupMessageListeners 
} from './messaging.js';

/**
 * 初始化扩展
 */
async function initializeExtension() {
  console.log('异议扩展正在初始化...');
  
  // 初始化中央配置
  const { config, adFilterRules } = await initializeCentralConfig();
  
  // 初始化广告过滤规则
  updateFilterRules(adFilterRules);
  organizeRules();
  
  // 设置存储变化监听
  setupStorageChangeListener((configUpdates) => {
    // 当配置变化时，广播到所有标签页
    broadcastConfigToAllTabs(configUpdates);
  }, (newRules) => {
    // 当规则变化时，更新并组织规则
    updateFilterRules(newRules);
    organizeRules();
  });
  
  // 设置消息监听
  setupMessageListeners();
  
  // 设置标签页监听
  setupTabListeners();
  
  // 初始化扩展图标状态
  updateExtensionBadge();
  
  console.log('异议扩展初始化完成');
}

// 扩展安装/更新时初始化
chrome.runtime.onInstalled.addListener(() => {
  initializeExtension();
});

// 浏览器启动时初始化
initializeExtension();