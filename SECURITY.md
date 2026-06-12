# Security Policy

## Supported Versions

This project is currently maintained from the `main` branch.

| Version | Supported |
| --- | --- |
| `main` | ✅ |
| Older snapshots/forks | ❌ |

## Reporting a Vulnerability

Please do **not** open a public issue for suspected secrets, credential leaks, dependency exploits, or security-sensitive bugs.

Report privately by contacting the repository owner directly through GitHub, or by opening a private security advisory if available for this repository.

Include as much detail as possible:

- What you found
- Where you found it
- How it could be reproduced
- Whether credentials, tokens, user data, or deployment settings may be involved

## Handling Expectations

Security reports are reviewed as soon as practical. Confirmed issues may result in dependency updates, credential rotation, patches, or temporary feature lockdowns.

## Scope

In scope:

- Dependency vulnerabilities
- Token or secret exposure
- Unsafe automation/workflow behavior
- Unauthorized repository access paths
- Injection, execution, or data exposure bugs

Out of scope:

- Social engineering
- Spam or nuisance reports
- Theoretical vulnerabilities without a realistic exploit path
- Reports against forks not controlled by the maintainer
