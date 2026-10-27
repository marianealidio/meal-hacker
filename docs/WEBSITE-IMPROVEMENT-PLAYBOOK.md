# Website Improvement Playbook

The improvements made to Meal Hacker, turned into steps you can apply to any website: how to find what's wrong, what to fix first, and how to keep it fixed.

## 1. How to see what needs improving

Look at the site the way a visitor, a browser and an attacker would. Each check below found real problems on Meal Hacker that the code alone didn't show.

| Check | How to run it | What it catches |
| --- | --- | --- |
| Screenshot review | Open every page at 375, 768, 1280 and 1440px wide and scroll it all | Sideways scrolling on phones, text below the fold, squeezed or invisible content, images not loading |
| Sideways-scroll test | Browser console: `document.documentElement.scrollWidth > innerWidth` | One wide element breaking the whole mobile layout |
| Click-through as a new visitor | Private window, no account: try the main action from the home page | Broken first steps (on Meal Hacker, demo login bounced back to the login page) |
| Contrast checker | Check every text colour against its background (WebAIM or a design tool) | Text below the 4.5:1 WCAG AA ratio, e.g. coral on cream at 4.47 |
| Keyboard only | Put the mouse away: Tab, Enter, Esc through every page | Missing focus rings, menus you can't reach, focus lost after an action |
| axe accessibility scan | Browser extension, or `@axe-core/playwright` in tests | Missing labels, wrong roles, heading problems |
| Lighthouse | Chrome DevTools → Lighthouse, on the live site | Slow images and fonts, unused JavaScript, SEO and best-practice gaps |
| Secret scan | `gitleaks detect` over the full git history | API keys or passwords ever committed |
| Dependency audit | `npm audit`, `pip-audit` | Known vulnerabilities in packages |
| Code review with fresh eyes | A reviewer (or an AI agent) reading each change against the requirements | Race conditions, missing error handling, data leaking between accounts |

The biggest lesson: automated tests passed while real bugs were visible on screen. Always look at the rendered page, not only the test results.

## 2. Foundations and security

Fix these first: they are cheap now and expensive after launch.

- **Keep secrets out of git.** Add `.env` to `.gitignore`, commit a `.env.example` with variable names only, and put real keys in your host's dashboard (Render, Vercel, Netlify).
- **Split settings by environment.** Development, test and production get separate settings. Production refuses to start without a secret key, uses HTTPS-only cookies and turns debug off.
- **Never change data with a plain link.** Deleting or editing should need a POST/PATCH/DELETE request with CSRF protection, so another site can't trigger it.
- **Validate every input on the server.** Check lengths, dates, IDs and allowed values. On Meal Hacker, a 101-character ingredient name would have crashed the production database.
- **Return one error format everywhere**, e.g. `{"error": {"code", "message", "fields"}}`. The front end can then always show a friendly message.
- **Rate-limit login, sign-up and anything that costs money** (AI calls, paid APIs), so a script can't run up your bill.
- **Users only see their own data.** Another user's record should return "not found". Test it.
- **Don't trust what the browser sends** for things the server can look up itself, such as a recipe title or a price.

## 3. Design

Build a small design system before building pages. Every page then looks like it belongs to the same site.

1. **Pick a direction from references.** Collect 3–5 sites you like and write down what they share: colours, shapes, type, mood. Meal Hacker blended a bakery site's sage/cream/coral and torn-paper edges with a SaaS site's arch photos and icon rows.
2. **Define colour tokens and check contrast before using them.** Name each colour by its job (page background, card, primary button, text on dark). Two of Meal Hacker's planned colours failed contrast and were darkened before any page was built.
3. **Limit fonts to two, plus one accent.** One display font for headings, one readable font for body text, and an optional handwritten font used at most once per section.
4. **Build reusable components:** buttons, form fields with error messages, cards, chips, dialogs, empty states, loading placeholders.
5. **Add a few signature shapes,** like Meal Hacker's wave dividers, arch-framed photos and hand-drawn doodles. They make a site memorable instead of templated.
6. **Make a `/styleguide` page** showing every colour, font size and component. It keeps you consistent, and it's a good portfolio piece.
7. **Respect reduced motion.** Every animation switches off when the visitor's system asks for it.

Avoid: default blue links, plain grey boxes, purple gradients, emoji as icons, and anything that looks like an unedited template.

## 4. Landing page and first impression

Assume a visitor gives you about 60 seconds and won't sign up to see anything.

- **Let people try it in one click.** Meal Hacker's "Open the kitchen" logs into a pre-filled demo account, with no form. For a portfolio, this matters more than any feature.
- **Make the headline say the benefit in a few words** ("Cook what you have. Waste nothing."), with one sentence underneath and one main button.
- **Use a proven section order:**
  1. hero
  2. the problem, with one real number and its source
  3. how it works in 3 steps
  4. feature rows with visuals
  5. smaller extras in a grid
  6. the story or about
  7. a final call to action
  8. footer
- **Show the product,** with screenshots or small live previews of real screens, not stock icons.
- **Cite facts.** Link the source of any statistic, and double-check it.
- **Make the main content visible at first paint.** Don't fade in the headline. On Meal Hacker it was invisible for two seconds on phones.
- **Make every page useful when empty,** with an illustration, one sentence and one next step, instead of a blank card.
- **Write helpful copy:** short, specific labels ("Add to plan", not "Submit"), and error messages that say what to do next.

## 5. Accessibility

