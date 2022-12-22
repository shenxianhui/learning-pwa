var cacheName = 'bs-0-2-0'
var apiCacheName = 'api-0-1-1'
var cacheFiles = [
  '/',
  './index.html',
  './index.js',
  './style.css',
  './img/book.png',
  './img/loading.svg',
]

// 监听install事件，安装完成后，进行文件缓存
self.addEventListener('install', function (e) {
  console.log('Service Worker 状态： install')
  var cacheOpenPromise = caches.open(cacheName).then(function (cache) {
    return cache.addAll(cacheFiles)
  })

  e.waitUntil(cacheOpenPromise)
})

self.addEventListener('fetch', function (e) {
  // 需要缓存的xhr请求
  var cacheRequestUrls = ['/hitokoto']

  // console.log('现在正在请求：' + e.request.url)

  // 判断当前请求是否需要缓存
  var needCache = cacheRequestUrls.some(function (url) {
    return e.request.url.indexOf(url) > -1
  })

  /**** 这里是对XHR数据缓存的相关操作 ****/
  if (needCache) {
    // 需要缓存
    // 使用fetch请求数据，并将请求结果clone一份缓存到cache
    // 此部分缓存后在browser中使用全局变量caches获取
    caches.open(apiCacheName).then(function (cache) {
      return fetch(e.request).then(function (response) {
        cache.put(e.request.url, response.clone())
        return response
      })
    })
  } else {
    /* ******************************* */
    // 非api请求，直接查询cache
    // 如果有cache则直接返回，否则通过fetch请求
    e.respondWith(
      caches
        .match(e.request)
        .then(function (cache) {
          return cache || fetch(e.request)
        })
        .catch(function (err) {
          console.log(err)
          return fetch(e.request)
        }),
    )
  }
})

self.addEventListener('activate', function (e) {
  console.log('Service Worker 状态： activate')
  var cachePromise = caches.keys().then(function (keys) {
    return Promise.all(
      keys.map(function (key) {
        if (key !== cacheName) {
          return caches.delete(key)
        }
      }),
    )
  })

  e.waitUntil(cachePromise)

  return self.clients.claim()
})

// 监听 push 事件
self.addEventListener('push', function (e) {
  const { data } = e

  if (!data) return

  // 解析获取推送消息
  let payload = data.json()
  // 根据推送消息生成桌面通知并展现出来
  let title = payload.title
  let options = {
    body: payload.body || '新消息',
    icon: payload.icon || '/img/icons/book-128.png',
    data: {
      url: payload.url,
    },
    actions: [
      {
        action: 'browse',
        title: '去看看',
      },
      {
        action: 'contact-me',
        title: '联系我',
      },
    ],
    tag: 'pwa-starter',
    renotify: true,
  }
  let promise = self.registration.showNotification(title, options)

  e.waitUntil(promise)
})

// 监听通知点击事件
self.addEventListener('notificationclick', function (e) {
  const { notification = {}, action } = e
  const { data = {} } = notification
  const { url = '' } = data

  console.log('用户点击: ', action)
  // 关闭窗口
  e.notification.close()
  // 打开网页
  if (action === 'contact-me') {
    e.waitUntil(clients.openWindow('mailto:shenxh0928@gmail.com'))
  } else {
    e.waitUntil(
      // 获取所有clients
      self.clients.matchAll().then(function (clientsList) {
        // 切换到该站点的tab
        clientsList &&
          clientsList.length &&
          clientsList[0].focus &&
          clientsList[0].focus()

        self.clients.openWindow(url)
      }),
    )
  }
})

class SimpleEvent {
  constructor() {
    this.listenrs = {}
  }

  once(tag, cb) {
    this.listenrs[tag] || (this.listenrs[tag] = [])
    this.listenrs[tag].push(cb)
  }

  trigger(tag, data) {
    this.listenrs[tag] = this.listenrs[tag] || []
    let listenr
    while ((listenr = this.listenrs[tag].shift())) {
      listenr(data)
    }
  }
}

const simpleEvent = new SimpleEvent()

// 监听 sync 事件
self.addEventListener('sync', function (e) {
  console.log(`service worker需要进行后台同步，tag: ${e.tag}`)
  var init = {
    method: 'GET',
  }
  if (e.tag === 'sample_sync') {
    var request = new Request(`sync?name=AlienZHOU`, init)
    e.waitUntil(
      fetch(request).then(function (response) {
        response.json().then(console.log.bind(console))
        return response
      }),
    )
  }

  // sample_sync_event同步事件，使用postMessage来进行数据通信
  else if (e.tag === 'sample_sync_event') {
    let msgPromise = new Promise(function (resolve, reject) {
      // 监听message事件中触发的事件通知
      simpleEvent.once('bgsync', function (data) {
        resolve(data)
      })
      // 五秒超时
      setTimeout(resolve, 5000)
    })

    e.waitUntil(
      msgPromise
        .then(function (data) {
					console.log(data)
          var name = data && data.name ? data.name : 'anonymous'
          var request = new Request(`sync?name=${name}`, init)
          return fetch(request)
        })
        .then(function (response) {
          response.json().then(console.log.bind(console))
          return response
        }),
    )
  }

  // sample_sync_db同步事件，使用indexedDB来获取需要同步的数据
  else if (e.tag === 'sample_sync_db') {
    // 将数据库查询封装为Promise类型的请求
    var dbQueryPromise = new Promise(function (resolve, reject) {
      var STORE_NAME = 'SyncData'
      // 连接indexedDB
      openStore(e.tag).then(function (db) {
        try {
          // 创建事务进行数据库查询
          var tx = db.transaction(STORE_NAME, 'readonly')
          var store = tx.objectStore(STORE_NAME)
          var dbRequest = store.get(e.tag)
          dbRequest.onsuccess = function (e) {
            resolve(e.target.result)
          }
          dbRequest.onerror = function (err) {
            reject(err)
          }
        } catch (err) {
          reject(err)
        }
      })
    })

    e.waitUntil(
      // 通过数据库查询获取需要同步的数据
      dbQueryPromise
        .then(function (data) {
          console.log(data)
          var name = data && data.name ? data.name : 'anonymous'
          var request = new Request(`sync?name=${name}`, init)
          return fetch(request)
        })
        .then(function (response) {
          response.json().then(console.log.bind(console))
          return response
        }),
    )
  }
})

/**
 * 连接并打开存储
 * @param {string} storeName 存储的名称
 * @return {Promise}
 */
function openStore(storeName) {
  return new Promise(function (resolve, reject) {
    var request = indexedDB.open('PWA_DB', 1)
    request.onerror = function (e) {
      console.log('连接数据库失败')
      reject(e)
    }
    request.onsuccess = function (e) {
      console.log('连接数据库成功')
      resolve(e.target.result)
    }
  })
}

// 监听 message 事件
self.addEventListener('message', function (e) {
  var data = JSON.parse(e.data)
  var type = data.type
  var msg = data.msg
  console.log(
    `service worker收到消息 type：${type}；msg：${JSON.stringify(msg)}`,
  )

  simpleEvent.trigger(type, msg)
})
