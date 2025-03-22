import logger from '../utils/pino-logger';

function init(): void {
    const env = {
        BUN_ENV: Bun.env.BUN_ENV,
        TOKEN: !!Bun.env.TOKEN,
        APP_ID: Bun.env.APP_ID,
        BOT_PERMISSIONS: Bun.env.BOT_PERMISSIONS,
        BOT_USERNAME: Bun.env.BOT_USERNAME,
        BOT_AVATAR: Bun.env.BOT_AVATAR,
        WEBHOOK_AVATAR: Bun.env.WEBHOOK_AVATAR,
        USER_DEFAULT_AVATAR: Bun.env.USER_DEFAULT_AVATAR,
        POSTGRES_USERNAME: Bun.env.POSTGRES_USERNAME,
        POSTGRES_PASSWORD: !!Bun.env.POSTGRES_PASSWORD,
        POSTGRES_HOST: Bun.env.POSTGRES_HOST,
        POSTGRES_PORT: Bun.env.POSTGRES_PORT,
        POSTGRES_DATABASE: Bun.env.POSTGRES_DATABASE,
        POSTGRES_CONNEXION_LIMIT: Bun.env.POSTGRES_CONNEXION_LIMIT,
        POSTGRES_URL: !!Bun.env.POSTGRES_URL,
        REDIS_PASSWORD: !!Bun.env.REDIS_PASSWORD,
        REDIS_HOST: Bun.env.REDIS_HOST,
        REDIS_PORT: Bun.env.REDIS_PORT,
        MASTERKEY: !!Bun.env.MASTERKEY
    };
    const entries = Object.entries(env).map(x => !!x[1]);
    let warns = 0;
    for (let e = 0; e < entries.length; e++) {
        if (!entries[e]) {
            warns += 1;
            logger.warn({
                envVar: Object.entries(env)[e][0]
            }, `Env variable ${Object.entries(env)[e][0]} is undefined`);
        }
    }
    if (warns > 0) process.exit(1);
};

export default init;