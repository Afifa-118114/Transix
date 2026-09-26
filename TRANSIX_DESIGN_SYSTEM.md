# 🎨 TRANSIX — Design System & UI Overhaul Guide
### Inspired by Trip.com | Extracted from Live CSS + HTML

> **Purpose:** Single source of truth for the Transix UI redesign.  
> **Source:** Live CSS extracted from trip.com stylesheets + HTML audit  
> **Apply to:** All JSX components, index.css, TailwindCSS config

---

## 1. 🎨 COLOR PALETTE (Trip.com Exact Tokens)

### Primary Colors
```css
/* EXACT values extracted from trip.com CSS */
--color-primary:       #3264FF;   /* Primary blue — buttons, links, active states */
--color-primary-dark:  #2346FF;   /* Darker blue — hover states, CTAs */
--color-primary-deep:  #1733C5;   /* Focus rings, pressed state */
--color-primary-light: rgba(50, 100, 255, 0.08);  /* Light blue bg — active tab */
--color-primary-bg:    #E9F2FE;   /* Very light blue — chip/tag background */
```

### Text Colors
```css
--color-text-primary:   #0F294D;  /* Main headings, body text — deep navy */
--color-text-secondary: #455873;  /* Subtext, descriptions, captions */
--color-text-tertiary:  #666666;  /* Helper text, author names */
--color-text-dark:      #1A2033;  /* Alternative dark text */
--color-text-white:     #FFFFFF;  /* On dark backgrounds */
```

### Background Colors
```css
--color-bg-white:       #FFFFFF;   /* Cards, panels */
--color-bg-light:       #F0F2F5;   /* Page background, disabled states */
--color-bg-hover:       #F5F7FA;   /* Hover state for list items */
--color-bg-skeleton:    #EBEBF2;   /* Skeleton/loading placeholders */
--color-bg-tag:         #F0F2FA;   /* Tab/chip inactive background */
```

### Border Colors
```css
--color-border:         #DADFE6;   /* Default borders — inputs, cards */
--color-border-light:   #CED2D9;   /* Lighter borders — dividers */
--color-border-focus:   #3264FF;   /* Focus ring on inputs */
```

### Status / Accent Colors
```css
--color-success:        #09BB07;   /* Green — confirmed, success */
--color-warning:        #FF9500;   /* Orange/amber — star ratings, warnings */
--color-error:          #F43530;   /* Red — errors, cancellations */
--color-info:           #10AEFF;   /* Blue — info states */
--color-pending:        #FFBE00;   /* Yellow — pending, waiting */
```

### Gradient — Hero Section
```css
/* Trip.com hero uses deep navy gradient overlaid on photo */
--gradient-hero:         linear-gradient(180deg, rgba(15,41,77,0) 0%, rgba(15,41,77,0.5) 100%);
--gradient-card-overlay: linear-gradient(0deg, rgba(1,40,106,0.5) 9%, rgba(1,40,106,0) 45%);
--gradient-primary-band: linear-gradient(to right, #3E63F6, #2346FF);
```

---

## 2. 🔤 TYPOGRAPHY SYSTEM

### Font Stack
```css
/* Add to index.html head: */
/* <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"> */
font-family: 'Inter', BlinkMacSystemFont, -apple-system, Roboto, Helvetica, Arial, sans-serif;
```

### Type Scale (Extracted from Trip.com CSS)
```
DISPLAY / HERO
  Hero:      40px / 700 / line-height: 48px
  H1:        32px / 700 / line-height: 38px
  H2:        28px / 700 / line-height: 34px
  H3:        24px / 400 / line-height: 30px
  H4:        20px / 500 / line-height: 26px

BODY
  Large:     18px / 400 / line-height: 24px   (Card headers)
  Default:   16px / 400 / line-height: 22px   (Body text)
  Small:     14px / 400 / line-height: 18px   (Labels, secondary)
  Caption:   12px / 400 / line-height: 16px   (Captions, timestamps)
  Tiny:      10px / 400 / line-height: 14px   (Stars, micro badges)
```

