import pino from 'pino';
import pretty from 'pino-pretty';

const stream = pretty({ colorize: true });
const env = Bun.env.BUN_ENV;
const logger = env === 'dev' ? pino(stream) : pino();

export default logger;