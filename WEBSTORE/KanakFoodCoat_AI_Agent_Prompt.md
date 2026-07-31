# 🍛 Kanak FoodCoat — Full Website AI Agent Build Prompt
**Version:** Complete Multi-Page Website  
**Brand:** Kanak FoodCoat  
**Stack:** Single HTML file (HTML5 + CSS3 + Vanilla JS) — fully self-contained, no external frameworks required except Google Fonts (Inter via CDN)

---

## 🎯 PROJECT OVERVIEW

Build a **complete, two-page Indian food delivery website** for the brand **"Kanak FoodCoat"**.

- **Page 1 (Landing/Hero Page):** Full hero section with sticky navbar — this is the first thing users see
- **Page 2 (Main Menu Page):** Navigated to after clicking CTA or navbar; contains feature categories, promotional banners, regular food grid, customer reviews, promo banners, support bar, and footer

The two pages should be rendered as two `<section>` or `<div>` blocks within the same HTML file, with smooth JS-driven navigation between them (no actual page reload). Alternatively, deliver them as two separate HTML files: `index.html` and `menu.html`.

---

## 🏷️ BRAND IDENTITY

### Brand Name Treatment
- Display as: **`Kanak`** `FoodCoat`
- `"Kanak"` → bold, colored in **#FC8019** (warm orange)
- `"FoodCoat"` → regular weight, colored in **#16A34A** (fresh green)
- Font: **Inter Bold** for "Kanak", **Inter Regular** for "FoodCoat"
- This split-color wordmark should appear consistently in navbar, footer, and any branding moments
- Logo icon: A simple Indian food tiffin box or delivery bag SVG icon in #FC8019, placed left of the wordmark
- Example: 🟠**Kanak** 🟢FoodCoat (visually, not emoji — using CSS color splits)

### Color System (Strict — do not deviate)
```
Primary CTA Orange:    #FC8019
Secondary Green:       #16A34A
Success:               #22C55E
Warning:               #F59E0B
Error:                 #EF4444
Background:            #FFFFFF
Surface/Card:          #F8FAFC
Text Primary:          #111827
Text Secondary:        #6B7280
Border:                #E5E7EB
Navbar Background:     #FFFFFF
Footer Background:     #111111 (near-black, like reference image 7)
```

### Typography
- Font family: **Inter** (import from Google Fonts)
- H1: 36px, Bold, #111827
- H2: 28px, Bold, #111827
- H3: 20px, SemiBold, #111827
- Body: 16px, Regular, #6B7280, line-height 1.6
- Small: 14px, Regular, #6B7280
- Button text: 16px, SemiBold, #FFFFFF
- Line heights: 1.5–1.6 for body, 1.2 for headings

---

## 📄 PAGE 1 — HERO / HOME PAGE
*(Based on reference image 1 — FoodSwift layout, adapted for Kanak FoodCoat)*

### 1.1 Sticky Top Navigation Bar