### Font Weight Reference
```
400 = Regular  (body text)
500 = Medium   (labels, nav)
600 = Semibold (sub-headings)
700 = Bold     (headings, CTAs)
```

---

## 3. 📐 SPACING SYSTEM

### Base Unit: 4px
```
sp-1:   4px     sp-2:   8px     sp-3:  12px     sp-4:  16px
sp-5:  20px     sp-6:  24px     sp-8:  32px     sp-10: 40px
sp-12: 48px     sp-16: 64px
```

### Component Spacing (Extracted)
```
Cards
  padding:             16px        (inner)
  padding-lg:          24px        (large cards)
  gap:                  8px        (grid gap)
  gap-lg:              16px        (larger grid gap)

Sections
  section-gap:         48px        (between homepage sections)
  section-gap-lg:      64px        (large section spacing)
  section-margin:      32px        (horizontal page margin)

Header
  header-height:       60px

Buttons
  btn-sm:     7px 12px
  btn-md:     8px 16px
  btn-lg:    12px 24px

Inputs
  input-padding:      12px 16px
  input-height:           48px

Container
  max-width:         1160px
  padding:        0 32px (desktop)
```

---

## 4. 🔲 BORDER RADIUS SYSTEM

```
xs:     2px   — Tags, badges, cards, default cards (VERY subtle)
sm:     4px   — Inputs, tabs, chips
md:     6px   — Search tabs, medium elements
lg:     8px   — Dropdowns, popovers, modals
xl:    12px   — Large modals
pill: 999px   — Rounded CTA pills
circle: 50%   — Avatar images ONLY
```

> ⚠️ **Key:** Trip.com uses **2px radius** as default for most cards and tags. Avoid large rounded corners.

---

## 5. 🌑 SHADOW SYSTEM

```
xs:   0 2px 4px 0 rgba(69,88,115,0.08)    — Subtle lift
sm:   0 4px 8px 0 rgba(69,88,115,0.12)    — Card hover
md:   0 4px 8px 0 rgba(15,41,77,0.10)     — Floating elements
lg:   0 8px 16px 0 rgba(15,41,77,0.08)    — Modals, drawers
xl:   0 8px 16px 0 rgba(15,41,77,0.12)    — Heavy modals
blue: 0 4px 12px 0 rgba(100,147,227,0.24) — Card hover blue tint
```

---

## 6. 🧩 COMPONENT SPECS

### 6.1 Navigation / Header
```
Height:            60px (fixed, sticky)
Background:        #FFFFFF
Border-bottom:     1px solid #DADFE6
Logo:              Left-aligned
Nav items:         14px, color #0F294D, padding 8px 12px
Active nav:        color #3264FF, font-weight 500
Hover nav:         color #3264FF
Right side:        App | Lang/Currency | Support | Find Bookings | Sign In
```

### 6.2 Primary Button (CTA)
```css
background:    #3264FF;
color:         #FFFFFF;
border:        none;
border-radius: 2px;          /* Trip.com uses 2px — NOT rounded! */
padding:       8px 16px;
font-size:     14px;
font-weight:   700;
height:        34px;
transition:    background 0.2s;

:hover  { background: #2346FF; }
:focus  { outline: 2px solid #1733C5; border-radius: 4px; }
```

### 6.3 Secondary / Outline Button
```css
background:    #FFFFFF;
color:         #0F294D;
border:        1px solid #DADFE6;
border-radius: 2px;
padding:       8px 16px;
font-size:     14px;
height:        34px;

:hover { color: #3264FF; border-color: #3264FF; }
```

### 6.4 Active Chip / Tag
```css
background:    #E9F2FE;
color:         #3264FF;
border-radius: 2px;
padding:       8px 16px;
font-size:     14px;
font-weight:   700;
height:        34px;
```

### 6.5 Filter Chip (Tab-style)
```css
/* Inactive */
background:    #F0F2FA;
color:         #1A2033;
border-radius: 4px;
padding:       8px 16px;
font-size:     14px;
margin-right:  16px;
margin-top:    8px;

/* Active */
background:    #1A2033;
color:         #FFFFFF;
box-shadow:    0 4px 8px 0 rgba(15,41,77,0.1);

/* Hover (both) */
color:         #3264FF;
```

