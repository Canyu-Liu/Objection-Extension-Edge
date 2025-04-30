// 广告拦截规则模块 - 处理广告过滤规则的解析、组织和匹配

// 广告规则类型枚举
export const RULE_TYPES = {
  ELEMENT_HIDING: 'ELEMENT_HIDING',      // 元素隐藏规则: ##.ad
  ELEMENT_HIDING_EXCEPTION: 'ELEMENT_HIDING_EXCEPTION', // 元素隐藏例外: #@#.ad
  URL_BLOCKING: 'URL_BLOCKING',          // URL 阻止规则: ||example.com/banner.jpg
  URL_BLOCKING_EXCEPTION: 'URL_BLOCKING_EXCEPTION', // URL 阻止例外: @@||example.com/banner.jpg
  COMMENT: 'COMMENT',                    // 注释: ! 这是注释
  UNKNOWN: 'UNKNOWN'                     // 未知规则
};

// 自定义广告过滤规则
export let customFilterRules = [];

// 解析后的规则对象存储
export let parsedRules = {
  domainRules: {}, // 域名特定规则
  globalRules: []  // 全局规则
};

/**
 * 转义正则表达式特殊字符
 * @param {string} string - 需要转义的字符串
 * @returns {string} - 转义后的字符串
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 将AdGuard URL规则转换为正则表达式
 * @param {string} rule - AdGuard规则
 * @returns {RegExp|null} - 转换后的正则表达式
 */
function convertUrlRuleToRegex(rule) {
  let regexStr = rule;
  
  // 处理开头的竖线(代表开始)
  if (regexStr.startsWith('||')) {
    regexStr = regexStr.substring(2);
    regexStr = '(^|\\.)' + escapeRegExp(regexStr);
  } else if (regexStr.startsWith('|')) {
    regexStr = regexStr.substring(1);
    regexStr = '^' + escapeRegExp(regexStr);
  } else {
    regexStr = escapeRegExp(regexStr);
  }
  
  // 处理结尾的竖线(代表结束)
  if (regexStr.endsWith('|')) {
    regexStr = regexStr.substring(0, regexStr.length - 1) + '$';
  }
  
  // 处理特殊字符
  regexStr = regexStr
    .replace(/\\\^/g, '(?:[^\\w\\d_.%-]|$)') // ^ 表示分隔符
    .replace(/\\\*/g, '.*');                  // * 表示任意字符
  
  try {
    return new RegExp(regexStr, 'i');
  } catch (e) {
    console.error('无法将规则转换为正则表达式:', rule, e);
    return null;
  }
}

/**
 * 解析AdGuard过滤规则
 * @param {string} rule - 规则文本
 * @returns {Object|null} - 解析后的规则对象
 */
export function parseFilterRule(rule) {
  const trimmedRule = rule.trim();
  
  // 忽略空行
  if (!trimmedRule) {
    return null;
  }
  
  // 处理注释
  if (trimmedRule.startsWith('!') || trimmedRule.startsWith('#')) {
    return {
      type: RULE_TYPES.COMMENT,
      content: trimmedRule
    };
  }
  
  // 处理URL阻止例外规则
  if (trimmedRule.startsWith('@@')) {
    const urlRule = trimmedRule.substring(2);
    return {
      type: RULE_TYPES.URL_BLOCKING_EXCEPTION,
      content: urlRule,
      regex: convertUrlRuleToRegex(urlRule)
    };
  }
  
  // 处理元素隐藏例外规则
  if (trimmedRule.includes('#@#')) {
    const [domains, selector] = trimmedRule.split('#@#');
    return {
      type: RULE_TYPES.ELEMENT_HIDING_EXCEPTION,
      domains: domains ? domains.split(',') : [],
      selector: selector.trim()
    };
  }
  
  // 处理元素隐藏规则
  if (trimmedRule.includes('##') || trimmedRule.includes('#?#')) {
    const separator = trimmedRule.includes('##') ? '##' : '#?#';
    const [domains, selector] = trimmedRule.split(separator);
    return {
      type: RULE_TYPES.ELEMENT_HIDING,
      domains: domains ? domains.split(',') : [],
      selector: selector.trim()
    };
  }
  
  // 处理URL阻止规则
  if (trimmedRule.startsWith('||') || 
      trimmedRule.startsWith('|') || 
      trimmedRule.includes('^') || 
      trimmedRule.includes('*')) {
    return {
      type: RULE_TYPES.URL_BLOCKING,
      content: trimmedRule,
      regex: convertUrlRuleToRegex(trimmedRule)
    };
  }
  
  // 未能识别的规则
  return {
    type: RULE_TYPES.UNKNOWN,
    content: trimmedRule
  };
}

