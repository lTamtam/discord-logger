import { ScanStream } from 'ioredis';
import redis from '../databases/redis';
import logger from './pino-logger';

/**
 * Deletes every key returned by a redis stream
 * @arg {ScanStream} stream 
 * @arg {{}} loggerArgs 
 * @returns {Promise<void>}
 */
export async function deleteStreamKeys(stream: ScanStream, loggerArgs: {}): Promise<void> {
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