# Master Redesign Prompt — AIO (All In One Service) SMM Panel

এই ডকুমেন্টটা তোমার **allinonsr.com** সাইট সরাসরি ব্রাউজ করে (লগইন করা ড্যাশবোর্ড + লগ-আউট হোমপেজ — দুটোই) প্রতিটা মেনু, ফিচার আর ফর্ম চেক করে বানানো হয়েছে। নিচে দুটো অংশ আছে:

1. **যা পাওয়া গেছে** — তোমার সাইটে এখন যত ফিচার/ফাংশনালিটি লাইভ আছে তার সম্পূর্ণ তালিকা, এবং ডিজাইনের কী কী সমস্যা চোখে পড়েছে।
2. **মাস্টার প্রম্পট** — এই বড় ইংরেজি প্রম্পটটা কপি করে সরাসরি যেকোনো AI website builder-কে (Lovable, v0, Cursor, Claude, বা অন্য কোনো) দিলেই সে পুরো ফাংশনালিটি বজায় রেখে প্রফেশনাল রিডিজাইন করে দিতে পারবে।

> **কেন ইংরেজিতে প্রম্পট?** AI কোডিং/ডিজাইন টুলগুলো ইংরেজি প্রম্পটে সবচেয়ে ভালো ও নির্ভুল রেজাল্ট দেয়। প্রম্পটের ভেতরেই বলে দেওয়া আছে যেন UI বাংলা+ইংরেজি দুই ভাষাতেই কাজ করে।

---

## ১) সাইট অডিটে যা পাওয়া গেছে

### ক. পাবলিক হোমপেজ (লগ-আউট অবস্থায়)
- Top nav: Sign in, Services, API, Blog, Sign Up
- Hero সেকশনে ট্যাগলাইন "Main Smm PROVIDER" + সরাসরি একটা সাইনইন ফর্ম হিরোর মধ্যেই বসানো (username/email, password, Sign in, **Sign in with Google**, Forgot password)
- স্ট্যাটস বার: Total Orders counter, "Order is placing every 1 sec", Starting price ($0.001/1k)
- ফিচার/প্রমো সেকশন, "4.8/5 Trustpilot" রেটিং ব্যাজ, "Join now" CTA
- FAQ অ্যাকর্ডিয়ন সেকশন + "View All FAQ"
- "We Accept Multiple Payment Methods" সেকশন (কিন্তু আসলে কোনো পেমেন্ট লোগো রেন্ডার হচ্ছে না — খালি দেখাচ্ছে)
- Footer: লোগো, ইমেইল (allinonsr@support.com), ফোন নাম্বার, WhatsApp আইকন, Other Pages (Home/About/Api/Services/Terms & Privacy), Our Services (প্ল্যাটফর্ম লিংক), 
- একটা পার্সিস্টেন্ট ফ্লোটিং WhatsApp চ্যাট বাটন সব পেজে

### খ. অথেন্টিকেশন
- Sign in (username/email + password)
- Google দিয়ে সাইন-ইন (OAuth)
- Sign up
- Forgot password

### গ. ড্যাশবোর্ড (লগইন করার পর)
- হেডার স্ট্যাটস: Username, My Balance ($), Total Orders, Spent Balance
- প্ল্যাটফর্ম কুইক-ফিল্টার চিপস: Instagram, Facebook, Youtube, Twitter, Spotify, Tiktok, Telegram, Linkedin, Discord, Website Traffic, Others, Everythings
- সাইডবার নেভিগেশন: New order, Bulk Order, Orders History, Refill History, Services, Add funds, Tickets Support (আনরিড কাউন্ট ব্যাজসহ), Child panel, Affiliates, Updates, API, dripfeeds, Coupon code
- টপ-রাইট প্রোফাইল ড্রপডাউন: ব্যালেন্স, Settings, Terms, Faq, Logout

### ঘ. New Order (মূল অর্ডার ফর্ম)
- Category dropdown (platform অনুযায়ী)
- Service dropdown — প্রতিটা সার্ভিসের নামে ট্যাগ থাকে যেমন *[Cheapest]*, *ᴺᴱᵂ*, *[Non Drop]*, *[Real Monetizable]*, *[HQ Profiles]*, *[Refill 30D/365D/LifeTime]* ইত্যাদি (শত শত ভ্যারিয়েন্ট, ২০০+ সার্ভিস ক্যাটাগরিতে)
- Average time indicator
- Link input, Quantity input (Min/Max ভ্যালিডেশনসহ, যেমন Min:100 Max:2147483647)
- Charge auto-calculate, Submit
- ডানপাশে "Important!" প্যানেল — অর্ডার করার আগে নিয়মকানুন, Refill/No-Refill/Non-drop/Lifetime এর সংজ্ঞা, বাংলায় ডেলিভারি টাইম ও সাপোর্ট নির্দেশনা
- "Notes" ট্যাব (আলাদা তথ্য প্যানেল)