/**
 * 组织规则到结构化格式，便于快速匹配
 */
export function organizeRules() {
  // 清空当前规则
  parsedRules = {
    domainRules: {},
    globalRules: []
  };
  
  customFilterRules.forEach(rule => {
    const parsedRule = parseFilterRule(rule.text || rule);
    if (!parsedRule) return;
    
    // 忽略注释和未知规则
    if (parsedRule.type === RULE_TYPES.COMMENT || parsedRule.type === RULE_TYPES.UNKNOWN) {
      return;
    }
    
    // 忽略禁用的规则
    if (rule.text && rule.enabled === false) {
      return;
    }
    
    // 处理元素隐藏规则
    if (parsedRule.type === RULE_TYPES.ELEMENT_HIDING) {
      if (parsedRule.domains && parsedRule.domains.length > 0) {
        // 域名特定规则
        parsedRule.domains.forEach(domain => {
          const domainKey = domain.startsWith('~') ? domain.substring(1) : domain;
          const isException = domain.startsWith('~');
          
          if (!parsedRules.domainRules[domainKey]) {
            parsedRules.domainRules[domainKey] = {
              elementHiding: [],
              elementHidingException: [],
              urlBlocking: [],
              urlBlockingException: []
            };
          }
          
          if (isException) {
            parsedRules.domainRules[domainKey].elementHidingException.push({
              selector: parsedRule.selector,
              isException: true
            });
          } else {
            parsedRules.domainRules[domainKey].elementHiding.push({
              selector: parsedRule.selector
            });
          }
        });
      } else {
        // 全局规则
        parsedRules.globalRules.push({
          type: RULE_TYPES.ELEMENT_HIDING,
          selector: parsedRule.selector
        });
      }
    }
    
    // 处理元素隐藏例外规则
    else if (parsedRule.type === RULE_TYPES.ELEMENT_HIDING_EXCEPTION) {
      if (parsedRule.domains && parsedRule.domains.length > 0) {
        parsedRule.domains.forEach(domain => {
          if (!parsedRules.domainRules[domain]) {
            parsedRules.domainRules[domain] = {
              elementHiding: [],
              elementHidingException: [],
              urlBlocking: [],
              urlBlockingException: []
            };
          }
          
          parsedRules.domainRules[domain].elementHidingException.push({
            selector: parsedRule.selector,
            isException: true
          });
        });
      } else {
        // 全局例外规则
        parsedRules.globalRules.push({
          type: RULE_TYPES.ELEMENT_HIDING_EXCEPTION,
          selector: parsedRule.selector,
          isException: true
        });
      }
    }
    
    // URL阻止规则
    else if (parsedRule.type === RULE_TYPES.URL_BLOCKING) {
      parsedRules.globalRules.push({
        type: RULE_TYPES.URL_BLOCKING,
        content: parsedRule.content,
        regex: parsedRule.regex
      });
    }
    
    // URL阻止例外规则
    else if (parsedRule.type === RULE_TYPES.URL_BLOCKING_EXCEPTION) {
      parsedRules.globalRules.push({
        type: RULE_TYPES.URL_BLOCKING_EXCEPTION,
        content: parsedRule.content,
        regex: parsedRule.regex,
        isException: true
      });
    }
  });
  
  console.log('广告过滤规则已解析和组织:', {
    domainRuleCount: Object.keys(parsedRules.domainRules).length,
    globalRuleCount: parsedRules.globalRules.length
  });
}

