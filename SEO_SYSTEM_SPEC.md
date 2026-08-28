# SEO SYSTEM SPEC

Version: 1.0  
Status: Source of Truth  
Purpose: Define the architecture, rules, safety constraints, workflows, decision logic, and implementation boundaries of the SEO Operating System.

---

# 1. PURPOSE

This repository and its connected services form a centralized SEO Operating System designed to manage a portfolio of websites at scale.

The system must not behave like a generic content generator.

Its purpose is to:

1. Observe sites continuously.
2. Collect reliable SEO data.
3. Detect meaningful opportunities and problems.
4. Choose the best next SEO action.
5. Prepare that action safely.
6. Execute it through the existing development workflow.
7. Measure the result.
8. Learn from historical outcomes.
9. Reprioritize future actions.

Core loop:

```text
OBSERVE
→ ANALYZE
→ DIAGNOSE
→ PRIORITIZE
→ DECIDE
→ PREPARE
→ VALIDATE
→ EXECUTE
→ MEASURE
→ LEARN
→ REPRIORITIZE
```

The system must optimize for impact, not activity.

Doing nothing is a valid outcome.

---

# 2. SOURCE OF TRUTH

Supabase is the central operational memory of the SEO system.

Git is the source of truth for website code.

Vercel is the deployment and preview environment.

Google Search Console is the primary first-party SEO performance source.

DataForSEO is an enrichment and validation layer.

Claude Code and Codex are development and execution assistants, not independent sources of truth.

No agent may silently create a second parallel SEO system when the existing infrastructure can be extended.

---

# 3. NON-NEGOTIABLE PRINCIPLES

These rules must be respected by every agent and every automation.

## 3.1 One primary intent = one primary URL

Never use:

```text
1 keyword = 1 page
```

Use:

```text
1 primary search intent = 1 primary URL
```

Several keywords may belong to the same page.

Before creating a page, always check whether:

- an existing page already covers the intent;
- an existing page can be improved;
- two existing pages should be merged;
- a new URL would create cannibalization;
- the intent is truly distinct.

---

## 3.2 NO_ACTION is a valid decision

The system must not invent work.

If no action has sufficient expected value, return:

```text
NO_ACTION
```

A page that is healthy and progressing should not be modified simply because an AI can propose changes.

---

## 3.3 Content is not always the answer

Before recommending new content, evaluate:

1. technical health;
2. indexation;
3. intent alignment;
4. cannibalization;
5. internal linking;
6. on-page quality;
7. authority / backlinks;
8. local SEO factors when applicable;
9. business value;
10. only then new content.

---

## 3.4 Never invent data

Never fabricate:

- clicks;
- impressions;
- CTR;
- positions;
- search volume;
- keyword difficulty;
- backlinks;
- referring domains;
- SERP observations;
- conversions;
- revenue;
- indexation status.

If unavailable:

```text
DATA_NOT_AVAILABLE
```

GSC impressions are not search volume.

DataForSEO search volume is not GSC demand.

Estimated metrics must always be labeled as estimates.

---

## 3.5 History must never be overwritten

The system must preserve time-series history.

Examples:

```text
Week 1 position = 14
Week 2 position = 9
Week 3 position = 5
```

All three measurements must remain available.

Current state and historical state must be distinct concepts.

---

## 3.6 Extend before rebuilding

Before creating a table, queue, service, route, model, script, or workflow:

1. inspect the existing implementation;
2. identify overlaps;
3. reuse existing components when possible;
4. extend minimally;
5. document why new infrastructure is required.

No destructive migration without explicit approval.

---

# 4. SITE MODES

Every site must have an explicit site mode.

Supported modes:

```text
THEMATIC
LOCAL
PRODUCT
```

A future extension may add more modes, but only through an approved change.

---

## 4.1 THEMATIC

Use for editorial or thematic sites with a meaningful keyword universe.

Primary levers:

- content clusters;
- pillar pages;
- support pages;
- comparisons;
- informational pages;
- commercial support pages;
- internal linking;
- GSC opportunities;
- SERP analysis;
- DataForSEO enrichment;
- content optimization.

Publishing capacity:

```text
up to 2 new pages per week
```

This is a maximum target, not an obligation.

If only one page is justified, publish one.

If no new page is justified, use the available capacity on higher-value actions.

---

## 4.2 LOCAL

Use for local businesses and service-area sites.

Content must not automatically dominate the roadmap.

Primary levers include:

