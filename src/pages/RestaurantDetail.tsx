import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, getDocs, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Restaurant, MenuItem } from '../types';
import { 
  Star, 
  Clock, 
  MapPin, 
  Info, 
  Plus, 
  Minus, 
  ShoppingBag,
  ArrowLeft,
  Search,
  ChevronRight,
  Check,
  QrCode,
  Download,
  Truck
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import RestaurantMap from '../components/RestaurantMap';

export default function RestaurantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, items: cartItems, total } = useCart();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  
  // Customization State
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const restDoc = await getDoc(doc(db, 'restaurants', id)).catch(err => {
          handleFirestoreError(err, OperationType.GET, `restaurants/${id}`);
          throw err;
        });
        
        if (restDoc.exists()) {
          setRestaurant({ id: restDoc.id, ...restDoc.data() } as Restaurant);
        }

        const menuPath = `restaurants/${id}/menu`;
        const menuSnap = await getDocs(query(collection(db, menuPath))).catch(err => {
          handleFirestoreError(err, OperationType.LIST, menuPath);
          throw err;
        });
        
        const menuData = menuSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
        setMenu(menuData);
      } catch (err) {
        console.error('Error fetching details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-[80vh]">Loading...</div>;
  if (!restaurant) return <div className="flex items-center justify-center h-[80vh]">Restaurant not found.</div>;

  const categories = ['All', ...Array.from(new Set(menu.map(item => item.category)))];
  const filteredMenu = activeCategory === 'All' ? menu : menu.filter(item => item.category === activeCategory);

  const qrData = JSON.stringify({
    name: restaurant.name,
    address: restaurant.address,
    id: restaurant.id,
    type: 'table_order'
  });

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${restaurant.name.replace(/\s+/g, '_')}_QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleAddToCart = (item: MenuItem) => {
    if (item.sections && item.sections.length > 0) {
      setCustomizingItem(item);
      // Initialize internal requirements if any
      const initial: Record<string, string[]> = {};
      item.sections.forEach(s => {
        initial[s.id] = [];
      });
      setSelectedOptions(initial);
    } else {
      addItem(item);
      toast.success(`Added ${item.name} to cart`);
    }
  };

  const toggleOption = (sectionId: string, optionId: string, isMulti: boolean) => {
    setSelectedOptions(prev => {
      const current = prev[sectionId] || [];
      if (isMulti) {
        if (current.includes(optionId)) {
          return { ...prev, [sectionId]: current.filter(id => id !== optionId) };
        } else {
          return { ...prev, [sectionId]: [...current, optionId] };
        }
      } else {
        return { ...prev, [sectionId]: [optionId] };
      }
    });
  };

  const confirmCustomization = () => {
    if (!customizingItem) return;

    // Validation check
    const missing = customizingItem.sections?.find(s => s.required && (!selectedOptions[s.id] || selectedOptions[s.id].length === 0));
    if (missing) {
      toast.error(`Please select an option for ${missing.name}`);
      return;
    }

    // Calculate final price and build description
    let extraPrice = 0;
    const desc: string[] = [];
    customizingItem.sections?.forEach(s => {
      const selected = s.options.filter(o => selectedOptions[s.id]?.includes(o.id));
      selected.forEach(o => {
        extraPrice += o.price;
        desc.push(`${s.name}: ${o.name}`);
      });
    });

    const finalItem = {
      ...customizingItem,
      price: customizingItem.price + extraPrice
    };

    addItem(finalItem, 1, desc);
    toast.success(`Customized ${customizingItem.name} added!`);
    setCustomizingItem(null);
  };

  return (
    <div className="bg-neutral-50 dark:bg-zinc-950 min-h-screen">
      {/* Dynamic Header */}
      <div className="relative h-[25vh] md:h-[35vh] overflow-hidden">
        <div className="absolute inset-0 bg-neutral-900 group">
          {restaurant.logo && (
            <img src={restaurant.logo} className="w-full h-full object-cover opacity-50 contrast-125" alt={restaurant.name} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
        </div>
        <div className="absolute bottom-4 md:bottom-8 left-4 md:left-8 right-4 md:right-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] glass p-1 shadow-2xl">
              <div className="w-full h-full rounded-[1.8rem] bg-white flex items-center justify-center overflow-hidden">
                {restaurant.logo ? <img src={restaurant.logo} className="w-full h-full object-cover" /> : <div className="text-black font-black text-4xl">GF</div>}
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-serif font-black tracking-tighter text-white mb-2">{restaurant.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-300 italic">
                <span className="flex items-center"><Star className="w-4 h-4 mr-1 text-yellow-400 fill-yellow-400" /> {restaurant.rating.toFixed(1)} ({restaurant.reviewCount}+)</span>
                <span className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-clay" /> {restaurant.address}{restaurant.landmark ? ` (${restaurant.landmark})` : ''}</span>
                <span className="flex items-center"><Clock className="w-4 h-4 mr-1 text-blue-400" /> 20-30 MIN</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => navigate('/orders')}
              variant="outline" 
              className="glass text-white border-white/20 rounded-full h-12 px-6"
            >
              <Truck className="w-4 h-4 mr-2" /> Track Orders
            </Button>
            <Button 
              onClick={() => setIsQrDialogOpen(true)}
              variant="outline" 
              className="glass text-white border-white/20 rounded-full h-12 px-6"
            >
              <QrCode className="w-4 h-4 mr-2" /> Table Scan
            </Button>
            <Button variant="outline" className="glass text-white border-white/20 rounded-full h-12 px-6">
              <Info className="w-4 h-4 mr-2" /> Restaurant Info
            </Button>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 left-4 glass text-white rounded-full h-10 w-10"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Menu Section */}
        <div className="lg:col-span-8">
          <div className="sticky top-20 z-40 bg-neutral-50/80 dark:bg-zinc-950/80 backdrop-blur-md py-4 -mx-4 px-4 h-20">
            <Tabs defaultValue="All" className="w-full h-full flex items-center">
              <ScrollArea className="w-full">
                <div className="flex space-x-2">
                  {categories.map(cat => (
                    <Button
                      key={cat}
                      variant={activeCategory === cat ? 'default' : 'ghost'}
                      className={`rounded-full px-6 whitespace-nowrap font-bold h-10 ${activeCategory === cat ? 'bg-clay hover:bg-clay/90' : ''}`}
                      onClick={() => setActiveCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </Tabs>
          </div>

          <div className="space-y-12 py-8">
            {categories.filter(c => c !== 'All').map(category => {
              const itemsInCategory = menu.filter(m => m.category === category);
              if (itemsInCategory.length === 0) return null;
              if (activeCategory !== 'All' && category !== activeCategory) return null;

              return (
                <div key={category}>
                  <h2 className="text-2xl font-serif font-black tracking-tight mb-6 uppercase border-b border-neutral-200 dark:border-neutral-800 pb-2">{category}</h2>
                  <div className="grid grid-cols-1 gap-6">
                    {itemsInCategory.map(item => (
                      <motion.div 
                        key={item.id}
                        layout
                        className={`group relative flex bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden shadow-md transition-all p-4 border border-transparent ${
                          item.available 
                          ? 'hover:shadow-xl hover:border-clay/20' 
                          : 'opacity-60 grayscale-[0.5]'
                        }`}
                      >
                        <div className="flex-grow pr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-bold">{item.name}</h3>
                            {!item.available && (
                              <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-tighter bg-zinc-200 dark:bg-zinc-800">
                                Out of Stock
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-neutral-500 line-clamp-2 italic mb-4">{item.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-black">{restaurant.currency} {item.price.toFixed(2)}</span>
                            <Button 
                              disabled={!item.available}
                              onClick={() => handleAddToCart(item)}
                              className={`rounded-2xl transition-colors h-11 w-11 p-0 ${
                                item.available 
                                ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:bg-clay hover:text-white' 
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                              }`}
                            >
                              <Plus className="w-6 h-6" />
                            </Button>
                          </div>
                        </div>
                        {item.image && (
                          <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden shrink-0 shadow-lg">
                            <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit space-y-6">
          {/* Location Map */}
          <Card className="rounded-[40px] border-none shadow-xl bg-white dark:bg-zinc-900 overflow-hidden p-6">
            <h2 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-3 text-clay" /> Location Hub
            </h2>
            <RestaurantMap 
              address={`${restaurant.address}, ${restaurant.city}, ${restaurant.state}, ${restaurant.country}`} 
              restaurantName={restaurant.name} 
            />
            <div className="mt-4 p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700">
               <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Precise Coordinate</p>
               <p className="text-xs font-bold text-slate-700 dark:text-slate-300 italic">
                 {restaurant.address}, {restaurant.city}
                 {restaurant.landmark && <span className="block text-[10px] text-clay mt-1">Note: {restaurant.landmark}</span>}
               </p>
            </div>
          </Card>

          {/* Cart Sidebar */}
          <Card className="rounded-[40px] border-none shadow-2xl bg-neutral-900 text-white overflow-hidden p-8">
            <h2 className="text-2xl font-serif font-black tracking-tighter mb-6 flex items-center uppercase">
              <ShoppingBag className="w-6 h-6 mr-3 text-clay" /> Your Basket
            </h2>
            
            {cartItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                   <ShoppingBag className="w-8 h-8 text-neutral-600" />
                </div>
                <p className="text-neutral-400 italic">Select delicious items <br /> to start your order.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="max-h-[40vh] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center group">
                      <div className="flex-grow">
                        <p className="font-bold text-sm">{item.name}</p>
                        <p className="text-xs text-neutral-400">{restaurant.currency} {item.price.toFixed(2)} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 text-white"><Minus className="w-4 h-4" /></Button>
                        <span className="font-mono text-sm">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 text-white"><Plus className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-3 pt-6 border-t border-white/10">
                  <div className="flex justify-between text-sm text-neutral-400">
                    <span>Subtotal</span>
                    <span>{restaurant.currency} {total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-neutral-400">
                    <span>Delivery Fee</span>
                    <span>{restaurant.currency} 2.50</span>
                  </div>
                  <div className="flex justify-between text-xl font-black pt-2">
                    <span>Total</span>
                    <span className="text-clay">{restaurant.currency} {(total + 2.5).toFixed(2)}</span>
                  </div>
                </div>

                <Button className="w-full h-14 rounded-full bg-clay text-white hover:bg-clay/90 font-black text-lg uppercase tracking-tight shadow-xl shadow-clay/20 mt-4">
                  CHECKOUT NOW
                </Button>
                
                <div className="flex justify-center gap-4 pt-4">
                  <div className="h-6 w-10 bg-white/10 rounded flex items-center justify-center text-[8px] font-bold">STRIPE</div>
                  <div className="h-6 w-10 bg-white/10 rounded flex items-center justify-center text-[8px] font-bold">PAYPAL</div>
                  <div className="h-6 w-10 bg-white/10 rounded flex items-center justify-center text-[8px] font-bold">G-PAY</div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
      <Dialog open={!!customizingItem} onOpenChange={() => setCustomizingItem(null)}>
        <DialogContent className="rounded-[40px] sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="h-48 relative overflow-hidden">
            <img 
              src={customizingItem?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'} 
              className="w-full h-full object-cover" 
              alt={customizingItem?.name} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
            <div className="absolute bottom-6 left-8 right-8">
               <h2 className="text-2xl font-black uppercase text-white tracking-widest italic">{customizingItem?.name}</h2>
               <p className="text-zinc-400 text-xs italic line-clamp-1">{customizingItem?.description}</p>
            </div>
          </div>

          <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-900">
             {customizingItem?.sections?.map((section) => (
               <div key={section.id} className="space-y-4">
                  <div className="flex justify-between items-end border-b-2 border-clay/10 pb-2">
                     <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">{section.name}</h4>
                        <p className="text-[10px] text-clay/50 italic">{section.required ? 'SELECT ONE (REQUIRED)' : 'OPTIONAL'}</p>
                     </div>
                     {section.allowMultiple && <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tight">Multi-select</Badge>}
                  </div>
                  
                  <div className="grid gap-2">
                     {section.options.map((option) => {
                       const isSelected = selectedOptions[section.id]?.includes(option.id);
                       return (
                         <div 
                           key={option.id}
                           onClick={() => toggleOption(section.id, option.id, section.allowMultiple)}
                           className={`p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border-2 ${
                             isSelected 
                             ? 'border-clay bg-clay/5' 
                             : 'border-slate-50 dark:border-zinc-800 hover:border-slate-100'
                           }`}
                         >
                           <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                isSelected ? 'bg-clay border-clay' : 'bg-transparent border-slate-200'
                              }`}>
                                 {isSelected && <Check className="text-white w-3 h-3" />}
                              </div>
                              <span className="text-sm font-bold">{option.name}</span>
                           </div>
                           {option.price > 0 && (
                             <span className="text-xs font-black text-clay">+{restaurant.currency}{option.price.toFixed(2)}</span>
                           )}
                         </div>
                       );
                     })}
                  </div>
               </div>
             ))}
          </div>

          <div className="p-8 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-zinc-800">
             <Button onClick={confirmCustomization} className="w-full h-14 rounded-full bg-clay text-white font-black text-lg uppercase shadow-xl shadow-clay/20">
                ADD TO BASKET • {restaurant.currency}{(
                  (customizingItem?.price || 0) + 
                  (customizingItem?.sections?.reduce((sum, s) => {
                    const selected = s.options.filter(o => selectedOptions[s.id]?.includes(o.id));
                    return sum + selected.reduce((s2, o) => s2 + o.price, 0);
                  }, 0) || 0)
                ).toFixed(2)}
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="rounded-[40px] sm:max-w-[400px] p-10 text-center border-none shadow-2xl bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif font-black uppercase tracking-tight mb-2 text-center">Table Ordering QR</DialogTitle>
            <DialogDescription className="text-center italic">
              Scan this code at your table to view the menu and place orders directly.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center space-y-8 py-8">
            <div className="p-6 bg-white rounded-[32px] shadow-xl border-8 border-slate-50 relative">
               <QRCodeSVG 
                id="qr-code-svg"
                value={qrData} 
                size={200}
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: restaurant.logo || "",
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
               />
            </div>
            
            <div className="space-y-4 w-full">
              <div className="text-center">
                <h4 className="font-black text-lg uppercase tracking-tight">{restaurant.name}</h4>
                <p className="text-xs text-neutral-500 italic">{restaurant.address}</p>
              </div>
              
              <Button 
                onClick={downloadQR}
                className="w-full h-14 rounded-full bg-slate-900 text-white hover:bg-clay font-black text-sm uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" /> Download QR Code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScrollArea({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`overflow-x-auto no-scrollbar ${className}`}>
      {children}
    </div>
  );
}
