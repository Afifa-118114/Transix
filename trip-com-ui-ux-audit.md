# Trip.com — UI/UX Design Audit
*Prepared as a reference doc for updating another site's UI/UX to match Trip.com's design language.*

> **How this was compiled:** based on a live fetch of trip.com's page structure/IA plus visual inspection of current screenshots of the desktop site (homepage, search widget, listing pages). Hex codes, px values and font stacks below are **close visual estimates**, not values pulled from DevTools. Before your coding agent hard-codes any number, tell it to verify against the live site's computed styles (Chrome DevTools → Inspect → Computed) since Trip.com A/B tests constantly and values can drift by a few px. I've flagged the few points that need this verification with ⚠️.

---

## 1. Brand & Color System

| Token | Approx. Value | Usage |
|---|---|---|
| Primary Blue | `#287DFA` – `#0064D2` (gradient range) ⚠️ verify exact stops | Primary CTAs, active nav states, links, icon accents |
| Deep Blue (header/hero gradient) | `#1A56DB` → `#0F3D91` | Hero banner background gradient, top nav on some locales |
| Accent Orange/Red | `#FF6600` – `#F5330F` | "Deal" badges, discount tags, urgency labels ("Only 2 rooms left") |
| Success Green | `#00A65E` approx | Price drops, "Free cancellation", positive review scores |
| Warning/Rating Yellow | `#FFB400` | Star ratings, review score chips |
| Neutral Text (primary) | `#1A1A1A` / `#212121` | Headlines, primary body copy |
| Neutral Text (secondary) | `#666666` – `#767676` | Sub-labels, metadata, timestamps |
| Border/Divider | `#EBEBEB` – `#E5E5E5` | Card borders, table dividers |
| Background (page) | `#FFFFFF` | Main canvas |
| Background (section alt) | `#F5F7FA` / `#F7F8FA` | Alternating sections to break up long scroll pages |
| Meta theme-color | `#FFFFFF` | Confirmed directly from page `<meta>` tag |

**Observations:**
- Color usage is **functional, not decorative** — blue = action/navigation, orange/red = urgency/savings, green = reassurance, yellow = social proof (ratings). Your agent should map colors to *meaning*, not just aesthetics.
- Background stays almost entirely white/near-white; color is used sparingly and only to draw the eye to money-related or decision-critical elements (price, discount %, rating).
- Gradients are used **only** on the hero/top banner and on premium/loyalty badges — never on body cards. Keep the rest of the UI flat.

---

## 2. Typography

| Element | Approx. Size | Weight | Notes |
|---|---|---|---|
| Font family | System stack: `-apple-system, "Helvetica Neue", Helvetica, "PingFang SC", "Microsoft YaHei", Arial, sans-serif` ⚠️ verify | — | No custom webfont loaded for Latin text — this is a **performance choice** (avoids font-loading flash/CLS at their scale). CJK locales fall back to PingFang/YaHei. |
| H1 (hero headline, e.g. "Every check-in is a new beginning") | ~28–34px | 600–700 (semi-bold/bold) | Short, benefit-driven, sentence case (not Title Case) |
| H2 (section titles, "Trending destinations") | ~20–22px | 600 | |
| H3 (card titles, hotel/destination name) | ~14–16px | 600 | Often truncated with ellipsis at 1–2 lines |
| Body / metadata | ~12–13px | 400 | Prices, dates, "X reviews" |
| Micro text (badges, tags) | ~10–11px | 500–600, often uppercase or small-caps styled | High contrast chip backgrounds |
| Price (primary number) | ~16–20px | 700, often in accent or dark color, larger than surrounding text | Price is always the visual weight-winner on any card |
| Line height | ~1.4–1.5 for body, tighter (~1.2) for headlines | | |
| Letter-spacing | Default (0) on body; slight positive tracking (~0.2–0.5px) on uppercase micro-labels | |

**Observations:**
- Typographic hierarchy leans on **size + weight + color**, not italics or unusual fonts — very restrained, "get out of the way" typography so imagery and price data are the stars.
- Sentence case throughout (not Title Case) for a more conversational, less corporate tone.
- Numbers (prices, ratings, counts) are consistently the heaviest/darkest/largest text on any card — a clear "scan pattern" decision.

---

## 3. Layout & Grid

- **Max content width:** ~1200–1280px centered container, generous white gutters on larger screens (site never goes fully edge-to-edge above tablet width).
- **Grid:** 12-column responsive grid; homepage modules typically break into 4, 5, or 6 cards per row on desktop, collapsing to 2 per row on tablet, 1 (stacked, swipeable carousel) on mobile.
- **Section rhythm:** Each homepage module (Hero → Search widget → Trending destinations → Deals → Recommended hotels → Inspiration/blog → Trust badges → Footer) is a **self-contained horizontal band**, each with its own heading + "View more →" link, separated by consistent vertical spacing (~48–64px between sections).
- **Search widget placement:** overlaps the hero banner (negative margin-top), acting as the visual anchor of the page — it's the single most prominent element above the fold, styled as an elevated white card on top of the colored hero.

