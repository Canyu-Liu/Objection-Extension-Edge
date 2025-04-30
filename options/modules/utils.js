// 工具函数模块

/**
 * 显示消息提示
 * @param {string} message - 提示信息
 * @param {string} type - 消息类型（info, success, warning, danger）
 */
export function showMessage(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="关闭"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // 3秒后自动消失
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 3000);
}

/**
 * 将文件转换为Base64
 * @param {File} file - 文件对象
 * @returns {Promise<string>} - Base64编码的文件内容
 */
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * 压缩图像
 * @param {string} base64Data - Base64编码的图像数据
 * @param {number} maxWidth - 最大宽度
 * @param {number} maxHeight - 最大高度
 * @param {number} quality - 图像质量（0-1）
 * @returns {Promise<string>} - 压缩后的Base64图像数据
 */
export async function compressImage(base64Data, maxWidth = 400, maxHeight = 300, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            let width = img.width;
            let height = img.height;
            
            // 计算缩放比例
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }
            
            // 创建canvas并绘制图像
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // 导出为较低质量的JPEG
            const compressedData = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedData);
        };
        
        img.onerror = function() {
            reject(new Error('图像加载失败'));
        };
        
        img.src = base64Data;
    });
}

/**
 * 创建抖动动画样式
 */
export function addShakeAnimation() {
    if (!document.getElementById('shake-style')) {
        document.head.appendChild(
            Object.assign(document.createElement('style'), {
                id: 'shake-style',
                innerHTML: `
                    @keyframes shake {
                        0% { transform: translate(calc(-50% + 1px), calc(-50% + 1px)) rotate(0deg); }
                        10% { transform: translate(calc(-50% - 1px), calc(-50% - 2px)) rotate(-1deg); }
                        20% { transform: translate(calc(-50% - 3px), -50%) rotate(1deg); }
                        30% { transform: translate(calc(-50% + 3px), calc(-50% + 2px)) rotate(0deg); }
                        40% { transform: translate(calc(-50% + 1px), calc(-50% - 1px)) rotate(1deg); }
                        50% { transform: translate(calc(-50% - 1px), calc(-50% + 2px)) rotate(-1deg); }
                        60% { transform: translate(calc(-50% - 3px), calc(-50% + 1px)) rotate(0deg); }
                        70% { transform: translate(calc(-50% + 3px), calc(-50% + 1px)) rotate(-1deg); }
                        80% { transform: translate(calc(-50% - 1px), calc(-50% - 1px)) rotate(1deg); }
                        90% { transform: translate(calc(-50% + 1px), calc(-50% + 2px)) rotate(0deg); }
                        100% { transform: translate(calc(-50% + 1px), calc(-50% - 2px)) rotate(-1deg); }
                    }
                    .shake {
                        animation: shake 0.5s;
                        animation-iteration-count: 1;
                    }
                `
            })
        );
    }
}

/**
 * 添加Bootstrap图标
 */
export function addBootstrapIcons() {
    if (!document.getElementById('bootstrap-icons')) {
        const iconLink = document.createElement('link');
        iconLink.id = 'bootstrap-icons';
        iconLink.rel = 'stylesheet';
        iconLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css';
        document.head.appendChild(iconLink);
    }
}