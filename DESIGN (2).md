---
name: Municipal Guardian System
colors:
  surface: '#f5faf8'
  surface-dim: '#d6dbd9'
  surface-bright: '#f5faf8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f5f2'
  surface-container: '#eaefed'
  surface-container-high: '#e4e9e7'
  surface-container-highest: '#dee4e1'
  on-surface: '#171d1c'
  on-surface-variant: '#3d4947'
  inverse-surface: '#2c3130'
  inverse-on-surface: '#edf2f0'
  outline: '#6d7a77'
  outline-variant: '#bcc9c6'
  surface-tint: '#006a61'
  primary: '#00685f'
  on-primary: '#ffffff'
  primary-container: '#008378'
  on-primary-container: '#f4fffc'
  inverse-primary: '#6bd8cb'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#924628'
  on-tertiary: '#ffffff'
  tertiary-container: '#b05e3d'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb59a'
  on-tertiary-fixed: '#370e00'
  on-tertiary-fixed-variant: '#773215'
  background: '#f5faf8'
  on-background: '#171d1c'
  surface-variant: '#dee4e1'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
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
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
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
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The design system is engineered for government-led social welfare programs, specifically targeting the monitoring and protection of Children and Adolescents (NNyA). The brand personality is **Professional, Trustworthy, and Empathetic**, striking a balance between institutional authority and the nurturing nature of social work.

The visual style follows a **Modern Corporate** approach with **Minimalist** influences. It prioritizes clarity and ease of use for municipal workers in the field. The interface utilizes high-quality white space to reduce cognitive load during complex data entry, while subtle depth and soft roundedness ensure the application feels approachable rather than bureaucratic.

## Colors
The color palette is anchored by **Teal** (Primary) and **Emerald Green** (Secondary), symbolizing growth, vitality, and social stability. 

A specific functional palette of 12 accent colors is utilized to provide immediate visual categorization for the diagnostic sections. These colors should be used as thin left-border accents on cards or as background tints for section icons. The background remains a clean, high-contrast white to ensure maximum readability and a sense of institutional cleanliness.

## Typography
**Inter** is the sole typeface for this design system, chosen for its exceptional legibility on mobile screens and its neutral, professional character. 

Hierarchy is established through weight and scale rather than decorative shifts. Headlines are set with slightly tighter letter spacing to maintain a structured look, while body text uses standard spacing to optimize for long-form reading of social reports and case files.

## Layout & Spacing
The system utilizes a **Fluid Grid** model designed for PWA (Progressive Web App) deployment. 

- **Mobile:** A single-column layout with 16px side margins. Elements rely on vertical stacking.
- **Tablet/Desktop:** A 12-column grid. Diagnostic cards should span 6 columns (50% width) on tablets and 4 columns (33% width) on desktop to allow for side-by-side data comparison.
- **Rhythm:** An 8px linear scale governs all padding and margins to ensure a consistent vertical rhythm.

## Elevation & Depth
Depth is used sparingly to define interactive surfaces against the flat background. 

- **Level 0 (Background):** Solid white or very light gray (`#F9FAFB`) for the main canvas.
- **Level 1 (Cards):** Soft, diffused shadows (`shadow-sm`) to lift case cards and diagnostic modules.
- **Level 2 (Modals/Overlays):** Medium shadows (`shadow-md`) with a 10% opacity black tint and a 12px blur to focus user attention.

Avoid heavy borders; use light gray outlines (`#E5E7EB`) for non-elevated containers.

## Shapes
The shape language is defined by **rounded-2xl** (1rem / 16px) for primary containers and cards. This high degree of roundedness softens the government aesthetic, making the tool feel more modern and less intimidating for users handling sensitive social data. Smaller elements like buttons and input fields use **rounded-lg** (0.5rem / 8px) for a more precise, functional feel.

## Components
- **Cards:** White background, `rounded-2xl`, `shadow-sm`. Diagnostic cards should include a 4px left-border colored according to the section's accent color.
- **Status Chips:** Small, pill-shaped indicators. Use light background tints with dark text: Green (Completed), Amber (In Progress), Gray (Not Started).
- **Buttons:** Primary buttons use the Teal primary color with white text. They must have a minimum height of 48px to be mobile-friendly.
- **Inputs:** Large touch targets with `rounded-lg` borders. Active states should use a 2px Teal stroke. Labels must always be visible above the input field for accessibility.
- **Progress Bars:** Thin 8px tracks with the Emerald Green fill to show section completion percentages.
- **Iconography:** Use Lucide React icons with a `2px` stroke width. Icons within diagnostic sections should be placed inside a light circular tinted background matching the section accent.