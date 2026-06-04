import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type MailjetTemplateTarget = {
  id: number;
  slug: string;
  label: string;
};

type MailjetTemplateResponse = {
  Count?: number;
  Total?: number;
  Data?: Array<Record<string, unknown>>;
};

type ExportedTemplateSummary = {
  id: number;
  slug: string;
  label: string;
  mailjetName?: string;
  subject?: string;
  files: {
    metadata: string;
    html: string | null;
    text: string | null;
    mjml: string | null;
  };
  missingFields: string[];
  variables: string[];
  urls: string[];
  imageUrls: string[];
};

const defaultTargets: MailjetTemplateTarget[] = [
  { id: 6487676, slug: "marketing-30-days-cst", label: "Marketing 30 dias CST" },
  { id: 6739428, slug: "marketing-30-days", label: "Marketing 30 dias" },
  { id: 6430901, slug: "trial-expiring", label: "30 dias expirando" },
  { id: 7929021, slug: "trial-expiring-50-cst24", label: "30 dias expirando 50% CST24" },
  { id: 6419616, slug: "welcome", label: "Welcome" },
  { id: 8051890, slug: "marketing-30-days-cst25", label: "Marketing 30 dias CST25" }
];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outDir = resolve(options.outDir ?? "tmp/mailjet-template-export");
  const auth = getAuthHeader();
  const summaries: ExportedTemplateSummary[] = [];

  await mkdir(outDir, { recursive: true });

  for (const target of defaultTargets) {
    const templateDir = resolve(outDir, `${target.id}-${target.slug}`);
    await mkdir(templateDir, { recursive: true });

    const metadata = await getMailjetResource(`template/${target.id}`, auth);
    const detailContent = await getMailjetResource(`template/${target.id}/detailcontent`, auth);
    const meta = metadata.Data?.[0] ?? {};
    const content = detailContent.Data?.[0] ?? {};
    const html = stringField(content, "Html-part");
    const text = stringField(content, "Text-part");
    const mjml = stringField(content, "MJMLContent");
    const headers = normalizeHeaders(content.Headers);
    const missingFields = [
      html ? undefined : "Html-part",
      text ? undefined : "Text-part",
      mjml ? undefined : "MJMLContent",
      content.Headers ? undefined : "Headers"
    ].filter((field): field is string => Boolean(field));

    const metadataPath = resolve(templateDir, "metadata.json");
    const htmlPath = html ? resolve(templateDir, "template.html") : null;
    const textPath = text ? resolve(templateDir, "template.txt") : null;
    const mjmlPath = mjml ? resolve(templateDir, "template.mjml") : null;

    const metadataDocument = {
      target,
      fetchedAt: new Date().toISOString(),
      api: {
        metadataPath: `/v3/REST/template/${target.id}`,
        detailContentPath: `/v3/REST/template/${target.id}/detailcontent`
      },
      mailjet: {
        metadata: meta,
        headers,
        contentPresence: {
          "Html-part": Boolean(html),
          "Text-part": Boolean(text),
          MJMLContent: Boolean(mjml),
          Headers: Boolean(content.Headers)
        },
        missingFields
      }
    };

    await writeJson(metadataPath, metadataDocument);
    if (html && htmlPath) await writeFile(htmlPath, html, "utf8");
    if (text && textPath) await writeFile(textPath, text, "utf8");
    if (mjml && mjmlPath) await writeFile(mjmlPath, mjml, "utf8");

    const combinedSource = [html, text, mjml, JSON.stringify(headers)].filter(Boolean).join("\n");
    const urls = unique(extractUrls(combinedSource));
    const imageUrls = unique(extractImageUrls(html ?? "")).sort();
    const variables = unique(extractVariables(combinedSource)).sort();
    const summary: ExportedTemplateSummary = {
      id: target.id,
      slug: target.slug,
      label: target.label,
      mailjetName: stringField(meta, "Name"),
      subject: stringField(headers, "Subject"),
      files: {
        metadata: relativeName(metadataPath),
        html: htmlPath ? relativeName(htmlPath) : null,
        text: textPath ? relativeName(textPath) : null,
        mjml: mjmlPath ? relativeName(mjmlPath) : null
      },
      missingFields,
      variables,
      urls,
      imageUrls
    };
    summaries.push(summary);

    console.log("EXPORTED_MAILJET_TEMPLATE", {
      id: target.id,
      slug: target.slug,
      mailjetName: summary.mailjetName,
      subject: summary.subject,
      missingFields,
      htmlLength: html?.length ?? 0,
      textLength: text?.length ?? 0,
      mjmlLength: mjml?.length ?? 0
    });
  }

  await writeJson(resolve(outDir, "summary.json"), { exportedAt: new Date().toISOString(), templates: summaries });
  await writeMarkdownSummary(resolve(outDir, "summary.md"), summaries);
}

