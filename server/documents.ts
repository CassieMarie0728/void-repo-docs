import { DocumentType } from '../src/types.ts';

interface Profile { audience: string; purpose: string; depth: string; legal?: boolean; machine?: boolean }
const plain = 'Plain language; explain necessary terms and give actionable steps. Omit internal implementation detail unless needed to use the product.';
const technical = 'Precise technical detail for the stated task: verified files, commands, contracts, expected results and failure recovery. Avoid unrelated internals.';
const legal = 'Accessible but precise rights, obligations, exceptions and disclosures. Use placeholders for missing decisions; never invent legal or operational commitments.';
const p = (audience: string, purpose: string, depth = technical): Profile => ({ audience, purpose, depth });
const l = (audience: string, purpose: string): Profile => ({ audience, purpose, depth: legal, legal: true });
const m = (audience: string, purpose: string): Profile => ({ audience, purpose, depth: 'Use the requested native syntax. Accuracy and machine readability outrank tone; omit jokes, Markdown wrappers and narrative footers.', machine: true });

export const DOCUMENT_PROFILES: Record<DocumentType, Profile> = {
  [DocumentType.Readme]: p('A newcomer deciding whether and how to use this project; assume no knowledge of its internals', 'Explain the problem, intended users, supported benefits, primary user workflow and shortest verified getting-started path. Brief stack summary only; leave exhaustive APIs, schemas and deployment details to dedicated docs. Adapt baseline knowledge to the product: a developer library may assume programming, a consumer app may not.', plain),
  [DocumentType.PrivacyPolicy]: l('Users deciding what happens to their personal information', 'Explain actual collection, purposes, sharing, retention, rights and contact paths.'),
  [DocumentType.TermsOfService]: l('People deciding whether to use the service', 'Explain use conditions, responsibilities, restrictions, termination and dispute terms.'),
  [DocumentType.ApiAgreement]: l('API customers and their technical/legal reviewers', 'Explain access rights, acceptable use, data responsibilities and contractual limits; distinguish terms from API reference.'),
  [DocumentType.SecurityPolicy]: p('Security researchers and users reporting vulnerabilities', 'Explain supported versions, reporting channels, information to include and supplied response expectations; do not publish exploit-enabling secrets.', plain),
  [DocumentType.CodeOfConduct]: p('Community participants and moderators', 'Explain expected conduct, unacceptable behavior, reporting and documented enforcement processes.', plain),
  [DocumentType.ContributingGuidelines]: p('Developers making their first contribution', 'Walk through local setup, change conventions, relevant tests and the supplied review workflow.'),
  [DocumentType.AcceptableUsePolicy]: l('Service users and policy enforcers', 'Explain permitted and prohibited use, enforcement and reporting.'),
  [DocumentType.License]: l('Users and redistributors checking permission to use the code', 'Use the supplied license choice and required notice accurately. Do not rewrite standard license clauses for comedy or infer a license from public visibility.'),
  [DocumentType.Eula]: l('People installing or using the application', 'Explain license grant, restrictions, termination, warranties and supplied platform-specific terms.'),
  [DocumentType.Dpa]: l('Controllers, processors and procurement/privacy reviewers', 'Specify processing roles, instructions, categories, subprocessors, security, deletion and transfers using supplied facts or placeholders.'),
  [DocumentType.Nda]: l('Parties exchanging confidential information', 'Define parties, confidential material, exclusions, permitted use, duration and remedies with missing choices explicit.'),
  [DocumentType.Sla]: l('Customers and service operators evaluating commitments', 'State only supplied service targets, measurement methods, exclusions, support and remedies; never invent uptime promises.'),
  [DocumentType.CookiePolicy]: l('Users choosing whether to accept cookies', 'Explain actual cookies, purposes, duration and consent controls; dependencies do not establish tracking.'),
  [DocumentType.Disclaimer]: l('Users understanding the limits of the product', 'Explain applicable limitations and responsibilities without unsupported blanket protections.'),
  [DocumentType.Acknowledgments]: p('Readers learning who or what the project credits', 'Credit only supplied people, projects and resources; do not invent sponsors or affiliations.', plain),
  [DocumentType.AiTxt]: m('Automated agents and maintainers configuring AI access', 'Use the explicitly supplied ai.txt convention; if unspecified, identify the missing convention rather than inventing a standard.'),
  [DocumentType.ApiDocumentation]: p('Developers integrating with the API', 'Document verified authentication, routes/procedures, inputs, outputs, errors and runnable examples. Do not derive endpoints from function names alone.'),
  [DocumentType.Architecture]: p('Maintainers evaluating or changing the system', 'Explain component responsibilities, boundaries, data flow, storage and observed tradeoffs; distinguish observed design from proposals.'),
  [DocumentType.Contributors]: p('Readers checking authorship and contribution credits', 'List only supplied identities and roles; omit unknown contact details.', plain),
  [DocumentType.Benchmarks]: p('Engineers evaluating measured performance', 'Report supplied methodology, environment, measurements and limits. Without measurements provide a labeled measurement plan, not fabricated results.'),
  [DocumentType.BiasAndFairness]: p('Affected users, evaluators and model reviewers', 'Explain relevant populations, supplied fairness evidence, limitations and mitigations; no invented evaluations.', plain),
  [DocumentType.Changelog]: p('Users and maintainers deciding what changed', 'Summarize supplied releases, user impact, breaking changes and migration notes. Do not invent release history.', plain),
  [DocumentType.CiCdDocumentation]: p('Developers maintaining automation', 'Explain loaded workflows, triggers, jobs, permissions, artifacts and failure recovery; no assumed required checks.'),
  [DocumentType.Citations]: m('Researchers and citation tooling', 'Produce valid Citation File Format YAML using supplied bibliographic facts; no invented authors, DOI or publication metadata.'),
  [DocumentType.CodeNav]: m('Code navigation tooling and maintainers', 'Use the requested JSON schema and verified paths; do not invent a codenav standard or file inventory.'),
  [DocumentType.Codeowners]: m('GitHub ownership tooling and maintainers', 'Use CODEOWNERS path/owner syntax with supplied owners only; no guessed GitHub identities.'),
  [DocumentType.Configuration]: p('Operators configuring the application', 'Explain verified settings, defaults, required/optional status, secret handling and configuration precedence.'),
  [DocumentType.Conventions]: p('Contributors trying to make consistent changes', 'Describe observed naming, formatting and structural conventions; label recommendations rather than inventing enforced rules.'),
  [DocumentType.DatasetCard]: p('Dataset users and evaluators', 'Explain supplied provenance, composition, collection, intended uses, consent and limitations; no invented dataset statistics.'),
  [DocumentType.Deployment]: p('Developers/operators putting the software online', 'Explain verified hosting requirements, secrets, build/release sequence, migrations, health checks and rollback where supported.'),
  [DocumentType.Development]: p('Developers changing the project', 'Explain local setup, code organization, implementation workflow, checks and debugging.'),
  [DocumentType.EthicsPolicy]: p('Users, contributors and decision makers', 'Explain supplied principles, responsibilities and escalation; distinguish policy proposals from established practices.', plain),
  [DocumentType.Evaluation]: p('Engineers and reviewers assessing system/model behavior', 'Explain supplied evaluation methods, datasets, criteria and results; label unexecuted plans clearly.'),
  [DocumentType.Examples]: p('Users learning by adapting examples', 'Provide a few focused examples with prerequisites, expected results and explanation; illustrative code must be labeled and compatible with evidence.'),
  [DocumentType.Faq]: p('New and existing users with practical questions', 'Answer common product/use questions plainly without adding speculative capabilities or repeated audit narration.', plain),
  [DocumentType.Funding]: m('Funding tooling and potential supporters', 'Produce GitHub FUNDING.yml using only supplied supported platform handles or custom funding links.'),
  [DocumentType.GettingStarted]: p('First-time users seeking their first successful result', 'Give the shortest supported path from prerequisites to a useful result, with expected feedback.', plain),
  [DocumentType.Glossary]: p('Readers unfamiliar with the project vocabulary', 'Define relevant terms in ordinary language with brief contextual examples.', plain),
  [DocumentType.Governance]: p('Community members understanding project decisions', 'Explain supplied roles, decision processes and escalation; do not invent maintainers, voting rules or authority.', plain),
  [DocumentType.Inference]: p('Engineers running a model or inference service', 'Explain supported models, inputs/outputs, runtime configuration and measured limits where supplied.'),
  [DocumentType.Install]: p('Someone installing the product', 'Explain verified prerequisites, required versus optional configuration, ordered installation and success checks.', plain),
  [DocumentType.LlmsTxt]: p('LLM consumers and maintainers providing documentation discovery', 'Use the requested llms.txt structure: concise project description and real documentation links. No invented pages or marketing filler.', plain),
  [DocumentType.ModelCard]: p('Model users and evaluators', 'Explain supplied model identity, intended uses, evaluation evidence, limitations and risks; do not invent training or performance facts.'),
  [DocumentType.PromptEngineering]: p('Developers modifying prompts', 'Explain actual prompt locations, inputs, constraints, examples and evaluation workflow.'),
  [DocumentType.ReleaseProcess]: p('Maintainers shipping a release', 'Explain verified versioning, checks, packaging, publication and recovery steps; do not invent release authority.'),
  [DocumentType.Roadmap]: p('Users and contributors understanding future direction', 'Include supplied plans only, distinguish proposals from commitments and avoid invented timelines.', plain),
  [DocumentType.Support]: p('Users seeking help', 'Explain supplied support channels, helpful diagnostic details and realistic expectations; no invented contact or response promises.', plain),
  [DocumentType.Testing]: p('Developers writing or running checks', 'Explain verified test suites, commands, fixtures and interpretation; distinguish test existence from passing results.'),
  [DocumentType.Training]: p('Engineers reproducing model training', 'Explain supplied data, preprocessing, configuration, resources and checkpoints; no invented training runs or metrics.'),
  [DocumentType.Troubleshooting]: p('Users recovering from a specific problem', 'Organize by symptom, likely cause, safe diagnostic steps and recovery. Do not prescribe deleting lockfiles or data as a casual first step.', plain),
  [DocumentType.Tutorials]: p('Learners completing a concrete task', 'Provide ordered steps, necessary concepts, expected results and recovery; assume little knowledge of implementation.', plain),
  [DocumentType.TypesSchema]: m('Compilers/schema tooling and integrating developers', 'Return the requested TypeScript declarations OR GraphQL schema, consistent with loaded contracts. Do not mix formats or invent fields.'),
  [DocumentType.Upgrading]: p('Existing users migrating between supplied versions', 'Explain documented breaking changes, prerequisites, backup/migration steps and recovery. Do not invent version differences.'),
};

export function documentInstructions(type?: DocumentType): string {
  if (!type) return 'DOCUMENT AUDIENCE: Preserve the existing document purpose and intended reader. Adapt depth to the task; do not turn general documentation into a technical inventory.';
  const profile: Profile = DOCUMENT_PROFILES[type];
  return `DOCUMENT AUDIENCE AND PURPOSE (${type}):\nReader: ${profile.audience}.\nPurpose: ${profile.purpose}\nDepth: ${profile.depth}\nTone changes delivery, not audience, scope or facts. A long document adds useful task detail, not unrelated technical sections. Source availability limits claims; an uninspected file is not an absent file. State a blocking unknown once, otherwise omit unsupported detail. Do not publish an evidence audit or repeat private-package/licensing lectures.\n${profile.legal ? 'Finish with the required legal-template review disclaimer.' : 'Do not add generic legal/contact placeholders or attorney-review footers to ordinary technical documentation.'}`;
}
