console.log("Outlook Optimizer Local AI v14 loaded");

let results = [];
let savedTasks = [];
let lastScannedResults = [];

function createSidebar() {
    if (document.getElementById("oo-sidebar")) return;

    const sidebar = document.createElement("div");
    sidebar.id = "oo-sidebar";

    sidebar.innerHTML = `
        <div class="oo-header">
            <div>
                <h2>Outlook Optimizer</h2>
                <p>Local AI email assistant</p>
            </div>
            <button id="oo-close">×</button>
        </div>

        <div class="oo-stats">
            <div class="oo-box">
                <strong id="oo-important">0</strong>
                <span>Important</span>
            </div>
            <div class="oo-box red">
                <strong id="oo-urgent">0</strong>
                <span>Urgent</span>
            </div>
            <div class="oo-box yellow">
                <strong id="oo-deadlines">0</strong>
                <span>Time Info</span>
            </div>
        </div>

        <button id="oo-local-ai">Local AI Analyze Current Email</button>
        <button id="oo-scan-visible">Scan 5 Visible Emails</button>

        <div class="oo-section">
            <h3>Email Analysis</h3>
            <div id="oo-list">
                <p class="oo-empty">Open an email or scan visible inbox emails.</p>
            </div>
        </div>

        <div class="oo-section">
            <h3>To-Do List</h3>
            <div class="oo-add-task">
                <input id="oo-manual-task" type="text" placeholder="Add manual task">
                <button id="oo-add-task-btn">Add</button>
            </div>
            <ul id="oo-todo-list"></ul>
        </div>
    `;

    document.body.appendChild(sidebar);

    document.getElementById("oo-close").onclick = () => sidebar.style.display = "none";
    document.getElementById("oo-local-ai").onclick = localAIAnalyzeCurrentEmail;
    document.getElementById("oo-scan-visible").onclick = scanVisibleEmails;
    document.getElementById("oo-add-task-btn").onclick = addManualTask;

    loadTasks();
}

function getCurrentEmailText() {
    const selectors = [
        '[role="document"]',
        '[aria-label*="Message body"]',
        '[aria-label*="Reading Pane"]',
        '[aria-label*="message"]',
        '[data-app-section="MailReadCompose"]',
        '.allowTextSelection'
    ];

    let bestText = "";

    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            let text = cleanText(el.innerText || "");
            if (!text) return;
            if (isOutlookJunkText(text)) return;

            if (text.length > bestText.length && text.length > 80 && text.length < 15000) {
                bestText = text;
            }
        });
    });

    return bestText;
}

function localAIAnalyzeCurrentEmail() {
    const emailText = getCurrentEmailText();

    if (!emailText || emailText.length < 40) {
        alert("Open an actual email first, then click Local AI Analyze Current Email.");
        return;
    }

    const result = localAIAgent(emailText);

    results = [result];
    lastScannedResults = [...results];

    updateStats();
    showLocalAISummary(result);
}

function scanVisibleEmails() {
    results = [];

    const rows = document.querySelectorAll(
        '[role="option"][aria-selected], [data-convid]'
    );

    const seen = {};

    for (let row of rows) {
        let text = cleanText(
            row.innerText ||
            row.getAttribute("aria-label") ||
            ""
        );

        if (!text) continue;
        if (text.length < 40) continue;
        if (text.length > 1200) continue;

        const lower = text.toLowerCase();

        const junkPhrases = [
            "file home view",
            "reply to this message",
            "make a rule",
            "ctrl+r",
            "ctrl+shift+r",
            "new mail",
            "search for email",
            "favorites",
            "folders",
            "sent items",
            "deleted items",
            "archive",
            "calendar",
            "people",
            "apps",
            "settings",
            "navigation pane",
            "mail folders",
            "compose"
        ];

        if (junkPhrases.some(junk => lower.includes(junk))) continue;
        if (seen[text]) continue;

        const likelyEmail =
            lower.includes("@") ||
            lower.includes("re:") ||
            lower.includes("fw:") ||
            lower.includes("due") ||
            lower.includes("assignment") ||
            lower.includes("project") ||
            lower.includes("class") ||
            lower.includes("meeting") ||
            lower.includes("interview") ||
            lower.includes("deadline") ||
            lower.includes("professor") ||
            lower.includes("student") ||
            lower.includes("course") ||
            lower.includes("canvas") ||
            lower.includes("calstate") ||
            lower.includes("csu") ||
            lower.includes("workplace") ||
            lower.includes("tomorrow") ||
            lower.includes("today") ||
            lower.includes("monday") ||
            lower.includes("tuesday") ||
            lower.includes("wednesday") ||
            lower.includes("thursday") ||
            lower.includes("friday");

        if (!likelyEmail) continue;

        seen[text] = true;

        const result = localAIAgent(text);
        results.push(result);

        if (result.urgent || result.hasDeadline || result.hasTimeInfo) {
            row.classList.add("oo-inline-highlight");
        }

        if (results.length >= 5) break;
    }

    lastScannedResults = [...results];

    updateStats();
    renderVisibleResults();
}

