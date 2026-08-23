# Master Redesign Prompt — AIO (All In One Service) Admin Panel

এই ডকুমেন্টটা তোমার **allinonsr.com/admin** প্যানেল সরাসরি ব্রাউজ করে — Dashboard, Users, Orders, Services, Providers/Sellers, Payment Methods, Modules, Broadcasts, Reports, Promotion, Child Panels, Manager (স্টাফ/রোল), Currency Manager, Google & Support, Appearance/Themes — প্রতিটা সেকশন চেক করে বানানো হয়েছে।

দুটো অংশ আছে:

1. **অ্যাডমিন প্যানেলে এখন যা যা আছে** — বাস্তবে ঘুরে দেখে পাওয়া সম্পূর্ণ ফাংশনালিটি লিস্ট, আর ডিজাইন সমস্যা।
2. **যা নাই কিন্তু প্রফেশনাল SMM প্যানেলে থাকা উচিত** — ইন্ডাস্ট্রি স্ট্যান্ডার্ড অনুযায়ী মিসিং ফিচার, যেগুলো মাস্টার প্রম্পটে যোগ করে দেওয়া হয়েছে যাতে redesign-এর সময় এগুলাও অ্যাড হয়।
3. **কপি-পেস্ট মাস্টার প্রম্পট** — নিচের ইংরেজি প্রম্পট AI বিল্ডারকে দিলে সে বর্তমান সব ফাংশনালিটি রেখে + নতুন দরকারি ফিচার যোগ করে প্রফেশনাল অ্যাডমিন প্যানেল রিডিজাইন করে দেবে।

> এই প্যানেলটা মূলত **TECHSMM** নামের একটা রেডিমেড SMM প্যানেল স্ক্রিপ্টের উপর বানানো (Appearance → Themes-এ "TECHSMM Active" লেখা দেখা গেছে)। রিডিজাইন করানোর সময় AI টুলকে এটাও জানিয়ে রাখা ভালো, যাতে সে বুঝতে পারে এটা একটা প্রতিষ্ঠিত ব্যাকএন্ড স্ট্রাকচারের উপর কাজ করছে।

---

## ১) অ্যাডমিন প্যানেলে বাস্তবে যা যা পাওয়া গেছে

### ক. Dashboard
- ৪টা স্ট্যাট কার্ড: Total Users, Total Orders, Failed Orders, Payments (কার্টুন-স্টাইল ক্লিপআর্ট আইকনসহ)
- "Page Shortcuts" প্যানেল: Manage Users, Manage Orders, Refill and Cancel Tasks, Manage Broadcasts, Manage Fake Orders, Manage Currencies, Manage Sellers, Manage Themes, Payment Methods — এগুলো কুইক-লিংক শর্টকাট
- কোনো চার্ট/গ্রাফ নেই ড্যাশবোর্ডে (যদিও Reports সেকশনে ডেটা আছে)

### খ. Users
- **Users list**: Add user, Backup users, Send Notification (bulk), প্রতিটা ইউজারের ID, Username, Email, Balance, Spent, Orders count, Services count, Discount %, Special Pricing flag, Registered Date, Actions
- **Fund Add History**: সব ইউজারের ডিপোজিট হিস্টোরি এক জায়গায়
- **Special Pricing**: নির্দিষ্ট ইউজারের জন্য কাস্টম প্রাইসিং সেট করার সিস্টেম (VIP/reseller discount)

### গ. Services
- **Services list**: New Service, New Subscription, New Category, Import Services, batch operations (bulk select)
- প্রতিটা সার্ভিসের: ID, নাম, Service Type, Refill toggle, Cancel toggle, Provider (যেমন my.smmgen.com), **Sell Price vs Provider Cost Price** (দুটো আলাদা দাম — প্রফিট মার্জিন ম্যানেজমেন্ট), Min/Max, Status (Enabled/Disabled), Options
- **Update Prices**: বাল্ক প্রাইস আপডেট টুল
- **Bulk Services Editor**: একসাথে অনেক সার্ভিস এডিট
- **Category Sort**: ক্যাটাগরি অর্ডারিং/ড্র্যাগ-ড্রপ সর্ট
- **Synced Logs**: প্রোভাইডার থেকে সিঙ্ক হওয়া সার্ভিসের লগ

