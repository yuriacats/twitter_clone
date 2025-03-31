import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import jwtLib from 'jsonwebtoken'
import { createEnv } from "@t3-oss/env-core"
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { logger } from 'hono/logger'

const env = createEnv({
  server: {
    SECRET: z.string().default('secret'),
    AUTH0_DOMAIN: z.string().default(''),
    AUTH0_AUDIENCE: z.string().default(''),
  },
  runtimeEnv: process.env,
})

const Prisma = new PrismaClient()
const app = new Hono()
app.use(logger())

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

const getUser = async (sub: string) => {
  const user = await Prisma.profile.findUnique({
    where: { username: sub }
  })
  return user
}

app.get('/protected/user', async (c) => {
  const user = c.get('jwtPayload')

  if (!user || !user.sub) {
    return c.json({ error: 'Invalid user payload' }, 400)
  }
  const userData = await getUser(user.sub)
  const content = userData == null ? 'NonUser' : userData
  console.log('content', content)
  return c.json({ message: 'Authenticated', content, username: user.sub })
})

const profileSchema = z.object({
  name: z.string().min(3).max(30),
  profile: z.string().max(500).optional(),
  icon_url: z.string().url().optional(),
})

app.post('api/profile', async (c) => {
  const body = await c.req.json()
  const result = profileSchema.safeParse(body)
  if (!result.success) {
    return c.json({ error: result.error }, 400)
  }

  const created = await Prisma.profile.create({
    data: {
      username: result.data.name,
      profile: result.data.profile,
      iconUrl: result.data.icon_url,
    }
  })
  return c.json({ created })
})

app.get('protected/me', (c) => {
  const { sub } = c.get('jwtPayload')
  const user = { sub }
  return c.json({ user })
})

export default app
