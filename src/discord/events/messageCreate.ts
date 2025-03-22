import { Events, Message, MessageType } from 'discord.js';
import short from 'short-uuid';
import { BotEvent } from '../../types';
import { cacheMessage } from '../../utils/messages/message-cache';

const eventName = 'messageCreate';

const event: BotEvent = {
    name: Events.MessageCreate,

    execute: async (message: Message) => {
        if (new Date().getTime() - message.createdTimestamp > 1000 || !message.guild || message.webhookId || !message.author || message.author.bot || message.type !== MessageType.Default) return;

        const suuid = short();
        const uuid = suuid.new();
        await cacheMessage(message);
    }
};

export default event;