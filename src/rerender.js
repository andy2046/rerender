import CDP            from 'chrome-remote-interface'
const chromeLauncher = require('chrome-launcher')

const ERR_REQUIRE_URL = new Error('url option required')
const ERR_RENDER_TIMEOUT = new Error('render timeout')
const ERR_PAGE_LOAD_FAILED = new Error('page load failed')

let instance

const defaultChromeOpts = {
  // port: 9222,
  startingUrl: 'about:blank',
  headless: false
}

const crawlerUserAgents = [
  'googlebot',
  'yahoo',
  'bingbot',
  'baiduspider',
  'facebookexternalhit',
  'twitterbot',
  'rogerbot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest/0.',
  'developers.google.com/+/web/snippet',
  'slackbot',
  'vkShare',
  'W3C_Validator',
  'redditbot',
  'Applebot',
  'WhatsApp',
  'flipboard',
  'tumblr',
  'bitlybot',
  'SkypeUriPreview',
  'nuzzel',
  'Discordbot',
  'Google Page Speed',
  'Qwantify',
  'pinterestbot'
];

const extensionsToIgnore = [
  '.js',
  '.css',
  '.xml',
  '.less',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.pdf',
  '.doc',
  '.txt',
  '.ico',
  '.rss',
  '.zip',
  '.mp3',
  '.rar',
  '.exe',
  '.wmv',
  '.doc',
  '.avi',
  '.ppt',
  '.mpg',
  '.mpeg',
  '.tif',
  '.wav',
  '.mov',
  '.psd',
  '.ai',
  '.xls',
  '.mp4',
  '.m4a',
  '.swf',
  '.dat',
  '.dmg',
  '.iso',
  '.flv',
  '.m4v',
  '.torrent',
  '.woff',
  '.ttf',
  '.svg'
];

class ReRender {
  constructor (options) { // {opt = {x: 3, y: 3}} = {}
    const computed = {...defaultChromeOpts, ...options}
    Object.keys(computed).forEach((key) => {
      this[key] = computed[key]
    })
  }

  render (opts) {
    return new Promise(async (resolve, reject) => {
      const { url, headers = {}, useReady = false, script, renderTimeout = 60000 } = opts
      let _useReady = useReady

      if (!url) {
        throw ERR_REQUIRE_URL
      }

      const protocol = await CDP({ port: this.chromeInstance.port })
      const {
        CSS,
        DOM,
        Network,
        Page,
        Runtime
      } = protocol

      await Promise.all([
        DOM.enable(),
        CSS.enable(),
        Page.enable(),
        Runtime.enable(),
        Network.enable()
      ])

      const timer = setTimeout(() => {
        throw ERR_RENDER_TIMEOUT
        clearTimeout(timer)
      }, renderTimeout)

      // script to evaluate when page on load
      if (typeof script === 'string') {
        Page.addScriptToEvaluateOnLoad({
          scriptSource: script
        })
      }

      // request from rerender
      Network.setExtraHTTPHeaders({
        headers: {'x-rerender': 'ReRender', ...headers}
      })

      // get page HTML string
      const returnHTML = async () => {
        try {
          const dom = await DOM.getDocument()
          const ret = await DOM.getOuterHTML({ nodeId: dom.root.nodeId })
          resolve(ret.outerHTML)
        } catch (error) {
          throw error
        }
        finally {
          clearTimeout(timer)
          setTimeout(async () => {
            await protocol.close()
          }, 2000)
        }
      }

      if (_useReady) {
        Page.frameNavigated(() => {
          // call window.isPageReady to fire page ready event
          if (_useReady) {
            _useReady = false
            Runtime.evaluate({
              awaitPromise: true,
              silent: true,
              expression: `
                new Promise((resolve) => {
                  Object.defineProperty(window, 'isPageReady', {
                    set: function(value) { value > 0 && document.dispatchEvent(new Event('_rePageRendered')) }
                  })
                  document.addEventListener('_rePageRendered', resolve, { once: true })
                })`
            }).then(returnHTML).catch((error) => { throw error })
          }
        })
      } else {
        Page.domContentEventFired(returnHTML)
      }

      await Page.navigate({
        url,
        referer: headers['referer']
      })
    })
  }

  async kill () {
    await this.chromeInstance.kill()
  }

}

export const launch = async function (opts = {}) {
  if (!instance) {
    instance = new ReRender(opts)
    let chromeOpts = {
      chromeFlags: ['--disable-gpu', '--disable-web-security']
    }

    if (instance.port) { chromeOpts.port = instance.port }
    if (instance.headless) { chromeOpts.chromeFlags.push('--headless') }

    const chrome = await chromeLauncher.launch(chromeOpts)
    instance.chromeInstance = chrome
    // eslint-disable-line no-console
    console.log(`Chrome running on port ${chrome.port} with pid ${chrome.pid}`)
  }
  
  return instance
}

export const isCrawler = function (req) {
  const userAgent = req.headers['user-agent']
  const bufferAgent = req.headers['x-bufferbot']
  let isRequestingRerenderPage = false

  if (!userAgent) return false
  if (req.method !== 'GET' && req.method !== 'HEAD') return false

  if (crawlerUserAgents.some(
    (crawlerUserAgent) => {
      return userAgent.toLowerCase().indexOf(crawlerUserAgent.toLowerCase()) !== -1
    }
  )) { isRequestingRerenderPage = true }

  if (bufferAgent) { isRequestingRerenderPage = true }

  if(extensionsToIgnore.some(
    (extension) => {
      return req.url.toLowerCase().indexOf(extension) !== -1
    }
  )) return false

  return isRequestingRerenderPage
}
