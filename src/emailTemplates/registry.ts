import Promo30Days from "./campaign/Promo30Days.js";
import Welcome from "./transactional/Welcome.js";
import type { EmailCategory } from "../types.js";
import type { ReactEmailTemplateDefinition } from "./types.js";

export const reactEmailTemplates = {
  welcome: {
    slug: "welcome",
    name: "Welcome",
    category: "transactional",
    subject: "Bem-vindo ao Agulhada.com",
    component: Welcome
  },
    welcome30dias: {
    slug: "welcome",
    name: "Welcome",
    category: "transactional",
    subject: "Seus primeiros passos no Agulhada.com",
    component: Welcome
  },
  "promo-30-days": {
    slug: "promo-30-days",
    name: "Promo 30 Days",
    category: "campaign",
    subject: "30 dias para testar o Agulhada.com",
    component: Promo30Days
  }
} satisfies Record<string, ReactEmailTemplateDefinition>;

export type ReactEmailTemplateSlug = keyof typeof reactEmailTemplates;

export function getReactEmailTemplate(slug: string): ReactEmailTemplateDefinition {
  const template = reactEmailTemplates[slug as ReactEmailTemplateSlug];
  if (!template) {
    throw new ReactEmailTemplateError(`React Email template not found: ${slug}`);
  }

  return template;
}

export function assertTemplateCategory(template: ReactEmailTemplateDefinition, expectedCategory?: EmailCategory) {
  if (expectedCategory && template.category !== expectedCategory) {
    throw new ReactEmailTemplateError(
      `React Email template category mismatch for ${template.slug}: expected ${expectedCategory}, got ${template.category}`
    );
  }
}

export class ReactEmailTemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReactEmailTemplateError";
  }
}
