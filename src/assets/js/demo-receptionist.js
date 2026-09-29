// AI receptionist demo: a scripted, branching simulation of an after-hours
// call to a fictional HVAC company. All data is fictional and stays in the
// browser; nothing is sent anywhere.
(function () {
  "use strict";

  const log = document.querySelector("[data-demo-log]");
  const choicesEl = document.querySelector("[data-demo-choices]");
  const summaryEl = document.querySelector("[data-demo-summary]");
  const handoffEl = document.querySelector("[data-demo-handoff]");
  const restartBtn = document.querySelector("[data-demo-restart]");
  if (!log || !choicesEl || !summaryEl || !handoffEl) return;

  const reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Fictional sample caller details (555-01xx numbers are reserved for fiction).
  const SAMPLE = {
    name: "Jordan Sample",
    phone: "(555) 010-0142",
    address: "123 Example Lane, Sampletown",
  };

  const FIELDS = [
    ["caller", "Caller"],
    ["phone", "Callback number"],
    ["address", "Service address"],
    ["reason", "Reason for call"],
    ["priority", "Priority"],
    ["outcome", "Outcome"],
    ["next", "Next action"],
  ];

  // Each node: agent lines, optional system notes, summary/handoff updates, caller choices.
  // A choice's `say` is what the caller says; `to` is the next node.
  const NODES = {
    start: {
      system: ["Incoming call · 9:47 PM · after hours (sample)"],
      agent: [
        "Thanks for calling Example Heating & Air. You've reached our after-hours assistant. I'm an automated system, and a summary of this call goes to our team.",
        "How can I help tonight?",
      ],
      handoff: "Assistant answering. No human involved yet.",
      choices: [
        { say: "My air conditioner stopped working. Can someone come out?", to: "r_safety", set: { reason: "AC not working" } },
        { say: "I smell gas near my furnace.", to: "e_start" },
        { say: "Can I just talk to a real person?", to: "h_start", set: { reason: "Asked for a person" } },
        { say: "Will my home warranty cover a repair?", to: "o_start", set: { reason: "Home warranty coverage question" } },
      ],
    },

    // ---- Routine booking -------------------------------------------------
    r_safety: {
      agent: [
        "Sorry to hear that. Before anything else: is anyone at risk right now? For example, do you smell gas or smoke, or is someone in the home especially vulnerable to the heat?",
      ],
      set: { priority: "Checking…" },
      choices: [
        { say: "No, everyone's fine. It's just getting warm.", to: "r_name", set: { priority: "Routine" } },
        { say: "Actually, I think I smell gas.", to: "e_start" },
      ],
    },
    r_name: {
      agent: ["Okay, good. I'll get a repair visit set up. Can I have your name?"],
      choices: [{ say: "It's " + SAMPLE.name + ".", to: "r_phone", set: { caller: SAMPLE.name } }],
    },
    r_phone: {
      agent: ["Thanks, Jordan. What's the best number to reach you if the technician needs to call?"],
      choices: [{ say: SAMPLE.phone + ".", to: "r_issue", set: { phone: SAMPLE.phone } }],
    },
    r_issue: {
      agent: ["Got it. Can you tell me what the system is doing?"],
      choices: [
        {
          say: "The outdoor unit hums but the fan isn't spinning, and the vents are blowing warm air.",
          to: "r_address",
          set: { reason: "AC repair: outdoor unit hums, fan not spinning, warm air" },
        },
      ],
    },
    r_address: {
      agent: ["Thanks, that's helpful for the technician. What's the service address?"],
      choices: [{ say: SAMPLE.address + ".", to: "r_slots", set: { address: SAMPLE.address } }],
    },
    r_slots: {
      agent: [
        "I have these openings for a repair visit: tomorrow 8 to 10 AM, tomorrow 1 to 3 PM, or Thursday 10 AM to noon. Which works best?",
      ],
      system: ["Sample calendar: slots are hard-coded for this demo"],
      choices: [
        { say: "Tomorrow, 8 to 10 AM.", to: "r_booked", slot: "Tomorrow, 8–10 AM" },
        { say: "Tomorrow, 1 to 3 PM.", to: "r_booked", slot: "Tomorrow, 1–3 PM" },
        { say: "Thursday, 10 to noon.", to: "r_booked", slot: "Thursday, 10 AM–12 PM" },
        { say: "None of those work for me.", to: "r_noslot" },
      ],
    },
    r_booked: {
      agent: [
        "You're down for {slot}. Our dispatcher reviews overnight bookings first thing in the morning and will text you to confirm.",
        "Is there anything else I can help with?",
      ],
      set: { outcome: "Booked: {slot} (pending dispatcher confirmation)", next: "Dispatcher confirms booking by text in the morning" },
      handoff: "No transfer needed. Booking queued for dispatcher review in the morning.",
      choices: [
        { say: "No, that's everything. Thanks.", to: "end_thanks" },
        { say: "How much is this going to cost?", to: "r_price" },
      ],
    },
    r_price: {
      agent: [
        "I can't give you prices over the phone. That depends on what the technician finds, and I don't want to quote you something that turns out to be wrong.",
        "I've added a note asking the dispatcher to explain the diagnostic fee when they confirm your appointment. Anything else?",
      ],
      set: { next: "Dispatcher confirms booking by text and explains the diagnostic fee (caller asked about cost)" },
      choices: [{ say: "No, that's all. Thanks.", to: "end_thanks" }],
    },
    r_noslot: {
      agent: [
        "No problem. I'll mark this as a scheduling callback so the office can find a time that works for you first thing in the morning.",
        "If the house gets uncomfortably hot for anyone, call back and say it's urgent and I'll page our on-call technician.",
      ],
      set: { outcome: "No slot chosen: scheduling callback requested", next: "Office calls back in the morning to schedule" },
      handoff: "Callback queued for the office team in the morning.",
      choices: [{ say: "That works. Thank you.", to: "end_thanks" }],
    },

    // ---- Emergency --------------------------------------------------------
    e_start: {
      agent: [
        "Thank you for telling me. Your safety comes first.",
        "Please leave the house now and take everyone with you. Don't switch lights or appliances on or off, and don't use anything that could make a spark.",
        "Once you're outside and away from the house, call your gas utility's emergency line or 911.",
      ],
      system: ["ESCALATION: on-call technician paged (simulated)"],
      set: { reason: "Gas smell near furnace", priority: "EMERGENCY: possible gas leak", outcome: "Safety instructions given; on-call technician paged" },
      handoff: "Emergency: on-call technician paged. Preparing live transfer.",
      choices: [
        { say: "Okay, I'm outside now.", to: "e_details" },
        { say: "I'm still inside.", to: "e_inside" },
      ],
    },
    e_inside: {
      agent: [
        "Please go outside first. This call can wait. Leave the door open behind you if it's easy, and call the gas utility or 911 once you're away from the house.",
        "I'm still here. Tell me when you're out.",
      ],
      choices: [{ say: "Okay, I'm outside now.", to: "e_details" }],
    },
    e_details: {
      agent: ["Good. So the technician knows where to go, can I get your name and the address?"],
      choices: [
        {
          say: SAMPLE.name + ", " + SAMPLE.address + ".",
          to: "e_transfer",
          set: { caller: SAMPLE.name, address: SAMPLE.address, phone: SAMPLE.phone + " (caller ID)" },
        },
      ],
    },
    e_transfer: {
      agent: [
        "Thank you, Jordan. I'm connecting you to our on-call technician now.",
        "If the transfer doesn't connect, they'll call you straight back at this number. Please don't wait on us to call the gas utility or 911.",
      ],
      system: ["Warm transfer to on-call technician (simulated) · summary sent by text"],
      set: { next: "On-call technician handling now; office follows up in the morning" },
      handoff: "Transferred to on-call technician (human). Summary sent ahead of the transfer.",
      end: true,
    },

    // ---- Caller asks for a human -----------------------------------------
    h_start: {
      agent: [
        "Of course. Our office is closed right now, but I can have someone call you back.",
        "If it's urgent, like no heat in freezing weather, a gas smell or smoke, tell me and I'll page our on-call technician right away.",
      ],
      handoff: "Caller asked for a person. Offering callback or on-call page.",
      choices: [
        { say: "It's not urgent. A call in the morning is fine.", to: "h_details", set: { priority: "Routine" } },
        { say: "It's urgent. The heat's out and it's freezing tonight.", to: "h_urgent" },
        { say: "Actually, I smell gas.", to: "e_start" },
      ],
    },
    h_details: {
      agent: ["Sure. What's your name and the best number to call you back on?"],
      choices: [
        { say: SAMPLE.name + ", " + SAMPLE.phone + ".", to: "h_topic", set: { caller: SAMPLE.name, phone: SAMPLE.phone } },
      ],
    },
    h_topic: {
      agent: ["Thanks. And briefly, what's it about, so the right person calls you?"],
      choices: [
        { say: "I want to ask about a maintenance plan.", to: "h_done", set: { reason: "Asked for a person: maintenance plan question" } },
      ],
    },
    h_done: {
      agent: [
        "Got it. I've passed that to the office team, and someone will call you back when the office opens. Anything else tonight?",
      ],
      set: { outcome: "Callback requested", next: "Office team calls back when the office opens" },
      handoff: "Callback queued for the office team. No live transfer (not urgent).",
      choices: [{ say: "No, that's it. Thanks.", to: "end_thanks" }],
    },
    h_urgent: {
      agent: [
        "Understood. I'm paging our on-call technician now.",
        "While I do that, can I get your name, number and address?",
      ],
      system: ["ESCALATION: on-call technician paged (simulated)"],
      set: { reason: "No heat in freezing weather", priority: "URGENT: no heat, freezing temperatures" },
      handoff: "Urgent: on-call technician paged.",
      choices: [
        {
          say: SAMPLE.name + ", " + SAMPLE.phone + ", " + SAMPLE.address + ".",
          to: "h_urgent_done",
          set: { caller: SAMPLE.name, phone: SAMPLE.phone, address: SAMPLE.address },
        },
      ],
    },
    h_urgent_done: {
      agent: [
        "Thank you. The on-call technician has your details and will call you back directly.",
        "If anyone in the home is at risk from the cold, or you notice a gas smell or smoke, don't wait for us. Call 911.",
      ],
      system: ["On-call technician acknowledged page (simulated)"],
      set: { outcome: "Urgent: on-call technician paged", next: "On-call technician calls caller back tonight" },
      handoff: "On-call technician (human) acknowledged and will call back.",
      end: true,
    },

    // ---- Out of scope ----------------------------------------------------
    o_start: {
      agent: [
        "That's a fair question, but I don't know. Coverage depends on your warranty company and your policy, and I don't want to guess.",
        "I can take a message for our office team so they can help you check. Would that help?",
      ],
      set: { priority: "Routine" },
      handoff: "Out of scope for the assistant. Offering to take a message.",
      choices: [
        { say: "Yes, please take a message.", to: "o_details" },
        { say: "No thanks, I'll call my warranty company.", to: "o_decline" },
      ],
    },
    o_details: {
      agent: ["Of course. What's your name and the best number to reach you?"],
      choices: [
        { say: SAMPLE.name + ", " + SAMPLE.phone + ".", to: "o_msg", set: { caller: SAMPLE.name, phone: SAMPLE.phone } },
      ],
    },
    o_msg: {
      agent: ["And what should I tell the team? Which warranty company, and what's the repair?"],
      choices: [
        {
          say: "It's Sample Home Warranty Co., for the furnace repair you did last month.",
          to: "o_done",
          set: { reason: "Warranty question: Sample Home Warranty Co., last month's furnace repair" },
        },
      ],
    },
    o_done: {
      agent: ["Thanks. I've taken that down and the office team will get back to you when they open. Anything else?"],
      set: { outcome: "Message taken", next: "Office team checks warranty question and calls back" },
      handoff: "Message queued for the office team. No live transfer needed.",
      choices: [{ say: "No, that's all. Thanks.", to: "end_thanks" }],
    },
    o_decline: {
      agent: ["No problem. If you'd like help with the repair itself, just call back anytime. Have a good night."],
      set: { outcome: "Question only; caller declined a message", next: "None required" },
      handoff: "No handoff needed. Logged for the record.",
      end: true,
    },

    end_thanks: {
      agent: ["You're welcome. Thanks for calling Example Heating & Air, and have a good night."],
      end: true,
    },
  };

  let runId = 0;
  let state = {};

  function wait(ms) {
    return new Promise((res) => setTimeout(res, reduceMotion ? 0 : ms));
  }

  function fill(text) {
    return String(text).replace(/\{slot\}/g, state.slot || "");
  }

  function scroll() {
    log.scrollTop = log.scrollHeight;
  }

  function addMsg(kind, text) {
    const el = document.createElement("div");
    el.className = "msg msg-" + kind;
    if (kind !== "system") {
      const who = document.createElement("span");
      who.className = "msg-who";
      who.textContent = kind === "agent" ? "Assistant" : "Caller (you)";
      el.appendChild(who);
    }
    el.appendChild(document.createTextNode(text));
    log.appendChild(el);
    scroll();
    return el;
  }

  function renderSummary() {
    summaryEl.textContent = "";
    for (const [key, label] of FIELDS) {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = state.summary[key] || "—";
      if (!state.summary[key]) dd.style.fontWeight = "400";
      if (/EMERGENCY|URGENT/.test(state.summary[key] || "")) dd.style.color = "var(--clay-dark)";
      summaryEl.append(dt, dd);
    }
  }

  function applySet(set) {
    if (!set) return;
    for (const k of Object.keys(set)) state.summary[k] = fill(set[k]);
    renderSummary();
  }

  function setChoices(list, focus) {
    choicesEl.textContent = "";
    list.forEach((c, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = c.say;
      b.addEventListener("click", () => choose(c));
      choicesEl.appendChild(b);
      if (focus && i === 0) b.focus();
    });
  }

  async function play(key) {
    const id = runId;
    const node = NODES[key];
    const hadFocus = choicesEl.contains(document.activeElement);
    choicesEl.textContent = "";
    // Keep keyboard focus somewhere sensible while choices are rebuilt.
    if (hadFocus) log.focus({ preventScroll: true });

    for (const line of node.system || []) addMsg("system", fill(line));
    for (const line of node.agent || []) {
      const typing = addMsg("agent", "…");
      typing.setAttribute("aria-hidden", "true");
      await wait(Math.min(450 + line.length * 12, 1500));
      if (id !== runId) return;
      typing.remove();
      addMsg("agent", fill(line));
      await wait(200);
      if (id !== runId) return;
    }
    applySet(node.set);
    if (node.handoff) handoffEl.textContent = node.handoff;

    if (node.end) {
      addMsg("system", "Call ended (simulated). Summary delivered to the team.");
      if (!state.summary.outcome) {
        state.summary.outcome = "Call completed";
        renderSummary();
      }
      setChoices([{ say: "Restart the demo", restart: true }], hadFocus);
    } else {
      setChoices(node.choices, hadFocus);
    }
  }

  function choose(c) {
    if (c.restart) return start(true);
    if (c.slot) state.slot = c.slot;
    addMsg("caller", c.say);
    applySet(c.set);
    play(c.to);
  }

  function start(focus) {
    runId++;
    state = { summary: {}, slot: "" };
    log.textContent = "";
    handoffEl.textContent = "Waiting for the call to start.";
    renderSummary();
    // Mark focus intent so the first choice receives focus after restart.
    if (focus) {
      choicesEl.textContent = "";
      const placeholder = document.createElement("span");
      placeholder.tabIndex = -1;
      choicesEl.appendChild(placeholder);
      placeholder.focus({ preventScroll: true });
    }
    play("start");
  }

  if (restartBtn) restartBtn.addEventListener("click", () => start(false));
  start(false);
})();
