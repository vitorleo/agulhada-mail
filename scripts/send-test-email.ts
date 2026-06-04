import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { config } from "../src/config.js";
import { renderReactEmailTemplate } from "../src/emailTemplates/render.js";

type Options = {
  to?: string;
  bcc?: string[];
  from?: string;
  subject: string;
  template?: string;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.to) {
    throw new Error("Missing recipient. Usage: npx tsx scripts/send-test-email.ts --to you@example.com");
  }

  const ses = new SESv2Client({ region: config.AWS_REGION });
  const content = options.template
    ? await renderReactEmailTemplate(options.template, {
        firstName: "Vitor",
        name: "Vitor",
        email: options.to,
        unsubscribeUrl: `${config.PUBLIC_BASE_URL}/u/manual-test-token`
      })
    : {
        subject: options.subject,
        html: `
              <p>Testing Agulhada Mail through Amazon SES.</p>
              <ul>
                <li><strong>From:</strong> ${escapeHtml(config.SES_FROM_EMAIL)}</li>
                <li><strong>Configuration set:</strong> ${escapeHtml(config.SES_CONFIGURATION_SET)}</li>
                <li><strong>Sent at:</strong> ${escapeHtml(new Date().toISOString())}</li>
              </ul>
            `,
        text: [
          "Testing Agulhada Mail through Amazon SES.",
          "",
          `From: ${config.SES_FROM_EMAIL}`,
          `Configuration set: ${config.SES_CONFIGURATION_SET}`,
          `Sent at: ${new Date().toISOString()}`
        ].join("\n")
      };

  const response = await ses.send(new SendEmailCommand({
    FromEmailAddress: options.from ?? config.SES_FROM_EMAIL,
    Destination: {
      ToAddresses: [options.to],
      ...(options.bcc?.length ? { BccAddresses: options.bcc } : {})
    },
    ConfigurationSetName: config.SES_CONFIGURATION_SET,
    EmailTags: [
      { Name: "category", Value: "manual-test" },
      { Name: "source", Value: "send-test-email-script" }
    ],
    Content: {
      Simple: {
        Subject: { Data: content.subject, Charset: "UTF-8" },
        Body: {
          Text: {
            Data: content.text,
            Charset: "UTF-8"
          },
          Html: {
            Data: content.html,
            Charset: "UTF-8"
          }
        }
      }
    }
  }));

  console.log("TEST_EMAIL_SENT", {
    to: options.to,
    from: options.from ?? config.SES_FROM_EMAIL,
    bcc: options.bcc ?? [],
    configurationSet: config.SES_CONFIGURATION_SET,
    template: options.template ?? null,
    messageId: response.MessageId
  });
}

function parseArgs(args: string[]): Options {
  const values = new Map<string, string | true>();
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      values.set(key, true);
    } else {
      values.set(key, next);
      index++;
    }
  }

  return {
    to: stringValue(values, "to"),
    bcc: listValue(values, "bcc"),
    from: stringValue(values, "from"),
    subject: stringValue(values, "subject") || "Agulhada Mail SES production test",
    template: stringValue(values, "template")
  };
}

function stringValue(values: Map<string, string | true>, key: string): string | undefined {
  const value = values.get(key);
  return typeof value === "string" ? value : undefined;
}

function listValue(values: Map<string, string | true>, key: string): string[] | undefined {
  const value = stringValue(values, key);
  if (!value) return undefined;
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

main().catch((error) => {
  console.error("TEST_EMAIL_FAILED", error.name || "Error", error.message);
  process.exitCode = 1;
});
