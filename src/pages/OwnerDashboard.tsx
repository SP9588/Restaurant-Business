import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, addDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { Restaurant, MenuItem, Order, OrderStatus, CustomizationSection, MenuOption } from '../types';
import { 
  Plus, 
  Settings, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Image as ImageIcon,
  ChevronRight,
  MoreVertical,
  Truck,
  Trash2,
  ListPlus,
  Star,
  Users,
  DollarSign,
  ShoppingBag
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

import { processReferralReward } from '../lib/referral';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuSearch, setMenuSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);

  // Analytics Derived State
  const revenueData = orders.reduce((acc: any[], order) => {
    const date = format(new Date(order.createdAt), 'MMM dd');
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.revenue += order.totalAmount;
      existing.orders += 1;
    } else {
      acc.push({ date, revenue: order.totalAmount, orders: 1 });
    }
    return acc;
  }, []).slice(-7).reverse();

  const popularDishes = orders.reduce((acc: any, order) => {
    order.items.forEach(item => {
      acc[item.name] = (acc[item.name] || 0) + item.quantity;
    });
    return acc;
  }, {});

  const popularDishesData = Object.entries(popularDishes)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const totalRevenue = orders.reduce((s, o) => s + (o.paymentStatus === 'paid' ? o.totalAmount : 0), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const COLORS = ['#D14D33', '#2B2B2B', '#FFB800', '#4CAF50', '#2196F3'];

  const filteredMenuItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(menuSearch.toLowerCase()) || 
    item.category.toLowerCase().includes(menuSearch.toLowerCase())
  );

  // New Restaurant Form
  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    country: '',
    phone: '',
    email: '',
    currency: '$',
  });

  // New Menu Item Form
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    sections: [] as CustomizationSection[],
    available: true
  });

  const addSection = () => {
    const newSection: CustomizationSection = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      required: false,
      allowMultiple: false,
      options: []
    };
    setNewItem({ ...newItem, sections: [...newItem.sections, newSection] });
  };

  const removeSection = (sectionId: string) => {
    setNewItem({
      ...newItem,
      sections: newItem.sections.filter(s => s.id !== sectionId)
    });
  };

  const updateSection = (sectionId: string, data: Partial<CustomizationSection>) => {
    setNewItem({
      ...newItem,
      sections: newItem.sections.map(s => s.id === sectionId ? { ...s, ...data } : s)
    });
  };

  const addOption = (sectionId: string) => {
    const newOption: MenuOption = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      price: 0
    };
    setNewItem({
      ...newItem,
      sections: newItem.sections.map(s => 
        s.id === sectionId ? { ...s, options: [...s.options, newOption] } : s
      )
    });
  };

  const removeOption = (sectionId: string, optionId: string) => {
    setNewItem({
      ...newItem,
      sections: newItem.sections.map(s => 
        s.id === sectionId ? { ...s, options: s.options.filter(o => o.id !== optionId) } : s
      )
    });
  };

  const updateOption = (sectionId: string, optionId: string, data: Partial<MenuOption>) => {
    setNewItem({
      ...newItem,
      sections: newItem.sections.map(s => 
        s.id === sectionId ? { 
          ...s, 
          options: s.options.map(o => o.id === optionId ? { ...o, ...data } : o) 
        } : s
      )
    });
  };

  useEffect(() => {
    if (!user) return;

    // Fetch Restaurant
    const fetchRest = async () => {
      const q = query(collection(db, 'restaurants'), where('ownerId', '==', user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const restData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Restaurant;
        setRestaurant(restData);
        
        // Listen for Orders
        const ordersQ = query(
          collection(db, 'orders'), 
          where('restaurantId', '==', restData.id),
          orderBy('createdAt', 'desc')
        );
        const unsubOrders = onSnapshot(ordersQ, (s) => {
          setOrders(s.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
        });

        // Fetch Menu
        const menuSnap = await getDocs(collection(db, `restaurants/${restData.id}/menu`));
        setMenuItems(menuSnap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));

        // Fetch Reviews
        const reviewsQ = query(collection(db, 'reviews'), where('restaurantId', '==', restData.id));
        const reviewsSnap = await getDocs(reviewsQ);
        setReviews(reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        return () => unsubOrders();
      } else {
        setIsRegistering(true);
      }
      setLoading(false);
    };

    fetchRest();
  }, [user]);

  const handleRegister = async () => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'restaurants'), {
        ...newRestaurant,
        ownerId: user.uid,
        rating: 5,
        reviewCount: 0,
        status: 'open',
        isVerified: false,
        createdAt: new Date().toISOString()
      });
      setRestaurant({ id: docRef.id, ...newRestaurant, ownerId: user.uid, rating: 5, reviewCount: 0, status: 'open', isVerified: false, createdAt: new Date().toISOString() } as Restaurant);
      setIsRegistering(false);
      toast.success('Restaurant registered successfully!');
    } catch (err) {
      toast.error('Failed to register restaurant');
    }
  };

  const handleMenuItemSave = async () => {
    if (!restaurant) return;
    try {
      const itemData = {
        ...newItem,
        price: parseFloat(newItem.price),
        restaurantId: restaurant.id,
        available: newItem.available ?? true
      };

      if (selectedItem) {
        await updateDoc(doc(db, `restaurants/${restaurant.id}/menu`, selectedItem.id), itemData);
        setMenuItems(menuItems.map(item => item.id === selectedItem.id ? { ...item, ...itemData } as MenuItem : item));
        toast.success('Masterpiece refined!');
      } else {
        const docRef = await addDoc(collection(db, `restaurants/${restaurant.id}/menu`), itemData);
        setMenuItems([...menuItems, { id: docRef.id, ...itemData } as MenuItem]);
        toast.success('Menu item added!');
      }
      
      resetForm();
      setIsDialogOpen(false);
    } catch (err) {
      toast.error('Failed to save masterpiece');
    }
  };

  const resetForm = () => {
    setSelectedItem(null);
    setNewItem({
      name: '',
      description: '',
      price: '',
      category: '',
      image: '',
      sections: [],
      available: true
    } as any);
  };

  const openEditDialog = (item: MenuItem) => {
    setSelectedItem(item);
    setNewItem({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      image: item.image || '',
      sections: item.sections || [],
      available: item.available
    } as any);
    setIsDialogOpen(true);
  };

  const toggleAvailability = async (itemId: string, currentStatus: boolean) => {
    if (!restaurant) return;
    try {
      const itemRef = doc(db, `restaurants/${restaurant.id}/menu`, itemId);
      await updateDoc(itemRef, { available: !currentStatus });
      setMenuItems(menuItems.map(item => 
        item.id === itemId ? { ...item, available: !currentStatus } : item
      ));
      toast.success(`Item marked as ${!currentStatus ? 'available' : 'unavailable'}`);
    } catch (err) {
      toast.error('Failed to update availability');
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status, updatedAt: new Date().toISOString() });
      
      // If manually marked as delivered, process referral
      if (status === 'delivered') {
        const orderSnap = await getDoc(doc(db, 'orders', orderId));
        if (orderSnap.exists()) {
          const order = orderSnap.data() as Order;
          await processReferralReward(order.customerId);
        }
      }
      
      toast.success(`Order marked as ${status.replace('_', ' ')}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <div>Loading Kitchen...</div>;

  if (isRegistering) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="title-massive mb-8">Register Your <span className="text-clay italic">Kitchen</span></h1>
        <Card className="rounded-[40px] p-8 border-none shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Restaurant Name</Label>
              <Input value={newRestaurant.name} onChange={e => setNewRestaurant({...newRestaurant, name: e.target.value})} placeholder="Master Chef's Kitchen" />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={newRestaurant.phone} onChange={e => setNewRestaurant({...newRestaurant, phone: e.target.value})} placeholder="+1 234 567 890" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Full Address</Label>
              <Input value={newRestaurant.address} onChange={e => setNewRestaurant({...newRestaurant, address: e.target.value})} placeholder="123 Food Street" />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={newRestaurant.city} onChange={e => setNewRestaurant({...newRestaurant, city: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={newRestaurant.currency} onValueChange={v => setNewRestaurant({...newRestaurant, currency: v})}>
                <SelectTrigger><SelectValue placeholder="Select Currency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="$">USD ($)</SelectItem>
                  <SelectItem value="€">EUR (€)</SelectItem>
                  <SelectItem value="£">GBP (£)</SelectItem>
                  <SelectItem value="₹">INR (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleRegister} className="w-full h-14 rounded-full bg-clay text-white mt-8 text-lg font-bold">Launch Restaurant</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-neutral-50 dark:bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
          <div>
            <Badge variant="outline" className="mb-4 text-clay border-clay">{restaurant?.status === 'open' ? 'KITCHEN OPEN' : 'KITCHEN CLOSED'}</Badge>
            <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tighter uppercase">{restaurant?.name} Dashboard</h1>
            <p className="text-neutral-500 italic">Managing {orders.filter(o => o.status !== 'delivered').length} active orders currently.</p>
          </div>
          <div className="flex gap-4">
             <Dialog open={isDialogOpen} onOpenChange={(open) => {
               setIsDialogOpen(open);
               if (!open) resetForm();
             }}>
               <DialogTrigger
                 render={
                   <Button onClick={() => setIsDialogOpen(true)} className="rounded-full bg-clay text-white h-12 px-6 font-bold shadow-lg shadow-clay/20" />
                 }
               >
                 <Plus className="w-5 h-5 mr-2" /> Add Menu Item
               </DialogTrigger>
               <DialogContent className="rounded-[32px] sm:max-w-[700px] max-h-[90vh] overflow-y-auto custom-scrollbar">
                 <DialogHeader>
                   <DialogTitle className="text-2xl font-serif font-black uppercase">
                     {selectedItem ? 'Refine Masterpiece' : 'Create Masterpiece'}
                   </DialogTitle>
                   <DialogDescription>Define your dish and its unique customizations.</DialogDescription>
                 </DialogHeader>
                 <div className="grid gap-6 py-4">
                   <div className="space-y-4">
                     <h4 className="text-xs font-black uppercase tracking-widest text-clay border-l-2 border-clay pl-2">Basic Info</h4>
                     <div className="grid gap-4">
                       <div className="grid gap-2">
                         <Label>Item Name</Label>
                         <Input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. Signature Truffle Pizza" />
                       </div>
                       <div className="grid gap-2">
                         <Label>Description</Label>
                         <Input value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Describe the flavors..." />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div className="grid gap-2">
                           <Label>Base Price ({restaurant?.currency})</Label>
                           <Input type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                         </div>
                         <div className="grid gap-2">
                           <Label>Category</Label>
                           <Input value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} placeholder="Main, Drink, Snack..." />
                         </div>
                       </div>
                     </div>
                   </div>

                   <div className="space-y-6">
                     <div className="flex justify-between items-center bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl">
                       <div>
                         <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Customization Sections</h4>
                         <p className="text-[10px] text-slate-400 italic">Add modifiers like size, crust, or toppings.</p>
                       </div>
                       <Button type="button" onClick={addSection} variant="outline" size="sm" className="rounded-full border-clay text-clay hover:bg-clay hover:text-white font-bold h-9">
                         <Plus className="w-4 h-4 mr-2" /> Add Section
                       </Button>
                     </div>

                     <div className="space-y-4">
                       {newItem.sections.map((section) => (
                         <Card key={section.id} className="rounded-3xl border-2 border-slate-100 dark:border-zinc-800 bg-transparent overflow-hidden">
                           <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 flex items-center gap-4">
                             <Input 
                               value={section.name} 
                               onChange={e => updateSection(section.id, { name: e.target.value })}
                               placeholder="Section Name (e.g. Size)"
                               className="h-10 bg-white dark:bg-zinc-900 border-none rounded-xl text-sm font-bold"
                             />
                             <div className="flex items-center gap-4 px-4 whitespace-nowrap">
                               <div className="flex items-center gap-2">
                                 <Switch 
                                   checked={section.required}
                                   onCheckedChange={checked => updateSection(section.id, { required: checked })}
                                 />
                                 <span className="text-[10px] font-black uppercase tracking-tighter">Required</span>
                                </div>
                               <div className="flex items-center gap-2">
                                 <Switch 
                                   checked={section.allowMultiple}
                                   onCheckedChange={checked => updateSection(section.id, { allowMultiple: checked })}
                                 />
                                 <span className="text-[10px] font-black uppercase tracking-tighter">Multi-select</span>
                               </div>
                             </div>
                             <Button 
                               type="button" 
                               variant="ghost" 
                               size="icon" 
                               onClick={() => removeSection(section.id)}
                               className="text-red-500 hover:bg-red-50 rounded-xl"
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                           <CardContent className="p-4 space-y-3">
                             <AnimatePresence>
                               {section.options.map((option) => (
                                 <motion.div 
                                   key={option.id}
                                   initial={{ opacity: 0, y: 5 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   exit={{ opacity: 0, scale: 0.95 }}
                                   className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-2 rounded-xl"
                                 >
                                   <Input 
                                     value={option.name}
                                     onChange={e => updateOption(section.id, option.id, { name: e.target.value })}
                                     placeholder="Option (e.g. Extra Cheese)"
                                     className="h-9 border-none bg-slate-50 dark:bg-zinc-800 text-xs"
                                   />
                                   <div className="relative w-32">
                                     <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-30 text-slate-400">+</span>
                                     <Input 
                                       type="number"
                                       value={option.price}
                                       onChange={e => updateOption(section.id, option.id, { price: parseFloat(e.target.value) || 0 })}
                                       placeholder="Price"
                                       className="h-9 pl-6 border-none bg-slate-50 dark:bg-zinc-800 text-xs"
                                     />
                                   </div>
                                   <Button 
                                     type="button" 
                                     variant="ghost" 
                                     size="icon" 
                                     onClick={() => removeOption(section.id, option.id)}
                                     className="text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 w-8 h-8"
                                   >
                                     <Trash2 className="w-3 h-3" />
                                   </Button>
                                 </motion.div>
                               ))}
                             </AnimatePresence>
                             <Button 
                               type="button" 
                               onClick={() => addOption(section.id)}
                               variant="ghost" 
                               className="w-full h-9 rounded-xl border-2 border-dashed border-slate-100 dark:border-zinc-800 text-xs font-bold uppercase tracking-widest text-slate-400 hover:border-clay/20 hover:text-clay"
                             >
                               <Plus className="w-3 h-3 mr-2" /> Add Option
                             </Button>
                           </CardContent>
                         </Card>
                       ))}

                       {newItem.sections.length === 0 && (
                         <div className="text-center py-8 opacity-20 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-[32px]">
                           <p className="text-[10px] font-black uppercase">No customizations configured</p>
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
                 <DialogFooter className="sticky bottom-0 bg-white dark:bg-zinc-900 pt-4 border-t">
                   <Button onClick={handleMenuItemSave} className="w-full rounded-full bg-clay text-white h-12 font-bold shadow-xl shadow-clay/20">
                     {selectedItem ? 'Save Changes' : 'Add Masterpiece to Menu'}
                   </Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>
             <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-neutral-200 dark:border-neutral-800">
               <Settings className="w-6 h-6" />
             </Button>
          </div>
        </div>

        <Tabs defaultValue="orders" className="space-y-8">
          <TabsList className="bg-white dark:bg-zinc-900 rounded-full h-14 p-1 shadow-sm border">
            <TabsTrigger value="orders" className="rounded-full px-8 font-bold data-[state=active]:bg-clay data-[state=active]:text-white">Orders</TabsTrigger>
            <TabsTrigger value="menu" className="rounded-full px-8 font-bold data-[state=active]:bg-clay data-[state=active]:text-white">Menu Editor</TabsTrigger>
            <TabsTrigger value="stats" className="rounded-full px-8 font-bold data-[state=active]:bg-clay data-[state=active]:text-white">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {orders.map((order, i) => (
                  <motion.div 
                    key={order.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="rounded-[32px] border-none shadow-xl bg-white dark:bg-zinc-900 overflow-hidden h-full">
                      <div className={`h-2 ${
                        order.status === 'pending' ? 'bg-orange-400' : 
                        order.status === 'preparing' ? 'bg-blue-400' : 
                        order.status === 'ready' ? 'bg-green-400' : 'bg-neutral-200'
                      }`} />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                          <CardTitle className="text-xl font-black">ORDER #{order.id.slice(-4).toUpperCase()}</CardTitle>
                          <CardDescription className="font-mono text-xs italic">{format(new Date(order.createdAt), 'hh:mm a')}</CardDescription>
                        </div>
                        <Badge className={`${
                          order.status === 'pending' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30' : 
                          order.status === 'preparing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 
                          'bg-green-100 text-green-700 dark:bg-green-900/30'
                        } border-none font-black text-[10px] uppercase`}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 mb-6">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-xl">
                              <span className="text-sm font-bold"><span className="text-clay">{item.quantity}x</span> {item.name}</span>
                              <span className="text-xs font-mono text-neutral-400">{restaurant?.currency} {item.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
                           <div className="space-y-1">
                             <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Total Bill</p>
                             <p className="text-xl font-black">{restaurant?.currency} {order.totalAmount.toFixed(2)}</p>
                           </div>
                           <div className="flex gap-2">
                             {order.status === 'pending' && (
                               <Button onClick={() => updateOrderStatus(order.id, 'preparing')} size="sm" className="bg-clay text-white rounded-xl font-black">ACCEPT</Button>
                             )}
                             {order.status === 'preparing' && (
                               <Button onClick={() => updateOrderStatus(order.id, 'ready')} size="sm" className="bg-blue-500 text-white rounded-xl font-black">READY</Button>
                             )}
                             {order.status === 'ready' && (
                               <Button size="sm" variant="outline" className="rounded-xl border-green-500 text-green-500 font-black"><Truck className="w-4 h-4 mr-1"/> PENDING DRIVER</Button>
                             )}
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {orders.length === 0 && (
              <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-[40px] shadow-sm">
                <UtensilsIcon className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                <p className="text-neutral-500 font-medium italic">No orders in the pipeline. Relax and prepare for the rush!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="menu">
            <div className="mb-8 relative max-w-md">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-search"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <Input
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder="Search by dish name or category..."
                className="pl-12 h-14 rounded-2xl bg-white dark:bg-zinc-900 border-none shadow-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredMenuItems.map(item => (
                <Card key={item.id} className="rounded-[40px] overflow-hidden border-none shadow-xl bg-white dark:bg-zinc-900 group">
                  <div className="h-48 overflow-hidden relative">
                    <img src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
                  </div>
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-black font-serif uppercase tracking-tight">{item.name}</h3>
                      <Badge className="bg-clay/10 text-clay border-none font-bold">{restaurant?.currency} {item.price.toFixed(2)}</Badge>
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 italic mb-6">{item.description}</p>
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <Switch 
                          checked={item.available} 
                          onCheckedChange={() => toggleAvailability(item.id, item.available)}
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {item.available ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>
                      <Button onClick={() => openEditDialog(item)} variant="ghost" size="icon" className="rounded-full hover:bg-white dark:hover:bg-zinc-800"><MoreVertical className="w-5 h-5 text-neutral-400"/></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredMenuItems.length === 0 && (
                <div className="col-span-full text-center py-20 bg-white dark:bg-zinc-900 rounded-[40px] shadow-sm border-2 border-dashed border-slate-100 dark:border-zinc-800">
                  <p className="text-slate-400 font-medium italic">No dishes found matching your search.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="stats">
             <div className="space-y-8">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="rounded-[40px] p-6 border-none bg-clay text-white shadow-xl shadow-clay/20 group hover:scale-[1.02] transition-transform">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-white/20 rounded-2xl">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <Badge className="bg-white/20 hover:bg-white/30 border-none text-white font-bold">+14%</Badge>
                    </div>
                    <p className="text-xs uppercase tracking-widest font-black opacity-70">Total Revenue</p>
                    <h3 className="text-3xl font-serif font-black">{restaurant?.currency}{totalRevenue.toLocaleString()}</h3>
                  </Card>

                  <Card className="rounded-[40px] p-6 border-none bg-white dark:bg-zinc-900 shadow-xl group hover:scale-[1.02] transition-transform">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-clay/10 rounded-2xl text-clay">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="text-xs uppercase tracking-widest font-black text-slate-400">Total Orders</p>
                    <h3 className="text-3xl font-serif font-black">{orders.length}</h3>
                  </Card>

                  <Card className="rounded-[40px] p-6 border-none bg-white dark:bg-zinc-900 shadow-xl group hover:scale-[1.02] transition-transform">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-clay/10 rounded-2xl text-clay">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="text-xs uppercase tracking-widest font-black text-slate-400">Avg Order Value</p>
                    <h3 className="text-3xl font-serif font-black">{restaurant?.currency}{avgOrderValue.toFixed(2)}</h3>
                  </Card>

                  <Card className="rounded-[40px] p-6 border-none bg-white dark:bg-zinc-900 shadow-xl group hover:scale-[1.02] transition-transform">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-clay/10 rounded-2xl text-clay">
                        <Star className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="text-xs uppercase tracking-widest font-black text-slate-400">Avg Rating</p>
                    <div className="flex items-end gap-2">
                      <h3 className="text-3xl font-serif font-black">{restaurant?.rating.toFixed(1)}</h3>
                      <p className="text-xs text-slate-400 pb-1 italic">from {restaurant?.reviewCount} reviews</p>
                    </div>
                  </Card>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Revenue Chart */}
                  <Card className="rounded-[40px] p-8 border-none bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <CardTitle className="text-2xl font-serif font-black uppercase tracking-tighter">Revenue <span className="text-clay">Trajectory</span></CardTitle>
                        <CardDescription className="italic">Last 7 active days revenue flow</CardDescription>
                      </div>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700 }} 
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700 }} 
                            dx={-10}
                            tickFormatter={(v) => `${restaurant?.currency}${v}`}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                            cursor={{ fill: 'rgba(209, 77, 51, 0.05)' }}
                          />
                          <Bar 
                            dataKey="revenue" 
                            fill="#D14D33" 
                            radius={[8, 8, 0, 0]} 
                            barSize={40}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Popular Items Chart */}
                  <Card className="rounded-[40px] p-8 border-none bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <CardTitle className="text-2xl font-serif font-black uppercase tracking-tighter">Fan <span className="text-clay">Favorites</span></CardTitle>
                        <CardDescription className="italic">Most ordered masterpieces</CardDescription>
                      </div>
                    </div>
                    <div className="h-[300px] w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={popularDishesData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {popularDishesData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="w-1/2 space-y-3">
                         {popularDishesData.map((dish, i) => (
                           <div key={dish.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                 <span className="text-xs font-black uppercase tracking-tighter truncate max-w-[120px]">{dish.name}</span>
                              </div>
                              <span className="text-xs font-mono text-slate-400">{dish.value} units</span>
                           </div>
                         ))}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Orders Distribution Line Chart */}
                <Card className="rounded-[40px] p-8 border-none bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
                   <div className="flex justify-between items-center mb-8">
                     <div>
                       <CardTitle className="text-2xl font-serif font-black uppercase tracking-tighter">Order <span className="text-clay">Density</span></CardTitle>
                       <CardDescription className="italic">Transaction volume trends</CardDescription>
                     </div>
                   </div>
                   <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700 }} 
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700 }} 
                            dx={-10}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="orders" 
                            stroke="#D14D33" 
                            strokeWidth={4} 
                            dot={{ fill: '#D14D33', strokeWidth: 2, r: 6 }} 
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                   </div>
                </Card>

                {/* Recent Reviews Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <Card className="rounded-[40px] p-8 border-none bg-white dark:bg-zinc-900 shadow-xl">
                      <h3 className="text-xl font-serif font-black uppercase mb-6">Recent <span className="text-clay">Feedback</span></h3>
                      <div className="space-y-6">
                         {reviews.slice(0, 3).map(review => (
                           <div key={review.id} className="space-y-2">
                              <div className="flex justify-between items-center">
                                 <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                                    ))}
                                 </div>
                                 <span className="text-[10px] font-mono text-slate-400">{format(new Date(review.createdAt), 'MMM dd')}</span>
                              </div>
                              <p className="text-xs italic text-slate-500 line-clamp-2">"{review.comment}"</p>
                           </div>
                         ))}
                         {reviews.length === 0 && <p className="text-center py-10 text-slate-400 italic">No feedback yet. Keep surprising your guests!</p>}
                      </div>
                      <Button variant="ghost" className="w-full mt-6 rounded-2xl text-xs font-black uppercase tracking-widest text-clay hover:bg-clay/5">View All Reviews</Button>
                   </Card>
                   
                   <Card className="rounded-[40px] p-8 border-none bg-zinc-900 text-white shadow-xl shadow-black/20 flex flex-col justify-center items-center text-center">
                      <div className="w-20 h-20 bg-clay rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-clay/40">
                         <TrendingUp className="w-10 h-10" />
                      </div>
                      <h3 className="text-2xl font-serif font-black mb-2 uppercase italic tracking-tighter">Growth Optimization</h3>
                      <p className="text-xs text-slate-400 italic mb-8 max-w-[240px]">Your signature dishes are driving 65% of your total revenue this month.</p>
                      <Button className="rounded-full bg-white text-black font-black uppercase text-xs h-12 px-8 tracking-widest hover:bg-clay hover:text-white transition-all">Download Report</Button>
                   </Card>
                </div>
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function UtensilsIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}
