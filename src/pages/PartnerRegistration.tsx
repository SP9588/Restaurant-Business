import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Store, Truck, Handshake, Check, ShieldCheck, Plus, Trash2, Utensils, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface TempMenuItem {
  id: string;
  name: string;
  price: string;
  category: string;
}

export default function PartnerRegistration() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Menu Management State
  const [menuItems, setMenuItems] = useState<TempMenuItem[]>([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '' });

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const addMenuItem = () => {
    if (!newItem.name || !newItem.price) {
      toast.error('Please enter both name and price for the dish');
      return;
    }
    const item: TempMenuItem = {
      id: Math.random().toString(36).substr(2, 9),
      ...newItem
    };
    setMenuItems([...menuItems, item]);
    setNewItem({ name: '', price: '', category: '' });
    toast.success(`${newItem.name} staged for catalog`);
  };

  const removeMenuItem = (id: string) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTypes.length === 0) {
      toast.error('Please select at least one registration type');
      return;
    }
    
    if (selectedTypes.includes('restaurant') && menuItems.length === 0) {
      toast.error('Please add at least one menu item to initialize your catalog');
      return;
    }

    setLoading(true);
    // Simulate API call with menu payload
    setTimeout(() => {
      toast.success('Organization data & menu library transmitted to HQ');
      setLoading(false);
    }, 1500);
  };

  const isRestaurant = selectedTypes.includes('restaurant');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-6 md:p-12 flex items-center justify-center">
      <div className={`w-full transition-all duration-500 ${isRestaurant ? 'max-w-4xl' : 'max-w-xl'}`}>
        <header className="text-center mb-12">
           <ShieldCheck className="w-12 h-12 text-clay mx-auto mb-6" />
           <h1 className="title-massive">Join the <span className="text-clay italic">Ecosystem</span></h1>
           <p className="text-slate-500 italic mt-4">Partner with us to redefine local commerce.</p>
        </header>

        <Card className="rounded-[40px] border-none shadow-2xl bg-white dark:bg-zinc-900 overflow-hidden">
          <CardContent className="p-0">
             <form onSubmit={handleSubmit} className="flex flex-col md:flex-row">
                <div className={`p-8 md:p-12 space-y-8 flex-grow ${isRestaurant ? 'md:w-1/2' : 'w-full'}`}>
                   <div className="space-y-6">
                      <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Organization Details</Label>
                          <Input required className="h-14 rounded-2xl bg-slate-50 dark:bg-zinc-800 border-none focus-visible:ring-clay" placeholder="Full Organization Name" />
                          <Input type="email" required className="h-14 rounded-2xl bg-slate-50 dark:bg-zinc-800 border-none focus-visible:ring-clay" placeholder="Primary Contact Email" />
                          {isRestaurant && (
                            <>
                               <Input required className="h-14 rounded-2xl bg-slate-50 dark:bg-zinc-800 border-none focus-visible:ring-clay" placeholder="City Location" />
                               <Input required className="h-14 rounded-2xl bg-slate-50 dark:bg-zinc-800 border-none focus-visible:ring-clay" placeholder="Operational Address" />
                            </>
                          )}
                      </div>
                   </div>

                   <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Registration Type</Label>
                      <div className="grid grid-cols-1 gap-3">
                         {[
                           { id: 'restaurant', label: 'Restaurant / Kitchen', icon: Store, color: 'text-clay' },
                           { id: 'logistics', label: 'Delivery Logistics', icon: Truck, color: 'text-blue-500' },
                           { id: 'partner', label: 'Strategic Partner', icon: Handshake, color: 'text-orange-500' }
                         ].map((item) => (
                           <div 
                              key={item.id}
                              onClick={() => toggleType(item.id)}
                              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                                selectedTypes.includes(item.id) 
                                ? 'border-clay bg-clay/5' 
                                : 'border-slate-100 dark:border-zinc-800 bg-transparent hover:border-slate-200'
                              }`}
                           >
                              <div className="flex items-center gap-4">
                                 <item.icon className={`w-5 h-5 ${item.color}`} />
                                 <span className="font-black text-sm uppercase tracking-tight">{item.label}</span>
                              </div>
                              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                selectedTypes.includes(item.id) ? 'bg-clay border-clay' : 'bg-transparent border-slate-200'
                              }`}>
                                 {selectedTypes.includes(item.id) && <Check className="text-white w-4 h-4" />}
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>

                   {!isRestaurant && (
                     <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-16 rounded-full bg-clay text-white font-black text-lg shadow-xl shadow-clay/20"
                     >
                        {loading ? 'TRANSMITTING...' : 'INITIALIZE ONBOARDING'}
                     </Button>
                   )}
                </div>

                {isRestaurant && (
                  <div className="p-8 md:p-12 bg-slate-50 dark:bg-zinc-800/50 border-l border-slate-100 dark:border-zinc-800 md:w-1/2 space-y-8">
                     <div>
                        <h3 className="text-2xl font-black italic uppercase italic mb-2">Menu <span className="text-clay">Catalog</span></h3>
                        <p className="text-slate-400 text-xs italic">Define your first signature dishes.</p>
                     </div>

                     <div className="space-y-4">
                        <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl shadow-sm space-y-4 border border-clay/10">
                           <div className="grid grid-cols-1 gap-4">
                              <Input 
                                value={newItem.name}
                                onChange={e => setNewItem({...newItem, name: e.target.value})}
                                placeholder="Dish Name (e.g. Truffle Pizza)" 
                                className="h-12 rounded-xl bg-slate-50 dark:bg-zinc-800 border-none"
                              />
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                    <Input 
                                      type="number"
                                      value={newItem.price}
                                      onChange={e => setNewItem({...newItem, price: e.target.value})}
                                      placeholder="Price" 
                                      className="h-12 pl-8 rounded-xl bg-slate-50 dark:bg-zinc-800 border-none"
                                    />
                                 </div>
                                 <Input 
                                   value={newItem.category}
                                   onChange={e => setNewItem({...newItem, category: e.target.value})}
                                   placeholder="Category" 
                                   className="h-12 rounded-xl bg-slate-50 dark:bg-zinc-800 border-none"
                                 />
                              </div>
                           </div>
                           <Button type="button" onClick={addMenuItem} className="w-full h-12 rounded-xl bg-slate-900 dark:bg-white dark:text-black text-white font-black uppercase text-xs">
                              <Plus className="mr-2 w-4 h-4" /> Stage Dish
                           </Button>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                           <AnimatePresence>
                              {menuItems.map((item) => (
                                <motion.div 
                                  key={item.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  className="p-4 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-between group"
                                >
                                   <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-clay">
                                         <Utensils className="w-5 h-5" />
                                      </div>
                                      <div>
                                         <p className="font-black text-xs uppercase tracking-tight">{item.name}</p>
                                         <p className="text-[10px] text-slate-400 font-bold">${item.price} • {item.category || 'General'}</p>
                                      </div>
                                   </div>
                                   <Button 
                                     type="button" 
                                     variant="ghost" 
                                     size="icon" 
                                     onClick={() => removeMenuItem(item.id)}
                                     className="text-red-500 rounded-lg hover:bg-red-50"
                                   >
                                      <Trash2 className="w-4 h-4" />
                                   </Button>
                                </motion.div>
                              ))}
                           </AnimatePresence>
                           
                           {menuItems.length === 0 && (
                             <div className="text-center py-12 opacity-20 border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-[32px]">
                                <Utensils className="w-10 h-10 mx-auto mb-2" />
                                <p className="font-black uppercase text-[10px]">Dish library staging empty</p>
                             </div>
                           )}
                        </div>
                     </div>

                     <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-16 rounded-full bg-clay text-white font-black text-lg shadow-xl shadow-clay/20 mt-auto"
                     >
                        {loading ? 'TRANSMITTING...' : 'REGISTER & INITIALIZE MENU'}
                     </Button>
                  </div>
                )}
             </form>
          </CardContent>
        </Card>

        <p className="text-center mt-12 text-[10px] font-black uppercase text-slate-400 tracking-widest leading-loose">
           By submitting, you agree to our <span className="text-clay underline">Merchant Terms</span> & <span className="text-clay underline">Master Services Agreement</span>.
        </p>
      </div>
    </div>
  );
}
