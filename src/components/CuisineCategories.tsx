import { motion } from 'motion/react';

const CUISINES = [
  { name: 'Italian', icon: '🍕', image: 'https://images.unsplash.com/photo-1498579150354-9724fe418770?w=400&q=80' },
  { name: 'Japanese', icon: '🍣', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&q=80' },
  { name: 'Indian', icon: '🍛', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80' },
  { name: 'Mexican', icon: '🌮', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80' },
  { name: 'French', icon: '🥐', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80' },
  { name: 'Chinese', icon: '🍜', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80' },
  { name: 'Thai', icon: '🍲', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&q=80' },
  { name: 'Greek', icon: '🍢', image: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=400&q=80' },
];

export default function CuisineCategories({ onSelect }: { onSelect: (cuisine: string) => void }) {
  return (
    <div className="py-12 overflow-hidden bg-white dark:bg-zinc-900 border-y">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold tracking-tight uppercase">Explore World Cuisines</h2>
          <div className="text-xs font-bold text-neutral-400">SCROLL TO DISCOVER</div>
        </div>
        
        <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {CUISINES.map((cuisine, index) => (
            <motion.div
              key={cuisine.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onSelect(cuisine.name)}
              className="flex-shrink-0 w-32 sm:w-40 group cursor-pointer"
            >
              <div className="relative aspect-square rounded-[32px] overflow-hidden mb-3 border-2 border-transparent group-hover:border-clay transition-all duration-300">
                <img 
                  src={cuisine.image} 
                  alt={cuisine.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300" />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-2xl">
                  {cuisine.icon}
                </div>
              </div>
              <p className="text-center text-sm font-bold uppercase tracking-wider group-hover:text-clay transition-colors">
                {cuisine.name}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
