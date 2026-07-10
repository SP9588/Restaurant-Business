import { motion } from 'motion/react';
import { Restaurant } from '../types';
import { Star, MapPin, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface FavoriteRestaurantsProps {
  restaurants: Restaurant[];
  onToggleFavorite: (id: string) => void;
}

export default function FavoriteRestaurants({ restaurants, onToggleFavorite }: FavoriteRestaurantsProps) {
  const navigate = useNavigate();

  if (restaurants.length === 0) return null;

  return (
    <div className="py-12 overflow-hidden bg-slate-50/50 dark:bg-zinc-900/50 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold tracking-tight uppercase flex items-center gap-2">
              <Heart className="w-5 h-5 text-clay fill-clay" />
              Your Ecosystem Favorites
            </h2>
            <p className="text-xs text-slate-500 italic mt-1">Quick access to your most trusted establishments.</p>
          </div>
          <div className="text-xs font-bold text-neutral-400">SWIPE TO EXPLORE</div>
        </div>
        
        <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {restaurants.map((restaurant, index) => (
            <motion.div
              key={restaurant.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0 w-72 group cursor-pointer"
            >
              <Card 
                onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                className="overflow-hidden border-slate-100 shadow-lg hover:shadow-xl transition-all duration-300 rounded-[32px] bg-white h-full"
              >
                <div className="relative h-40 overflow-hidden">
                  {restaurant.logo ? (
                    <img 
                      src={restaurant.logo} 
                      alt={restaurant.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                      <Star className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(restaurant.id);
                    }}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-clay shadow-sm hover:scale-110 transition-transform"
                  >
                    <Heart className="w-5 h-5 fill-clay" />
                  </button>
                  <div className="absolute bottom-4 left-4">
                    <Badge className="bg-white/90 backdrop-blur text-slate-900 font-bold border-none shadow-sm px-2">
                      <Star className="w-3 h-3 mr-1 fill-amber-400 text-amber-400" />
                      {restaurant.rating.toFixed(1)}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-bold text-lg tracking-tighter truncate mb-1">{restaurant.name}</h3>
                  <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <MapPin className="w-3 h-3 mr-1 text-clay" />
                    {restaurant.city}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
