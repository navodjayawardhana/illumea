/**
 * A product as the site draws it. `id`, price and stock come from Vertik ERP (see
 * services/api.ts); everything else falls back to CONTENT below when the ERP has nothing.
 */
export interface Product {
  id: string;
  slug?: string;
  name: string;
  subtitle: string;
  category: string;
  price: number;
  inStock?: boolean;
  stock?: number;
  weightGrams?: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
  size: string;
  tag?: string;
  isDiscount?: boolean;
  isBestSeller?: boolean;
  description: string;
  benefits: string[];
  ingredients: string[];
  usage: string;
}

/**
 * The long copy for each product - benefits, ingredients, how to use - matched to the ERP's
 * product by name. Prices and ids here are not used for selling: an order can only be placed for
 * a product the ERP has published, at the ERP's price.
 */
export const CONTENT: Product[] = [
  {
    id: 'brightening-night-cream-50g',
    name: 'Brightening Night Cream',
    subtitle: 'Intensive overnight restorative herbal treatment',
    category: 'Creams',
    price: 3775,
    originalPrice: 4200,
    rating: 4.9,
    reviewCount: 38,
    image: '/images/night-cream.jpg',
    size: '50g',
    tag: 'Best Seller',
    isBestSeller: true,
    isDiscount: true,
    description: 'A luxurious night formulation infused with potent botanical extracts that work overnight to repair skin cells, reduce hyperpigmentation, and restore an illuminated, youthful glow by morning.',
    benefits: [
      'Visible skin brightening & tone evening within 14 days',
      'Fades dark spots, acne scars, and sun pigmentation',
      'Deep cellular hydration without clogging pores',
      'Rich in natural antioxidants that fight premature aging'
    ],
    ingredients: ['Licorice Root Extract', 'Saffron Extract', 'Niacinamide (Vitamin B3)', 'Almond Oil', 'Aloe Vera Leaf Juice', 'Vitamin E'],
    usage: 'After cleansing and toning at night, gently massage a coin-sized amount onto face and neck in upward circular motions until fully absorbed.'
  },
  {
    id: 'activated-charcoal-face-pack-100g',
    name: 'Activated Charcoal Face Pack',
    subtitle: 'Deep detoxifying & pore refining clay pack',
    category: 'Face Packs',
    price: 3000,
    rating: 4.8,
    reviewCount: 26,
    image: '/images/charcoal-pack.jpg',
    size: '100g',
    tag: 'Popular',
    description: 'Formulated with ultra-fine activated bamboo charcoal and purifying mineral clays that draw out micro-pollutants, excess sebum, and blackheads to reveal fresh, balanced skin.',
    benefits: [
      'Draws out impurities, toxins, and environmental pollutants',
      'Unclogs and visually shrinks enlarged pores',
      'Controls excess oil production without stripping natural moisture',
      'Soothes inflammation and prevents breakout cycles'
    ],
    ingredients: ['Activated Bamboo Charcoal', 'Kaolin Clay', 'Bentonite Clay', 'Tea Tree Essential Oil', 'Witch Hazel Extract', 'Cucumber Extract'],
    usage: 'Apply an even layer over cleansed face, avoiding delicate eye and lip areas. Leave on for 15-20 minutes until dry, then rinse gently with lukewarm water.'
  },
  {
    id: 'anti-aging-cream-100ml',
    name: 'Illumea Anti-Aging Cream',
    subtitle: 'Firming, wrinkle smoothing & collagen boosting cream',
    category: 'Creams',
    price: 4500,
    originalPrice: 5100,
    rating: 4.9,
    reviewCount: 42,
    image: '/images/anti-aging.jpg',
    size: '100ml',
    tag: 'Advanced Care',
    isDiscount: true,
    description: 'An advanced age-defying cream developed with clinically proven herbal peptides and botanical oils that boost skin elasticity, reduce fine lines, and firm sagging skin contour.',
    benefits: [
      'Reduces appearance of fine lines, wrinkles, and crow’s feet',
      'Enhances collagen synthesis and natural skin firmness',
      'Intensely nourishes dry and mature skin barriers',
      'Provides an instant lifting and smoothing effect'
    ],
    ingredients: ['Gotu Kola (Centella Asiatica) Extract', 'Rosehip Seed Oil', 'Hyaluronic Acid Complex', 'Retinyl Palmitate (Gentle Retinol)', 'Coenzyme Q10'],
    usage: 'Apply morning and night to face, neck, and décolletage after serums. Smooth upwards with gentle pressure.'
  },
  {
    id: 'pigment-cure-cream-50g',
    name: 'Illumea Pigment Cure Cream',
    subtitle: 'Targeted correction for melasma, spots & pigmentation',
    category: 'Creams',
    price: 7900,
    originalPrice: 8500,
    rating: 5.0,
    reviewCount: 57,
    image: '/images/pigment-cure.jpg',
    size: '50g',
    tag: 'Clinical Strength',
    isBestSeller: true,
    isDiscount: true,
    description: 'A targeted clinical herbal solution specifically engineered to eliminate stubborn pigmentation, melasma, dark patches, and acne marks with zero harsh bleaching agents.',
    benefits: [
      'Blocks melanin overproduction at the cellular level',
      'Clinically safe for sensitive Asian and tropical skin tones',
      'Free from hydroquinone, steroids, and harmful bleaching agents',
      'Leaves skin visibly clearer, radiant, and spot-free'
    ],
    ingredients: ['Alpha Arbutin', 'Turmeric Rhizome Extract', 'Kojic Dipalmitate', 'Mulberry Root Extract', 'Kakadu Plum (Vitamin C)', 'Jojoba Oil'],
    usage: 'Apply a targeted thin layer to hyperpigmented areas or full face before bedtime. Use consistently for 4 to 8 weeks.'
  },
  {
    id: 'moisturizing-body-lotion-300ml',
    name: 'Illumea Moisturizing Body Lotion',
    subtitle: '24-hour deep hydrating & skin softening lotion',
    category: 'Toners & Lotions',
    price: 4600,
    rating: 4.8,
    reviewCount: 31,
    image: '/images/body-lotion.jpg',
    size: '300ml',
    description: 'Enriched with pure virgin coconut oil, shea butter, and natural emollients to cocoon your body in silk-like softness, lock in moisture for 24 hours, and restore natural glow.',
    benefits: [
      'Non-greasy, fast-absorbing luxury formula',
      'Relieves dry, flaky, and rough patches on elbows and legs',
      'Scented with gentle, calming natural botanical aromas',
      'Protects skin barrier against tropical humidity and air conditioning'
    ],
    ingredients: ['Virgin Coconut Oil', 'Raw Shea Butter', 'Sweet Almond Extract', 'Glycerin', 'Vitamin E Acetate', 'Calendula Flower Water'],
    usage: 'Smooth generously over entire body following your bath or shower. Reapply throughout the day as needed.'
  },
  {
    id: 'fairness-sun-protective-day-cream-50g',
    name: 'Fairness & Sun Protective Day Cream',
    subtitle: 'UV defense SPF 30+ & radiant daily shield',
    category: 'Creams',
    price: 3600,
    rating: 4.7,
    reviewCount: 34,
    image: '/images/day-cream.jpg',
    size: '50g',
    tag: 'Daily Shield',
    description: 'A dual-action daily moisturizer and broad-spectrum sun defense that shields your skin from UVA/UVB rays and blue light while maintaining all-day matte radiance.',
    benefits: [
      'Broad spectrum SPF protection against sun tan & dark spots',
      'Lightweight, zero white-cast formulation suited for everyday wear',
      'Provides natural instant brightness and satin finish',
      'Works seamlessly under makeup or as a stand-alone protector'
    ],
    ingredients: ['Micronized Zinc Oxide', 'Red Sandalwood Extract', 'Licorice Extract', 'Green Tea Extract', 'Niacinamide'],
    usage: 'Apply evenly on face and exposed areas 15 minutes before sun exposure. Reapply every 3-4 hours if outdoors.'
  },
  {
    id: 'hydrating-toner',
    name: 'Illumea Hydrating Toner',
    subtitle: 'Pore-tightening & balancing herbal mist',
    category: 'Toners & Lotions',
    price: 1350,
    originalPrice: 1550,
    rating: 4.9,
    reviewCount: 45,
    image: '/images/toner.jpg',
    size: '120ml',
    tag: 'Value Choice',
    isDiscount: true,
    description: 'A refreshing botanical face mist that restores the natural pH balance of your skin, sweeps away residual dead cells, and preps your complexion for maximum moisture absorption.',
    benefits: [
      'Balances skin pH immediately after facial cleansing',
      'Tightens pores and minimizes oil accumulation',
      'Calms redness, irritation, and sunburn sensitivity',
      'Can be misted throughout the day to rehydrate and refresh skin'
    ],
    ingredients: ['Steam-Distilled Rose Petal Hydrosol', 'Witch Hazel Water', 'Chamomile Extract', 'Hyaluronic Acid', 'Aloe Vera'],
    usage: 'Spray directly over face with eyes closed, or apply with a soft cotton pad across skin after cleansing.'
  },
  {
    id: 'scrub-100g',
    name: 'Illumea Exfoliating Scrub',
    subtitle: 'Gentle micro-exfoliation for glowing, silky skin',
    category: 'Cleansers & Scrubs',
    price: 3000,
    rating: 4.8,
    reviewCount: 29,
    image: '/images/scrub.jpg',
    size: '100g',
    description: 'A gentle exfoliating formula blended with finely milled walnut kernels and herbal oils that softly sweeps away dead skin cells without micro-tears, restoring radiant smoothness.',
    benefits: [
      'Removes dull, dead outer surface cells instantly',
      'Prevents ingrown hair and stubborn blackhead build-up',
      'Stimulates microcirculation for a natural rosy flush',
      'Non-abrasive, suitable for all skin types'
    ],
    ingredients: ['Finely Ground Walnut Shells', 'Sandalwood Powder', 'Turmeric Root Oil', 'Apricot Kernel Oil', 'Honey Extract'],
    usage: 'Gently massage in circular motions on damp skin for 1-2 minutes, paying attention to T-zone. Rinse thoroughly with lukewarm water. Use twice a week.'
  },
  {
    id: 'face-wash-100ml',
    name: 'Illumea Gentle Herbal Face Wash',
    subtitle: 'Soap-free daily foaming cleanser for pure skin',
    category: 'Cleansers & Scrubs',
    price: 2250,
    rating: 4.9,
    reviewCount: 39,
    image: '/images/night-cream.jpg',
    size: '100ml',
    description: 'A pH-balanced, sulfate-free cleanser formulated with calming herbs that purifies deep inside pores while retaining natural moisture, leaving your face clean, soft, and refreshed.',
    benefits: [
      '100% soap-free and sulfate-free (SLS/SLES free)',
      'Removes daily dirt, makeup traces, and oil without tightness',
      'Maintains natural skin moisture barrier',
      'Dermatologically tested for daily morning & night use'
    ],
    ingredients: ['Neem Leaf Extract', 'Tulsi (Holy Basil)', 'Aloe Vera', 'Vegetable Glycerin', 'Vitamin B5'],
    usage: 'Lather a small pump in wet palms, massage over damp face in circular motions, and rinse clean with water.'
  },
  {
    id: 'anti-acne-face-wash-100ml',
    name: 'Illumea Anti-Acne Face Wash',
    subtitle: 'Clarifying formula with tea tree & neem extracts',
    category: 'Cleansers & Scrubs',
    price: 2500,
    rating: 4.9,
    reviewCount: 44,
    image: '/images/charcoal-pack.jpg',
    size: '100ml',
    tag: 'Acne Care',
    description: 'Targeted clarifying cleanser specially created for blemish-prone and oily skin. Powered by tea tree oil and salicylic acid to combat acne bacteria and clear stubborn pimples.',
    benefits: [
      'Targets active acne, pimples, and reduces inflammation',
      'Controls sebum without causing rebound dryness',
      'Clears clogged pores and blackheads',
      'Soothes redness and post-acne pigmentation'
    ],
    ingredients: ['Australian Tea Tree Oil', 'Neem Extract', 'Salicylic Acid (Natural Willow Bark)', 'Zinc PCA', 'Clove Bud Extract'],
    usage: 'Use twice daily. Apply gently onto wet skin, work into a rich lather, let sit for 30 seconds, and rinse off.'
  },
  {
    id: 'deep-cleanser-100ml',
    name: 'Illumea Deep Cleanser',
    subtitle: 'Purifying micellar cleansing milk for makeup & impurities',
    category: 'Cleansers & Scrubs',
    price: 2400,
    rating: 4.7,
    reviewCount: 22,
    image: '/images/body-lotion.jpg',
    size: '100ml',
    description: 'A silky cleansing emulsion that melts away waterproof makeup, sunscreen, and stubborn urban pollution particles without stripping the delicate facial acid mantle.',
    benefits: [
      'Dissolves heavy makeup and waterproof sunblock effortlessly',
      'Leaves skin silky smooth, soft, and deeply purified',
      'Enriched with soothing botanicals to prevent redness',
      'Ideal as step one in double cleansing'
    ],
    ingredients: ['Almond Oil', 'Cucumber Fruit Extract', 'Chamomile Floral Water', 'Coconut Triglycerides', 'Vitamin E'],
    usage: 'Apply onto dry or damp skin, massage gently across face and neck, then wipe away with a warm damp washcloth or rinse clean.'
  }
];

