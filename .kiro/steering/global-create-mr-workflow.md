# Workflow: Create Merge Request

Trigger: user asks to "create merge request for {JIRA-TICKET}" or equivalent.

## Procedure start

Record and display the start timestamp. Used later to calculate total duration.

---

## Step 1 — Download Jira ticket details

Use the Jira MCP (`jira_get_issue` with `expand: 'issuelinks'`). Extract:

- Ticket ID, type, title, description
- Issue links (to detect linked User Story via `is caused by`)

If a linked User Story exists, also extract its ID, type, title, and description.

---

## Step 2 — Determine MR target branch (mandatory)

| Jira ticket type | Target branch |
|---|---|
| Development task linked to a User Story | User Story branch (`feature/{US-KEY}-{summary}`) |
| User Story | `develop` |
| Hotfix/Bug linked to a User Story | User Story branch |
| Hotfix/Bug NOT linked to a User Story | `main` |

Verify the target branch exists locally before proceeding.
If it does not exist → **STOP** and report an error.

---

## Step 3 — Checkout and pull ticket branch

```bash
git checkout {ticket-branch}
git pull origin {ticket-branch}
```

---

## Step 4 — Create the Merge Request

Use the GitLab MCP to create the MR against the target branch determined in Step 2.

The MR description **must** include these sections:

### Jira
- Ticket: `[TICKET-ID] Title`
- Type: (User Story / Development Task / …)
- Linked US: (if applicable)

### Summary
One paragraph explaining what this MR does and why.

### Changes
For each file created or modified:
- `path/to/file` — what changed and why

### Entity / Domain (if applicable)
List entity properties: name, type, constraints (required/optional, max length, generated), purpose.

### Validation
- Build: ✅/❌
- Migration applied: ✅/❌/N/A
- Tests: ✅/❌/N/A

### How to test
Step-by-step instructions for the reviewer to verify locally.

---

## Step 5 — Add Jira comment

Add a comment to the Jira ticket with:
- Link to the MR
- Summary of changes
- Start time, end time, total duration

---

## Step 6 — Add Jira tag

Ensure the ticket has the tag `ai-mr-created`.
Do not remove or modify existing tags — append only.