### 6.6 Search / Input Field
```css
background:    #FFFFFF;
border:        1px solid #DADFE6;
border-radius: 4px;
padding:       12px 16px;
font-size:     16px;
color:         #0F294D;
height:        48px;
outline:       none;

:focus {
  border-color: #3264FF;
  box-shadow:   0 0 0 2px rgba(50,100,255,0.15);
}
::placeholder { color: #9AA5B4; }
```

### 6.7 Standard Card (Destination / Attraction)
```css
/* Wrapper */
background:       #FFFFFF;
border-radius:    2px;
overflow:         hidden;
cursor:           pointer;
transition:       all 1.2s ease;

:hover {
  box-shadow:     0 4px 12px 0 rgba(100,147,227,0.24);
}
:hover .card-img {
  transform:      scale(1.1);
}

/* Image wrapper — aspect ratio box */
background:       #EBEBF2;   /* skeleton fallback */
width:            100%;
height:           0;
padding-bottom:   56%;        /* 16:9 | use 70% for portrait */
overflow:         hidden;
position:         relative;
border-radius:    2px;

/* Image */
position:         absolute;
width:            100%;
height:           100%;
object-fit:       cover;
transition:       all 1.2s ease;

/* Title */
font-size:        16px;
color:            #0F294D;
line-height:      22px;
height:           42px;       /* 2 lines */
margin:           16px 0 8px;

/* Meta */
font-size:        14px;
color:            #455873;
```

### 6.8 Destination Tile (Image with Overlay)
```css
/* Container */
position:    relative;
border-radius: 2px;
overflow:    hidden;
background:  #EBEBF2;

/* Dark gradient overlay */
.overlay {
  position:   absolute;
  inset:      0;
  background: linear-gradient(180deg, rgba(15,41,77,0) 0%, rgba(15,41,77,0.5) 100%);
  z-index:    6;
}

/* Title on image */
font-size:   22px;
color:       #FFFFFF;
position:    absolute;
z-index:     10;
bottom:      15px;
margin:      0 20px;
width:       calc(100% - 40px);
```

### 6.9 Hotel Card Fields
```
Image:          Full width, 16:9, zoom on hover
Rating:         Star icons (#FF9500) + review count text
Name:           18px / 700 / #0F294D
Address:        12px / #455873
Price:          20px / 700 / #3264FF (bold blue)
"per night":    12px / #455873
Amenity pills:  BG #F0F2F5, 12px text, 2px radius
Distance:       12px / #666666
Free cancel:    Badge: BG rgba(9,187,7,0.1), color #09BB07
Book CTA:       Primary button, right-aligned
Border:         1px solid #DADFE6 between list items
```

### 6.10 Star Rating
```css
/* Filled */
color:       #FF9500;
font-size:   10px;

/* Empty */
color:       #F0F2F5;
font-size:   10px;

/* Gap between stars */
margin-left: 6px;
```

### 6.11 Status Badges
```
Success:  BG rgba(9,187,7,0.1)    text #09BB07
Warning:  BG rgba(255,190,0,0.1)  text #FF9500
Error:    BG rgba(244,53,48,0.1)  text #F43530
Info:     BG rgba(50,100,255,0.1) text #3264FF
Neutral:  BG #F0F2F5              text #455873

All badges: padding 4px 8px, border-radius 2px, font-size 12px
```

### 6.12 Section Title
```css
font-size:   28px;           /* 32px for hero */
font-weight: 700;
color:       #0F294D;
line-height: 34px;
text-align:  center;
margin:      64px 0 24px;

/* Mobile */
font-size:   18px;
line-height: 24px;
margin:      32px 0 16px;
text-align:  left;
padding-left: 16px;
```

### 6.13 Dropdown / Popover
```css
background:    #FFFFFF;
border:        1px solid #F0F2F5;
border-radius: 8px;
box-shadow:    0 8px 16px 0 rgba(15,41,77,0.08);
padding:       12px;
```

