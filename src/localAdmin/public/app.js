const state = { context: null, details: null, preparationId: null, campaignId: null };
const steps = ["details", "recipients", "test", "review", "enqueue"];
const status = document.querySelector("#status");
const errorSummary = document.querySelector("#error-summary");

init().catch(showError);

async function init() {
  state.context = await api("/api/context");
  text("#database-name", state.context.databaseName);
  text("#vps-api", state.context.vpsApiBaseUrl);
  fillTemplates();
  fillLists();
  bindEvents();
  setStatus("Ready. Confirm the database and VPS API above before continuing.");
}

function bindEvents() {
  document.querySelector("#details-form").addEventListener("submit", handleDetails);
  document.querySelector("#template-slug").addEventListener("change", updateTemplateSubject);
  document.querySelector("#csv-form").addEventListener("submit", handleCsvPreview);
  document.querySelector("#import-recipients").addEventListener("click", handleImport);
  document.querySelector("#test-form").addEventListener("submit", handleTestSend);
  document.querySelector("#continue-without-test").addEventListener("click", () => showReview("Test send skipped."));
  document.querySelector("#create-draft").addEventListener("click", handleCreateDraft);
  document.querySelector("#continue-to-enqueue").addEventListener("click", () => {
    text("#required-confirmation-name", state.details.campaignName);
    showStep("enqueue");
  });
  document.querySelector("#enqueue-form").addEventListener("submit", handleEnqueue);
  document.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => showStep(button.dataset.back)));
  document.addEventListener("invalid", () => showError("Complete the required fields before continuing."), true);
}

function handleDetails(event) {
  event.preventDefault();
  clearError();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  const templateSlug = values.templateSlug.trim();
  if (!state.context.templates.some((template) => template.slug === templateSlug)) {
    showError("Choose a campaign template before continuing.");
    return;
  }
  state.details = {
    campaignName: values.campaignName.trim(),
    listSlug: values.listSlug.trim(),
    templateSlug,
    subjectOverride: values.subjectOverride.trim()
  };
  showStep("recipients");
  setStatus("Campaign details saved locally. Upload and review the recipient CSV.");
}

async function handleCsvPreview(event) {
  event.preventDefault();
  await withSubmission(event.currentTarget, async () => {
    const file = document.querySelector("#csv-file").files[0];
    const result = await api("/api/csv/preview", { csv: await file.text() });
    state.preparationId = result.preparationId;
    renderMetrics("#csv-counts", result.counts);
    renderRecipients(result.preview);
    document.querySelector("#csv-results").hidden = false;
    setStatus(`CSV reviewed: ${result.counts.valid} valid, ${result.counts.invalid} invalid, ${result.counts.duplicates} duplicates.`);
  });
}

async function handleImport(event) {
  await withSubmission(event.currentTarget, async () => {
    const result = await api("/api/csv/import", { preparationId: state.preparationId, listSlug: state.details.listSlug });
    showStep("test");
    setStatus(`${result.imported} reviewed recipients imported into ${state.details.listSlug}.`);
  });
}

async function handleTestSend(event) {
  event.preventDefault();
  await withSubmission(event.currentTarget, async () => {
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const result = await api("/api/test-send", {
      templateSlug: state.details.templateSlug,
      subjectOverride: state.details.subjectOverride || undefined,
      to: values.to,
      toName: values.toName || undefined
    });
    showReview(`VPS test email accepted. Message ID: ${result.messageId || "not returned"}.`);
  });
}

function showReview(message) {
  renderReview();
  showStep("review");
  setStatus(message);
}

async function handleCreateDraft(event) {
  await withSubmission(event.currentTarget, async () => {
    const result = await api("/api/campaigns", {
      name: state.details.campaignName,
      listSlug: state.details.listSlug,
      templateSlug: state.details.templateSlug,
      subjectOverride: state.details.subjectOverride || undefined
    });
    state.campaignId = result.campaignId;
    const preflight = await api(`/api/campaigns/${state.campaignId}/preflight`);
    renderMetrics("#preflight-counts", preflight.summary);
    document.querySelector("#preflight-results").hidden = false;
    setStatus(`Draft ${state.campaignId} created. Review eligibility before final confirmation.`);
  });
}