### ঙ. Bulk/Mass Order
- এক লাইনে এক অর্ডার ফরম্যাটে (`Service Id | Quantity | Link`) বাল্ক টেক্সট এরিয়া দিয়ে একসাথে অনেক অর্ডার সাবমিট

### চ. Orders History
- সার্চ বার
- স্ট্যাটাস ফিল্টার: All, Pending, In progress, Completed, Partial, Processing, Canceled
- টেবিল কলাম: ID, Date, Link, Charge, Start count, Quantity, Service, Remains, Status

### ছ. Refill History
- আলাদা মেনু আইটেম (রিফিল রিকোয়েস্টের হিস্টোরি ট্র্যাকিং)

### জ. Services (ফুল ক্যাটালগ)
- প্রতিটা সার্ভিসের ID, নাম, Min/Max, দাম (per 1000), "Order now" বাটন, "Description" বাটন
- হাজার হাজার সার্ভিস লিস্টেড, ক্যাটাগরি অনুযায়ী গ্রুপ করা

### ঝ. Add Funds (Wallet)
- Method selector: **Bkash | Nagad | Rocket | Upay** (বাংলাদেশি লোকাল অটো-পেমেন্ট গেটওয়ে)
- বাংলায় ইন্সট্রাকশন — মিনিমাম ডিপোজিট ($0.20), এক্সচেঞ্জ রেট (১ ডলার = ১৩০৳ এর মতো), ডিপোজিট বোনাস টায়ার (যেমন $50-এ 2%, $100-এ 3%, $500-এ 5%, $1000-এ...)
- Fund history টেবিল (ID, Date, Method)

### ঞ. Coupon Code
- প্রোমো/কুপন কোড রিডিম করার ইনপুট ফিল্ড

### ট. Tickets Support
- সার্চ বার
- New Ticket ফর্ম (Subject + Message)
- Ticket History প্যানেল
- আনরিড/ওপেন টিকেট কাউন্ট সাইডবারে ব্যাজ আকারে

### ঠ. Child Panel (হোয়াইট-লেবেল রিসেলার)
- ৪-ধাপের সেটআপ উইজার্ড: Step 1 ডোমেইন এন্টার, Step 2 কারেন্সি সিলেক্ট, Step 3 অ্যাডমিন ইউজারনেম, Step 4 সিকিউর পাসওয়ার্ড
- Panel configuration ফর্ম (Domain, Admin username/password, Nameserver কনফিগারেশন)

### ড. Affiliates (রেফারেল প্রোগ্রাম)
- রেফারেল লিংক জেনারেটর + Copy Link বাটন
- Commission rate (5%), Minimum payout (20)
- স্ট্যাটস: Visits, Registrations, Referrals, Conversion rate, Total earnings, Available earnings

### ঢ. Updates
- সার্ভিস-লেভেল চেঞ্জলগ (Updated ID, Service ID, Service Name, Description, Date, Action — যেমন "Cancel Button has been activated/disabled", "Refill Button has been activated")

### ণ. API
- পূর্ণাঙ্গ API ডকুমেন্টেশন পেজ: HTTP Method (POST), API URL (`/api/v2`), API Key, Response format (JSON), Service list এন্ডপয়েন্ট প্যারামিটার টেবিল, Example response

### ত. Dripfeeds
- শিডিউলড/রিকারিং অর্ডার ম্যানেজমেন্ট টেবিল (ID, Date, Link, Total charges, Quantity, Service name, Runs, Interval, Total…)

### থ. Account Settings
- User Info (Username, Email — এডিটেবল)
- Account Password Manager (Current/New/Confirm password)
- API Key Generator (Generate new বাটন, কপি বাটন, সিকিউরিটি ওয়ার্নিং)
- Language selector (বর্তমানে শুধু English দেখা গেছে, কিন্তু dropdown আছে — মাল্টি-ল্যাঙ্গুয়েজ সাপোর্টের ইঙ্গিত)

### দ. অন্যান্য
- Terms & Privacy পেজ, FAQ পেজ (আলাদা), Logout
- Blog (nav-এ লিংক আছে)

---