### ঘ. Orders
- স্ট্যাটাস ট্যাব: All Orders, Awaiting, Pending, Processing, Inprogress, Completed, Partial, Canceled, Fail
- সার্চ: Order ID / Order URL / Username দিয়ে
- Bulk Actions (multi-select করে একসাথে অ্যাকশন)
- প্রতিটা অর্ডারে: ID, User, **Charge (গ্রাহক থেকে নেওয়া দাম) vs Profit (লাভ)**, Link, Seller/Provider নাম, Start count, Quantity, Service, Status, Remains, Date, Mode (Auto/Manual), Options
- **Order Refill and Cancel Tasks**: রিফিল/ক্যান্সেল রিকোয়েস্ট প্রসেসিং কিউ

### ঙ. Tickets
- সাপোর্ট টিকেট ইনবক্স (অ্যাডমিন সাইড রিপ্লাই/স্ট্যাটাস ম্যানেজমেন্ট)

### চ. Additionals (dropdown-এ যা যা আছে)
- **Affiliates**: রেফারেল প্রোগ্রাম অ্যাডমিন ভিউ
- **Broadcasts**: "Create Notifications" — Title, Type, Action Link, All Users টার্গেট, Date Expiry, Status সহ ইন-অ্যাপ অ্যানাউন্সমেন্ট বানানোর টুল
- **Logs**: সিস্টেম লগ
- **Reports**: Profit from Orders, Earning from Payments, Number of Orders — বছর ও সার্ভিস-ভিত্তিক ফিল্টার করে অ্যানালিটিক্স (কিন্তু চার্ট ভিজ্যুয়ালাইজেশন নেই, টেক্সট/টেবিল আকারে)
- **Promotion**: ইউজারদের সাবমিট করা প্রোমো ভিডিও লিংক রিভিউ/অ্যাপ্রুভ করার কিউ (ID, User, link, Note, Status, Action)
- **Coupon Code**: কুপন ম্যানেজমেন্ট
- **Child Panels**: সব চাইল্ড প্যানেলের লিস্ট — ID, User, Domain, Created At, Status, Actions
- **Updates**: সার্ভিস চেঞ্জলগ (ইউজার সাইডেও দেখা যায়)
- **Payment Notifications**: ব্যাংক/ম্যানুয়াল পেমেন্ট নোটিফিকেশন ইনবক্স

### ছ. Appearance
- **Themes**: একাধিক থিম অপশন (বর্তমানে "TECHSMM" অ্যাক্টিভ), থিম কালার কাস্টমাইজেশন (Summary card background color, Theme colour, Fixed colour)
- **Pages**: কাস্টম পেজ ম্যানেজমেন্ট
- **Announcement**: সাইট-ওয়াইড অ্যানাউন্সমেন্ট ব্যানার
- **Meta (SEO) Settings**: টাইটেল/ডেসক্রিপশন/মেটা ট্যাগ কন্ট্রোল
- **Blogs**: ব্লগ পোস্ট ম্যানেজমেন্ট (CMS)
- **Menu**: নেভিগেশন মেনু এডিটর
- **Languages**: মাল্টি-ল্যাঙ্গুয়েজ ম্যানেজমেন্ট
- **Integrations**: থার্ড-পার্টি ইন্টিগ্রেশন
- **Uploaded Images**: মিডিয়া লাইব্রেরি

