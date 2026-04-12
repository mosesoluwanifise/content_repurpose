Product Requirements Document

**YouTube to Facebook Post Generator**

MVP — v1.1

Last updated: April 11, 2026

| Product | YouTube to Facebook Post Generator |
| :---- | :---- |
| Version | 1.1 MVP |
| Status | Draft |
| Owner | Product Team |
| Target release | Q2 2026 |
| Change from v1.0 | Added Blog Post output format and format-selection toggles |

# **1\. Overview**

Content creators and social media managers spend significant time repurposing long-form video content into platform-native posts. This product eliminates that friction by automatically generating ready-to-publish Facebook posts and blog articles from any YouTube video URL, while ensuring the video's core message is faithfully preserved across all output formats.

## **1.1 Problem statement**

Repurposing video content for Facebook and owned blog channels is tedious and time-consuming. Creators must manually watch, take notes, draft copy, and adapt tone for each format — a process that takes 30–90 minutes per video. Most content is never repurposed, leaving audience reach and SEO value on the table.

## **1.2 Proposed solution**

A single-page web tool where users paste a YouTube URL and receive up to four distinct content outputs — three Facebook post formats and a full blog article — in seconds. An AI first identifies the video's key message, then builds all outputs around that message to ensure coherence and accuracy. Users can toggle individual formats on or off before generating.

# **2\. Goals and success metrics**

## **2.1 MVP goals**

* Generate up to four distinct content formats from any YouTube URL in under 45 seconds

* Ensure key message retention is explicitly surfaced to the user in every generation

* Support four tone options applied consistently across all formats

* Allow users to toggle individual output formats on or off

* Deliver a polished, usable interface that requires no onboarding

## **2.2 Success metrics**

| Metric | Target |
| :---- | :---- |
| Time to first output | \< 45 seconds from URL entry (blog adds \~15s vs posts-only) |
| Copy action rate | \> 60% of sessions result in at least one copy |
| Blog post engagement | \> 30% of sessions include blog format enabled |
| User satisfaction (CSAT) | \> 4.0 / 5.0 in early user testing |
| Regeneration rate | \< 25% (proxy for output quality) |
| Session completion rate | \> 70% complete a full generation |

# **3\. Target users**

The MVP targets two primary user personas:

**Persona 1 — The solo content creator**

* YouTuber or video podcaster with 1K–100K subscribers

* Manages their own social media and blog with limited time

* Wants to grow Facebook presence and blog SEO without doubling their workload

* Pain point: writing posts and blog articles feels like extra homework after finishing a video

**Persona 2 — The social media and content manager**

* Works across 3–10 client accounts or brand channels

* Regularly tasked with repurposing YouTube content for Facebook pages and blogs

* Values speed and consistency over manual customisation

* Pain point: context-switching between video content and writing multiple format types drains productivity

# **4\. Feature requirements**

## **4.1 Core features (must-have for MVP)**

**F-01: YouTube URL input**

| Priority | P0 — Critical |
| :---- | :---- |
| Description | User enters a YouTube URL into a text input field and triggers generation. |
| Acceptance criteria | Accepts all standard YouTube URL formats (watch?v=, youtu.be/, shorts/). Displays a clear error for invalid or unparseable URLs. Supports Enter key as trigger in addition to the button. |

**F-02: Key message extraction and display**

| Priority | P0 — Critical |
| :---- | :---- |
| Description | Before displaying outputs, the tool surfaces a single-sentence summary of the video's core message. |
| Acceptance criteria | Key message is visually prominent and appears above all generated outputs. Message is a complete sentence. All generated content demonstrably reinforces this message. |

**F-03: Format selection toggles**

| Priority | P0 — Critical |
| :---- | :---- |
| Description | Users can toggle each output format on or off before generating. At least one format must remain active. |
| Formats | Teaser, Key Takeaways, Quote Post, Blog Post |
| Default state | All four formats active by default |
| Behaviour | Deselected formats are excluded from the API prompt and not shown in results. Toggling does not trigger regeneration automatically. |

