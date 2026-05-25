# Outlook Optimizer AI v5.0.0 Release Notes

Outlook Optimizer AI is a Chrome extension for Outlook Web that adds a sidebar assistant for reviewing emails, identifying urgent messages, finding deadlines or time-sensitive details, and creating a simple to-do list.

## What's Included

- Sidebar assistant inside Outlook Web
- Current email analysis with local rule-based AI logic
- Visible inbox scanning for up to 5 email previews
- Priority labels for urgent, important, normal, and low-priority emails
- Deadline and time/date detection
- Generated follow-up tasks based on email content
- Manual to-do list with complete and delete controls
- Saved task list using Chrome local storage

## Supported Sites

The extension is designed for Outlook Web:

- `https://outlook.office.com/*`
- `https://outlook.live.com/*`
- `https://outlook.office365.com/*`
- `https://outlook.cloud.microsoft/*`

## Installation

1. Download or clone this repository.
2. Open Google Chrome.
3. Go to `chrome://extensions/`.
4. Turn on **Developer mode** in the top-right corner.
5. Click **Load unpacked**.
6. Select the folder that contains `manifest.json`.
7. Pin **Outlook Optimizer AI** to the Chrome toolbar for easier access.

## How to Use

1. Open Outlook Web in Chrome.
2. Sign in and go to your inbox.
3. Click the **Outlook Optimizer AI** extension icon in the Chrome toolbar.
4. Click **Show Sidebar** to display the assistant panel in Outlook.

### Analyze the Current Email

1. Open an email in Outlook.
2. Click the extension icon.
3. Click **AI Analyze Current Email** or **Rule Scan Current Email**.
4. Review the sidebar results, including:
   - Priority
   - Detected deadline
   - Detected time/date information
   - Local summary
   - Generated tasks
   - Recommended next action
5. Click **Add Tasks** to move generated tasks into the to-do list.

### Scan Visible Emails

1. Go to your Outlook inbox.
2. Make sure email previews are visible.
3. Click the extension icon.
4. Click **Scan Visible Emails**.
5. The sidebar will scan up to 5 visible emails and highlight messages that appear urgent, time-sensitive, or deadline-related.
6. Use **Details** to view a deeper breakdown.
7. Use **Add Task** to add generated tasks from a scanned email.

### Manage Tasks

Use the to-do list in the sidebar to:

- Add a manual task
- Mark a task complete
- Delete a task
- Save tasks between browser sessions

Tasks are stored locally in Chrome using extension storage.

## API Key Field

The popup includes an OpenAI API key field for demo purposes. This release primarily uses local rule-based analysis in the browser. Do not ship production API keys inside a browser extension or share a packaged build that contains private credentials.

## Privacy Notes

- Task data is stored locally in Chrome extension storage.
- The extension runs only on the supported Outlook Web domains listed above.
- The extension reads visible Outlook page content only to provide email analysis and task suggestions.
- This release is intended for class/demo use and should be reviewed before production deployment.

## Known Limitations

- Email extraction depends on Outlook Web's current page structure, so some layouts may produce incomplete results.
- Visible inbox scanning is limited to 5 detected email previews.
- Analysis is rule-based and may miss context that a full language model would understand.
- The extension is intended for Outlook Web, not the desktop Outlook application.