async function getMailjetResource(path: string, auth: string): Promise<MailjetTemplateResponse> {
  const response = await fetch(`https://api.mailjet.com/v3/REST/${path}`, {
    headers: { Authorization: auth }
  });
  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new Error(`Mailjet ${path} failed with ${response.status}: ${JSON.stringify(body)}`);
  }
  return body as MailjetTemplateResponse;
}

function getAuthHeader(): string {
  const apiKey = process.env.MAILJET_API_KEY ?? process.env.MJ_APIKEY_PUBLIC;
  const apiSecret = process.env.MAILJET_PVT_KEY ?? process.env.MJ_APIKEY_PRIVATE;
  if (!apiKey || !apiSecret) {
    throw new Error("Missing Mailjet credentials. Set MAILJET_API_KEY/MAILJET_PVT_KEY or MJ_APIKEY_PUBLIC/MJ_APIKEY_PRIVATE.");
  }
  return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;
}

function normalizeHeaders(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return { raw: value };
  }
}

function extractVariables(source: string): string[] {
  const matches = source.matchAll(/{{\s*([^}]+?)\s*}}|{%\s*([^%]+?)\s*%}/g);
  return Array.from(matches, (match) => (match[1] ?? match[2] ?? "").trim()).filter(Boolean);
}

function extractUrls(source: string): string[] {
  const matches = source.matchAll(/https?:\/\/[^\s"'<>\\)]+/g);
  return Array.from(matches, (match) => match[0].replace(/[.,;]+$/, ""));
}

function extractImageUrls(html: string): string[] {
  const matches = html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi);
  return Array.from(matches, (match) => match[1]).filter((src) => src.startsWith("http"));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function stringField(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function parseArgs(args: string[]) {
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
  return { outDir: optionalString(values, "out-dir") };
}

function optionalString(values: Map<string, string | true>, key: string): string | undefined {
  const value = values.get(key);
  return typeof value === "string" ? value : undefined;
}

function relativeName(path: string): string {
  return path.replace(`${process.cwd()}\\`, "").replaceAll("\\", "/");
}

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeMarkdownSummary(path: string, summaries: ExportedTemplateSummary[]) {
  const lines = [
    "# Mailjet Template Export",
    "",
    "| Mailjet ID | Slug | Mailjet name | Subject | Missing fields |",
    "| --- | --- | --- | --- | --- |",
    ...summaries.map((summary) => [
      `| \`${summary.id}\``,
      `\`${summary.slug}\``,
      summary.mailjetName ?? "",
      summary.subject ?? "",
      summary.missingFields.length ? summary.missingFields.join(", ") : "None",
      "|"
    ].join(" | ")),
    "",
    "## Variables",
    "",
    ...summaries.flatMap((summary) => [
      `### ${summary.id} - ${summary.slug}`,
      "",
      summary.variables.length ? summary.variables.map((variable) => `- \`${variable}\``).join("\n") : "- None detected",
      ""
    ]),
    "## Image URLs",
    "",
    ...summaries.flatMap((summary) => [
      `### ${summary.id} - ${summary.slug}`,
      "",
      summary.imageUrls.length ? summary.imageUrls.map((url) => `- ${url}`).join("\n") : "- None detected",
      ""
    ])
  ];
  await writeFile(path, `${lines.join("\n")}\n`, "utf8");
}

main().catch((error) => {
  console.error("EXPORT_MAILJET_TEMPLATES_FAILED", error.name || "Error", error.message);
  process.exitCode = 1;
});
