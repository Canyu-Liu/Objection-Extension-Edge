// 消息处理模块 - 处理扩展内部通信

import { centralConfig, updateCentralConfig } from './config.js';
import { validateFilterRules, checkUrlBlocking, updateFilterRules } from './adBlocker.js';
import { broadcastConfigToAllTabs } from './tabManager.js';

/**
 * 设置消息监听器
 */
export function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 处理获取配置请求
    if (message.type === 'getConfig') {
      console.log('收到获取配置请求:', message.keys);
      
      // 如果指定了特定的键
      if (Array.isArray(message.keys) && message.keys.length > 0) {
        const requestedConfig = {};
        message.keys.forEach(key => {
          if (key in centralConfig) {
            requestedConfig[key] = centralConfig[key];
          }
        });
        sendResponse({ status: 'success', config: requestedConfig });
      } 
      // 否则返回完整配置
      else {
        sendResponse({ status: 'success', config: centralConfig });
      }
      
      return true;
    }
    
    // 处理更新配置请求
    if (message.type === 'updateConfig') {
      console.log('收到更新配置请求:', Object.keys(message.config));
      
      // 如果有自定义过滤规则更新
      if (message.config.adFilterRules !== undefined) {
        updateFilterRules(message.config.adFilterRules);
      }
      
      // 更新中央配置并保存到存储
      updateCentralConfig(
        message.config, 
        sendResponse, 
        broadcastConfigToAllTabs
      );
      
      return true;
    }
    
    // 处理验证过滤规则请求
    else if (message.type === 'validateFilterRules') {
      console.log('收到验证过滤规则请求');
      const rules = message.rules || [];
      const results = validateFilterRules(rules);
      
      sendResponse({
        status: 'success',
        results: results
      });
      return true;
    }
    
    // 处理请求URL阻止检查 
    else if (message.type === 'checkUrlBlocking' && sender.tab) {
      const url = message.url;
      
      if (!url || typeof url !== 'string') {
        sendResponse({ blocked: false });
        return true;
      }
      
      const result = checkUrlBlocking(url);
      sendResponse(result);
      return true;
    }
  });
}