function localAIAgent(text) {
    text = cleanEmailBody(text);

    const deadline = extractDeadline(text);
    const timeInfo = extractTimeSensitiveInfo(text);
    const summary = generateSmartSummary(text);
    const tasks = generateTasks(text);
    const score = calculatePriorityScore(text, deadline, timeInfo, tasks);
    const priority = classifyPriority(score);
    const hasDeadline = deadline !== "No deadline detected";
    const hasTimeInfo = timeInfo !== "No time/date detected";

    return {
        text: text.substring(0, 5000),
        fullText: text,
        priority,
        urgent: priority === "Urgent",
        task: tasks.length > 0,
        deadline,
        timeInfo,
        hasDeadline,
        hasTimeInfo,
        summary,
        aiTasks: tasks,
        score,
        reason: generateReason(priority, hasDeadline, hasTimeInfo, tasks, score),
        recommendedAction: generateRecommendedAction(priority, hasDeadline, hasTimeInfo, tasks)
    };
}

function extractDeadline(text) {
    const patterns = [
        /\boverdue\b/gi,
        /\bdue\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(\s+at\s+\d{1,2}(:\d{2})?\s?(am|pm))?/gi,
        /\bdue\s+by\s+[^,.!?]+/gi,
        /\bsubmit\s+by\s+[^,.!?]+/gi,
        /\bdeadline\s+(is\s+)?[^,.!?]+/gi,
        /\bmust\s+be\s+(submitted|completed|finished)\s+by\s+[^,.!?]+/gi,
        /\bcomplete\s+by\s+[^,.!?]+/gi,
        /\bavailable\s+until\s+[^,.!?]+/gi,
        /\bcloses\s+on\s+[^,.!?]+/gi,
        /\bends\s+on\s+[^,.!?]+/gi
    ];

    let matches = [];

    patterns.forEach(pattern => {
        const found = text.match(pattern);
        if (found) matches = matches.concat(found);
    });

    matches = [...new Set(matches)];

    return matches.length ? matches.slice(0, 3).join(", ") : "No deadline detected";
}

function extractTimeSensitiveInfo(text) {
    const patterns = [
        /\btomorrow\b/gi,
        /\btoday\b/gi,
        /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
        /\b(this|next)\s+week\b/gi,
        /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(at\s+)?\d{1,2}(:\d{2})?\s?(am|pm)\b/gi,
        /\b\d{1,2}(:\d{2})?\s?(am|pm)\b/gi,
        /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g
    ];

    let matches = [];

    patterns.forEach(pattern => {
        const found = text.match(pattern);
        if (found) matches = matches.concat(found);
    });

    matches = [...new Set(matches)];

    return matches.length ? matches.slice(0, 4).join(", ") : "No time/date detected";
}

function calculatePriorityScore(text, deadline, timeInfo, tasks) {
    const lower = text.toLowerCase();
    let score = 0;

    const urgentWords = ["urgent", "asap", "immediately", "critical", "final notice", "action required", "overdue"];
    const importantWords = ["important", "required", "must", "need", "please", "reminder"];
    const schoolWords = ["assignment", "project", "exam", "quiz", "grade", "professor", "canvas", "class", "module"];
    const eventWords = ["meeting", "appointment", "schedule", "interview", "office hours"];

    urgentWords.forEach(word => { if (lower.includes(word)) score += 30; });
    importantWords.forEach(word => { if (lower.includes(word)) score += 15; });
    schoolWords.forEach(word => { if (lower.includes(word)) score += 10; });
    eventWords.forEach(word => { if (lower.includes(word)) score += 12; });

    if (deadline !== "No deadline detected") score += 30;
    if (timeInfo !== "No time/date detected") score += 15;
    if (tasks.length > 0) score += 20;
    if (lower.includes("today")) score += 15;
    if (lower.includes("tomorrow")) score += 12;
    if (lower.includes("overdue")) score += 35;

    return score;
}

