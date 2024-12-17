import { PrismaClient } from '@prisma/client';
import logger from '../utils/pino-logger';

const prisma = new PrismaClient({
    log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' }
    ]
});

const env = Bun.env.BUN_ENV!;

if (env.toLowerCase() === 'dev') {
    prisma.$on('query', (e) => {
        logger.info({ app: 'Database', query: e.query.replaceAll('\"', ''), params: e.params.replaceAll('\"', ''), duration: e.duration });
    });
    prisma.$on('info', (e) => {
        logger.info({ app: 'Database', info: e });
    });
    prisma.$on('warn', (e) => {
        logger.warn({ app: 'Database', warn: e });
    });
    prisma.$on('error', (e) => {
        logger.error({ app: 'Database', err: { target: e.target, msg: e.message.replaceAll('\\n', ''), timestamp: e.timestamp } });
    });
}

export default prisma;