export const CORE_VALUES = [
  {
    title: 'Quality',
    description: 'Commitment to maintaining the highest standards in every product we create. We ensure that every Illumea product meets strict GMP-certified manufacturing standards, guaranteeing consistency, purity, and excellence.',
    icon: 'ShieldCheck'
  },
  {
    title: 'Customer-Centricity',
    description: 'Placing our customers’ safety, satisfaction, and needs at the heart of everything we do. Your well-being drives our work — from ingredient selection to packaging — every decision is made with you in mind.',
    icon: 'HeartHandshake'
  },
  {
    title: 'Integrity',
    description: 'Ensuring transparency and honesty in our processes, ingredients, and claims. We promise clarity in what we offer — no hidden chemicals, no exaggerated promises, just honest skincare you can trust.',
    icon: 'Sparkles'
  },
  {
    title: 'Sustainability',
    description: 'Embracing environmentally friendly practices and ethical sourcing of ingredients. Our formulations and packaging are designed to respect nature, reduce waste, and protect the planet for future generations.',
    icon: 'Leaf'
  },
  {
    title: 'Affordability',
    description: 'Striving to make premium skincare accessible to everyone. Luxury should not be out of reach — we deliver world-class skincare at prices that suit every lifestyle.',
    icon: 'Coins'
  },
  {
    title: 'Innovation',
    description: 'Continuously enhancing our products through research and innovation, blending nature and science. Illumea combines time-tested herbal traditions with modern skincare science, creating products that are both effective and safe.',
    icon: 'FlaskConical'
  },
  {
    title: 'Wellness & Safety',
    description: 'Guaranteeing that every product is free from harmful chemicals, prioritizing the health and well-being of our customers. We ensure all our products are paraben-free, sulfate-free, and bleaching-free — protecting your skin while enhancing its natural beauty.',
    icon: 'HeartPulse'
  }
];