### জ. Settings
- **General Settings**: Site Logo/Favicon আপলোড, Maintenance mode, Panel name, মেম্বারশিপ র‍্যাংক থ্রেশহোল্ড (Bronze/Silver/Gold/Reseller — খরচের উপর ভিত্তি করে), Password reset (SMS/Email দুই চ্যানেলেই), Ticket system কনফিগ (max pending tickets), Signup page toggle, Name/Skype fields toggle, Email Confirmation toggle, **Transfer funds percentage** (ইউজার-টু-ইউজার ব্যালেন্স ট্রান্সফার ফি), Resend link max, Service List visibility (guest vs logged-in), Average time toggle, custom **Header/Footer code injection** (মার্কেটিং পিক্সেল/স্ক্রিপ্টের জন্য)
- **Sellers (Providers)**: আপস্ট্রিম API প্রোভাইডার ম্যানেজমেন্ট — Add new Provider, প্রতিটার Balance ট্র্যাকিং
- **Payment Methods**: ৩০+ প্রি-ইন্টিগ্রেটেড গেটওয়ে অপশন (bKash/Nagad/Rocket/Upay auto, PayTM, Binance, Perfect Money, Stripe, Coinbase Commerce, Payeer, Razorpay, PhonePe, Easypaisa, Jazzcash, Alipay, PayU, Flutterwave ইত্যাদি) — প্রতিটার জন্য আলাদা Min/Max লিমিট এডিট করা যায়
- **Modules**: ফিচার টগল — Affiliate System (কমিশন রেট + মিনিমাম পেআউট), Child Panel Selling (বেস প্রাইস সহ — চাইল্ড প্যানেল বিক্রি করে আলাদা রেভিনিউ), Free Balance (সাইনআপ বোনাস), Video Promotion, Updates Logs, Mass Order, Google Login
- **Support Settings**: টিকেট সাবজেক্ট টেমপ্লেট ম্যানেজমেন্ট
- **Site Currency Manager**: মাল্টি-কারেন্সি — Rate, Inverse Rate, Symbol, Symbol Position, Auto-update rates (শেষ আপডেট টাইমস্ট্যাম্পসহ), Activate/Deactivate/Delete পার-কারেন্সি
- **Notification Settings**: অ্যালার্ট কনফিগ
- **Google & Support**: Google Sign-In OAuth (Client ID/Secret/Redirect URL), WhatsApp/Telegram সাপোর্ট লিংক, ফুটার কন্টাক্ট ইনফো
- **Fake Orders**: শুরুতে দেখানো "Total Orders" কাউন্টার বাড়ানোর সেটিং (সোশ্যাল প্রুফের জন্য একটা বেস নাম্বার সেট করা যায়)

### ঝ. Manager
- Super Admin + Staff — একাধিক অ্যাডমিন/স্টাফ অ্যাকাউন্ট বানানো যায়, Name/Email/Username/Status/Created at/Last Login দেখা যায়, Add Admin বাটন

### ঞ. Account
- অ্যাডমিনের নিজের প্রোফাইল/পাসওয়ার্ড সেটিংস

---

## ২) ডিজাইন সমস্যা (অ্যাডমিন প্যানেল)

- পুরো UI টা পুরনো Bootstrap-স্টাইল admin থিম — flat সাদা ব্যাকগ্রাউন্ড, সাধারণ টপ-নেভবার ড্রপডাউন, কোনো সাইডবার নেভিগেশন নেই যা বড় প্যানেলের জন্য নেভিগেট করা কঠিন করে তোলে
- ড্যাশবোর্ডের স্ট্যাট কার্ডে শিশুসুলভ/জেনেরিক ক্লিপআর্ট-স্টাইল আইকন (কার্ট, ক্রেডিট কার্ড ইলাস্ট্রেশন) — একটা ফিনান্সিয়াল/অ্যাডমিন টুলের জন্য অপ্রফেশনাল দেখায়
- Reports সেকশনে ডেটা থাকলেও কোনো চার্ট/গ্রাফ ভিজ্যুয়ালাইজেশন নেই — শুধু সংখ্যা
- ড্যাশবোর্ডে কোনো রিয়েল-টাইম নোটিফিকেশন বেল/অ্যালার্ট সিস্টেম নেই (নতুন টিকেট, ফেইলড অর্ডার, লো প্রোভাইডার ব্যালেন্স ইত্যাদির জন্য)
- গ্লোবাল সার্চ নেই (ইউজার/অর্ডার/টিকেট একসাথে খোঁজার কোনো উপায় নেই, প্রতিটা আলাদা পেজে গিয়ে খুঁজতে হয়)
- ডার্ক মোড নেই
- টেবিলগুলো ডেটা-ডেন্স কিন্তু ভিজ্যুয়ালি flat — sticky header, row hover, zebra striping, column sort নেই বলে মনে হচ্ছে
- মোবাইল থেকে ব্যবহার করা কঠিন হবে এমন লেআউট (রেসপন্সিভ অপ্টিমাইজেশন নেই)
- কোনো ব্রেডক্রাম্ব/কনটেক্সট ইন্ডিকেটর নেই — গভীর সেটিংস পেজে (যেমন Settings → Payment Methods) কোথায় আছি বোঝা কঠিন

