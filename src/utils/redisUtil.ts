import { ScanStream } from 'ioredis';
import redis from '../databases/redis';
import logger from './pino-logger';

/**
 * Deletes every key returned by a redis stream
 * @param {ScanStream} stream 
 * @param {{}} loggerArgs 
 */
export async function deleteStreamKeys(stream: ScanStream, loggerArgs: {}) {
    stream.on('data', (d: string[]) => {
        if (d.length) {
            const pipeline = redis.pipeline();
            d.forEach(k => {
                pipeline.del(k);
            });
            pipeline.exec();
        }
    });
    stream.on('end', () => {
        logger.info({
            app: 'Redis',
            ...loggerArgs
        });
    });
    stream.on('error', err => {
        logger.error({
            app: 'Redis',
            ...loggerArgs,
            err: err
        });
    });
};