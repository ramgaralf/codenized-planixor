# Workflow: Review Merge Request

Trigger: user asks to "review merge request for {JIRA-TICKET}" or equivalent.

## Procedure start

Record and display the start timestamp. Used later to calculate total duration.

---

## Step 1 — Download Jira ticket details

Use the Jira MCP (`jira_get_issue` with `expand: 'issuelinks'`). Extract:

- Ticket ID, type, title, description
- Issue links (linked User Story via `is caused by`)

---

## Step 2 — Checkout and pull ticket branch

```bash
git checkout {ticket-branch}
git pull origin {ticket-branch}
```

---

## Step 3 — Review the Merge Request

Use the GitLab MCP to fetch the MR diff. Review against:

- Jira ticket specifications
- Architecture rules (see `api-architecture.md`)
- Code style guidelines (see `api-tech.md`)
- Documentation standards (see `api-workflows.md`)
- Testing standards (see `api-workflows.md`)

### Review checklist

#### Correctness
- [ ] Code does what the MR description says
- [ ] Edge cases handled (null inputs, empty collections, concurrent access)
- [ ] Error cases handled with appropriate HTTP status codes / exceptions
- [ ] No logic that fails silently (empty catch, ignored return values)
- [ ] No off-by-one errors in loops / pagination

#### Security
- [ ] No hardcoded secrets, tokens, or connection strings
- [ ] Input validation on all external inputs
- [ ] Authorization checks: caller owns the resource they're accessing
- [ ] No sensitive data logged or returned in error messages
- [ ] No SQL injection via string concatenation

#### Performance
- [ ] No N+1 queries
- [ ] Collections projected to DTOs before returning — not full entities
- [ ] No unbounded queries (always paginated or limited)
- [ ] No synchronous I/O on async code paths
- [ ] No `Thread.Sleep` or blocking `.Result` calls

#### Testability and Tests
- [ ] Tests exist for new behavior (min. 80% coverage)
- [ ] Existing tests still pass
- [ ] Tests test behavior, not implementation details
- [ ] Tests named with `Method_Scenario_ExpectedBehavior` pattern

#### Readability and Maintainability
- [ ] Names are descriptive and in English
- [ ] No magic numbers or strings (use named constants or enums)
- [ ] No commented-out code
- [ ] Complex logic has a comment explaining *why*, not *what*
- [ ] No `// TODO` without a task or spec reference
- [ ] Methods not too long (prefer ≤ 30 lines)

#### Conventions
- [ ] Follows architecture, guidelines, test, and security steering rules
- [ ] Conventional Commit format in commit messages
- [ ] Branch named correctly (`feature/JIRA-123-description`)
- [ ] No debug logs or temporary code committed

### Finding format

```
[BLOCKING] src/UseCases/Contact/Add/ContactAddService.cs:89
Missing authorization check. The service creates a contact without verifying
the caller has permission. Any authenticated user can create contacts for any tenant.
Fix: Add ownership/tenant check before persisting.

[SUGGESTION] src/UseCases/Contact/Add/ContactAddService.cs:102
Consider extracting the mapping logic to an extension method to keep the
service focused on orchestration.
```

**Rules:**
- Only mark **BLOCKING** for genuine blockers (bugs, security issues, broken tests)
- Use **SUGGESTION** for style preferences — never block the MR for these
- Always explain *why* something is a problem, not just *that* it is
- If unsure whether something is a false positive, flag as `NEEDS REVIEW` with context

---

## Step 4 — Post review as MR comment

Post the full review as a comment on the MR via GitLab MCP.

**How to post (in order of preference):**
1. Use `glab mr note <MR_IID> --message "..."` if `glab` CLI is available
2. Use GitLab REST API via curl if `GITLAB_TOKEN` is set:
   `curl -s -X POST "<GITLAB_URL>/api/v4/projects/<PROJECT_ID>/merge_requests/<MR_IID>/notes" -H "PRIVATE-TOKEN: $GITLAB_TOKEN" --data-urlencode "body=..."`
3. If neither available: output the full review in the response and note the limitation — do NOT skip the review content

The MR comment **must** include:
- Overall verdict: ✅ Approved / 🔴 Changes requested
- All BLOCKING findings with file path, line reference, explanation, and required resolution
- All SUGGESTION findings with explanation
- Full checklist with ✅/❌ per item

---

## Step 5 — Add Jira comment

Add a comment to the Jira ticket with:
- Link to the MR
- Overall verdict (Approved / Changes requested)
- Count of BLOCKING issues and SUGGESTION items
- Start time, end time, total duration

---

## Step 6 — Add Jira tag

Ensure the ticket has the tag `ai-mr-reviewed`.
Do not remove or modify existing tags — append only.
