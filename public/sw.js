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
  var data = e.data

  if (e.data) {
    data = data.json()
    console.log('push 的数据为：', data)
  } else {
    console.log('没有 push 任何数据')
  }
})
