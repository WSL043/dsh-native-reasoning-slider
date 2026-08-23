# Security

Please report vulnerabilities privately through GitHub Security Advisories.
Do not include credentials, account identifiers, or private session content in
an issue.

The plugin stores only its visual mode and color preferences in browser local
storage. Per-model entries contain provider/model identifiers already exposed
by DSH, never credentials. It does not make its own network requests.
