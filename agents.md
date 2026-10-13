# Agent Instructions & Guardrails: "6-7" Experimental Website

## Core Rules for Content & Assets
1. **NO AI-GENERATED TEXT:** Under no circumstances should you invent, write, or generate meaningful copy, prose, interview snippets, or body text for the website. 
2. **PLACEHOLDER EXCLUSIVITY:** If text has not been explicitly provided by the author, you MUST use obvious placeholders such as standard `lorem ipsum` or literal labels like `[INSERT TEXT HERE]`. The author must never have to guess whether a piece of text is theirs or yours.
3. **ASSET BOUNDARIES:** The attached PDF book is for **visual and conceptual mood reference only**. Do not rip layouts or copy text from it directly. All functional website assets (images, graphics) must be provided separately as clean PNGs/SVGs. If an image asset is missing, use a stark solid-color block (e.g., using color `#A6CE38`) or a simple box placeholder.

## Technical & Layout Execution Rules
1. **3-Column Independent Scroll:** Maintain the fixed-viewport, 3-column layout where the left (glossary), center (main text), and right (media/ASCII) columns scroll entirely independently of one another. Do not wrap them in a single global body-scroll container.
2. **No Dummy Code Hallucination:** If a script or external asset (like your p5 sketch or tweakpane library) is referenced, do not invent dummy functions for it if it fails—throw a clean console log or placeholder element instead.

## Visual & Aesthetic Language
- **Aesthetic:** Maximalist, internet-native, post-digital archival web design.
- **Color Palette:** 
  - Background/Base: `#000000` (Black) & `#FFFFFF` (White)
  - Accents: `#A6CE38` (Vibrant Lime Green) and `#53C7DE` (Cyan)
- **Typography:** 
  - Body Text: CMU Bright
  - Headers: Bootzy TM