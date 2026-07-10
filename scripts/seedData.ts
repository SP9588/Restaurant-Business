import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { Restaurant, MenuItem } from '../src/types';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const restaurants = [
  {
    name: "Gastro Central Kitchen",
    description: "Modern fusion of global flavors and techniques.",
    address: "123 Culinary Ave",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    landmark: "Near Union Square",
    phone: "555-0101",
    email: "info@gastrocentral.com",
    currency: "USD",
    logo: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=200&h=200",
    rating: 4.8,
    reviewCount: 156,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Sakura Zen",
    description: "High-end authentic Japanese sushi and ramen experience.",
    address: "456 Market St",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    landmark: "Embarcadero Center",
    phone: "555-0102",
    email: "contact@sakurazen.com",
    currency: "USD",
    logo: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=200&h=200",
    rating: 4.9,
    reviewCount: 89,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Taco Matrix",
    description: "Neon-lit taco bar with cyberpunk aesthetics.",
    address: "789 Mission St",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    landmark: "Beside Yerba Buena Gardens",
    phone: "555-0103",
    email: "hola@tacomatrix.io",
    currency: "USD",
    logo: "https://images.unsplash.com/photo-1565299585323-38d6b08655e2?auto=format&fit=crop&q=80&w=200&h=200",
    rating: 4.7,
    reviewCount: 342,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Bella Napoli",
    description: "Traditional wood-fired Neapolitan pizza.",
    address: "101 Little Italy Way",
    city: "New York",
    state: "NY",
    country: "USA",
    landmark: "Opposite Grand St Station",
    phone: "555-0104",
    email: "ciao@bellanapoli.com",
    currency: "USD",
    logo: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=200&h=200",
    rating: 4.6,
    reviewCount: 1205,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Spice Route",
    description: "A journey through the vibrant flavors of India.",
    address: "202 Curry Row",
    city: "London",
    state: "Greater London",
    country: "UK",
    landmark: "Near Brick Lane",
    phone: "555-0105",
    email: "namaste@spiceroute.uk",
    currency: "GBP",
    logo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=200&h=200",
    rating: 4.5,
    reviewCount: 567,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
      name: "Le Petit Paris",
      description: "Classical French bistro with modern elegance.",
      address: "303 Rue de la Paix",
      city: "Paris",
      state: "IDF",
      country: "France",
      landmark: "Near Place Vendôme",
      phone: "555-0106",
      email: "bonjour@petitparis.fr",
      currency: "EUR",
      logo: "https://images.unsplash.com/photo-1550966841-3ee7adac1668?auto=format&fit=crop&q=80&w=200&h=200",
      rating: 4.9,
      reviewCount: 231,
      status: 'open',
      isVerified: true,
      ownerId: "system",
      createdAt: new Date().toISOString()
  },
  {
      name: "Burger Lab",
      description: "Science meets charcoal in the ultimate burger quest.",
      address: "404 Fry St",
      city: "Austin",
      state: "TX",
      country: "USA",
      landmark: "Next to the Tech Hub",
      phone: "555-0107",
      email: "hello@burgerlab.com",
      currency: "USD",
      rating: 4.4,
      reviewCount: 890,
      status: 'open',
      isVerified: true,
      ownerId: "system",
      createdAt: new Date().toISOString()
  }
];

const categories = [
    { name: "Burgers", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400&h=400", fare: 12.50 },
    { name: "Sushi", image: "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=400&h=400", fare: 25.00 },
    { name: "Pizza", image: "https://images.unsplash.com/photo-1574129624869-65be09896792?auto=format&fit=crop&q=80&w=400&h=400", fare: 18.00 },
    { name: "Curry", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400&h=400", fare: 15.00 },
    { name: "Desserts", image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&q=80&w=400&h=400", fare: 8.00 },
    { name: "Beverages", image: "https://images.unsplash.com/photo-1544145945-f904253db0ad?auto=format&fit=crop&q=80&w=400&h=400", fare: 4.50 },
    { name: "Steaks", image: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&q=80&w=400&h=400", fare: 35.00 },
    { name: "Salads", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400&h=400", fare: 10.00 }
];

async function seed() {
  console.log("Seeding started...");
  
  for (const r of restaurants) {
    const restaurantRef = await addDoc(collection(db, "restaurants"), r);
    console.log(`Added restaurant: ${r.name}`);

    // Add sample items
    for (const cat of categories) {
      if (Math.random() > 0.4) {
        const item: Omit<MenuItem, 'id'> = {
          restaurantId: restaurantRef.id,
          name: `${r.name.split(' ')[0]} ${cat.name.slice(0, -1)} Special`,
          description: `A delicious signature ${cat.name.toLowerCase()} made with secret ingredients.`,
          price: cat.fare + (Math.random() * 5),
          category: cat.name,
          image: cat.image,
          available: true
        };
        await addDoc(collection(db, `restaurants/${restaurantRef.id}/menu`), item);
      }
    }
  }
  
  console.log("Seeding completed successfully!");
}

seed().catch(console.error);