---

## ৩) মিসিং কিন্তু প্রফেশনাল SMM প্যানেলে থাকা উচিত এমন ফিচার

ইন্ডাস্ট্রির ভালো SMM প্যানেলগুলো (এবং সাধারণভাবে যেকোনো সিরিয়াস ফিনটেক/SaaS অ্যাডমিন প্যানেল) যা রাখে কিন্তু এখানে দেখা যায়নি — এগুলো মাস্টার প্রম্পটে যোগ করা হয়েছে:

- **অ্যানালিটিক্স ড্যাশবোর্ড উইথ চার্ট**: রেভিনিউ ট্রেন্ড, অর্ডার ভলিউম ট্রেন্ড, টপ-সেলিং সার্ভিস, প্ল্যাটফর্ম-ভিত্তিক প্রফিট মার্জিন, ইউজার গ্রোথ — লাইন/বার/পাই চার্ট আকারে
- **রিয়েল-টাইম অ্যালার্ট/নোটিফিকেশন সেন্টার**: লো প্রোভাইডার ব্যালেন্স, নতুন টিকেট, ফেইলড অর্ডার স্পাইক, প্রোভাইডার সিঙ্ক ফেইলিওর — টপ নেভে বেল আইকন + ইমেইল/টেলিগ্রাম বট অ্যালার্ট অপশন
- **টু-ফ্যাক্টর অথেন্টিকেশন (2FA)** অ্যাডমিন লগইনের জন্য, এবং ঐচ্ছিক IP whitelist — যেহেতু এই প্যানেল সরাসরি টাকা ও কাস্টমার ডেটা হ্যান্ডেল করে, এটা সিকিউরিটির দিক থেকে জরুরি
- **গ্র্যানুলার রোল/পারমিশন সিস্টেম**: এখন শুধু Super Admin/Staff — একটা পারমিশন ম্যাট্রিক্স থাকা উচিত (যেমন একজন স্টাফকে শুধু Tickets, আরেকজনকে শুধু Orders access দেওয়া)
- **অ্যাডমিন অ্যাক্টিভিটি অডিট লগ**: কোন অ্যাডমিন কখন কী পরিবর্তন করেছে (প্রাইস চেঞ্জ, ইউজার ব্যালেন্স এডিট, সার্ভিস ডিসেবল ইত্যাদি) তার আলাদা ট্রেইল — বর্তমান "Logs" সম্ভবত শুধু সিঙ্ক লগ, অ্যাডমিন-অ্যাকশন লগ না
- **প্রোভাইডার হেলথ মনিটরিং + অটো-ফেইলওভার**: কোনো প্রোভাইডার বারবার ফেইল করলে বা ব্যালেন্স শেষ হয়ে গেলে অটোমেটিক অ্যালার্ট, এবং সম্ভব হলে একই সার্ভিসের জন্য ব্যাকআপ প্রোভাইডারে অটো-সুইচ
- **গ্লোবাল সার্চ / কমান্ড প্যালেট**: টপ থেকে ইউজার/অর্ডার/টিকেট/সার্ভিস যেকোনো কিছু এক জায়গা থেকে খোঁজা
- **CSV/Excel এক্সপোর্ট**: ইউজার লিস্ট, অর্ডার লিস্ট, রিপোর্ট — সব জায়গায় এক্সপোর্ট বাটন
- **বাল্ক ইউজার অ্যাকশন**: সাসপেন্ড/ব্যান/মাস ব্যালেন্স অ্যাডজাস্ট (এখন শুধু bulk notification আছে)
- **ফ্রড/ডুপ্লিকেট অ্যাকাউন্ট ডিটেকশন**: একই IP/ডিভাইস থেকে একাধিক অ্যাকাউন্ট রেজিস্ট্রেশন ফ্ল্যাগ করা, চার্জব্যাক ট্র্যাকিং
- **SLA/রেসপন্স টাইম ট্র্যাকিং টিকেটে**: কতক্ষণে রিপ্লাই দেওয়া হচ্ছে তার মেট্রিক
- **টপ ক্লায়েন্ট/LTV রিপোর্ট**: সবচেয়ে বেশি খরচ করা ইউজারদের র‍্যাংকিং
- **ওয়েবহুক/পেমেন্ট গেটওয়ে কলব্যাক লগ ভিউয়ার**: পেমেন্ট গেটওয়ে থেকে আসা রেসপন্স ডিবাগ করার জন্য
- **ব্যাকআপ/রিস্টোর সিস্টেম বিস্তৃত করা**: এখন শুধু "Backup users" আছে, পুরো সিস্টেম ব্যাকআপ/রিস্টোর পয়েন্ট থাকা ভালো
- **ডার্ক মোড + মোবাইল-রেসপন্সিভ অ্যাডমিন লেআউট**

