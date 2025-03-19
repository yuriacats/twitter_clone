import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.json({ response:'Hello Hono!'})
})

export default app
