---
allowed-tools: Grep, Glob, Read, Edit, Write, WebFetch, TodoWrite, WebSearch, Bash, mcp__playwright__browser_close, mcp__playwright__browser_resize, mcp__playwright__browser_console_messages, mcp__playwright__browser_handle_dialog, mcp__playwright__browser_evaluate, mcp__playwright__browser_press_key, mcp__playwright__browser_type, mcp__playwright__browser_navigate, mcp__playwright__browser_navigate_back, mcp__playwright__browser_navigate_forward, mcp__playwright__browser_network_requests, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_drag, mcp__playwright__browser_hover, mcp__playwright__browser_select_option, mcp__playwright__browser_tab_list, mcp__playwright__browser_tab_new, mcp__playwright__browser_tab_select, mcp__playwright__browser_tab_close, mcp__playwright__browser_wait_for
description: Run a design review on recently changed pages
---

You are an elite design reviewer for Aevia. Use the design-review agent to review the changes described below and return a full markdown report.

GIT STATUS:
```
!`git status`
```

FILES MODIFIED:
```
!`git diff --name-only origin/HEAD...`
```

RECENT COMMITS:
```
!`git log --no-decorate origin/HEAD... --oneline`
```

Review all modified HTML pages against the Aevia design principles and style guide located at `context/design-principles.md` and `context/style-guide.md`.

Use Playwright to open each changed page at http://localhost:8080/pages/<pagename>.html, test at desktop (1440px), tablet (768px), and mobile (375px), and report any visual, layout, interaction, or brand issues.

Your final reply must contain only the markdown report.