## ২) ডিজাইনে যেসব সমস্যা চোখে পড়েছে (রিডিজাইনে অবশ্যই ফিক্স করতে হবে)

- হোমপেজের কপিতে অন্য একটা সাইটের নাম **"smmbd24.com"** রয়ে গেছে (৩-৪ জায়গায়) — টেমপ্লেট কপি করে বসানো, নিজের ব্র্যান্ডিং আপডেট করা হয়নি। এটা বিশ্বাসযোগ্যতা নষ্ট করে।
- "We Accept Multiple Payment Methods" সেকশনে কোনো পেমেন্ট লোগোই দেখা যাচ্ছে না (খালি জায়গা)
- কিছু আইকন/স্ট্যাট বক্সে জেনেরিক/ভাঙা প্লেসহোল্ডার আইকন দেখা যায় (Affiliates statistics, ইত্যাদি) — একটা কনসিসটেন্ট আইকন সিস্টেম নেই
- পুরো ডিজাইন একটামাত্র ফ্ল্যাট বেগুনি/পার্পল রঙে, কোনো ভিজ্যুয়াল হায়ারার্কি, শ্যাডো/ডেপথ বা মডার্ন SaaS ফিল নেই
- সার্ভিস নামগুলো Unicode bold/fancy ফন্ট ট্রিক্স দিয়ে ভরা (𝗣𝗼𝘀𝘁, 𝐇𝐐 ইত্যাদি) — অপ্রফেশনাল দেখায়, স্ক্রিন-রিডার/অ্যাক্সেসিবিলিটির জন্যও খারাপ
- ডার্ক/লাইট মোড টগল নেই
- "4.8/5 Trustpilot" এর মতো ট্রাস্ট ব্যাজ আছে কিন্তু কোনো সোর্স/লিংক/ভেরিফিকেশন নেই — ভুয়া মনে হতে পারে
- মোবাইল রেসপন্সিভনেস আধুনিক দেখাচ্ছে না, টাচ টার্গেট/স্পেসিং টাইট
- Order form-এ প্রাইসিং, ট্যাগ (New/Cheapest/Non-drop) গুলো টেক্সটের মধ্যে গাদাগাদি — কার্ড/ব্যাজ স্টাইলিং নেই
- কোনো লাইভ লাইভ অর্ডার ফিড/সোশ্যাল প্রুফ প্রপারলি দেখানো হচ্ছে না
- সিকিউরিটি/পেমেন্ট সেফটি ব্যাজ (SSL, verified payment ইত্যাদি) দৃশ্যমান নয়

---

## ৩) কপি করে ব্যবহারের মাস্টার প্রম্পট (নিচেরটা পুরোটা কপি করে AI বিল্ডারে পেস্ট করো)

