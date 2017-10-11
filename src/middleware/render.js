import { isCrawler, launch } from '../rerender'
import cheerio from 'cheerio'

export default async function renderHandler (ctx, next) {
  ctx.req.headers = {
    ...ctx.request.headers,
    host: 'reactjs.org',
    referer: ctx.request.headers['referer'] ?
      ctx.request.headers['referer'].replace('1338', '443') :
      '*'
  }

  if(ctx.path === '/' || isCrawler(ctx.request)) {
    const reRender = await launch()
    const html = await reRender.render({ url: 'https://reactjs.org/docs/portals.html' })
    const $ = cheerio.load(html)
    $('head').append(`<script>
    (function(send) {
      XMLHttpRequest.prototype.send = function(data) {
        this.setRequestHeader('x-header', 'xxx')
        send.call(this, data)
      }
    })(XMLHttpRequest.prototype.send);
    </script>`)
    $('a').map(function(i, el) {
      // this === el
      $(this).attr('href').startsWith('/') &&
        $(this).attr('href', 'https://reactjs.org' + $(this).attr('href'))
    })
    ctx.body = $.html()
  } else {
    await next()
  }
}
