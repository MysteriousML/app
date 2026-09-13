// Run once (locally) after setting your .env values:
//   npm run register-commands
import "dotenv/config";

const { DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN } = process.env;

if (!DISCORD_APPLICATION_ID || !DISCORD_BOT_TOKEN) {
  console.error("Missing DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN in .env");
  process.exit(1);
}

const commands = [
  {
    name: "upload",
    description: "Upload a script file",
    options: [
      {
        type: 11, // ATTACHMENT
        name: "file",
        description: "The script file to upload",
        required: true,
      },
    ],
  },
  {
    name: "scripts",
    description: "List the 10 most recently uploaded scripts",
  },
];

const res = await fetch(
  `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  }
);

const data = await res.json();
console.log(res.ok ? "Commands registered:" : "Failed:", JSON.stringify(data, null, 2));

