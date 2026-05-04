console.log("Outlook Email Assistant loaded");

const OO_STATE_KEY = "oo-assistant-state";
const OO_ROOT_ID = "oo-assistant-root";

const state = {
    visible: true,
    activeView: "dashboard",
    groupedBy: "type",
    scannedAt: null,
    emails: [],
    selectedEmailId: null
};

function classifyEmail(email) {
    const haystack = `${email.sender} ${email.subject} ${email.preview}`.toLowerCase();
    const urgentWords = [
        "urgent", "deadline", "due", "today", "tomorrow", "asap", "action required",
        "registration", "final version", "office hours", "submit", "required"
    ];
    const importantWords = [
        "professor", "advisor", "cal poly", "career", "rubric", "class", "assignment",
        "scholarship", "interview", "application"
    ];
    const promoWords = ["sale", "deal", "promo", "package", "shipped", "newsletter", "unsubscribe", "amazon"];

    const urgentScore = urgentWords.filter((word) => haystack.includes(word)).length;
    const importantScore = importantWords.filter((word) => haystack.includes(word)).length;
    const promoScore = promoWords.filter((word) => haystack.includes(word)).length;

    let type = "other";
    if (promoScore > importantScore && promoScore > 0) {
        type = "promo";
    } else if (/class|professor|advisor|cal poly|course|assignment/.test(haystack)) {
        type = "class";
    } else if (/job|career|interview|internship|recruiter/.test(haystack)) {
        type = "job";
    }

    const isUrgent = urgentScore >= 1;
    const isImportant = importantScore >= 1 || isUrgent;

    return {
        ...email,
        type,
        isUrgent,
        isImportant,
        tasks: extractTasks(email),
        deadline: extractDeadline(email)
    };
}

function extractDeadline(email) {
    const haystack = `${email.subject}. ${email.preview}`;
    const patterns = [
        /\b(today)\b/i,
        /\b(tomorrow)\b/i,
        /\b(mon|tue|wed|thu|fri|sat|sun)(day)?\b/i,
        /\b\d{1,2}:\d{2}\s?(am|pm)\b/i,
        /\bnext week\b/i
    ];

    for (const pattern of patterns) {
        const match = haystack.match(pattern);
        if (match) {
            return match[0];
        }
    }

    return null;
}

function extractTasks(email) {
    const combined = `${email.subject}. ${email.preview}`;
    const taskPatterns = [
        /register[^.?!]*/i,
        /review[^.?!]*/i,
        /apply[^.?!]*/i,
        /prepare[^.?!]*/i,
        /email[^.?!]*/i,
        /submit[^.?!]*/i,
        /bring[^.?!]*/i
    ];

    const tasks = [];
    for (const pattern of taskPatterns) {
        const match = combined.match(pattern);
        if (match) {
            const task = match[0].trim();
            if (!tasks.includes(task)) {
                tasks.push(task);
            }
        }
    }
    return tasks;
}

function buildSummary(email) {
    const keyPoints = [];
    if (email.deadline) {
        keyPoints.push(`Deadline: ${email.deadline}`);
    }
    if (email.isUrgent) {
        keyPoints.push("Marked urgent from deadline or action language.");
    }
    if (email.tasks.length) {
        keyPoints.push(`Next action: ${email.tasks[0]}`);
    }
    if (!keyPoints.length) {
        keyPoints.push("No clear deadline found. Review email content for context.");
    }
    return keyPoints;
}

