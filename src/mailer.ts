import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { config } from "./config.js";

const ses = new SESv2Client({ region: config.AWS_REGION });

type SendParams = {
  to: string;
  toName?: string;
  bcc?: string[];
  subject: string;
  html: string;
  text: string;
  tags: Record<string, string>;
  unsubscribeUrl?: string;
};

function formatAddress(email: string, name?: string): string {
  return name ? `${name} <${email}>` : email;
}

export async function sendWithSes(params: SendParams): Promise<string> {
  const headers = params.unsubscribeUrl
    ? [
        { Name: "List-Unsubscribe", Value: `<${params.unsubscribeUrl}>` },
        { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" }
      ]
    : undefined;

  const command = new SendEmailCommand({
    FromEmailAddress: formatAddress(config.SES_FROM_EMAIL, config.SES_FROM_NAME),
    Destination: {
      ToAddresses: [formatAddress(params.to, params.toName)],
      ...(params.bcc?.length ? { BccAddresses: params.bcc } : {})
    },
    ConfigurationSetName: config.SES_CONFIGURATION_SET,
    EmailTags: Object.entries(params.tags).map(([Name, Value]) => ({ Name, Value })),
    Content: {
      Simple: {
        Subject: { Data: params.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: params.html, Charset: "UTF-8" },
          Text: { Data: params.text, Charset: "UTF-8" }
        },
        Headers: headers
      }
    }
  });

  const response = await ses.send(command);
  if (!response.MessageId) throw new Error("SES did not return a MessageId");
  return response.MessageId;
}
