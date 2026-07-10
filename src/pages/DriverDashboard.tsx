import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDoc, 
  setDoc,
  orderBy,
  limit,
  increment
} from 'firebase/firestore';
import { Order, OrderStatus, DriverProfile, Restaurant, Earning } from '../types';
import { 
  Truck, 
  MapPin, 
  Navigation, 
  CheckCircle, 
  Clock, 
  DollarSign,
  PackageCheck,
  Smartphone,
  ChevronRight,
  User,
  History,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Eye,
  Info
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import DriverMap from '../components/DriverMap';

import { processReferralReward } from '../lib/referral';

type Tab = 'dashboard' | 'tasks' | 'earnings' | 'profile';

export default function DriverDashboard() {
  const { user, profile: userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [recentEarnings, setRecentEarnings] = useState<Earning[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Driver Profile
  useEffect(() => {
    if (!user || userProfile?.role !== 'driver') return;

    const unsub = onSnapshot(doc(db, 'drivers', user.uid), async (snap) => {
      if (snap.exists()) {
        setDriverProfile(snap.data() as DriverProfile);
      } else {
        // Create initial empty profile
        const initialProfile: DriverProfile = {
          userId: user.uid,
          vehicleInfo: { type: 'bike', model: 'Standard', plateNumber: 'TBD' },
          isOnline: false,
          totalEarnings: 0,
          rating: 5.0,
          completedOrders: 0
        };
        await setDoc(doc(db, 'drivers', user.uid), initialProfile);
        setDriverProfile(initialProfile);
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, [user, userProfile]);

  const [lastOrderCount, setLastOrderCount] = useState(0);

  // Listen for Orders
  useEffect(() => {
    if (!user || !driverProfile?.isOnline) {
      setAvailableOrders([]);
      setActiveOrder(null);
      setRestaurant(null);
      return;
    }

    const qAvailable = query(
      collection(db, 'orders'), 
      where('status', '==', 'ready'), 
      where('driverId', '==', null)
    );
    const unsubAvailable = onSnapshot(qAvailable, (s) => {
      const orders = s.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      if (orders.length > lastOrderCount) {
        toast.info("New task available! Check the Logistics tab.", {
          icon: <PackageCheck className="w-4 h-4 text-blue-400" />,
          duration: 10000
        });
        // Play sound if possible (omitted for now to avoid browser noise restrictions)
      }
      setAvailableOrders(orders);
      setLastOrderCount(orders.length);
    });

    const qActive = query(
      collection(db, 'orders'), 
      where('driverId', '==', user.uid), 
      where('status', 'in', ['accepted', 'delivery_started', 'picked_up', 'en_route'])
    );
    const unsubActive = onSnapshot(qActive, async (s) => {
      if (!s.empty) {
        const order = { id: s.docs[0].id, ...s.docs[0].data() } as Order;
        setActiveOrder(order);
        
        // Fetch restaurant details for map/info
        const restSnap = await getDoc(doc(db, 'restaurants', order.restaurantId));
        if (restSnap.exists()) setRestaurant({ id: restSnap.id, ...restSnap.data() } as Restaurant);
      } else {
        setActiveOrder(null);
        setRestaurant(null);
      }
    });

    return () => {
      unsubAvailable();
      unsubActive();
    };
  }, [user, driverProfile?.isOnline]);

  // Real-time location tracking
  useEffect(() => {
    if (!user || !driverProfile?.isOnline || !activeOrder) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const newLocation = { lat, lng };

        try {
          // Update driver's global position
          await updateDoc(doc(db, 'drivers', user.uid), {
            currentLocation: newLocation,
            updatedAt: new Date().toISOString()
          });

          // Update active order with driver's current position for customer tracking
          await updateDoc(doc(db, 'orders', activeOrder.id), {
            driverLocation: newLocation,
            updatedAt: new Date().toISOString()
          });
        } catch (err) {
          console.error("Failed to sync live coordinates:", err);
        }
      },
      (err) => console.error("Location tracking error:", err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, driverProfile?.isOnline, activeOrder?.id]);

  const toggleOnline = async () => {
    if (!user || !driverProfile) return;
    const newStatus = !driverProfile.isOnline;
    
    try {
      await updateDoc(doc(db, 'drivers', user.uid), { 
        isOnline: newStatus,
        lastStatusChange: new Date().toISOString()
      });
      
      if (!newStatus) {
        setActiveOrder(null);
        setAvailableOrders([]);
        setRestaurant(null);
      }
      
      toast.info(newStatus ? "You are now online and searching for orders" : "You are now offline");
    } catch (err) {
      toast.error('Connection leak. Failed to update status.');
    }
  };

  const acceptOrder = async (orderId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        driverId: user.uid, 
        status: 'accepted',
        updatedAt: new Date().toISOString()
      });
      toast.success('Mission accepted! Navigation started.');
      setActiveTab('dashboard');
    } catch (err) {
      toast.error('Could not accept order. It might have been taken.');
    }
  };

  const advanceOrder = async () => {
    if (!activeOrder) return;
    let nextStatus: OrderStatus = 'picked_up';
    let message = 'Order picked up. Heading to delivery.';

    if (activeOrder.status === 'picked_up') {
      nextStatus = 'en_route';
      message = 'Entering stealth mode. Delivering now.';
    } else if (activeOrder.status === 'en_route') {
      nextStatus = 'delivered';
      message = 'Delivery successful! Funds transferred.';
    } else if (['accepted', 'preparing', 'ready'].includes(activeOrder.status)) {
        nextStatus = 'picked_up';
        message = 'Confirmed pickup at restaurant.';
    }

    try {
      await updateDoc(doc(db, 'orders', activeOrder.id), { 
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });

      if (nextStatus === 'delivered') {
        const commission = 5.50;
        const totalTip = activeOrder.tip || 0;
        await updateDoc(doc(db, 'drivers', user!.uid), {
            totalEarnings: increment(commission + totalTip),
            completedOrders: increment(1)
        });

        // Trigger referral reward logic
        await processReferralReward(activeOrder.customerId);
      }

      toast.success(message);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (isLoading) return <div className="h-screen bg-zinc-950 flex items-center justify-center font-mono text-blue-400">SYNCING DRIVER RAIL...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Mobile-Friendly Header */}
      <header className="p-6 border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600" />
             </div>
             <div>
               <h1 className="text-xl font-serif font-black tracking-tighter">DRIVER <span className="text-blue-600">RAIL</span></h1>
               <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${driverProfile?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    {driverProfile?.isOnline ? 'Patrolling' : 'Docked'}
                  </span>
               </div>
             </div>
          </div>
          <button onClick={toggleOnline} className="focus:outline-none transition-transform active:scale-90">
             {driverProfile?.isOnline ? 
               <ToggleRight className="w-10 h-10 text-emerald-500" /> : 
               <ToggleLeft className="w-10 h-10 text-slate-300" />
             }
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dash"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Stats Summary */}
              {!activeOrder && (
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-white border border-slate-100 p-5 rounded-[32px] shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Today</p>
                    <p className="text-2xl font-serif font-black text-blue-600">${driverProfile?.totalEarnings.toFixed(2)}</p>
                  </Card>
                  <Card className="bg-white border border-slate-100 p-5 rounded-[32px] shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rating</p>
                    <div className="flex items-center gap-1">
                       <p className="text-2xl font-serif font-black text-slate-900">{driverProfile?.rating.toFixed(1)}</p>
                       <Badge className="bg-emerald-50 text-emerald-600 border-none text-[10px]">GOLD</Badge>
                    </div>
                  </Card>
                </div>
              )}

              {activeOrder ? (
                <section className="space-y-4">
                   <div className="h-[300px] w-full relative">
                      <DriverMap 
                        status={activeOrder.status as any}
                        destination={activeOrder.deliveryAddress}
                        restaurantLocation={restaurant?.address}
                        origin={driverProfile?.currentLocation || { lat: 34.0522, lng: -118.2437 }} // Default LA for demo
                      />
                      <div className="absolute top-4 left-4 right-4">
                         <Card className="p-4 bg-white/90 backdrop-blur-md border border-slate-100 rounded-2xl flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-3">
                               <Navigation className="w-5 h-5 text-blue-600 animate-pulse" />
                               <span className="text-xs font-black uppercase tracking-widest text-slate-900">Live Nav Active</span>
                            </div>
                            <Badge className="bg-blue-600 text-white border-none shrink-0">{activeOrder.status.replace('_', ' ')}</Badge>
                         </Card>
                      </div>
                   </div>

                   <Card className="bg-white border border-slate-100 rounded-[40px] p-6 space-y-6 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                         <Truck className="w-24 h-24 text-slate-900" />
                      </div>

                      <div className="flex justify-between items-start">
                         <div>
                            <h3 className="text-2xl font-serif font-black tracking-tighter text-slate-900">Mission #{activeOrder.id.slice(-4).toUpperCase()}</h3>
                            <p className="text-xs text-slate-400 font-mono italic">Courier Protocol v2.4</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Payout</p>
                            <p className="text-xl font-serif font-black text-blue-600">$8.50</p>
                         </div>
                      </div>

                      <div className="space-y-4 relative">
                        <div className="absolute left-[10px] top-6 bottom-6 w-[2px] bg-slate-100" />
                        
                        <div className="flex gap-4 items-start">
                           <div className={`w-5 h-5 rounded-full border-2 ${activeOrder.status === 'accepted' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'} shrink-0 z-10 flex items-center justify-center`}>
                              <div className="w-2 h-2 rounded-full bg-blue-600" />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pickup</p>
                              <p className="font-bold text-slate-900">{restaurant?.name || "Kitchen Terminal"}</p>
                              <p className="text-xs text-slate-500">{restaurant?.address}</p>
                           </div>
                        </div>

                        <div className="flex gap-4 items-start">
                           <div className={`w-5 h-5 rounded-full border-2 ${['picked_up', 'en_route'].includes(activeOrder.status) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'} shrink-0 z-10 flex items-center justify-center`}>
                              <div className="w-2 h-2 rounded-full bg-slate-400" />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destination</p>
                              <p className="font-bold text-slate-900">{activeOrder.deliveryAddress}</p>
                              <p className="text-xs text-slate-500 italic">"Leave at front door - code 1234"</p>
                           </div>
                        </div>
                      </div>

                      <Button onClick={advanceOrder} className="w-full h-16 rounded-[24px] bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-lg shadow-blue-200">
                         {activeOrder.status === 'accepted' && <><CheckCircle className="mr-2" /> CONFIRM PICKUP</>}
                         {activeOrder.status === 'picked_up' && <><Navigation className="mr-2" /> START DELIVERY</>}
                         {activeOrder.status === 'en_route' && <><Smartphone className="mr-2" /> DELIVERED</>}
                         {activeOrder.status === 'delivery_started' && <><CheckCircle className="mr-2" /> ARRIVED AT KITCHEN</>}
                      </Button>
                   </Card>
                </section>
              ) : (
                <div className="pt-20 text-center animate-in fade-in zoom-in duration-500">
                   <div className="w-24 h-24 rounded-[40px] bg-white border border-slate-100 shadow-sm mx-auto flex items-center justify-center mb-6">
                      <Smartphone className="w-10 h-10 text-slate-300" />
                   </div>
                   <h2 className="text-xl font-serif font-black italic text-slate-400 uppercase tracking-tighter">No Active Payload</h2>
                   <p className="text-slate-400 text-sm font-mono mt-2 uppercase tracking-tight">Toggle online to begin intercepting orders</p>
                   {driverProfile?.isOnline && (
                      <Button onClick={() => setActiveTab('tasks')} variant="link" className="mt-4 text-blue-600 font-black uppercase text-xs tracking-widest">
                         Browse Available Tasks <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                   )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div 
              key="tasks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                 <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">AVAILABLE LOGISTICS</h2>
                 <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50/50">{availableOrders.length} READY</Badge>
              </div>

              {availableOrders.map((order, i) => (
                <Card key={order.id} className="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col gap-4 overflow-hidden relative group shadow-sm hover:shadow-md transition-shadow">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center">
                            <PackageCheck className="w-5 h-5 text-blue-600" />
                         </div>
                         <div>
                            <p className="text-xs font-black uppercase text-slate-400">ID: {order.id.slice(-4).toUpperCase()}</p>
                            <p className="font-bold text-slate-900">6.2 mi away</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-sm font-serif font-black text-blue-600">$8.50</p>
                         <p className="text-[8px] font-black text-slate-400 uppercase">Est. Payout</p>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                         <MapPin className="w-3 h-3 text-slate-300" />
                         <span className="truncate">{order.deliveryAddress}</span>
                      </div>
                   </div>

                   <Button onClick={() => acceptOrder(order.id)} className="w-full h-12 rounded-2xl bg-slate-900 text-white hover:bg-blue-600 font-bold transition-all">
                      ACCEPT MISSION
                   </Button>
                </Card>
              ))}

              {availableOrders.length === 0 && (
                <div className="py-20 text-center space-y-4">
                   <div className="w-12 h-12 bg-slate-50 rounded-full mx-auto animate-pulse flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                   </div>
                   <p className="text-slate-400 font-mono text-[10px] uppercase tracking-widest italic">Signal clear. Watching the grid...</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
               key="profile"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="space-y-6"
            >
               <Card className="bg-white border border-slate-100 rounded-[40px] p-8 text-center shadow-sm">
                  <div className="w-24 h-24 rounded-full bg-blue-600 mx-auto mb-6 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                     <img src={user?.photoURL || ""} alt="" className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-2xl font-serif font-black text-slate-900">{userProfile?.name}</h2>
                  <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mt-1">ID: {user?.uid.slice(0, 8)}</p>
                  
                  <div className="grid grid-cols-3 gap-2 mt-8">
                     <div className="p-3 rounded-2xl bg-slate-50">
                        <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Total</p>
                        <p className="text-lg font-serif font-black text-slate-900">{driverProfile?.completedOrders}</p>
                     </div>
                     <div className="p-3 rounded-2xl bg-slate-50">
                        <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Rating</p>
                        <p className="text-lg font-serif font-black text-emerald-600">{driverProfile?.rating.toFixed(1)}</p>
                     </div>
                     <div className="p-3 rounded-2xl bg-slate-50">
                        <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Points</p>
                        <p className="text-lg font-serif font-black text-blue-600">1.2K</p>
                     </div>
                  </div>
               </Card>

               <Card className="bg-white border border-slate-100 rounded-[32px] p-6 space-y-4 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2">Vehicle Configuration</h3>
                  <div className="space-y-3">
                     <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                        <div className="flex items-center gap-3">
                           <Truck className="w-4 h-4 text-slate-400" />
                           <span className="text-sm font-medium text-slate-700">Model</span>
                        </div>
                        <span className="text-xs font-black uppercase text-blue-600">{driverProfile?.vehicleInfo.model}</span>
                     </div>
                     <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                        <div className="flex items-center gap-3">
                           <ShieldCheck className="w-4 h-4 text-slate-400" />
                           <span className="text-sm font-medium text-slate-700">Plate Number</span>
                        </div>
                        <span className="text-xs font-black uppercase text-blue-600">{driverProfile?.vehicleInfo.plateNumber}</span>
                     </div>
                  </div>
               </Card>
            </motion.div>
          )}

        </AnimatePresence>
        <div className="pt-8">
          <Button variant="ghost" className="w-full text-red-500 font-black tracking-widest text-[10px] uppercase">
             Deactivate Driver License
          </Button>
        </div>
      </main>

      {/* Driver Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none">
        <div className="max-w-lg mx-auto bg-white/90 backdrop-blur-2xl border border-slate-200 rounded-[32px] h-20 shadow-2xl flex items-center justify-around px-4 pointer-events-auto">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center w-16 transition-all ${activeTab === 'dashboard' ? 'text-blue-600 scale-110 font-black' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Smartphone className="w-6 h-6 mb-1" />
            <span className="text-[8px] uppercase tracking-tight">Main</span>
          </button>
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center justify-center w-16 transition-all ${activeTab === 'tasks' ? 'text-blue-600 scale-110 font-black' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <History className="w-6 h-6 mb-1" />
            <span className="text-[8px] uppercase tracking-tight">Tasks</span>
          </button>
          <button 
            onClick={() => setActiveTab('earnings')}
            className={`flex flex-col items-center justify-center w-16 transition-all ${activeTab === 'earnings' ? 'text-blue-600 scale-110 font-black' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <DollarSign className="w-6 h-6 mb-1" />
            <span className="text-[8px] uppercase tracking-tight">Wallet</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center w-16 transition-all ${activeTab === 'profile' ? 'text-blue-600 scale-110 font-black' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <User className="w-6 h-6 mb-1" />
            <span className="text-[8px] uppercase tracking-tight">Bio</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
