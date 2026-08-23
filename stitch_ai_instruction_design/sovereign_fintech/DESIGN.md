---
name: Sovereign Fintech
colors:
  surface: '#031427'
  surface-dim: '#031427'
  surface-bright: '#2a3a4f'
  surface-container-lowest: '#000f21'
  surface-container-low: '#0b1c30'
  surface-container: '#102034'
  surface-container-high: '#1b2b3f'
  surface-container-highest: '#26364a'
  on-surface: '#d3e4fe'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#d3e4fe'
  inverse-on-surface: '#213145'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#bec6e0'
  on-secondary: '#283044'
  secondary-container: '#3f465c'
  on-secondary-container: '#adb4ce'
  tertiary: '#b9c7e0'
  on-tertiary: '#233144'
  tertiary-container: '#8392a9'
  on-tertiary-container: '#1c2a3d'
  error: '#EF4444'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#d5e3fd'
  tertiary-fixed-dim: '#b9c7e0'
  on-tertiary-fixed: '#0d1c2f'
  on-tertiary-fixed-variant: '#3a485c'
  background: '#031427'
  on-background: '#d3e4fe'
  surface-variant: '#26364a'
  surface-deep: '#020617'
  surface-glass: rgba(30, 41, 59, 0.7)
  success: '#10B981'
  warning: '#F59E0B'
  info: '#3B82F6'
  bkash: '#E2136E'
  nagad: '#F7941D'
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1280px
  gutter: 20px
---

## Brand & Style

This design system reimagines the SMM panel as a high-end fintech utility. The brand personality is **precise, authoritative, and frictionless**, moving away from the cluttered "budget" aesthetic of typical service panels toward a **Corporate / Modern** SaaS identity inspired by Linear and Stripe.

The visual narrative centers on **trust through clarity**. By employing generous whitespace, a sophisticated monochromatic foundation with deep indigo accents, and "fintech-grade" interactive elements, the product positions itself as a professional tool for agencies and power users. The aesthetic is "High-Utility Luxury"—where every pixel serves a functional purpose, and the premium feel is a byproduct of meticulous alignment and subtle depth.

**Key Design Principles:**
- **Information Density Control:** Use whitespace to prevent cognitive overload in data-heavy service catalogs.
- **Bilingual Equilibrium:** English and Bengali scripts are treated with equal visual weight, ensuring neither feels like an afterthought.
- **Utility-First Polish:** Functional elements like "Refill" badges and "Speed" indicators are elevated into clean, color-coded components.

## Colors

The palette is anchored by **Deep Indigo** as the primary interactive color, set against a **Sleek Slate** background for the default dark mode. The light mode uses a corresponding "Paper White" and "Cool Gray" scale to maintain the professional tone.

**Semantic Strategy:**
- **Primary (#6366F1):** Reserved for high-intent actions (Submit Order, Add Funds).
- **Surface Tiers:** Use `#020617` for the base background and `#0F172A` for primary containers to create a subtle hierarchy of depth.
- **Payment Branding:** bKash and Nagad brand colors are used strictly for payment gateway badges to ensure instant recognition without compromising the overall UI harmony.
- **Status Badges:** Use low-saturation backgrounds with high-saturation text for semantic states (e.g., a "Completed" badge uses a transparent success-green background with opaque green text).

## Typography

This system eliminates "fancy" Unicode characters in favor of a structured, multi-typeface approach. 

**Typeface Roles:**
- **Hanken Grotesk:** Used for headlines and branding. Its sharp, contemporary geometry provides a "tech-forward" feel.
- **Inter:** The workhorse for all body copy, instructions (English/Bengali), and form labels. It ensures maximum legibility at small sizes on mobile devices.
- **JetBrains Mono:** Utilized for technical metadata, service IDs, API documentation, and specific badges (e.g., `[Non-Drop]`). It provides a "system-level" precision to the data.

**Bilingual Handling:**
Bengali text should be rendered with a line-height multiplier of 1.2x compared to English to account for vowel signs (karas) and conjuncts, preventing vertical clipping.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The main dashboard is contained within a 1280px max-width wrapper on desktop to prevent excessive line lengths in the services table, while the mobile view uses a fluid edge-to-edge approach with 16px safe-area margins.

**The 8px Rhythm:**
All spacing, padding, and margins are multiples of 8px. 
- **Touch Targets:** Buttons and input fields maintain a minimum height of 48px for mobile accessibility.
- **Service Rows:** Use a "Dense" layout for tables (12px vertical padding) but "Spacious" for forms (24px padding) to guide the user's focus during the order process.
- **Grid:** On desktop, a 12-column grid is used. Sidebars span 2-3 columns, while the main action card spans 6-8 columns to keep the interface centered and balanced.

## Elevation & Depth

Visual hierarchy is established using **Tonal Layers** combined with **Ambient Shadows**. 

- **Level 0 (Base):** The canvas. In dark mode, this is the deepest slate.
- **Level 1 (Cards/Panels):** Raised slightly above the base with a subtle 1px border (color-tinted to the background) and no shadow.
- **Level 2 (Interactive/Hover):** When a service card or button is hovered, it gains an ambient shadow: `0px 10px 15px -3px rgba(0, 0, 0, 0.1)`.
- **Level 3 (Modals/Toasts):** Floating elements that use a **Backdrop Blur (Glassmorphism)** effect (12px blur) to maintain context with the layer beneath while clearly being on top.

Avoid heavy black shadows. Shadows should be tinted with the primary indigo or neutral slate to keep the UI feeling "airy" and modern.

## Shapes

The design uses a **Rounded** language (8px / 0.5rem base radius) to bridge the gap between "technical" and "accessible." 

- **Standard Elements (8px):** Buttons, Input fields, and Service cards.
- **Large Elements (16px):** Main dashboard containers and "Important Note" callouts.
- **Micro Elements (4px):** Checkboxes and utility badges (e.g., "Refill").
- **Pill (Full):** Used exclusively for platform filters (Instagram, Facebook chips) to differentiate navigation from action.

## Components

### Buttons & Inputs
- **Primary Action:** Solid Indigo fill, white text, 8px radius. Includes a subtle inner glow on hover.
- **Secondary Action:** Ghost style with a 1px slate border.
- **Inputs:** Darker background than the card surface. Focus state is a 2px indigo ring.

### Service Chips & Badges
- **Platform Filters:** Pill-shaped chips with platform icons (e.g., Instagram logo). Active state uses a soft indigo background.
- **Service Tags:** Small, monospaced text badges.
    - `[Non-Drop]` -> Emerald/Success tint.
    - `[New]` -> Indigo/Primary tint.
    - `[Slow]` -> Amber/Warning tint.

### Data Tables
- Use **Loading Skeletons** that pulse from Slate-800 to Slate-700.
- Columns must be sortable with clear chevron indicators.
- Row hover states should highlight the entire row with a 5% indigo tint.

### Payment Branding
- bKash/Nagad buttons should feature the official brand logo followed by "Pay with [Brand]" in Inter Semibold. These are the only components that deviate from the primary brand palette.

### Bilingual Instructions
- Use a **Dual-Pane** or **Accordion** style for long instructions. English on top, Bengali directly below in a slightly lighter neutral color to distinguish the translation from the primary text.