---

## 4. Spacing System

Trip.com follows a fairly disciplined **4px/8px base spacing scale**:

- Micro gaps (icon-to-label): `4px`
- Standard internal card padding: `12px`–`16px`
- Gaps between cards in a row: `12px`–`16px`
- Section internal padding (top/bottom): `32px`–`48px`
- Section-to-section margin: `48px`–`64px`

⚠️ Tell your agent to implement this as **spacing tokens** (`--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px; --space-8: 32px;` etc.) rather than hard-coded pixel values scattered through CSS — this is the single highest-leverage change for making a site *feel* like Trip.com, more than any color or font tweak.

---

## 5. Navigation & Header

- **Top utility bar:** thin strip above main nav with language/currency selector, app download link, customer support, sign-in — small text (~12px), low visual weight, right-aligned.
- **Main nav:** horizontal tab-style links (Hotels & Homes, Flights, Trains, Cars, Attractions & Tours, Flight + Hotel, Cruises, Insurance, etc.) — the **active/selected vertical (e.g. Hotels) is visually distinct** with a bold weight and/or colored underline, and the corresponding search widget below the nav changes to match.
- Nav is a **flat list, not a mega-dropdown-heavy menu** — breadth is handled via a scrollable/wrapping row rather than nested dropdowns, keeping click depth shallow (this matters for how many products they cross-sell).
- Sticky behavior: header condenses/sticks on scroll on listing pages so filters and search stay accessible.

---

## 6. Hero + Search Widget (core conversion component)

- Hero background: full-width photographic or illustrated gradient banner, low-detail so it doesn't compete with foreground text/UI.
- Search widget is a **white, elevated card** (soft shadow, ~8–12px border-radius) with:
  - Horizontal tab switcher at the top (Hotels / Flights / Trains / etc. — mirrors main nav)
  - Inline form fields (Destination, Check-in/out or dates, Guests) laid out horizontally on desktop, stacked on mobile
  - A single, high-contrast, large primary-blue "Search" button, right-aligned, visually the heaviest element in the widget
- This "tabs + elevated card overlapping the hero" pattern is Trip.com/Booking/Expedia's shared convention — it's worth replicating almost exactly if your site is travel/booking-adjacent, since users already have a learned mental model for it.

---

## 7. Cards (the core repeating unit of the site)

Trip.com is essentially a system of **card components** repeated with different content. Common patterns across destination cards, hotel cards, and deal cards:

| Property | Approx. Spec |
|---|---|
| Corner radius | `8px`–`12px` |
| Shadow | Very subtle: `0 1px 4px rgba(0,0,0,0.08)` on rest, slightly deeper on hover ⚠️ verify |
| Border | Often none (shadow-only elevation) or 1px `#EBEBEB` on flatter list-style cards |
| Image aspect ratio | 4:3 or 16:9 depending on card type, always `object-fit: cover` |
| Image position | Top of card, full card width, no padding around image |
| Content padding | `12px`–`16px` below the image |
| Card width (desktop grid) | Fixed-ish, e.g. ~220–280px in horizontal carousels, or fluid % width in grid rows |
| Hover state | Slight lift (translateY -2px to -4px) + shadow increase; image may scale slightly (1.03–1.05x) inside overflow:hidden container |
| Badge/tag | Absolutely positioned top-left or top-right over the image (e.g. "-20%", "Best seller", "Limited deal") — pill-shaped, accent color background, white text |
| Price placement | Bottom of card, largest/darkest text on the card; strikethrough original price shown smaller/gray next to it when discounted |
| Rating | Small yellow-star + numeric score + review count, placed just above or beside price |

**Observations:**
- Every card follows **Image → Title → Metadata (rating/location) → Price → CTA-or-tap-target**, top to bottom, without exception. This consistency is what makes the whole site feel coherent despite having dozens of card types (hotels, flights, packages, attractions).
- Cards are almost always **tap/click targets in their entirety** (whole card is a link), not just a button inside them.

---

## 8. Buttons & CTAs

- **Primary button:** solid primary blue fill, white text, `border-radius` ~4–8px (more rounded on mobile app-style CTAs, more rectangular on desktop web forms), medium font-weight (500–600), roughly `40–48px` height for primary actions like "Search" or "Book now."
- **Secondary button:** white/transparent background, blue border and text, same shape/height as primary — used for "View more," "See all," "Compare."
- **Text links:** blue, no underline by default, underline or darker blue on hover.
- CTAs never use all-caps; sentence case, short verbs ("Book now," "View deal," "See more").

---

## 9. Iconography & Imagery

