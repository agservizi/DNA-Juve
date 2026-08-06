# Public migration gap closure

## Scope

Complete the public Next.js migration without changing article content: restore article FAQ/video/newsletter behavior, author follows, forum engagement, and complete public discovery/PWA metadata.

## Architecture

- Newsletter requests pass through a server-only Next route; the Brevo key never reaches the browser.
- Author and forum mutations use the authenticated Supabase browser client and rely on existing RLS/unique constraints.
- Third-party article embeds are emitted as inert placeholders by the server and mounted only after external-media consent.
- Sitemap discovery is read-only and generated from published/public records.

## Security checkpoint

- Validate and normalize newsletter email server-side; reject oversized/invalid bodies.
- Do not expose Brevo response bodies or secrets to clients.
- Mutations include the authenticated user id; database RLS remains the authorization boundary.
- Article HTML remains sanitized before rendering; JSON-LD escapes `<`.
- External embeds do not load before explicit consent.

## Acceptance criteria

- Newsletter success is reported only after Brevo accepts or already knows the contact; missing configuration returns an honest error.
- Signed-in readers can follow authors and like/follow forum threads; counts refresh from Supabase.
- A thread view is counted once per browser session.
- FAQ headings in article HTML produce `FAQPage` JSON-LD.
- External article videos stay inert until consent and native videos retain controls.
- Sitemap includes published articles and public category/tag/author/forum/video archives.
