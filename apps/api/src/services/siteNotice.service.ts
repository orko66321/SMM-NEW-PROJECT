import { prisma } from "../lib/prisma.js";
import type { UpdateSiteNoticeInput } from "@smm/shared";

// Singleton row, same lazy-upsert-on-first-read pattern as settings.service.ts.
const NOTICE_ID = "default";

// Seeded on first read so the box shows the same copy it always has —
// the point of this feature is making it admin-editable, not blanking it
// out until an admin happens to open the new settings page.
const SEED_TITLE_EN = "Important";
const SEED_TITLE_BN = "গুরুত্বপূর্ণ তথ্য";
const SEED_BODY_EN = [
  "Prices are always calculated by the server at order time — the estimate above is indicative only.",
  "Refill: eligible for a free refill if the count drops within the refill window.",
  "No Cancel: once started, this order cannot be canceled for a refund.",
  "Please double-check the link and quantity before ordering — an order placed against the wrong link cannot be refunded.",
].join("\n\n");
const SEED_BODY_BN = [
  "দাম সবসময় সার্ভার অর্ডারের সময় হিসাব করে — উপরের এস্টিমেট শুধু ধারণা দেওয়ার জন্য।",
  "রিফিল: রিফিল উইন্ডোর মধ্যে কাউন্ট কমে গেলে ফ্রি রিফিলের জন্য যোগ্য।",
  "ক্যানসেল নেই: একবার শুরু হয়ে গেলে এই অর্ডার রিফান্ডের জন্য ক্যানসেল করা যাবে না।",
  "অর্ডার করার আগে লিংক ও কোয়ান্টিটি ভালোভাবে চেক করে নিন। ভুল লিংকে অর্ডার করলে রিফান্ড দেওয়া সম্ভব নয়।",
].join("\n\n");

async function ensureNotice() {
  return prisma.siteNotice.upsert({
    where: { id: NOTICE_ID },
    update: {},
    create: {
      id: NOTICE_ID,
      titleEn: SEED_TITLE_EN,
      titleBn: SEED_TITLE_BN,
      bodyEn: SEED_BODY_EN,
      bodyBn: SEED_BODY_BN,
    },
  });
}

/** Admin-facing — full row including isActive, so the edit form can prefill it even while off. */
export async function getAdminSiteNotice() {
  return ensureNotice();
}

export async function updateSiteNotice(input: UpdateSiteNoticeInput) {
  await ensureNotice();
  await prisma.siteNotice.update({
    where: { id: NOTICE_ID },
    data: {
      titleBn: input.titleBn,
      titleEn: input.titleEn,
      bodyBn: input.bodyBn,
      bodyEn: input.bodyEn,
      isActive: input.isActive,
    },
  });
}

/** Public — null when the admin has turned the notice off, so the frontend renders nothing rather than an empty box. */
export async function getPublicSiteNotice() {
  const n = await ensureNotice();
  if (!n.isActive) return null;
  return {
    titleBn: n.titleBn,
    titleEn: n.titleEn,
    bodyBn: n.bodyBn,
    bodyEn: n.bodyEn,
  };
}