- Icons: simple, single-color (usually blue or gray) line or subtly-filled icons at small size (~16–24px), used sparingly next to labels (never decorative icon soup).
- Photography style: bright, saturated, aspirational travel photography (beaches, skylines, landmarks) for destination/inspiration modules; more neutral, functional interior/exterior shots for hotel listing cards.
- Illustration style (used in empty states, trust/loyalty sections): flat, rounded, friendly — soft color palette matching the blue/orange brand accents, not photorealistic.

---

## 10. Trust & Social Proof Signals

Heavily present throughout — worth explicitly noting because this is core to a booking site's conversion UX:
- Review scores + count on almost every card ("4.5 · 1,204 reviews")
- Scarcity/urgency micro-copy ("Only 2 left at this price", "Booked 12 times today")
- Guarantee badges (price match, free cancellation, 24/7 support) as small icon+text rows, usually in a light-gray band near the footer or under the search widget
- Awards/press mentions in a muted strip (logos in grayscale or low-saturation)

---

## 11. Motion & Micro-interactions

- Transitions are fast and subtle: ~150–250ms ease-out for hovers, card lifts, tab switches.
- Carousels (destinations, deals) auto-scroll or are manually swiped with arrow controls that fade in on hover (desktop) — no aggressive autoplay that fights user control.
- Loading states use skeleton screens (gray placeholder blocks matching card shape) rather than spinners, especially on search results pages.

---

## 12. Responsive Behavior

- Breakpoints (typical): ~`1280px` (desktop), `1024px` (small desktop/large tablet), `768px` (tablet), `480px` (mobile) ⚠️ verify exact values.
- Desktop → Tablet: card grids drop from 5–6 columns to 2–3; nav may collapse secondary items into a "More" menu.
- Tablet → Mobile: search widget fields stack vertically; horizontal card rows become swipeable carousels (peeking next card ~10–15% visible to signal scrollability); sticky bottom nav/CTA sometimes appears on mobile for primary actions.
- Touch targets on mobile are enlarged (~44px minimum height) versus desktop equivalents.

---

## 13. Accessibility Notes

- Text contrast: primary text on white generally passes AA; light-gray metadata text (`#999`-ish) on white is borderline — worth checking with a contrast checker before copying that exact gray.
- Color is *reinforced* with icons/text (e.g., green text + checkmark icon for "Free cancellation") rather than color alone — good practice worth keeping.
- Interactive cards should ensure the entire clickable area is a real `<a>`/button element (not just a `div` with an onClick) for keyboard/screen-reader access — this is worth double-checking on your own site even though it's invisible visually.

---

## 14. Overall Design Philosophy (the "why" behind the choices)

1. **Density with hierarchy, not clutter** — the site shows a *lot* of information per screen (prices, ratings, dates, badges) but never feels chaotic, because size/weight/color hierarchy is applied with total consistency.
2. **Price and rating are always the visual heroes** of any card — everything else (title, image, location) supports those two data points.
3. **Restrained color, purposeful accents** — white/gray canvas, blue for action, orange/red for urgency, green for reassurance, yellow for ratings. No decorative color.
4. **Repeatable card system** over bespoke layouts — nearly every content type (hotel, flight, attraction, deal, article) is expressed as a variant of the same card template, which is what makes a huge, sprawling site feel unified.
5. **Trust signals are baked into the UI**, not bolted on as an afterthought — reviews, guarantees, and urgency cues appear at the point of decision, not just on a separate "why trust us" page.

---

## 15. Actionable Checklist for Your Coding Agent

When you hand this to your agent, the highest-impact, lowest-risk changes to ask for (in rough priority order) are:

1. [ ] Introduce a **spacing token scale** (4/8/12/16/24/32/48/64px) and refactor existing spacing to snap to it.
2. [ ] Introduce a **type scale** with a clear hierarchy (H1/H2/H3/body/meta/price) using weight + size, not color, as the main differentiator.
3. [ ] Standardize all "content preview" components into **one reusable card pattern**: image (fixed aspect ratio, `object-fit: cover`) → title (truncated) → metadata row (rating/location) → price/CTA row.
4. [ ] Restrict your color palette to: 1 primary action color, 1 urgency/accent color, 1 success color, 1 rating color, plus a neutral gray scale — remove any other one-off colors.
5. [ ] Make the primary CTA on any card/section the single highest-contrast element in that component.
6. [ ] Add subtle hover elevation (translateY + shadow) to all clickable cards for a more "alive" feel.
7. [ ] Reduce photography noise: crop/compress hero and card images consistently to the same aspect ratios sitewide.
8. [ ] Add lightweight trust signals (ratings, guarantees, scarcity where honest) directly on cards, not just on detail pages.
9. [ ] Verify color contrast on any gray/muted text against WCAG AA before finalizing hex values.
10. [ ] Ask the agent to pull the *actual* computed CSS values from trip.com (font-family, exact hex, exact px) via browser inspection if pixel-perfect matching is the goal — this doc gives direction and structure, not certified pixel values.

---

*End of audit.*
