import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  addDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { Restaurant, MenuItem, Promotion, UserProfile, UserRole } from '../types';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Utensils, 
  LayoutDashboard, 
  Users as UsersIcon, 
  TrendingUp,
  Store,
  DollarSign,
  ChevronRight,
  MoreVertical,
  X,
  Check,
  Link2,
  Copy,
  Share2,
  Download,
  QrCode,
  Tag,
  Percent,
  Gift,
  Coins,
  Shield,
  Mail,
  UserPlus,
  ArrowUpRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedRest, setSelectedRest] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuFilterCategory, setMenuFilterCategory] = useState<string>('All');
  const [menuFilterAvailability, setMenuFilterAvailability] = useState<'all' | 'available' | 'hidden'>('all');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showItemDialog, setShowItemDialog] = useState(false);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [showPromoDialog, setShowPromoDialog] = useState(false);

  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [showUserDeleteDialog, setShowUserDeleteDialog] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    totalDishes: 0,
    activePartners: 0,
    totalUsers: 0
  });

  useEffect(() => {
    fetchRestaurants();
    fetchPromotions();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const uData = snap.docs.map(d => ({ userId: d.id, ...d.data() } as UserProfile));
      setUsers(uData);
      setStats(prev => ({ ...prev, totalUsers: uData.length }));
    } catch (err) {
      console.error('Failed to fetch user directory');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(users.map(u => u.userId === userId ? { ...u, role: newRole } : u));
      toast.success(`User role elevated to ${newRole}`);
    } catch (err) {
      toast.error('Privilege escalation failed');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete));
      setUsers(users.filter(u => u.userId !== userToDelete));
      toast.success('Agent removed from records');
      setShowUserDeleteDialog(false);
      setUserToDelete(null);
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  const fetchPromotions = async () => {
    try {
      const snap = await getDocs(collection(db, 'promotions'));
      setPromotions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Promotion)));
    } catch (err) {
      console.error('Failed to fetch promos');
    }
  };

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'restaurants'));
      const rests = snap.docs.map(d => ({ id: d.id, ...d.data() } as Restaurant));
      setRestaurants(rests);
      
      setStats(prev => ({
        ...prev,
        totalRestaurants: rests.length,
        activePartners: rests.filter(r => r.isVerified).length
      }));
    } catch (err) {
      toast.error('Failed to wake ecosystem');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenu = async (restaurantId: string) => {
    try {
      const snap = await getDocs(collection(db, `restaurants/${restaurantId}/menu`));
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
      setMenuItems(items);
      setMenuFilterCategory('All');
      setMenuFilterAvailability('all');
    } catch (err) {
      toast.error('Failed to load menu');
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    const categoryMatch = menuFilterCategory === 'All' || item.category === menuFilterCategory;
    const availabilityMatch = 
      menuFilterAvailability === 'all' || 
      (menuFilterAvailability === 'available' && item.available) || 
      (menuFilterAvailability === 'hidden' && !item.available);
    return categoryMatch && availabilityMatch;
  });

  const menuCategories = ['All', ...Array.from(new Set(menuItems.map(item => item.category)))];

  const handleDeleteRestaurant = async () => {
    if (!restaurantToDelete) return;
    try {
      await deleteDoc(doc(db, 'restaurants', restaurantToDelete));
      setRestaurants(restaurants.filter(r => r.id !== restaurantToDelete));
      toast.success('Restaurant erased from database');
      setShowDeleteDialog(false);
      setRestaurantToDelete(null);
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  const handleUpdatePrice = async (itemId: string, newPrice: string) => {
    if (!selectedRest) return;
    const price = parseFloat(newPrice);
    if (isNaN(price)) return;

    try {
      await updateDoc(doc(db, `restaurants/${selectedRest.id}/menu`, itemId), {
        price: price
      });
      setMenuItems(menuItems.map(m => m.id === itemId ? { ...m, price } : m));
      toast.success('Pricing recalibrated');
    } catch (err) {
      toast.error('Pricing update failed');
    }
  };

  const handleToggleAvailability = async (itemId: string, currentStatus: boolean) => {
    if (!selectedRest) return;
    try {
      await updateDoc(doc(db, `restaurants/${selectedRest.id}/menu`, itemId), {
        available: !currentStatus
      });
      setMenuItems(menuItems.map(m => m.id === itemId ? { ...m, available: !currentStatus } : m));
      toast.success(currentStatus ? 'Dish hidden' : 'Dish activated');
    } catch (err) {
      toast.error('Availability update failed');
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!selectedRest) return;
    if (!confirm('Erase this dish from the menu?')) return;
    try {
      await deleteDoc(doc(db, `restaurants/${selectedRest.id}/menu`, itemId));
      setMenuItems(menuItems.filter(m => m.id !== itemId));
      toast.success('Dish purged');
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  const handleSaveMenuItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRest) return;
    
    const formData = new FormData(e.currentTarget);
    const data: any = {
      name: formData.get('name'),
      description: formData.get('description'),
      price: parseFloat(formData.get('price') as string),
      category: formData.get('category'),
      image: formData.get('image'),
      available: formData.get('available') === 'on',
      restaurantId: selectedRest.id
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, `restaurants/${selectedRest.id}/menu`, editingItem.id), data);
        setMenuItems(menuItems.map(m => m.id === editingItem.id ? { ...m, ...data } : m));
        toast.success(`${data.name} recalibrated`);
      } else {
        const docRef = await addDoc(collection(db, `restaurants/${selectedRest.id}/menu`), data);
        setMenuItems([...menuItems, { id: docRef.id, ...data }]);
        toast.success(`${data.name} added to the line`);
      }
      setEditingItem(null);
      setShowItemDialog(false);
    } catch (err) {
      toast.error('Save failed');
    }
  };

  const handleAddRestaurant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        address: formData.get('address'),
        city: formData.get('city'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        currency: '$',
        rating: 5,
        reviewCount: 0,
        status: 'open',
        isVerified: true,
        ownerId: 'admin_manual',
        createdAt: new Date().toISOString()
    };

    try {
        const docRef = await addDoc(collection(db, 'restaurants'), data);
        setRestaurants([...restaurants, { id: docRef.id, ...data } as Restaurant]);
        toast.success(`Welcome ${data.name} to the ecosystem`);
        (e.target as HTMLFormElement).reset();
    } catch (err) {
        toast.error('Addition failed');
    }
  };

  const handleSavePromotion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const itemIdsRaw = formData.get('itemIds') as string;
    const data = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      type: formData.get('type') as any,
      value: parseFloat(formData.get('value') as string),
      code: formData.get('code') as string,
      minOrderValue: parseFloat(formData.get('minOrderValue') as string) || 0,
      restaurantId: (formData.get('restaurantId') as string) || null,
      itemIds: itemIdsRaw ? itemIdsRaw.split(',').map(s => s.trim()) : [],
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      isActive: formData.get('isActive') === 'on',
    };

    try {
      if (editingPromotion) {
        await updateDoc(doc(db, 'promotions', editingPromotion.id), data);
        setPromotions(promotions.map(p => p.id === editingPromotion.id ? { ...p, ...data } : p));
        toast.success('Promotion recalibrated');
      } else {
        const docRef = await addDoc(collection(db, 'promotions'), data);
        setPromotions([...promotions, { id: docRef.id, ...data } as Promotion]);
        toast.success('Promotion engine updated');
      }
      setShowPromoDialog(false);
      setEditingPromotion(null);
    } catch (err) {
      toast.error('Promotion failed to launch');
    }
  };

  const handleTogglePromoStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'promotions', id), { isActive: !currentStatus });
      setPromotions(promotions.map(p => p.id === id ? { ...p, isActive: !currentStatus } : p));
      toast.success(!currentStatus ? 'Promotion activated' : 'Promotion paused');
    } catch (err) {
      toast.error('Status update failed');
    }
  };

  const handleDeletePromotion = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'promotions', id));
      setPromotions(promotions.filter(p => p.id !== id));
      toast.success('Promotion deactivated and purged');
    } catch (err) {
      toast.error('Removal failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="title-massive">System <span className="text-clay italic">Control</span></h1>
            <p className="text-slate-500 italic mt-2">Executive oversight terminal for the entire delivery ecosystem.</p>
          </div>
          
          <div className="flex gap-4">
            <Dialog>
              <DialogTrigger
                render={
                  <Button className="h-14 rounded-full bg-slate-900 dark:bg-white dark:text-black text-white px-8 font-black text-sm uppercase tracking-widest shadow-xl" />
                }
              >
                <Plus className="mr-2 w-5 h-5" /> Add Restaurant
              </DialogTrigger>
              <DialogContent className="max-w-xl rounded-[40px] p-10">
                <DialogHeader className="mb-8">
                  <DialogTitle className="text-3xl font-black italic uppercase italic">Onboard <span className="text-clay">New Facility</span></DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddRestaurant} className="space-y-6">
                   <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-400">Establishment Name</Label>
                       <Input name="name" required className="h-12 rounded-xl" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-slate-400">City</Label>
                           <Input name="city" required className="h-12 rounded-xl" />
                       </div>
                       <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-slate-400">Phone</Label>
                           <Input name="phone" required className="h-12 rounded-xl" />
                       </div>
                   </div>
                   <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-400">Full Address</Label>
                       <Input name="address" required className="h-12 rounded-xl" />
                   </div>
                   <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-400">Description</Label>
                       <Input name="description" required className="h-12 rounded-xl" />
                   </div>
                   <Button type="submit" className="w-full h-14 rounded-full bg-clay text-white font-black text-lg">INITIALIZE ESTABLISHMENT</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
           <Card className="rounded-[32px] border-none shadow-sm bg-white dark:bg-zinc-900 p-6 flex flex-col items-center justify-center text-center">
              <Store className="w-8 h-8 mb-4 text-clay" />
              <p className="text-2xl font-black">{stats.totalRestaurants}</p>
              <p className="text-[10px] uppercase font-black text-slate-400">Total Restaurants</p>
           </Card>
           <Card className="rounded-[32px] border-none shadow-sm bg-white dark:bg-zinc-900 p-6 flex flex-col items-center justify-center text-center">
              <Utensils className="w-8 h-8 mb-4 text-blue-500" />
              <p className="text-2xl font-black">842</p>
              <p className="text-[10px] uppercase font-black text-slate-400">Items Cataloged</p>
           </Card>
           <Card className="rounded-[32px] border-none shadow-sm bg-white dark:bg-zinc-900 p-6 flex flex-col items-center justify-center text-center">
              <UsersIcon className="w-8 h-8 mb-4 text-orange-500" />
              <p className="text-2xl font-black">{stats.totalUsers}</p>
              <p className="text-[10px] uppercase font-black text-slate-400">Total Ecosystem Agents</p>
           </Card>
           <Card className="rounded-[32px] border-none shadow-sm bg-clay text-white p-6 flex flex-col items-center justify-center text-center">
              <TrendingUp className="w-8 h-8 mb-4 opacity-50" />
              <p className="text-2xl font-black">€14.2K</p>
              <p className="text-[10px] uppercase font-black opacity-80">Ecosystem Revenue</p>
           </Card>
        </div>

        <Tabs defaultValue="restaurants" className="space-y-8">
          <TabsList className="bg-white/50 dark:bg-zinc-900/50 rounded-full h-14 p-1 backdrop-blur-xl border border-white dark:border-zinc-800">
            <TabsTrigger value="restaurants" className="rounded-full px-8 font-black text-xs uppercase transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">Establishments</TabsTrigger>
            <TabsTrigger value="users" className="rounded-full px-8 font-black text-xs uppercase transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">User Management</TabsTrigger>
            <TabsTrigger value="promotions" className="rounded-full px-8 font-black text-xs uppercase transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">Promotions</TabsTrigger>
            <TabsTrigger value="links" className="rounded-full px-8 font-black text-xs uppercase transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">Link Vault</TabsTrigger>
            <TabsTrigger value="partners" className="rounded-full px-8 font-black text-xs uppercase transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">Partner Onboarding</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="rounded-[40px] border-none p-10 bg-white dark:bg-zinc-900 shadow-2xl">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                  <div>
                    <h2 className="text-3xl font-black italic uppercase">Citizen <span className="text-clay">Registry</span></h2>
                    <p className="text-slate-500 text-xs italic mt-1">Global oversight of all ecosystem agents and their permissions.</p>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="SEARCH BY NAME OR EMAIL" 
                      className="pl-12 h-12 rounded-2xl bg-slate-50 dark:bg-zinc-800 border-none font-black text-[10px] uppercase tracking-widest"
                    />
                  </div>
               </div>

               <div className="space-y-4">
                  {users.filter(u => (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) || (u.email || '').toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                    <div key={u.userId} className="p-6 bg-slate-50 dark:bg-zinc-800 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:ring-2 hover:ring-clay/20 transition-all">
                       <div className="flex items-center gap-6">
                         <div className="w-16 h-16 rounded-[24px] bg-white dark:bg-zinc-900 flex items-center justify-center text-slate-900 dark:text-white border border-slate-100 dark:border-zinc-700 relative shrink-0">
                            {u.profileImage ? (
                              <img src={u.profileImage} className="w-full h-full object-cover rounded-[24px]" />
                            ) : (
                              <UsersIcon className="w-8 h-8 opacity-20" />
                            )}
                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-slate-50 dark:border-zinc-800 ${
                              u.role === 'admin' ? 'bg-clay' : u.role === 'owner' ? 'bg-blue-600' : u.role === 'driver' ? 'bg-orange-500' : 'bg-slate-400'
                            }`}>
                               <Shield className="w-3 h-3 text-white" />
                            </div>
                         </div>
                         <div>
                            <div className="flex items-center gap-2">
                               <p className="font-black text-lg uppercase tracking-tight">{u.name}</p>
                               <Badge className="bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white text-[8px] uppercase tracking-widest">{u.role}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                               <p className="text-[10px] text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</p>
                               <p className="text-[10px] text-slate-500 flex items-center gap-1">• {u.loyaltyPoints} Points</p>
                            </div>
                         </div>
                       </div>

                       <div className="flex items-center gap-3">
                          <select 
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u.userId, e.target.value as UserRole)}
                            className="h-10 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-clay/20"
                          >
                             <option value="customer">Customer</option>
                             <option value="owner">Restaurant Owner</option>
                             <option value="driver">Delivery Agent</option>
                             <option value="cashier">Financial Officer</option>
                             <option value="admin">System Admin</option>
                          </select>
                          <Button 
                            onClick={() => {
                               setUserToDelete(u.userId);
                               setShowUserDeleteDialog(true);
                            }}
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 p-0 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-700 text-red-500 hover:bg-red-50"
                          >
                             <Trash2 className="w-4 h-4" />
                          </Button>
                       </div>
                    </div>
                  ))}
               </div>
            </Card>
          </TabsContent>

          <TabsContent value="restaurants">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence>
                  {restaurants.map((rest, i) => (
                    <motion.div 
                      key={rest.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="group rounded-[40px] border-none shadow-xl bg-white dark:bg-zinc-900 overflow-hidden h-full flex flex-col">
                        <div className="h-48 relative overflow-hidden bg-slate-100 dark:bg-zinc-800">
                           <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                           <img src={rest.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                           <div className="absolute bottom-6 left-6 z-20">
                              <Badge className="bg-white/20 backdrop-blur-md border-none text-white font-black text-[10px] mb-2">{rest.city.toUpperCase()}</Badge>
                              <h3 className="text-white text-2xl font-black uppercase italic tracking-tighter leading-tight">{rest.name}</h3>
                           </div>
                        </div>
                        <CardContent className="p-8 flex-grow">
                          <p className="text-slate-500 text-sm italic line-clamp-2 mb-8">{rest.description}</p>
                          <div className="flex gap-2">
                             <Button 
                               onClick={() => { setSelectedRest(rest); fetchMenu(rest.id); }}
                               className="flex-grow h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 dark:text-white text-slate-900 font-black text-[10px] uppercase hover:bg-clay hover:text-white transition-all shadow-sm"
                             >
                               Manage Dishes
                             </Button>
                             <Button 
                               onClick={() => {
                                 setRestaurantToDelete(rest.id);
                                 setShowDeleteDialog(true);
                               }}
                               variant="outline" 
                               className="h-12 w-12 rounded-2xl border-slate-100 dark:border-zinc-800 text-red-500 hover:bg-red-50 hover:border-red-100"
                             >
                               <Trash2 className="w-5 h-5" />
                             </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
             </div>
          </TabsContent>

          <TabsContent value="promotions">
             <div className="space-y-8">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                 <div>
                   <h2 className="text-3xl font-black italic uppercase">Promotion <span className="text-clay">Forge</span></h2>
                   <p className="text-slate-500 text-xs italic mt-1">Design and manage marketing campaigns across the ecosystem.</p>
                 </div>
                 <Button 
                   onClick={() => { setEditingPromotion(null); setShowPromoDialog(true); }}
                   className="h-14 rounded-full bg-clay text-white px-8 font-black text-sm uppercase tracking-widest shadow-xl"
                 >
                   <Plus className="mr-2 w-5 h-5" /> Design Promotion
                 </Button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {promotions.map(promo => (
                    <Card key={promo.id} className={`group rounded-[40px] border-none shadow-xl bg-white dark:bg-zinc-900 overflow-hidden transition-all hover:ring-2 hover:ring-clay/20 ${!promo.isActive ? 'opacity-60 grayscale' : ''}`}>
                       <div className="p-8">
                          <div className="flex justify-between items-start mb-6">
                             <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center text-clay shadow-inner">
                                {promo.type === 'percentage' ? <Percent className="w-6 h-6" /> : promo.type === 'fixed' ? <DollarSign className="w-6 h-6" /> : <Gift className="w-6 h-6" />}
                             </div>
                             <div className="flex gap-2">
                                <Button 
                                  onClick={() => { setEditingPromotion(promo); setShowPromoDialog(true); }}
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 hover:text-clay"
                                >
                                   <Edit3 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  onClick={() => handleDeletePromotion(promo.id)}
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 text-red-500 hover:bg-red-50"
                                >
                                   <Trash2 className="w-4 h-4" />
                                </Button>
                             </div>
                          </div>

                          <div className="space-y-4">
                             <div>
                                <h3 className="text-xl font-black italic uppercase tracking-tighter line-clamp-1">{promo.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                   <Badge className="bg-clay text-white text-[10px] uppercase font-black">{promo.code || 'AUTO'}</Badge>
                                   <span className="text-[10px] font-black uppercase text-slate-400">{promo.type}</span>
                                </div>
                             </div>

                             <p className="text-slate-500 text-xs italic line-clamp-2 min-h-[32px]">{promo.description}</p>
                             
                             <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100 dark:border-zinc-800">
                                <div>
                                   <p className="text-[8px] font-black uppercase text-slate-400">Discount Value</p>
                                   <p className="font-black text-lg">{promo.value}{promo.type === 'percentage' ? '%' : '$'}</p>
                                </div>
                                <div>
                                   <p className="text-[8px] font-black uppercase text-slate-400">Status</p>
                                   <button 
                                     onClick={() => handleTogglePromoStatus(promo.id, promo.isActive)}
                                     className={`flex items-center gap-1 font-black text-[10px] uppercase ${promo.isActive ? 'text-green-500' : 'text-slate-400'}`}
                                   >
                                      {promo.isActive ? (
                                        <><Eye className="w-3 h-3" /> Active</>
                                      ) : (
                                        <><EyeOff className="w-3 h-3" /> Paused</>
                                      )}
                                   </button>
                                </div>
                             </div>

                             <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400 pt-2">
                                <span>ENDS: {new Date(promo.endDate).toLocaleDateString()}</span>
                                <span>{promo.restaurantId ? 'RESTAURANT SPECIFIC' : 'GLOBAL OFFER'}</span>
                             </div>
                          </div>
                       </div>
                    </Card>
                  ))}
                  {promotions.length === 0 && (
                    <div className="col-span-full text-center py-24 bg-white dark:bg-zinc-900 rounded-[40px] border-2 border-dashed border-slate-100 dark:border-zinc-800">
                       <Tag className="w-16 h-16 mx-auto mb-6 text-slate-200" />
                       <p className="text-slate-400 font-black italic uppercase">Promotion engine silent</p>
                    </div>
                  )}
               </div>
            </div>
          </TabsContent>
          <TabsContent value="links">
             <Card className="rounded-[40px] border-none p-10 bg-white dark:bg-zinc-900 shadow-2xl">
                <div className="flex justify-between items-center mb-10">
                   <div>
                      <h2 className="text-3xl font-black italic uppercase">Accessible <span className="text-clay">Link Gateway</span></h2>
                      <p className="text-slate-500 text-xs italic mt-1">Control, copy, and distribute restaurant access points.</p>
                   </div>
                   <Button 
                     onClick={() => {
                        const blob = new Blob([JSON.stringify(restaurants, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `ecosystem_registry_${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        toast.success('System Registry Downloaded');
                     }}
                     className="h-12 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest px-6"
                   >
                      <Download className="mr-2 w-4 h-4" /> Download Registry
                   </Button>
                </div>

                <div className="space-y-4">
                   {restaurants.map(rest => {
                      const shareUrl = `${window.location.origin}/restaurant/${rest.id}`;
                      return (
                        <div key={rest.id} className="p-6 bg-slate-50 dark:bg-zinc-800 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:ring-2 hover:ring-clay/20 transition-all">
                           <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-clay">
                                <Link2 className="w-6 h-6" />
                             </div>
                             <div>
                                <p className="font-black text-sm uppercase">{rest.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{shareUrl}</p>
                             </div>
                           </div>

                           <div className="flex items-center gap-3">
                              <Button 
                                onClick={() => {
                                  navigator.clipboard.writeText(shareUrl);
                                  toast.success('Link Copied to Clipboard');
                                }}
                                className="h-10 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white font-black text-[10px] uppercase"
                              >
                                 <Copy className="mr-2 w-3 h-3" /> Copy
                              </Button>
                              <Button 
                                onClick={() => {
                                   if (navigator.share) {
                                      navigator.share({
                                         title: rest.name,
                                         text: `Order from ${rest.name} on the Ecosystem!`,
                                         url: shareUrl
                                      });
                                   } else {
                                      toast.error('Native sharing not supported in this browser');
                                   }
                                }}
                                className="h-10 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white font-black text-[10px] uppercase"
                              >
                                 <Share2 className="mr-2 w-3 h-3" /> Share
                              </Button>
                              <Button className="h-10 w-10 p-0 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                                 <QrCode className="w-4 h-4" />
                              </Button>
                           </div>
                        </div>
                      );
                   })}
                </div>
             </Card>
          </TabsContent>

          <TabsContent value="partners">
             <Card className="rounded-[40px] border-none p-12 bg-white dark:bg-zinc-900 text-center max-w-2xl mx-auto shadow-2xl">
                <Store className="w-16 h-16 text-clay mx-auto mb-8 opacity-20" />
                <h2 className="text-4xl font-black italic uppercase mb-6">Partner <span className="text-clay">Portal</span></h2>
                <p className="text-slate-500 italic mb-10 leading-relaxed">Extend the ecosystem by inviting new Restaurants, specialized Delivery Management Systems, or Strategic Partners.</p>
                <div className="grid grid-cols-1 gap-4 text-left max-w-sm mx-auto">
                   <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-zinc-800 rounded-3xl border border-transparent hover:border-clay/20 transition-all cursor-pointer">
                      <div className="w-6 h-6 rounded-full border-2 border-clay flex items-center justify-center">
                        <Check className="w-4 h-4 text-clay" />
                      </div>
                      <span className="font-black text-sm uppercase">Activate Restaurant Network</span>
                   </div>
                   <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-zinc-800 rounded-3xl border border-transparent hover:border-blue-500/20 transition-all cursor-pointer">
                      <Input type="checkbox" className="w-6 h-6 rounded-lg accent-blue-500" />
                      <span className="font-black text-sm uppercase">Delivery Logistics Module</span>
                   </div>
                   <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-zinc-800 rounded-3xl border border-transparent hover:border-orange-500/20 transition-all cursor-pointer">
                      <Input type="checkbox" className="w-6 h-6 rounded-lg accent-orange-500" />
                      <span className="font-black text-sm uppercase">Strategic Ecosystem Partner</span>
                   </div>
                </div>
                <Button className="mt-12 h-14 px-12 rounded-full bg-slate-900 dark:bg-white dark:text-black text-white font-black text-sm uppercase tracking-widest shadow-xl">
                    Invite Selected Partners
                </Button>
             </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dish Management Modal */}
      <Dialog open={!!selectedRest} onOpenChange={(open) => { if(!open) setSelectedRest(null); }}>
        <DialogContent className="max-w-5xl rounded-[40px] p-10 h-[85vh] flex flex-col overflow-hidden border-none shadow-2xl">
           <DialogHeader className="mb-8 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-3xl font-black italic uppercase">Manage <span className="text-clay">Menu Library</span></DialogTitle>
                <DialogDescription className="italic">Adjust pricing and availability for {selectedRest?.name}</DialogDescription>
              </div>
              <Button 
                onClick={() => { setEditingItem(null); setShowItemDialog(true); }}
                className="h-12 rounded-full bg-clay text-white px-6 font-black text-xs uppercase tracking-widest"
              >
                 <Plus className="mr-2 w-4 h-4" /> Add Dish
              </Button>
           </DialogHeader>
           
           <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-grow flex items-center gap-4 bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl">
                <div>
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Filter Category</p>
                   <select 
                     value={menuFilterCategory}
                     onChange={(e) => setMenuFilterCategory(e.target.value)}
                     className="h-10 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white font-black text-[10px] uppercase tracking-widest outline-none"
                   >
                     {menuCategories.map(cat => (
                       <option key={cat} value={cat}>{cat}</option>
                     ))}
                   </select>
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Availability Status</p>
                   <select 
                     value={menuFilterAvailability}
                     onChange={(e) => setMenuFilterAvailability(e.target.value as any)}
                     className="h-10 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white font-black text-[10px] uppercase tracking-widest outline-none"
                   >
                     <option value="all">Show All</option>
                     <option value="available">Available Only</option>
                     <option value="hidden">Hidden Only</option>
                   </select>
                </div>
              </div>
           </div>
           
           <div className="flex-grow overflow-y-auto pr-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMenuItems.map(item => (
                  <div key={item.id} className="p-4 bg-slate-50 dark:bg-zinc-800 rounded-3xl flex items-center justify-between gap-6 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-200 dark:bg-zinc-700 shrink-0">
                          <img src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-black text-sm uppercase tracking-tight line-clamp-1">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium italic mb-1">{item.category}</p>
                          <Badge variant={item.available ? "default" : "secondary"} className="text-[8px] h-4">
                            {item.available ? 'AVAILABLE' : 'HIDDEN'}
                          </Badge>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="text-right mr-2">
                           <p className="text-[8px] font-black uppercase text-slate-400">Current Price</p>
                           <p className="font-black text-sm">${item.price.toFixed(2)}</p>
                        </div>
                        <Button 
                          onClick={() => handleToggleAvailability(item.id, item.available)}
                          variant="ghost" 
                          size="icon" 
                          className={`h-10 w-10 p-0 rounded-xl border border-slate-100 dark:border-zinc-600 transition-colors ${
                            item.available 
                              ? 'bg-clay/5 text-clay hover:bg-clay/10' 
                              : 'bg-slate-100 dark:bg-zinc-700 text-slate-400 opacity-50'
                          }`}
                        >
                          {item.available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button 
                          onClick={() => { setEditingItem(item); setShowItemDialog(true); }}
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 p-0 rounded-xl bg-white dark:bg-zinc-700 border border-slate-100 dark:border-zinc-600 text-slate-600 dark:text-slate-300 hover:text-clay"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button 
                          onClick={() => handleDeleteMenuItem(item.id)}
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 p-0 rounded-xl bg-white dark:bg-zinc-700 border border-slate-100 dark:border-zinc-600 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredMenuItems.length === 0 && (
                <div className="text-center py-20 opacity-30">
                   <Utensils className="w-12 h-12 mx-auto mb-4" />
                   <p className="font-black italic uppercase">No dishes found</p>
                </div>
              )}
           </div>
           
           <DialogFooter className="mt-8 pt-8 border-t dark:border-zinc-800">
              <Button onClick={() => setSelectedRest(null)} className="w-full h-14 rounded-full bg-slate-900 dark:bg-white dark:text-black text-white font-black text-sm uppercase tracking-widest">CLOSE CATALOG MANAGER</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-xl rounded-[40px] p-10 border-none shadow-2xl">
           <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black italic uppercase">
                {editingItem ? 'Update' : 'Onboard'} <span className="text-clay">Menu Entry</span>
              </DialogTitle>
           </DialogHeader>

           <form onSubmit={handleSaveMenuItem} className="space-y-6">
              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-slate-400">Dish Name</Label>
                 <Input name="name" defaultValue={editingItem?.name} required className="h-12 rounded-xl" placeholder="E.g. Truffle Infused Risotto" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Category</Label>
                    <Input name="category" defaultValue={editingItem?.category} required className="h-12 rounded-xl" placeholder="E.g. Mains" />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Price ($)</Label>
                    <Input name="price" type="number" step="0.01" defaultValue={editingItem?.price} required className="h-12 rounded-xl" placeholder="19.99" />
                 </div>
              </div>

              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-slate-400">Image URL</Label>
                 <Input name="image" defaultValue={editingItem?.image} className="h-12 rounded-xl" placeholder="https://images.unsplash.com/..." />
              </div>

              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-slate-400">Brief Narrative</Label>
                 <Input name="description" defaultValue={editingItem?.description} className="h-12 rounded-xl" placeholder="Describe the flavor profiles..." />
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl">
                 <input 
                   type="checkbox" 
                   name="available" 
                   id="available" 
                   defaultChecked={editingItem ? editingItem.available : true}
                   className="w-5 h-5 accent-clay"
                 />
                 <Label htmlFor="available" className="text-sm font-black uppercase italic cursor-pointer">Available for Order</Label>
              </div>

              <Button type="submit" className="w-full h-14 rounded-full bg-clay text-white font-black text-lg shadow-xl shadow-clay/10">
                 {editingItem ? 'RECIBRATE ENTRY' : 'INITIALIZE DISH'}
              </Button>
           </form>
        </DialogContent>
      </Dialog>
      {/* Promotion Forge Modal */}
      <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
        <DialogContent className="max-w-2xl rounded-[40px] p-10 border-none shadow-2xl">
           <DialogHeader className="mb-8">
              <DialogTitle className="text-3xl font-black italic uppercase">
                {editingPromotion ? 'Reshape' : 'Forge'} <span className="text-clay">Campaign</span>
              </DialogTitle>
              <DialogDescription className="italic">Design high-impact marketing incentives for the ecosystem.</DialogDescription>
           </DialogHeader>

           <form onSubmit={handleSavePromotion} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Offer Title</Label>
                    <Input name="title" defaultValue={editingPromotion?.title} required className="h-12 rounded-xl" placeholder="Summer FEAST" />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Promocode (Optional)</Label>
                    <Input name="code" defaultValue={editingPromotion?.code} className="h-12 rounded-xl font-mono uppercase" placeholder="SUMMER50" />
                 </div>
              </div>

              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-slate-400">Campaign Narrative</Label>
                 <Input name="description" defaultValue={editingPromotion?.description} required className="h-12 rounded-xl" placeholder="A brief hook for the customers..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-slate-400">Discount Logic</Label>
                   <select name="type" defaultValue={editingPromotion?.type || 'percentage'} className="w-full h-12 rounded-xl bg-slate-50 dark:bg-zinc-800 px-4 text-xs font-bold border-none outline-none">
                      <option value="percentage">% Percentage</option>
                      <option value="fixed">$ Fixed Amount</option>
                      <option value="bogo">BOGO (Buy 1 Get 1)</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-slate-400">Discount Value</Label>
                   <Input name="value" type="number" step="0.01" defaultValue={editingPromotion?.value} required className="h-12 rounded-xl" placeholder="20" />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-slate-400">Min. Order ($)</Label>
                   <Input name="minOrderValue" type="number" step="0.01" defaultValue={editingPromotion?.minOrderValue} className="h-12 rounded-xl" placeholder="50.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Activation Date</Label>
                    <Input name="startDate" type="date" defaultValue={editingPromotion?.startDate ? editingPromotion.startDate.split('T')[0] : new Date().toISOString().split('T')[0]} required className="h-12 rounded-xl" />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Expiration Date</Label>
                    <Input name="endDate" type="date" defaultValue={editingPromotion?.endDate ? editingPromotion.endDate.split('T')[0] : ''} required className="h-12 rounded-xl" />
                 </div>
              </div>

              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-slate-400">Target Facility</Label>
                 <select name="restaurantId" defaultValue={editingPromotion?.restaurantId || ''} className="w-full h-12 rounded-xl bg-slate-50 dark:bg-zinc-800 px-4 text-xs font-bold border-none outline-none">
                    <option value="">GLOBAL (Wide Deployment)</option>
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                 </select>
              </div>

              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-slate-400">Specific Item IDs (Comma Separated)</Label>
                 <Input name="itemIds" defaultValue={editingPromotion?.itemIds?.join(', ')} className="h-12 rounded-xl font-mono text-[10px]" placeholder="item_id_1, item_id_2..." />
                 <p className="text-[8px] text-slate-400 italic">Leave empty to apply to entire menu.</p>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl">
                 <input 
                   type="checkbox" 
                   name="isActive" 
                   id="isActive" 
                   defaultChecked={editingPromotion ? editingPromotion.isActive : true}
                   className="w-5 h-5 accent-clay"
                 />
                 <Label htmlFor="isActive" className="text-sm font-black uppercase italic cursor-pointer">Immediate Activation</Label>
              </div>

              <Button type="submit" className="w-full h-14 rounded-full bg-clay text-white font-black text-lg shadow-xl shadow-clay/10">
                 {editingPromotion ? 'RECIBRATE CAMPAIGN' : 'DEPLOY PROMOTION'}
              </Button>
           </form>
        </DialogContent>
      </Dialog>
      {/* Restaurant Deletion Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md rounded-[40px] p-10 border-none shadow-2xl">
           <DialogHeader className="mb-6">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
                 <Trash2 className="w-8 h-8" />
              </div>
              <DialogTitle className="text-2xl font-black italic uppercase text-center">
                Confirm <span className="text-clay">Destruction</span>
              </DialogTitle>
              <DialogDescription className="text-center italic mt-2">
                This action is irreversible. The establishment and all associated data will be erased from the ecosystem.
              </DialogDescription>
           </DialogHeader>

           <div className="flex gap-4 mt-4">
              <Button 
                onClick={() => setShowDeleteDialog(false)}
                variant="outline" 
                className="flex-1 h-14 rounded-full font-black text-xs uppercase tracking-widest border-slate-200 dark:border-zinc-800"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDeleteRestaurant}
                className="flex-1 h-14 rounded-full bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/20 hover:bg-red-700"
              >
                Confirm
              </Button>
           </div>
        </DialogContent>
      </Dialog>
      {/* User Deletion Confirmation */}
      <Dialog open={showUserDeleteDialog} onOpenChange={setShowUserDeleteDialog}>
        <DialogContent className="max-w-md rounded-[40px] p-10 border-none shadow-2xl">
           <DialogHeader className="mb-6">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
                 <UserPlus className="w-8 h-8 opacity-50" />
              </div>
              <DialogTitle className="text-2xl font-black italic uppercase text-center">
                Terminate <span className="text-clay">Access</span>
              </DialogTitle>
              <DialogDescription className="text-center italic mt-2">
                The agent will be purged from the ecosystem. This action is irreversible.
              </DialogDescription>
           </DialogHeader>

           <div className="flex gap-4 mt-4">
              <Button 
                onClick={() => setShowUserDeleteDialog(false)}
                variant="outline" 
                className="flex-1 h-14 rounded-full font-black text-xs uppercase tracking-widest border-slate-200 dark:border-zinc-800"
              >
                Retain
              </Button>
              <Button 
                onClick={handleDeleteUser}
                className="flex-1 h-14 rounded-full bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/20 hover:bg-red-700"
              >
                Purge
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
