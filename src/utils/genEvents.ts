import { Events } from 'discord.js';
import { appendFileSync, existsSync } from 'fs';
import path from 'path';

const pwd = import.meta.dir.split('src/')[0];
const events = Object.keys(Events);

events.forEach(e => {
    const eventBaseCode = `import { Events } from 'discord.js';\nimport { BotEvent } from '../../types';\n\nconst eventName = '${e.charAt(0).toLowerCase()}${e.slice(1)}';\n\nconst event: BotEvent = {\n    name: Events.${e},\n\n    execute: async () => {\n\n    }\n};\n\nexport default event;`
    if (!existsSync(path.join(pwd, `src/discord/events/${e.charAt(0).toLowerCase()}${e.slice(1)}.ts`))) {
        appendFileSync(path.join(pwd, `src/discord/events/${e.charAt(0).toLowerCase()}${e.slice(1)}.ts`), eventBaseCode, 'utf-8');
        console.log(`Created ${e.charAt(0).toLowerCase()}${e.slice(1)}.ts`);
    }
});