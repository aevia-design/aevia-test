# Source Index

**Task**: url-structure (Aevia TO-DOS #82) · **Research questions**: (1) bare-domain vs subpath homepage best practice and consequences; (2) how search engines/usability authorities treat URL path structure and whether clean URLs matter for SEO/CTR/trust; (3) cost of changing URLs post-launch (redirects, link equity, retention duration); (4) language-versioned URL guidance (/de/, hreflang); (5) Cloudflare Pages `_redirects`/proxying/clean-URL specifics; (6) real-world comparable-brand URL structures · **Collection date**: 2026-09-23

## Summary Statistics
- Total sources: 14 — documentation: 7 · blog: 4 · web_page (incl. 3 direct brand observations): 3
- Retrieval methods: WebFetch (full/summarized fetch) 12 · WebSearch snippet only (WebFetch failed) 1 · WebSearch aggregated (not individually fetched) 1
- Average reliability: 0.85; distribution: excellent ≥0.8 — 9 · good 0.7–0.79 — 4 · acceptable 0.6–0.69 — 1
- All sources ≥ 0.6 threshold; none excluded for reliability (one, src_014, sits exactly at the 0.6 floor and is flagged for review)

## Sources by Topic

### Homepage placement & general URL structure (Q1, Q2)

**src_001** — URL Structure Best Practices for Google Search
- **URL**: https://developers.google.com/search/docs/crawling-indexing/url-structure · **Type**: documentation · **Reliability**: 1.00 · **Retrieval**: WebFetch
- **Summary**: Official Google guidance — descriptive words over IDs, hyphens not underscores, lowercase, minimal parameters, simple/logical structure.
- **Metadata**: `sources/docs/src_001.meta.yaml`

**src_002** — Ecommerce URL Structure Best Practices
- **URL**: https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites · **Type**: documentation · **Reliability**: 0.96 · **Retrieval**: WebFetch
- **Summary**: Google's ecommerce-specific URL guidance — descriptive category/product slugs over numeric IDs; directly bears on whether `/pages/` adds a meaningless segment.
- **Metadata**: `sources/docs/src_002.meta.yaml`

**src_004** — URL as UI
- **URL**: https://www.nngroup.com/articles/url-as-ui/ · **Type**: web_page (usability authority) · **Reliability**: 0.88 · **Retrieval**: WebFetch
- **Summary**: Nielsen's classic argument that URLs are a visible UI element affecting trust and click-through; users spend real gaze-time reading URLs; ugly/long URLs suppress clicks.
- **Metadata**: `sources/web/src_004.meta.yaml`

**src_009** — Subdomains vs Subfolders (Subdirectories) for SEO
- **URL**: https://ahrefs.com/blog/subdomain-vs-subfolder/ · **Type**: blog · **Reliability**: 0.84 · **Retrieval**: WebFetch
- **Summary**: Ahrefs/Google-officials consensus that subdomain vs subfolder makes little SEO difference given proper internal linking — useful backdrop for whether `/pages/` itself matters as much as instinct suggests.
- **Metadata**: `sources/blogs/src_009.meta.yaml`

**src_011** — Google Revises URL Parameter Best Practices
- **URL**: https://www.searchenginejournal.com/google-revises-url-parameter-best-practices/530814/ · **Type**: blog (trade press) · **Reliability**: 0.76 · **Retrieval**: WebFetch
- **Summary**: Confirms Google actively maintains/updates this documentation (Oct 2024); minor/contextual relevance.
- **Metadata**: `sources/blogs/src_011.meta.yaml`

### Cost of changing URLs post-launch / redirect philosophy (Q3)

**src_003** — Cool URIs Don't Change
- **URL**: https://www.w3.org/Provider/Style/URI · **Type**: documentation (W3C) · **Reliability**: 0.92 · **Retrieval**: WebFetch
- **Summary**: Tim Berners-Lee's foundational essay — URLs should be designed to survive decades; once published, a URI is a promise; the underlying rationale for "fix structure before launch, not after."
- **Metadata**: `sources/docs/src_003.meta.yaml`

**src_008** — How Long Should You Keep a Redirected (301) URL Before Shutting It Down?
- **URL**: https://www.highervisibility.com/seo/learn/how-long-keep-301-redirect-before-removing/ · **Type**: blog (agency) · **Reliability**: 0.72 · **Retrieval**: WebFetch
- **Summary**: Concrete guidance — keep 301s at least a year, ideally indefinitely; premature removal costs traffic, rankings, and user trust.
- **Metadata**: `sources/blogs/src_008.meta.yaml`

**src_010** — Trailing Slash / Canonical URL Best Practices (aggregated)
- **URL**: https://developers.google.com/search/blog/2010/04/to-slash-or-not-to-slash (+ secondary SEO commentary) · **Type**: blog (aggregated, not individually fetched) · **Reliability**: 0.72 · **Retrieval**: WebSearch aggregation
- **Summary**: Homepage URL with/without trailing slash is treated as equivalent by Google; consistency matters more than the choice itself. Lower-confidence — not independently fetched as a single primary text.
- **Metadata**: `sources/blogs/src_010.meta.yaml`

### Language-versioned URLs (Q4)

**src_006** — Managing Multi-Regional and Multilingual Sites
- **URL**: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites · **Type**: documentation · **Reliability**: 0.96 · **Retrieval**: WebFetch
- **Summary**: Google's ccTLD vs subdomain vs subdirectory comparison — directly relevant to Aevia's `/de/` structure.
- **Metadata**: `sources/docs/src_006.meta.yaml`

**src_007** — Localized Versions of Your Pages (hreflang)
- **URL**: https://developers.google.com/search/docs/specialty/international/localized-versions · **Type**: documentation · **Reliability**: 0.96 · **Retrieval**: WebFetch
- **Summary**: hreflang implementation mechanics — self-reference rule, x-default, common errors (75% of implementations have errors per other sources).
- **Metadata**: `sources/docs/src_007.meta.yaml`

### Cloudflare Pages specifics (Q5)

**src_005** — Redirects · Cloudflare Pages docs
- **URL**: https://developers.cloudflare.com/pages/configuration/redirects/ · **Type**: documentation · **Reliability**: 1.00 · **Retrieval**: WebFetch
- **Summary**: Official `_redirects` syntax, splats/placeholders, 200-status proxying (and its SEO caveat re: duplicate content), 2,100-redirect limit, ordering/precedence rules.
- **Metadata**: `sources/docs/src_005.meta.yaml`

*(src_010 above also bears on Q5's clean-URL/trailing-slash sub-question.)*

### Real-world comparable-brand URL structures (Q6 — data, not editorial)

**src_012** — Real-world observation: Artifact Uprising URL structure
- **URL**: https://www.artifactuprising.com/ · **Type**: web_page (direct observation) · **Reliability**: 0.80 · **Retrieval**: WebFetch (live HTML)
- **Summary**: Homepage at bare root domain; flat, descriptive one-level category slugs (`/photo-books`, `/photo-prints`, etc.), no CMS/page-type prefix.
- **Metadata**: `sources/web/src_012.meta.yaml`

**src_013** — Real-world observation: Mixbook and Saal Digital URL structures
- **URL**: https://www.mixbook.com/ ; https://www.saal-digital.com/ · **Type**: web_page (direct observation) · **Reliability**: 0.80 · **Retrieval**: WebFetch (live HTML)
- **Summary**: Both brands: homepage at bare root; flat, descriptive category slugs; Saal Digital's only "meaningless" path segment is its app-like `/WebshopConfigurator/` tool, not a content page.
- **Metadata**: `sources/web/src_013.meta.yaml`

**src_014** — Real-world observation: Journi URL structure
- **URL**: https://www.journiapp.com/ · **Type**: web_page (indirect observation via search snippets) · **Reliability**: 0.60 (borderline — flagged)
- **Summary**: Homepage at bare root domain, but product pages use short cryptic codes (`/p/pb/hpb/`) rather than descriptive slugs — a counter-example to the Google/NNG descriptive-words guidance. Direct WebFetch failed on a TLS certificate mismatch; URLs sourced from search-engine snippets only, so treat as lower-confidence until re-verified.
- **Metadata**: `sources/web/src_014.meta.yaml`

## Collection Notes

- **Tools used**: WebSearch (discovery, 11 queries across the six question areas) and WebFetch (retrieval/summarization of 13 of 14 sources; one direct fetch on journiapp.com/journi.com failed with a TLS certificate mismatch pointing to a Pantheon hosting cert, so that source relies on WebSearch-indexed snippets only).
- **Quality threshold applied**: 0.6, per brief. All 14 retained sources meet or exceed it; none were excluded outright. No source fell in the 0.5–0.6 "flag for review, include only if short" band except src_014, which sits exactly at 0.6 and is explicitly flagged in its own metadata and in this index — re-verify by direct site visit before treating its URLs as fact in synthesis.
- **src_010 is an aggregated WebSearch summary**, not a single fetched primary document (it blends the 2010 Google Search Central Blog post with several secondary SEO commentary sites). Retained because no single higher-quality source fully covered the homepage/trailing-slash equivalence point, but it should be treated as secondary-tier evidence, not a primary citation, in synthesis.
- **Coverage gaps**: Moz was targeted per the brief's source-type preferences but no Moz article surfaced with content specific enough to warrant inclusion over the Ahrefs/NN/g/Google sources found; web.dev searches redirected to the same Google Search Central URL-structure page already captured as src_001, so no separate web.dev source was added. MDN and W3C's "Cool URIs for the Semantic Web" (a distinct, more technical companion document to Berners-Lee's essay) were considered but not retrieved — MDN did not surface a URL-structure-specific authority page beyond general URL syntax reference, and the Semantic Web companion document was judged off-topic for Aevia's plain e-commerce use case.
- **Domain-specific limitation**: this is general-web/SEO research, not academic — so the CORE/Unpaywall/arXiv paper-retrieval chain does not apply; no papers directory content was created (kept empty per skill structure).
- **Real-world brand check (Q6) caveat**: three of fourteen sources are primary observational data (live URL snapshots) rather than editorial/authority sources — useful as data points for synthesis but they carry no independent claim to best-practice authority; Journi's entry in particular needs re-verification.
