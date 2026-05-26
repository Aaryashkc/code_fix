const mongoose = require('mongoose');
require('dotenv').config();

const Destination = require('../models/Destination');

async function updateImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const imageMap = {
      'Everest Base Camp': 'https://images.unsplash.com/photo-1506905923166-8a59b4b553c0?w=1200&q=80',
      'Annapurna Circuit': 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=1200&q=80',
      'Mardi Himal Trek': 'https://images.unsplash.com/photo-1571401835393-8c5f35328320?w=1200&q=80',
      'Langtang Valley Trek': 'https://images.unsplash.com/photo-1506905923166-8a59b4b553c0?w=1200&q=80',
      'Manaslu Circuit Trek': 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=1200&q=80',
      'Upper Mustang Trek': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
      'Gokyo Lakes Trek': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80',
      'Annapurna Base Camp': 'https://images.unsplash.com/photo-1506905923166-8a59b4b553c0?w=1200&q=80',
      'Poon Hill Trek': 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=1200&q=80',
      'Kanchenjunga Base Camp': 'https://images.unsplash.com/photo-1506905923166-8a59b4b553c0?w=1200&q=80',
      'Tilicho Lake': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80',
      'Rara Lake Trek': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80',
      'Bungee Jumping at The Last Resort': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&q=80',
      'Paragliding in Pokhara': 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=1200&q=80',
      'White Water Rafting - Trisuli River': 'https://images.unsplash.com/photo-1530866495561-507c83fa9e47?w=1200&q=80',
      'Pokhara': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&q=80',
      'Chitwan National Park': 'https://images.unsplash.com/photo-1535338454770-7a0d5d532129?w=1200&q=80',
      'Bardia National Park': 'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=1200&q=80',
      'Phewa Lake': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&q=80',
      'Gosaikunda Lake': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80',
      'Nagarkot': 'https://images.unsplash.com/photo-1506905923166-8a59b4b553c0?w=1200&q=80',
      'Devi\'s Fall (Patale Chhango)': 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1200&q=80',
      'Ilam Tea Gardens': 'https://images.unsplash.com/photo-1582793988951-9aed5509eb97?w=1200&q=80',
      'Begnas Lake': 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1200&q=80',
      'Shivapuri Nagarjun National Park': 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=1200&q=80',
      'Pashupatinath Temple': 'https://images.unsplash.com/photo-1568658176307-bfbd2873abda?w=1200&q=80',
      'Lumbini': 'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?w=1200&q=80',
      'Boudhanath Stupa': 'https://images.unsplash.com/photo-1568658176307-bfbd2873abda?w=1200&q=80',
      'Swayambhunath (Monkey Temple)': 'https://images.unsplash.com/photo-1568658176307-bfbd2873abda?w=1200&q=80',
      'Muktinath Temple': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
      'Changu Narayan Temple': 'https://images.unsplash.com/photo-1568658176307-bfbd2873abda?w=1200&q=80',
      'Manakamana Temple': 'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?w=1200&q=80',
      'Janaki Temple': 'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?w=1200&q=80',
      'Kathmandu Durbar Square': 'https://images.unsplash.com/photo-1565073182887-6bcefbe225b1?w=1200&q=80',
      'Bhaktapur Durbar Square': 'https://images.unsplash.com/photo-1565073182887-6bcefbe225b1?w=1200&q=80',
      'Patan Durbar Square': 'https://images.unsplash.com/photo-1565073182887-6bcefbe225b1?w=1200&q=80',
      'Bandipur': 'https://images.unsplash.com/photo-1571401835393-8c5f35328320?w=1200&q=80',
      'Tansen (Palpa)': 'https://images.unsplash.com/photo-1571401835393-8c5f35328320?w=1200&q=80',
      'Ghandruk Village': 'https://images.unsplash.com/photo-1571401835393-8c5f35328320?w=1200&q=80',
      'Garden of Dreams': 'https://images.unsplash.com/photo-1565073182887-6bcefbe225b1?w=1200&q=80',
      'Nuwakot Durbar': 'https://images.unsplash.com/photo-1571401835393-8c5f35328320?w=1200&q=80',
      'Thamel': 'https://images.unsplash.com/photo-1565073182887-6bcefbe225b1?w=1200&q=80',
      'Pokhara Lakeside': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&q=80',
      'Asan Bazaar': 'https://images.unsplash.com/photo-1565073182887-6bcefbe225b1?w=1200&q=80',
      'Dhulikhel': 'https://images.unsplash.com/photo-1506905923166-8a59b4b553c0?w=1200&q=80',
      'Kirtipur': 'https://images.unsplash.com/photo-1565073182887-6bcefbe225b1?w=1200&q=80'
    };

    for (const [name, imageUrl] of Object.entries(imageMap)) {
      await Destination.updateOne(
        { name },
        { $set: { images: [imageUrl] } }
      );
      console.log(`Updated ${name}`);
    }

    console.log('All destinations updated!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateImages();