- indexation;
- service-page optimization;
- local landing pages only when justified;
- Google Business Profile;
- local citations;
- local backlinks;
- internal linking;
- reviews / trust signals where available;
- local schema;
- authority;
- technical SEO;
- cannibalization;
- location intent;
- conversion-oriented pages.

Never mass-generate:

```text
service + city + variant
```

unless SERP behavior and distinct user intent justify a dedicated URL.

The correct output for a local site may be:

```text
NO_NEW_CONTENT
```

---

## 4.3 PRODUCT

Use for sites where the core SEO surface is inventory, listings, products, categories, or programmatic product data.

Primary levers:

- product pages;
- category pages;
- taxonomy;
- inventory lifecycle;
- indexation;
- schema;
- structured data;
- duplicates;
- faceted navigation;
- internal linking;
- category hierarchy;
- product availability;
- canonical strategy;
- crawl control.

Editorial content is secondary unless it directly supports category, product, or business intent.

Do not force a thematic-blog model onto product sites.

---

# 5. CORE SEO ACTION TYPES

The global backlog is not an editorial backlog.

It is an SEO action backlog.

Supported action types:

```text
NO_ACTION
FIX_TECHNICAL
FIX_INDEXATION
OPTIMIZE_PAGE
UPDATE_CONTENT
INTERNAL_LINKING
CREATE_PAGE
MERGE
REDIRECT
FIX_CANNIBALIZATION
NETLINKING
GBP_OPTIMIZATION
LOCAL_CITATION
TECHNICAL_SEO
SERP_ANALYSIS
CLUSTER_BUILDING
LINK_RECLAMATION
```

Agents must not invent new action types without checking whether an existing type already fits.

---

# 6. RISK LEVELS

Every action must have a risk level.

## LOW_RISK

Can be automated after implementation has been validated.

Examples:

- GSC sync;
- crawl;
- measurements;
- index checks;
- DataForSEO cache refresh;
- brief generation;
- alerts;
- sitemap verification;
- anomaly detection.

Default:

```text
AUTO_ALLOWED = true
```

---

## MEDIUM_RISK

Requires quick validation during early versions.

Examples:

- title/meta changes;
- internal linking;
- minor structured-data changes;
- small content edits;
- minor heading changes.

Default:

```text
HUMAN_APPROVAL_REQUIRED = true
```

This may be relaxed later only after proven reliability.

---

## HIGH_RISK

Always requires explicit human approval unless policy is changed later.

Examples:

- new page publication;
- major rewrite;
- deletion;
- redirect;
- merge;
- architecture change;
- navigation change;
- paid backlink;
- large-scale local page creation;
- canonical changes with broad impact.

Default:

```text
HUMAN_APPROVAL_REQUIRED = true
```

---

# 7. DEVELOPMENT GATES

The project must not advance through high-impact stages without approval.

Required validation gates:

## Gate 1 — Audit

Validate:

- current architecture;
- Supabase schema;
- jobs;
- GSC integrations;
- DataForSEO integrations;
- publishing workflow;
- site modes.

---

## Gate 2 — Data model

Validate:

- proposed schema extensions;
- migrations;
- relationships;
- uniqueness constraints;
- retention strategy.

---

## Gate 3 — Decision Engine specification

Validate:

- action taxonomy;
- diagnosis order;
- scoring;
- confidence logic;
- business-value logic;
- site-mode differences.

---

## Gate 4 — THEMATIC pilot

One thematic site must complete the full loop successfully.

---

## Gate 5 — LOCAL pilot

One local site must validate local-specific decision logic.

---

## Gate 6 — PRODUCT pilot

One product site must validate product/catalog-specific logic.

---

## Gate 7 — Automation policy

Validate what may run automatically.

---

## Gate 8 — Scale to 10 sites

Review system quality, cost, errors, false positives, and human workload.

---

## Gate 9 — Scale to 25 sites

Repeat review.

---

## Gate 10 — Scale to 50 sites

Repeat review.

---

## Gate 11 — Scale to 100 sites

Only after reliability, queueing, monitoring, and cost controls are proven.

---

# 8. SYSTEM ARCHITECTURE

Target logical architecture:

```text
GSC ─────────────┐
Crawler ─────────┤
DataForSEO ──────┤
Backlinks ───────┤
Conversions ─────┤
                 ▼
              SUPABASE
           Central Memory
                 │
                 ▼
        OPPORTUNITY ENGINE
        ├─ GSC_DRIVEN
        ├─ DISCOVERY_DRIVEN
        └─ HYBRID
                 │
                 ▼
          DECISION ENGINE
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
    NO_ACTION  FIX     CREATE/LINK
                 │
                 ▼
           ACTION ENGINE
                 │
                 ▼
            CLAUDE CODE
                 │
                 ▼
              GIT
                 │
                 ▼
         VERCEL PREVIEW
                 │
            QA + DIFF
                 │
                 ▼
         HUMAN APPROVAL
                 │
                 ▼
         MERGE + VERCEL
                 │
                 ▼
         INDEXATION ENGINE
                 │
                 ▼
            MEASUREMENTS
                 │
                 ▼
              LEARNING
```

