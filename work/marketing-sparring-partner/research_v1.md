# Where should Xenia work? Claude surfaces, Agent Skills, and file persistence (July 2026)

## Executive summary

As of **July 2026**, custom Agent Skills run on **claude.ai (web/mobile chat), Claude Desktop, Claude Cowork, and Claude Code** — but claude.ai/Desktop/Cowork share one account-level Skills setting (upload once, available everywhere in that account), while Claude Code Skills are a separate, filesystem-based mechanism. For a non-technical marketer who will never touch a terminal, **claude.ai web chat or Claude Desktop, inside a Project, is the right surface** — not Claude Code. The best mechanism for installing the 46-skill `coreyhaines31/marketingskills` pack without a terminal is very likely the **Plugins directory's "sync a marketplace from a GitHub repo/git URL"** feature (Customize → Plugins → Browse plugins → add custom marketplace), because the repo already ships a Claude Code plugin marketplace manifest (`/plugin marketplace add coreyhaines31/marketingskills`) — the same manifest format the claude.ai/Cowork plugin UI consumes. This is the single most important — and least documented — finding, so it should be **tested live before being relied on**, not assumed.

The one genuine open risk is **sub-question 4**: whether a file a skill writes (e.g. the `marketing-plan` skill's `~/marketing-plans/{client}/progress.md`) survives into a *new* conversation, even inside the same Project. Official docs describe file availability *within* a chat and describe Project files being accessible to the code-execution sandbox "while remaining in context," but **do not explicitly confirm cross-conversation persistence of skill-written files**. This must be verified empirically (see Recommendations) before assuming the marketing-plan skill's resumable-state design will work as intended in claude.ai chat.

Claude Cowork (GA on Desktop macOS/Windows, web, and mobile since its Feb 2026 update, on Pro/Max/Team/Enterprise) is real, runs on the same no-terminal agentic architecture as Claude Code, and does support Skills and Plugins — making it a strong candidate surface too, arguably a better one than plain chat for a "living, resumable marketing plan" workflow, since Cowork sessions are explicitly designed to be long-running, steerable tasks rather than single Q&A turns.

---

## Findings by sub-question

### 1. Custom Agent Skills on claude.ai web chat

**Confirmed (official):**
- claude.ai supports both pre-built Skills (PowerPoint/Excel/Word/PDF, always on) and **custom Skills**.
- Custom Skills are uploaded as a **ZIP file** via **Settings → Customize → Skills** (also described as "Settings > Features" / "Settings > Capabilities" in slightly older phrasing across Anthropic's own docs — the current label is **Customize**). The zip must contain the skill folder as its **root**, not nested in a subfolder.
- Requires **Pro, Max, Team, or Enterprise** plan, **with Code execution enabled**. Not available on Free.
- Multi-file skills (SKILL.md + reference docs + scripts/ subfolder) **are** supported in the zip upload — this is not limited to a single .md file.
- Custom Skills on claude.ai are **individual to each user** — not shared org-wide, and not centrally manageable by admins (that requires a separate org-wide provisioning path on Team/Enterprise, per secondary sources — not independently verified against a primary doc in this pass).
- (Source: Anthropic, Agent Skills overview, platform.claude.com — official Anthropic docs — retrieved July 2026: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview; support.claude.com "Creating custom Skills": https://support.claude.com/en/articles/12512198-creating-custom-skills; support.claude.com "Using Skills in Claude": https://support.claude.com/en/articles/12512180-using-skills-in-claude)

**Not found / unverified in official docs:**
- No explicit number-of-skills limit or per-skill/zip size limit stated in the primary docs I could reach. (Flag: verify by testing, or ask Anthropic support directly — do not assume "unlimited.")
- One third-party source (claudelab.net) claimed Free/Pro/Max can upload a *single SKILL.md file* directly — this **contradicts** the official docs (which require a paid plan + code execution + zip-with-subfolders). Treat the third-party claim as **inaccurate/outdated** and rely on the official Pro/Max/Team/Enterprise + zip requirement instead.

### 2. Claude Desktop app

- Skills are an **account-level setting**, not a Desktop-specific one: whatever you upload via Customize → Skills is available in claude.ai chat, the Desktop app's Chat tab, and Cowork alike. There is no separate "Desktop skills store."
- Desktop's genuine differentiator is **local filesystem access via MCP ("desktop extensions")**: you can point Claude Desktop at real folders on Xenia's machine by configuring an MCP filesystem server. This is described as edit-a-JSON-config-file-then-restart-the-app — a one-time technical setup task, not something Xenia would do herself, but something the founder could set up once. (Source: modelcontextprotocol.io; multiple 2026 how-tos corroborate the same JSON-config mechanism — no single canonical Anthropic doc found, moderate confidence.)
- Desktop extensions/local MCP servers are explicitly **local-only** — "available in Claude Desktop and Claude Code, not web or mobile" — so this is the one real capability gap between Desktop and plain web chat.
- **Implication for Xenia:** if she never needs Claude to read/write files on her own laptop outside the chat sandbox, web chat and Desktop are functionally identical for Skills. Desktop only earns its keep if the founder wants Claude to have standing access to a local folder (e.g. a synced Drive folder) — which is not required for the skill pack's own `~/marketing-plans/...` path (that path is *inside* Claude's own sandboxed VM when skills run in claude.ai/Desktop chat, not on Xenia's real hard drive).

### 3. Claude Cowork

- **Confirmed real product**, not speculative: official pages at anthropic.com/product/claude-cowork and support.claude.com, plus independent press (CNBC, Feb 2026) describing a broadened rollout to web and mobile in addition to Desktop.
- **What it is:** an agentic "working session" mode — you describe a task, Claude plans and executes multi-step work autonomously with check-ins, versus turn-by-turn chat. Runs on the same underlying agentic architecture as Claude Code, **explicitly with no terminal required**.
- **Plans:** Pro, Max, Team, Enterprise. Included in the Pro plan (not a separate add-on).
- **Runs Agent Skills:** yes. Cowork supports Skills (built via an in-product "Skill Creator" that interviews the user and generates a SKILL.md for them — notably lower-friction than hand-authoring), plus **Plugins** (bundles of skills + connectors + sub-agents) installable through a UI directory, and **Connectors** (Google Drive, Gmail, Slack, DocuSign, etc.). Plugins install in "chat on the web, the Chat tab in Claude Desktop, and Claude Cowork" alike.
- **Suitability for a non-technical user:** high. The whole design point of Cowork is removing the terminal and the "one prompt at a time" model; Anthropic's own materials position it at "the average office worker." For a workflow like "build and maintain a living marketing plan across many sessions," Cowork's session model (steerable, resumable, check-in-able from your phone) is arguably a better conceptual fit than plain chat turns.
- (Sources: https://www.anthropic.com/product/claude-cowork; https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork; https://www.cnbc.com/2026/02/24/anthropic-claude-cowork-office-worker.html — CNBC is a reputable secondary source corroborating the web/mobile expansion date)

### 4. File persistence per surface — the critical open question

What's confirmed:
- **Within one chat/session:** files Claude creates are available for download for the duration of that conversation. (Official, but vaguely worded — "throughout your conversation.")
- **Inside a Project:** "Files in your projects are now accessible through Claude's computing environment while remaining in context" — i.e., a skill's code-execution sandbox can see files you've uploaded as Project knowledge. This does NOT clearly state the reverse: whether a file a *skill writes* during one conversation is saved back into the Project and readable by a *different, later* conversation in that same Project.
- **Cowork sessions** explicitly persist and are resumable across devices/time ("start a task on one surface, steer it from another") — this is a stronger persistence story than plain chat, but it describes one long-running session, not necessarily "conversation N+1 reads what conversation N's skill wrote."
- **Memory** (Anthropic's separate auto-summary feature, on all plans since ~March 2026) is unrelated to skill file output: it stores auto-generated summaries of conversational context (role, preferences, ongoing projects), not raw files, and official docs make no mention of it interacting with Skills or skill-written files.

**Verdict: unverified.** No official source I found explicitly confirms or denies that `~/marketing-plans/{client}/progress.md`, written by the skill in Chat A, will still be there for the skill to read in Chat B of the same Project. This is exactly the assumption the `marketing-plan` skill's resumable state machine (fresh → INIT → REVIEW → FINALIZE) depends on. **Recommendation: test this directly** — have the skill create the file in one conversation, open a brand-new conversation in the same Project, and ask Claude to read it back — before telling Xenia she can "just pick up where she left off."

### 5. Projects + memory (lighter treatment, per scope)

- Projects: persistent workspace with its own chat history, custom instructions, and a knowledge base of uploaded files. Official limits: **30 MB per file**, no stated cap on number of files, but the **200K-token active context window** still gates how much of that knowledge Claude can pull into any single reply (Projects use RAG-style retrieval to fetch only relevant chunks, not the whole knowledge base). Formats: PDF, DOCX, CSV, TXT, HTML, ODT, RTF, EPUB, code files, images. (Source: support.claude.com "Upload files to Claude," corroborated by multiple 2026 explainers; the exact 30 MB figure is worth a final spot-check since I sourced it via a search-engine synthesis rather than fetching the primary article directly.)
- Memory works inside Projects with its own **separate memory space per Project** — isolated from other Projects and from standalone chats. (Official: support.claude.com "Use Claude's chat search and memory to build on previous context.")
- Whether Skills can *read* Project knowledge files as part of their own execution: implied yes (Project files are "accessible through Claude's computing environment"), not explicitly spelled out for the Skills feature specifically.

### 6. Installing `coreyhaines31/marketingskills` without a terminal

- The repo's own README documents **six install paths, all terminal/IDE-based**: `npx skills add ...`, Claude Code's `/plugin marketplace add coreyhaines31/marketingskills` + `/plugin install marketing-skills`, manual clone-and-copy, git submodule, fork, and `npx skillkit install`. **No claude.ai/Desktop/Cowork path is documented by the pack's own maintainer.**
- However: the repo **does** ship a Claude Code plugin-marketplace manifest (evidenced by the working `/plugin marketplace add` command), and Anthropic's own support docs confirm the claude.ai/Desktop/Cowork **Plugins** feature can **"sync a marketplace from a GitHub repository or git URL"** — the same plugin-marketplace mechanism, exposed through a UI (Customize → Plugins → Browse plugins → add a custom marketplace source) rather than a terminal.
- **This strongly suggests** the founder can, from claude.ai or Desktop (no terminal), add `coreyhaines31/marketingskills` as a custom plugin marketplace source and install the bundled "marketing-skills" plugin in one action — installing all (currently 57, not 46 — the repo has grown since the brief's estimate) skills at once, correctly preserving folder structure and any internal cross-references. **This is inferred from two separate official facts, not directly tested against this exact repo — verify by actually trying it before committing to this as Xenia's onboarding path.**
- Fallback if the marketplace-sync path doesn't work cleanly: manually download each skill's folder from GitHub, zip it with the skill folder as the zip's root (per the official zip-format requirement), and upload one at a time via Customize → Skills → Upload. This works but is real friction for a 57-skill pack and must be repeated per user (skills are per-account, not org-shared on non-Enterprise plans) — the founder would do this prep once for himself, but Xenia would need her own upload, or would need to work inside whatever surface the founder's uploaded skills live in under his own account (e.g., a shared login, which raises its own considerations outside this research's scope).
- **Cross-skill references / friction:** a scan of the repo's `skills/` folder shows each of the 50+ skills (ab-testing, ad-creative, marketing-plan, seo-audit, etc.) as an independent top-level folder with no obvious shared `/references` or `/shared` directory referenced across skills — so per-skill zip upload, if needed as a fallback, should not break inter-skill dependencies. (Checked via GitHub folder listing only, not exhaustive content diffing — flag as reasonably but not fully verified.)
- The pack's own `marketing-plan` skill explicitly assumes a **real, persistent home-directory filesystem path** (`~/marketing-plans/{client-slug}/progress.md`) — written for Claude Code's actual-machine-filesystem model. Running it inside claude.ai/Desktop/Cowork's sandboxed code-execution VM, that path exists only inside Claude's ephemeral (or Project-scoped, per open question in §4) sandbox — not on Xenia's or the founder's real disk. This is fine as long as §4's persistence question resolves favourably; if it doesn't, the skill will silently behave as if starting fresh each conversation, defeating its own "resumable state machine" design.

### 7. ChatGPT equivalent (brief, per scope)

ChatGPT's nearest analogue is **Custom GPTs** (system prompt + knowledge files + Actions/API calls), not a filesystem-based, progressive-disclosure Skill format. As of July 2026, secondary sources consistently describe Claude's Agent Skills as following an emerging **open cross-platform standard** (skills work across Claude, and reportedly other agent tools like Cursor/Copilot/Gemini CLI per third-party claims), whereas Custom GPTs remain OpenAI/ChatGPT-specific, easier to publish/share publicly (GPT Store), but architecturally simpler (no bundled scripts, no bash-driven progressive loading, no filesystem model). This confirms the tilt toward Claude for a filesystem/skills-driven workflow like the marketing pack — treat this paragraph as a light confirmation, not a rigorously sourced comparison; none of the sources were Anthropic-or-OpenAI-primary.

---

## Synthesis: practical recommendation

1. **Surface:** claude.ai web chat or Claude Desktop, working inside a **Project** dedicated to Xenia's company — Desktop adds nothing over web chat for this use case unless the founder later wants Claude reading/writing real files on a synced local folder (via MCP, one-time technical setup). **Claude Cowork is a credible alternative** worth a side-by-side trial, since its longer-running, resumable session model may match the marketing-plan skill's "living document" intent better than repeated stateless chat turns — and it explicitly supports Skills/Plugins too.
2. **Grounding:** put company context (offer, ICP, brand voice, past campaigns) into the Project's **knowledge files** (up to 30 MB/file, several formats) rather than relying on memory, which is an auto-summary layer, not a controllable knowledge base.
3. **Skills installation:** have the founder try the **Plugins → add custom marketplace from GitHub URL** path first (`coreyhaines31/marketingskills`) — if it installs cleanly, Xenia gets all skills in one click, no terminal, no zip files. Fall back to per-skill zip upload via Customize → Skills only if the marketplace sync doesn't work as expected.
4. **Before promising Xenia a "resumable marketing plan":** run the concrete persistence test described in §4. If a skill's written `progress.md` does not survive into a fresh conversation in the same Project, either (a) keep every marketing-plan session inside a single long-lived conversation/Cowork session rather than starting new chats, or (b) have Xenia paste/re-upload the last `progress.md` output manually at the start of each session as a Project knowledge file — a low-tech workaround that sidesteps the open question entirely.

## Confidence levels

- **High confidence** (official Anthropic docs, cross-checked): Skills exist on claude.ai/Desktop/Cowork/Code; zip-upload mechanism and plan/code-execution requirement; Cowork's existence, plans, and no-terminal design; memory's scope and separation from Skills.
- **Moderate confidence** (official docs plus reasonable inference, not directly tested): the GitHub-marketplace-sync path working for this specific repo; Skills reading Project knowledge files; Desktop MCP filesystem setup mechanics.
- **Low confidence / explicitly unverified — do not act on without testing**: whether skill-written files persist across separate conversations within a Project (the single most decision-relevant unknown); exact size/number limits for custom skill uploads; whether Team/Enterprise org-wide skill provisioning is real as described by a secondary source (Agentman blog) — not checked against a primary Anthropic doc.

## Sources consulted

- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview (Anthropic, primary)
- https://support.claude.com/en/articles/12512198-creating-custom-skills (Anthropic, primary)
- https://support.claude.com/en/articles/12512180-using-skills-in-claude (Anthropic, primary)
- https://support.claude.com/en/articles/12512176-what-are-skills (Anthropic, primary — referenced, not separately fetched)
- https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude (Anthropic, primary)
- https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context (Anthropic, primary)
- https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork (Anthropic, primary)
- https://support.claude.com/en/articles/13837440-use-plugins-in-claude (Anthropic, primary)
- https://support.claude.com/en/articles/14328846-browse-skills-connectors-and-plugins-in-one-directory (Anthropic, primary)
- https://www.anthropic.com/product/claude-cowork (Anthropic, primary)
- https://www.cnbc.com/2026/02/24/anthropic-claude-cowork-office-worker.html (secondary, reputable, corroborating)
- https://github.com/coreyhaines31/marketingskills and its README/skills folder (primary source for the skill pack itself)
- https://modelcontextprotocol.io/docs/develop/connect-local-servers (primary, MCP org)
- Various 2026 third-party explainers (claudelab.net, Agentman, stacknotice, etc.) used only for triangulation/context, flagged inline wherever they contradicted or supplemented an official source, and never as sole support for a load-bearing claim.

## Gaps and honest limitations

- I could not find a canonical Anthropic doc stating a hard size or count limit for custom Skills on claude.ai.
- Cross-conversation persistence of skill-written files inside a Project (§4) is the biggest real gap — genuinely undocumented, not just under-researched; only a live test will resolve it.
- I did not verify the GitHub-marketplace-sync install path by actually attempting it against `coreyhaines31/marketingskills` — this is an inference from two independently-confirmed official facts (the repo's plugin manifest + claude.ai's git-URL marketplace sync feature), not a tested outcome.
- The Team/Enterprise "org-wide Skills provisioning" claim came from a single secondary source (Agentman, a vendor blog with a commercial interest in the skills-tooling space) and was not cross-checked against a primary Anthropic doc — treat with caution, it's not decision-relevant for Xenia's individual setup anyway.
