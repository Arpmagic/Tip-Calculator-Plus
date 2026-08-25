import { parseReceiptText } from '../ocrService';

interface TestCase {
  id: string;
  name: string;
  rawText: string;
  expectedVenue: string;
  expectedCurrency: string;
  expectedGrandTotal: number;
  expectedTax?: number;
  expectedSubtotal?: number;
}

const testCases: TestCase[] = [
  // 1. Polish Żabka Test Case (From User Device Photo image_87c9a0.jpg)
  {
    id: 'zabka_pl',
    name: 'Polish Żabka Fiscal Receipt',
    rawText: `
      SKLEP ŻABKA
      ŻABKA POLSKA SP. Z O.O.
      61-586 POZNAŃ, UL. KLONOWA 12
      NIP 525-22-12-345
      PARAGON FISKALNY
      1 KANAPKA TRÓJKĄT 120g  12,99 A
      1 COCA COLA ZERO 0.5L   8,97 A
      SPRZEDAŻ OPODATKOWANA A 21,96
      SUMA PTU A 23%          2,72
      SUMA PLN               21,96
      DO ZAPŁATY             21,96
      KARTA PŁATNICZA        21,96
      DZIĘKUJEMY I ZAPRASZAMY PONOWNIE
      2026-08-25 14:23 NR 04821
    `,
    expectedVenue: 'Sklep Żabka',
    expectedCurrency: 'PLN',
    expectedGrandTotal: 21.96,
    expectedTax: 2.72,
    expectedSubtotal: 19.24,
  },

  // 2. Polish Biedronka Supermarket
  {
    id: 'biedronka_pl',
    name: 'Polish Biedronka Supermarket Receipt',
    rawText: `
      JERONIMO MARTINS POLSKA S.A.
      BIEDRONKA SKLEP NR 4821
      UL. MICKIEWICZA 44, WARSZAWA
      NIP: 779-10-11-327
      PARAGON FISKALNY
      CHLEB WIEJSKI 500G      4,50 A
      MLEKO UHT 3.2% 1L       3,80 A
      KAWA ZIARNISTA 1KG     76,20 A
      SPRZEDAZ OPODATKOWANA  84,50
      SUMA PTU A 23%         15,80
      RAZEM                  84,50
      DO ZAPŁATY             84,50 PLN
      ROZLICZENIE PŁATNOŚCI: KARTA 84,50
    `,
    expectedVenue: 'Biedronka',
    expectedCurrency: 'PLN',
    expectedGrandTotal: 84.50,
    expectedTax: 15.80,
    expectedSubtotal: 68.70,
  },

  // 3. US Restaurant / Diner Bill
  {
    id: 'us_diner',
    name: 'US Diner Restaurant Bill',
    rawText: `
      THE OBSIDIAN STEAKHOUSE
      100 WALL STREET, NEW YORK, NY
      Tel: (212) 555-0199
      Server: Michael | Table 14
      08/24/2026 7:45 PM
      
      1 WAGYU RIBEYE          32.00
      1 TRUFFLE FRIES          8.00
      1 CRAFT IPA              5.00
      
      SUBTOTAL:              $45.00
      SALES TAX (8.875%):     $3.94
      TOTAL:                 $48.94
      
      SUGGESTED TIP:
      18% = $8.10 | 20% = $9.00 | 25% = $11.25
      THANK YOU FOR DINING WITH US!
    `,
    expectedVenue: 'THE OBSIDIAN STEAKHOUSE',
    expectedCurrency: 'USD',
    expectedGrandTotal: 48.94,
    expectedTax: 3.94,
    expectedSubtotal: 45.00,
  },

  // 4. German Restaurant Receipt
  {
    id: 'german_gaststatte',
    name: 'German Gaststätte Receipt',
    rawText: `
      RESTAURANT ZUM GOLDENEN HIRSCHEN
      HAUPTSTRASSE 22, 80331 MÜNCHEN
      ST-NR: 143/201/90214
      RECHNUNG / QUITTUNG
      
      1x SCHNITZEL WIENER ART 18,50
      1x APFELSTRUDEL          7,00
      2x PAULANER WEISSBIER    7,00
      
      ZWISCHENSUMME:          32,50 EUR
      MWST 19%:                6,18 EUR
      GESAMTBETRAG:           38,68 EUR
      ZU ZAHLEN:              38,68 EUR
      VIELEN DANK FÜR IHREN BESUCH!
    `,
    expectedVenue: 'RESTAURANT ZUM GOLDENEN HIRSCHEN',
    expectedCurrency: 'EUR',
    expectedGrandTotal: 38.68,
    expectedTax: 6.18,
    expectedSubtotal: 32.50,
  },

  // 5. UK London Cafe Bill
  {
    id: 'uk_cafe',
    name: 'UK London Cafe Receipt',
    rawText: `
      COSTA COFFEE
      24 OXFORD STREET, LONDON
      VAT REG NO: GB 123 4567 89
      CHECK: 4920
      
      1x FLAT WHITE           £3.80
      1x AVOCADO TOAST        £9.50
      1x BLUEBERRY MUFFIN     £3.20
      1x SPARKLING WATER      £2.00
      
      SUBTOTAL:              £18.50
      VAT 20%:                £3.70
      TOTAL:                 £22.20
      CARD PAYMENT:          £22.20
      THANK YOU!
    `,
    expectedVenue: 'Costa Coffee',
    expectedCurrency: 'GBP',
    expectedGrandTotal: 22.20,
    expectedTax: 3.70,
    expectedSubtotal: 18.50,
  },

  // 6. Ukrainian Supermarket (Silpo)
  {
    id: 'silpo_ua',
    name: 'Ukrainian Silpo Fiscal Receipt',
    rawText: `
      СІЛЬПО ТОВ «ФОЗЗІ-ФУД»
      М. КИЇВ, ВУЛ. ХРЕЩАТИК 15
      ПН 32294821
      ФІСКАЛЬНИЙ ЧЕК
      
      СИР ГАУДА 250Г          120,00 А
      КАВА В ЗЕРНАХ           150,00 А
      КРУАСАН ШОКОЛАДНИЙ       50,00 А
      
      ПІДСУМОК               320,00 ГРН
      ПДВ А = 20.00%          53,33
      СУМА                   320,00 UAH
      ДО СПЛАТИ              320,00
      БЕЗГОТІВКОВА ОПЛАТА    320,00 ₴
      ДЯКУЄМО ЗА ПОКУПКУ!
    `,
    expectedVenue: 'Сільпо',
    expectedCurrency: 'UAH',
    expectedGrandTotal: 320.00,
    expectedTax: 53.33,
    expectedSubtotal: 266.67,
  },

  // 7. French Bistro Receipt
  {
    id: 'french_bistro',
    name: 'French Bistro Receipt',
    rawText: `
      BISTROT DE PARIS
      12 RUE DE RIVOLI, 75001 PARIS
      SIRET: 482 910 234 00019
      
      1 ENTRECOTE GRILLÉE     32,00
      1 SOUPE A L'OIGNON      12,00
      1 VERRE BORDEAUX        10,00
      
      TOTAL HT:               54,00 €
      TVA 10%:                 5,40 €
      TOTAL TTC:              59,40 €
      NET A PAYER:            59,40 EUR
      MERCI DE VOTRE VISITE
    `,
    expectedVenue: 'BISTROT DE PARIS',
    expectedCurrency: 'EUR',
    expectedGrandTotal: 59.40,
    expectedTax: 5.40,
    expectedSubtotal: 54.00,
  },

  // 8. Swiss Alpine Cafe
  {
    id: 'swiss_cafe',
    name: 'Swiss Alpine Cafe Receipt',
    rawText: `
      CAFE DES ALPES
      BAHNHOFSTRASSE 8, 8001 ZÜRICH
      CHE-102.345.678 MWST
      
      1x FONDUE PORTION       18.50
      1x RIVELIA RED           4.00
      1x ESPRESSO              2.00
      
      ZWISCHENSUMME:          24.50 CHF
      MWST 7.7%:               1.89 CHF
      TOTAL:                  26.39 CHF
      ZAHLUNG MIT KARTE:      26.39 CHF
    `,
    expectedVenue: 'CAFE DES ALPES',
    expectedCurrency: 'CHF',
    expectedGrandTotal: 26.39,
    expectedTax: 1.89,
    expectedSubtotal: 24.50,
  },

  // 9. Japanese Izakaya Bill
  {
    id: 'japanese_izakaya',
    name: 'Japanese Izakaya Bill',
    rawText: `
      居酒屋 鳥貴族 渋谷店
      東京都渋谷区宇田川町
      TEL: 03-5555-1234
      
      焼き鳥盛り合わせ         1800
      刺身盛り合わせ           1500
      生ビール 2杯            1200
      
      小計:                   4500円
      消費税 (10%):            450円
      合計:                   4950 JPY
      領収書を発行いたしました
    `,
    expectedVenue: '居酒屋 鳥貴族 渋谷店',
    expectedCurrency: 'JPY',
    expectedGrandTotal: 4950,
    expectedTax: 450,
    expectedSubtotal: 4500,
  },

  // 10. Complex Polish Receipt with Weights, Dates, and NIP noise
  {
    id: 'complex_pl_receipt',
    name: 'Complex Polish Receipt with Weight & NIP Noise',
    rawText: `
      PKN ORLEN STACJA NR 1956
      UL. WARSZAWSKA 100, 00-001 WARSZAWA
      NIP 774-00-01-454
      PARAGON FISKALNY
      HOT DOG GIGANT 120g     14,50 A
      KAWA DUŻA 400ml          8,00 A
      ROK ZAŁOŻENIA 1956r
      SPRZEDAŻ OPODATKOWANA A 22,50
      SUMA PTU A 23%           4,21
      SUMA PLN                22,50
      DO ZAPŁATY              22,50
      KARTA MASTERCARD        22,50
      DZIĘKUJEMY ZA ZAKUPY
      2026-08-25 10:15 KASA 02
    `,
    expectedVenue: 'PKN Orlen',
    expectedCurrency: 'PLN',
    expectedGrandTotal: 22.50,
    expectedTax: 4.21,
    expectedSubtotal: 18.29,
  },
];