---

# 9. SUPABASE MODEL

The exact schema must adapt to the existing database.

Do not create these tables blindly.

Conceptually, the system must support entities equivalent to:

```text
sites
pages
gsc_positions
seo_actions
seo_measurements
clusters
cluster_pages
internal_links
dataforseo_cache
seo_jobs
```

Existing equivalents must be reused.

---

# 10. SEO_ACTION — CENTRAL OBJECT

Every meaningful recommendation must be represented as an action.

Conceptual fields:

```text
id
site_id
page_id
cluster_id

action_type
risk_level
status

source_gsc
source_crawl
source_serp
source_dataforseo
source_cluster
source_backlinks
source_business

problem
reason
evidence

seo_potential
business_value
effort
confidence
priority_score

baseline_reference

git_branch
git_commit
vercel_preview_url

created_at
approved_at
executed_at
completed_at
```

The system must be able to answer:

```text
Why was this action recommended?
What evidence supported it?
Who approved it?
What code changed?
What was deployed?
What happened afterward?
```

---

# 11. JOB ORCHESTRATION

Do not run large all-in-one scripts for the whole portfolio.

Use a queue / job system.

Supported conceptual job types:

```text
GSC_SYNC
CRAWL_LIGHT
CRAWL_DEEP
INDEX_CHECK
OPPORTUNITY_DISCOVERY
SERP_ANALYSIS
BACKLINK_ANALYSIS
DECISION_REFRESH
GENERATE_BRIEF
MODIFY_PAGE
CREATE_PAGE
DEPLOY_PREVIEW
QA_PREVIEW
MEASURE_ACTION
```

Statuses:

```text
PENDING
RUNNING
WAITING_APPROVAL
DONE
FAILED
RETRY
CANCELLED
```

Every job should track:

- site;
- related page/action;
- priority;
- retry count;
- dependencies;
- estimated cost where possible;
- last error;
- created time;
- scheduled time;
- completed time.

---

# 12. SITE PRIORITY TIERS

To scale to large portfolios, sites must not all receive the same workload.

## Tier A

Strategic / fast-growth / high-value sites.

High-frequency analysis.

## Tier B

Active sites.

Regular weekly analysis.

## Tier C

Stable sites.

Light analysis.

## Tier D

Dormant or low-priority sites.

Minimal monitoring.

A change in performance may promote or demote a site automatically, but only according to explicit scoring rules.

---

# 13. GSC LAYER

Google Search Console is the primary first-party SEO performance source.

Collect when available:

- query;
- page;
- clicks;
- impressions;
- CTR;
- average position;
- date;
- device where relevant;
- country where relevant.

Use GSC for:

- quick wins;
- CTR opportunities;
- emerging queries;
- page/query associations;
- losses;
- gains;
- cannibalization;
- trend analysis;
- post-action measurement.

GSC is not a complete market-discovery tool.

---

# 14. OPPORTUNITY DISCOVERY MODES

Every site operates in one of three opportunity modes.

---

## 14.1 GSC_DRIVEN

Use when enough meaningful GSC data exists.

Flow:

```text
GSC
→ opportunity
→ targeted DataForSEO
→ SERP
→ decision
```

Typical use cases:

- positions 4–20;
- high impressions / low CTR;
- emerging keywords;
- traffic loss;
- cannibalization;
- page gaps revealed by queries.

---

## 14.2 DISCOVERY_DRIVEN

Use for:

- new sites;
- new sections;
- very low-visibility sites;
- areas with insufficient GSC history.

Zero impressions does not mean zero opportunity.

Before discovery, check:

- site indexability;
- sitemap;
- robots;
- canonical;
- crawlability;
- internal linking;
- GSC configuration.

If the site is technically blocked:

```text
FIX_INDEXATION
```

If technically healthy:

```text
BUSINESS
→ existing architecture
→ services/products/themes
→ targeted DataForSEO
→ SERP
→ competitors
→ intents
→ clusters
→ opportunities
```

---

## 14.3 HYBRID

Expected normal state for mature sites.

Combine:

