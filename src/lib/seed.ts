import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from './firebase';

const SAMPLE_RESTAURANTS = [
  {
    name: "L'Artiste Bistro",
    description: "Authentic French cuisine with a modern twist. Experience the elegance of Paris in every bite.",
    address: "45 Gourmet Blvd",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    landmark: "Near Union Square",
    phone: "555-0101",
    email: "contact@artiste.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800",
    rating: 4.8,
    reviewCount: 124,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Sushi Zen Garden",
    description: "Serene dining experience with the freshest catch and master-crafted rolls.",
    address: "12 Zen Way",
    city: "New York",
    state: "NY",
    country: "USA",
    landmark: "Behind Central Park",
    phone: "555-0102",
    email: "info@sushizen.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800",
    rating: 4.9,
    reviewCount: 256,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Smokey Joe's BBQ",
    description: "Traditional slow-smoked meats and soulful sides that satisfy every craving.",
    address: "88 Pitmaster Lane",
    city: "Austin",
    state: "TX",
    country: "USA",
    landmark: "Next to the Old Mill",
    phone: "555-0103",
    email: "bbq@smokeyjoes.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1529193591184-b1d58b34ecdf?w=800",
    rating: 4.5,
    reviewCount: 89,
    status: 'open',
    isVerified: false,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Pizza Napoli",
    description: "Hand-tossed Neapolitan pizzas fired in a wood-burning oven from Italy.",
    address: "321 Dough Street",
    city: "Chicago",
    state: "IL",
    country: "USA",
    landmark: "Opposite Navy Pier",
    phone: "555-0104",
    email: "ciao@pizzanapoli.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
    rating: 4.7,
    reviewCount: 156,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Golden Curry",
    description: "Authentic Indian spices and flavors, bringing the heart of Mumbai to your table.",
    address: "55 Spice Road",
    city: "Houston",
    state: "TX",
    country: "USA",
    landmark: "Near the Heights",
    phone: "555-0105",
    email: "curry@golden.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
    rating: 4.6,
    reviewCount: 210,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Taco Loco",
    description: "Street-style Mexican tacos with homemade tortillas and zesty house-made salsas.",
    address: "77 Fiesta Way",
    city: "Los Angeles",
    state: "CA",
    country: "USA",
    landmark: "Santa Monica Pier entrance",
    phone: "555-0106",
    email: "hola@tacoloco.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800",
    rating: 4.4,
    reviewCount: 342,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Dragon Wok",
    description: "Modern Chinese fusion with a focus on fresh ingredients and bold Szechuan profiles.",
    address: "99 Lotus Dr",
    city: "Seattle",
    state: "WA",
    country: "USA",
    landmark: "Under the Space Needle",
    phone: "555-0107",
    email: "hello@dragonwok.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800",
    rating: 4.3,
    reviewCount: 188,
    status: 'open',
    isVerified: false,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "The Burger Smith",
    description: "Artisan burgers crafted from grain-fed beef, topped with locally sourced cheeses.",
    address: "202 Patty Lane",
    city: "Denver",
    state: "CO",
    country: "USA",
    landmark: "Near Coors Field",
    phone: "555-0108",
    email: "info@burgersmith.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800",
    rating: 4.5,
    reviewCount: 95,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Pasta Primavera",
    description: "Freshly made pasta every morning, served with classic sauces and seasonal vegetables.",
    address: "15 Olive Branch Dr",
    city: "Boston",
    state: "MA",
    country: "USA",
    landmark: "Near North End Park",
    phone: "555-0109",
    email: "pasta@primavera.it",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=800",
    rating: 4.7,
    reviewCount: 122,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Pho Real",
    description: "Traditional Vietnamese Pho and Banh Mi, prepared using family recipes passed down for generations.",
    address: "88 Noodle Way",
    city: "Portland",
    state: "OR",
    country: "USA",
    landmark: "Near Powell's Books",
    phone: "555-0110",
    email: "noodles@phoreal.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1582878826629-29b7adflc33?w=800",
    rating: 4.8,
    reviewCount: 175,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "The Greek Taverna",
    description: "Experience the flavors of the Mediterranean with our authentic Greek moussaka and souvlaki.",
    address: "22 Aegean Court",
    city: "Miami",
    state: "FL",
    country: "USA",
    landmark: "South Beach main strip",
    phone: "555-0111",
    email: "opa@greektaverna.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=800",
    rating: 4.6,
    reviewCount: 140,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Lebanese Delights",
    description: "Fresh hummus, falafel, and shawarma with handmade pita and zesty pickles.",
    address: "44 Cedar Ave",
    city: "Detroit",
    state: "MI",
    country: "USA",
    landmark: "Near the Riverwalk",
    phone: "555-0112",
    email: "order@lebanesedelights.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1544124499-589112dd03bd?w=800",
    rating: 4.4,
    reviewCount: 105,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Brazilian Flame",
    description: "Experience the thrill of Churrascaria with slow-roasted meats carved tableside.",
    address: "101 Gaucho Road",
    city: "Dallas",
    state: "TX",
    country: "USA",
    landmark: "Near Victory Park",
    phone: "555-0113",
    email: "meat@brazilianflame.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800",
    rating: 4.9,
    reviewCount: 280,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Korean Kitchen",
    description: "Sizzling Bulgogi and Kimchi Mandu, bringing the authentic taste of Seoul to you.",
    address: "33 Seoul Street",
    city: "Atlanta",
    state: "GA",
    country: "USA",
    landmark: "Near Piedmont Park",
    phone: "555-0114",
    email: "chef@koreankitchen.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=800",
    rating: 4.7,
    reviewCount: 195,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "The Green Sprout",
    description: "100% plant-based comfort food that turns every meal into a celebration of health.",
    address: "88 Leafy Way",
    city: "Boulder",
    state: "CO",
    country: "USA",
    landmark: "Pearl Street Mall",
    phone: "555-0115",
    email: "hello@greensprout.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
    rating: 4.6,
    reviewCount: 110,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Seafood Shack",
    description: "Freshly caught lobster rolls, clam chowder, and grilled fish right by the docks.",
    address: "5 Harbor Dr",
    city: "San Diego",
    state: "CA",
    country: "USA",
    landmark: "Embarcadero Pier",
    phone: "555-0116",
    email: "fresh@seafoodshack.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1560717789-0ac7c58ac90a?w=800",
    rating: 4.5,
    reviewCount: 135,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Thai Orchid",
    description: "Aromatic curries, Pad Thai, and vibrant salads that balance sweet, sour, salty, and spicy.",
    address: "202 Jasmine Path",
    city: "Philadelphia",
    state: "PA",
    country: "USA",
    landmark: "Near Rittenhouse Square",
    phone: "555-0117",
    email: "thai@orchid.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800",
    rating: 4.8,
    reviewCount: 220,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "The Morning Brew",
    description: "Artisan coffee, freshly baked sourdough, and perfect pastries for the early birds.",
    address: "7 Espresso Blvd",
    city: "Nashville",
    state: "TN",
    country: "USA",
    landmark: "Near Broadway",
    phone: "555-0118",
    email: "coffee@morningbrew.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1509042239414-515492d64a2c?w=800",
    rating: 4.9,
    reviewCount: 310,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Dim Sum House",
    description: "Authentic Cantonese dim sum, hand-folded dumplings, and fragrant jasmine tea.",
    address: "123 Chinatown Alley",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    landmark: "Dragon Gate",
    phone: "555-0119",
    email: "dimsum@house.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800",
    rating: 4.7,
    reviewCount: 165,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  },
  {
    name: "Burrito Bandito",
    description: "Overstuffed mission-style burritos with grilled meats, beans, rice, and guac.",
    address: "42 Mission Street",
    city: "Phoenix",
    state: "AZ",
    country: "USA",
    landmark: "Near Heritage Square",
    phone: "555-0120",
    email: "burrito@bandito.com",
    currency: "$",
    logo: "https://images.unsplash.com/photo-1584031036380-3fb6f2d5110c?w=800",
    rating: 4.4,
    reviewCount: 88,
    status: 'open',
    isVerified: true,
    ownerId: "system",
    createdAt: new Date().toISOString()
  }
];

