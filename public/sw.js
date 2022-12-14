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
