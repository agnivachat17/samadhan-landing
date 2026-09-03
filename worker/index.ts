export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle invite email via MailChannels (works on Cloudflare Workers, no SMTP creds needed)
    if (url.pathname === "/api/send-invite" && request.method === "POST") {
      try {
        const { to, subject, html, inviteLink, organizationName, memberRole } =
          (await request.json()) as {
            to: string;
            subject: string;
            html: string;
            inviteLink?: string;
            organizationName?: string;
            memberRole?: string;
          };

        if (!to || !subject || !html) {
          return new Response(
            JSON.stringify({ error: "Missing to/subject/html" }),
            {
              status: 400,
              headers: {
                "content-type": "application/json",
                "access-control-allow-origin": "*",
              },
            }
          );
        }

        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
          return new Response(
            JSON.stringify({ error: "Invalid recipient email" }),
            {
              status: 400,
              headers: {
                "content-type": "application/json",
                "access-control-allow-origin": "*",
              },
            }
          );
        }

        // MailChannels — free for Cloudflare Workers, no API key needed for Workers
        // From must be deliverable; using Workers sub-domain via MailChannels is allowed.
        const mailRes = await fetch("https://api.mailchannels.net/tx/v1/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            personalizations: [
              { to: [{ email: to, name: memberRole ?? "Member" }] },
            ],
            from: {
              email: "noreply@samadhan.app",
              name: "Samadhan — Government of Jharkhand",
            },
            reply_to: {
              email: "ankanmondal9280@gmail.com",
              name: "Samadhan Support",
            },
            subject,
            content: [{ type: "text/html", value: html }],
          }),
        });

        const mailText = await mailRes.text();
        if (!mailRes.ok) {
          console.error("MailChannels failed", mailRes.status, mailText);
          return new Response(
            JSON.stringify({
              error: "MailChannels failed",
              status: mailRes.status,
              body: mailText,
            }),
            {
              status: 502,
              headers: {
                "content-type": "application/json",
                "access-control-allow-origin": "*",
              },
            }
          );
        }

        return new Response(JSON.stringify({ ok: true, via: "mailchannels" }), {
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        });
      } catch (e: any) {
        return new Response(
          JSON.stringify({ error: e?.message ?? "Unknown error" }),
          {
            status: 500,
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*",
            },
          }
        );
      }
    }

    if (url.pathname === "/api/send-invite" && request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      });
    }

    // Fallback to static assets (SPA)
    // @ts-ignore — env.ASSETS is provided by Wrangler assets binding
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not found", { status: 404 });
  },
} as ExportedHandler<Env>;
