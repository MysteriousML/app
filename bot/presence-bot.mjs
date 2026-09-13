import { Client, GatewayIntentBits, ActivityType } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", () => {
  client.user.setPresence({
    status: "online", // change to "dnd" for Do Not Disturb
    activities: [
      {
        name: "Custom Status",
        state: "ZT ON TOP 🍏",
        type: ActivityType.Custom,
      },
    ],
  });
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_BOT_TOKEN);
