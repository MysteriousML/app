export const runtime = "nodejs";

export async function GET() {
  const { DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN } = process.env;

  if (!DISCORD_APPLICATION_ID || !DISCORD_BOT_TOKEN) {
    return Response.json(
      { error: "Missing DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN in Vercel env vars" },
      { status: 500 }
    );
  }

  const commands = [
    {
      name: "upload",
      description: "Upload a script file",
      options: [
        { type: 11, name: "file", description: "The script file to upload", required: true },
      ],
    },
    { name: "scripts", description: "List the 10 most recently uploaded scripts" },
    {
      name: "getscript",
      description: "Find a script by (part of) its filename",
      options: [
        { type: 3, name: "name", description: "Part of the filename to search for", required: true },
      ],
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
  return Response.json(data, { status: res.ok ? 200 : 500 });
}