### 6.14 Modal
```css
/* Overlay */
background: rgba(15,41,77,0.4);

/* Modal box */
background:    #FFFFFF;
border-radius: 8px;
box-shadow:    0 8px 16px 0 rgba(15,41,77,0.12);
max-width:     560px;
padding:       24px;

/* Title */
font-size:     20px;
font-weight:   700;
color:         #0F294D;
margin-bottom: 16px;
```

### 6.15 Divider
```css
border: none;
border-top: 1px solid #CED2D9;
margin: 16px 0;
```

---

## 7. 📱 BREAKPOINTS

```
xs:    375px   — Small phones
sm:    768px   — Tablets portrait
md:    835px   — Tablets landscape
lg:   1024px   — Laptops
xl:   1160px   — Content max-width container
xxl:  1220px   — Wide screens
2xl:  1442px   — Ultra-wide
```

### Card Grid
```
Desktop (768px+):     4 columns, 8px gap
Tablet (769-1200px):  3 columns
Mobile (767px-):      2 columns, 8px gap
```

---

## 8. 🎬 ANIMATIONS & TRANSITIONS

```css
/* Card image zoom */
--transition-card:  all 1.2s ease;

/* Button / fast UI */
--transition-fast:  all 0.2s ease;

/* Accordion panels */
--transition-panel: height 0.4s ease;

/* Image fade in (skeleton → loaded) */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.img-loaded { animation: fadeIn 0.3s ease-out; }

/* Skeleton pulse */
@keyframes skeletonPulse {
  0%   { background-color: #EBEBF2; }
  50%  { background-color: #D9DFE7; }
  100% { background-color: #EBEBF2; }
}
.skeleton { animation: skeletonPulse 1.5s ease-in-out infinite; }
```

---

## 9. 🗂️ PAGE-SPECIFIC DESIGN RULES

### Homepage / Landing
```
Hero:          Full-width photo + dark gradient overlay
Hero height:   min 60vh
Slogan:        40px bold white (desktop) | 24px (mobile)
USP row:       3 items — icon + title + subtitle (below hero)
Search tabs:   White pill-tabs for Hotels/Flights/Trains/Cars
Section BG:    #F0F2F5 for page, #FFF for card areas
Section title: 28px, centered, margin-top 64px
Max width:     1160px centered
```

### Trip Builder
```
Layout:        3 columns (inventory | canvas | summary panel)
Day tabs:      Horizontal scroll, 14px, active: #3264FF
Activity card: Border 1px #DADFE6, drag handle left, time right
Conflict pill: Red badge #F43530
Summary:       Right column sticky, budget breakdown bars
```

### Hotel Detail
```
Gallery:       Full-width hero + 4 thumbnails
Rating:        Large stars, score bubble, review count
Price:         Large bold #3264FF
Amenities:     Icon grid — 16px icons + 14px labels
Room types:    Table with price column
CTA:           Sticky bottom on mobile
```

### Campus Trip Card
```
Photo header:      Overlay gradient
IV Code:           Monospace, copy button
Per-student price: Bold, large
Inclusions:        Emoji badges row (🍽️ 🚌 🏨 🏛️)
Group size:        "24 / 50" pill
Deadline:          Orange if < 7 days
Status badge:      Appropriate color badge
```

---

## 10. 🖼️ ICON SYSTEM

```
Library:        react-icons/fi (Feather) or react-icons/hi2 (Heroicons)
Sizes:
  xs:  14px  (inline tags)
  sm:  16px  (nav, labels)
  md:  20px  (buttons, lists)
  lg:  24px  (section icons)
  xl:  32px  (feature icons)
  2xl: 48px  (hero icons)

Color:          Match text, or var(--color-primary)
Align:          vertical-align: middle
```

---

## 11. ✅ TAILWIND CONFIG

