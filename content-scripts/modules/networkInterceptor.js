// 网络拦截器模块

// 检查 URL 是否应该被阻止
function checkIfUrlShouldBeBlocked(url) {
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage({
                type: 'checkUrlBlocking',
                url: url
            }, response => {
                if (chrome.runtime.lastError) {
                    console.error('检查URL阻止时出错:', chrome.runtime.lastError);
                    resolve(false);
                    return;
                }
                
                resolve(response && response.blocked);
            });
        } catch (error) {
            console.error('检查URL阻止时发生异常:', error);
            resolve(false);
        }
    });
}

// 初始化网络请求拦截
export function interceptNetwork() {
    // 创建一个新的 fetch 函数以拦截请求
    const originalFetch = window.fetch;
    window.fetch = async function(resource, init) {
        try {
            // 检查 URL 是否应该被阻止
            if (typeof resource === 'string') {
                const blocked = await checkIfUrlShouldBeBlocked(resource);
                if (blocked) {
                    console.log(`已阻止请求: ${resource}`);
                    return new Response(new Blob(), { status: 200 });
                }
            }
        } catch (error) {
            console.error('检查 URL 时出错:', error);
        }
        
        // 执行原始的 fetch 请求
        return originalFetch.apply(this, arguments);
    };
    
    // 拦截 XHR 请求
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        this._url = url;
        this._origonalOnreadystatechange = this.onreadystatechange;
        
        this.onreadystatechange = async function() {
            try {
                if (this.readyState === 1) { // OPENED
                    const blocked = await checkIfUrlShouldBeBlocked(this._url);
                    if (blocked) {
                        console.log(`已阻止 XHR 请求: ${this._url}`);
                        this.abort();
                        return;
                    }
                }
            } catch (error) {
                console.error('检查 XHR URL 时出错:', error);
            }
            
            // 调用原始的 onreadystatechange
            if (this._origonalOnreadystatechange) {
                this._origonalOnreadystatechange.apply(this, arguments);
            }
        };
        
        return originalOpen.apply(this, arguments);
    };
}