import { verifyKey } from "discord-interactions";
import { put, list } from "@vercel/blob";

export const runtime = "nodejs";

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 };
const InteractionResponseType = { PONG: 1, CHANNEL_MESSAGE_WITH_SOURCE: 4 };

const ACCENT_COLOR = 0x5ec2a4;

function replyEmbed(embed) {
  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds: [embed] },
  });
}

function replyText(content) {
  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content },
  });
}

// Builds a multipart/form-data response so Discord attaches a real file,
// not just a link. This mirrors how Discord's webhook file uploads work.
function replyWithFile(filename, buffer, contentType, caption) {
  const boundary = "----discordform" + Date.now().toString(16);
  const encoder = new TextEncoder();

  const payload = {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: caption || "",
      attachments: [{ id: 0, filename }],
    },
  };

  const preamble = encoder.encode(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="payload_json"\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${JSON.stringify(payload)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="files[0]"; filename="${filename}"\r\n` +
      `Content-Type: ${contentType || "text/plain"}\r\n\r\n`
  );

  const closing = encoder.encode(`\r\n--${boundary}--`);

  const body = new Blob([preamble, buffer, closing]);

  return new Response(body, {
    status: 200,
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
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
        return replyText("No file attached. Use `/upload file:<attach a script>`.");
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

        return replyEmbed({
          title: "Script uploaded",
          color: ACCENT_COLOR,
          fields: [
            { name: "File", value: safeName, inline: true },
            { name: "Uploaded by", value: uploader, inline: true },
          ],
          url: blob.url,
          description: `[Open file](${blob.url})`,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        return replyText(`Upload failed: ${err.message}`);
      }
    }

    if (commandName === "scripts") {
      try {
        const { blobs } = await list({ prefix: "scripts/" });
        const recent = blobs
          .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
          .slice(0, 10);

        if (recent.length === 0) {
          return replyEmbed({
            title: "Recent scripts",
            color: ACCENT_COLOR,
            description: "No scripts uploaded yet.",
          });
        }

        const fields = recent.map((b) => {
          const { filename, uploader } = parseBlob(b.pathname);
          return {
            name: filename,
            value: `by ${uploader} · [open](${b.url})`,
          };
        });

        return replyEmbed({
          title: "Recent scripts",
          color: ACCENT_COLOR,
          fields,
          footer: { text: `Showing ${recent.length} most recent` },
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        return replyText(`Couldn't list scripts: ${err.message}`);
      }
    }

    if (commandName === "getscript") {
      const nameOption = interaction.data.options?.find((o) => o.name === "name");
      const query = (nameOption?.value || "").toLowerCase();

      if (!query) {
        return replyText("Usage: `/getscript name:<part of the filename>`");
      }

      try {
        const { blobs } = await list({ prefix: "scripts/" });
        const match = blobs.find((b) => b.pathname.toLowerCase().includes(query));

        if (!match) {
          return replyEmbed({
            title: "No match found",
            color: 0xe0716b,
            description: `No script found matching **${query}**.`,
          });
        }

        const { filename, uploader } = parseBlob(match.pathname);
        const fileRes = await fetch(match.url);
        const fileBuffer = Buffer.from(await fileRes.arrayBuffer());
        const contentType = fileRes.headers.get("content-type") || "text/plain";

        return replyWithFile(
          filename,
          fileBuffer,
          contentType,
          `**${filename}** — uploaded by ${uploader}`
        );
      } catch (err) {
        return replyText(`Couldn't find that script: ${err.message}`);
      }
    }
  }

  return Response.json({ error: "Unknown interaction" }, { status: 400 });
}