```js
// tailwind.config.js — extend with these tokens
module.exports = {
  theme: {
    extend: {
      colors: {
        primary:          '#3264FF',
        'primary-dark':   '#2346FF',
        'primary-deep':   '#1733C5',
        'primary-bg':     '#E9F2FE',
        navy:             '#0F294D',
        'navy-2':         '#455873',
        'navy-3':         '#666666',
        dark:             '#1A2033',
        surface:          '#F0F2F5',
        skeleton:         '#EBEBF2',
        border:           '#DADFE6',
        'border-light':   '#CED2D9',
        success:          '#09BB07',
        warning:          '#FF9500',
        error:            '#F43530',
        pending:          '#FFBE00',
      },
      fontFamily: {
        sans: ['Inter', 'BlinkMacSystemFont', '-apple-system', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'hero':      ['40px', { lineHeight: '48px', fontWeight: '700' }],
        'h1':        ['32px', { lineHeight: '38px', fontWeight: '700' }],
        'h2':        ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'h3':        ['24px', { lineHeight: '30px', fontWeight: '400' }],
        'h4':        ['20px', { lineHeight: '26px', fontWeight: '500' }],
        'body-lg':   ['18px', { lineHeight: '24px' }],
        'body':      ['16px', { lineHeight: '22px' }],
        'body-sm':   ['14px', { lineHeight: '18px' }],
        'caption':   ['12px', { lineHeight: '16px' }],
        'tiny':      ['10px', { lineHeight: '14px' }],
      },
      borderRadius: {
        'xs':   '2px',
        'sm':   '4px',
        'md':   '6px',
        'lg':   '8px',
        'xl':   '12px',
        'pill': '999px',
      },
      boxShadow: {
        'xs':   '0 2px 4px 0 rgba(69,88,115,0.08)',
        'sm':   '0 4px 8px 0 rgba(69,88,115,0.12)',
        'md':   '0 4px 8px 0 rgba(15,41,77,0.10)',
        'lg':   '0 8px 16px 0 rgba(15,41,77,0.08)',
        'xl':   '0 8px 16px 0 rgba(15,41,77,0.12)',
        'blue': '0 4px 12px 0 rgba(100,147,227,0.24)',
      },
      maxWidth: { 'container': '1160px' },
      spacing: {
        'header': '60px',
      },
    },
  },
}
```

---

## 12. 📋 QUICK REFERENCE TABLE

| Component | BG | Text | Border | Radius | Shadow |
|---|---|---|---|---|---|
| Primary Button | `#3264FF` | `#FFF` | none | `2px` | none |
| Secondary Button | `#FFF` | `#0F294D` | `#DADFE6` | `2px` | none |
| Active Chip | `#E9F2FE` | `#3264FF` | none | `2px` | none |
| Inactive Chip | `#F0F2FA` | `#1A2033` | none | `4px` | none |
| Card | `#FFF` | `#0F294D` | none | `2px` | hover only |
| Input | `#FFF` | `#0F294D` | `#DADFE6` | `4px` | focus glow |
| Badge Success | `rgba(9,187,7,0.1)` | `#09BB07` | none | `2px` | none |
| Badge Error | `rgba(244,53,48,0.1)` | `#F43530` | none | `2px` | none |
| Badge Info | `rgba(50,100,255,0.1)` | `#3264FF` | none | `2px` | none |
| Section Title | — | `#0F294D` | — | — | — |
| Modal | `#FFF` | `#0F294D` | none | `8px` | `shadow-xl` |
| Popover | `#FFF` | `#0F294D` | `#F0F2F5` | `8px` | `shadow-lg` |
| Skeleton | `#EBEBF2` | — | none | `2px` | none |
| Page BG | `#F0F2F5` | — | — | — | — |
| Header | `#FFF` | `#0F294D` | `#DADFE6 bottom` | none | none |

---

## 13. 🚫 ANTI-PATTERNS (DO NOT DO)