---

## ৪) কপি করে ব্যবহারের মাস্টার প্রম্পট (অ্যাডমিন প্যানেল)

```
ROLE
You are a senior product designer + full-stack frontend engineer specializing in SaaS admin dashboards and fintech-grade back-office tools. You are redesigning the complete admin panel of an existing, live SMM (Social Media Marketing) reseller platform. This admin panel is used by the business owner and staff to manage customers, orders, service catalog, upstream API providers, payments, and site configuration — it is NOT the customer-facing dashboard (that has already been redesigned separately).

GOAL
Completely redesign the visual design, information architecture, and UX of the admin panel to look like a premium, modern, secure 2026 back-office/SaaS admin product (think Stripe Dashboard, Linear, Retool, Metabase-level polish). Preserve 100% of existing functionality listed below — this is a redesign of presentation and workflow ergonomics, not a rebuild of business logic. Additionally, implement the "recommended additions" section as new, clearly-separated features, since they are currently missing but expected in a professional SMM panel admin tool.

EXISTING FUNCTIONALITY THAT MUST BE PRESERVED

1. Dashboard: summary stat cards (Total Users, Total Orders, Failed Orders, Payments) and a "Page Shortcuts" quick-links panel to the most-used admin pages.

2. Users module:
   - Full user list: ID, username, email, balance, total spent, order count, service count, discount %, special-pricing flag, registration date, row actions
   - Add user, backup users (export), send bulk notification to users
   - Fund Add History: all users' deposit transaction history in one view
   - Special Pricing: per-user custom pricing overrides (for VIP/reseller clients)

3. Services module:
   - Full service catalog admin: add new service, new subscription-type service, new category, import services (bulk import, likely from provider), batch/bulk select operations
   - Per-service: ID, name, service type, refill toggle, cancel toggle, upstream provider, **sell price vs. provider cost price** (margin management), min/max order size, enabled/disabled status
   - Bulk price update tool, bulk services editor, drag/drop category ordering, provider-sync logs viewer

4. Orders module:
   - Status tabs: All, Awaiting, Pending, Processing, In-progress, Completed, Partial, Canceled, Fail
   - Search by order ID, order URL, or username
   - Bulk multi-select actions
   - Per-order: ID, user, **charge vs. profit**, target link, upstream provider/seller, start count, quantity, service, status, remains, date, fulfillment mode (auto/manual)
   - Dedicated Refill & Cancel Tasks queue for processing refill/cancel requests

5. Tickets: admin-side support inbox to view and reply to customer tickets.

6. Additional modules:
   - Affiliates admin view (referral program oversight)
   - Broadcasts: create in-app announcements/notifications with title, type, action link, target audience, expiry date, status
   - Logs: system/sync activity log
   - Reports: profit from orders, earning from payments, number of orders — filterable by year and by service (currently text/table based, no charts)
   - Promotion queue: review and approve/reject user-submitted promotional video links (tied to a "Video Promotion" reward module)
   - Coupon code management
   - Child Panels admin: list of all reseller white-label child panels with owner, domain, creation date, status
   - Updates: service-level changelog
   - Payment Notifications: inbox for manual/bank payment confirmations

7. Appearance module:
   - Theme selection and color customization (summary card background, theme color, fixed color)
   - Custom pages management, site-wide announcement banner, SEO meta settings, built-in blog/CMS, navigation menu editor, multi-language management, third-party integrations, uploaded media library

8. Settings module:
   - General: site logo/favicon upload, maintenance mode toggle, panel name/branding, spend-based membership rank thresholds (Bronze/Silver/Gold/Reseller), password reset channels (SMS + email), ticket system limits, signup page toggle, optional name/Skype fields, email confirmation toggle, user-to-user fund transfer fee percentage, resend-link limits, service list visibility (guest vs. logged-in only), average-time display toggle, custom header/footer code injection
   - Sellers/Providers: manage upstream API providers used for drop-shipping order fulfillment, each with a tracked account balance
   - Payment Methods: 30+ pre-integrated gateway options (local Bangladeshi auto gateways bKash/Nagad/Rocket/Upay, plus PayTM, Binance, Perfect Money, Stripe, Coinbase Commerce, Payeer, Razorpay, PhonePe, Easypaisa, Jazzcash, Alipay, PayU, Flutterwave, and more), each independently configurable with min/max transaction limits
   - Modules: feature toggles for Affiliate System (with commission rate + minimum payout), Child Panel Selling (with a base sale price — this is its own revenue stream), Free Balance signup bonus, Video Promotion, Updates Logs, Mass Order, Google Login
   - Support Settings: ticket subject templates
   - Site Currency Manager: multi-currency support with rate, inverse rate, symbol, symbol position, automatic rate updates with last-updated timestamp, per-currency activate/deactivate/delete
   - Notification Settings: alert configuration
   - Google & Support: Google Sign-In OAuth config (client ID/secret/redirect URL), WhatsApp/Telegram support links, footer contact info
   - Fake Orders: a configurable base number to inflate the public "total orders" counter shown on the marketing site

9. Manager: multi-admin/staff account management with Super Admin and Staff roles, showing name/email/username/status/created date/last login, with an "Add Admin" flow.

10. Account: the logged-in admin's own profile/password settings.

RECOMMENDED NEW FEATURES TO ADD (currently missing, expected in a professional SMM panel admin tool — implement these as new, clearly-labeled additions, not replacements of the above)

- A real analytics dashboard with actual charts/graphs: revenue trend over time, order volume trend, top-selling services, per-platform/per-category profit margin breakdown, user growth — not just raw numbers in tables.
- A real-time notification/alert center (bell icon in the top nav) covering: low provider balance, new support tickets, spikes in failed orders, provider sync failures — with optional email/Telegram-bot alert delivery.
- Two-factor authentication (2FA) for admin login, and optional IP allow-listing for admin panel access — this panel handles money and customer data, so this is a security priority.
- A granular role/permission matrix beyond just "Super Admin / Staff" — e.g., a staff member can be scoped to only Tickets, or only Orders, or read-only Reports access.
- An admin activity audit log distinct from the existing sync/system log: who (which admin) changed what (price edits, user balance adjustments, service enable/disable, settings changes) and when.
- Provider health monitoring with automatic alerting when a provider repeatedly fails or runs low on balance, and — where feasible — automatic failover to a backup provider for the same service.
- A global search / command palette accessible from anywhere in the admin panel to jump straight to a user, order, ticket, or service by ID/keyword.
- CSV/Excel export on every major list view (users, orders, reports, payments).
- Bulk user actions beyond notifications: suspend, ban, mass balance adjustment.
- Basic fraud/duplicate-account detection signals (same IP/device registering multiple accounts) and chargeback/dispute tracking for card payments.
- Ticket SLA / response-time tracking.
- A "top clients by lifetime spend" report view.
- A webhook/payment-gateway callback log viewer for debugging payment integration issues.
- A more complete backup & restore system (currently only "backup users" exists; extend to full-system backup/restore points).
- Full dark mode and a genuinely responsive, usable-on-mobile admin layout.

DESIGN DIRECTION
- Replace the current flat, dated Bootstrap-admin look and generic cartoon-clipart stat icons with a clean, modern back-office aesthetic: a persistent left sidebar (collapsible) instead of only top-nav dropdowns, clear information hierarchy, data-dense-but-legible tables (sticky headers, sortable columns, row hover states, zebra striping where helpful), consistent iconography from a single icon set, and a refined color system with light + dark themes.
- Every stat card and report should prefer a real chart/sparkline over a bare number where trend-over-time is meaningful.
- Add breadcrumbs so deep settings pages (e.g., Settings → Payment Methods) are easy to orient within.
- Keep the same information density admins rely on for fast operations (this is a power-user tool, not a marketing page) — prioritize speed, scanability, and keyboard-friendliness over decorative whitespace.
- Fully responsive so the owner can check orders/tickets/provider balance from a phone.
- Accessible: WCAG AA contrast, keyboard navigation, proper form labeling.

CONSTRAINTS
- This is a redesign plus additive feature set — do not remove or break any existing module, form field, table column, or workflow listed in "EXISTING FUNCTIONALITY."
- Treat backend/data contracts as unknown; design the frontend to be data-driven rather than hardcoding values, and clearly flag where new backend support (e.g., 2FA, audit log, provider failover) would be needed.
- Do not fabricate data in the redesigned UI — use realistic placeholder/sample data clearly marked as such.

DELIVERABLE
A complete redesigned admin panel UI (design system + all modules/pages listed above, including the recommended new additions) that is visually cohesive, secure-feeling, fast to operate, mobile-usable, and keeps 100% of current functionality intact while closing the gaps listed in "RECOMMENDED NEW FEATURES TO ADD."
```

