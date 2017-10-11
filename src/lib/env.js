import yenv from 'yenv'

/**
 * export what `yenv()` returns.
 */
const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  load: (newEnv) => Object.assign(env, yenv('env.yaml', { env: newEnv })),
  ...yenv()
}

export default env
