import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { config } from "../src/config.js";

type Options = {
  to?: string;
  subject: string;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.to) {
    throw new Error("Missing recipient. Usage: npx tsx scripts/send-test-email.ts --to you@example.com");
  }

  const ses = new SESv2Client({ region: config.AWS_REGION });
  const response = await ses.send(new SendEmailCommand({
    FromEmailAddress: config.SES_FROM_EMAIL,
    Destination: { ToAddresses: [options.to] },
    ConfigurationSetName: config.SES_CONFIGURATION_SET,
    EmailTags: [
      { Name: "category", Value: "manual-test" },
      { Name: "source", Value: "send-test-email-script" }
    ],
    Content: {
      Simple: {
        Subject: { Data: options.subject, Charset: "UTF-8" },
        Body: {
          Text: {
            Data: [
              "Testing Agulhada Mail through Amazon SES.",
              "",
              `From: ${config.SES_FROM_EMAIL}`,
              `Configuration set: ${config.SES_CONFIGURATION_SET}`,
              `Sent at: ${new Date().toISOString()}`
            ].join("\n"),
            Charset: "UTF-8"
          },
          Html: {
            Data: `
              <p>Testing Agulhada Mail through Amazon SES.</p>
              <ul>
                <li><strong>From:</strong> ${escapeHtml(config.SES_FROM_EMAIL)}</li>
                <li><strong>Configuration set:</strong> ${escapeHtml(config.SES_CONFIGURATION_SET)}</li>
                <li><strong>Sent at:</strong> ${escapeHtml(new Date().toISOString())}</li>
              </ul>
            `,
            Charset: "UTF-8"
          }
        }
      }
    }
  }));

  console.log("TEST_EMAIL_SENT", {
    to: options.to,
    from: config.SES_FROM_EMAIL,
    configurationSet: config.SES_CONFIGURATION_SET,
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
    subject: stringValue(values, "subject") || "Agulhada Mail SES production test"
  };
}

function stringValue(values: Map<string, string | true>, key: string): string | undefined {
  const value = values.get(key);
  return typeof value === "string" ? value : undefined;
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