function collectEmailsFromOutlook() {
    const selectors = [
        '[role="row"]',
        '[role="option"]',
        '[data-convid]',
        '[draggable="true"]'
    ];

    const nodes = new Set();
    selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((node) => {
            if (node.innerText && node.innerText.trim().length > 10) {
                nodes.add(node);
            }
        });
    });

    const emails = [];
    Array.from(nodes).slice(0, 80).forEach((node, index) => {
        const text = node.innerText.replace(/\s+/g, " ").trim();
        if (!text || text.length < 10) {
            return;
        }

        const lines = node.innerText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

        const sender = lines[0] || "Unknown Sender";
        const subject = lines[1] || lines[0] || "No subject";
        const preview = lines.slice(2).join(" ") || text;
        const id = node.getAttribute("data-convid") || node.getAttribute("id") || `email-${index}`;

        emails.push(
            classifyEmail({
                id,
                sender,
                subject,
                preview,
                rawText: text
            })
        );
    });

    if (!emails.length) {
        return [
            classifyEmail({
                id: "sample-1",
                sender: "Cal Poly Admin",
                subject: "Registration deadline today",
                preview: "Action required before 5:00 PM.",
                rawText: "Cal Poly Admin Registration deadline today Action required before 5:00 PM."
            }),
            classifyEmail({
                id: "sample-2",
                sender: "Professor Chen",
                subject: "Project rubric updated",
                preview: "Please review the new rubric before submitting Friday at 11:59 PM.",
                rawText: "Professor Chen Project rubric updated Please review the new rubric before submitting Friday at 11:59 PM."
            }),
            classifyEmail({
                id: "sample-3",
                sender: "Career Services",
                subject: "Engineering fair next week",
                preview: "Apply to the career fair posting and prepare advisor questions.",
                rawText: "Career Services Engineering fair next week Apply to the career fair posting and prepare advisor questions."
            }),
            classifyEmail({
                id: "sample-4",
                sender: "Amazon",
                subject: "Your package has shipped",
                preview: "Track your shipment here.",
                rawText: "Amazon Your package has shipped Track your shipment here."
            })
        ];
    }

    return emails;
}

function getSelectedEmail() {
    return state.emails.find((email) => email.id === state.selectedEmailId) || state.emails[0] || null;
}

function computeDashboardData() {
    const important = state.emails.filter((email) => email.isImportant);
    const urgent = state.emails.filter((email) => email.isUrgent);
    const tasks = state.emails.flatMap((email) =>
        email.tasks.map((task) => ({
            task,
            sender: email.sender,
            deadline: email.deadline,
            type: email.deadline && /today|tomorrow|mon|tue|wed|thu|fri/i.test(email.deadline)
                ? "today"
                : email.deadline
                    ? "week"
                    : "later"
        }))
    );

    const grouped = {
        class: state.emails.filter((email) => email.type === "class"),
        job: state.emails.filter((email) => email.type === "job"),
        promo: state.emails.filter((email) => email.type === "promo"),
        urgent
    };

    return { important, urgent, tasks, grouped };
}

function persistState() {
    chrome.storage.local.set({
        [OO_STATE_KEY]: {
            visible: state.visible,
            activeView: state.activeView,
            groupedBy: state.groupedBy,
            selectedEmailId: state.selectedEmailId
        }
    });
}

function restoreState(callback) {
    chrome.storage.local.get(OO_STATE_KEY, (result) => {
        const saved = result[OO_STATE_KEY];
        if (saved) {
            state.visible = saved.visible !== false;
            state.activeView = saved.activeView || "dashboard";
            state.groupedBy = saved.groupedBy || "type";
            state.selectedEmailId = saved.selectedEmailId || null;
        }
        callback();
    });
}

