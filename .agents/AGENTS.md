
## Clean Code Principles

All code written for this project must strictly adhere to the following principles:
- **KISS** (Keep It Simple, Stupid): Avoid unnecessary complexity.
- **DRY** (Don't Repeat Yourself): Reuse code and abstract logic where appropriate.
- **YAGNI** (You Aren't Gonna Need It): Do not implement features or abstract components until they are actually needed.
- **SOLID**: Follow Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion principles.
- **Boy Scout Rule**: Always leave the code better than you found it (clean up technical debt and refactor when touching existing code).

## Security Principles (OWASP Top 10)

All backend and frontend code must be written with the OWASP Top 10 vulnerabilities in mind to ensure maximum security:
1. **Broken Access Control**: Ensure all endpoints are protected with proper authorization (JWT, Admin Keys). Validate ownership of data.
2. **Cryptographic Failures**: Never store sensitive data in plaintext. Always use HTTPS. Do not persist sensitive temporary data (like user voice recordings) to storage.
3. **Injection**: Prevent SQL Injection (use EF Core/parameterized queries), XSS (sanitize user inputs and LLM outputs), and Prompt Injection (harden LLM system prompts).
4. **Insecure Design**: Apply "Secure by Default" and "Data Minimization" principles.
5. **Security Misconfiguration**: Enforce rate limiting, strict CORS policies, and file upload restrictions (size limits).
6. **Vulnerable and Outdated Components**: Keep dependencies updated.
7. **Identification and Authentication Failures**: Protect against brute-force attacks and ensure secure session management.
8. **Software and Data Integrity Failures**: Verify integrity of external data (e.g., check Magic Bytes for file uploads instead of trusting extensions).
9. **Security Logging and Monitoring Failures**: Log security-critical events (failed logins, blocked uploads) without logging sensitive PII.
10. **Server-Side Request Forgery (SSRF)**: Validate and restrict all server-side outgoing requests to trusted domains.
