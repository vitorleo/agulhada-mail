import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { renderReactEmailTemplate } from "../src/emailTemplates/render.js";
import { reactEmailTemplates } from "../src/emailTemplates/registry.js";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const slugs = options.slug ? [options.slug] : Object.keys(reactEmailTemplates);

  for (const slug of slugs) {
    const data = sampleData(slug);
    const rendered = await renderReactEmailTemplate(slug, data, {
      requireUnsubscribeUrl: slug === "promo-30-days"
    });

    console.log("RENDERED_EMAIL_TEMPLATE", {
      slug,
      category: rendered.category,
      subject: rendered.subject,
      htmlLength: rendered.html.length,
      textLength: rendered.text.length
    });

    if (options.outDir) {
      const htmlPath = resolve(options.outDir, `${slug}.html`);
      const textPath = resolve(options.outDir, `${slug}.txt`);
      await mkdir(dirname(htmlPath), { recursive: true });
      await writeFile(htmlPath, rendered.html, "utf8");
      await writeFile(textPath, rendered.text, "utf8");
      console.log("WROTE_EMAIL_TEMPLATE", { htmlPath, textPath });
    }
  }
}

function sampleData(slug: string) {
  const baseData = {
    firstName: "Vitor",
    name: "Vitor",
    email: "vitorleo@gmail.com",
    source: "manual-test",
    campaignId: "manual-test",
    campaignName: slug,
    unsubscribeUrl: "https://email.agulhada.com/u/manual-test-token"
  };

  if (slug === "welcome") {
    return {
      ...baseData,
      userId: "manual-didineedles-test",
      promoCode: "VIP30",
      promoLevel: "VIP30"
    };
  }

  return baseData;
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

  return {
    slug: stringValue(values, "slug"),
    outDir: stringValue(values, "out-dir")
  };
}

function stringValue(values: Map<string, string | true>, key: string): string | undefined {
  const value = values.get(key);
  return typeof value === "string" ? value : undefined;
}

main().catch((error) => {
  console.error("RENDER_EMAIL_TEMPLATE_FAILED", error.name || "Error", error.message);
  process.exitCode = 1;
});
