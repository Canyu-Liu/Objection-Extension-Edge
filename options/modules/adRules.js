// 广告规则管理模块
import { globalConfig, updateConfig } from './config.js';
import { elements } from './ui.js';
import { showMessage } from './utils.js';

/**
 * 渲染广告过滤规则列表
 */
export function renderAdFilterRules() {
    if (!elements.rulesList || !elements.noRulesMessage) {
        console.error('规则列表元素未初始化');
        return;
    }
    
    // 清空规则列表
    elements.rulesList.innerHTML = '';
    const adFilterRules = globalConfig.adFilterRules || [];
    
    // 如果没有规则，显示提示信息
    if (adFilterRules.length === 0) {
        elements.rulesList.appendChild(elements.noRulesMessage);
        return;
    }
    
    // 否则隐藏提示信息
    if (elements.noRulesMessage.parentNode === elements.rulesList) {
        elements.rulesList.removeChild(elements.noRulesMessage);
    }
    
    // 渲染规则列表
    adFilterRules.forEach((rule, index) => {
        const ruleItem = document.createElement('div');
        ruleItem.className = 'rule-item';
        if (!rule.enabled) {
            ruleItem.classList.add('disabled-rule');
        }
        
        const ruleText = document.createElement('span');
        ruleText.className = 'rule-text';
        ruleText.textContent = rule.text;
        
        const ruleActions = document.createElement('div');
        ruleActions.className = 'rule-actions';
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn btn-sm btn-outline-secondary';
        toggleBtn.innerHTML = rule.enabled ? 
            '<i class="bi bi-toggle-on"></i>' : 
            '<i class="bi bi-toggle-off"></i>';
        toggleBtn.title = rule.enabled ? '禁用规则' : '启用规则';
        toggleBtn.onclick = () => toggleRule(index);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-outline-danger';
        deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
        deleteBtn.title = '删除规则';
        deleteBtn.onclick = () => deleteRule(index);
        
        ruleActions.appendChild(toggleBtn);
        ruleActions.appendChild(deleteBtn);
        
        ruleItem.appendChild(ruleText);
        ruleItem.appendChild(ruleActions);
        
        elements.rulesList.appendChild(ruleItem);
    });
}

/**
 * 验证广告过滤规则
 * @param {string} ruleText - 规则文本
 * @returns {Object} 验证结果
 */
export function validateRule(ruleText) {
    // 过滤空规则
    if (!ruleText || ruleText.trim() === '') {
        return { valid: false, message: '规则不能为空' };
    }
    
    // 过滤注释
    if (ruleText.trim().startsWith('!') || ruleText.trim().startsWith('#')) {
        return { valid: true, type: 'comment' };
    }
    
    // 检查规则是否已存在
    const adFilterRules = globalConfig.adFilterRules || [];
    const existingRule = adFilterRules.find(rule => rule.text === ruleText);
    if (existingRule) {
        return { valid: false, message: '该规则已存在' };
    }
    
    return { valid: true };
}

/**
 * 添加新规则
 */
export function addRule() {
    if (!elements.newRuleInput) {
        console.error('新规则输入框未初始化');
        return;
    }
    
    const ruleText = elements.newRuleInput.value.trim();
    
    // 验证规则
    const validation = validateRule(ruleText);
    if (!validation.valid) {
        showMessage(validation.message, 'warning');
        return;
    }
    
    // 添加规则到数组
    const adFilterRules = globalConfig.adFilterRules || [];
    adFilterRules.push({
        text: ruleText,
        enabled: true,
        dateAdded: new Date().toISOString()
    });
    
    // 更新全局配置
    globalConfig.adFilterRules = adFilterRules;
    
    // 更新规则列表
    renderAdFilterRules();
    
    // 保存规则到存储
    saveRules();
    
    // 清空输入框
    elements.newRuleInput.value = '';
    
    showMessage('规则已添加', 'success');
}

/**
 * 切换规则启用状态
 * @param {number} index - 规则索引
 */
export function toggleRule(index) {
    const adFilterRules = globalConfig.adFilterRules || [];
    
    if (index >= 0 && index < adFilterRules.length) {
        adFilterRules[index].enabled = !adFilterRules[index].enabled;
        
        // 更新全局配置
        globalConfig.adFilterRules = adFilterRules;
        
        // 更新规则列表
        renderAdFilterRules();
        
        // 保存规则到存储
        saveRules();
        
        showMessage(
            adFilterRules[index].enabled ? 
            '规则已启用' : 
            '规则已禁用', 
            'info'
        );
    }
}

/**
 * 删除规则
 * @param {number} index - 规则索引
 */