```text
GSC_OPPORTUNITIES
+
STRUCTURAL_OPPORTUNITIES
+
SERP_OPPORTUNITIES
+
BUSINESS_OPPORTUNITIES
+
TECHNICAL_OPPORTUNITIES
+
AUTHORITY_OPPORTUNITIES
```

---

# 15. OPPORTUNITY TYPES

Supported opportunity sources/types:

```text
GSC_OPPORTUNITY
STRUCTURAL_OPPORTUNITY
SERP_OPPORTUNITY
BUSINESS_OPPORTUNITY
TECHNICAL_OPPORTUNITY
AUTHORITY_OPPORTUNITY
```

An action may have multiple opportunity sources.

Example:

```text
CREATE_PAGE
source_gsc = false
source_serp = true
source_cluster = true
source_business = true
confidence = HIGH
```

---

# 16. CRAWLER

The crawler is primarily deterministic.

It must produce facts, not editorial opinions.

Per URL, capture when applicable:

```text
HTTP status
indexable
robots
meta robots
canonical
title
meta description
H1
H2/H3
structured data
sitemap presence
internal links in
internal links out
click depth
content fingerprint
redirect chain
```

Detect:

```text
ORPHAN
BROKEN_LINK
NOINDEX
CANONICAL_CONFLICT
DUPLICATE
REDIRECT_CHAIN
SITEMAP_MISMATCH
SOFT_404
THIN_OR_DUPLICATE_CONTENT
```

Use AI only where deterministic logic cannot reliably classify the issue.

---

# 17. INDEXATION ENGINE

Publication does not equal indexation.

State machine:

```text
DEPLOYED
→ HTTP_200
→ INDEXABLE
→ IN_SITEMAP
→ INTERNALLY_LINKED
→ DISCOVERED
→ CRAWLED
→ INDEXED
→ RECEIVING_IMPRESSIONS
```

Problem states:

```text
DISCOVERED_NOT_INDEXED
CRAWLED_NOT_INDEXED
BLOCKED
CANONICAL_CONFLICT
ORPHAN
SOFT_404
UNKNOWN
```

Do not blindly retry indexation submissions.

Diagnose the cause.

Example:

```text
CRAWLED_NOT_INDEXED
+
high content similarity
+
no distinct intent
→ MERGE
```

---

# 18. INTERNAL LINK GRAPH

Maintain a real site graph.

Conceptual relationship:

```text
source_page
target_page
anchor
context
link_type
cluster_relation
first_seen
last_seen
status
```

Supported relation types:

```text
PILLAR_TO_SUPPORT
SUPPORT_TO_PILLAR
SUPPORT_TO_SUPPORT
CONTENT_TO_COMMERCIAL
CROSS_CLUSTER
PRODUCT_TO_CATEGORY
CATEGORY_TO_PRODUCT
```

Use the graph to detect:

- orphan pages;
- weakly linked strategic pages;
- excessive depth;
- cluster isolation;
- poor pillar/support relationships;
- internal-link opportunities;
- possible cannibalization.

---

# 19. CLUSTERS AND INTENTS

Clustering must combine:

```text
semantic similarity
+
search intent
+
SERP overlap
+
existing site architecture
```

Do not rely only on embeddings or keyword similarity.

Page roles:

```text
PILLAR
SUPPORT
COMMERCIAL
COMPARISON
LOCAL
PRODUCT
CATEGORY
```

Cluster properties:

```text
coverage_score
business_value
gsc_visibility
missing_intents
existing_pages
planned_pages
```

Statuses:

```text
NON_DEMARRE
EN_CONSTRUCTION
PARTIEL
COMPLET
A_RENFORCER
A_RESTRUCTURER
```

---

# 20. DATAFORSEO POLICY

DataForSEO is a targeted enrichment layer.

Never use it as an uncontrolled keyword generator.

Do not run broad queries without a clear question.

Good questions:

```text
Do these queries share the same intent?
Which sub-intents are missing from this cluster?
What type of page dominates this SERP?
Why do competitors outrank this page?
Do competing pages have materially stronger backlink profiles?
```

Bad query pattern:

```text
Give me every keyword about X.
```

Use a funnel:

```text
precise seed
→ close variants
→ SERP analysis
→ intent classification
→ decision
```

Cache useful results in Supabase.

Check cache freshness before new paid calls.

---

# 21. KEYWORD CLASSIFICATION

Useful DataForSEO keywords should be classified as:

```text
SAME_INTENT
SECONDARY_KEYWORD
NEW_INTENT
NEW_CLUSTER
QUESTION
COMMERCIAL
LOCAL
IRRELEVANT
```

Rules:

