const noop = () => {}

const logger = console || { error: noop, debug: noop }

export default logger
