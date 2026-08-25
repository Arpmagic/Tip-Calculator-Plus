---
title: GitHub-First Architecture & Proven Pattern Adoption
trigger: always_on
---

# GitHub-First Architecture & Proven Pattern Adoption

To maintain maximum code quality, avoid regressions, and optimize development resources:

## 1. Prioritize Production-Grade Open Source Patterns
- When implementing complex algorithms (e.g. OCR receipt parsing, fiscal tax calculations, currency math, camera WebRTC constraints, OTA updates):
  1. Research and reference battle-tested GitHub open-source repositories and industry standards first (e.g. `receipt-parser`, `tesseract.js`, Revolut/Linear UI boilerplates).
  2. Adapt proven regex lexicons, adaptive thresholding algorithms (Otsu method), and robust state hydration models.
  3. Never invent ad-hoc algorithms from scratch when standardized, tested solutions exist.

## 2. Multi-Line & Multi-Language OCR Parsing Standard
- Always use multi-line permissive regex (`[\s\S]{0,35}?`) to tolerate line breaks and variable OCR spacing between fiscal keywords (e.g. `SUMA PLN`, `PTU`, `DO ZAPŁATY`) and numeric values.
- Strip weights (`120g`, `0.5kg`), percentages (`23%`, `10%`), dates (`1956r`), and NIP IDs before parsing prices.
- Maintain automated benchmark suites (e.g. `src/services/__tests__/ocrService.test.ts`) with real-world receipt tests to prevent regressions.
