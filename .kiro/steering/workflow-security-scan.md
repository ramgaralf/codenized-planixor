# Workflow: Security Scan

Trigger: user asks to "security scan" or "review security" on a file, folder, or MR.

Apply OWASP Top 10 principles. Be thorough but avoid false positives — always explain *why* something is a risk.

---

## Step 1 — Scan for hardcoded secrets

- Search for patterns: `password = "..."`, `token = "..."`, `apiKey = "..."`, connection strings with credentials
- Check configuration files (`appsettings.json`, `.env`, `config.py`, etc.)
- Verify `.gitignore` excludes all secret-containing files
- Report any found with file path and line number

---

## Step 2 — Check for injection vulnerabilities

- **SQL injection**: raw SQL with string concatenation (`$"SELECT * FROM users WHERE id = {id}"`)
- **Command injection**: `Process.Start` or shell commands with unsanitized user input
- **Path traversal**: file operations with user-supplied paths without normalization
- **Log injection**: logging user input directly without sanitization

---

## Step 3 — Review authentication and authorization

- Every endpoint that modifies state must require authentication
- Every endpoint returning user data must verify the caller owns the resource (authorization, not just authentication)
- No routes accessible without authentication that should be protected
- Check for insecure direct object references (IDOR): e.g. `GET /documents/{id}` without ownership check

---

## Step 4 — Check dependency security (if package files are in scope)

```bash
# .NET
dotnet list package --vulnerable

# Node.js
npm audit --audit-level=high
```

---

## Step 5 — Review error handling

- No stack traces or internal details in HTTP responses (they leak implementation details)
- No sensitive data (tokens, passwords, PII) in logs
- No empty catch blocks that silently swallow errors

---

## Step 6 — Check for insecure deserialization

- No use of `BinaryFormatter` (.NET) on untrusted input
- JSON deserialization should use strict type binding, not open polymorphism

---

## Finding format

```
[CRITICAL] src/Api/Endpoints/AuthEndpoint.cs:42
Hardcoded JWT secret: secret = "mysecretkey123"
Fix: Move to environment variable / Key Vault.

[HIGH] src/UseCases/Documents/GetDocumentService.cs:67
Missing authorization check: service returns document by ID without
verifying the caller owns the document.
Fix: Add ownership check before returning the document.
```

## Severity levels

| Severity | Definition |
|---|---|
| **CRITICAL** | Hardcoded secrets, SQL injection, unauthenticated access to sensitive data |
| **HIGH** | Missing authorization checks, IDOR, command injection |
| **MEDIUM** | Information leakage, weak cryptography, insecure defaults |
| **LOW** | Minor issues that could become problems in combination with others |

## Rules

- Never suggest fixes that introduce new vulnerabilities
- Always explain the attack vector, not just that something "might be a problem"
- If you cannot determine whether something is a false positive without more context, flag as `NEEDS REVIEW` and explain what needs to be checked
- Do not report style issues as security issues