- SAME_INTENT → existing/planned URL;
- SECONDARY_KEYWORD → enrich the brief;
- NEW_INTENT → may justify a page;
- NEW_CLUSTER → future cluster;
- QUESTION → section/FAQ unless intent justifies a page;
- IRRELEVANT → discard.

---

# 22. SERP VALIDATION

Lexical similarity does not equal search-intent similarity.

Use SERP overlap to validate intent.

Compare:

- ranking URLs;
- domains;
- page types;
- dominant intent;
- shared results;
- SERP features;
- local pack where relevant;
- product/category result patterns where relevant.

A new URL must not be created solely because a keyword string is different.

---

# 23. NETLINKING ENGINE

Backlinks are not automatically the solution to poor rankings.

Before recommending netlinking, verify:

```text
TECHNICAL = OK
INDEXATION = OK
INTENT = OK
CANNIBALIZATION = OK
CONTENT = SUFFICIENT
INTERNAL_LINKING = SUFFICIENT
```

Then analyze:

- referring domains to target URL;
- referring domains to competing URLs;
- relative authority;
- backlink gap;
- anchor profile;
- link losses;
- business value;
- current ranking trend.

Compute:

```text
LINK_NEED_SCORE
```

Possible outputs:

```text
NO_LINK_NEEDED
BACKLINK_PAGE
BACKLINK_CLUSTER
BACKLINK_DOMAIN
LOCAL_CITATION
LINK_RECLAMATION
```

Paid link acquisition remains HIGH_RISK.

---

# 24. DECISION ENGINE

The Decision Engine is the core intelligence layer.

Inputs may include:

```text
site_mode
GSC
crawler
indexation
cluster
internal links
DataForSEO
SERP
backlinks
business value
historical actions
conversions
```

Diagnosis order:

```text
1. TECHNICAL
2. INDEXATION
3. INTENT / CANNIBALIZATION
4. INTERNAL LINKING
5. ON-PAGE / CONTENT
6. AUTHORITY / LINKS
7. NEW CONTENT
8. NO_ACTION
```

CREATE_PAGE deliberately comes late.

---

# 25. DECISION OUTPUT CONTRACT

Every decision must be structured.

Example:

```json
{
  "action": "INTERNAL_LINKING",
  "priority": 87,
  "confidence": 0.92,
  "risk_level": "MEDIUM",
  "reason": "The page is indexable and intent-aligned but receives weak internal support.",
  "evidence": [
    "Position stable around 11",
    "No technical blocker",
    "Only one internal link from low-depth pages"
  ],
  "expected_impact": "Improve crawl reinforcement and page authority before external link acquisition."
}
```

No action recommendation without evidence.

---

# 26. PRIORITY LOGIC

Priority must not be based on search volume alone.

Conceptual philosophy:

```text
priority
≈
SEO opportunity
× business value
× confidence
÷ effort
```

Additional modifiers may include:

- urgency;
- seasonality;
- strategic importance;
- current traffic;
- indexation severity;
- conversion potential;
- cost;
- action reversibility.

The exact formula may evolve.

All components must be stored so the score is explainable.

---

# 27. BUSINESS VALUE

SEO does not exist independently of business value.

The system should support:

```text
BUSINESS_VALUE_SCORE
```

Signals may include:

- lead value;
- service margin;
- product value;
- conversion rate;
- funnel stage;
- strategic priority;
- monetization potential.

A 300-impression commercial opportunity may outrank a 30,000-impression informational opportunity.

---

# 28. PAGE CREATION DECISION

Before content generation, return one of:

```text
GENERATE
OPTIMIZE_EXISTING
REJECT
```

## GENERATE

Distinct intent and justified new URL.

## OPTIMIZE_EXISTING

Existing URL already covers the intent.

## REJECT

New page would be redundant, low-value, or cannibalizing.

---

# 29. PAGE GENERATORS

Use separate logical page generators.

```text
THEMATIC_PAGE_GENERATOR
LOCAL_PAGE_GENERATOR
PRODUCT_PAGE_GENERATOR
```

They may share infrastructure but not editorial rules.

---

# 30. THEMATIC PAGE GENERATOR

Possible outputs:

- pillar;
- support;
- guide;
- comparison;
- commercial support;
- question-driven content.

The brief must contain:

- primary intent;
- main query;
- secondary queries;
- cluster;
- role;
- objective;
- URL;
- title;
- meta;
- H1;
- H2/H3;
- mandatory topics;
- internal links in;
- internal links out;
- CTA where relevant;
- cannibalization notes.

Length is determined by intent, not by a fixed word target.

---