function render() {
    const root = ensureRoot();
    const dashboard = computeDashboardData();
    const selected = getSelectedEmail();
    const todayTasks = dashboard.tasks.filter((task) => task.type === "today");
    const weekTasks = dashboard.tasks.filter((task) => task.type === "week");
    const laterTasks = dashboard.tasks.filter((task) => task.type === "later");

    root.style.display = state.visible ? "block" : "none";

    root.innerHTML = `
        <div class="oo-shell">
            <div class="oo-header">
                <div>
                    <div class="oo-eyebrow">Outlook Assistant</div>
                    <h2>Priority Dashboard</h2>
                </div>
                <button class="oo-icon-button" data-oo-action="close" type="button">Hide</button>
            </div>

            <div class="oo-tabs">
                <button class="${state.activeView === "dashboard" ? "active" : ""}" data-oo-view="dashboard" type="button">Dashboard</button>
                <button class="${state.activeView === "filters" ? "active" : ""}" data-oo-view="filters" type="button">Important + Urgent</button>
                <button class="${state.activeView === "todo" ? "active" : ""}" data-oo-view="todo" type="button">Today / Week</button>
                <button class="${state.activeView === "summary" ? "active" : ""}" data-oo-view="summary" type="button">Single Email</button>
                <button class="${state.activeView === "groups" ? "active" : ""}" data-oo-view="groups" type="button">Group View</button>
            </div>

            <div class="oo-toolbar">
                <button class="oo-primary" data-oo-action="scan" type="button">Scan Outlook</button>
                <span>${state.scannedAt ? `Last scan: ${new Date(state.scannedAt).toLocaleTimeString()}` : "No scan yet"}</span>
            </div>

            <div class="oo-content">
                ${state.activeView === "dashboard" ? `
                    <div class="oo-stats">
                        <div><strong>${dashboard.important.length}</strong><span>Important</span></div>
                        <div class="red"><strong>${dashboard.urgent.length}</strong><span>Urgent</span></div>
                        <div><strong>${dashboard.tasks.length}</strong><span>Tasks</span></div>
                    </div>
                    <div class="oo-section">
                        <h3>Priority Emails</h3>
                        ${state.emails.slice(0, 6).map(renderEmailCard).join("")}
                    </div>
                ` : ""}

                ${state.activeView === "filters" ? `
                    <div class="oo-section">
                        <h3>Urgent First</h3>
                        ${dashboard.urgent.length ? dashboard.urgent.map(renderEmailCard).join("") : `<p class="oo-empty">No urgent emails detected.</p>`}
                    </div>
                    <div class="oo-section">
                        <h3>Important Next</h3>
                        ${dashboard.important.filter((email) => !email.isUrgent).map(renderEmailCard).join("") || `<p class="oo-empty">No additional important emails detected.</p>`}
                    </div>
                ` : ""}

                ${state.activeView === "todo" ? `
                    <div class="oo-columns">
                        <div class="oo-column">
                            <h3>Today</h3>
                            ${todayTasks.map(renderTask).join("") || `<p class="oo-empty">Nothing urgent for today.</p>`}
                        </div>
                        <div class="oo-column">
                            <h3>This Week</h3>
                            ${weekTasks.map(renderTask).join("") || `<p class="oo-empty">No week-level tasks detected.</p>`}
                        </div>
                        <div class="oo-column">
                            <h3>Later</h3>
                            ${laterTasks.map(renderTask).join("") || `<p class="oo-empty">No later tasks detected.</p>`}
                        </div>
                    </div>
                ` : ""}

                ${state.activeView === "summary" ? `
                    <div class="oo-summary-layout">
                        <div class="oo-email-list">
                            ${state.emails.slice(0, 10).map((email) => `
                                <button class="oo-list-email ${selected && selected.id === email.id ? "active" : ""}" data-oo-select="${email.id}" type="button">
                                    <strong>${escapeHtml(email.subject)}</strong>
                                    <span>${escapeHtml(email.sender)}</span>
                                </button>
                            `).join("")}
                        </div>
                        <div class="oo-summary-card">
                            ${selected ? `
                                <h3>${escapeHtml(selected.subject)}</h3>
                                <p><strong>From:</strong> ${escapeHtml(selected.sender)}</p>
                                <p>${escapeHtml(selected.preview)}</p>
                                <div class="oo-bullets">
                                    ${buildSummary(selected).map((item) => `<div>${escapeHtml(item)}</div>`).join("")}
                                </div>
                            ` : `<p class="oo-empty">Select an email to summarize.</p>`}
                        </div>
                    </div>
                ` : ""}

                ${state.activeView === "groups" ? `
                    <div class="oo-columns">
                        <div class="oo-column">
                            <h3>Classes</h3>
                            ${dashboard.grouped.class.map(renderEmailCard).join("") || `<p class="oo-empty">No class emails found.</p>`}
                        </div>
                        <div class="oo-column">
                            <h3>Career / Jobs</h3>
                            ${dashboard.grouped.job.map(renderEmailCard).join("") || `<p class="oo-empty">No job emails found.</p>`}
                        </div>
                        <div class="oo-column">
                            <h3>Promotions</h3>
                            ${dashboard.grouped.promo.map(renderEmailCard).join("") || `<p class="oo-empty">No promotions found.</p>`}
                        </div>
                    </div>
                ` : ""}
            </div>
        </div>
    `;

    bindRootEvents(root);
}