export const WHY_CHOOSE_US = [
  {
    title: 'Visible Results',
    description: 'Experience noticeable improvements in skin brightness, tone, and texture with our specially formulated botanical products.'
  },
  {
    title: 'Quality Assurance',
    description: 'Manufactured in NMRA & GMP certified facilities, ensuring the highest standards of international safety, efficacy, and quality.'
  },
  {
    title: 'Premium Ingredients',
    description: 'Each product is crafted with carefully selected, high-grade natural ingredients designed to address specific skincare needs.'
  },
  {
    title: 'Comprehensive Care',
    description: 'Our range includes everything from cleansing to targeted treatment, providing a complete skincare routine for optimal results.'
  },
  {
    title: 'Trusted Expertise',
    description: 'Backed by Sansu International’s dedication to excellence, Illumea combines expert knowledge with advanced skincare technology.'
  },
  {
    title: 'Gentle & Effective',
    description: 'Formulated to be suitable for various skin types, including sensitive skin, while delivering powerful, proven results.'
  }
];

export const BRAND_GUARANTEES = [
  {
    title: 'Global Shipping',
    description: 'Your orders are shipped seamlessly between countries with swift local island-wide courier dispatch.',
    icon: 'Truck'
  },
  {
    title: '100% Original Product',
    description: '100% Original herbal product covered by warranty from Sansu International Pvt Ltd.',
    icon: 'BadgeCheck'
  },
  {
    title: '30 Days Warranty',
    description: 'Satisfaction guaranteed. You have the right to return or exchange your orders within 30 days.',
    icon: 'RotateCcw'
  },
  {
    title: '100% Secure Checkout',
    description: 'Your payments and customer details are strictly secured with private encrypted protocols.',
    icon: 'Lock'
  }
];

export const PARTNERS = [
  'utosia',
  'nirastate',
  'goldline',
  'solaytic',
  'fox-hub',
  'circle',
  'asgardia',
  'amara'
];