---

## ব্যবহারের নির্দেশনা

1. উপরের কোড ব্লকের পুরো ইংরেজি প্রম্পটটা কপি করো।
2. AI বিল্ডারকে (Lovable / v0 / Cursor / Claude) দেওয়ার সময় আগে পাঠানো **কাস্টমার-facing প্যানেলের প্রম্পটটাও** একসাথে দিতে পারো — দুটো মিলিয়ে সে বুঝবে পুরো প্রোডাক্টের প্যাটার্ন/ডিজাইন সিস্টেম কনসিসটেন্ট রাখতে হবে (একই কালার/টাইপোগ্রাফি/কম্পোনেন্ট স্টাইল যেন কাস্টমার প্যানেল আর অ্যাডমিন প্যানেলে মেলে)।
3. Settings/Payment Methods/Modules-এর মতো পেজগুলো অনেক গভীর এবং ডেটা-ভারী — একবারে পুরো অ্যাডমিন প্যানেল না চেয়ে মডিউল ধরে ধরে (Dashboard → Users → Orders → Services → Settings) রিভিউ করে এগোলে রেজাল্ট আরও নির্ভুল হবে।
4. "RECOMMENDED NEW FEATURES" অংশে যা আছে (2FA, audit log, provider failover ইত্যাদি) — এগুলোর কিছু কিছুর জন্য ব্যাকএন্ড/ডাটাবেজেও পরিবর্তন লাগবে, শুধু ফ্রন্টএন্ড রিডিজাইন দিয়ে পুরোপুরি হবে না। এই অংশটা ডেভেলপারকে (বা পরে TECHSMM স্ক্রিপ্ট প্রোভাইডারকে) আলাদাভাবে দেখানো দরকার হতে পারে।

---

*এই ডকুমেন্টটা allinonsr.com/admin প্যানেল সরাসরি ভিজিট করে বানানো হয়েছে, তাই এখানে যা আছে তা তোমার প্যানেলের প্রকৃত বর্তমান ফিচারের সাথে মিলবে। নতুন মডিউল যোগ হলে এই ডকুমেন্ট আপডেট করে নিও।*
