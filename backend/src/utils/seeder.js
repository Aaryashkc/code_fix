const mongoose = require('mongoose');
const Destination = require('../models/Destination');

const destinationsData = [
  // ─── ADVENTURE ───────────────────────────────────────────────────────────────
  {
    name: "Everest Base Camp Trek",
    slug: "everest-base-camp-trek",
    category: "Adventure",
    region: "Eastern",
    description: "The Everest Base Camp Trek is the world's most iconic high-altitude journey. Starting from Lukla (2,860m), the trail winds through the Khumbu Valley, past roaring glacial rivers and mani stone walls, through the bustling Sherpa hub of Namche Bazaar (3,440m), and on to the legendary Base Camp at 5,364m. Along the way, trekkers acclimatise at Tengboche Monastery — home to the famous Mani Rimdu festival — with a direct view of Ama Dablam. From Kala Patthar (5,545m), the classic sunrise panorama of Everest, Lhotse, Nuptse, and the Khumbu Icefall is unrivalled anywhere on Earth.",
    shortDescription: "Stand at the foot of the world's highest peak with iconic sunrise views from Kala Patthar.",
    images: [
      "https://images.unsplash.com/photo-k05D8dlaZQg?w=1200&q=80",
      "https://images.unsplash.com/photo-Vsn5YH9sMeA?w=1200&q=80"
    ],
    rating: 4.9,
    reviewCount: 342,
    priceRange: "Rs Rs Rs",
    bestSeason: "March-May, September-November",
    duration: "12-14 days",
    difficulty: "Challenging",
    location: { type: "Point", coordinates: [86.925, 28.002], address: "Solukhumbu District, Koshi Province" },
    features: ["Kala Patthar Sunrise", "Tengboche Monastery", "Khumbu Icefall View", "Sherpa Culture", "Tea House Trek"],
    nearbyAttractions: ["Namche Bazaar", "Gokyo Lakes", "Cho La Pass", "Ama Dablam Base Camp"],
    published: true,
    verificationStatus: "approved"
  },
  {
    name: "Annapurna Circuit Trek",
    slug: "annapurna-circuit-trek",
    category: "Adventure",
    region: "Western",
    description: "Widely regarded as one of the greatest treks on the planet, the Annapurna Circuit circumnavigates the entire Annapurna massif through a staggering range of ecosystems. Beginning in the subtropical rice terraces of Besisahar, the trail climbs through oak and rhododendron forests, the arid high-altitude Manang Valley, and over the legendary Thorong La Pass at 5,416m. Descending to the sacred pilgrimage town of Muktinath, trekkers enter the rain shadow landscape of Upper Mustang before finishing in Pokhara. The route passes through Gurung, Manangi, Thakali, and Mustangi communities, offering unmatched cultural diversity.",
    shortDescription: "Circle the entire Annapurna massif crossing the 5,416m Thorong La Pass.",
    images: [
      "https://images.unsplash.com/photo-9fy1xiAre8o?w=1200&q=80",
      "https://images.unsplash.com/photo-l7Y3V6bcw9c?w=1200&q=80"
    ],
    rating: 4.8,
    reviewCount: 287,
    priceRange: "Rs Rs Rs",
    bestSeason: "March-May, October-November",
    duration: "15-20 days",
    difficulty: "Challenging",
    location: { type: "Point", coordinates: [83.8583, 28.5305], address: "Gandaki Province" },
    features: ["Thorong La Pass (5,416m)", "Muktinath Temple", "Diverse Ecosystems", "Manang Valley", "Rain Shadow Desert"],
    nearbyAttractions: ["Manang Village", "Tilicho Lake", "Jomsom Bazaar", "Kagbeni"],
    published: true,
    verificationStatus: "approved"
  },
  {
    name: "Annapurna Base Camp Trek",
    slug: "annapurna-base-camp-trek",
    category: "Adventure",
    region: "Western",
    description: "The Annapurna Base Camp Trek leads into the heart of the Annapurna Sanctuary — a glacial amphitheatre ringed by 360° of Himalayan giants including Annapurna I (8,091m), Machhapuchhre (6,993m), Hiunchuli, and Gangapurna. The route passes through the Gurung village of Ghandruk, dense rhododendron forests ablaze with colour in spring, and the Modi Khola river gorge. Reaching Base Camp at 4,130m, trekkers are completely surrounded by some of the world's tallest peaks — a singular wilderness experience accessible to moderately fit hikers.",
    shortDescription: "Trek into a glacial amphitheatre encircled by 360° of Himalayan peaks.",
    images: [
      "https://images.unsplash.com/photo-0Fbun7Wl9dM?w=1200&q=80",
      "https://images.unsplash.com/photo-asVf55eG4C8?w=1200&q=80"
    ],
    rating: 4.8,
    reviewCount: 312,
    priceRange: "Rs Rs",
    bestSeason: "March-May, October-November",
    duration: "7-10 days",
    difficulty: "Moderate",
    location: { type: "Point", coordinates: [83.8781, 28.5308], address: "Kaski District, Gandaki Province" },
    features: ["Annapurna Sanctuary", "Machhapuchhre Views", "Ghandruk Village", "Rhododendron Forests", "Hot Springs at Jhinu"],
    nearbyAttractions: ["Pokhara", "Ghandruk", "Chhomrong", "Landruk"],
    published: true,
    verificationStatus: "approved"
  },
  {
    name: "Langtang Valley Trek",
    slug: "langtang-valley-trek",
    category: "Adventure",
    region: "Central",
    description: "The Langtang Valley Trek is Nepal's closest major trekking region to Kathmandu, yet remains remarkably unspoiled. The trail ascends through bamboo and oak forests into Langtang National Park, home to red pandas and Himalayan black bears. The valley opens into a high alpine landscape of glaciers and yak pastures. At Kyanjin Gompa (3,870m), trekkers are rewarded with panoramic views of Langtang Lirung (7,227m) and can taste authentic yak cheese made at the local dairy. The sacred Gosaikunda Lake (4,380m) lies within a day's hike.",
    shortDescription: "Nepal's closest Himalayan valley to Kathmandu — red pandas, glaciers, and yak cheese.",
    images: [
      "https://images.unsplash.com/photo-dW51UwSobT0?w=1200&q=80",
      "https://images.unsplash.com/photo-xc2GggytytA?w=1200&q=80"
    ],
    rating: 4.6,
    reviewCount: 234,
    priceRange: "Rs Rs",
    bestSeason: "March-May, September-November",
    duration: "7-10 days",
    difficulty: "Moderate",
    location: { type: "Point", coordinates: [85.5635, 28.2136], address: "Rasuwa District, Bagmati Province" },
    features: ["Kyanjin Gompa", "Gosaikunda Lake", "Yak Cheese Dairy", "Langtang Lirung Views", "Red Panda Habitat"],
    nearbyAttractions: ["Gosaikunda Lake", "Helambu Circuit", "Trishuli River Rafting", "Syabru Besi"],
    published: true,
    verificationStatus: "approved"
  },
  {
    name: "Upper Mustang Trek",
    slug: "upper-mustang-trek",
    category: "Adventure",
    region: "Western",
    description: "Upper Mustang — the former Forbidden Kingdom of Lo — remained closed to outsiders until 1992, and its ancient Tibetan culture is almost entirely intact. The landscape is unlike anywhere else in Nepal: wind-sculpted ochre and red cliffs, medieval cave monasteries, and the walled capital of Lo Manthang (3,840m) with its 15th-century palace and gompa. The trek requires a special Restricted Area Permit. The Tiji Festival (April/May) — a three-day masked dance ritual — is one of the most extraordinary cultural spectacles in the Himalayas.",
    shortDescription: "The forbidden Tibetan kingdom — ancient cave monasteries and the walled city of Lo Manthang.",
    images: [
      "https://images.unsplash.com/photo-Tg1E3435-sM?w=1200&q=80",
      "https://images.unsplash.com/photo-9fy1xiAre8o?w=1200&q=80"
    ],
    rating: 4.9,
    reviewCount: 156,
    priceRange: "Rs Rs Rs",
    bestSeason: "March-November",
    duration: "12-14 days",
    difficulty: "Moderate",
    location: { type: "Point", coordinates: [83.9188, 29.1833], address: "Mustang District, Gandaki Province" },
    features: ["Lo Manthang Walled City", "Restricted Area Permit", "Ancient Cave Monasteries", "Tiji Festival", "Tibetan Culture"],
    nearbyAttractions: ["Kagbeni Village", "Muktinath Temple", "Jomsom", "Dhaulagiri Base Camp"],
    published: true,
    verificationStatus: "approved"
  },

  // ─── NATURE ──────────────────────────────────────────────────────────────────
  {
    name: "Pokhara & Phewa Lake",
    slug: "pokhara-phewa-lake",
    category: "Nature",
    region: "Western",
    description: "Pokhara, Nepal's adventure capital, sits beside the shimmering Phewa Lake at 820m elevation with an unobstructed northern horizon of the entire Annapurna-Dhaulagiri wall. Sunrise at Sarangkot (1,592m) — where Machapuchare, Annapurna South, and Dhaulagiri ignite in alpenglow — is among the most photographed moments in Nepal. Paragliders launch from Sarangkot to land lakeside, kayakers paddle across the mirror-calm lake, and the World Peace Pagoda gleams white on the southern ridge. Pokhara is also the gateway to the Annapurna and Mustang regions.",
    shortDescription: "Nepal's adventure capital — paragliding, Phewa Lake boating, and the Annapurna sunrise from Sarangkot.",
    images: [
      "https://images.unsplash.com/photo-beC1uWWNm4k?w=1200&q=80",
      "https://images.unsplash.com/photo-OTLJPyzceb0?w=1200&q=80"
    ],
    rating: 4.9,
    reviewCount: 512,
    priceRange: "Rs Rs",
    bestSeason: "Year-round (best Oct-Apr)",
    duration: "2-4 days",
    difficulty: "Easy",
    location: { type: "Point", coordinates: [83.9856, 28.2096], address: "Pokhara, Gandaki Province" },
    features: ["Paragliding from Sarangkot", "Phewa Lake Boating", "Sarangkot Sunrise", "World Peace Pagoda", "Annapurna Views"],
    nearbyAttractions: ["Sarangkot Hill", "Davis Falls", "Gupteshwor Cave", "Begnas Lake", "Bindhyabasini Temple"],
    published: true,
    verificationStatus: "approved"
  },
  {
    name: "Chitwan National Park",
    slug: "chitwan-national-park",
    category: "Nature",
    region: "Central",
    description: "Chitwan National Park is Nepal's first national park (1973) and a UNESCO World Heritage Site, protecting 932 km² of subtropical lowland in the Terai. It harbours one of the last populations of one-horned rhinoceros in Asia (~700 individuals), plus Bengal tigers, gharial crocodiles, Gangetic dolphins, and over 600 bird species. Visitors explore by jeep safari, dugout canoe on the Rapti River, or guided jungle walk. The Tharu community offer authentic cultural evenings with their distinctive stick dance.",
    shortDescription: "Nepal's premier wildlife sanctuary — one-horned rhinos, tigers, and jungle safaris in the Terai.",
    images: [
      "https://images.unsplash.com/photo-QU36RaoCM-Q?w=1200&q=80",
      "https://images.unsplash.com/photo-IydYCWidPf0?w=1200&q=80"
    ],
    rating: 4.8,
    reviewCount: 378,
    priceRange: "Rs Rs",
    bestSeason: "October-March",
    duration: "2-3 days",
    difficulty: "Easy",
    location: { type: "Point", coordinates: [84.5167, 27.5333], address: "Chitwan District, Bagmati Province" },
    features: ["Jeep Safari", "One-Horned Rhino", "Bengal Tiger Sightings", "Rapti River Canoeing", "Tharu Cultural Dance"],
    nearbyAttractions: ["Elephant Breeding Center (Sauraha)", "Bis Hajaar Tal Lakes", "Tharu Village Homestay", "Kasara Durbar"],
    published: true,
    verificationStatus: "approved"
  },
  {
    name: "Nagarkot Sunrise Viewpoint",
    slug: "nagarkot-sunrise-viewpoint",
    category: "Nature",
    region: "Central",
    description: "Perched on a ridge of the Kathmandu Valley rim at 2,195m, Nagarkot offers one of the widest panoramas of the Himalayas accessible by road from Kathmandu. On a clear morning the view stretches from Dhaulagiri in the west across the Langtang, Jugal, Rolwaling, and Mahalangur ranges — a 200km sweep of Himalayan peaks. Guests typically stay overnight to catch sunrise from rooftop terraces, then hike or cycle down to Bhaktapur or Changunarayan through forested ridgelines.",
    shortDescription: "The widest Himalayan panorama accessible by car from Kathmandu — sunrise over 200km of peaks.",
    images: [
      "https://images.unsplash.com/photo-pIWpeIvuGMU?w=1200&q=80",
      "https://images.unsplash.com/photo-dW51UwSobT0?w=1200&q=80"
    ],
    rating: 4.6,
    reviewCount: 289,
    priceRange: "Rs Rs",
    bestSeason: "October-March",
    duration: "1-2 days",
    difficulty: "Easy",
    location: { type: "Point", coordinates: [85.5188, 27.7159], address: "Bhaktapur District, Bagmati Province" },
    features: ["360° Himalayan Panorama", "Sunrise Tower", "Mountain Biking Trail to Bhaktapur", "Rhododendron Forests", "Stargazing"],
    nearbyAttractions: ["Changunarayan Temple", "Bhaktapur Durbar Square", "Sankhu Village", "Shivapuri National Park"],
    published: true,
    verificationStatus: "approved"
  },

  // ─── RELIGIOUS ───────────────────────────────────────────────────────────────
  {
    name: "Pashupatinath Temple",
    slug: "pashupatinath-temple",
    category: "Religious",
    region: "Central",
    description: "Pashupatinath Temple is Nepal's holiest Hindu shrine — a UNESCO World Heritage Site dedicated to Pashupati, a form of Lord Shiva. The main pagoda, clad in gold and silver, dates to at least the 5th century CE and sits on the sacred Bagmati River. The ghats are the site of open-air cremation ceremonies conducted around the clock. Hundreds of sadhus make their home in the surrounding forest. The Maha Shivaratri festival (February/March) draws over 1 million pilgrims from across South Asia.",
    shortDescription: "Nepal's holiest Hindu shrine on the Bagmati River — sacred ghats, golden pagoda, and Maha Shivaratri.",
    images: [
      "https://images.unsplash.com/photo-lYkzooKZrPg?w=1200&q=80",
      "https://images.unsplash.com/photo-UzRYQaWA0LI?w=1200&q=80"
    ],
    rating: 4.9,
    reviewCount: 523,
    priceRange: "Rs",
    bestSeason: "Year-round",
    duration: "2-3 hours",
    difficulty: "Easy",
    location: { type: "Point", coordinates: [85.3488, 27.7103], address: "Kathmandu, Bagmati Province" },
    features: ["UNESCO World Heritage", "Evening Aarti Ceremony", "Bagmati Cremation Ghats", "Sadhu Encounters", "Maha Shivaratri Festival"],
    nearbyAttractions: ["Boudhanath Stupa (3km)", "Guhyeshwari Temple", "Tribhuvan University Museum", "Kopan Monastery"],
    published: true,
    verificationStatus: "approved"
  },
  {
    name: "Boudhanath Stupa",
    slug: "boudhanath-stupa",
    category: "Religious",
    region: "Central",
    description: "Boudhanath is one of the largest Buddhist stupas in the world and the spiritual heart of Tibetan Buddhism in Nepal. The mandala-shaped structure (diameter 120m) is topped by 13 stepped rings representing the stages of enlightenment, and the all-seeing eyes of Buddha gaze from each cardinal direction. Over 50 monasteries ring the stupa. At dusk, the kora fills with butter-lamp smoke, the murmur of mantras, and the clatter of prayer wheels. The full moon draws thousands of monks in maroon robes.",
    shortDescription: "One of the world's largest Buddhist stupas — kora walks, Tibetan monasteries, and full-moon ceremonies.",
    images: [
      "https://images.unsplash.com/photo-3Q6fuSuCplA?w=1200&q=80",
      "https://images.unsplash.com/photo-KKm1ua7MSf0?w=1200&q=80"
    ],
    rating: 4.8,
    reviewCount: 412,
    priceRange: "Rs",
    bestSeason: "Year-round",
    duration: "2-3 hours",
    difficulty: "Easy",
    location: { type: "Point", coordinates: [85.3636, 27.7215], address: "Kathmandu, Bagmati Province" },
    features: ["UNESCO World Heritage", "Kora Circumambulation", "Tibetan Monastery Complex", "Prayer Wheel Walk", "Full Moon Puja"],
    nearbyAttractions: ["Pashupatinath Temple (3km)", "Kopan Monastery", "Pullahari Monastery", "Ka-Nying Shedrub Ling"],
    published: true,
    verificationStatus: "approved"
  },
  {
    name: "Lumbini — Birthplace of Buddha",
    slug: "lumbini-birthplace-of-buddha",
    category: "Religious",
    region: "Western",
    description: "Lumbini is one of the holiest places on Earth — the birthplace of Siddhartha Gautama (c. 623 BCE), who became the Buddha. The UNESCO World Heritage Site's Sacred Garden contains the Maya Devi Temple, built over the precise spot of the birth, and the Ashoka Pillar erected by the Mauryan emperor in 249 BCE — one of the oldest dated inscriptions confirming the site. Surrounding the Sacred Garden, the Monastic Zone has monasteries donated by Japan, China, Thailand, Germany, Korea, and Vietnam.",
    shortDescription: "Birthplace of Buddha, marked by Ashoka's 3rd-century BCE pillar and monasteries from 20 nations.",
    images: [
      "https://images.unsplash.com/photo-btAGrzM4auU?w=1200&q=80",
      "https://images.unsplash.com/photo-nMR2ystifA0?w=1200&q=80"
    ],
    rating: 4.7,
    reviewCount: 298,
    priceRange: "Rs",
    bestSeason: "October-March",
    duration: "1-2 days",
    difficulty: "Easy",
    location: { type: "Point", coordinates: [83.277, 27.4699], address: "Rupandehi District, Lumbini Province" },
    features: ["Maya Devi Temple", "Ashoka Pillar (249 BCE)", "Sacred Garden", "International Monastic Zone", "Peace Flame"],
    nearbyAttractions: ["World Peace Pagoda", "Royal Thai Monastery", "Lumbini Museum", "Tilaurakot (Kapilavastu)"],
    published: true,
    verificationStatus: "approved"
  },

  // ─── CULTURAL ────────────────────────────────────────────────────────────────
  {
    name: "Kathmandu Durbar Square",
    slug: "kathmandu-durbar-square",
    category: "Cultural",
    region: "Central",
    description: "Kathmandu Durbar Square (Hanuman Dhoka) is the historic ceremonial core of the old Kathmandu kingdom — a UNESCO World Heritage Site containing over 50 temples, courtyards, and palaces built from the 12th to 18th centuries by the Malla kings. The square features the multi-roofed Taleju Temple, the old Royal Palace with its intricately carved peacock windows, and the living goddess Kumari's courtyard. The Kasthamandap pavilion, from which Kathmandu takes its name, was originally built from a single tree.",
    shortDescription: "50+ medieval temples and the royal palace at Kathmandu's ceremonial heart — home of the living Kumari.",
    images: [
      "https://images.unsplash.com/photo-FTxTyNog7BY?w=1200&q=80",
      "https://images.unsplash.com/photo-U2yH30hjCQ0?w=1200&q=80"
    ],
    rating: 4.7,
    reviewCount: 456,
    priceRange: "Rs",
    bestSeason: "Year-round",
    duration: "Half day",
    difficulty: "Easy",
    location: { type: "Point", coordinates: [85.3076, 27.7045], address: "Kathmandu, Bagmati Province" },
    features: ["UNESCO World Heritage", "Kumari Living Goddess", "Taleju Temple", "Hanuman Dhoka Palace", "Kasthamandap Pavilion"],
    nearbyAttractions: ["Thamel (walking distance)", "Swayambhunath Stupa (3km)", "Asan Bazaar", "Indra Chowk"],
    published: true,
    verificationStatus: "approved"
  },
  {
    name: "Bhaktapur Durbar Square",
    slug: "bhaktapur-durbar-square",
    category: "Cultural",
    region: "Central",
    description: "Bhaktapur — City of Devotees — is the best-preserved medieval Newari city in Nepal, sitting on a hill 13km east of Kathmandu at 1,401m. Its car-free historic core includes the 55-Window Palace with extraordinarily detailed carved wooden facade, the five-storey Nyatapola Temple (Nepal's tallest pagoda), the Golden Gate (Sun Dhoka) considered the finest gilt-metal artwork in Asia, and Pottery Square where potters still wheel clay using age-old techniques. Bhaktapur is also famous for its juju dhau (king curd) and thangka painting workshops.",
    shortDescription: "Nepal's finest medieval Newari city — golden gates, Nepal's tallest pagoda, and working pottery squares.",
    images: [
      "https://images.unsplash.com/photo-U2yH30hjCQ0?w=1200&q=80",
      "https://images.unsplash.com/photo-0xb3-hK7ON4?w=1200&q=80"
    ],
    rating: 4.8,
    reviewCount: 367,
    priceRange: "Rs",
    bestSeason: "Year-round",
    duration: "Half to full day",
    difficulty: "Easy",
    location: { type: "Point", coordinates: [85.4242, 27.6718], address: "Bhaktapur, Bagmati Province" },
    features: ["UNESCO World Heritage", "55-Window Palace", "Nyatapola Temple (5 storeys)", "Golden Gate (Sun Dhoka)", "Pottery Square"],
    nearbyAttractions: ["Nagarkot (14km)", "Changu Narayan Temple", "Thimi Pottery Village", "Dattatreya Square"],
    published: true,
    verificationStatus: "approved"
  }
];

const seedDestinations = async () => {
  try {
    await Destination.deleteMany({});
    console.log('Cleared existing destinations');

    const createdDestinations = await Destination.insertMany(destinationsData);
    console.log(`Seeded ${createdDestinations.length} Nepal destinations:`);
    createdDestinations.forEach((dest, i) => {
      console.log(`  ${i + 1}. ${dest.name} (${dest.category})`);
    });

    return createdDestinations;
  } catch (error) {
    console.error('Seeding error:', error.message);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await seedDestinations();

    console.log('Nepal destinations loaded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, seedDestinations, destinationsData };
