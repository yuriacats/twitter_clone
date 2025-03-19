import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import jwtLib from 'jsonwebtoken'
import { createEnv } from "@t3-oss/env-core"
import { z } from 'zod'

const env = createEnv({
  server: {
    SECRET: z.string().default('secret'),
    AUTH0_DOMAIN: z.string().default(''),
    AUTH0_AUDIENCE: z.string().default(''),
  },
  runtimeEnv: process.env,
})

const app = new Hono()

app.get('/', (c) => {
  return c.json({ response: 'Hello Hono!' })
})

app.post('/login', async (c) => {
  const body = await c.req.json()
  const { username } = body

  if (!username) {
    return c.json({ error: 'Username is required' }, 400)
  }

  // JWTを発行（有効期限1時間）
  const token = jwtLib.sign({ sub: username }, env.SECRET, { expiresIn: '1h' })

  return c.json({ token })
})

app.use('/protected/*', jwt({
  secret: env.SECRET,
}))
app.get('/protected/user', (c) => {
  const user = c.get('jwtPayload') // Auth0のペイロードデータ
  const content = user.sub == 'admin' ? 'Admin' : 'User'
  return c.json({ message: 'Authenticated', content })
})

app.get('protected/me', (c) => {
  const { sub } = c.get('jwtPayload')
  const user = { sub }
  return c.json({ user })
})

export default app
