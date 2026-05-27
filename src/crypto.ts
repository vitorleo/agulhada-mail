import crypto from "node:crypto";
import { config } from "./config.js";

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signUnsubscribeToken(payload: Record<string, string>): string {
  const body = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", config.UNSUBSCRIBE_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifyUnsubscribeToken(token: string): Record<string, string> | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = crypto
    .createHmac("sha256", config.UNSUBSCRIBE_SECRET)
    .update(body)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
}
