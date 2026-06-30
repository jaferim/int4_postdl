// src/lib/curators.js

/*** Front-end curator config: the source of truth for the people who give kar.at its authentic, warm voice. *** 

The Strapi data only carries thin curator stubs (name/handle/bio on a few facets) and most moodboards have no curator, so rather than restructure the data pipeline we define the curator personas here and *reference real moodboards by title*. This one file feeds three features:
   1. the curator detail page (/curators/:slug)
   2. the onboarding "who's showing you around?" step
   3. the persistent curator filter bar

Each curator owns a `theme` (a `data-theme` palette — see web/src/index.css), a set of `moodboards` (by title, matched against graph nodes), and a `centerMoodboard` the canvas re-centres on when they're chosen. ***/

export const CURATORS = [
  {
    slug: "vincent",
    name: "Vincent D.",
    handle: "@dupont.vince",
    subculture: "Urban Streetwear",
    tone: "Vibrant, loud & structural streetwear style",
    bio: "Streetwear with an artist's eye. Loud, structural silhouettes pulled from Antwerp's boutiques and skate spots.",
    antwerpTip:
      "Kammenstraat is the main street for streetwear. Start at the Arte Antwerp flagship and the Ultimate Sneaker Store, then check the smaller independent shops along the same street.",
    theme: "orange-lime",
    avatar: "/assets/images/curator-vincent.jpg",
    moodboards: [
      "Skater Boy Aesthetics",
      "Graphic Tees & Flannels",
      "Denim Revival",
    ],
    centerMoodboard: "Skater Boy Aesthetics",
  },
  {
    slug: "noor",
    name: "Noor B.",
    handle: "@by.noor.bauwens",
    subculture: "Curated Vintage",
    tone: "Scrappy thrift enthusiast seeking stories in style pieces!",
    bio: "A thrift devotee digging the city's flea markets and second-hand rails for pieces with a real story.",
    antwerpTip:
      "For everyday vintage, go to Think Twice and Episode on Kammenstraat. For older and rarer pieces, walk along Kloosterstraat. Visit on a Friday for the Vrijdagmarkt flea market, or a Sunday for the brocante market at Sint-Annaplein.",
    theme: "amber-rust",
    avatar: "/assets/images/curator-noor.jpg",
    moodboards: ["Actually cheap vintage jackets", "Café Crate-Digging"],
    centerMoodboard: "Actually cheap vintage jackets",
  },
  {
    slug: "maaike",
    name: "Maaike V.",
    handle: "@maaikeinantwerp",
    subculture: "Conscious Slow Fashion",
    tone: "Slowing fashion down in a rapidly changing world.",
    bio: "Slow, conscious fashion. I focus on ethical labels and natural materials, chosen to last. There is no Planet B.",
    antwerpTip:
      "Supergoods and the sustainable section of the HOST concept store stock ethical labels. For affordable second-hand, the Kringwinkel charity shops have many locations across the city.",
    theme: "green-lime",
    avatar: "/assets/images/curator-maaike.jpg",
    moodboards: ["Slow & Natural"],
    centerMoodboard: "Slow & Natural",
  },
  {
    slug: "lexx",
    name: "Lexx",
    handle: "@maxxlexxx",
    subculture: "Eclectic & Print-Driven",
    tone: "Fun-loving maximalist with a penchant for the night scene",
    bio: "Bold, print-driven maximalist. I love eclectic looks that come alive after dark - the perfect time to discover Antwerp!",
    antwerpTip:
      "Walk down Nationalestraat into the Zuid district. See the iconic Dries Van Noten boutique and more, then look for the independent ateliers and jewellery studios in between. Stop by the Essentiel Antwerp store for even more bold prints and colors.",
    theme: "pink-blue",
    avatar: "/assets/images/curator-lexx.jpg",
    moodboards: ["Print & Pattern Play", "Nightlife Fits"],
    centerMoodboard: "Print & Pattern Play",
  },
  {
    slug: "senne",
    name: "Senne V.",
    handle: "@senne_vandenbosch",
    subculture: "Tailored Sportswear",
    tone: "Impeccable tailoring and formal wear, made for movement.",
    bio: "Tailored sportswear with a luxe, athletic edge. Structured pieces that move and last.",
    antwerpTip:
      "This look traces back to Dirk Bikkembergs and his sport couture. See his pieces in the Antwerp Six collection at the MoMu fashion museum, then browse the designer shops around Meir and Nationalestraat for tailored, technical fashion.",
    theme: "blue-pink",
    avatar: "/assets/images/curator-senne.jpg",
    moodboards: ["90s Sportswear", "Future Utility"],
    centerMoodboard: "90s Sportswear",
  },
  {
    slug: "fleur",
    name: "Fleur Iven",
    handle: "@fleuriven",
    subculture: "Dark Avant-Garde",
    tone: "Innovative fashion + Antwerp in monochrome.",
    bio: "🖤",
    antwerpTip:
      "Start at Labels Inc. for designer consignment, then visit the Ann Demeulemeester store and the MoMu shop. The Nationalestraat boutiques carry the monochrome, deconstructed pieces this look is built on.",
    theme: "mono-dark",
    avatar: "/assets/images/curator-fleur.jpg",
    moodboards: ["Monochrome Layers", "Alternative Edge"],
    centerMoodboard: "Monochrome Layers",
  },
];

export const getCuratorBySlug = (slug) =>
  CURATORS.find((c) => c.slug === slug) ?? null;

export const getCuratorByName = (name) =>
  CURATORS.find((c) => c.name === name) ?? null;

// The curator who owns a given moodboard, matched by title against each
// curator's `moodboards` list. Moodboards mostly carry no curator in the Strapi
// data, so this front-end mapping is what lets a moodboard node show its
// curator's avatar/name (see MoodNode).
export const getCuratorByMoodboardTitle = (title) =>
  CURATORS.find((c) => c.moodboards.includes(title)) ?? null;

// Curators whose subculture is among the chosen onboarding styles (used to
// narrow the "who's showing you around?" list to the picked subcultures).
export const curatorsForStyles = (styles = []) =>
  CURATORS.filter((c) => styles.includes(c.subculture));