export function runOcrBenchmarks() {
  console.log('================================================================');
  console.log('🧪 RUNNING OCR FISCAL RECEIPT PARSER BENCHMARKS (10/10 TESTS)');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  for (const tc of testCases) {
    const result = parseReceiptText(tc.rawText);

    const currencyMatch = result.detectedCurrency === tc.expectedCurrency;
    const totalMatch = Math.abs(result.grandTotal - tc.expectedGrandTotal) < 0.05;
    const taxMatch = tc.expectedTax !== undefined 
      ? Math.abs(result.taxAmount - tc.expectedTax) < 0.05 
      : true;
    const subtotalMatch = tc.expectedSubtotal !== undefined
      ? Math.abs(result.subtotal - tc.expectedSubtotal) < 0.05
      : true;

    const isPassed = currencyMatch && totalMatch && taxMatch && subtotalMatch;

    if (isPassed) {
      passedCount++;
      console.log(`✅ [PASS] #${tc.id} - ${tc.name}`);
      console.log(`   Venue: "${result.venueName}" | Currency: ${result.detectedCurrency} | Total: ${result.grandTotal} | Tax: ${result.taxAmount} | Subtotal: ${result.subtotal}`);
    } else {
      failedCount++;
      console.error(`❌ [FAIL] #${tc.id} - ${tc.name}`);
      console.error(`   Expected: Currency=${tc.expectedCurrency}, Total=${tc.expectedGrandTotal}, Tax=${tc.expectedTax}, Subtotal=${tc.expectedSubtotal}`);
      console.error(`   Actual:   Currency=${result.detectedCurrency}, Total=${result.grandTotal}, Tax=${result.taxAmount}, Subtotal=${result.subtotal}`);
    }
  }

  console.log('\n================================================================');
  console.log(`📊 BENCHMARK SUMMARY: ${passedCount}/${testCases.length} PASSED (${failedCount} failed)`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

// Auto-run when executed
runOcrBenchmarks();
