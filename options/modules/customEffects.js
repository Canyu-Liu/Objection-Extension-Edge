// 自定义特效管理模块
import { globalConfig, updateConfig, saveCustomSettings as configSaveCustomSettings } from './config.js';
import { elements, getCurrentUISettings } from './ui.js';
import { showMessage, fileToBase64, compressImage, addShakeAnimation } from './utils.js';

// 当前自定义设置
let currentCustomImage = null;
let currentCustomAudio = null;

/**
 * 初始化自定义特效数据
 */
export function initializeCustomEffectsData() {
    // 从全局配置中获取自定义图像和音频
    currentCustomImage = globalConfig.customImage;
    currentCustomAudio = globalConfig.customAudio;
}

/**
 * 渲染自定义特效库
 */
export function renderCustomEffectsLibrary() {
    if (!elements.customEffectsList) {
        console.error('自定义特效列表元素未初始化');
        return;
    }
    
    elements.customEffectsList.innerHTML = '';
    const customEffectsLibrary = globalConfig.customEffectsLibrary || [];
    
    if (customEffectsLibrary.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'text-center text-muted py-3';
        emptyMessage.textContent = '您的特效库是空的，请添加自定义特效';
        elements.customEffectsList.appendChild(emptyMessage);
        return;
    }
    
    customEffectsLibrary.forEach((effect, index) => {
        const effectItem = document.createElement('div');
        effectItem.className = 'custom-item';
        
        const preview = document.createElement('img');
        preview.className = 'custom-item-preview';
        preview.src = effect.image;
        preview.alt = '特效预览';
        
        const content = document.createElement('div');
        content.className = 'custom-item-content';
        
        const title = document.createElement('h5');
        title.textContent = effect.name || `自定义特效 ${index + 1}`;
        
        const date = document.createElement('div');
        date.className = 'text-muted';
        date.textContent = `添加于 ${effect.date || '未知时间'}`;
        
        const actions = document.createElement('div');
        actions.className = 'custom-item-actions';
        
        const useBtn = document.createElement('button');
        useBtn.className = 'btn btn-sm btn-primary me-2';
        useBtn.textContent = '使用';
        useBtn.onclick = () => useCustomEffect(index);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-danger';
        deleteBtn.textContent = '删除';
        deleteBtn.onclick = () => deleteCustomEffect(index);
        
        content.appendChild(title);
        content.appendChild(date);
        
        actions.appendChild(useBtn);
        actions.appendChild(deleteBtn);
        
        effectItem.appendChild(preview);
        effectItem.appendChild(content);
        effectItem.appendChild(actions);
        
        elements.customEffectsList.appendChild(effectItem);
    });
}

/**
 * 使用自定义特效
 * @param {number} index - 特效索引
 */
export function useCustomEffect(index) {
    const customEffectsLibrary = globalConfig.customEffectsLibrary || [];
    const effect = customEffectsLibrary[index];
    
    if (effect) {
        currentCustomImage = effect.image;
        currentCustomAudio = effect.audio;
        
        if (elements.previewImage) {
            elements.previewImage.src = effect.image;
        }
        
        if (elements.bubbleSelect) {
            elements.bubbleSelect.value = 'custom';
        }
        
        // 保存设置
        configSaveCustomSettings({
            bubbleType: 'custom',
            customImage: currentCustomImage,
            customAudio: currentCustomAudio
        });
        
        // 显示成功消息
        showMessage('已切换到自定义特效', 'success');
    }
}

/**
 * 删除自定义特效
 * @param {number} index - 特效索引
 */
export function deleteCustomEffect(index) {
    if (confirm('确定要删除这个自定义特效吗？')) {
        const customEffectsLibrary = globalConfig.customEffectsLibrary || [];
        customEffectsLibrary.splice(index, 1);
        globalConfig.customEffectsLibrary = customEffectsLibrary;
        
        renderCustomEffectsLibrary();
        
        // 保存到 background
        updateConfig({ customEffectsLibrary: customEffectsLibrary }, '已删除自定义特效');
    }
}

/**
 * 测试自定义特效
 */
export function testCustomEffect() {
    // 创建预览图像
    const img = document.createElement('img');
    img.src = currentCustomImage || chrome.runtime.getURL("./images/jp_objection.png");
    img.style.position = 'fixed';
    img.style.left = '50%';
    img.style.top = '50%';
    img.style.transform = 'translate(-50%, -50%)';
    img.style.zIndex = '10000';
    img.style.width = `${elements.sizeInput?.value * 10 || 100}px`;
    img.classList.add('shake');
    document.body.appendChild(img);
    
    // 添加抖动动画样式
    addShakeAnimation();
    
    // 播放音频
    if (currentCustomAudio) {
        const audio = new Audio(currentCustomAudio);
        audio.play().catch(err => {
            console.error('播放音频失败:', err);
            showMessage('音频播放失败', 'danger');
        });
    } else {
        const audio = new Audio(chrome.runtime.getURL("./audio/phoenix_wright_objection_jp.wav"));
        audio.play().catch(err => console.error(err));
    }
    
    // 一秒后移除
    setTimeout(() => {
        if (img.parentNode) {
            document.body.removeChild(img);
        }
    }, 1000);
}

