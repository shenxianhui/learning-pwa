const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const logger = require('koa-logger')

const index = require('./routes/index')

// routes
app.use(index.routes(), index.allowedMethods())

app.use(json())
app.use(logger())
app.use(require('koa-static')(__dirname + '/public'))

app.use(
  views(__dirname + '/views', {
    extension: 'ejs',
  }),
)

module.exports = app
