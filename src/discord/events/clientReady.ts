import { CronJob } from 'cron';
import { Client, Events } from 'discord.js';
import { BotEvent } from '../../types';
import { deleteDbOldMessages } from '../../utils/messages/message-db';
import logger from '../../utils/pino-logger';

const eventName = 'clientReady';

const event: BotEvent = {
    name: Events.ClientReady,
    once: true,

    execute: async (client: Client) => {
        if (!client.user || !client.application) return;

        CronJob.from({
            cronTime: '0 * * * *', // every hour
            onTick: () => { deleteDbOldMessages() },
            start: true
        });

        return logger.info({
            app: 'Bot',
            event: eventName,
            clientId: client.user.id,
            clientUser: client.user.tag,
            commands: client.commands.size,
            events: client.events.size
        }, `Logged in as ${client.user.tag}`);
    }
};

export default event;