import Promo30Days from "./campaign/Promo30Days.js";
import {
  mailjetCampaignSubjects,
  Marketing30Days,
  Marketing30DaysCst,
  Marketing30DaysCst25,
  TrialExpiring,
  TrialExpiring50Cst24,
  TrialRecapture
} from "./campaign/MailjetCampaigns.js";
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
    slug: "welcome30dias",
    name: "Welcome 30 Dias",
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
  },
  "marketing-30-days-cst": {
    slug: "marketing-30-days-cst",
    name: "Marketing 30 dias CST",
    category: "campaign",
    subject: mailjetCampaignSubjects.marketing30DaysCst,
    component: Marketing30DaysCst
  },
  "marketing-30-days": {
    slug: "marketing-30-days",
    name: "Marketing 30 dias",
    category: "campaign",
    subject: mailjetCampaignSubjects.marketing30Days,
    component: Marketing30Days
  },
  "trial-expiring": {
    slug: "trial-expiring",
    name: "30 dias expirando",
    category: "campaign",
    subject: mailjetCampaignSubjects.trialExpiring,
    component: TrialExpiring
  },
  "trial-expiring-50-cst24": {
    slug: "trial-expiring-50-cst24",
    name: "30 dias expirando 50% CST24",
    category: "campaign",
    subject: mailjetCampaignSubjects.trialExpiring50Cst24,
    component: TrialExpiring50Cst24
  },
  "trial-recapture": {
    slug: "trial-recapture",
    name: "30 dias repescagem",
    category: "campaign",
    subject: mailjetCampaignSubjects.trialRecapture,
    component: TrialRecapture
  },
  "marketing-30-days-cst25": {
    slug: "marketing-30-days-cst25",
    name: "Marketing 30 dias CST25",
    category: "campaign",
    subject: mailjetCampaignSubjects.marketing30DaysCst25,
    component: Marketing30DaysCst25
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
