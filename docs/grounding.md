# Keep the snark. Verify the facts.

VOID grounds repository documents in a bounded GitHub evidence snapshot. It does not infer an
active database, OAuth provider, or runtime from the presence of an installed dependency.

## Evidence collection

The backend resolves the default branch to a commit, reads that commit's file inventory, and
fetches up to 12 relevant text blobs from the same snapshot. Selection includes package scripts,
common React/application roots and up to two representative feature files, deployment configuration,
database dialect/schema, runtime entry point, auth, and routing. Documentation and remaining config
fill available slots. This is heuristic sampling, not complete import-graph analysis. It does not
clone or execute the target project.

Individual excerpts are bounded, with a 36,000-character total source budget. Truncation,
unreadable files, and partial inventories are marked explicitly. Only environment *examples*
are considered, and assignment values are redacted; real `.env` and private-key files are not
selected. Snapshots are cached in process for five minutes, with at most 20 cached repositories.
Configure `GITHUB_TOKEN` for higher GitHub rate limits or authorized private-repository access.
The allocator reserves space for later readable files so large manifests or UI files cannot
consume the whole budget before runtime evidence is included. Uninspected files are unknown,
not evidence that those files or features do not exist.

The generated document's provenance comment records the snapshot commit and evidence paths.
This is a source inventory, not a claim that every sentence has been independently verified.

## Writing rules and validation

Generation and refinement prioritize factual accuracy over tone and length. Prompts prohibit
invented measurements, commands, APIs, schemas, auth providers, required services, and unsupported
claims about security, compliance or production readiness. Unknowns must be omitted or marked
unverified. Jokes can use obvious metaphor, but cannot fabricate factual project measurements.

Writing rules also prohibit publishing the model's instruction-following commentary. Useful
source citations and specific evidence limitations belong in the document; repeated claims such
as "all claims grounded" and "no invented endpoints" do not. README guidance favors actionable
setup and concise architecture over package inventories. Cross-section consistency and precise
security claims are prompt requirements, not a complete automated semantic audit.

Runtime checks catch these narrow error classes:

- Explicit npm/pnpm script invocations and namespaced script aliases that do not exist in the
  loaded `package.json`. Ambiguous built-ins, dependency binaries and file execution are not rejected.
- Drizzle schema examples incompatible with an explicit dialect in loaded Drizzle config.
- Recognizable self-certification phrases in prose. Code fences, inline code and HTML provenance
  comments are excluded; ordinary citations and specific limitations remain allowed. This is
  phrase detection, not a guarantee that every form of model commentary will be caught.

A detected issue triggers one correction request on the same provider route. This uses
one additional model request per affected draft. If it remains inconsistent, the endpoint returns
422 rather than saving the draft. A normal draft uses one request; there is no unbounded repair
loop and no new paid-provider fallback.

Refinement requests can include `repoUrl` to reload the source snapshot. Generation returns an
`evidenceRepoUrl` separately from the requested URL; it is empty when generation used manual
fallback. The UI persists this field and supplies only the evidence URL to refinement, keeping
manual-fallback drafts refinable when their optional repository is unavailable.
Without a repository, refinement has only the existing draft and explicit
user instructions; those draft claims are not treated as independently verified facts.

## Deadpool-cool voice

Generation and refinement share the editorial profile in `server/tone.ts`. It uses original
contrast examples to demonstrate conversational explanations, useful analogies and occasional
asides. Humor targets software friction while keeping the reader on the writer's side.
READMEs should explain capabilities and benefits, user workflow, and verified setup before
optional technical detail. The editor's **Sharpen the Snark** action follows the same direction.

Style examples are not repository evidence: their features, technologies, commands, ownership,
contact details and licenses must never transfer into another project's document. Factual and
legal constraints still outrank tone. This is prompt calibration, not a deterministic guarantee
of humor quality; compare generated outputs with the intended voice during review.

## Document readers and depth

`server/documents.ts` supplies an explicit audience, purpose and depth profile for every supported
document type. README targets a newcomer deciding whether and how to use the project; deployment,
development and architecture address their respective technical readers. Legal templates prioritize
clear rights, obligations and disclosures. Tone changes delivery, not the reader or document scope.
Long documents and alternate drafts must stay within that scope instead of adding unrelated internals.

Generation always applies the selected profile. Refinement accepts optional `docType`; the editor
sends the generated document's type, while older callers without it preserve the draft's existing
purpose. Ordinary technical documents omit generic attorney-review footers and legal placeholders.
Legal templates retain the review disclaimer. Machine-oriented document types prioritize native
syntax over humor and omit the HTML provenance prefix. These are writing instructions rather than
an automated semantic validator for every generated document or machine format.

## Limits

These controls reduce hallucinations; they are not a comprehensive fact-checker. Uninspected
code, ambiguous configurations, and model mistakes remain possible. In particular, the runtime
checks do not validate every API field, numeric claim, or deployment instruction. Review generated
documentation against the source before publishing. Legal drafts still require appropriate review.
