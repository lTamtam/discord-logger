import { Events, Guild } from 'discord.js';
import short from 'short-uuid';
import prisma from '../../databases/prisma';
import redis from '../../databases/redis';
import { BotEvent } from '../../types';
import logger from '../../utils/pino-logger';

const eventName = 'guildDelete';

const event: BotEvent = {
    name: Events.GuildDelete,

    execute: async (guild: Guild) => {
        const suuid = short();
        const uuid = suuid.new();

        logger.info({
            app: 'Bot',
            event: eventName,
            uuid: uuid,
            guild: guild.name,
            guildId: guild.id
        }, `${guild.name} was deleted or the bot was removed from that server`);

        try {
            await redis.del(`webhook:${guild.id}`);
            await prisma.webhook.delete({
                where: {
                    guildId: guild.id
                }
            });
        }
        catch (err) {
            logger.error({
                event: eventName,
                action: 'delete_guild',
                err: err
            });
        }
    }
};

export default event;