| ❌ Don't | ✅ Do Instead |
|---|---|
| Large border-radius (16px+) on cards | Use `2px` for cards |
| Pure black `#000` for text | Use `#0F294D` navy |
| Pure gray `#F5F5F5` for page BG | Use `#F0F2F5` |
| Green as primary action color | `#3264FF` blue is primary |
| `font-size: 13px` for body | Min body text is `14px` |
| Heavy drop shadow by default | Shadow only on hover/elevation |
| `0.3s` for card image transitions | Use `1.2s ease` for zoom |
| No hover effect on interactive elements | Always add `transition` |
| Bright/saturated red everywhere | Red only for errors/cancels |
| `border-radius: 12px` on every element | Reserve large radius for modals only |

---

## 14. 🏗️ CSS VARIABLES — FULL :root

```css
/* Paste into frontend/src/index.css */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  /* === COLORS === */
  --c-primary:          #3264FF;
  --c-primary-dark:     #2346FF;
  --c-primary-deep:     #1733C5;
  --c-primary-light:    rgba(50,100,255,0.08);
  --c-primary-bg:       #E9F2FE;

  --c-navy:             #0F294D;
  --c-navy-2:           #455873;
  --c-navy-3:           #666666;
  --c-dark:             #1A2033;
  --c-white:            #FFFFFF;

  --c-bg:               #F0F2F5;
  --c-bg-hover:         #F5F7FA;
  --c-skeleton:         #EBEBF2;
  --c-border:           #DADFE6;
  --c-border-light:     #CED2D9;

  --c-success:          #09BB07;
  --c-warning:          #FF9500;
  --c-error:            #F43530;
  --c-pending:          #FFBE00;
  --c-info:             #10AEFF;

  /* === TYPOGRAPHY === */
  --font:               'Inter', BlinkMacSystemFont, -apple-system, Roboto, Helvetica, Arial, sans-serif;
  --fw-regular:         400;
  --fw-medium:          500;
  --fw-semibold:        600;
  --fw-bold:            700;

  --text-hero:          40px;
  --text-h1:            32px;
  --text-h2:            28px;
  --text-h3:            24px;
  --text-h4:            20px;
  --text-body-lg:       18px;
  --text-body:          16px;
  --text-body-sm:       14px;
  --text-caption:       12px;
  --text-tiny:          10px;

  /* === SPACING === */
  --sp-1:  4px;   --sp-2:  8px;   --sp-3: 12px;   --sp-4: 16px;
  --sp-5: 20px;   --sp-6: 24px;   --sp-8: 32px;   --sp-10: 40px;
  --sp-12: 48px;  --sp-16: 64px;

  /* === BORDER RADIUS === */
  --r-xs:     2px;
  --r-sm:     4px;
  --r-md:     6px;
  --r-lg:     8px;
  --r-xl:     12px;
  --r-pill:   999px;

  /* === SHADOWS === */
  --shadow-xs:   0 2px 4px 0 rgba(69,88,115,0.08);
  --shadow-sm:   0 4px 8px 0 rgba(69,88,115,0.12);
  --shadow-md:   0 4px 8px 0 rgba(15,41,77,0.10);
  --shadow-lg:   0 8px 16px 0 rgba(15,41,77,0.08);
  --shadow-xl:   0 8px 16px 0 rgba(15,41,77,0.12);
  --shadow-blue: 0 4px 12px 0 rgba(100,147,227,0.24);

  /* === LAYOUT === */
  --container-max:    1160px;
  --header-height:    60px;

  /* === TRANSITIONS === */
  --t-card:   all 1.2s ease;
  --t-fast:   all 0.2s ease;
  --t-panel:  height 0.4s ease;
}

/* ===== BASE RESET (matches Trip.com) ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; -webkit-text-size-adjust: none; }
body {
  font-family:  var(--font);
  color:        var(--c-navy);
  background:   var(--c-bg);
  line-height:  1.6;
}
a   { text-decoration: none; color: inherit; -webkit-tap-highlight-color: rgba(0,0,0,0); }
img { border: 0; vertical-align: middle; }
button { background: none; cursor: pointer; border: 0; margin: 0; vertical-align: middle; }
ul, ol, li { list-style: none; margin: 0; padding: 0; }
h1,h2,h3,h4,h5,h6 { margin: 0; }
input { background: none; border: 0; outline: none; }
em, i { font-style: normal; }
```