**F-04: Facebook post outputs (three formats)**

| Priority | P0 — Critical |
| :---- | :---- |
| Description | Up to three Facebook post variants generated per request, depending on format selection. |
| Teaser | 2–4 sentence hook-driven post. Builds curiosity. Ends with a call-to-action and the YouTube link. |
| Key takeaways | 3–4 bullet-point value post with emoji bullets. Ends with the YouTube link. |
| Quote post | A compelling insight or quote with 1–2 sentences of context. Ends with the YouTube link. |

**F-05: Blog post output (new in v1.1)**

| Priority | P0 — Critical |
| :---- | :---- |
| Description | A full editorial blog article generated from the video content, ready to publish on an owned blog or CMS. |
| Length | 500–700 words |
| Structure | Engaging opening paragraph (no title heading) → 2–3 sections with \#\# headings → closing paragraph with CTA and YouTube link |
| Display | Blog output renders with styled headings and paragraph spacing. Shows word count and estimated read time in the card footer. |
| Copy behaviour | One-click copy writes plain text (with \#\# heading markers preserved) to clipboard for easy CMS pasting. |
| Tone | Matches selected tone but written in an editorial, standalone style — distinct from the social post voice. |

**F-06: Tone selection**

| Priority | P0 — Critical |
| :---- | :---- |
| Description | Four tone chips allow users to select the writing style applied to all active formats. |
| Options | Conversational (default), Professional, Witty, Inspiring |
| Behaviour | Selected tone is applied across all outputs. For the blog post, tone is interpreted editorially rather than socially. |

**F-07: One-click copy**

| Priority | P0 — Critical |
| :---- | :---- |
| Description | Each output card has a Copy button that writes the content to the clipboard. |
| Facebook posts | Character count shown in card footer. Button label changes to 'Copied\!' for 2 seconds. |
| Blog post | Word count and read time shown in card footer. Plain text with heading markers copied. |

**F-08: Loading and error states**

| Priority | P0 — Critical |
| :---- | :---- |
| Loading | Animated spinner with context-aware status message (e.g. 'Generating posts and blog article…'). Generate button disabled during processing. |
| Error — invalid URL | Inline error message. No API call is made. |
| Error — API failure | User-facing error message with suggestion to retry. Technical details logged to console only. |

## **4.2 Post-MVP features (v1.2+)**

* Editable output bodies — inline editing before copying

* Hashtag suggestions generated alongside each Facebook post

* SEO meta description generated alongside the blog post

* Suggested blog post title surfaced separately from the article body

* Transcript paste input — fallback for videos without captions

* Regenerate single format — without regenerating all active outputs

* Export all — copy all outputs to clipboard or download as .txt or .md

* Post history — saved generations within the session

# **5\. Technical architecture**

## **5.1 System components**

The MVP is a single-page React application with no backend. All processing happens client-side via direct calls to the Anthropic API.

| Layer | Technology | Notes | MVP scope |
| :---- | :---- | :---- | :---- |
| Frontend | React (JSX) | Single-page artifact | Yes |
| Styling | Tailwind CSS | Core utilities only | Yes |
| AI | Claude claude-sonnet-4-20250514 | via Anthropic /v1/messages | Yes |
| Auth | None | API key handled by platform | Yes |
| Backend | None (v1) | Add for transcript fetch in v1.2 | No |
| Storage | None (v1) | In-memory session only | Yes |

## **5.2 API prompt design**

The AI is prompted to perform two tasks in sequence:

1. Identify and state the key message of the video as a single clear sentence.

2. Generate only the requested formats (based on active toggles), each grounded in and reinforcing the key message.

The model returns a structured JSON object with fields: keyMessage, and any subset of teaser, takeaways, quote, and blog. Only fields corresponding to active formats are requested. The response is parsed client-side and rendered into the UI.

The blog post prompt explicitly instructs the model to write in an editorial, standalone style — distinct from the social post voice — and to structure output with \#\# section headings and paragraph breaks for readability.

## **5.3 Token budget**

Generating all four formats simultaneously requires a larger max\_tokens budget than posts alone. The blog post adds approximately 600–800 tokens to the response. max\_tokens is set to 1800 when the blog format is active, and 1000 when only Facebook formats are selected.

## **5.4 Known limitations (MVP)**

* The model draws on training knowledge for well-known videos. For obscure or very recent videos, output quality may be lower.

* No live transcript fetching — a backend proxy will be required in v1.2 to access YouTube's caption API without CORS issues.

* The tool does not publish to Facebook or any CMS — all outputs must be manually copied and pasted.

* Blog post output does not include a suggested title in the MVP; this is scoped to v1.2.

* No rate limiting or abuse protection in the MVP artifact context.

# **6\. User experience**

## **6.1 User flow**

3. User arrives at the tool page.

4. User pastes a YouTube URL into the input field.

5. User optionally toggles format chips to select which outputs to generate (all four active by default).

6. User optionally selects a tone (defaults to Conversational).

7. User clicks 'Generate' or presses Enter.

8. Loading state is shown with a context-aware message (e.g. 'Generating posts and blog article…').

9. Key message is displayed above all output cards.

10. Facebook post cards and/or blog post card are shown based on active formats.

11. User reviews outputs and clicks Copy on their preferred format(s).

12. User pastes into Facebook, their CMS, or blog platform and publishes.

## **6.2 Design principles**

* Speed first — the tool should feel instant; any latency is covered by clear, context-aware loading feedback.

* Zero learning curve — no tooltips, tutorials, or onboarding required.

* Key message is unmissable — the retention callout is the first thing users see after generation.

* Format flexibility — users control what they generate; the tool does not force all formats.

* Clean output — all content is ready to paste without editing; formatting is platform-native for each destination.

# **7\. Risks and mitigations**

| Risk | Impact | Mitigation |
| :---- | :---- | :---- |
| Model lacks knowledge of obscure or new videos | Low-quality or hallucinated outputs | Add transcript paste fallback in v1.2 |
| Blog post generation increases latency noticeably | User abandonment on blog-enabled generations | Context-aware loading message; token budget tuning |
| Blog post tone does not feel editorial enough | Content feels like a padded social post, not a real article | Explicit tone instruction in prompt separating blog from social style |
| Generated content misrepresents the video | Reputational risk for creator | Key message callout prompts user to verify before copying |
| API latency causes poor perceived performance | User abandonment | Disable generate button; animated spinner with descriptive status text |

# **8\. MVP timeline**

| Phase | Duration | Deliverables |
| :---- | :---- | :---- |
| Design & spec | 1 week | Final PRD v1.1, UX wireframes, prompt engineering (incl. blog format) |
| Build | 1 week | React app, API integration, all P0 features including blog output and format toggles |
| User testing | 1 week | 5–8 user sessions with focus on blog output quality and format toggle UX |
| Iteration | 1 week | Bug fixes, blog prompt tuning, copy refinements, performance optimisation |
| Launch | 1 day | Soft launch, analytics instrumentation |

# **9\. Out of scope for MVP**

* User accounts, login, or saved history

* Facebook API integration or direct publishing

* CMS integration or direct blog publishing

* Live transcript fetching from YouTube

* SEO meta description or suggested blog title (scoped to v1.2)

* Support for other social platforms (LinkedIn, Twitter/X, Instagram)

* Team collaboration features

* Analytics dashboard

* Custom brand voice training

# **10\. Open questions**

* Should the blog post include a suggested title surfaced separately from the article body, even in MVP? Low effort to add; high perceived value.

* Should the tool surface a disclaimer when it cannot verify the video content? If so, what threshold triggers it?

* What is the preferred model for transcript fallback in v1.2 — user paste, YouTube Data API, or a third-party service like AssemblyAI?

* Should tone selection and format toggles persist between sessions (localStorage) or reset on each visit?

* Is there appetite for a Markdown download option for the blog post to make CMS import easier?

* Is there appetite for a browser extension variant that could detect YouTube tabs automatically?

Confidential — for internal use only