function classifyPriority(score) {
    if (score >= 70) return "Urgent";
    if (score >= 40) return "Important";
    if (score >= 20) return "Normal";
    return "Low";
}

function generateSmartSummary(text) {
    text = cleanEmailBody(text);

    const sentences = text
        .split(/(?<=[.!?])\s+/)
        .map(s => cleanText(s))
        .filter(s => s.length > 30 && s.length < 2000)
        .filter(s => !isOutlookJunkText(s))
        .filter(s => !looksLikeEmailHeader(s));

    const scoringWords = [
        "overdue", "due", "deadline", "submit", "complete",
        "review", "required", "important", "assignment",
        "module", "quiz", "project", "action", "please",
        "meeting", "schedule", "respond", "register",
        "tomorrow", "today", "interview", "appointment"
    ];

    const scored = sentences.map(sentence => {
        let score = 0;
        const lower = sentence.toLowerCase();

        scoringWords.forEach(word => {
            if (lower.includes(word)) score += 10;
        });

        if (lower.includes("overdue")) score += 25;
        if (lower.includes("due")) score += 20;
        if (lower.includes("submit")) score += 15;
        if (lower.includes("deadline")) score += 15;
        if (lower.includes("tomorrow")) score += 18;
        if (lower.includes("today")) score += 18;
        if (lower.includes("meeting")) score += 15;

        return { sentence, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const finalSummary = [];

    scored.forEach(item => {
        if (finalSummary.length >= 4) return;

        const duplicate = finalSummary.some(existing =>
            existing.substring(0, 50) === item.sentence.substring(0, 50)
        );

        if (!duplicate && item.score > 0) {
            finalSummary.push(item.sentence);
        }
    });

    if (finalSummary.length) return finalSummary;

    return sentences.slice(0, 4).length
        ? sentences.slice(0, 4)
        : ["No clear summary could be generated from this email preview."];
}

function generateTasks(text) {
    text = cleanEmailBody(text);

    const sentences = text
        .split(/(?<=[.!?])\s+/)
        .map(s => cleanText(s))
        .filter(s => s.length > 20 && s.length < 2000)
        .filter(s => !isOutlookJunkText(s))
        .filter(s => !looksLikeEmailHeader(s));

    const actionWords = [
        "submit", "review", "complete", "register", "email",
        "schedule", "prepare", "respond", "upload", "attend",
        "finish", "apply", "read", "send", "meet"
    ];

    const tasks = [];

    sentences.forEach(sentence => {
        const lower = sentence.toLowerCase();

        actionWords.forEach(word => {
            if (lower.includes(word)) {
                const task = convertSentenceToTask(sentence);
                if (!tasks.includes(task)) tasks.push(task);
            }
        });
    });

    if (text.toLowerCase().includes("overdue") && tasks.length === 0) {
        tasks.push("Review and complete the overdue item.");
    }

    return tasks.slice(0, 5);
}

function showLocalAISummary(item) {
    const list = document.getElementById("oo-list");

    const summaryItems = item.summary.length
        ? item.summary.map(s => `<li>${escapeHTML(s.substring(0, 2000))}</li>`).join("")
        : "<li>No clear summary found.</li>";

    const taskItems = item.aiTasks.length
        ? item.aiTasks.map(t => `<li>${escapeHTML(t.substring(0, 2000))}</li>`).join("")
        : "<li>No clear tasks found.</li>";

    list.innerHTML = `
        <div class="oo-summary">
            <div style="display:flex; gap:8px; margin-bottom:12px;">
                <button id="oo-back-btn">← Back</button>
                <button id="oo-add-summary-task">Add Tasks</button>
            </div>

            <h3>Local AI Email Agent</h3>
            <p><strong>Priority:</strong> ${escapeHTML(item.priority)}</p>
            <p><strong>Deadline:</strong> ${escapeHTML(item.deadline)}</p>
            <p><strong>Time/Date Info:</strong> ${escapeHTML(item.timeInfo)}</p>
            <p><strong>Reason:</strong> ${escapeHTML(item.reason)}</p>

            <h4>Smart Summary</h4>
            <ul>${summaryItems}</ul>

            <h4>Generated Tasks</h4>
            <ul>${taskItems}</ul>

            <h4>Recommended Next Action</h4>
            <p>${escapeHTML(item.recommendedAction)}</p>

            <p style="color:#94a3b8; font-size:12px;">
                Note: inbox scan summaries use Outlook preview text. For full summaries,
                open the email and click Local AI Analyze Current Email.
            </p>
        </div>
    `;

    document.getElementById("oo-add-summary-task").onclick = () => addAITasks(item);

    document.getElementById("oo-back-btn").onclick = () => {
        results = [...lastScannedResults];
        renderVisibleResults();
    };
}

function renderVisibleResults() {
    lastScannedResults = [...results];

    const list = document.getElementById("oo-list");
    list.innerHTML = "";

    if (!results.length) {
        list.innerHTML = `<p class="oo-empty">No important emails detected.</p>`;
        return;
    }

    results.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "oo-item";

        if (item.urgent) div.classList.add("urgent");
        if (item.hasDeadline || item.hasTimeInfo) div.classList.add("deadline");

        const previewSummary = item.summary && item.summary.length
            ? item.summary.join(" ")
            : item.text;

        div.innerHTML = `
            <p>${escapeHTML(previewSummary.substring(0, 1200))}</p>

            <div class="oo-tags">
                <span class="oo-tag blue">${escapeHTML(item.priority)}</span>
                ${item.hasDeadline ? `<span class="oo-tag yellow">Deadline</span>` : ""}
                ${item.hasTimeInfo ? `<span class="oo-tag yellow">Time</span>` : ""}
                ${item.task ? `<span class="oo-tag red">Task</span>` : ""}
            </div>

            <small>${escapeHTML(item.reason)}</small>

            <div class="oo-actions">
                <button class="oo-summary-btn" data-index="${index}">Summary</button>
                <button class="oo-task-btn" data-index="${index}">Add Task</button>
            </div>
        `;

        div.querySelector(".oo-summary-btn").onclick = e => {
            const selectedIndex = Number(e.target.dataset.index);
            showLocalAISummary(results[selectedIndex]);
        };

        div.querySelector(".oo-task-btn").onclick = e => {
            const selectedIndex = Number(e.target.dataset.index);
            addAITasks(results[selectedIndex]);
        };

        list.appendChild(div);
    });
}

function cleanEmailBody(text) {
    text = String(text);

    const junkPatterns = [
        /reply to this message/gi,
        /forward this message/gi,
        /make a rule/gi,
        /ctrl\+\w+/gi,
        /file home view help/gi,
        /search for email/gi,
        /favorites/gi,
        /folders/gi,
        /\b(mon|tue|wed|thu|fri|sat|sun)\s+\d{1,2}:\d{2}\s?(am|pm)\b/gi,
        /\b(mon|tue|wed|thu|fri|sat|sun)\s+\d{1,2}\/\d{1,2}\b/gi,
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
        /[\u25A1-\u25FF]/g
    ];

    junkPatterns.forEach(pattern => {
        text = text.replace(pattern, " ");
    });

    return text
        .split(/\n/)
        .map(line => cleanText(line))
        .filter(line => line.length > 0)
        .filter(line => !isOutlookJunkText(line))
        .filter(line => !looksLikeEmailHeader(line))
        .join(" ");
}

function isOutlookJunkText(text) {
    const lower = text.toLowerCase();

    const junk = [
        "search for email",
        "meetings, files and more",
        "favorites",
        "folders",
        "sent items",
        "drafts",
        "deleted items",
        "archive",
        "junk email",
        "open in new window",
        "reply all",
        "forward",
        "calendar",
        "people",
        "apps",
        "settings",
        "new mail",
        "create a new email",
        "navigation pane",
        "mail folders",
        "compose",
        "microsoft 365",
        "file home view",
        "make a rule",
        "reply to this message",
        "ctrl+r",
        "ctrl+shift+r"
    ];

    return junk.some(item => lower.includes(item)) && text.length < 900;
}

function looksLikeEmailHeader(text) {
    const lower = text.toLowerCase();

    if (lower.includes("@") && lower.length < 220) return true;
    if (/^(mon|tue|wed|thu|fri|sat|sun)\s+\d{1,2}\/\d{1,2}/i.test(text)) return true;
    if (/^(mon|tue|wed|thu|fri|sat|sun)\s+\d{1,2}:\d{2}/i.test(text)) return true;
    if (lower.startsWith("from:")) return true;
    if (lower.startsWith("to:")) return true;
    if (lower.startsWith("subject:")) return true;
    if (lower.startsWith("cc:")) return true;

    return false;
}

function convertSentenceToTask(sentence) {
    let clean = cleanText(sentence);
    clean = clean.replace(/^please\s+/i, "");
    clean = clean.replace(/^you need to\s+/i, "");
    clean = clean.replace(/^remember to\s+/i, "");
    return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function generateReason(priority, hasDeadline, hasTimeInfo, tasks, score) {
    let reasons = [`Local AI score: ${score}`];

    if (priority === "Urgent") reasons.push("high urgency language");
    if (hasDeadline) reasons.push("deadline phrase detected");
    if (hasTimeInfo) reasons.push("time/date reference detected");
    if (tasks.length > 0) reasons.push("action items detected");

    return reasons.join("; ");
}

function generateRecommendedAction(priority, hasDeadline, hasTimeInfo, tasks) {
    if (priority === "Urgent" && hasDeadline) return "Handle this first and add the deadline to your to-do list.";
    if (hasDeadline) return "Add the deadline to your task list or calendar.";
    if (hasTimeInfo) return "Review the date/time information and decide if it needs to be scheduled.";
    if (tasks.length > 0) return "Review the action items and add them to your to-do list.";
    if (priority === "Important") return "Review this email soon.";
    return "Read when available.";
}

function addAITasks(item) {
    if (item.aiTasks.length) {
        item.aiTasks.forEach(taskText => {
            savedTasks.push({
                id: Date.now() + Math.random(),
                text: taskText,
                done: false,
                priority: item.priority
            });
        });
    } else {
        savedTasks.push({
            id: Date.now(),
            text: "Review email: " + item.text.substring(0, 75),
            done: false,
            priority: item.priority
        });
    }

    saveTasks();
    renderTasks();
}

function addManualTask() {
    const input = document.getElementById("oo-manual-task");
    const text = input.value.trim();

    if (!text) return;

    savedTasks.push({
        id: Date.now(),
        text,
        done: false,
        priority: "Manual"
    });

    input.value = "";
    saveTasks();
    renderTasks();
}

function renderTasks() {
    const list = document.getElementById("oo-todo-list");
    list.innerHTML = "";

    if (!savedTasks.length) {
        list.innerHTML = `<li class="oo-empty-task">No tasks yet.</li>`;
        return;
    }

    savedTasks.forEach(task => {
        const li = document.createElement("li");
        li.className = task.done ? "oo-task done" : "oo-task";

        li.innerHTML = `
            <label>
                <input type="checkbox" ${task.done ? "checked" : ""}>
                <span>${escapeHTML(task.text)}</span>
            </label>
            <small>${escapeHTML(task.priority)}</small>
            <button>Delete</button>
        `;

        li.querySelector("input").onchange = e => {
            task.done = e.target.checked;
            saveTasks();
            renderTasks();
        };

        li.querySelector("button").onclick = () => {
            savedTasks = savedTasks.filter(t => t.id !== task.id);
            saveTasks();
            renderTasks();
        };

        list.appendChild(li);
    });
}

function updateStats() {
    document.getElementById("oo-important").innerText = results.length;
    document.getElementById("oo-urgent").innerText = results.filter(r => r.urgent).length;
    document.getElementById("oo-deadlines").innerText =
        results.filter(r => r.hasDeadline || r.hasTimeInfo).length;
}

function loadTasks() {
    chrome.storage.local.get(["outlookOptimizerTasks"], data => {
        savedTasks = data.outlookOptimizerTasks || [];
        renderTasks();
    });
}

function saveTasks() {
    chrome.storage.local.set({ outlookOptimizerTasks: savedTasks });
}

function cleanText(text) {
    return String(text).replace(/\s+/g, " ").trim();
}

function escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "show") {
        createSidebar();
        document.getElementById("oo-sidebar").style.display = "block";
        sendResponse({ status: "shown" });
    }

    if (request.action === "aiCurrent" || request.action === "current") {
        createSidebar();
        document.getElementById("oo-sidebar").style.display = "block";
        localAIAnalyzeCurrentEmail();
        sendResponse({ status: "local AI current email analyzed" });
    }

    if (request.action === "scan") {
        createSidebar();
        document.getElementById("oo-sidebar").style.display = "block";
        scanVisibleEmails();
        sendResponse({ status: "5 visible emails scanned" });
    }

    if (request.action === "hide") {
        const sidebar = document.getElementById("oo-sidebar");
        if (sidebar) sidebar.style.display = "none";
        sendResponse({ status: "hidden" });
    }
});

setTimeout(createSidebar, 2000);