/**
 * 验证过滤规则
 * @param {Array<string>} rules - 规则数组
 * @returns {Array<Object>} - 验证结果数组
 */
export function validateFilterRules(rules) {
  const validResults = [];
  
  rules.forEach(rule => {
    try {
      const parsedRule = parseFilterRule(rule);
      let isValid = false;
      let ruleType = '未知';
      
      if (parsedRule) {
        isValid = true;
        
        switch (parsedRule.type) {
          case RULE_TYPES.ELEMENT_HIDING:
            ruleType = '元素隐藏规则';
            break;
          case RULE_TYPES.ELEMENT_HIDING_EXCEPTION:
            ruleType = '元素隐藏例外';
            break;
          case RULE_TYPES.URL_BLOCKING:
            ruleType = 'URL阻止规则';
            break;
          case RULE_TYPES.URL_BLOCKING_EXCEPTION:
            ruleType = 'URL阻止例外';
            break;
          case RULE_TYPES.COMMENT:
            ruleType = '注释';
            break;
          default:
            ruleType = '未知规则类型';
        }
      }
      
      validResults.push({
        rule,
        isValid,
        ruleType
      });
    } catch (e) {
      validResults.push({
        rule,
        isValid: false,
        error: e.message
      });
    }
  });
  
  return validResults;
}

/**
 * 检查URL是否应该被阻止
 * @param {string} url - URL字符串
 * @returns {Object} - 检查结果
 */
export function checkUrlBlocking(url) {
  if (!url || typeof url !== 'string') {
    return { blocked: false };
  }
  
  try {
    // 检查URL是否应该被阻止
    let shouldBlock = false;
    let matchedRule = null;
    
    // 检查例外规则
    const exceptionRules = parsedRules.globalRules.filter(
      r => r.type === RULE_TYPES.URL_BLOCKING_EXCEPTION && r.regex);
      
    const isException = exceptionRules.some(rule => {
      const matches = rule.regex.test(url);
      if (matches) {
        matchedRule = rule.content;
        return true;
      }
      return false;
    });
    
    if (isException) {
      console.log(`URL例外匹配: ${url} - 规则: ${matchedRule}`);
      return { blocked: false, reason: 'exception', rule: matchedRule };
    }
    
    // 检查阻止规则
    const blockingRules = parsedRules.globalRules.filter(
      r => r.type === RULE_TYPES.URL_BLOCKING && r.regex);
      
    shouldBlock = blockingRules.some(rule => {
      const matches = rule.regex.test(url);
      if (matches) {
        matchedRule = rule.content;
        return true;
      }
      return false;
    });
    
    if (shouldBlock) {
      console.log(`URL阻止匹配: ${url} - 规则: ${matchedRule}`);
      return { blocked: true, rule: matchedRule };
    } else {
      return { blocked: false };
    }
  } catch (error) {
    console.error('URL阻止检查时出错:', error);
    return { blocked: false, error: error.message };
  }
}

/**
 * 更新广告过滤规则
 * @param {Array<Object>} newRules - 新规则数组
 */
export function updateFilterRules(newRules) {
  customFilterRules = newRules;
  organizeRules();
}

/**
 * 为特定域名生成选择器列表
 * @param {string} domain - 网站域名
 * @returns {Array<string>} - CSS选择器数组
 */
export function generateSelectorsForDomain(domain) {
  // 获取当前网页域名的相关规则
  const domainRules = parsedRules.domainRules[domain] || {
    elementHiding: [],
    elementHidingException: []
  };
  
  // 准备选择器列表
  const selectors = [...parsedRules.globalRules
    .filter(r => r.type === RULE_TYPES.ELEMENT_HIDING)
    .map(r => r.selector)];
    
  if (domainRules.elementHiding && domainRules.elementHiding.length) {
    selectors.push(...domainRules.elementHiding.map(r => r.selector));
  }
  
  return selectors;
}