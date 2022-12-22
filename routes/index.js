const router = require('koa-router')()
const { koaBody } = require('koa-body')
const webpush = require('web-push')
const util = require('../util')

// 使用web-push进行消息推送
const options = {
  proxy: 'http://50.114.128.17:3128' // 使用FCM（Chrome）需要配置代理 https://www.freeproxylists.net/zh/
}

// VAPID
const VAPIDKeys = {
	publicKey: 'BBdnWrL4IvOnrIhU5hsQoAu-TPjsWAPPAuVcVHgVbKPXByBAA2mibDtRkrUel_0C-im5JCSNfev-8_ZdWdmJNCY',
	privateKey: 'F4TDX26alavzKfg7VpEbP_fmEmwc5E1FlRYVKdDJGj8'
}

// 设置 web-push 的 VAPID 值
webpush.setVapidDetails(
  'mailto:shenxh0928@gmail.com',
  VAPIDKeys.publicKey,
  VAPIDKeys.privateKey,
)

/**
 * @description: 提交 subscription 信息，并保存
 * @return {*}
 */
router.post('/subscription', koaBody(), async (ctx) => {
  let body = ctx.request.body
  await util.saveRecord(body)
  ctx.response.body = {
    success: true,
  }
})

/**
 * @description: 消息推送API，可以在管理后台进行调用
 * @return {*}
 */
router.post('/push', koaBody(), async (ctx) => {
	const data = ctx.request.body
  let { uniqueid } = data
  let list = uniqueid ? await util.find({ uniqueid }) : await util.findAll()

  for (let i = 0; i < list.length; i++) {
    let subscription = list[i].subscription
    pushMessage(subscription, JSON.stringify(data))
  }

  ctx.response.body = {
    data: list,
  }
})

/**
 * 向push service推送信息
 * @param {*} subscription
 * @param {*} data
 */
function pushMessage(subscription, data = {}) {
  webpush
    .sendNotification(subscription, data, options)
    .then((res) => {
      console.log('push service的相应数据:', JSON.stringify(res))
      return
    })
    .catch((err) => {
      // 判断状态码，440和410表示失效
      if (err.statusCode === 410 || err.statusCode === 404) {
        return util.remove(subscription)
      } else {
        console.log('失败', err)
      }
    })
}

module.exports = router
