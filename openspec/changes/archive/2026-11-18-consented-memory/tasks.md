## 1. Consent and storage (TDD)

- [x] 1.1 Add failing tests for default-off consent and memory CRUD.
- [x] 1.2 Store consent and source-linked memories in PostgreSQL.
- [x] 1.3 Enforce view/edit/delete and full deletion on revocation.
- [x] 1.4 Verify source conversation deletion cascades to its memories.

## 2. Context and controls

- [x] 2.1 Gate extraction and ranker/teller context on active consent.
- [x] 2.2 Add local fact extraction with best-effort failure behavior.
- [x] 2.3 Add consent, memory view/edit/delete, and revoke API and UI controls.
- [x] 2.4 Run local end-to-end memory smoke after PostgreSQL and Ollama are available. (Verified 2026-11-18 by the owner: opt-in and revoke in the UI persist across reload, and memories are empty after revoke. Live fact extraction was not exercised; it is covered by automated tests.)