```
ROLE
You are a senior product designer + full-stack frontend engineer specializing in SaaS dashboards and fintech-grade UI. You are redesigning the complete frontend of an existing, live SMM (Social Media Marketing) panel — a platform where customers buy social media engagement services (followers, likes, views, comments, etc.) for Instagram, Facebook, YouTube, TikTok, Twitter/X, Telegram, LinkedIn, Discord, Spotify, WhatsApp, Threads, Snapchat, Twitch, Kick, Shopee and more, and where resellers/agencies also run white-label "child panels" on top of it.

GOAL
Completely redesign the visual design, layout, and UX of the entire site — public marketing pages AND the logged-in customer dashboard — to look like a premium, modern, trustworthy 2026 SaaS/fintech product (think Stripe, Linear, Vercel-dashboard, Wise-level polish). Do NOT remove, break, or simplify away any existing functionality. Every feature, form field, table, filter, and flow listed below must still exist and work exactly as before — you are only redesigning how it looks and how it's organized, not what it does.

FULL FUNCTIONALITY THAT MUST BE PRESERVED (redesign around this, don't cut anything)

1. Public marketing site (logged-out visitors):
   - Top navbar: Sign in, Services, API docs, Blog, Sign Up
   - Hero section with value proposition + an inline/embedded sign-in form (username-or-email, password, "Sign in", "Sign in with Google" OAuth, "Forgot password" link, link to Sign Up)
   - Trust/stats strip: total orders counter, "an order placed every N seconds" live stat, "starting from $X per 1000" pricing teaser
   - Feature highlights section explaining the service
   - Ratings/trust badge (make it real and verifiable, with a link, or replace with real testimonials — never fabricate a review score)
   - FAQ accordion + "View all FAQ" page
   - "Accepted payment methods" section with actual, correctly rendered payment/gateway logos
   - Footer: brand, contact email, phone, WhatsApp/social links, sitemap links (Home, About, API, Services, Terms & Privacy), services-by-platform links
   - Persistent floating WhatsApp / live-chat button on every page
   - Dedicated Blog listing + post pages
   - Dedicated Terms & Privacy page, dedicated FAQ page

2. Authentication:
   - Sign in (username or email + password)
   - Sign in with Google (OAuth)
   - Sign up (registration)
   - Forgot password / reset password flow

3. Dashboard shell (after login):
   - Persistent header stats: username, wallet balance (with currency), total orders count, total spent
   - Quick platform filter chips: Instagram, Facebook, YouTube, Twitter/X, Spotify, TikTok, Telegram, LinkedIn, Discord, Website Traffic, Others, "Everything"
   - Left sidebar navigation with these sections: New Order, Bulk/Mass Order, Orders History, Refill History, Services (catalog), Add Funds, Tickets Support (with unread-count badge), Child Panel, Affiliates, Updates, API, Drip-feeds, Coupon Code, Settings
   - Top-right profile menu: balance, Settings, Terms, FAQ, Logout

4. New Order flow:
   - Category selector (by platform/type)
   - Service selector — services carry inline quality/status tags such as "Cheapest", "New", "Non-drop", "Real/Monetizable", "HQ Profiles", "Refill 30D/365D/Lifetime", "No Refill" — redesign these as clean, color-coded badges instead of text clutter
   - "Average time" indicator
   - Link input field
   - Quantity input with live Min/Max validation
   - Auto-calculated charge/price display
   - Submit / "Order now" action
   - A persistent "Important / Notes" info panel explaining ordering rules, refill/non-drop/lifetime definitions, and delivery-time expectations (support bilingual English + Bengali copy)
   - Service description modal/drawer per service

5. Bulk/Mass order:
   - Multi-line text entry, one order per line in the format `ServiceID | Quantity | Link`, single submit for the whole batch

6. Orders History:
   - Search bar
   - Status filter tabs: All, Pending, In progress, Completed, Partial, Processing, Canceled
   - Table/list: ID, Date, Link, Charge, Start count, Quantity, Service, Remains, Status (with per-row actions where applicable, e.g. cancel/refill request)

7. Refill History — dedicated log of refill requests and their outcomes.

8. Services catalog page:
   - Full searchable/filterable list of all services grouped by category/platform, each row showing service ID, name, min/max order size, price per 1000, "Order now" and "Description" actions. This list is very large (hundreds/thousands of SKUs) — design for scannability: strong search, category tree/sidebar, sticky filters, virtualized/paginated table.

9. Add Funds (wallet top-up):
   - Payment method selector including local Bangladeshi auto-payment gateways: bKash, Nagad, Rocket, Upay (design real, correctly branded, tappable payment method cards — plus room for card/crypto/other gateways)
   - Clear instructions block (bilingual EN/BN), minimum deposit amount, live exchange rate display, deposit bonus tiers (e.g. bonus % at different deposit thresholds)
   - Fund history table (ID, Date, Method, Amount, Status)

10. Coupon code redemption — a simple code input + apply action, with success/error feedback state.

11. Tickets Support:
    - Search existing tickets
    - "New ticket" form (Subject, Message, optional attachment)
    - Ticket history/thread list with status and unread badge

12. Child Panel (white-label reseller module):
    - 4-step guided setup wizard: (1) enter domain, (2) select currency, (3) set admin username, (4) create secure password
    - Panel configuration form (domain, admin credentials, nameserver setup guidance)

13. Affiliates / referral program:
    - Unique referral link with one-click copy
    - Commission rate and minimum payout displayed
    - Stats dashboard: visits, registrations, referrals, conversion rate, total earnings, available earnings, with a payout/withdraw action

14. Updates / service changelog — a transparency log of service-level changes (e.g., cancel/refill availability toggled on specific services, with timestamps).

15. API section:
    - Full API documentation: HTTP method, base URL, auth via API key, JSON response format, endpoint/parameter tables (services list, add order, order status, multi-status, balance, refill, cancel — the standard SMM-panel API action set), example requests/responses, and a code-block/copy UI
    - Ties into Settings → API Key Generator (generate new key, copy key, with a security warning about not sharing it)

16. Drip-feed management:
    - Table of scheduled/recurring orders: ID, date, link, total charge, quantity, service name, runs, interval, totals, with status/controls

17. Account Settings:
    - User info (username, email — editable)
    - Password manager (current/new/confirm password)
    - API key generator
    - Language selector (must visibly support at least English + Bengali, with easy room to add more)

DESIGN DIRECTION (apply throughout, both marketing site and dashboard)
- Modern SaaS/fintech aesthetic: generous whitespace, clear typographic hierarchy, soft elevation/shadows, rounded but restrained corners, a refined color system (a primary brand color + neutral grays + semantic colors for success/warning/error/info) — move away from the current flat, single-purple, dated look.
- Ship both light and dark theme, with a visible theme toggle.
- Fully responsive, mobile-first — most customers place orders from their phone, so the New Order flow, wallet top-up, and support ticket flow must be flawless on small screens.
- Consistent icon system (one icon library used everywhere, no missing/broken icon glyphs, no generic placeholder squares).
- Replace decorative Unicode "fancy bold" characters in service names with normal typography + real styled badge components for tags like "Cheapest", "New", "Non-drop", "Refill", "Real".
- Real, correctly rendered payment-method logos (bKash, Nagad, Rocket, Upay, plus space for card/crypto if applicable) — never leave a logo slot empty/broken.
- Trust and credibility elements: only show ratings/testimonials that are real and attributable; add visible security/payment-safety indicators; show live/rolling stats tastefully, not as raw unstyled numbers.
- Clear empty states, loading skeletons, and success/error toast notifications across all forms (New Order, Bulk Order, Add Funds, Coupon, Tickets, Settings).
- Sticky/persistent balance + quick "New Order" CTA so users are never far from ordering.
- Accessible: WCAG AA color contrast minimum, keyboard-navigable menus and forms, proper form labels.
- Remove all leftover template/placeholder branding text from any other product name — every piece of copy must reflect this business's own brand only.
- Bilingual-ready copy (English + Bengali) for instructional/help text, matching how the current site already mixes both languages for its Bangladeshi user base.

CONSTRAINTS
- This is a redesign, not a feature rebuild: preserve every route, every form field, every table column, and every existing user flow listed above.
- Do not invent fake metrics, fake review scores, or fake testimonials — flag anything currently fake (like the unsourced "4.8/5 Trustpilot" badge) and either make it real/sourced or replace it with an honest alternative (e.g., real order-volume stat, real uptime stat).
- If backend/API contracts are unknown, design the frontend to be data-driven (assume the same fields/endpoints already described above) rather than hardcoding.
- Ask clarifying questions only if something here is ambiguous; otherwise proceed and deliver a complete, cohesive redesign covering the public site + the full dashboard listed above.

DELIVERABLE
A complete redesigned UI (component library/design system + all pages/screens listed above: public home, sign in/up, dashboard home, new order, bulk order, orders history, refill history, services catalog, add funds, coupon code, tickets support, child panel setup, affiliates, updates, API docs, drip-feeds, settings) that is visually cohesive, modern, trustworthy, mobile-first, and keeps 100% of the current functionality intact.
```

