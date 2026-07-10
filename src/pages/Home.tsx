import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Restaurant, MenuItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  SlidersHorizontal, 
  Star, 
  Clock, 
  MapPin, 
  ChevronRight,
  ShieldCheck,
  Truck,
  Coins,
  Utensils,
  Camera,
  Layers,
  ArrowRight,
  Gift,
  Copy,
  Check,
  Heart
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import CuisineCategories from '../components/CuisineCategories';
import FavoriteRestaurants from '../components/FavoriteRestaurants';
import { toast } from 'sonner';

interface DishWithRestaurant extends MenuItem {
  restaurantName: string;
  restaurantAddress: string;
}

export default function Home() {
  const { user, profile } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [allDishes, setAllDishes] = useState<DishWithRestaurant[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dishesLoading, setDishesLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Fetch Restaurants
        const q = query(collection(db, 'restaurants'));
        const querySnapshot = await getDocs(q).catch(err => {
          handleFirestoreError(err, OperationType.LIST, 'restaurants');
          throw err;
        });
        const restaurantData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
        setRestaurants(restaurantData);

        // Fetch All Dishes (Iterative for each restaurant since collectionGroup needs index)
        const dishPromises = restaurantData.map(async (res) => {
          const menuQ = query(collection(db, `restaurants/${res.id}/menu`), where('available', '==', true));
          const menuSnap = await getDocs(menuQ);
          return menuSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            restaurantName: res.name,
            restaurantAddress: `${res.address}, ${res.city}`
          } as DishWithRestaurant));
        });

        const dishGroups = await Promise.all(dishPromises);
        setAllDishes(dishGroups.flat());
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
        setDishesLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredRestaurants = restaurants.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.city.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDishes = allDishes.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.category.toLowerCase().includes(search.toLowerCase())
  );

  const dishCategories = ['All', ...Array.from(new Set(allDishes.map(d => d.category)))];

  const [copied, setCopied] = useState(false);

  const copyReferral = () => {
    if (!profile?.referralCode) return;
    navigator.clipboard.writeText(profile.referralCode);
    setCopied(true);
    toast.success('Referral code copied to intelligence hub!');
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!user) {
      setFavoriteIds([]);
      return;
    }

    const unsub = onSnapshot(collection(db, `users/${user.uid}/favorites`), (snap) => {
      setFavoriteIds(snap.docs.map(d => d.id));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/favorites`));

    return () => unsub();
  }, [user]);

  const toggleFavorite = async (restaurantId: string) => {
    if (!user) {
      toast.error('You must be logged in to save favorites');
      return;
    }

    const isFavorite = favoriteIds.includes(restaurantId);
    const favRef = doc(db, `users/${user.uid}/favorites`, restaurantId);

    try {
      if (isFavorite) {
        await deleteDoc(favRef);
        toast.info('Removed from favorites');
      } else {
        await setDoc(favRef, {
          restaurantId,
          createdAt: new Date().toISOString()
        });
        toast.success('Added to favorites!');
      }
    } catch (err) {
      toast.error('Failed to update favorites');
    }
  };

  const favoriteRestaurants = restaurants.filter(r => favoriteIds.includes(r.id));

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[65vh] flex items-center justify-center overflow-hidden bg-slate-50 border-b border-slate-100">
        <div className="absolute inset-0">
           <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100" />
           <div className="absolute inset-0 bg-dot-pattern opacity-10" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="title-massive text-slate-900 mb-6 drop-shadow-sm"
          >
            Taste the <br /> <span className="text-blue-600 italic">Ecosystem</span>
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto"
          >
            <div className="relative w-full group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
              <Input 
                placeholder="Search menus, cuisines, or restaurants..." 
                className="w-full h-16 pl-14 pr-6 rounded-full border-slate-200 shadow-2xl shadow-slate-200/50 text-lg bg-white placeholder:text-slate-400 focus-visible:ring-blue-600 focus-visible:ring-offset-0"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </motion.div>
        </div>
      </section>

      <CuisineCategories onSelect={(cuisine) => setSearch(cuisine)} />

      {favoriteRestaurants.length > 0 && (
        <FavoriteRestaurants 
          restaurants={favoriteRestaurants} 
          onToggleFavorite={toggleFavorite} 
        />
      )}

      {/* Referral & Rewards Ecosystem */}
      {profile && (
        <section className="max-w-7xl mx-auto px-4 mt-8 sm:px-6 lg:px-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Loyalty Portion */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-zinc-950 text-white rounded-[40px] p-8 relative overflow-hidden group border border-white/10"
              >
                 <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/20 blur-[80px] -mr-24 -mt-24" />
                 <div className="relative z-10 flex flex-col justify-between h-full gap-8">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-blue-400 border border-white/10 shrink-0">
                          <Coins className="w-7 h-7" />
                       </div>
                       <div>
                          <h2 className="text-xl font-black italic uppercase tracking-tighter">Loyalty <span className="text-blue-500">Vault</span></h2>
                          <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest">Ecosystem Equity</p>
                       </div>
                    </div>
                    <div className="flex items-end justify-between">
                       <div>
                          <div className="text-3xl font-black text-white italic tracking-tighter">
                             ${ (profile.loyaltyPoints / 100).toFixed(2) }
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{profile.loyaltyPoints} Points Available</p>
                       </div>
                       <Button 
                         onClick={() => navigate('/orders')}
                         className="bg-white text-black h-10 px-6 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-xl shadow-blue-500/10"
                       >
                         Redeem
                       </Button>
                    </div>
                 </div>
              </motion.div>

              {/* Referral Portion */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-blue-600 text-white rounded-[40px] p-8 relative overflow-hidden group shadow-2xl shadow-blue-500/20"
              >
                 <div className="absolute top-0 left-0 w-48 h-48 bg-white/10 blur-[80px] -ml-24 -mt-24" />
                 <div className="relative z-10 flex flex-col justify-between h-full gap-8">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white border border-white/20 shrink-0">
                          <Gift className="w-7 h-7" />
                       </div>
                       <div>
                          <h2 className="text-xl font-black italic uppercase tracking-tighter">Expand the <span className="text-slate-900">Circle</span></h2>
                          <p className="text-blue-100 text-[10px] uppercase font-black tracking-widest">Get $5.00 Per Agent</p>
                       </div>
                    </div>
                    <div className="flex items-end justify-between gap-4">
                       <div className="bg-white/10 rounded-2xl p-4 border border-white/20 flex-grow">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-200 mb-1">Your Protocol Code</p>
                          <div className="flex items-center justify-between">
                             <span className="text-xl font-black tracking-[0.2em]">{profile.referralCode}</span>
                             <button onClick={copyReferral} className="p-2 bg-white text-blue-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all">
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                             </button>
                          </div>
                       </div>
                    </div>
                 </div>
              </motion.div>
           </div>
        </section>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 space-y-24">
        
        {/* Signature Dishes Discovery - NEW VISUALIZATION */}
        <section>
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-serif font-black tracking-tight mb-2 text-slate-900 uppercase">Ecosystem Favorites</h2>
              <p className="text-slate-500 italic">Individual masterpieces from our network of culinary artisans.</p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
              <Camera className="w-4 h-4" /> Global Catalog
            </div>
          </div>

          <Tabs defaultValue="All" className="w-full">
            <div className="flex items-center justify-between mb-8 overflow-x-auto pb-4 custom-scrollbar">
              <TabsList className="bg-slate-100 dark:bg-zinc-900 p-1 rounded-2xl h-auto flex-nowrap">
                {dishCategories.slice(0, 8).map(cat => (
                  <TabsTrigger 
                    key={cat} 
                    value={cat}
                    className="rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all"
                  >
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {dishCategories.slice(0, 8).map(cat => (
              <TabsContent key={cat} value={cat} className="mt-0 ring-offset-background focus-visible:outline-none">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {dishesLoading ? (
                    Array(4).fill(0).map((_, i) => (
                      <div key={i} className="h-80 rounded-[32px] bg-slate-100 animate-pulse" />
                    ))
                  ) : filteredDishes
                      .filter(d => cat === 'All' || d.category === cat)
                      .slice(0, 8)
                      .map((dish, i) => (
                    <motion.div
                      key={dish.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group relative"
                    >
                      <Card className="rounded-[32px] border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden bg-white h-full flex flex-col">
                        <div className="relative h-48 overflow-hidden">
                           <img 
                              src={dish.image || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80`} 
                              alt={dish.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                           <Badge className="absolute top-4 right-4 bg-white/90 backdrop-blur text-slate-900 border-none font-bold shadow-sm">
                             {dish.category}
                           </Badge>
                        </div>
                        <CardContent className="p-6 flex flex-col flex-grow">
                          <div className="flex justify-between items-start mb-2">
                             <h3 className="font-black text-lg uppercase tracking-tight leading-tight group-hover:text-blue-600 transition-colors">{dish.name}</h3>
                             <span className="font-black text-blue-600 text-lg">${dish.price.toFixed(2)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mb-4">
                             <MapPin className="w-3 h-3 text-clay" />
                             <span className="uppercase truncate">{dish.restaurantName} • {dish.restaurantAddress}</span>
                          </div>

                          <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                             <Button 
                              onClick={() => navigate(`/restaurant/${dish.restaurantId}`)}
                              variant="ghost" 
                              className="p-0 h-auto text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 group/btn"
                             >
                               Exploration <ArrowRight className="ml-1 w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                             </Button>
                             <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                             </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </section>

        {/* Local Kitchens Section */}
        <section>
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-serif font-black tracking-tight mb-2 text-slate-900">LOCAL KITCHENS</h2>
              <p className="text-slate-500 italic">Chef-curated menus delivered to your doorstep.</p>
            </div>
            <Button variant="link" className="text-blue-600 font-black hover:text-blue-700 transition-colors group px-0 h-auto">
              View All <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[400px] rounded-[40px] bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
              ))}
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="text-center py-20 bg-neutral-100 dark:bg-neutral-900 rounded-[40px] border border-dashed flex flex-col items-center">
              <Utensils className="w-12 h-12 text-neutral-400 mb-4" />
              <p className="text-lg text-neutral-500 font-medium">No restaurants found matching your search.</p>
              <p className="text-sm text-neutral-400 mt-2">Try searching for "Pizza", "Sushi", or a different city.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {filteredRestaurants.map((restaurant, index) => (
                  <motion.div
                    key={restaurant.id}
                    layout
                    initial={{ opacity: 0.8, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                    className="group cursor-pointer"
                  >
                    <Card className="overflow-hidden border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 rounded-[32px] bg-white h-full flex flex-col group">
                      <div className="relative h-64 overflow-hidden">
                        <div className="absolute inset-0 bg-slate-50" />
                        {restaurant.logo ? (
                          <img 
                            src={restaurant.logo} 
                            alt={restaurant.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-50">
                            <Utensils className="w-12 h-12 text-slate-200" />
                          </div>
                        )}
                        <div className="absolute top-4 left-4 flex gap-2">
                           <Badge className="bg-white/90 backdrop-blur text-slate-900 font-black border-none shadow-sm px-3 h-8">
                             <Star className="w-3 h-3 mr-1 fill-amber-400 text-amber-400" />
                             {restaurant.rating.toFixed(1)}
                           </Badge>
                           <Badge className="bg-blue-600 text-white font-black border-none shadow-sm px-3 h-8 uppercase text-[10px]">
                             {restaurant.status}
                           </Badge>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(restaurant.id);
                          }}
                          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-clay shadow-sm hover:scale-110 transition-transform z-10"
                        >
                           <Heart className={`w-5 h-5 ${favoriteIds.includes(restaurant.id) ? 'fill-clay text-clay' : 'text-slate-400'}`} />
                        </button>
                      </div>
                      <CardContent className="p-8 flex-grow">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-2xl font-serif font-black tracking-tighter mb-1 text-slate-900">{restaurant.name}</h3>
                            <div className="flex items-center text-sm text-slate-400 italic">
                              <MapPin className="w-3 h-3 mr-1" />
                              {restaurant.address}, {restaurant.city}
                            </div>
                          </div>
                          {restaurant.isVerified && (
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                              <ShieldCheck className="w-5 h-5 text-blue-600" />
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-6 leading-relaxed">
                          {restaurant.description || "Fresh local ingredients curated by master chefs for your ultimate dining experience."}
                        </p>
                        <div className="flex items-center gap-6 mt-auto pt-6 border-t border-slate-50">
                          <div className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            <Clock className="w-3.5 h-3.5 mr-1.5" />
                            25-35 MIN
                          </div>
                          <div className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            <Truck className="w-3.5 h-3.5 mr-1.5" />
                            FREE
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>

      {/* Footer / Meta Section */}
      <footer className="bg-slate-900 text-white py-20 mt-20">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-white/5 pb-20">
          <div>
            <h3 className="text-3xl font-serif font-black italic mb-6 uppercase tracking-tighter">THE <span className="text-blue-500">ECOSYSTEM</span></h3>
            <p className="text-slate-400 text-sm leading-relaxed italic">The infrastructure for local flavor. Connecting masters of culinary arts with those who crave excellence.</p>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">PARTNERSHIP</h4>
            <div className="space-y-4">
               <Button onClick={() => navigate('/register-partner')} variant="link" className="p-0 h-auto text-white hover:text-blue-400 font-black text-xs uppercase tracking-widest block">Join as Restaurant</Button>
               <Button onClick={() => navigate('/register-partner')} variant="link" className="p-0 h-auto text-white hover:text-blue-400 font-black text-xs uppercase tracking-widest block">Delivery Partner</Button>
               <Button onClick={() => navigate('/register-partner')} variant="link" className="p-0 h-auto text-white hover:text-blue-400 font-black text-xs uppercase tracking-widest block">System Integration</Button>
            </div>
          </div>
          <div>
             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">OS CONTROL</h4>
             <Button onClick={() => navigate('/admin-auth')} className="h-14 w-full rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Admin Terminal
             </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
           <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">© 2026 Ecosystem Logistics Inc.</p>
           <div className="flex gap-8">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-white transition-colors">Privacy Protocol</span>
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-white transition-colors">Terms of Service</span>
           </div>
        </div>
      </footer>
    </div>
  );
}

