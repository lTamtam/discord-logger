import Redis from 'ioredis';

const redis = new Redis({
    host: Bun.env.REDIS_HOST!,
    port: parseInt(Bun.env.REDIS_PORT!),
    password: Bun.env.REDIS_PASSWORD!
});

export default redis;