Accessible sites are also easier for everyone to use, and accessibility is part of WCAG AA, the usual legal and professional bar.

- Every text/background pair is at least **4.5:1** contrast (3:1 for large text). Check with a contrast tool, not by eye.
- Every action works with the **keyboard**, and the focused element always shows a **visible ring**. On dark backgrounds, pick a ring colour that shows up there.
- Every form field has a **label**. Errors are linked to their field (`aria-describedby`) and announced (`role="alert"`). After a failed submit, focus moves to the first problem.
- **One `<h1>` per page,** with headings in order. Add a "Skip to content" link.
- **Tap targets are at least 44×44px** on phones.
- **Decorative images and SVGs are hidden** from screen readers (`alt=""`, `aria-hidden`). Meaningful images get real alt text.
- **When something is removed, move focus** somewhere sensible, e.g. the next item, instead of letting it drop to the top of the page.
- **Run axe on every page in automated tests.** Meal Hacker's end-to-end tests fail if any page has a WCAG A/AA violation.

## 6. Performance

- **Images:** use your framework's image component (`next/image` or similar), request a source size close to the display size, mark the hero image as priority, and set width and height so the layout doesn't jump.
- **Fonts:** load them through the framework (`next/font`) or with `font-display: swap`, so text shows immediately.
- **Don't hide the largest content behind an animation.** "Largest Contentful Paint" is the main score Google uses for loading speed.
- **Check Lighthouse on the deployed site.** Local runs are often slower on a cold start. Aim for 90+ in every category.
- **Cache expensive outside calls** (Meal Hacker caches recipe searches for 24 hours and recipe details for 7 days). The site is faster, and you stay inside free API limits.
- **Ship less JavaScript:** render static pages on the server, and avoid loading heavy libraries for one small feature.

## 7. Reliability: states and saving

- **Every page has three states besides "loaded":** loading (placeholders shaped like the content), empty (an invitation to act) and error (a message with a "Try again" button).
- **One failing widget shouldn't blank the whole page.** Give each section its own loading and error handling.
- **Optimistic updates feel instant,** but they must **roll back on failure** and show an error message. They should also **refetch afterwards** so the screen matches the server.
- **Saves that can overlap must run in order** (e.g. autosaving notes), or an older save can overwrite a newer one.
- **Prevent double submits:** disable the button while it's working, and ignore repeat clicks.
- **Retrying failed actions must not create duplicates.** Track what already succeeded.
- **Clear per-user data on logout,** including anything in `localStorage` or `sessionStorage`. Meal Hacker's assistant chat would otherwise have shown one account's conversation to the next person in the same tab.
- **Show friendly errors for a sleeping or broken server,** e.g. "The kitchen is waking up. Try again in a few seconds.", not a blank page or raw error text.
- **Handle time zones on purpose.** Build dates from local parts, never `toISOString()` on a local midnight, and test around daylight-saving changes.

## 8. Testing and automation

Use layers. Each catches what the others miss.

| Layer | Tool (Meal Hacker) | Catches |
| --- | --- | --- |
| Unit tests | Django `TestCase`, Vitest + Testing Library | Logic, validation, component behaviour |
| End-to-end | Playwright on desktop and a phone size | Whole user journeys breaking (demo → plan a meal → shopping list) |
| Accessibility | axe in the end-to-end run | WCAG violations on every page |
| Visual | Screenshots at 4 widths, reviewed by eye | Layout problems no test asserts |
| CI | GitHub Actions on every push | Anything that worked only on your machine |
| Overnight sweep | `scripts/final-sweep.sh` | Everything above plus secrets, dependency audits, production-settings check and Lighthouse, in one report |

Habits that made the difference:

- **Write the test first.** It should fail without your change and pass with it. A test that passes either way is only a regression guard.
- **Fake external APIs in tests,** so tests never use real credits or break when a service is down. An offline mode with sample data also lets demos work without keys.
- **Keep CI green:** a red pipeline that everyone ignores stops being useful.
- **Review every change with fresh eyes** against the requirements, then re-check after fixes. Most of Meal Hacker's serious bugs were found this way.

## 9. Before you deploy

- [ ] Run the full sweep and read every warning
- [ ] CI is green on the branch you're deploying
- [ ] No `.env` committed; real keys only in the host's dashboard
- [ ] Production settings: debug off, secret key set, allowed hosts and trusted origins set to your real domains
- [ ] Database migrations run as part of the deploy
- [ ] Health-check URL returns OK on the live backend
- [ ] Smoke-test the live site in a private window, on desktop and on your phone: home page, main action, sign up, log in, log out, a 404 page
- [ ] Browser console has no errors
- [ ] Lighthouse on the live URL: 90+ everywhere
- [ ] You know how to roll back (previous deploy in the host's dashboard)

Meal Hacker's full version of this list is in `docs/DEPLOYMENT.md`.

## 10. The improvement loop

Repeat this for any website, at any stage:

1. **Look:** screenshot every page at phone, tablet and desktop width, and click through as a brand-new visitor.
2. **Measure:** contrast, keyboard, axe, Lighthouse, secret scan, dependency audit.
3. **List findings** with a severity: broken or unsafe (fix now), confusing (fix soon), polish (later).
4. **Fix with a test first** where the problem is behavioural, so it can't quietly come back.
5. **Review the fix with fresh eyes,** then look at the rendered page again.
6. **Automate the check** that found it (CI, the end-to-end suite or the sweep), so you never have to remember it.
7. **Ship, then measure again on the live site.**
