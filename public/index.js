// 注册service worker，service worker脚本文件为sw.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(function () {
    console.log('Service Worker 注册成功')
  })
}

function onClick(e) {
  getData()
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
