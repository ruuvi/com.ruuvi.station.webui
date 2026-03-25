/* eslint-disable no-console */
const noop = () => { }

const isProd = typeof import.meta !== "undefined" && import.meta.env?.PROD

const logger = {
    log: isProd ? noop : console.log.bind(console),
    warn: isProd ? noop : console.warn.bind(console),
    error: isProd ? noop : console.error.bind(console),
}

export default logger