const SAMPLE_MENU = [
  // French (Bistro) - 0-4
  { name: "Classic French Onion Soup", price: 12.50, category: "Starters", description: "Rich beef broth with caramelized onions and gruyère crust." },
  { name: "Coq au Vin", price: 28.00, category: "Mains", description: "Chicken braised in red wine with mushrooms and lardons." },
  { name: "Crème Brûlée", price: 10.50, category: "Desserts", description: "Vanilla bean custard with burnt sugar topping." },
  { name: "Glass of Cabernet", price: 14.00, category: "Drinks", description: "Rich red wine with notes of oak." },
  { name: "Escargots de Bourgogne", price: 16.00, category: "Starters", description: "Snails in garlic and parsley butter." },
  
  // Japanese (Sushi/Zen) - 5-9
  { name: "Spicy Tuna Roll", price: 15.00, category: "Sushi", description: "Fresh tuna with sriracha mayo and cucumber." },
  { name: "Salmon Sashimi", price: 18.00, category: "Sashimi", description: "Thin slices of premium Atlantic salmon." },
  { name: "Miso Soup", price: 4.50, category: "Starters", description: "Traditional soybean paste soup with tofu." },
  { name: "Matcha Green Tea", price: 3.50, category: "Drinks", description: "Traditional stone-ground green tea." },
  { name: "Tonkotsu Ramen", price: 17.50, category: "Mains", description: "Creamy pork bone broth with chashu pork and soft-boiled egg." },
  
  // BBQ (Smokey Joe's) - 10-14
  { name: "Pulled Pork Platter", price: 22.00, category: "Mains", description: "12-hour smoked pork shoulder with slaw and cornbread." },
  { name: "Beef Brisket", price: 26.00, category: "Mains", description: "Tender, slow-smoked brisket with signature rub." },
  { name: "Mac & Cheese", price: 6.50, category: "Sides", description: "Creamy four-cheese macaroni." },
  { name: "Craft Iced Tea", price: 3.00, category: "Drinks", description: "House-brewed sweet tea with lemon." },
  { name: "St. Louis Ribs", price: 24.00, category: "Mains", description: "Dry-rubbed baby back ribs with tangy BBQ glaze." },

  // Italian (Pizza Napoli) - 15-19
  { name: "Margherita Pizza", price: 16.00, category: "Mains", description: "San Marzano tomatoes, fresh mozzarella, basil, and olive oil." },
  { name: "Pepperoni Passion", price: 18.50, category: "Mains", description: "Double pepperoni with herb-infused tomato sauce." },
  { name: "Tiramisu", price: 9.00, category: "Desserts", description: "Coffee-soaked ladyfingers with mascarpone cream." },
  { name: "Italian Soda", price: 4.50, category: "Drinks", description: "Sparkling water with cherry or vanilla syrup." },
  { name: "Lasagna Bolognese", price: 19.50, category: "Mains", description: "Layered pasta with beef ragu and béchamel sauce." },

  // Indian (Golden Curry) - 20-24
  { name: "Butter Chicken", price: 19.00, category: "Mains", description: "Tender chicken in a creamy tomato and butter sauce." },
  { name: "Garlic Naan", price: 4.00, category: "Sides", description: "Soft tandoori bread with fresh garlic and cilantro." },
  { name: "Vegetable Samosas", price: 7.00, category: "Starters", description: "Crispy pastry filled with spiced potatoes and peas." },
  { name: "Mango Lassi", price: 5.50, category: "Drinks", description: "Refreshing yogurt-based drink with mango pulp." },
  { name: "Lamb Biryani", price: 21.00, category: "Mains", description: "Fragrant basmati rice cooked with spiced lamb and saffron." },

  // Mexican (Taco Loco) - 25-29
  { name: "Al Pastor Tacos", price: 12.00, category: "Mains", description: "Marinated pork with pineapple, onion, and cilantro." },
  { name: "Guacamole & Chips", price: 8.50, category: "Starters", description: "Freshly mashed avocado with lime and sea salt." },
  { name: "Churros", price: 7.50, category: "Desserts", description: "Cinnamon-sugar fried dough with chocolate dip." },
  { name: "Horchata", price: 4.00, category: "Drinks", description: "Traditional rice milk with cinnamon and vanilla." },
  { name: "Beef Enchiladas", price: 16.50, category: "Mains", description: "Corn tortillas stuffed with beef and topped with red chili sauce." },

  // Chinese (Dragon Wok) - 30-34
  { name: "Kung Pao Chicken", price: 15.50, category: "Mains", description: "Spiced chicken with peanuts, vegetables, and chili peppers." },
  { name: "Vegetable Lo Mein", price: 13.00, category: "Noodles", description: "Soft egg noodles tossed with fresh garden vegetables." },
  { name: "Pork Dumplings", price: 9.50, category: "Dim Sum", description: "Hand-folded steamed dumplings with ginger soy dip." },
  { name: "Jasmine Tea", price: 3.50, category: "Drinks", description: "Fragrant hot green tea flavored with jasmine blossoms." },
  { name: "Peking Duck Rolls", price: 14.50, category: "Starters", description: "Crispy duck with hoisin sauce in thin pancakes." },

  // Burger (The Burger Smith) - 35-39
  { name: "The Classic Burger", price: 14.50, category: "Mains", description: "6oz beef patty, cheddar, lettuce, tomato, and secret sauce." },
  { name: "Truffle Fries", price: 6.00, category: "Sides", description: "Hand-cut fries tossed in truffle oil and parmesan." },
  { name: "Onion Rings", price: 5.50, category: "Snacks", description: "Beer-battered jumbo onion rings." },
  { name: "Vanilla Milkshake", price: 7.00, category: "Drinks", description: "Thick and creamy real bean vanilla shake." },
  { name: "Bacon Blue Burger", price: 16.50, category: "Mains", description: "Gorgonzola, crispy bacon, and caramelized onions." },

  // Pasta (Pasta Primavera) - 40-44
  { name: "Fettuccine Alfredo", price: 17.00, category: "Mains", description: "Rich parmesan cream sauce over handmade fettuccine." },
  { name: "Bruschetta", price: 9.00, category: "Starters", description: "Toasted bread with balsamic-glazed tomatoes and basil." },
  { name: "Pesto Pasta", price: 16.50, category: "Mains", description: "Fresh basil pesto with pine nuts and olive oil." },
  { name: "Espresso", price: 3.50, category: "Drinks", description: "Strong and rich Italian coffee shot." },
  { name: "Cannoli", price: 8.00, category: "Desserts", description: "Crispy pastry shell filled with sweet ricotta cream." },

  // Pho (Pho Real) - 45-49
  { name: "Beef Pho", price: 15.50, category: "Mains", description: "Slow-simmered beef broth with rice noodles and herbs." },
  { name: "Spring Rolls", price: 8.00, category: "Starters", description: "Fresh rice paper rolls with shrimp and vermicelli." },
  { name: "Grilled Pork Banh Mi", price: 10.50, category: "Mains", description: "Vietnamese sandwich with pickled veggies and cilantro." },
  { name: "Vietnamese Iced Coffee", price: 5.00, category: "Drinks", description: "Strong coffee with sweetened condensed milk." },
  { name: "Bun Cha", price: 16.00, category: "Mains", description: "Grilled pork over vermicelli noodles with dipping sauce." },

  // Mediterranean/Greek - 50-54
  { name: "Chicken Souvlaki", price: 16.00, category: "Mains", description: "Grilled lemon-herb chicken skewers with tzatziki." },
  { name: "Falafel Wrap", price: 11.50, category: "Mains", description: "Crispy chickpea balls with tahini and fresh greens." },
  { name: "Hummus Plate", price: 8.00, category: "Starters", description: "Creamy chickpea dip with extra virgin olive oil and warm pita." },
  { name: "Baklava", price: 7.00, category: "Desserts", description: "Layered phyllo pastry with nuts and honey syrup." },
  { name: "Turkish Coffee", price: 4.50, category: "Drinks", description: "Strong, unfiltered coffee brewed with cardamom." },

  // Thai - 55-59
  { name: "Pad Thai Shrimp", price: 16.50, category: "Noodles", description: "Rice noodles stir-fried with shrimp, bean sprouts, and peanuts." },
  { name: "Green Curry", price: 15.00, category: "Curry", description: "Spicy coconut milk curry with bamboo shoots and basil." },
  { name: "Tom Yum Soup", price: 9.00, category: "Starters", description: "Hot and sour lemongrass soup with mushrooms." },
  { name: "Thai Iced Tea", price: 4.50, category: "Drinks", description: "Sweetened tea with condensed milk and spices." },
  { name: "Mango Sticky Rice", price: 8.50, category: "Desserts", description: "Fresh mango with sweet coconut-infused glutinous rice." }
];