/**
 * 保存自定义设置
 */
export function saveCustomSettingsToStorage() {
    const customData = {
        bubbleType: elements.bubbleSelect?.value || 'custom',
        customImage: currentCustomImage,
        customAudio: currentCustomAudio
    };
    
    return configSaveCustomSettings(customData);
}

/**
 * 重置自定义设置
 */
export function resetCustomSettings() {
    if (confirm('确定要重置自定义设置吗？这将恢复默认图像和音频。')) {
        currentCustomImage = null;
        currentCustomAudio = null;
        
        if (elements.previewImage) {
            elements.previewImage.src = chrome.runtime.getURL("./images/jp_objection.png");
        }
        
        if (elements.bubbleSelect) {
            elements.bubbleSelect.value = '0'; // 切换回默认模式
        }
        
        configSaveCustomSettings({
            bubbleType: '0', 
            customImage: null,
            customAudio: null
        });
    }
}

/**
 * 将当前设置添加到库
 */
export function addToLibrary() {
    // 如果没有自定义图像，则不能添加
    if (!currentCustomImage) {
        showMessage('请先上传自定义图像', 'warning');
        return;
    }
    
    // 创建命名对话框
    const name = prompt('请为此特效命名:', `自定义特效 ${(globalConfig.customEffectsLibrary || []).length + 1}`);
    if (name === null) return; // 用户取消了输入
    
    const newEffect = {
        name: name,
        image: currentCustomImage,
        audio: currentCustomAudio,
        date: new Date().toLocaleDateString()
    };
    
    const customEffectsLibrary = globalConfig.customEffectsLibrary || [];
    customEffectsLibrary.push(newEffect);
    globalConfig.customEffectsLibrary = customEffectsLibrary;
    
    renderCustomEffectsLibrary();
    
    // 保存到存储
    updateConfig({ customEffectsLibrary: customEffectsLibrary }, '已添加到特效库');
}

/**
 * 初始化自定义特效事件监听
 */
export function initializeCustomEffectsEvents() {
    if (!elements.customImageInput || !elements.customAudioInput ||
        !elements.testCustomBtn || !elements.saveCustomBtn || 
        !elements.resetCustomBtn || !elements.addToLibraryBtn) {
        console.error('自定义特效相关元素未初始化');
        return;
    }
    
    // 自定义图像上传处理
    elements.customImageInput.addEventListener('change', async function() {
        if (this.files && this.files[0]) {
            try {
                const file = this.files[0];
                
                // 检查文件大小
                if (file.size > 1024 * 1024 * 2) { // 2MB
                    showMessage('图像文件过大，请选择不超过2MB的文件', 'warning');
                    return;
                }
                
                const base64Data = await fileToBase64(file);
                
                // 压缩图像以减小存储大小
                const compressedImage = await compressImage(base64Data);
                console.log('图像已压缩', {
                    原始大小: base64Data.length,
                    压缩后大小: compressedImage.length,
                    压缩率: ((1 - compressedImage.length / base64Data.length) * 100).toFixed(2) + '%'
                });
                
                if (elements.previewImage) {
                    elements.previewImage.src = compressedImage;
                }
                
                currentCustomImage = compressedImage;
                
                // 自动切换到自定义模式
                if (elements.bubbleSelect) {
                    elements.bubbleSelect.value = 'custom';
                }
                
                showMessage('图像已上传并压缩，以减小存储大小', 'success');
            } catch (error) {
                console.error('处理图像文件时出错:', error);
                showMessage('处理图像文件时出错', 'danger');
            }
        }
    });
    
    // 自定义音频上传处理
    elements.customAudioInput.addEventListener('change', async function() {
        if (this.files && this.files[0]) {
            try {
                const file = this.files[0];
                
                // 检查文件大小
                if (file.size > 1024 * 500) { // 500KB
                    showMessage('音频文件过大，请选择不超过500KB的文件', 'warning');
                    return;
                }
                
                const base64Data = await fileToBase64(file);
                currentCustomAudio = base64Data;
                
                // 自动切换到自定义模式
                if (elements.bubbleSelect) {
                    elements.bubbleSelect.value = 'custom';
                }
                
                showMessage('音频已上传成功！点击"测试效果"按钮可以预览', 'success');
            } catch (error) {
                console.error('处理音频文件时出错:', error);
                showMessage('处理音频文件时出错', 'danger');
            }
        }
    });
    
    // 测试自定义特效
    elements.testCustomBtn.addEventListener('click', function() {
        testCustomEffect();
    });
    
    // 保存自定义设置
    elements.saveCustomBtn.addEventListener('click', function() {
        saveCustomSettingsToStorage();
    });
    
    // 重置自定义设置
    elements.resetCustomBtn.addEventListener('click', function() {
        resetCustomSettings();
    });
    
    // 将当前设置添加到库
    elements.addToLibraryBtn.addEventListener('click', function() {
        addToLibrary();
    });
}

/**
 * 获取当前自定义特效数据
 */
export function getCustomEffectsData() {
    return {
        customImage: currentCustomImage,
        customAudio: currentCustomAudio
    };
}