# 31. LOCAL PAGE GENERATOR

Must use real business facts only.

A local page should be based on:

- real service;
- real location/service area;
- verifiable business details;
- relevant local proof;
- useful FAQ;
- conversion CTA;
- consistent NAP when appropriate;
- local intent.

Never fabricate:

- locations;
- testimonials;
- certifications;
- prices;
- business claims;
- service availability.

The generator must be able to return:

```text
REJECT
```

if the page is not justified.

---

# 32. PRODUCT PAGE GENERATOR

Product content must be grounded in real product/inventory data.

Possible outputs:

- product title;
- structured description;
- specifications;
- category associations;
- schema;
- related products/categories;
- FAQ based on available facts.

Never invent product attributes.

Respect product lifecycle and inventory workflows.

---

# 33. CONTENT GENERATION PIPELINE

Do not use one giant generation prompt.

Use staged generation:

```text
1. BRIEF
2. OUTLINE
3. CONTENT
4. INTERNAL LINKING
5. SEO QA
6. QUALITY QA
7. DIFF
8. PREVIEW
```

Each stage must be independently inspectable.

---

# 34. PAGE QA

Suggested publication score:

```text
Intent alignment          /20
Uniqueness/cannibalization /20
Semantic coverage         /15
Internal linking          /15
Editorial quality         /15
User value                /10
Metadata/technical        /5
```

Suggested minimum:

```text
80/100
```

Absolute blockers:

```text
STRONG_CANNIBALIZATION
FACTS_INVENTED
NO_CLEAR_INTENT
DUPLICATE_PAGE
BUILD_FAILED
CRITICAL_TECHNICAL_ERROR
```

---

# 35. NEXT.JS EXECUTION WORKFLOW

Website changes must use the existing Git + Vercel workflow.

Never silently modify production.

Required flow:

```text
SEO_ACTION
→ PROPOSED_CHANGE
→ GIT BRANCH / WORKTREE
→ CODE CHANGE
→ COMMIT
→ PUSH
→ VERCEL PREVIEW
→ QA
→ HUMAN APPROVAL
→ MERGE
→ VERCEL PRODUCTION
```

---

# 36. GIT TRACEABILITY

Every SEO change must be traceable.

Recommended branch pattern:

```text
seo/action-{action_id}
```

Recommended commit style:

```text
seo: improve /target-url for action #348
```

Supabase should store when available:

```text
action_id
git_branch
git_commit
vercel_preview_url
deploy_id
```

---

# 37. VERCEL PREVIEW QA

Before approval, run:

- build;
- route check;
- HTTP status;
- canonical;
- robots;
- title/meta;
- headings;
- schema;
- internal links;
- responsive preview where useful;
- relevant unit/integration tests;
- crawl preview where possible.

Failure means:

```text
WAITING_FIX
```

not production.

---

# 38. HUMAN APPROVAL UI

For MEDIUM/HIGH risk actions, show:

## Why

Evidence and diagnosis.

## Before

Current page/state.

## After

Proposed change.

## Diff

Exact code/content differences.

## Preview

Vercel preview link.

## Expected impact

SEO/business hypothesis.

## Risk

Risk level and rollback options.

Actions:

```text
APPROVE
REQUEST_CHANGES
REJECT
```

---

# 39. PRODUCTION VALIDATION

After merge/deploy verify:

```text
HTTP 200
correct canonical
robots/indexability
schema
sitemap inclusion where relevant
internal links
deployment health
```

If critical failure:

```text
ROLLBACK
```

---

# 40. MEASUREMENT SYSTEM

Every measurable action should have a baseline.

Possible measurement points:

```text
BASELINE
J+7
J+28
J+60
J+90
```

Do not apply every interval mechanically to every action.

Measure what makes sense.

Possible metrics:

- clicks;
- impressions;
- CTR;
- position;
- indexation;
- referring domains;
- conversions;
- revenue/lead metrics when available.

---

# 41. ACTION OUTCOMES

Classify action result:

```text
STRONG_WIN
WIN
NEUTRAL
UNDERPERFORM
LOSS
INSUFFICIENT_DATA
```

Always store why.

Do not call a result a loss if there is insufficient data.

---

# 42. EXPERIMENT MODEL

Every meaningful action should be treated as a hypothesis when possible.

Example:

```text
ACTION:
INTERNAL_LINKING

HYPOTHESIS:
Adding 5 relevant internal links from strong pages
will improve the target URL from position ~11 to top 10.

BASELINE:
11.3

J+60:
6.8

RESULT:
WIN
```

This builds the long-term proprietary dataset.