**Layout:** Full-width, white background (#FFFFFF), 64px height, sticky on scroll with a subtle box-shadow on scroll (`box-shadow: 0 2px 12px rgba(0,0,0,0.08)`).

**Left:** Brand wordmark — tiffin-box icon + **Kanak** (orange) **FoodCoat** (green)

**Center nav links (desktop):**
- Home | Offers | Restaurants | Partners | Riders | Contact | Blog
- Font: Inter Medium 15px, color #374151
- Active state: color #FC8019, with a 2px bottom border in #FC8019
- Hover: color #FC8019, smooth 0.2s transition

**Right:** Primary CTA button
- Label: **"Order Now"**
- Background: #FC8019
- Text: white, Inter SemiBold 15px
- Padding: 10px 22px
- Border-radius: 20px
- Hover: background #E8720A, slight scale(1.02), soft shadow

**Mobile:** Hamburger icon (3 lines, #111827) on right; clicking opens a slide-down or side-drawer menu with all nav links stacked vertically; brand wordmark on left.

---

### 1.2 Hero Section

**Layout:** Full-width, white/light background (#F8FAFC), min-height 560px on desktop. Two-column grid: **60% left text column**, **40% right visual column**. On mobile: single column, text first, image below.

**Left Column — Content:**

**Eyebrow tag** (above headline):
- Small pill badge: 🟢 "Now delivering in 20 km radius"
- Style: background #DCFCE7, color #16A34A, border-radius 20px, padding 4px 12px, font 13px SemiBold

**Main Headline (H1):**
```
"Hot, Fresh Food In 40 Minutes Or Less"
```
- Font: Inter Bold 36px (desktop), 26px (mobile)
- Color: #111827
- Optionally highlight "40 Minutes" in #FC8019 to match reference image 1's style

**Subheading:**
```
"Local restaurants delivered to your doorstep within a 20 km radius.
Simple, safe, and trusted ordering for students, offices, families,
and first-time users."
```
- Font: Inter Regular 16px, color #6B7280, line-height 1.6, max-width 480px

**Address Search Input (Primary CTA Zone):**
- Container: white pill-shaped row, border 1px solid #E5E7EB, border-radius 50px, background #FFFFFF, padding 6px 6px 6px 16px, box-shadow: 0 4px 16px rgba(0,0,0,0.08)
- Left icon: 📍 location pin SVG, color #FC8019, 20px
- Input field: placeholder "Enter your delivery address or area", Inter Regular 16px, color #6B7280, no border, outline none, background transparent, flex-grow 1, min-height 44px
- Right button: "Find Food Near Me", background #FC8019, white text, Inter SemiBold 15px, border-radius 40px, padding 12px 24px, no border
- Hover on button: background #E8720A, transform scale(1.02), box-shadow 0 4px 12px rgba(252,128,25,0.35)
- Focus state on input: container border becomes 2px solid #FC8019 with glow: `box-shadow: 0 0 0 3px rgba(252,128,25,0.15)`

**Trust Microcopy Row:**
```
✓ Instant OTP Login   ✓ Secure UPI & COD   ✓ Trusted Local Kitchens
```
- Font: 13px, color #6B7280
- Check icons: small SVG checkmarks or ✓ Unicode, color #16A34A
- Display as flex row with gap, margin-top 12px

**App Download Strip:**
- Label text: "Order faster with the Kanak FoodCoat app." (Inter Medium 14px, #374151)
- Two dark pill buttons side by side:
  - "Get it on Google Play" — black background, white text, Google Play icon (triangle logo), border-radius 12px, padding 10px 18px
  - "Download on the App Store" — black background, white text, Apple logo icon, border-radius 12px, padding 10px 18px
- Both buttons: subtle box-shadow, hover: background #1F2937

**Right Column — Hero Visual:**
- Use a large, rounded image container (border-radius 24px), overflow hidden
- Reference: image of happy young people (Indian students/families) enjoying food, overlaid with floating food images (biryani, momos, pizza, paneer)
- If real images are unavailable: render a beautiful CSS-composed placeholder with orange gradient background (#FFF3E6 to #FFEDD5), decorative food emoji or SVG illustrations, and the floating badge chips below
- **Floating badge chips** overlaid on the image:
  - Chip 1: "📍 20 km Local Delivery" — white background, border 1px solid #E5E7EB, border-radius 20px, #16A34A text, padding 6px 14px, font 13px SemiBold, box-shadow 0 2px 8px rgba(0,0,0,0.1), positioned top-left of image
  - Chip 2: "⭐ 4.7 Average Rating" — white background, #F59E0B star, border-radius 20px, positioned top-right of image
  - These chips should appear to float above the image using absolute positioning with subtle drop shadows

**Decorative floating food images** (optional enhancement): Small circular food images or illustrations of biryani bowl, momos, pizza slice floating at corners of the hero area using absolute positioning, similar to image 1's pizza on bottom-left.

---

### 1.3 Benefit Cards Row (Below Hero)
*(Inspired by reference image 2 — the three colored feature cards)*

Three horizontally arranged cards under the hero:
- Card 1 — **"Discount Vouchers"**: background #FEF9C3 (soft yellow), headline "Exclusive Offers & Deals", subtext "Save more on every order", icon: discount tag SVG, CTA arrow button
- Card 2 — **"Fresh Local Food"**: background #CFFAFE (soft teal), headline "Fresh, Hygienic Kitchens", subtext "Prepared fresh by local restaurants", icon: bowl SVG, CTA arrow button  
- Card 3 — **"Fast Home Delivery"**: background #FCE7F3 (soft pink), headline "40-Min Guaranteed", subtext "On-time every time, or we'll tell you", icon: delivery scooter SVG, CTA arrow button
- Cards: border-radius 20px, padding 28px 24px, no border, subtle shadow on hover
- Arrow button: small circle #111827, white arrow icon inside

---

## 📄 PAGE 2 — MAIN MENU / FOOD BROWSING PAGE
*(Assembled from reference images 2, 3, 4, 7 top-to-bottom)*

Same sticky navbar as Page 1 at the top.

---

### 2.1 Feature Categories Section
*(Based on reference image 3 — top portion)*

**Section Header:**
- Left: "Feature Categories" — Inter Bold 24px, #111827
- Right: "See All →" link — Inter Medium 14px, #FC8019

**Category Icons Row:**
Six circular icon buttons in a horizontal scrollable row (scroll on mobile):
- Set Menu | Hot Item | Burger | Biryani | Drinks | Pizza
- Each: circular gray background (#F3F4F6), 72px diameter, food emoji or SVG icon centered, label below in 12px Inter Medium #374151
- Hover: background #FEF3C7, border 2px solid #FC8019, label color #FC8019, smooth transition
- Active/selected: orange tinted background, orange border

---

### 2.2 Promotional Banner Cards
*(Based on reference image 3 — middle colorful offer cards)*

Three side-by-side promotional cards:
- **Card 1:** Background #EAB308 (golden yellow), white text
  - Tag: "Limited Deal"
  - Headline: "Amazing Buy 2 Biryani Get 1"
  - CTA: "Order Now →" (small, white text)
  - Price: "Starting ₹199"
  - Food image: floating biryani/pizza image, positioned bottom-right, overflow visible (clipped outside card boundary)

- **Card 2:** Background #0891B2 (teal/cyan), white text
  - Tag: "Weekend Special"
  - Headline: "Delicious Butter Paneer The Weekend"
  - CTA: "Order Now →"
  - Offer: "Up to 50% off"
  - Food image: paneer/burger floating image

- **Card 3:** Background #F97316 (orange-toned), white text  
  - Tag: "Try New"
  - Headline: "Try Our Spicy Tandoori Platter"
  - CTA: "Order Now →"
  - Offer: "Up to 10% off"
  - Food image: tandoori / pasta floating image

- Cards: border-radius 20px, equal height (~180px desktop), food images hang outside/overflow for visual pop
- Hover: slight scale(1.02), box-shadow enhancement

---

### 2.3 Regular Food Grid — "Today's Best Dishes"
*(Based on reference images 2 and 3 — food product grid)*

**Section Header:**
- Left: "Today's Best Dishes For You!" — Inter Bold 24px, #111827
- Right: "See All Products →" link in #FC8019

**Cuisine Filter Tab Bar:**
Horizontal scrollable tab row:
- Indian Cuisine (active, orange pill) | Chinese Cuisine | South Indian | Street Food | Beverages | Desserts
- Active pill: background #FC8019, white text, border-radius 20px, padding 8px 18px
- Inactive: background transparent, color #374151, hover: color #FC8019

**Food Product Cards Grid:**
4 columns on desktop, 2 on tablet, 1 on mobile. Each card:
- White background, border-radius 16px, box-shadow 0 2px 8px rgba(0,0,0,0.07), overflow hidden
- Top: Product image (square ratio 1:1, object-fit cover)
  - Top-left badge: "20% OFF" — orange background, white text, font 11px Bold
  - Top-right: Heart/wishlist icon (unfilled, #9CA3AF)
- Bottom padding: 12px
  - Category label: "Veg / Non-Veg" with green dot (🟢) or red dot (🔴), font 12px, #6B7280
  - ⭐ Rating: "4.5" in #F59E0B, font 12px
  - Product name: Inter SemiBold 15px, #111827, 2 lines max
  - Price row: Strikethrough old price in #9CA3AF, new price in #111827 Bold
  - CTA: "+ Add to Cart" pill button — white background, border 1px solid #FC8019, color #FC8019, border-radius 20px, font 13px SemiBold, hover: background #FC8019, color white

**Sample dishes to show (Indian context):**
- Chicken Biryani | Paneer Butter Masala | Aloo Paratha | Momos | Veg Fried Rice | Dal Makhani | Masala Dosa | Gulab Jamun

---

### 2.4 Customer Reviews Section
*(Based on reference image 4 — "What Our Customer Says")*

**Section Header:**
- Left: "What Our Customers Say" — Inter Bold 24px, #111827
- Rating row: 5 filled stars (⭐⭐⭐⭐⭐ in #F59E0B) | "480+ Reviews" in #6B7280
- Right: "Next →" link in #FC8019

**Review Cards — 4 horizontal cards:**
Each card (white background, border-radius 16px, padding 20px, box-shadow subtle):
- Bold title: "Order was piping hot and on time!" — Inter SemiBold 15px, #111827
- Quote text: reviewer's comment — Inter Regular 14px, #6B7280, 3–4 lines, italic
- Bottom: 5 star row (filled/partial), reviewer name "Priya S., Kanpur" — Inter Medium 14px, #374151
- Horizontal scroll on mobile, show 1–2 cards at a time

---

### 2.5 Dual Promo Banners
*(Based on reference image 4 — the two colored feature banners)*

Two side-by-side large promotional banners:

- **Banner 1:** Background #6EE7B7 (mint green), dark text
  - Icon chip: "🛵 Delivery" badge
  - Headline: "Enjoy Free Delivery Within 2 Hours" — Inter Bold 24px, #111827
  - CTA: "Order Now →" white pill button with dark border
  - Decorative: image of delivery rider in red uniform (Indian-style), positioned right
  - Border-radius: 20px, padding 32px 28px

- **Banner 2:** Background #FDE68A (warm yellow), dark text
  - Icon chip: "💳 UPI Offer" badge
  - Headline: "Get 5% Extra Off on UPI Payments" — Inter Bold 24px, #111827
  - CTA: "Order Now →" white pill button
  - Decorative: credit/debit card image or UPI logo
  - Border-radius: 20px, padding 32px 28px

---

### 2.6 Help / Support Bar
*(Based on reference image 4 — bottom orange support strip)*

Full-width horizontal bar:
- Background: #FEF3C7 (soft amber) or #FC8019 (orange)
- Left text: "Need help with your order or delivery issue?"
  - Sub-text: "Our support team is available 24 hours"
  - Font: Inter SemiBold 16px, white (if orange bg) or #111827 (if soft bg)
- Right: Phone number pill button
  - "+91 9876543210"
  - Background: white, color #FC8019 or #111827, border-radius 30px, padding 12px 24px, phone icon left
- Full-width, padding 20px 40px, border-radius 0

---

### 2.7 Footer
*(Based on reference image 7 — Onlinekaka style, dark theme)*

Full-width, dark background #111111, white text.

**Layout:** Two columns — left brand block, right links column.

**Left block:**
- Brand wordmark: **Kanak** (orange #FC8019) **FoodCoat** (white) — same split-color treatment
- Tagline: "Aapke sheher ka apna khaana app!" (Your city's very own food app)
- Font: Inter Regular 16px, color #9CA3AF
- App download buttons below (dark bordered pills, white text):
  - "GET IT ON Google Play" with Play Store triangular icon (multicolor)
  - "Download on the App Store" with Apple logo

**Right block:**
- Link list:
  - Privacy Policy
  - About Us
  - Terms & Conditions
  - Live Chat Support
  - Refund & Cancellation Policy
  - Shipping & Delivery Policy
- Font: Inter Regular 14px, color #D1D5DB, line-height 2.2
- Hover: color #FC8019

**Bottom bar** (separated by a thin horizontal line #374151):
- Left: Social icons — Instagram | Facebook (outline style, white, 24px)
- Right: "© 2025 Kanak FoodCoat. All rights reserved." — Inter Regular 13px, #9CA3AF

---

## ⚙️ TECHNICAL REQUIREMENTS

### File Structure
- Deliver as a **single `index.html`** file (or two separate `index.html` + `menu.html` if cleaner)
- All CSS inline in `<style>` tag
- All JS inline in `<script>` tag
- Google Fonts Inter loaded via CDN link in `<head>`
- No external frameworks (React, Vue, Bootstrap, Tailwind) — pure HTML/CSS/JS only

### Navigation Between Pages
- When user clicks "Order Now" (navbar), "Find Food Near Me" (hero CTA), or a nav link → smoothly transition to Page 2 (menu page)
- Implement as: `document.getElementById('page2').style.display = 'block'` + scroll to top, or use CSS class toggling
- Page 1 gets hidden, Page 2 shows with a smooth fade-in (`opacity 0 → 1`, 300ms)
- Back navigation: a "← Back to Home" breadcrumb or the Home nav link restores Page 1

### Responsive Breakpoints
- Desktop: ≥ 1024px — full two-column hero, 4-column food grid, side-by-side banners
- Tablet: 768px–1023px — adjusted columns, 2-column food grid
- Mobile: < 768px — single column everything, hero text first then image, full-width inputs, 1-column food grid

### Performance & Accessibility
- All images: use `loading="lazy"`, meaningful `alt` text
- Buttons and inputs: minimum 44px height/touch target
- Keyboard navigation: visible :focus outlines
- `prefers-reduced-motion`: wrap all CSS transitions in `@media (prefers-reduced-motion: no-preference)`
- Color contrast: all text meets WCAG AA (4.5:1 minimum)
- ARIA labels on icon-only buttons

### Micro-interactions
- CTA button hover: `transform: scale(1.02)`, color darken, shadow increase — 200ms ease
- Input focus: orange glow border — 200ms ease
- Card hover: `transform: translateY(-4px)`, shadow increase — 200ms ease
- Category pill hover: background and border color shift — 200ms ease
- Nav link hover: color #FC8019 — 200ms ease
- All transitions: `transition: all 0.2s ease`
- No janky or exaggerated animations

---

## 🖼️ IMAGERY APPROACH

Since real food photos cannot be embedded, use one of these strategies:

**Option A (Preferred):** Use placeholder services:
- `https://source.unsplash.com/400x300/?biryani` for food images  
- `https://source.unsplash.com/600x400/?indian-food` for hero visual
- `https://source.unsplash.com/80x80/?pizza` for small thumbnails

**Option B:** Use CSS-only decorative placeholders:
- Food card placeholders: rounded gray rectangles with a centered emoji (🍛, 🍕, 🍔, 🥟)
- Hero visual: gradient background (#FFF3E6 → #FFEDD5) with large centered emoji cluster or SVG art

**Option C:** Use inline SVG food illustrations (simple, line-art style) for icons and decorative elements

---

## ✅ QUALITY CHECKLIST (Verify before finalizing)

- [ ] Brand name renders as **Kanak** (orange) **FoodCoat** (green) everywhere
- [ ] Navbar is sticky, white, with Order Now CTA in orange
- [ ] Hero has address input + Find Food Near Me button that's touch-friendly (≥44px)
- [ ] Trust microcopy row with green checkmarks visible
- [ ] App store buttons present below trust row
- [ ] Floating badge chips on hero visual (20 km, 4.7★)
- [ ] Three benefit cards in pastel colors below hero
- [ ] Page 2 has feature category icons, 3 promo banners, cuisine filter tabs, food grid, reviews, dual promo banners, support bar, footer
- [ ] Footer has split-color Kanak FoodCoat wordmark, tagline in Hindi, app buttons, links, social icons, copyright
- [ ] All hover states and focus states functional
- [ ] Fully responsive (desktop, tablet, mobile)
- [ ] No layout overflow or horizontal scroll on mobile
- [ ] Inter font loading correctly from Google Fonts
- [ ] Page transition between Page 1 and Page 2 working smoothly

---

## 📝 FINAL NOTES FOR AI AGENT

1. **Brand name is sacred:** Always render `Kanak` in #FC8019 and `FoodCoat` in #16A34A (or white in dark contexts). Never merge them as one color.
2. **Indian market context:** Use ₹ (INR) for all prices, Indian dish names (Biryani, Paneer, Momos, Dosa), phone format +91, and Hindi taglines sparingly but authentically.
3. **Reference fidelity:** Page 1 hero matches image 1 (FoodSwift layout adapted). Page 2 sections match images 2→3→4→7 stacked top to bottom.
4. **No Lorem Ipsum:** All placeholder text must be contextually appropriate for an Indian food delivery startup.
5. **Single visual risk:** The split-color "Kanak FoodCoat" wordmark treatment is the signature design element — make it crisp, professional, and prominent.
