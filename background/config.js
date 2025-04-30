// 配置管理模块 - 处理中央配置的存储和管理

/**
 * 中央配置存储 - 存储所有扩展设置
 */
export let centralConfig = {
  bubbleType: '0',       // 气泡类型：0-异议，1-等等，2-看招，3-随机，custom-自定义
  bubbleSize: '10',      // 气泡大小
  isEnabled: false,      // 扩展开关状态
  adBlockerEnabled: false, // 广告拦截功能开关状态
  adRemovalMode: 'placeholder', // 广告处理方式: placeholder-占位符, remove-直接删除, image-图片替换
  adTriggerMode: 'auto', // 广告拦截触发方式: auto-自动拦截, click-点击拦截
  customRulesEnabled: true, // 是否启用自定义过滤规则
  customImage: null,      // 自定义图像的 Base64 数据
  customAudio: null,      // 自定义音频的 Base64 数据
  customEffectsLibrary: [] // 自定义特效库
};

/**
 * 初始化中央配置
 * @returns {Promise} - 完成后的Promise
 */
export function initializeCentralConfig() {
  return Promise.all([
    new Promise(resolve => {
      chrome.storage.sync.get({
        bubbleType: '0',
        bubbleSize: '10',
        isEnabled: false,
        adBlockerEnabled: false,
        adRemovalMode: 'placeholder',
        adTriggerMode: 'auto',
        customRulesEnabled: true
      }, resolve);
    }),
    new Promise(resolve => {
      chrome.storage.local.get({
        customImage: null,
        customAudio: null,
        customEffectsLibrary: [],
        adFilterRules: []
      }, resolve);
    })
  ]).then(([syncData, localData]) => {
    // 合并数据到中央配置
    centralConfig = {...centralConfig, ...syncData, ...localData};
    
    console.log('中央配置已初始化:', {
      bubbleType: centralConfig.bubbleType,
      hasCustomImage: !!centralConfig.customImage,
      adBlockerEnabled: centralConfig.adBlockerEnabled,
      adTriggerMode: centralConfig.adTriggerMode
    });
    
    // 返回初始化后的配置和广告规则
    return {
      config: centralConfig,
      adFilterRules: localData.adFilterRules || []
    };
  });
}

/**
 * 更新中央配置
 * @param {Object} newConfig - 新配置
 * @param {function} callback - 回调函数
 * @param {function} broadcastCallback - 广播配置给所有标签页的回调函数
 * @returns {Promise} - 完成后的Promise
 */
export function updateCentralConfig(newConfig, callback, broadcastCallback) {
  // 更新内存中的配置
  const oldConfig = {...centralConfig};
  centralConfig = {...centralConfig, ...newConfig};
  
  // 分离数据，存储到相应的存储区域
  const syncData = {};
  const localData = {};
  
  // 决定哪些配置保存到同步存储
  ['bubbleType', 'bubbleSize', 'isEnabled', 'adBlockerEnabled', 
   'adRemovalMode', 'adTriggerMode', 'customRulesEnabled'].forEach(key => {
    if (newConfig[key] !== undefined) {
      syncData[key] = newConfig[key];
    }
  });
  
  // 决定哪些配置保存到本地存储
  ['customImage', 'customAudio', 'customEffectsLibrary'].forEach(key => {
    if (newConfig[key] !== undefined) {
      localData[key] = newConfig[key];
    }
  });
  
  // 如果有过滤规则更新
  if (newConfig.adFilterRules !== undefined) {
    localData.adFilterRules = newConfig.adFilterRules;
  }
  
  // 并行保存到两个存储区域
  const promises = [];
  
  if (Object.keys(syncData).length > 0) {
    promises.push(new Promise(resolve => {
      chrome.storage.sync.set(syncData, resolve);
    }));
  }
  
  if (Object.keys(localData).length > 0) {
    promises.push(new Promise(resolve => {
      chrome.storage.local.set(localData, resolve);
    }));
  }
  
  // 等所有存储操作完成后回调
  return Promise.all(promises).then(() => {
    console.log('配置已更新:', {
      syncUpdated: Object.keys(syncData),
      localUpdated: Object.keys(localData)
    });
    
    // 检查是否需要更新标签页
    const needBroadcast = 
      newConfig.isEnabled !== undefined ||
      newConfig.bubbleType !== undefined ||
      newConfig.bubbleSize !== undefined ||
      newConfig.adBlockerEnabled !== undefined ||
      newConfig.adRemovalMode !== undefined ||
      newConfig.adTriggerMode !== undefined ||
      newConfig.customImage !== undefined ||
      newConfig.customAudio !== undefined ||
      newConfig.adFilterRules !== undefined;
      
    if (needBroadcast && broadcastCallback) {
      broadcastCallback(newConfig);
    }
    
    if (callback) callback({status: 'success'});
    return {status: 'success'};
  }).catch(error => {
    console.error('更新配置时出错:', error);
    if (callback) callback({status: 'error', message: error.message});
    return {status: 'error', message: error.message};
  });
}

/**
 * 更新扩展图标状态
 */
export function updateExtensionBadge() {
  const isAnyEnabled = centralConfig.isEnabled || centralConfig.adBlockerEnabled;
  chrome.action.setBadgeText({
    text: isAnyEnabled ? "ON" : "OFF"
  });
}

/**
 * 设置存储变化监听器
 * @param {function} onConfigChanged - 配置变化时的回调
 * @param {function} onRulesChanged - 规则变化时的回调
 */
export function setupStorageChangeListener(onConfigChanged, onRulesChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    console.log(`${area}存储发生变化:`, Object.keys(changes));
    
    // 更新中央配置
    let configChanged = false;
    const configUpdates = {};
    
    // 处理 sync 存储变化
    if (area === 'sync') {
      ['bubbleType', 'bubbleSize', 'isEnabled', 'adBlockerEnabled', 
       'adRemovalMode', 'adTriggerMode', 'customRulesEnabled'].forEach(key => {
        if (changes[key]) {
          configUpdates[key] = changes[key].newValue;
          centralConfig[key] = changes[key].newValue;
          configChanged = true;
        }
      });
    }
    // 处理 local 存储变化
    else if (area === 'local') {
      ['customImage', 'customAudio', 'customEffectsLibrary'].forEach(key => {
        if (changes[key]) {
          configUpdates[key] = changes[key].newValue;
          centralConfig[key] = changes[key].newValue;
          configChanged = true;
        }
      });
      
      // 检查自定义规则是否更新
      if (changes.adFilterRules && onRulesChanged) {
        onRulesChanged(changes.adFilterRules.newValue || []);
      }
    }
    
    // 如果配置发生变化，调用配置变化回调
    if (configChanged && onConfigChanged) {
      onConfigChanged(configUpdates);
    }
    
    // 更新扩展图标状态
    if ('isEnabled' in configUpdates || 'adBlockerEnabled' in configUpdates) {
      updateExtensionBadge();
    }
  });
}