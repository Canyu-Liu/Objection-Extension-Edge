// 异议扩展内容脚本
// 使用立即执行函数表达式(IIFE)创建私有作用域，避免变量重复声明
(function() {
    // 使用chrome.runtime.getURL获取模块的完整URL
    const communicationModuleURL = chrome.runtime.getURL('content-scripts/modules/communication.js');

    // 动态导入模块
    import(communicationModuleURL)
        .then(module => {
            const { initializeCommunication } = module;
            // 在页面加载时初始化
            initializeCommunication();
        })
        .catch(error => {
            console.error('模块加载失败:', error);
        });
})();