function renderEmailCard(email) {
    return `
        <button class="oo-email-card ${email.isUrgent ? "urgent" : email.isImportant ? "important" : ""}" data-oo-select="${email.id}" type="button">
            <strong>${escapeHtml(email.sender)}</strong>
            <div class="oo-email-subject">${escapeHtml(email.subject)}</div>
            <p>${escapeHtml(email.preview.slice(0, 120))}</p>
            <div class="oo-tags">
                ${email.deadline ? `<span>${escapeHtml(email.deadline)}</span>` : ""}
                ${email.type ? `<span>${escapeHtml(email.type)}</span>` : ""}
            </div>
        </button>
    `;
}

function renderTask(task) {
    return `
        <div class="oo-task-card">
            <strong>${escapeHtml(task.task)}</strong>
            <span>${escapeHtml(task.sender)}${task.deadline ? ` • ${escapeHtml(task.deadline)}` : ""}</span>
        </div>
    `;
}

function escapeHtml(text) {
    return String(text || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function ensureRoot() {
    let root = document.getElementById(OO_ROOT_ID);
    if (!root) {
        root = document.createElement("div");
        root.id = OO_ROOT_ID;
        document.body.appendChild(root);
    }
    return root;
}

function bindRootEvents(root) {
    root.querySelectorAll("[data-oo-view]").forEach((button) => {
        button.onclick = function () {
            state.activeView = button.getAttribute("data-oo-view");
            persistState();
            render();
        };
    });

    root.querySelectorAll("[data-oo-select]").forEach((button) => {
        button.onclick = function () {
            state.selectedEmailId = button.getAttribute("data-oo-select");
            state.activeView = "summary";
            persistState();
            render();
        };
    });

    root.querySelectorAll("[data-oo-action]").forEach((button) => {
        button.onclick = function () {
            const action = button.getAttribute("data-oo-action");
            if (action === "scan") {
                runScan();
            } else if (action === "close") {
                state.visible = false;
                persistState();
                render();
            }
        };
    });
}

function runScan() {
    state.emails = collectEmailsFromOutlook();
    state.scannedAt = Date.now();
    if (!state.selectedEmailId && state.emails.length) {
        state.selectedEmailId = state.emails[0].id;
    }
    persistState();
    render();
}

function handlePopupAction(action) {
    if (action === "scan") {
        runScan();
        return { ok: true, message: `Scanned ${state.emails.length} messages.` };
    }
    if (action === "show") {
        state.visible = true;
        persistState();
        render();
        return { ok: true, message: "Sidebar shown." };
    }
    if (action === "hide") {
        state.visible = false;
        persistState();
        render();
        return { ok: true, message: "Sidebar hidden." };
    }
    return { ok: false, message: "Unknown action." };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) {
        sendResponse({ ok: false, message: "No action received." });
        return;
    }

    sendResponse(handlePopupAction(message.action));
});

restoreState(() => {
    runScan();
});
