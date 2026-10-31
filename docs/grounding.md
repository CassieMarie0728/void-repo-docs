# Keep the snark. Verify the facts.

VOID grounds repository documents in a bounded GitHub evidence snapshot. It does not infer an
active database, OAuth provider, or runtime from the presence of an installed dependency.

## Evidence collection

The backend resolves the default branch to a commit, reads that commit's file inventory, and
fetches up to 12 relevant text blobs from the same snapshot. Priority goes to package scripts,
README/license, deployment configuration, database dialect/schema, runtime entry point, auth,
and representative routing files. It does not clone or execute the target project.

Individual excerpts are bounded, with a 36,000-character total source budget. Truncation,
unreadable files, and partial inventories are marked explicitly. Only environment *examples*
are considered, and assignment values are redacted; real `.env` and private-key files are not
selected. Snapshots are cached in process for five minutes, with at most 20 cached repositories.
Configure `GITHUB_TOKEN` for higher GitHub rate limits or authorized private-repository access.

The generated document's provenance comment records the snapshot commit and evidence paths.
This is a source inventory, not a claim that every sentence has been independently verified.

## Writing rules and validation

Generation and refinement prioritize factual accuracy over tone and length. Prompts prohibit
invented measurements, commands, APIs, schemas, auth providers, required services, and unsupported
claims about security, compliance or production readiness. Unknowns must be omitted or marked
unverified. Jokes can use obvious metaphor, but cannot fabricate factual project measurements.

Runtime checks catch two narrow, verifiable error classes:

- Referenced package scripts that do not exist in the loaded `package.json`.
- Drizzle schema examples incompatible with an explicit dialect in loaded Drizzle config.

A detected contradiction triggers one correction request on the same provider route. This uses
one additional model request per affected draft. If it remains inconsistent, the endpoint returns
422 rather than saving the draft. A normal draft uses one request; there is no unbounded repair
loop and no new paid-provider fallback.

Refinement requests can include `repoUrl` to reload the source snapshot. The UI sends the original
result's repository URL. Without a repository, refinement has only the existing draft and explicit
user instructions; those draft claims are not treated as independently verified facts.

## Limits

These controls reduce hallucinations; they are not a comprehensive fact-checker. Uninspected
code, ambiguous configurations, and model mistakes remain possible. In particular, the runtime
checks do not validate every API field, numeric claim, or deployment instruction. Review generated
documentation against the source before publishing. Legal drafts still require appropriate review.