---

## এই প্রম্পট কীভাবে ব্যবহার করবে

1. উপরের কোড ব্লকের পুরো টেক্সটটা কপি করো (শুধু ইংরেজি প্রম্পট অংশ, ট্রিপল-ব্যাকটিক এর ভিতরেরটা)।
2. যে AI website builder ব্যবহার করবে (Lovable / v0 / Cursor / Claude ইত্যাদি) তার প্রথম মেসেজ হিসেবে এটা পেস্ট করে দাও।
3. যদি টুল তোমার স্ক্রিনশট নিতে দেয়, তাহলে সাথে বর্তমান সাইটের ২-৩টা স্ক্রিনশট (হোমপেজ, ড্যাশবোর্ড, নিউ অর্ডার পেজ) অ্যাটাচ করে দিলে আরও ভালো রেজাল্ট পাবে।
4. রেজাল্ট আসার পর ধাপে ধাপে ফিডব্যাক দাও — যেমন "sidebar আরেকটু কম্প্যাক্ট করো", "bKash/Nagad লোগো এভাবে বসাও" ইত্যাদি — একবারে পুরো সাইট রিডিজাইন না চেয়ে সেকশন ধরে ধরে রিভিউ করলে কোয়ালিটি ভালো হবে।

---

*এই ডকুমেন্টটা allinonsr.com সাইট সরাসরি ভিজিট করে (ড্যাশবোর্ড লগইন করা অবস্থাসহ) বানানো হয়েছে, তাই এখানে যা আছে তা তোমার সাইটের প্রকৃত বর্তমান ফিচারের সাথে মিলবে। ভবিষ্যতে সাইটে নতুন ফিচার যোগ হলে এই ডকুমেন্টে সেটা যোগ করে নিও।*
