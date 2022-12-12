const VAPIDPublicKey =
  'BOEQSjdhorIf8M0XFNlwohK3sTzO9iJwvbYU-fuXRF0tvRpPPMGO6d_gJC_pUQwBT7wD8rKutpNTFHOHN3VqJ0A'
// 注册 service worker 并缓存 registration
let registration

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
