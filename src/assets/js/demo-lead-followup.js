// Lead follow-up demo: a simulated workflow run on a fictional web lead.
// Everything happens in the browser. No network requests, no storage, nothing sent.
(function () {
  "use strict";

  const form = document.querySelector("[data-lead-form]");
  const pipeline = document.querySelector("[data-lead-pipeline]");
  const output = document.querySelector("[data-lead-output]");
  const announce = document.querySelector("[data-lead-announce]");
  const runState = document.querySelector("[data-lead-runstate]");
  const formStatus = document.querySelector("[data-lead-formstatus]");
  const submitBtn = document.querySelector("[data-lead-submit]");
  const resetBtn = document.querySelector("[data-lead-reset]");
  if (!form || !pipeline || !output) return;

  const reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Two made-up existing contacts for the duplicate check.
  const EXISTING = [
    { email: "sam@example.com", name: "Sam Placeholder", id: "DEMO-1007" },
    { email: "pat@example.org", name: "Pat Fictional", id: "DEMO-1012" },
  ];

  // Transparent keyword rules. First matching intent wins; service field is the fallback.
  const SAFETY = ["gas", "smoke", "carbon monoxide", "co alarm", "burning smell", "sparks"];
  const URGENT = ["no heat", "no cool", "not cooling", "not heating", "no air", "leak", "leaking", "urgent", "asap", "emergency", "today", "tonight", "freezing"];
  const INTENTS = [
    { name: "Replacement estimate", words: ["replace", "replacing", "replacement", "new system", "new unit", "estimate", "quote", "upgrade"] },
    { name: "Repair", words: ["repair", "broken", "not working", "stopped", "won't", "isn't working", "noise", "leak", "no heat", "no cool", "not cooling"] },
    { name: "Maintenance", words: ["maintenance", "tune-up", "tune up", "check-up", "checkup", "service plan", "filter"] },
  ];
  const SERVICE_INTENT = {
    "AC or heating repair": "Repair",
    "New system estimate": "Replacement estimate",
    "Maintenance plan": "Maintenance",
    "Something else": "General inquiry",
  };
  const OWNER = {
    "Replacement estimate": "Comfort advisor (sales)",
    Repair: "Service dispatcher",
    Maintenance: "Office coordinator",
    "General inquiry": "Office coordinator",
    Safety: "On-call technician",
  };
  const PRICE_OR_PROMISE = /\$\s?\d|\b\d+\s?(dollars|%|percent)\b|\bguarantee|\bdiscount|\bfree\b|\bwarranty\b|\bwithin \d+ (minutes|hours)\b|\bprice is\b|\bwill cost\b/i;

  let runId = 0;
  let current = null;

  const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));
  const el = (tag, props, text) => {
    const n = document.createElement(tag);
    if (props) Object.assign(n, props);
    if (text != null) n.textContent = text;
    return n;
  };
  const steps = () => [...pipeline.querySelectorAll("li[data-step]")];
  const step = (name) => pipeline.querySelector('li[data-step="' + name + '"]');

  function say(text) {
    if (announce) announce.textContent = text;
  }

  function setStep(name, cls, detail) {
    const li = step(name);
    li.classList.remove("done", "wait");
    if (cls) li.classList.add(cls);
    const pi = li.querySelector(".pi");
    pi.textContent = cls === "done" ? "✓" : cls === "wait" ? "…" : String(steps().indexOf(li) + 1);
    if (detail != null) li.querySelector("[data-detail]").textContent = detail;
  }

  function resetPipeline() {
    const defaults = {
      validate: "Check required fields and look for an existing contact",
      classify: "Simple keyword rules, shown below",
      crm: "Assign an owner by role",
      draft: "Fill an approved template",
      approve: "Nothing is sent without a person's OK",
      send: "Nothing actually leaves your browser",
      task: "A reminder for the owner if there's no reply",
    };
    for (const li of steps()) setStep(li.dataset.step, null, defaults[li.dataset.step]);
    output.hidden = true;
    output.textContent = "";
    if (runState) runState.textContent = "Idle";
  }

  function section(title) {
    const wrap = el("div");
    wrap.style.marginBottom = "18px";
    wrap.appendChild(el("h3", null, title));
    output.appendChild(wrap);
    output.hidden = false;
    return wrap;
  }

  function kv(pairs) {
    const dl = el("dl", { className: "kv" });
    for (const [k, v] of pairs) dl.append(el("dt", null, k), el("dd", null, v));
    return dl;
  }

  function matches(text, words) {
    return words.filter((w) => new RegExp("(^|[^a-z])" + w.replace(/[-']/g, "\\$&") + "($|[^a-z])", "i").test(text));
  }

  function classify(lead) {
    const text = (lead.message + " " + lead.service).toLowerCase();
    const safetyHits = matches(text, SAFETY);
    const urgentHits = matches(text, URGENT);
    let intent = null;
    let intentHits = [];
    for (const rule of INTENTS) {
      const hits = matches(lead.message.toLowerCase(), rule.words);
      if (hits.length) {
        intent = rule.name;
        intentHits = hits;
        break;
      }
    }
    const fromService = !intent;
    if (!intent) intent = SERVICE_INTENT[lead.service] || "General inquiry";
    const urgency = safetyHits.length ? "Safety: needs a person now" : urgentHits.length ? "High" : "Normal";
    const owner = safetyHits.length ? OWNER.Safety : OWNER[intent];
    return { intent, intentHits, fromService, urgency, urgentHits, safetyHits, owner, safety: safetyHits.length > 0 };
  }

  function draftReply(lead, c) {
    const first = lead.name.trim().split(/\s+/)[0] || "there";
    const city = lead.city.trim();
    const optout = "\n\nIf you'd rather not hear from us about this, just reply \"unsubscribe\" and we'll stop.";
    const sign = "\n\nThanks,\n[Owner's first name]\nExample Heating & Air";
    if (c.safety) {
      return (
        "Hi " + first + ",\n\n" +
        "Thanks for contacting Example Heating & Air. Your message mentions something that could be a safety issue, so our on-call technician has been alerted and will call you directly.\n\n" +
        "If you smell gas or see smoke, please leave the building now and call your gas utility's emergency line or 911 from outside. Don't wait for our reply." +
        sign
      );
    }
    const bodies = {
      "Replacement estimate":
        "Thanks for asking about a new system for your home in " + city + ". The best next step is a visit so our comfort advisor can look at your current equipment, the layout of the house and what's not working for you, then walk you through options and pricing in person.\n\nWhat day and time would suit you for a visit?",
      Repair:
        "Sorry to hear your system is giving you trouble. We'd like to get a technician out to take a look at your home in " + city + ".\n\nWhat's the best number and time window to reach you so our dispatcher can set up a visit?",
      Maintenance:
        "Thanks for asking about maintenance. Our office coordinator can explain how our maintenance visits work and find a time that suits you.\n\nIs there a good time to give you a quick call?",
      "General inquiry":
        "Thanks for getting in touch. Our office coordinator has your message and will get back to you with an answer or the right person to talk to.",
    };
    const urgentLine =
      c.urgency === "High"
        ? "\n\nIt sounds like this may be time-sensitive, so I've flagged it for priority attention."
        : "";
    return "Hi " + first + ",\n\n" + bodies[c.intent] + urgentLine + sign + optout;
  }

  function validate(lead) {
    const errors = [];
    if (!lead.name.trim()) errors.push("Name is missing");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email.trim())) errors.push("Email address isn't valid");
    if (!lead.city.trim()) errors.push("City is missing");
    if (lead.message.trim().length < 5) errors.push("Message is too short to act on");
    return errors;
  }

  async function run(e) {
    e.preventDefault();
    const id = ++runId;
    const alive = () => id === runId;
    resetPipeline();
    formStatus.textContent = "";
    const data = new FormData(form);
    const lead = {
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      service: String(data.get("service") || ""),
      city: String(data.get("city") || ""),
      message: String(data.get("message") || ""),
    };
    setFormLocked(true);
    if (runState) runState.textContent = "Running";
    say("Workflow started.");

    // 1. Validate & dedupe
    setStep("validate", "wait", "Checking…");
    await wait(700);
    if (!alive()) return;
    const errors = validate(lead);
    if (errors.length) {
      setStep("validate", "wait", "Stopped: " + errors.join("; ") + ". Fix the form and resubmit.");
      if (runState) runState.textContent = "Stopped";
      formStatus.textContent = "The workflow stopped at validation: " + errors.join("; ") + ".";
      say("Workflow stopped at validation. " + errors.join(". "));
      setFormLocked(false);
      return;
    }
    const dupe = EXISTING.find((x) => x.email.toLowerCase() === lead.email.trim().toLowerCase());
    setStep(
      "validate",
      "done",
      dupe
        ? "Fields OK. Existing contact found (" + dupe.name + ", " + dupe.id + "): this inquiry is added to that record, no duplicate created."
        : "Fields OK. No existing contact with this email."
    );
    say("Step 1 complete: validated.");

    // 2. Classify
    setStep("classify", "wait", "Applying rules…");
    await wait(800);
    if (!alive()) return;
    const c = classify(lead);
    setStep("classify", "done", "Intent: " + c.intent + " · Urgency: " + c.urgency);
    const rules = section("Why it was classified this way");
    const list = el("ul", { className: "hint" });
    list.style.paddingLeft = "1.2em";
    list.style.margin = "0";
    list.appendChild(
      el("li", null, c.fromService
        ? "No intent keywords in the message, so intent comes from the \"Service needed\" field: " + lead.service + "."
        : "Intent keywords matched: " + c.intentHits.map((w) => '"' + w + '"').join(", ") + " → " + c.intent + ".")
    );
    list.appendChild(
      el("li", null, c.urgentHits.length
        ? "Urgency keywords matched: " + c.urgentHits.map((w) => '"' + w + '"').join(", ") + " → High."
        : "No urgency keywords (e.g. \"no heat\", \"leak\", \"urgent\") → Normal.")
    );
    list.appendChild(
      el("li", null, c.safety
        ? "Safety keywords matched: " + c.safetyHits.map((w) => '"' + w + '"').join(", ") + " → routed to a person immediately with a safety-first reply."
        : "No safety keywords (gas, smoke, carbon monoxide).")
    );
    rules.appendChild(list);
    say("Step 2 complete: " + c.intent + ", urgency " + c.urgency + ".");

    // 3. CRM record
    setStep("crm", "wait", "Creating record…");
    await wait(700);
    if (!alive()) return;
    const recordId = dupe ? dupe.id : "DEMO-" + (2000 + Math.floor(Math.random() * 7000));
    setStep("crm", "done", (dupe ? "Updated " : "Created ") + recordId + " · Owner: " + c.owner);
    const crm = section("CRM record (simulated)");
    crm.appendChild(
      kv([
        ["Record", recordId + (dupe ? " (existing)" : " (new)")],
        ["Name", lead.name.trim()],
        ["Email", lead.email.trim()],
        ["City", lead.city.trim()],
        ["Service", lead.service],
        ["Intent", c.intent],
        ["Urgency", c.urgency],
        ["Source", "Website contact form (demo)"],
        ["Owner (role)", c.owner],
        ["Status", "New: reply drafted, awaiting approval"],
      ])
    );
    say("Step 3 complete: record " + recordId + " routed to " + c.owner + ".");

    // 4. Draft
    setStep("draft", "wait", "Filling template…");
    await wait(800);
    if (!alive()) return;
    const draft = draftReply(lead, c);
    setStep("draft", "done", c.safety ? "Safety-first template used" : "Template: " + c.intent);
    const draftWrap = section("Drafted reply to " + lead.email.trim());
    const box = el("div", { className: "draft-box", id: "lead-draft" }, draft);
    box.setAttribute("aria-label", "Drafted reply");
    draftWrap.appendChild(box);
    const warn = el("p", { className: "callout callout-warn" });
    warn.hidden = true;
    draftWrap.appendChild(warn);
    say("Step 4 complete: reply drafted.");

    // 5. Wait for approval
    setStep("approve", "wait", "Waiting for " + c.owner + " to approve or edit");
    if (runState) runState.textContent = "Waiting for approval";
    const actions = el("div", { className: "btn-row" });
    actions.style.margin = "0";
    const approve = el("button", { type: "button", className: "btn btn-primary btn-sm" }, "Approve & send");
    const edit = el("button", { type: "button", className: "btn btn-secondary btn-sm" }, "Edit draft");
    actions.append(approve, edit);
    draftWrap.appendChild(actions);
    say("Step 5: waiting for human approval. Use Approve and send, or Edit draft.");
    current = { id, lead, c, recordId, box, approve, edit, warn, actions };

    edit.addEventListener("click", () => {
      const editing = box.isContentEditable;
      if (editing) {
        box.contentEditable = "false";
        box.removeAttribute("role");
        box.removeAttribute("aria-multiline");
        edit.textContent = "Edit draft";
        checkDraft();
        edit.focus();
      } else {
        box.contentEditable = "true";
        box.setAttribute("role", "textbox");
        box.setAttribute("aria-multiline", "true");
        box.style.outline = "2px solid var(--gold)";
        edit.textContent = "Done editing";
        box.focus();
      }
      if (!box.isContentEditable) box.style.outline = "";
    });
    box.addEventListener("input", checkDraft);
    approve.addEventListener("click", () => finish(id));
  }

  function checkDraft() {
    if (!current) return false;
    const flagged = PRICE_OR_PROMISE.test(current.box.innerText || current.box.textContent);
    current.warn.hidden = !flagged;
    current.warn.textContent = flagged
      ? "This draft now mentions a price, discount, warranty or time commitment. In a real workflow it would need sign-off from the person authorized to make that commitment before sending."
      : "";
    return flagged;
  }

  async function finish(id) {
    if (!current || current.id !== id) return;
    const { lead, c, recordId, box, actions } = current;
    const flagged = checkDraft();
    box.contentEditable = "false";
    box.removeAttribute("role");
    box.removeAttribute("aria-multiline");
    box.style.outline = "";
    actions.remove();
    const edited = box.textContent !== draftReply(lead, c);
    setStep(
      "approve",
      "done",
      "Approved by " + c.owner + (edited ? " (edited)" : "") + (flagged ? " · pricing/commitment sign-off recorded" : "")
    );
    if (runState) runState.textContent = "Running";
    say("Step 5 complete: approved.");

    setStep("send", "wait", "Sending…");
    await wait(700);
    if (id !== runId) return;
    const t = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setStep("send", "done", "Simulated send at " + t + " to " + lead.email.trim() + ". Nothing was actually sent.");
    say("Step 6 complete: reply marked as sent. Nothing was actually sent.");

    setStep("task", "wait", "Scheduling…");
    await wait(600);
    if (id !== runId) return;
    const first = lead.name.trim().split(/\s+/)[0];
    const when = c.safety ? "Tonight: confirm on-call visit happened" : c.urgency === "High" ? "Later today if no reply" : "Next business day if no reply";
    setStep("task", "done", "Task for " + c.owner + ": follow up with " + first + " (" + when + ")");
    const task = section("Follow-up task (simulated)");
    task.appendChild(
      kv([
        ["Task", (c.safety ? "Confirm on-call visit with " : "Follow up with ") + lead.name.trim()],
        ["Assigned to", c.owner],
        ["Due (sample rule)", when],
        ["Linked record", recordId],
        ["Cancels if", "Lead replies, books, or opts out"],
      ])
    );
    task.appendChild(el("p", { className: "hint" }, "Record status is now \"Replied: follow-up scheduled\". Press Reset demo to start again."));
    if (runState) runState.textContent = "Complete";
    say("Workflow complete. Follow-up task scheduled for " + c.owner + ".");
    current = null;
    setFormLocked(false);
  }

  function setFormLocked(locked) {
    for (const f of form.querySelectorAll("input, select, textarea")) f.disabled = locked;
    submitBtn.disabled = locked;
  }

  form.addEventListener("submit", run);
  resetBtn.addEventListener("click", () => {
    runId++;
    current = null;
    form.reset();
    setFormLocked(false);
    formStatus.textContent = "";
    resetPipeline();
    say("Demo reset. The sample lead has been restored.");
  });
})();
