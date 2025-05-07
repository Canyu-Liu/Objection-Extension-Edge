// 异议效果模块
import { globalConfig } from './config.js';

// 设置全局异议模式
export function setupGlobalObjectionMode() {
    // 确保全局异议模式已启用
    if (!globalConfig.isEnabled) {
        return;
    }
    
    console.log('正在设置全局异议模式');
    
    // 检查是否已经添加了事件监听器，避免重复添加
    if (window._objectionEventAdded) {
        return;
    }
    window._objectionEventAdded = true;
    
    // 监听鼠标点击事件
    document.addEventListener('click', function (event) {
        // 如果全局异议模式已被禁用，不执行操作
        if (!globalConfig.isEnabled) {
            return;
        }
        
        // 创建并显示特效
        showObjectionEffect(event.clientX, event.clientY);
    });
    
    console.log('已添加全局异议模式点击事件监听器');
}

// 显示异议特效
export function showObjectionEffect(x, y) {
    // 确定使用哪种类型的气泡
    let imageUrl, audioUrl;
    
    if (globalConfig.bubbleType === 'custom' && globalConfig.customImage) {
        // 使用自定义特效
        imageUrl = globalConfig.customImage;
        audioUrl = globalConfig.customAudio;
    } else {
        // 使用预定义特效
        let type = globalConfig.bubbleType;
        
        // 如果是随机模式，随机选择一种类型
        if (type === '3') {
            type = String(Math.floor(Math.random() * 3));
        }
        
        // 根据类型选择相应的图片和音频
        switch (type) {
            case '0':
                imageUrl = chrome.runtime.getURL('images/jp_objection.png');
                audioUrl = chrome.runtime.getURL('audio/phoenix_wright_objection_jp.wav');
                break;
            case '1':
                imageUrl = chrome.runtime.getURL('images/jp_holdit.png');
                audioUrl = chrome.runtime.getURL('audio/phoenix_wright_holdit_jp.wav');
                break;
            case '2':
                imageUrl = chrome.runtime.getURL('images/jp_takethat.png');
                audioUrl = chrome.runtime.getURL('audio/phoenix_wright_takethat_jp.wav');
                break;
            default:
                imageUrl = chrome.runtime.getURL('images/jp_objection.png');
                audioUrl = chrome.runtime.getURL('audio/phoenix_wright_objection_jp.wav');
        }
    }
    
    // 创建图像元素
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.position = 'fixed';
    img.style.left = `${x}px`;
    img.style.top = `${y}px`;
    img.style.transform = 'translate(-50%, -50%)';
    img.style.zIndex = '10000';
    img.style.width = `${globalConfig.bubbleSize * 10}px`; // 气泡大小
    img.style.pointerEvents = 'none'; // 使鼠标事件可以"穿透"这个元素
    img.classList.add('objection-effect');
    img.classList.add('shake');
    
    // 添加抖动动画
    addShakeAnimation();
    
    // 添加到文档
    document.body.appendChild(img);
    
    // 播放音频
    if (audioUrl) {
        try {
            let audio;
            
            // 处理自定义音频（Base64格式）
            if (globalConfig.bubbleType === 'custom' && audioUrl.startsWith('data:')) {
                // 将Base64转换为Blob
                const fetchResponse = fetch(audioUrl);
                fetchResponse.then(response => {
                    if (!response.ok) throw new Error('无效的音频数据');
                    return response.blob();
                }).then(blob => {
                    // 创建Blob URL
                    const blobUrl = URL.createObjectURL(blob);
                    audio = new Audio(blobUrl);
                    audio.volume = 0.7;
                    audio.onended = () => URL.revokeObjectURL(blobUrl); // 释放Blob URL
                    audio.play().catch(err => console.error('播放音频失败:', err));
                }).catch(err => console.error('处理自定义音频失败:', err));
            } else {
                // 处理标准音频文件URL
                audio = new Audio(audioUrl);
                audio.volume = 0.7;
                audio.play().catch(err => console.error('播放音频失败:', err));
            }
        } catch (err) {
            console.error('音频播放出错:', err);
        }
    }
    
    // 一秒后移除元素
    setTimeout(() => {
        if (img.parentNode) {
            document.body.removeChild(img);
        }
    }, 1000);
}

// 添加抖动动画样式
export function addShakeAnimation() {
    if (document.getElementById('objection-shake-style')) {
        return; // 已添加样式则不再添加
    }
    
    const styleEl = document.createElement('style');
    styleEl.id = 'objection-shake-style';
    styleEl.innerHTML = `
        @keyframes shake {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            10% { transform: translate(calc(-50% + 1px), calc(-50% + 1px)) rotate(0deg); }
            20% { transform: translate(calc(-50% - 1px), calc(-50% - 1px)) rotate(-1deg); }
            30% { transform: translate(calc(-50% + 1px), calc(-50% - 1px)) rotate(1deg); }
            40% { transform: translate(calc(-50% - 1px), calc(-50% + 1px)) rotate(0deg); }
            50% { transform: translate(calc(-50% + 1px), calc(-50% + 1px)) rotate(-1deg); }
            60% { transform: translate(calc(-50% - 1px), calc(-50% - 1px)) rotate(1deg); }
            70% { transform: translate(calc(-50% + 1px), calc(-50% - 1px)) rotate(0deg); }
            80% { transform: translate(calc(-50% - 1px), calc(-50% + 1px)) rotate(-1deg); }
            90% { transform: translate(calc(-50% + 1px), calc(-50% + 1px)) rotate(1deg); }
            100% { transform: translate(-50%, -50%) rotate(0deg); }
        }
        .shake {
            animation: shake 0.5s;
            animation-iteration-count: 1;
        }
    `;
    
    document.head.appendChild(styleEl);
}