export async function seedDatabase() {
  try {
    // Wait for auth to initialize (max 3s)
    let attempts = 0;
    while (!auth.currentUser && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!auth.currentUser) {
      console.warn('Seeding skipped: No authenticated user found.');
      return;
    }

    const existing = await getDocs(collection(db, 'restaurants'));
    if (!existing.empty) return; // Only seed once

    console.log('Seeding database...');
    for (const rest of SAMPLE_RESTAURANTS) {
      const restData = { ...rest, ownerId: auth.currentUser.uid };
      const restDoc = await addDoc(collection(db, 'restaurants'), restData);
      
      // Select appropriate menu items based on restaurant name keywords
      let relevantMenu = [];
      const name = rest.name.toLowerCase();
      
      if (name.includes('bistro')) relevantMenu = SAMPLE_MENU.slice(0, 5);
      else if (name.includes('sushi') || name.includes('zen')) relevantMenu = SAMPLE_MENU.slice(5, 10);
      else if (name.includes('bbq')) relevantMenu = SAMPLE_MENU.slice(10, 15);
      else if (name.includes('pizza')) relevantMenu = SAMPLE_MENU.slice(15, 20);
      else if (name.includes('curry')) relevantMenu = SAMPLE_MENU.slice(20, 25);
      else if (name.includes('taco') || name.includes('loco')) relevantMenu = SAMPLE_MENU.slice(25, 30);
      else if (name.includes('dragon') || name.includes('wok')) relevantMenu = SAMPLE_MENU.slice(30, 35);
      else if (name.includes('burger')) relevantMenu = SAMPLE_MENU.slice(35, 40);
      else if (name.includes('pasta')) relevantMenu = SAMPLE_MENU.slice(40, 45);
      else if (name.includes('pho')) relevantMenu = SAMPLE_MENU.slice(45, 50);
      else if (name.includes('greek') || name.includes('taverna') || name.includes('lebanese')) relevantMenu = SAMPLE_MENU.slice(50, 55);
      else if (name.includes('thai')) relevantMenu = SAMPLE_MENU.slice(55, 60);
      else {
        // Random selection for others
        relevantMenu = SAMPLE_MENU.sort(() => 0.5 - Math.random()).slice(0, 8);
      }

      for (const item of relevantMenu) {
        await addDoc(collection(db, `restaurants/${restDoc.id}/menu`), {
          ...item,
          restaurantId: restDoc.id,
          available: true,
          image: `https://images.unsplash.com/photo-1546767012-143094052309?w=400&q=80&fit=crop&auto=format&food=${encodeURIComponent(item.name)}`
        });
      }
    }
    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seeding failed:', err);
  }
}