---

# 43. LEARNING ENGINE

Do not build complex machine learning too early.

Start with historical coefficients and rules.

Example:

```text
site_mode = LOCAL
action = CREATE_PAGE
historical_success = LOW
```

versus:

```text
site_mode = LOCAL
action = GBP_OPTIMIZATION + LOCAL_CITATION
historical_success = HIGH
```

Only adapt scoring after enough comparable observations exist.

Avoid learning from isolated cases.

---

# 44. CLAUDE CODE ROLE

Claude Code should primarily handle:

- repository-wide understanding;
- architecture review;
- business-rule reasoning;
- Decision Engine specification;
- complex cross-file reasoning;
- SEO rule review;
- implementation review;
- identifying dangerous side effects.

Claude Code must read this file before making architectural changes.

---

# 45. CODEX ROLE

Codex should primarily handle:

- implementation;
- worktrees/branches;
- Supabase migrations after approval;
- crawler implementation;
- queue/jobs;
- API integration;
- UI;
- tests;
- refactors;
- build fixes;
- technical QA.

Codex must read this file before implementation.

---

# 46. CROSS-REVIEW WORKFLOW

Preferred workflow:

```text
Claude Code → specification
Codex → implementation
Tests → automated
Claude Code → review
Codex → fixes
CI → green
Vercel Preview
Human → approval
Merge
```

Do not let both agents modify the same feature blindly in parallel.

Separate workstreams by contracts and files where possible.

---

# 47. COST CONTROL

The system must avoid unnecessary API and AI calls.

Preferred order:

```text
deterministic checks
→ cached data
→ first-party data
→ targeted DataForSEO
→ AI reasoning only when needed
```

Do not run:

```text
100 sites
× full DataForSEO
× full SERP
× full backlink analysis
× full LLM analysis
```

on every cycle.

Use pre-filtering.

---

# 48. AI ESCALATION POLICY

Most monitoring should not require AI.

Examples of deterministic prefilters:

```text
GSC change > threshold?
Page non-indexed?
CTR anomaly?
Position decline?
New query signal?
Technical error?
Lost backlink?
```

If nothing material changed:

```text
NO_AI_REQUIRED
```

This is essential for scale.

---

# 49. PORTFOLIO DASHBOARD

Keep the main UI focused.

Recommended top-level views:

## Portfolio

All sites and health.

## Actions

Daily operational queue.

## Site

Complete site-level strategy.

## Page Inspector

Per-page diagnosis.

## Results / Experiments

Historical action performance.

---

# 50. PAGE INSPECTOR

For each URL, show:

```text
GSC
indexation
technical health
intent
cluster
content
internal linking
backlinks
business value
action history
deployment history
measurement history
```

Primary action:

```text
WHAT SHOULD WE DO ON THIS PAGE?
```

The answer must come from the Decision Engine.

---

# 51. ALERTS

Only generate actionable alerts.

Good alerts:

- strategic page deindexed;
- clicks down materially;
- new cannibalization;
- high-ranking page with abnormal CTR;
- important backlink lost;
- published page not crawled after a meaningful period;
- cluster gaining rapid visibility;
- technical issue affecting important URLs.

Avoid noisy alerts such as:

```text
position moved -2
```

without context.

---

# 52. SCALING STRATEGY

Scale progressively:

```text
1 THEMATIC
→ 1 LOCAL
→ 1 PRODUCT
→ 3 sites
→ 10
→ 25
→ 50
→ 100
```

At every scale gate review:

- false positives;
- false negatives;
- human minutes per site;
- API cost;
- AI cost;
- queue latency;
- failure rate;
- rollback frequency;
- impact per action;
- number of NO_ACTION outcomes;
- publication quality.

---

# 53. HUMAN MINUTES PER SITE

One of the core scalability KPIs should be:

```text
HUMAN_MINUTES_PER_SITE_PER_MONTH
```

The system should progressively reduce this while maintaining or improving SEO outcomes.

The goal is not maximum automation.

The goal is maximum useful automation with controlled risk.

---

# 54. MVP DEFINITION

The true MVP is not a page generator.

The MVP is:

```text
Select a URL
→ collect facts
→ diagnose
→ choose best next action
→ explain why
→ prepare the change
→ preview it
→ approve it
→ deploy it
→ measure it
```

If this loop works reliably on one URL, portfolio scaling becomes primarily an orchestration problem.

---

# 55. IMPLEMENTATION ORDER

Recommended implementation sequence:

## Sprint A

```text
Audit
SEO_SYSTEM_SPEC
Supabase model review
Job architecture
```

