const VAPIDPublicKey =
  'BBdnWrL4IvOnrIhU5hsQoAu-TPjsWAPPAuVcVHgVbKPXByBAA2mibDtRkrUel_0C-im5JCSNfev-8_ZdWdmJNCY'
// 注册 service worker 并缓存 registration
let registration

// 注册service worker，service worker脚本文件为sw.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(function () {
    console.log('Service Worker 注册成功')
  })
}

function getData() {
  const contentDom = document.getElementById('content')
  var url = 'https://api.wrdan.com/hitokoto'
  var cacheData

  contentDom.innerHTML = ''

  var remotePromise = getApiDataRemote(url)
  getApiDataFromCache(url)
    .then(function (data) {
      if (data) {
        contentDom.innerHTML = data.text
      }

      cacheData = data || {}

      return remotePromise
    })
    .then(function (data) {
      if (data && JSON.stringify(data) !== JSON.stringify(cacheData)) {
        contentDom.innerHTML = data.text
      }
    })
}

function getApiDataRemote(url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest()
    xhr.timeout = 60000
    xhr.onreadystatechange = function () {
      var response = {}
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          response = JSON.parse(xhr.responseText)
        } catch (e) {
          response = xhr.responseText
        }
        resolve(response)
      } else if (xhr.readyState === 4) {
        resolve()
      }
    }
    xhr.onabort = reject
    xhr.onerror = reject
    xhr.ontimeout = reject
    xhr.open('GET', url, true)
    xhr.send(null)
  })
}

function getApiDataFromCache(url) {
  if ('caches' in window) {
    return caches.match(url).then(function (cache) {
      if (!cache) {
        return
      }
      return cache.json()
    })
  } else {
    return Promise.resolve()
  }
}

// 注册 service worker
registerServiceWorker()
  // 申请桌面通知权限
  .then(function () {
    requestNotificationPermission()
  })
  // 订阅推送
  .then(function () {
    subscribeAndDistribute(registration)
  })
  .catch(function (err) {
    console.log(err)
  })

function registerServiceWorker() {
  if (!navigator.serviceWorker) {
    return Promise.reject('系统不支持 service worker')
  }

  return navigator.serviceWorker.register('./sw.js').then(function (reg) {
    registration = reg
  })
}

// 申请桌面通知权限
function requestNotificationPermission() {
  // 系统不支持桌面通知
  if (!window.Notification) {
    return Promise.reject('系统不支持桌面通知')
  }
  return Notification.requestPermission().then(function (permission) {
    if (permission === 'granted') {
      return Promise.resolve()
    }
    return Promise.reject('用户已禁止桌面通知权限')
  })
}

// 订阅推送并将订阅结果发送给后端
function subscribeAndDistribute(registration) {
  if (!window.PushManager) {
    return Promise.reject('系统不支持消息推送')
  }
  // 检查是否已经订阅过
  return registration.pushManager
    .getSubscription()
    .then(function (subscription) {
      // 如果已经订阅过，就不重新订阅了
      if (subscription) {
        distributePushResource(subscription)
      } else {
        return (
          // 订阅
          registration.pushManager
            .subscribe({
              userVisibleOnly: true,
              applicationServerKey: window.base64ToUint8Array(VAPIDPublicKey),
            })
            .then(function (subscription) {
              distributePushResource(subscription)
            })
        )
      }
    })
}

// 将订阅信息传给后端服务器
function distributePushResource(subscription) {
  // 为了方便之后的推送，为每个客户端简单生成一个标识
  const body = {
    subscription,
    uniqueid: new Date().getTime(),
  }
  console.log('uniqueid', body.uniqueid)

  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest()
    xhr.timeout = 60000
    xhr.onreadystatechange = function () {
      var response = {}
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          response = JSON.parse(xhr.responseText)
        } catch (e) {
          response = xhr.responseText
        }
        resolve(response)
      } else if (xhr.readyState === 4) {
        resolve()
      }
    }
    xhr.onabort = reject
    xhr.onerror = reject
    xhr.ontimeout = reject
    xhr.open('POST', '/subscription', true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send(JSON.stringify(body))
  })
}

/* service worker background sync 相关部分 👇 */

var STORE_NAME = 'SyncData'

if ('serviceWorker' in navigator && 'SyncManager' in window) {
  // background sync 基础版
  navigator.serviceWorker.ready.then(function (registration) {
    var tag = 'sample_sync'

    document
      .getElementById('js-sync-btn')
      .addEventListener('click', function () {
        registration.sync
          .register(tag)
          .then(function () {
            console.log('后台同步已触发', tag)
          })
          .catch(function (err) {
            console.log('后台同步触发失败', err)
          })
      })
  })

  // 使用 postMessage 来传输 sync 数据
  navigator.serviceWorker.ready.then(function (registration) {
    var tag = 'sample_sync_event'

    document
      .getElementById('js-sync-event-btn')
      .addEventListener('click', function () {
        registration.sync
          .register(tag)
          .then(function () {
            console.log('后台同步已触发', tag)

            // 使用postMessage进行数据通信
            var inputValue = document.querySelector('#js-search-input').value
            var msg = JSON.stringify({
              type: 'bgsync',
              msg: { name: inputValue },
            })

            navigator.serviceWorker.controller.postMessage(msg)
          })
          .catch(function (err) {
            console.log('后台同步触发失败', err)
          })
      })
  })

  // 使用indexedDB来传输sync数据
  navigator.serviceWorker.ready
    .then(function (registration) {
      return Promise.all([openStore(STORE_NAME), registration])
    })
    .then(function (result) {
      var db = result[0]
      var registration = result[1]
      var tag = 'sample_sync_db'

      document
        .getElementById('js-sync-db-btn')
        .addEventListener('click', function () {
          // 将数据存储进indexedDB
          var inputValue = document.querySelector('#js-search-input').value
          var tx = db.transaction(STORE_NAME, 'readwrite')
          var store = tx.objectStore(STORE_NAME)
          var item = {
            tag: tag,
            name: inputValue,
          }
          store.put(item)

          registration.sync
            .register(tag)
            .then(function () {
              console.log('后台同步已触发', tag)
            })
            .catch(function (err) {
              console.log('后台同步触发失败', err)
            })
        })
    })
}

/**
 * 连接并打开存储，使用indexedDB
 * @param {string} storeName 存储的名称
 * @return {Promise}
 */
function openStore(storeName) {
  return new Promise(function (resolve, reject) {
    if (!('indexedDB' in window)) {
      reject("don't support indexedDB")
    }
    var request = indexedDB.open('PWA_DB', 1)
    request.onerror = function (e) {
      console.log('连接数据库失败')
      reject(e)
    }
    request.onsuccess = function (e) {
      console.log('连接数据库成功')
      resolve(e.target.result)
    }
    request.onupgradeneeded = function (e) {
      console.log('数据库版本升级')
      var db = e.srcElement.result
      if (e.oldVersion === 0) {
        if (!db.objectStoreNames.contains(storeName)) {
          var store = db.createObjectStore(storeName, {
            keyPath: 'tag',
          })
          store.createIndex(storeName + 'Index', 'tag', { unique: false })
          console.log('创建索引成功')
        }
      }
    }
  })
}
/* service worker background sync 相关部分 👆 */
