import { verifyKey } from "discord-interactions";
import { put, list } from "@vercel/blob";

export const runtime = "nodejs";

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 };
const InteractionResponseType = { PONG: 1, CHANNEL_MESSAGE_WITH_SOURCE: 4 };

function reply(content) {
  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content },
  });
}

function parseBlob(pathname) {
  const base = pathname.replace(/^scripts\//, "");
  const [, uploader, ...nameParts] = base.split("__");
  const filename = nameParts.join("__") || base;
  return { filename, uploader: uploader || "unknown" };
}

export async function POST(req) {
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const rawBody = await req.text();

  const isValid =
    signature &&
    timestamp &&
    (await verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY));

  if (!isValid) {
    return new Response("Invalid request signature", { status: 401 });
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === InteractionType.PING) {
    return Response.json({ type: InteractionResponseType.PONG });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const commandName = interaction.data.name;

    if (commandName === "upload") {
      const option = interaction.data.options?.find((o) => o.name === "file");
      const attachment = interaction.data.resolved?.attachments?.[option?.value];

      if (!attachment) {
        return reply("No file attached. Use `/upload file:<attach a script>`.");
      }

      try {
        const fileRes = await fetch(attachment.url);
        const fileBuffer = await fileRes.arrayBuffer();

        const uploaderRaw =
          interaction.member?.user?.username || interaction.user?.username || "discord";
        const uploader = uploaderRaw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32);
        const safeName = attachment.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const pathname = `scripts/${Date.now()}__${uploader}__${safeName}`;

        const blob = await put(pathname, Buffer.from(fileBuffer), {
          access: "public",
          addRandomSuffix: false,
          contentType: attachment.content_type || "text/plain",
        });

        return reply(`Uploaded **${safeName}** — by ${uploader}\n${blob.url}`);
      } catch (err) {
        return reply(`Upload failed: ${err.message}`);
      }
    }

    if (commandName === "scripts") {
      try {
        const { blobs } = await list({ prefix: "scripts/" });
        const recent = blobs
          .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
          .slice(0, 10);

        if (recent.length === 0) return reply("No scripts uploaded yet.");

        const lines = recent.map((b) => {
          const { filename, uploader } = parseBlob(b.pathname);
          return `• **${filename}** — ${uploader} — ${b.url}`;
        });
        return reply(lines.join("\n"));
      } catch (err) {
        return reply(`Couldn't list scripts: ${err.message}`);
      }
    }

    if (commandName === "getscript") {
      const nameOption = interaction.data.options?.find((o) => o.name === "name");
      const query = (nameOption?.value || "").toLowerCase();

      if (!query) {
        return reply("Usage: `/getscript name:<part of the filename>`");
      }

      try {
        const { blobs } = await list({ prefix: "scripts/" });
        const match = blobs.find((b) => b.pathname.toLowerCase().includes(query));

        if (!match) {
          return reply(`No script found matching **${query}**.`);
        }

        const { filename, uploader } = parseBlob(match.pathname);
        return reply(`**${filename}** — uploaded by ${uploader}\n${match.url}`);
      } catch (err) {
        return reply(`Couldn't find that script: ${err.message}`);
      }
    }
  }

  return Response.json({ error: "Unknown interaction" }, { status: 400 });
}