export function deleteRule(index) {
    const adFilterRules = globalConfig.adFilterRules || [];
    
    if (index >= 0 && index < adFilterRules.length) {
        if (confirm('确定要删除此规则吗？')) {
            // 从数组中移除规则
            adFilterRules.splice(index, 1);
            
            // 更新全局配置
            globalConfig.adFilterRules = adFilterRules;
            
            // 更新规则列表
            renderAdFilterRules();
            
            // 保存规则到存储
            saveRules();
            
            showMessage('规则已删除', 'success');
        }
    }
}

/**
 * 保存规则到存储
 */
export function saveRules() {
    updateConfig({ adFilterRules: globalConfig.adFilterRules });
}

/**
 * 导出规则
 */
export function exportRules() {
    const adFilterRules = globalConfig.adFilterRules || [];
    
    if (adFilterRules.length === 0) {
        showMessage('没有规则可导出', 'warning');
        return;
    }
    
    // 生成规则文本
    let rulesText = '! 异议扩展 - 自定义广告过滤规则\n';
    rulesText += '! 导出时间: ' + new Date().toLocaleString() + '\n\n';
    
    adFilterRules.forEach(rule => {
        // 仅导出已启用的规则
        if (rule.enabled) {
            rulesText += rule.text + '\n';
        } else {
            // 对禁用的规则添加注释标记
            rulesText += '! 已禁用: ' + rule.text + '\n';
        }
    });
    
    // 创建下载链接
    const blob = new Blob([rulesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'objection_filter_rules.txt';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // 清理
    setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
    }, 100);
    
    showMessage('规则已导出', 'success');
}

/**
 * 导入规则
 * @param {string} fileContent - 文件内容
 */
export function importRules(fileContent) {
    // 按行分割文本
    const lines = fileContent.split('\n');
    let importedCount = 0;
    let skippedCount = 0;
    
    // 处理每一行
    lines.forEach(line => {
        // 忽略空行和注释
        const trimmedLine = line.trim();
        if (trimmedLine === '' || trimmedLine.startsWith('!') || trimmedLine.startsWith('#')) {
            return;
        }
        
        // 验证规则
        const validation = validateRule(trimmedLine);
        if (validation.valid) {
            // 添加新规则
            const adFilterRules = globalConfig.adFilterRules || [];
            adFilterRules.push({
                text: trimmedLine,
                enabled: true,
                dateAdded: new Date().toISOString()
            });
            
            // 更新全局配置
            globalConfig.adFilterRules = adFilterRules;
            
            importedCount++;
        } else if (validation.message === '该规则已存在') {
            skippedCount++;
        }
    });
    
    // 更新规则列表
    renderAdFilterRules();
    
    // 保存规则到存储
    saveRules();
    
    // 显示导入结果
    if (importedCount > 0) {
        showMessage(`已导入 ${importedCount} 条规则，跳过 ${skippedCount} 条重复规则`, 'success');
    } else {
        showMessage(`导入完成，跳过 ${skippedCount} 条重复规则`, 'info');
    }
}

/**
 * 初始化广告规则事件监听
 */
export function initializeAdRulesEvents() {
    if (!elements.addRuleBtn || !elements.newRuleInput || 
        !elements.exportRulesBtn || !elements.importRulesBtn || 
        !elements.importRulesFile || !elements.customRulesSwitch) {
        console.error('广告规则相关元素未初始化');
        return;
    }
    
    // 添加新规则按钮事件
    elements.addRuleBtn.addEventListener('click', function() {
        addRule();
    });
    
    // 回车键添加规则
    elements.newRuleInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            addRule();
        }
    });
    
    // 导出规则按钮事件
    elements.exportRulesBtn.addEventListener('click', function() {
        exportRules();
    });
    
    // 导入规则按钮事件
    elements.importRulesBtn.addEventListener('click', function() {
        elements.importRulesFile.click();
    });
    
    // 导入规则文件改变事件
    elements.importRulesFile.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            
            // 检查文件类型和大小
            if (!file.name.endsWith('.txt')) {
                showMessage('请选择.txt文本文件', 'warning');
                return;
            }
            
            if (file.size > 1024 * 1024) { // 1MB
                showMessage('文件过大，请选择小于1MB的文件', 'warning');
                return;
            }
            
            // 读取文件内容
            const reader = new FileReader();
            reader.onload = function(e) {
                importRules(e.target.result);
            };
            reader.onerror = function() {
                showMessage('读取文件失败', 'danger');
            };
            reader.readAsText(file);
            
            // 清除文件选择，以便再次选择同一文件
            this.value = '';
        }
    });
    
    // 自定义规则开关事件
    elements.customRulesSwitch.addEventListener('change', function() {
        // 保存开关状态
        updateConfig({ customRulesEnabled: this.checked });
        
        showMessage(this.checked ? '已启用自定义过滤规则' : '已禁用自定义过滤规则', 'info');
    });
}