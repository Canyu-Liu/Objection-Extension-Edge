// 配置管理模块

// 存储全局配置
export const globalConfig = {
    bubbleType: '0',      // 气泡类型：0-异议，1-等等，2-看招，3-随机，custom-自定义
    bubbleSize: '10',     // 气泡大小
    isEnabled: false,     // 扩展开关状态
    adBlockerEnabled: false, // 广告拦截功能开关状态
    adRemovalMode: 'placeholder', // 广告处理方式: placeholder-占位符, remove-直接删除, image-图片替换
    adTriggerMode: 'auto', // 广告拦截触发方式: auto-自动拦截, click-点击拦截
    customRulesEnabled: true, // 是否启用自定义过滤规则
    customImage: null,     // 自定义图像的 Base64 数据
    customAudio: null,     // 自定义音频的 Base64 数据
    customAdSelectors: [] // 自定义过滤规则生成的选择器列表
};

// 保存已处理的广告元素，避免重复处理
export const processedElements = new WeakSet();

// 更新配置函数
export function updateConfig(newConfig) {
    Object.assign(globalConfig, newConfig);
}