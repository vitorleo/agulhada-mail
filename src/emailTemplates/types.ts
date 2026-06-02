import type { ComponentType } from "react";
import type { EmailCategory } from "../types.js";

export type ReactEmailData = Record<string, unknown> & {
  email?: string;
  name?: string;
  firstName?: string;
  unsubscribeUrl?: string;
};

export type ReactEmailTemplateProps = {
  data: ReactEmailData;
};

export type ReactEmailTemplateDefinition = {
  slug: string;
  name: string;
  category: EmailCategory;
  subject: string | ((data: ReactEmailData) => string);
  component: ComponentType<ReactEmailTemplateProps>;
};

export type RenderReactEmailOptions = {
  expectedCategory?: EmailCategory;
  requireUnsubscribeUrl?: boolean;
};