async function handleEnqueue(event) {
  event.preventDefault();
  await withSubmission(event.currentTarget, async () => {
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const result = await api(`/api/campaigns/${state.campaignId}/enqueue`, {
      confirmationName: values.confirmationName,
      acknowledgeImmediateSend: values.acknowledgeImmediateSend === "on"
    });
    const final = document.querySelector("#final-results");
    final.replaceChildren(
      heading("Queue jobs created"),
      paragraph(`${result.queued} new jobs queued. The VPS worker owns delivery.`),
      paragraph(`Excluded: ${result.excluded.unsubscribed} unsubscribed, ${result.excluded.suppressed} suppressed, ${result.excluded.existingJobs} existing jobs.`)
    );
    final.hidden = false;
    setStatus("Campaign enqueue completed. Delivery remains on the VPS worker.");
  });
}

async function api(path, body) {
  clearError();
  const response = await fetch(path, body === undefined ? {} : {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
  if (!response.ok) throw new Error(data.error?.message || data.error || `HTTP ${response.status}`);
  return data;
}

async function withSubmission(target, action) {
  const buttons = target.matches("form") ? target.querySelectorAll("button") : [target];
  buttons.forEach((button) => { button.disabled = true; });
  try { await action(); } catch (error) { showError(error); } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

function showStep(name) {
  steps.forEach((step) => {
    document.querySelector(`[data-step="${step}"]`).hidden = step !== name;
    const progress = document.querySelector(`[data-progress="${step}"]`);
    if (step === name) progress.setAttribute("aria-current", "step");
    else progress.removeAttribute("aria-current");
  });
  document.querySelector(`[data-step="${name}"] h2`).focus?.();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function fillTemplates() {
  const select = document.querySelector("#template-slug");
  select.replaceChildren(new Option("Choose a campaign template...", "", true, true));
  select.options[0].disabled = true;
  state.context.templates.forEach((template) => select.add(new Option(`${template.name} (${template.slug})`, template.slug)));
  updateTemplateSubject();
}

function fillLists() {
  const datalist = document.querySelector("#list-options");
  state.context.lists.forEach((list) => datalist.append(new Option(list.name, list.slug)));
}

function updateTemplateSubject() {
  const selected = state.context.templates.find((template) => template.slug === document.querySelector("#template-slug").value);
  text("#template-subject", selected ? `Default subject: ${selected.subject}` : "");
}

function renderRecipients(recipients) {
  const body = document.querySelector("#recipient-preview");
  body.replaceChildren(...recipients.map((recipient) => {
    const row = document.createElement("tr");
    [recipient.email, recipient.name || recipient.firstName || "", recipient.source || ""].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    return row;
  }));
}

function renderReview() {
  const template = state.context.templates.find((item) => item.slug === state.details.templateSlug);
  const values = {
    Campaign: state.details.campaignName,
    List: state.details.listSlug,
    Template: template?.name || state.details.templateSlug,
    Subject: state.details.subjectOverride || template?.subject || ""
  };
  const list = document.querySelector("#campaign-review");
  list.replaceChildren(...Object.entries(values).flatMap(([label, value]) => {
    const dt = document.createElement("dt"); dt.textContent = label;
    const dd = document.createElement("dd"); dd.textContent = value;
    return [dt, dd];
  }));
}

function renderMetrics(selector, values) {
  document.querySelector(selector).replaceChildren(...Object.entries(values).map(([label, value]) => {
    const metric = document.createElement("div"); metric.className = "metric";
    const strong = document.createElement("strong"); strong.textContent = value;
    const span = document.createElement("span"); span.textContent = humanize(label);
    metric.append(strong, span);
    return metric;
  }));
}

function showError(error) {
  errorSummary.textContent = error instanceof Error ? error.message : String(error);
  errorSummary.hidden = false;
  errorSummary.focus();
}
function clearError() { errorSummary.hidden = true; errorSummary.textContent = ""; }
function setStatus(message) { status.textContent = message; }
function text(selector, value) { document.querySelector(selector).textContent = value; }
function humanize(value) { return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()); }
function heading(value) { const element = document.createElement("h3"); element.textContent = value; return element; }
function paragraph(value) { const element = document.createElement("p"); element.textContent = value; return element; }
