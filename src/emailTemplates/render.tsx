import React from "react";
import { render } from "@react-email/render";
import { assertTemplateCategory, getReactEmailTemplate, ReactEmailTemplateError } from "./registry.js";
import type { ReactEmailData, RenderReactEmailOptions } from "./types.js";

export async function renderReactEmailTemplate(
  slug: string,
  data: ReactEmailData,
  options: RenderReactEmailOptions = {}
) {
  const template = getReactEmailTemplate(slug);
  assertTemplateCategory(template, options.expectedCategory);

  if ((options.requireUnsubscribeUrl || template.category === "campaign") && !data.unsubscribeUrl) {
    throw new ReactEmailTemplateError(`Campaign template ${slug} requires unsubscribeUrl`);
  }

  const element = React.createElement(template.component, { data });
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject = typeof template.subject === "function" ? template.subject(data) : template.subject;

  return { subject, html, text, category: template.category, slug: template.slug };
}

export function isReactEmailTemplateError(error: unknown): error is ReactEmailTemplateError {
  return error instanceof ReactEmailTemplateError;
}
