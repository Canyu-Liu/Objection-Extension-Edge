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

// 广告拦截预置规则
export const adBlockerPresetRules = {
    // src属性规则 - 用于图片、iframe、script等
    srcRules: [
        /ad[s]?[-_]?[0-9]*\./, // ad.jpg, ads-120x600.gif 等
        /banner[s]?[-_]?[0-9]*\./, // banner.png, banners-300x250.jpg 等
        /(^|\.)doubleclick\.(net|com)/, // doubleclick广告网络
        /(^|\.)googleadservices\.com/, // Google广告服务
        /(^|\.)googlesyndication\.com/, // Google广告联盟
        /(^|\.)adnxs\.com/, // AppNexus广告网络
        /(^|\.)adform\.net/,
        /(^|\.)advertising\./,
        /(^|\.)adsystem\./,
        /(^|\.)adtech\./,
        /(^|\.)advert(ising)?\./, 
        /(^|\.)affiliat(e|ion)\./, // 联盟广告
        /(^|\.)analytics\./, // 分析工具，通常用于广告跟踪
        /(^|\.)bidswitch\.net/,
        /(^|\.)criteo\./,
        /(^|\.)tracker\./,
        /(^|\.)tracking\./
    ],
    
    // id属性规则
    idRules: [
        /^ad[-_]?[0-9]*/i, // ad, ad-1, ad_container 等
        /^ads[-_]?[0-9]*/i, // ads, ads-wrapper 等
        /^advert(isement)?[-_]?[0-9]*/i, // advert, advertisement 等
        /banner[-_]?[0-9]*/i, // banner, banner-container 等
        /^sponsor[-_]?[0-9]*/i, // sponsor, sponsored-content 等
        /^promo[-_]?[0-9]*/i, // promo, promotion 等
        /popup[-_]?[0-9]*/i, // popup, popup-ads 等
        /^commercial[-_]?[0-9]*/i,
        /^dfp[-_]?/i, // DoubleClick for Publishers
        /^googlead/i,
        /^aswift_[0-9]+$/i // 匹配 aswift_1, aswift_2 等 AdSense iframe ID
    ],
    
    // class属性规则
    classRules: [
        /\bad[-_]?(container|wrapper|box|wrap|unit|row|space|spot|block|banner|content|slot|text|title|body|header|sidebar|footer)/i,
        /\bads[-_]?(container|wrapper|box|wrap|unit|row|space|spot|block|banner|content|slot|text|title|body|header|sidebar|footer)/i,
        /\badvert(isement)?[-_]?(container|wrapper|box|wrap|unit|row|space|spot|block|banner|content|slot|text|title|body|header|sidebar|footer)/i,
        /\bbanner[-_]?(container|wrapper|box|wrap|unit|row|space|spot|block|ad|content|slot|text|title|body|header|sidebar|footer)/i,
        /\bpromo[-_]?(container|wrapper|box|wrap|unit|row|space|spot|block|banner|content|slot|text|title|body|header|sidebar|footer)/i,
        /\bsponsor(ed)?[-_]?(container|wrapper|box|wrap|unit|row|space|spot|block|banner|content|slot|text|title|body|header|sidebar|footer)/i,
        /\bgooglead/i,
        /\badsense\b/i,
        /\badvertising\b/i,
        /\bdfp\b/i, // DoubleClick for Publishers
    ],
    
    // name属性规则
    nameRules: [
        /^ad[-_]?[0-9]*/i,
        /^ads[-_]?[0-9]*/i,
        /^advert(isement)?[-_]?[0-9]*/i,
        /^banner[-_]?[0-9]*/i,
        /^sponsor[-_]?[0-9]*/i,
        /^promo[-_]?[0-9]*/i,
        /^adsense/i,
        /^doubleclick/i,
        /^aswift_[0-9]+$/i // 匹配 aswift_1, aswift_2 等 AdSense iframe name
    ],
    
    // 内容规则 - 基于元素的textContent
    contentRules: [
        /^(advertisement|sponsored|广告|廣告|推广|推廣)/i
    ]
};

// 更新配置函数
export function updateConfig(newConfig) {
    Object.assign(globalConfig, newConfig);
}