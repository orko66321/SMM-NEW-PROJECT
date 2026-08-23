---
name: Sovereign Admin
colors:
  surface: '#131317'
  surface-dim: '#131317'
  surface-bright: '#39393d'
  surface-container-lowest: '#0e0e11'
  surface-container-low: '#1b1b1f'
  surface-container: '#102034'
  surface-container-high: '#2a292d'
  surface-container-highest: '#353438'
  on-surface: '#e5e1e7'
  on-surface-variant: '#c7c5d0'
  inverse-surface: '#e5e1e7'
  inverse-on-surface: '#313034'
  outline: '#918f9a'
  outline-variant: '#46464f'
  surface-tint: '#c0c1ff'
  primary: '#e1dfff'
  on-primary: '#292b5e'
  primary-container: '#c0c1ff'
  on-primary-container: '#4b4d83'
  inverse-primary: '#585990'
  secondary: '#adc6ff'
  on-secondary: '#002e6a'
  secondary-container: '#0566d9'
  on-secondary-container: '#e6ecff'
  tertiary: '#fee089'
  on-tertiary: '#3c2f00'
  tertiary-container: '#e0c470'
  on-tertiary-container: '#645003'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#131449'
  on-primary-fixed-variant: '#404176'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#fee089'
  tertiary-fixed-dim: '#e0c470'
  on-tertiary-fixed: '#231b00'
  on-tertiary-fixed-variant: '#574500'
  background: '#131317'
  on-background: '#e5e1e7'
  surface-variant: '#353438'
  surface-base: '#031427'
  surface-glass: rgba(16, 32, 52, 0.8)
  status-success: '#10B981'
  status-warning: '#F59E0B'
  status-error: '#EF4444'
  bkash: '#E2136E'
  nagad: '#F7941D'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  status-badge:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  sidebar-width: 260px
  sidebar-collapsed: 64px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  table-row-height: 48px
---

## Brand & Style

The brand personality is **authoritative, secure, and hyper-efficient**. This design system evolves from a client-facing dark theme into a professional "power-user" back-office tool, emphasizing **technical precision** and **data density** over decorative flair.

The chosen style is **Corporate / Modern** with influences from **Minimalism** and **Glassmorphism**. It utilizes a "Linear-inspired" aesthetic: high-contrast typography, subtle borders, and layered surfaces that prioritize administrative clarity. The interface feels like a sophisticated fintech instrument, where every pixel is optimized for scanability and rapid decision-making.

- **Tone:** Secure, professional, and frictionless.
- **Visual Strategy:** Use a deep, obsidian-based dark mode that minimizes eye strain for long administrative sessions while highlighting critical data points with vibrant semantic accents.

## Colors

The palette is optimized for a high-density administrative environment. The primary color is a **bright lavender-blue**, ensuring high legibility against the deep nautical backgrounds.

- **Semantic Logic:** Success (Green), Warning (Amber), and Error (Red) use high-vibrancy hexes for immediate recognition in table rows and status badges.
- **Surface Hierarchy:** The background uses a deep navy (`surface-base`), while containers and cards use a slightly lighter, desaturated tone (`surface-container`) to create depth without relying on heavy shadows.
- **Payment Branding:** Dedicated bKash and Nagad colors are used exclusively for payment-related triggers to maintain ecosystem familiarity.
- **Neutral Accents:** Borders use low-contrast grays (`#464554`) to define structure without adding visual noise.

## Typography

The typography system employs a three-tier font strategy to manage information density.

- **Hanken Grotesk:** Used for module headers and page titles to provide a modern, clean fintech feel.
- **Inter:** The primary interface font for body text and form labels. It is chosen for its exceptional legibility in both English and Bengali scripts.
- **JetBrains Mono:** Used for all technical strings, including Order IDs, API keys, and financial logs. This reinforces the "Sovereign" tech-first identity.

**Bilingual Support:** When rendering Bengali, increase line-height by 15% across all levels to accommodate the script's vertical anatomy without crowding the interface.

## Layout & Spacing

This design system uses a **Fluid Grid** model with strict maximum containers for readability. The layout is optimized for data-density, favoring compact spacing over large gaps.

- **Structure:** A persistent, collapsible left sidebar manages primary navigation. Breadcrumbs are required for all pages deeper than one level to aid navigation in complex admin paths.
- **Table Density:** Tables are the primary data vehicle. They utilize a `table-row-height` of 48px to maximize vertical data visibility while maintaining touch-friendly targets. Sticky headers are mandatory for all data tables.
- **Breakpoints:**
  - **Mobile (<768px):** Sidebar collapses to a bottom-bar or hamburger menu; margins shrink to 16px.
  - **Desktop (>1024px):** Fixed sidebar (260px); 12-column grid system for dashboard widgets.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Glassmorphism** rather than traditional heavy shadows.

- **Surface Tiers:** Background elements use the darkest hex, while interactive cards use a slightly lighter tint to appear "closer" to the user.
- **Backdrop Blurs:** Modals and the collapsible sidebar (when overlaying on mobile) use a frosted glass effect (`surface-glass`) with a 12px blur. This maintains the user's context of the data behind the overlay.
- **Stroke Definition:** Elements are separated by subtle 1px borders. In dark mode, borders should be slightly lighter than the surface they sit on to create a "etched" look.
- **Hover States:** Table rows should highlight with a subtle color shift or a left-accent border rather than an elevation change.

## Shapes

The shape language is **Soft (0.25rem / 4px base)**. This creates a professional, sharp look that feels more like an enterprise tool than a consumer app.

- **Buttons & Inputs:** Use the base 4px radius for a clean, structural appearance.
- **Cards & Modals:** Use `rounded-lg` (8px) to soften the primary content areas.
- **Status Badges:** Use `rounded-full` (pill-shaped) to distinguish them from interactive buttons.
- **Charts:** Line charts should use a slight curve (interpolation) to feel organic, while bar charts should remain sharp or with minimal 2px corner radii.

## Components

- **Buttons:** Primary buttons use a solid `#c0c1ff` fill with dark text. Secondary buttons are "Ghost" style with a subtle border.
- **Data Tables:** Must include sticky headers and a "zebra-striping" hover effect. Use `data-mono` for numeric values and IDs.
- **Chips & Badges:** Status badges use a "subtle fill" (15% opacity of the semantic color) with high-contrast text.
- **Charts:**
  - **Line Charts:** Primary indigo stroke, 2px width, with a soft gradient fill beneath the line.
  - **Sparklines:** Compact, no-axis versions for use within table cells to show balance trends.
  - **Bar Charts:** Grouped by category using the semantic color scale.
- **Search/Command Palette:** A high-elevation global search component (Cmd+K) that uses glassmorphism and allows quick navigation across the admin panel.
- **Inputs:** Darker background than the card surface with a 1px border that glows primary-blue on focus.