## Sprint B

```text
Crawler
Indexation Engine
Internal link graph
```

## Sprint C

```text
Opportunity Discovery
GSC_DRIVEN
DISCOVERY_DRIVEN
HYBRID
```

## Sprint D

```text
Clusters
Intent model
Targeted DataForSEO layer
SERP validation
```

## Sprint E

```text
Decision Engine V1
Business Value
Scoring
```

## Sprint F

```text
Page Engine
Claude Code execution
Git workflow
Vercel Preview
QA
```

## Sprint G

```text
Backlinks
Netlinking Engine
Link Need Score
```

## Sprint H

```text
Measurements
Experiments
Results dashboard
```

## Sprint I

```text
Multi-site scaling
Alerts
Automation policy
Cost optimization
```

---

# 56. FIRST PILOT REQUIREMENTS

The first pilot should be a THEMATIC site.

It must complete:

```text
GSC
→ crawler
→ opportunity discovery
→ cluster/intents
→ Decision Engine
→ CREATE / OPTIMIZE / NO_ACTION
→ Git branch
→ Next.js modification
→ Vercel Preview
→ QA
→ approval
→ deploy
→ indexation
→ measurement
```

Do not scale until the full loop works.

---

# 57. SECOND PILOT REQUIREMENTS

Use a LOCAL site.

Validate:

- local intent;
- indexation;
- page/service strategy;
- internal linking;
- GBP-related backlog;
- local citations;
- backlinks;
- refusal to mass-generate local pages.

---

# 58. THIRD PILOT REQUIREMENTS

Use a PRODUCT site.

Validate:

- product/category architecture;
- inventory workflows;
- indexation;
- canonical strategy;
- structured data;
- internal linking;
- no forced editorial model.

---

# 59. AUTOMATION POLICY

Initial policy:

## Automatic

```text
data collection
crawl
measurement
index checks
cache refresh
brief draft
alert creation
```

## Quick approval

```text
internal linking
metadata
schema
small content optimization
```

## Mandatory approval

```text
new page
major rewrite
merge
redirect
delete
architecture change
paid netlinking
large-scale generation
```

Automation levels may only be relaxed after sufficient evidence.

---

# 60. CHANGE MANAGEMENT

Any change to this specification that materially affects:

- site-mode rules;
- action types;
- risk levels;
- Decision Engine order;
- automatic publishing;
- destructive operations;
- paid actions;
- learning/scoring;

must be proposed explicitly and approved before implementation.

---

# 61. FORBIDDEN BEHAVIORS

Agents and automations must not:

- publish directly to production without the required gate;
- create duplicate Supabase systems;
- mass-generate pages without intent validation;
- create local doorway pages;
- invent facts;
- use DataForSEO as an uncontrolled keyword dump;
- recommend backlinks before basic SEO issues are checked;
- modify high-performing pages without evidence;
- overwrite historical measurements;
- silently delete content;
- silently add redirects;
- bypass Git;
- bypass Vercel preview for high-risk changes;
- bypass required human approval;
- infer success from too little data;
- optimize for activity counts instead of impact.

---

# 62. DEFINITION OF DONE — FEATURE

A feature is not complete unless:

- architecture matches this spec;
- tests exist;
- build passes;
- no critical regression;
- logs exist where relevant;
- failures are handled;
- rollback exists where relevant;
- data is traceable;
- downstream contracts are documented;
- human approval rules are respected;
- related docs are updated.

---

# 63. DEFINITION OF DONE — SEO ACTION

An SEO action is complete only when relevant parts of this chain exist:

```text
evidence
→ diagnosis
→ decision
→ approval
→ execution
→ Git trace
→ deployment trace
→ measurement
→ result classification
```

---

# 64. LONG-TERM PRODUCT GOAL

The long-term product must be able to answer:

```text
What is happening on this site?
What is the biggest problem?
What is the best next SEO action?
Why is that action better than the alternatives?
Can we execute it safely?
What changed?
Did it work?
What did we learn?
What should we do next?
```

At portfolio scale:

```text
100 sites
→ continuous monitoring
→ small number of meaningful actions
→ high-confidence execution
→ controlled human approval
→ measurable outcomes
```

The system should behave like an SEO operating team, not like a content factory.

---

# 65. FINAL RULE

When uncertain between creating more activity and preserving system quality:

```text
choose quality
```

When uncertain between changing a page and preserving a healthy page:

```text
choose NO_ACTION
```

When uncertain between AI intuition and reliable data:

```text
choose reliable data
```

When uncertain whether an action is safe to automate:

```text
require human approval
```
