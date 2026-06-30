/*** scripts/data/image-overrides.js ***

MANUAL IMAGE CURATION — fill in absolute URLs to replace repetitive images.

Only edit the ARRAYS. Leave items you are happy with as-is (or delete them).

Use absolute URLs (https://images.pexels.com/..., Unsplash, etc.) — they render directly, no local files needed. You can use 1-4 per item.

Items are grouped by moodboard so you can see which ones clash. A "DUPLICATE" tag means another item uses the EXACT same images (swap these first).

When done: tell Claude — it applies these to Render (live) + snapshots seed.json.
 ***/
export const IMAGE_OVERRIDES = {

  // ════════ Moodboard: 90s Sportswear ════════
  // Arte Logo Hoodie · Arte Antwerp
  "Arte Logo Hoodie": [
    "https://images.unsplash.com/photo-1771950014791-9a9771724369?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1771950049714-f8a418e9dc33?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1771950069047-ceede235d4fc?q=80&w=957&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  ],
  // Sport stripe tee · Episode
  "Sport stripe tee": [
    "https://images.pexels.com/photos/5740786/pexels-photo-5740786.jpeg",
    "https://images.pexels.com/photos/5740787/pexels-photo-5740787.jpeg",
    "https://images.pexels.com/photos/5741056/pexels-photo-5741056.jpeg",
  ],
  // Vintage sports jersey · Camden 
  "Vintage sports jersey": [
    "https://images.unsplash.com/photo-1654535533816-d5f6e76dd3b0?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1654535508285-f0bf5899cc27?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1654535529840-ebf7260698f8?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  ],

  // ════════ Moodboard: Actually cheap vintage jackets ════════
  // Leather jacket · Think Twice
  "Leather jacket": [
    "/facets/leather-jacket-1.jpg",
    "/facets/leather-jacket-2.jpg",
    "/facets/leather-jacket-3.jpg",
  ],
  // Vintage windbreaker · Think Twice
  "Vintage windbreaker": [
    "https://images.pexels.com/photos/27918439/pexels-photo-27918439.jpeg",
    "https://images.pexels.com/photos/27901849/pexels-photo-27901849.jpeg",
    "https://images.pexels.com/photos/27901851/pexels-photo-27901851.jpeg",
  ],
  // Faded band tee · Camden
  "Faded band tee": [
    "/facets/faded-band-tee-1.jpg",
    "/facets/faded-band-tee-2.jpg",
    "/facets/faded-band-tee-3.jpg",
  ],

  // ════════ Moodboard: Alternative Edge ════════
  // Studded leather belt · My Ohm
  "Studded leather belt": [
    "/facets/studded-leather-belt-1.jpg",
    "/facets/studded-leather-belt-2.jpg",
    "/facets/studded-leather-belt-3.jpg",
  ],
  // Studded denim vest · Camden
  "Studded denim vest": [
    "https://images.pexels.com/photos/14458546/pexels-photo-14458546.jpeg",
    "https://images.pexels.com/photos/13452662/pexels-photo-13452662.jpeg",
    "https://images.pexels.com/photos/11561973/pexels-photo-11561973.jpeg",
  ],
  // Leather harness belt · Ann Demeulemeester
  "Leather harness belt": [
    "https://images.pexels.com/photos/18404792/pexels-photo-18404792.jpeg",
    "https://images.pexels.com/photos/18404789/pexels-photo-18404789.jpeg",
    "https://images.pexels.com/photos/18404790/pexels-photo-18404790.jpeg",
  ],

  // ════════ Moodboard: Café Crate-Digging ════════
  // Corduroy trousers · Think Twice
  "Corduroy trousers": [
    "https://images.pexels.com/photos/20324443/pexels-photo-20324443.jpeg",
    "https://images.pexels.com/photos/20324440/pexels-photo-20324440.jpeg",
    "https://images.pexels.com/photos/20225063/pexels-photo-20225063.jpeg",
  ],
  // Designer leather tote · Labels Inc.
  "Designer leather tote": [
    "https://images.pexels.com/photos/27174571/pexels-photo-27174571.jpeg",
    "https://images.pexels.com/photos/27127410/pexels-photo-27127410.jpeg",
    "https://images.pexels.com/photos/27100522/pexels-photo-27100522.jpeg",
  ],
  // Vintage leather loafers · Labels Inc. 
  "Vintage leather loafers": [
    "https://images.pexels.com/photos/6766352/pexels-photo-6766352.jpeg",
    "https://images.pexels.com/photos/6765524/pexels-photo-6765524.jpeg",
    "https://images.pexels.com/photos/298864/pexels-photo-298864.jpeg",
  ],
  // Leather mules · Graanmarkt 13
  "Leather mules": [
    "https://images.pexels.com/photos/27174551/pexels-photo-27174551.jpeg",
    "https://images.pexels.com/photos/26954363/pexels-photo-26954363.jpeg",
    "https://images.pexels.com/photos/27127418/pexels-photo-27127418.jpeg",
  ],

  // ════════ Moodboard: Denim Revival ════════
  // Pleated midi skirt · Rosier 41
  "Pleated midi skirt": [
    "https://images.pexels.com/photos/31897357/pexels-photo-31897357.jpeg",
    "https://images.pexels.com/photos/31897361/pexels-photo-31897361.jpeg",
    "https://images.pexels.com/photos/31897363/pexels-photo-31897363.jpeg",
  ],
  // Cowboy boots · My Ohm
  "Cowboy boots": [
    "/facets/cowboy-boots-1.jpg",
    "/facets/cowboy-boots-2.jpg",
    "/facets/cowboy-boots-3.jpg",
  ],
  // Retro Denim Jacket · Episode
  "Retro Denim Jacket": [
    "/facets/retro-denim-jacket-1.jpg",
    "/facets/retro-denim-jacket-2.jpg",
    "/facets/retro-denim-jacket-3.jpg",
  ],
  // 70s suede jacket · Episode
  "70s suede jacket": [
    "https://images.pexels.com/photos/36957075/pexels-photo-36957075.jpeg",
    "https://images.pexels.com/photos/33281891/pexels-photo-33281891.jpeg",
    "https://images.pexels.com/photos/33352747/pexels-photo-33352747.jpeg",
  ],

  // ════════ Moodboard: Future Utility ════════
  // Graphic print hoodie · Walter Van Beirendonck
  "Graphic print hoodie": [
    "https://images.pexels.com/photos/30407826/pexels-photo-30407826.jpeg",
    "https://images.pexels.com/photos/29211858/pexels-photo-29211858.jpeg",
    "https://images.pexels.com/photos/29211857/pexels-photo-29211857.jpeg",
  ],
  // Utility cargo trousers · Walter Van Beirendonck
  "Utility cargo trousers": [
    "https://images.pexels.com/photos/22856154/pexels-photo-22856154.jpeg",
    "https://images.pexels.com/photos/22856150/pexels-photo-22856150.jpeg",
    "https://images.pexels.com/photos/22856153/pexels-photo-22856153.jpeg",
  ],

  // ════════ Moodboard: Graphic Tees & Flannels ════════
  // Oversized flannel shirt · Think Twice 
  "Oversized flannel shirt": [
    "https://images.pexels.com/photos/6995735/pexels-photo-6995735.jpeg",
    "https://images.pexels.com/photos/6995724/pexels-photo-6995724.jpeg",
    "https://images.pexels.com/photos/6995734/pexels-photo-6995734.jpeg",
  ],

  // ════════ Moodboard: Monochrome Layers ════════
  // Asymmetric Black Shirt · Ann Demeulemeester
  "Asymmetric Black Shirt": [
    "/facets/asymmetric-black-shirt-1.jpg",
    "/facets/asymmetric-black-shirt-2.jpg",
    "/facets/asymmetric-black-shirt-3.jpg",
  ],
  // Vintage Wool Overcoat · Rosier 41
  "Vintage Wool Overcoat": [
    "/facets/vintage-wool-overcoat-1.jpg",
    "/facets/vintage-wool-overcoat-2.jpg",
    "/facets/vintage-wool-overcoat-3.jpg",
  ],
  // Pleated trousers · Episode
  "Pleated trousers": [
    "https://images.pexels.com/photos/16624071/pexels-photo-16624071.jpeg",
    "https://images.pexels.com/photos/16624072/pexels-photo-16624072.jpeg",
    "https://images.pexels.com/photos/16624066/pexels-photo-16624066.jpeg",
  ],
  // Camel wool blazer · Rosier 41
  "Camel wool blazer": [
    "https://images.pexels.com/photos/5585863/pexels-photo-5585863.jpeg",
    "https://images.pexels.com/photos/5585839/pexels-photo-5585839.jpeg",
    "https://images.pexels.com/photos/5585840/pexels-photo-5585840.jpeg",
  ],
  // Draped jersey top · Ann Demeulemeester
  "Draped jersey top": [
    "https://images.pexels.com/photos/18528252/pexels-photo-18528252.jpeg",
    "https://images.pexels.com/photos/18528247/pexels-photo-18528247.jpeg",
    "https://images.pexels.com/photos/18528253/pexels-photo-18528253.jpeg",
  ],
  // Black ankle boots · Ann Demeulemeester
  "Black ankle boots": [
    "https://images.pexels.com/photos/26587316/pexels-photo-26587316.jpeg",
    "https://images.pexels.com/photos/27256456/pexels-photo-27256456.jpeg",
  ],
  // Archive trench coat · Labels Inc.
  "Archive trench coat": [
    "https://images.pexels.com/photos/5442594/pexels-photo-5442594.jpeg",
    "https://images.pexels.com/photos/5438403/pexels-photo-5438403.jpeg",
    "https://images.pexels.com/photos/5445429/pexels-photo-5445429.jpeg",
  ],
  // Wool tailored blazer · Labels Inc.
  "Wool tailored blazer": [
    "https://images.pexels.com/photos/18951525/pexels-photo-18951525.jpeg",
    "https://images.pexels.com/photos/19230342/pexels-photo-19230342.jpeg",
    "https://images.pexels.com/photos/18951524/pexels-photo-18951524.jpeg",
  ],

  // Wide-leg trousers · Dries Van Noten – Het Modepaleis · 3 imgs  ⚠ DUPLICATE — same images as: Corduroy trousers, Pleated trousers, Baggy skate jeans, Fair-trade chinos, Utility cargo trousers
  "Wide-leg trousers": [
    "https://images.pexels.com/photos/31071849/pexels-photo-31071849.jpeg",
    "https://images.pexels.com/photos/31071833/pexels-photo-31071833.jpeg",
    "https://images.pexels.com/photos/31071844/pexels-photo-31071844.jpeg",
  ],
  // Minimal white shirt · Graanmarkt 13
  "Minimal white shirt": [
    "https://images.pexels.com/photos/9775773/pexels-photo-9775773.jpeg",
    "https://images.pexels.com/photos/9775825/pexels-photo-9775825.jpeg",
    "https://images.pexels.com/photos/9775770/pexels-photo-9775770.jpeg",
  ],
  // Neutral wool coat · Graanmarkt 13 · 3 imgs  ⚠ DUPLICATE — same images as: Vintage Wool Overcoat, Archive trench coat
  "Neutral wool coat": [
    "https://images.pexels.com/photos/19169213/pexels-photo-19169213.jpeg",
    "https://images.pexels.com/photos/19169217/pexels-photo-19169217.jpeg",
    "https://images.pexels.com/photos/19169209/pexels-photo-19169209.jpeg",
  ],

  // ════════ Moodboard: Nightlife Fits ════════
  // Embroidered crewneck · Arte Antwerp 
  "Embroidered crewneck": [
    "https://images.pexels.com/photos/1501213/pexels-photo-1501213.jpeg",
    "https://images.pexels.com/photos/1501212/pexels-photo-1501212.jpeg",
    "https://images.pexels.com/photos/1501214/pexels-photo-1501214.jpeg",
  ],

  // ════════ Moodboard: Print & Pattern Play ════════
  // Silk scarf print blouse · Rosier 41
  "Silk scarf print blouse": [
    "https://images.pexels.com/photos/13750473/pexels-photo-13750473.jpeg",
    "https://images.pexels.com/photos/14083605/pexels-photo-14083605.jpeg",
    "https://images.pexels.com/photos/14211152/pexels-photo-14211152.jpeg",
  ],
  // Embroidered slip dress · My Ohm
  "Embroidered slip dress": [
    "https://images.pexels.com/photos/37447890/pexels-photo-37447890.jpeg",
    "https://images.pexels.com/photos/37447896/pexels-photo-37447896.jpeg",
    "https://images.pexels.com/photos/37447892/pexels-photo-37447892.jpeg",
  ],
  // Printed bowling shirt · Arte Antwerp
  "Printed bowling shirt": [
    "https://images.pexels.com/photos/7429503/pexels-photo-7429503.jpeg",
    "https://images.pexels.com/photos/7429627/pexels-photo-7429627.jpeg",
    "https://images.pexels.com/photos/7404659/pexels-photo-7404659.jpeg",
  ],
  // Bold knit sweater · Walter Van Beirendonck
  "Bold knit sweater": [
    "https://images.pexels.com/photos/26549248/pexels-photo-26549248.jpeg",
    "https://images.pexels.com/photos/26549241/pexels-photo-26549241.jpeg",
    "https://images.pexels.com/photos/26549235/pexels-photo-26549235.jpeg",
  ],
  // Printed silk scarf · Walter Van Beirendonck
  "Printed silk scarf": [
    "https://images.pexels.com/photos/9494545/pexels-photo-9494545.jpeg",
    "https://images.pexels.com/photos/9494543/pexels-photo-9494543.jpeg",
    "https://images.pexels.com/photos/9494544/pexels-photo-9494544.jpeg"
  ],
  // Floral print shirt · Dries Van Noten – Het Modepaleis
  "Floral print shirt": [
    "https://images.pexels.com/photos/5405427/pexels-photo-5405427.jpeg",
    "https://images.pexels.com/photos/9660091/pexels-photo-9660091.jpeg",
    "https://images.pexels.com/photos/5405439/pexels-photo-5405439.jpeg",
  ],
  // Printed silk scarf · Dries Van Noten – Het Modepaleis
  "Signature silk scarf": [
    "https://images.pexels.com/photos/17640268/pexels-photo-17640268.jpeg",
    "https://images.pexels.com/photos/17640273/pexels-photo-17640273.jpeg",
    "https://images.pexels.com/photos/17640270/pexels-photo-17640270.jpeg",
  ],

  // ════════ Moodboard: Skater Boy Aesthetics ════════
  // Skate Graphic Tee · VIER
  "Skate Graphic Tee": [
    "/facets/skate-graphic-tee-1.jpg",
    "/facets/skate-graphic-tee-2.jpg",
    "/facets/skate-graphic-tee-3.jpg",
  ],
  // Baggy skate jeans · VIER
  "Baggy skate jeans": [
    "https://images.pexels.com/photos/35568704/pexels-photo-35568704.jpeg",
    "https://images.pexels.com/photos/35568702/pexels-photo-35568702.jpeg",
    "https://images.pexels.com/photos/35568695/pexels-photo-35568695.jpeg",
  ],
  // Logo skate hoodie · VIER
  "Logo skate hoodie": [
    "https://images.pexels.com/photos/28701952/pexels-photo-28701952.jpeg",
    "https://images.pexels.com/photos/28701965/pexels-photo-28701965.jpeg",
    "https://images.pexels.com/photos/28701959/pexels-photo-28701959.jpeg",
  ],

  // ════════ Moodboard: Slow & Natural ════════
  // Organic Cotton Knit · Supergoods
  "Organic Cotton Knit": [
    "/facets/organic-cotton-knit-1.jpg",
    "/facets/organic-cotton-knit-2.jpg",
    "/facets/organic-cotton-knit-3.jpg",
  ],
  // Patchwork tote · My Ohm
  "Patchwork tote": [
    "https://images.pexels.com/photos/16794733/pexels-photo-16794733.jpeg",
    "https://images.pexels.com/photos/16794739/pexels-photo-16794739.jpeg",
    "https://images.pexels.com/photos/16794746/pexels-photo-16794746.jpeg",
  ],
  // Fair-trade chinos · Supergoods
  "Fair-trade chinos": [
    "https://images.pexels.com/photos/7705920/pexels-photo-7705920.jpeg",
    "https://images.pexels.com/photos/7705949/pexels-photo-7705949.jpeg",
    "https://images.pexels.com/photos/7705907/pexels-photo-7705907.jpeg",
  ],
  // Recycled wool cardigan · Supergoods
  "Recycled wool cardigan": [
    "https://images.pexels.com/photos/5712100/pexels-photo-5712100.jpeg",
    "https://images.pexels.com/photos/5712097/pexels-photo-5712097.jpeg",
    "https://images.pexels.com/photos/5712104/pexels-photo-5712104.jpeg",
  ],
  // Embellished knit · Dries Van Noten – Het Modepaleis
  "Embellished knit": [
    "https://images.pexels.com/photos/5789012/pexels-photo-5789012.jpeg",
    "https://images.pexels.com/photos/5789006/pexels-photo-5789006.jpeg",
    "https://images.pexels.com/photos/5789013/pexels-photo-5789013.jpeg",
  ],
  // Cashmere crew knit · Graanmarkt 13
  "Cashmere crew knit": [
    "https://images.pexels.com/photos/6073526/pexels-photo-6073526.jpeg",
    "https://images.pexels.com/photos/6073534/pexels-photo-6073534.jpeg",
    "https://images.pexels.com/photos/6073545/pexels-photo-6073545.jpeg",
  ],
};
