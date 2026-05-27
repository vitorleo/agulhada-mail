import Handlebars from "handlebars";
import type { EmailTemplate } from "./types.js";

export function renderTemplate(template: EmailTemplate, data: Record<string, unknown>) {
  const subject = Handlebars.compile(template.subject)(data);
  const html = Handlebars.compile(template.html)(data);
  const text = Handlebars.compile(template.text)(data);

  return { subject, html, text };
}
