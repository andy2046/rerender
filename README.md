# koa-rerender

===========================

koa-rerender is perfect for Single Page Application SEO.

koa-rerender is a service that uses Chrome headless to create static HTML out of a javascript page.

## Installation

```
npm install --save koa-rerender
```

## Usage
You can import from `koa-rerender`:

```js
import { isCrawler, launch } from 'koa-rerender';

if (isCrawler(ctx.request)) {
  const reRender = await launch()
  const html = await reRender.render({ url: 'https://reactjs.org/docs/portals.html' })
}

```