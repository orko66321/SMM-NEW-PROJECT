import type { IconName } from "../ds/Icon.js";

// Shared source for the navbar "More" mega-menu — consumed by the desktop
// dropdown (NavMoreMenu.tsx), the mobile drawer section (PublicLayout.tsx)
// and the footer.
//
// Every destination is reachable WITHOUT a login. The /dashboard/* routes
// have no auth guard on purpose (see App.tsx / GuestGate.tsx): a guest can
// browse New Order, Store, the service list, etc.; pages that are pure
// personal data (Wallet, Orders, Profile, a ticket thread) render a
// "sign in / sign up" card in place of their content. So a visitor can walk
// the whole product before creating an account.
export interface MoreLink {
  to: string;
  labelKey: string;
  icon: IconName;
  /** true ⇒ page shows a sign-in prompt for guests (personal-data pages). */
  guestPrompt?: boolean;
}

export interface MoreGroup {
  titleKey: string;
  links: MoreLink[];
}

export const MORE_GROUPS: MoreGroup[] = [
  {
    titleKey: "nav.moreGroups.panel",
    links: [
      { to: "/dashboard", labelKey: "dashboardLayout.nav.overview", icon: "dashboard", guestPrompt: true },
      { to: "/dashboard/new-order", labelKey: "dashboardLayout.nav.newOrder", icon: "cart" },
      { to: "/dashboard/store", labelKey: "dashboardLayout.nav.store", icon: "store" },
      { to: "/dashboard/wallet", labelKey: "dashboardLayout.nav.addFunds", icon: "wallet", guestPrompt: true },
      { to: "/dashboard/orders", labelKey: "dashboardLayout.nav.ordersHistory", icon: "orders", guestPrompt: true },
      { to: "/dashboard/leaderboard", labelKey: "dashboardLayout.nav.leaderboard", icon: "leaderboard" },
      { to: "/dashboard/refer", labelKey: "dashboardLayout.nav.refer", icon: "users" },
      { to: "/dashboard/tickets", labelKey: "dashboardLayout.nav.tickets", icon: "support", guestPrompt: true },
      { to: "/dashboard/profile", labelKey: "dashboardLayout.nav.profile", icon: "user", guestPrompt: true },
    ],
  },
  {
    titleKey: "nav.moreGroups.company",
    links: [
      { to: "/about", labelKey: "nav.moreItems.about", icon: "info" },
      { to: "/docs?tab=BLOG", labelKey: "nav.moreItems.blog", icon: "campaign" },
      { to: "/faq", labelKey: "nav.moreItems.faq", icon: "support" },
      { to: "/docs?tab=UPDATE", labelKey: "nav.moreItems.status", icon: "bell" },
      { to: "/contact", labelKey: "nav.moreItems.contact", icon: "send" },
      { to: "/terms", labelKey: "nav.moreItems.terms", icon: "docs" },
      { to: "/privacy", labelKey: "nav.moreItems.privacy", icon: "check-circle" },
    ],
  },
];

// Flat list — footer + "is a More route active?" checks.
export const MORE_LINKS: MoreLink[] = MORE_GROUPS.flatMap((g) => g.links);
