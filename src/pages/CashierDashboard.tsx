import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  orderBy, 
  increment 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Order, OrderStatus, Restaurant, MenuItem, Promotion, OrderItem } from '../types';
import { PromotionService } from '../services/promotionService';
import { 
  Calculator, 
  DollarSign, 
  CreditCard, 
  Wallet, 
  Layers, 
  ShoppingCart, 
  User, 
  Clock, 
  CheckCircle, 
  Receipt, 
  Printer, 
  RefreshCw, 
  X, 
  ChevronRight, 
  Play, 
  Utensils, 
  Tag, 
  Percent, 
  ArrowLeftRight, 
  Activity, 
  Calendar, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  Search,
  BadgeAlert,
  Archive,
  ArrowUpRight,
  TrendingUp,
  Building
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function CashierDashboard() {
  const { user, profile } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(null);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'pos' | 'history'>('orders');
  
  // Active orders tabs
  const [orderSubTab, setOrderSubTab] = useState<'pending' | 'kitchen' | 'completed'>('pending');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderSearch, setOrderSearch] = useState<string>('');

  // POS Cart State
  const [posCart, setPosCart] = useState<OrderItem[]>([]);
  const [posSearch, setPosSearch] = useState<string>('');
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [checkoutGuestName, setCheckoutGuestName] = useState<string>('');
  const [checkoutGuestPhone, setCheckoutGuestPhone] = useState<string>('');
  const [checkoutOrderType, setCheckoutOrderType] = useState<'takeout' | 'dine-in'>('takeout');
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash');
  const [checkoutPromoCode, setCheckoutPromoCode] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState<number>(0);
  const [customerProfile, setCustomerProfile] = useState<any | null>(null);
  const [customerEmailForLoyalty, setCustomerEmailForLoyalty] = useState<string>('');
  const [searchingCustomer, setSearchingCustomer] = useState<boolean>(false);

  // Cash Change Calculator
  const [cashTendered, setCashTendered] = useState<string>('');
  
  // Receipt State
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [printingReceipt, setPrintingReceipt] = useState<boolean>(false);

  // Shift & Cash Drawer
  const [shiftOpenedAt] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [openingBalance] = useState<number>(150.00);
  const [cashInDrawer, setCashInDrawer] = useState<number>(150.00);

  // Initial Fetch: Restaurants
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const snap = await getDocs(collection(db, 'restaurants'));
        const rests = snap.docs.map(d => ({ id: d.id, ...d.data() } as Restaurant));
        setRestaurants(rests);
        
        if (rests.length > 0) {
          // If profile has restaurantId, prefer it, otherwise pick first
          const defaultId = rests[0].id;
          setSelectedRestaurantId(defaultId);
          setCurrentRestaurant(rests[0]);
        }
      } catch (err) {
        console.error("Failed to load restaurants:", err);
        toast.error("Terminal initialization failed: restaurant directory unavailable");
      }
    };
    fetchRestaurants();
  }, []);

  // Update Current Restaurant Detail
  useEffect(() => {
    if (selectedRestaurantId) {
      const rest = restaurants.find(r => r.id === selectedRestaurantId);
      if (rest) setCurrentRestaurant(rest);
      setPosCart([]);
      setAppliedPromo(null);
      setCheckoutPromoCode('');
      setLoyaltyPointsToRedeem(0);
      setCustomerProfile(null);
      setCustomerEmailForLoyalty('');
    }
  }, [selectedRestaurantId, restaurants]);

  // Fetch Menu Items when selected Restaurant changes
  useEffect(() => {
    if (!selectedRestaurantId) return;

    const fetchMenu = async () => {
      try {
        const snap = await getDocs(collection(db, `restaurants/${selectedRestaurantId}/menu`));
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
        setMenuItems(items);
        
        // Extract categories
        const cats = ['All', ...Array.from(new Set(items.map(item => item.category)))];
        setCategories(cats);
        setActiveCategory('All');
      } catch (err) {
        console.error("Failed to load menu for POS:", err);
        toast.error("Could not synch POS menu database");
      }
    };

    fetchMenu();
  }, [selectedRestaurantId]);

  // Real-time Orders Snapshot Subscription
  useEffect(() => {
    if (!selectedRestaurantId) return;

    setLoadingOrders(true);
    const q = query(
      collection(db, 'orders'),
      where('restaurantId', '==', selectedRestaurantId),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      setOrders(ordersData);
      setLoadingOrders(false);

      // Refresh selected order reference to get real-time state updates in detail view
      if (selectedOrder) {
        const updated = ordersData.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    }, (err) => {
      console.error("Orders sync failed:", err);
      handleFirestoreError(err, OperationType.LIST, 'orders');
      setLoadingOrders(false);
    });

    return () => unsub();
  }, [selectedRestaurantId]);

  // Shift Cash Drawer Balances: recalculate when orders update
  useEffect(() => {
    // Sum all cash payments completed in this session (simplified as all cash orders today)
    const cashOrdersTotal = orders
      .filter(o => o.paymentStatus === 'paid' && o.discountAmount === undefined) // simple approximation of cashier transactions
      .reduce((sum, o) => sum + o.totalAmount, 0);
    
    // Set cash in drawer: opening balance + cash sales
    setCashInDrawer(openingBalance + cashOrdersTotal);
  }, [orders, openingBalance]);

  // Add Item to POS Cart
  const handleAddToPosCart = (item: MenuItem) => {
    setPosCart(prev => {
      const existingIdx = prev.findIndex(c => c.id === item.id);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1
        };
        toast.success(`Incremented: ${item.name}`);
        return updated;
      } else {
        toast.success(`Added: ${item.name}`);
        return [...prev, {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          customizations: []
        }];
      }
    });
  };

  // Adjust POS item qty
  const updatePosCartQuantity = (itemId: string, delta: number) => {
    setPosCart(prev => {
      return prev.map(c => {
        if (c.id === itemId) {
          const newQty = Math.max(1, c.quantity + delta);
          return { ...c, quantity: newQty };
        }
        return c;
      });
    });
  };

  // Remove from POS cart
  const handleRemoveFromPosCart = (itemId: string) => {
    setPosCart(prev => prev.filter(c => c.id !== itemId));
    toast.info("Item removed from terminal cart");
  };

  // Compute Cart Totals
  const posSubtotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const salesTax = posSubtotal * 0.08; // 8% sales tax

  // Promo Calculation
  const promoDiscount = appliedPromo ? PromotionService.calculateDiscount(posCart, appliedPromo, posSubtotal) : 0;
  
  // Loyalty redemption: 100 points = $1
  const loyaltyDiscount = (loyaltyPointsToRedeem / 100);
  const totalDiscount = promoDiscount + loyaltyDiscount;

  const posGrandTotal = Math.max(0, posSubtotal + salesTax - totalDiscount);

  // Search Customer for Loyalty Points & Referrals
  const handleLookupCustomer = async () => {
    if (!customerEmailForLoyalty) {
      toast.error("Please enter a customer email to query");
      return;
    }
    setSearchingCustomer(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', customerEmailForLoyalty.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
        setCustomerProfile(data);
        toast.success(`Customer verified: ${data.name} (${data.loyaltyPoints} PTS)`);
      } else {
        setCustomerProfile(null);
        toast.error("No registered profile matches this email");
      }
    } catch (err) {
      console.error("Customer lookup failed:", err);
      toast.error("Ecosystem client database request timed out");
    } finally {
      setSearchingCustomer(false);
    }
  };

  // Check Promo Code Validity
  const handleApplyPromo = async () => {
    if (!checkoutPromoCode) return;
    try {
      const activePromos = await PromotionService.getActivePromotions(selectedRestaurantId);
      const matched = activePromos.find(p => p.code?.toUpperCase() === checkoutPromoCode.toUpperCase());
      
      if (matched) {
        if (matched.minOrderValue && posSubtotal < matched.minOrderValue) {
          toast.error(`Minimum ticket value of $${matched.minOrderValue} required for this voucher`);
          return;
        }
        setAppliedPromo(matched);
        toast.success(`Promo code applied: ${matched.title}`);
      } else {
        toast.error("Promo code is invalid, expired or restaurant-specific");
      }
    } catch (err) {
      toast.error("Failed to query promotion records");
    }
  };

  // Process POS Checkout Submission
  const handlePOSCheckout = async () => {
    if (posCart.length === 0) {
      toast.error("POS register is empty");
      return;
    }

    try {
      const finalGuestName = checkoutGuestName.trim() || (customerProfile ? customerProfile.name : "Walk-in Guest");
      const finalGuestPhone = checkoutGuestPhone.trim() || (customerProfile ? customerProfile.phone : "");

      const orderData = {
        customerId: customerProfile ? customerProfile.id : `guest_${Date.now()}`,
        restaurantId: selectedRestaurantId,
        items: posCart,
        status: 'ready' as OrderStatus, // in-person order created as ready or preparing. Let's make it 'ready' so they serve instantly!
        subtotal: posSubtotal,
        discountAmount: totalDiscount,
        promotionId: appliedPromo?.id || null,
        loyaltyPointsUsed: loyaltyPointsToRedeem,
        totalAmount: posGrandTotal,
        paymentStatus: 'paid' as 'paid' | 'pending',
        deliveryAddress: checkoutOrderType === 'dine-in' ? 'Table Order' : 'Takeaway Terminal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customerName: finalGuestName,
        customerPhone: finalGuestPhone,
        paymentMethod: checkoutPaymentMethod,
        isPOS: true
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData).catch(err => {
        handleFirestoreError(err, OperationType.CREATE, 'orders');
        throw err;
      });

      // Update loyalty points if registered customer was verified
      if (customerProfile) {
        if (loyaltyPointsToRedeem > 0) {
          await PromotionService.redeemPoints(customerProfile.id, loyaltyPointsToRedeem);
        }
        // Award new points
        await PromotionService.awardLoyaltyPoints(customerProfile.id, posGrandTotal);
      }

      toast.success("Order processed & payment logged in database!");
      
      // Clean up POS states
      const completedOrderWithId = { id: orderRef.id, ...orderData } as Order;
      setPosCart([]);
      setAppliedPromo(null);
      setCheckoutPromoCode('');
      setLoyaltyPointsToRedeem(0);
      setCustomerProfile(null);
      setCustomerEmailForLoyalty('');
      setCheckoutGuestName('');
      setCheckoutGuestPhone('');
      setCashTendered('');
      setShowCheckoutModal(false);

      // Open receipt automatically
      setReceiptOrder(completedOrderWithId);
      setShowReceiptModal(true);
    } catch (err) {
      console.error("POS transaction failed:", err);
      toast.error("Terminal order entry failed. Check local state.");
    }
  };

  // Manual payment processor for existing pending orders
  const handleProcessExistingPayment = async (order: Order, method: 'cash' | 'card' | 'wallet') => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        paymentStatus: 'paid',
        paymentMethod: method,
        status: 'preparing' as OrderStatus, // Advance from pending to preparing once paid
        updatedAt: new Date().toISOString()
      }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
        throw err;
      });

      toast.success(`Payment logged via ${method.toUpperCase()}! Order advanced to Kitchen.`);
      
      // Update selected order details
      setSelectedOrder(prev => prev && prev.id === order.id ? { ...prev, paymentStatus: 'paid', status: 'preparing' } : prev);
      
      // Prompt printing receipt
      setReceiptOrder({ ...order, paymentStatus: 'paid', status: 'preparing' });
      setShowReceiptModal(true);
    } catch (err) {
      console.error("Failed to process payment:", err);
      toast.error("Payment confirmation failed");
    }
  };

  // Kitchen Advance Order status
  const handleAdvanceOrderStatus = async (orderId: string, currentStatus: OrderStatus) => {
    let nextStatus: OrderStatus = 'pending';
    if (currentStatus === 'pending') nextStatus = 'preparing';
    else if (currentStatus === 'preparing') nextStatus = 'ready';
    else if (currentStatus === 'ready') nextStatus = 'delivered'; // cashier completes and hands over

    if (nextStatus === 'pending') return;

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
        throw err;
      });

      toast.success(`Order advanced to: ${nextStatus.toUpperCase()}`);
    } catch (err) {
      console.error("Failed to advance order:", err);
      toast.error("Database failed to update order status");
    }
  };

  // Cancel order handler
  const handleCancelOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled' as OrderStatus,
        updatedAt: new Date().toISOString()
      }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
        throw err;
      });

      toast.error("Order marked as CANCELLED");
    } catch (err) {
      toast.error("Cancellation failed");
    }
  };

  // Simulated Thermal Receipt printing
  const handlePrintReceipt = () => {
    setPrintingReceipt(true);
    setTimeout(() => {
      setPrintingReceipt(false);
      toast.success("Receipt printed successfully!");
    }, 1500);
  };

  // Filter Active orders for the orders tab list
  const filteredOrders = orders.filter(o => {
    const term = orderSearch.toLowerCase();
    
    // search matches
    const idMatch = o.id.toLowerCase().includes(term);
    const guestMatch = (o as any).customerName?.toLowerCase().includes(term) || false;
    const addressMatch = o.deliveryAddress.toLowerCase().includes(term);
    const matchesSearch = idMatch || guestMatch || addressMatch;

    if (!matchesSearch) return false;

    // Sub tab sorting
    if (orderSubTab === 'pending') {
      return o.paymentStatus === 'pending' && o.status !== 'cancelled';
    } else if (orderSubTab === 'kitchen') {
      return o.paymentStatus === 'paid' && ['pending', 'preparing', 'ready', 'accepted'].includes(o.status);
    } else {
      return o.status === 'delivered' || o.status === 'cancelled';
    }
  });

  // Analytics for the day
  const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
  const grossSalesToday = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const transactionsCount = paidOrders.length;
  const avgBasketSize = transactionsCount > 0 ? (grossSalesToday / transactionsCount) : 0;

  // Payment methods chart calculation
  const cashSalesTotal = paidOrders.filter(o => (o as any).paymentMethod === 'cash' || o.deliveryAddress === 'Table Order' || o.deliveryAddress === 'Takeaway Terminal').reduce((sum, o) => sum + o.totalAmount, 0);
  const otherSalesTotal = Math.max(0, grossSalesToday - cashSalesTotal);
  const cashPercentage = grossSalesToday > 0 ? (cashSalesTotal / grossSalesToday) * 100 : 50;

  // POS menu filter
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(posSearch.toLowerCase()) || 
                          item.description.toLowerCase().includes(posSearch.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory && item.available;
  });

  // Calculate change due
  const calcChangeDue = () => {
    const tendered = parseFloat(cashTendered);
    if (isNaN(tendered) || tendered < posGrandTotal) return 0;
    return tendered - posGrandTotal;
  };

  return (
    <div className="bg-neutral-50 dark:bg-zinc-950 min-h-[calc(100vh-80px)] pb-12 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Terminal Header */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-xl shadow-slate-100 dark:shadow-none mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 dark:shadow-none">
                <Calculator className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-black tracking-tight uppercase flex items-center gap-2">
                  POS Cashier <span className="text-emerald-600 font-sans font-bold text-xs uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Live Terminal</span>
                </h1>
                <p className="text-xs text-neutral-500 font-mono mt-0.5 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> Terminal #104 • Shift Open Since {shiftOpenedAt} • Cashier: {profile?.name || "System Staff"}
                </p>
              </div>
            </div>

            {/* Restaurant Terminal Selector */}
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div className="flex items-center space-x-2 text-sm text-neutral-500 bg-neutral-100 dark:bg-zinc-800 py-1.5 px-3 rounded-xl border border-neutral-200/50">
                <Building className="w-4 h-4 text-neutral-400" />
                <span className="font-medium">Active Branch:</span>
              </div>
              <select
                className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all max-w-[240px]"
                value={selectedRestaurantId}
                onChange={(e) => setSelectedRestaurantId(e.target.value)}
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              {/* Mode Selector */}
              <div className="flex bg-neutral-100 dark:bg-zinc-800 rounded-xl p-1 border border-neutral-200/50">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    activeTab === 'orders' 
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-neutral-500 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> Orders
                </button>
                <button
                  onClick={() => setActiveTab('pos')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    activeTab === 'pos' 
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-neutral-500 hover:text-slate-900'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> POS Register
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    activeTab === 'history' 
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-neutral-500 hover:text-slate-900'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" /> Shift Audit
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* Tab 1: Orders Terminal */}
        {activeTab === 'orders' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left side: Orders list (col 5) */}
            <div className="col-span-1 lg:col-span-5 flex flex-col gap-4">
              
              {/* Order Search & Sub-tabs */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-slate-100 dark:border-zinc-800 shadow-xl shadow-slate-100/50 dark:shadow-none">
                <div className="relative mb-4">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                  <Input
                    className="pl-10 h-10 border-slate-200/80 rounded-xl"
                    placeholder="Search Order ID, Guest name..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 bg-neutral-100 dark:bg-zinc-800 rounded-xl p-1 text-center">
                  <button
                    onClick={() => { setOrderSubTab('pending'); setSelectedOrder(null); }}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      orderSubTab === 'pending'
                      ? 'bg-white dark:bg-zinc-700 text-slate-950 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-slate-900'
                    }`}
                  >
                    Unpaid
                  </button>
                  <button
                    onClick={() => { setOrderSubTab('kitchen'); setSelectedOrder(null); }}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      orderSubTab === 'kitchen'
                      ? 'bg-white dark:bg-zinc-700 text-slate-950 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-slate-900'
                    }`}
                  >
                    Kitchen
                  </button>
                  <button
                    onClick={() => { setOrderSubTab('completed'); setSelectedOrder(null); }}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      orderSubTab === 'completed'
                      ? 'bg-white dark:bg-zinc-700 text-slate-950 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-slate-900'
                    }`}
                  >
                    Archived
                  </button>
                </div>
              </div>

              {/* Real-time Order list cards */}
              <div className="space-y-3 overflow-y-auto max-h-[560px] pr-1">
                {loadingOrders ? (
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 text-center border font-mono text-xs uppercase text-neutral-400 tracking-wider">
                    Connecting to branch database...
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 text-center border text-neutral-400 italic text-sm">
                    No active orders found in this category
                  </div>
                ) : (
                  filteredOrders.map((o) => {
                    const isSelected = selectedOrder?.id === o.id;
                    const itemsCount = o.items.reduce((sum, item) => sum + item.quantity, 0);
                    const formattedDate = new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <motion.div
                        key={o.id}
                        layoutId={`order-card-${o.id}`}
                        onClick={() => setSelectedOrder(o)}
                        className={`p-4 rounded-2xl cursor-pointer border transition-all relative ${
                          isSelected
                          ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/10'
                          : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-zinc-700 shadow-xs'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono opacity-60 uppercase block">ORDER #{o.id.substring(0, 8)}</span>
                            <h4 className="text-sm font-extrabold mt-0.5">
                              {(o as any).customerName || "Walk-in Guest"}
                            </h4>
                          </div>
                          <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-slate-300' : 'text-neutral-400'}`}>
                            {formattedDate}
                          </span>
                        </div>

                        <div className="flex justify-between items-center mt-3.5 pt-3 border-t border-dashed border-neutral-100/10">
                          <span className="text-xs font-medium opacity-80">{itemsCount} items</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-black font-mono">${o.totalAmount.toFixed(2)}</span>
                            
                            {/* Payment Status Badge */}
                            {o.paymentStatus === 'paid' ? (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-extrabold">PAID</Badge>
                            ) : (
                              <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[9px] font-extrabold animate-pulse">UNPAID</Badge>
                            )}

                            {/* Status Badge */}
                            <Badge className={`text-[9px] font-bold uppercase ${
                              o.status === 'pending' ? 'bg-amber-500/15 text-amber-500' :
                              o.status === 'preparing' ? 'bg-blue-500/15 text-blue-500' :
                              o.status === 'ready' ? 'bg-indigo-500/15 text-indigo-500' :
                              o.status === 'delivered' ? 'bg-emerald-500/15 text-emerald-500' :
                              'bg-neutral-500/15 text-neutral-500'
                            }`}>
                              {o.status}
                            </Badge>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

            </div>

            {/* Right side: Selected order details (col 7) */}
            <div className="col-span-1 lg:col-span-7">
              <AnimatePresence mode="wait">
                {selectedOrder ? (
                  <motion.div
                    key={selectedOrder.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-xl shadow-slate-100/50 dark:shadow-none min-h-[500px] flex flex-col justify-between"
                  >
                    <div>
                      {/* Order Detail Header */}
                      <div className="flex justify-between items-start pb-5 border-b border-neutral-100 dark:border-zinc-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-neutral-400 font-bold">ORDER ID: {selectedOrder.id}</span>
                            <Badge variant="outline" className="text-[10px] h-5 capitalize">
                              {selectedOrder.deliveryAddress === 'Table Order' ? 'Dine-In' : selectedOrder.deliveryAddress === 'Takeaway Terminal' ? 'Takeout' : 'Delivery'}
                            </Badge>
                          </div>
                          <h2 className="text-xl font-serif font-black tracking-tight text-slate-900 dark:text-white mt-1">
                            {(selectedOrder as any).customerName || "Walk-In Guest"}
                          </h2>
                          {(selectedOrder as any).customerPhone && (
                            <p className="text-xs text-neutral-500 font-mono mt-0.5">{(selectedOrder as any).customerPhone}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-neutral-400 font-medium block">Ticket Time</span>
                          <span className="text-sm font-mono font-bold text-neutral-700 dark:text-neutral-300">
                            {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Items checklist */}
                      <div className="py-6">
                        <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">Cart Checklist</h3>
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                          {selectedOrder.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-zinc-800/40 rounded-xl border border-neutral-100 dark:border-zinc-800/80">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 flex items-center justify-center bg-slate-900 dark:bg-zinc-800 text-white dark:text-neutral-300 text-xs font-black rounded-lg">
                                  {item.quantity}x
                                </span>
                                <div>
                                  <h4 className="text-sm font-extrabold">{item.name}</h4>
                                  {item.customizations && item.customizations.length > 0 && (
                                    <div className="flex gap-1 mt-1">
                                      {item.customizations.map((c, i) => (
                                        <span key={i} className="text-[9px] text-neutral-500 font-mono">
                                          +{c}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm font-mono font-bold text-neutral-600 dark:text-neutral-400">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Receipt calculations */}
                      <div className="bg-neutral-50 dark:bg-zinc-800/20 p-4 rounded-2xl border border-neutral-100 dark:border-zinc-800/60 space-y-2 text-xs">
                        <div className="flex justify-between text-neutral-500">
                          <span>Subtotal</span>
                          <span className="font-mono">${selectedOrder.subtotal?.toFixed(2) || (selectedOrder.totalAmount * 0.9).toFixed(2)}</span>
                        </div>
                        {selectedOrder.discountAmount !== undefined && selectedOrder.discountAmount > 0 && (
                          <div className="flex justify-between text-rose-500">
                            <span>Vouchers & Loyalty Deductions</span>
                            <span className="font-mono">-${selectedOrder.discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {selectedOrder.tip !== undefined && selectedOrder.tip > 0 && (
                          <div className="flex justify-between text-neutral-500">
                            <span>Tips</span>
                            <span className="font-mono">+${selectedOrder.tip.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white pt-2 border-t border-dashed border-neutral-200 dark:border-zinc-800">
                          <span>Grand Total</span>
                          <span className="font-mono text-base">${selectedOrder.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>

                    </div>

                    {/* Action Footer */}
                    <div className="pt-6 border-t border-neutral-100 dark:border-zinc-800 mt-6">
                      <div className="flex flex-wrap gap-3 justify-end">
                        
                        {/* UNPAID Order payments confirmation */}
                        {selectedOrder.paymentStatus === 'pending' && (
                          <div className="w-full mb-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                            <div>
                              <p className="text-xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Awaiting Checkout Payment</p>
                              <p className="text-[11px] text-amber-600/90 dark:text-amber-500 mt-0.5">Collect and confirm cash/card from guest before serving.</p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleProcessExistingPayment(selectedOrder, 'cash')}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs h-9 rounded-xl flex items-center gap-1.5"
                              >
                                <DollarSign className="w-3.5 h-3.5" /> Cash
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleProcessExistingPayment(selectedOrder, 'card')}
                                className="bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 text-white font-extrabold text-xs h-9 rounded-xl flex items-center gap-1.5"
                              >
                                <CreditCard className="w-3.5 h-3.5" /> Card
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Print Receipt quick access */}
                        <Button
                          variant="outline"
                          onClick={() => { setReceiptOrder(selectedOrder); setShowReceiptModal(true); }}
                          className="font-bold h-11 px-5 rounded-2xl flex items-center gap-2"
                        >
                          <Receipt className="w-4 h-4 text-neutral-500" /> Receipt Preview
                        </Button>

                        {/* Order status modifiers */}
                        {selectedOrder.paymentStatus === 'paid' && selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                          <Button
                            onClick={() => handleAdvanceOrderStatus(selectedOrder.id, selectedOrder.status)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-11 px-6 rounded-2xl flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {selectedOrder.status === 'pending' ? "Accept & Cook" :
                             selectedOrder.status === 'preparing' ? "Mark as Ready" :
                             "Mark Hand-Over / Delivered"}
                          </Button>
                        )}

                        {/* Cancellation fallback */}
                        {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            onClick={() => handleCancelOrder(selectedOrder.id)}
                            className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-bold h-11 px-5 rounded-2xl"
                          >
                            <Trash2 className="w-4.5 h-4.5 mr-1" /> Void Order
                          </Button>
                        )}

                      </div>
                    </div>

                  </motion.div>
                ) : (
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-16 text-center border border-slate-100 dark:border-zinc-800/80 shadow-xs flex flex-col items-center justify-center min-h-[500px]">
                    <Utensils className="w-12 h-12 text-neutral-300 dark:text-zinc-700 mb-4 animate-bounce" />
                    <h3 className="text-base font-black uppercase text-slate-800 dark:text-neutral-200">No Terminal Selected</h3>
                    <p className="text-xs text-neutral-400 mt-1 max-w-[280px] leading-relaxed">
                      Select an active guest ticket from the unpaid queue or kitchen queue to begin processing.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>

          </div>
        )}

        {/* Tab 2: Point of Sale Mode */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left side: POS menu browser (col 7) */}
            <div className="col-span-1 lg:col-span-7 flex flex-col gap-6">
              
              {/* Category selector & search */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-slate-100 dark:border-zinc-800 shadow-xl shadow-slate-100/50 dark:shadow-none flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                  <Input
                    className="pl-10 h-10 border-slate-200/80 rounded-xl"
                    placeholder="Search dishes, burgers, drinks..."
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                  />
                </div>

                {/* Categories badges horizontally */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                        activeCategory === cat
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                        : 'bg-neutral-50 dark:bg-zinc-800 border-neutral-200/60 dark:border-zinc-700 text-neutral-500 hover:text-slate-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                {filteredMenuItems.length === 0 ? (
                  <div className="col-span-2 bg-white dark:bg-zinc-900 rounded-3xl p-12 text-center border text-neutral-400 italic">
                    No matching products in terminal database
                  </div>
                ) : (
                  filteredMenuItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleAddToPosCart(item)}
                      className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800/80 shadow-xs hover:shadow-lg dark:hover:bg-zinc-800/30 transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white mt-2 group-hover:text-blue-600 transition-colors">
                            {item.name}
                          </h4>
                          <p className="text-xs text-neutral-400 line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        </div>
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-xl object-cover border"
                          />
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-dashed border-neutral-100 dark:border-zinc-800">
                        <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                          ${item.price.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg">
                          <Plus className="w-3.5 h-3.5" /> Tap To Add
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* Right side: POS Current Draft Cart (col 5) */}
            <div className="col-span-1 lg:col-span-5">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-xl shadow-slate-100/50 dark:shadow-none min-h-[500px] flex flex-col justify-between">
                
                <div>
                  <div className="flex justify-between items-center pb-4 border-b">
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="w-5 h-5 text-neutral-400" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Current Cart</h3>
                    </div>
                    {posCart.length > 0 && (
                      <button
                        onClick={() => setPosCart([])}
                        className="text-xs text-rose-500 hover:underline font-bold"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Cart Item Listing */}
                  {posCart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-neutral-400 italic text-sm">
                      <ShoppingCart className="w-10 h-10 mb-2 opacity-30 animate-pulse" />
                      Tap items on menu to begin register
                    </div>
                  ) : (
                    <div className="space-y-3 py-4 max-h-[220px] overflow-y-auto pr-2">
                      {posCart.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-zinc-800/40 rounded-xl border border-neutral-100 dark:border-zinc-800/80">
                          <div>
                            <h4 className="text-xs font-extrabold">{item.name}</h4>
                            <span className="text-xs font-mono font-bold text-neutral-400">${item.price.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center bg-white dark:bg-zinc-800 border rounded-lg p-0.5">
                              <button
                                onClick={() => updatePosCartQuantity(item.id, -1)}
                                className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-zinc-700 rounded"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-xs font-mono font-black">{item.quantity}</span>
                              <button
                                onClick={() => updatePosCartQuantity(item.id, 1)}
                                className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-zinc-700 rounded"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <button
                              onClick={() => handleRemoveFromPosCart(item.id)}
                              className="text-rose-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subtotals & Checkout */}
                <div className="pt-4 border-t border-dashed">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-neutral-500">
                      <span>Subtotal</span>
                      <span className="font-mono font-medium">${posSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-500">
                      <span>Sales Tax (8%)</span>
                      <span className="font-mono font-medium">${salesTax.toFixed(2)}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-rose-500 font-bold">
                        <span>Discounts Deductions</span>
                        <span className="font-mono">-${totalDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white pt-2 border-t border-dashed">
                      <span>Grand Total</span>
                      <span className="font-mono text-base text-blue-600 dark:text-blue-400">${posGrandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      if (posCart.length === 0) {
                        toast.error("Cart is empty");
                        return;
                      }
                      setShowCheckoutModal(true);
                    }}
                    disabled={posCart.length === 0}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black h-12 rounded-2xl mt-5 shadow-lg shadow-slate-900/15"
                  >
                    Open Checkout Drawer
                  </Button>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Tab 3: Shift History & Audit */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            
            {/* Shift stats grids */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <Card className="rounded-3xl border shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black uppercase text-neutral-400 tracking-widest flex items-center justify-between">
                    Gross Register Sales <TrendingUp className="w-4.5 h-4.5 text-emerald-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-mono font-black">${grossSalesToday.toFixed(2)}</div>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Calculated from {transactionsCount} payments</p>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black uppercase text-neutral-400 tracking-widest flex items-center justify-between">
                    Cash in Drawer <DollarSign className="w-4.5 h-4.5 text-blue-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-mono font-black">${cashInDrawer.toFixed(2)}</div>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Opening Balance: ${openingBalance.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black uppercase text-neutral-400 tracking-widest flex items-center justify-between">
                    Total Transactions <CheckCircle className="w-4.5 h-4.5 text-indigo-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-mono font-black">{transactionsCount} Paid</div>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Shift start: {shiftOpenedAt}</p>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black uppercase text-neutral-400 tracking-widest flex items-center justify-between">
                    Average Basket <ShoppingCart className="w-4.5 h-4.5 text-amber-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-mono font-black">${avgBasketSize.toFixed(2)}</div>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Spend per walk-in guest</p>
                </CardContent>
              </Card>

            </div>

            {/* Audit breakdown: Left transactions, right cash audit charts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Live transactions feed (col 8) */}
              <div className="col-span-1 lg:col-span-8 bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-xl shadow-slate-100/50 dark:shadow-none">
                <div className="flex justify-between items-center pb-4 border-b">
                  <h3 className="text-sm font-black uppercase tracking-widest">Real-time Transaction Audit</h3>
                  <Badge variant="outline" className="text-[10px] h-5">Synced Live</Badge>
                </div>

                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b text-neutral-400 uppercase font-bold tracking-wider">
                        <th className="pb-3 font-medium">Order ID</th>
                        <th className="pb-3 font-medium">Guest / Client</th>
                        <th className="pb-3 font-medium">Order Type</th>
                        <th className="pb-3 font-medium">Payment Mode</th>
                        <th className="pb-3 font-medium text-right">Total Amount</th>
                        <th className="pb-3 font-medium text-center">Receipts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800">
                      {paidOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-neutral-400 italic">
                            No completed transactions registered in this shift yet.
                          </td>
                        </tr>
                      ) : (
                        paidOrders.map((o) => (
                          <tr key={o.id} className="hover:bg-neutral-50 dark:hover:bg-zinc-800/30 transition-all">
                            <td className="py-3.5 font-mono text-[11px] text-neutral-400">#{o.id.substring(0, 8).toUpperCase()}</td>
                            <td className="py-3.5 font-extrabold text-slate-800 dark:text-neutral-200">{(o as any).customerName || "Walk-In Guest"}</td>
                            <td className="py-3.5">
                              <Badge variant="outline" className="text-[9px] capitalize px-2 h-5">
                                {o.deliveryAddress === 'Table Order' ? 'Dine-In' : o.deliveryAddress === 'Takeaway Terminal' ? 'Takeout' : 'Delivery'}
                              </Badge>
                            </td>
                            <td className="py-3.5 capitalize">
                              <span className="inline-flex items-center gap-1.5 font-semibold">
                                {(o as any).paymentMethod === 'cash' || o.deliveryAddress === 'Table Order' || o.deliveryAddress === 'Takeaway Terminal' ? (
                                  <>
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Cash
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="w-3.5 h-3.5 text-blue-500" /> Card
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-3.5 text-right font-mono font-black text-slate-900 dark:text-white">${o.totalAmount.toFixed(2)}</td>
                            <td className="py-3.5 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setReceiptOrder(o); setShowReceiptModal(true); }}
                                className="h-8 w-8 p-0"
                              >
                                <Printer className="w-4 h-4 text-neutral-400 hover:text-slate-900" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cash vs Card Split (col 4) */}
              <div className="col-span-1 lg:col-span-4 bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-xl shadow-slate-100/50 dark:shadow-none flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest pb-4 border-b">Ecosystem Stats</h3>
                  
                  {/* CSS Bars for cash vs card split */}
                  <div className="space-y-6 pt-6">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Cash Sales</span>
                        <span className="font-mono">{cashPercentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-neutral-100 dark:bg-zinc-800 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${cashPercentage}%` }}></div>
                      </div>
                      <p className="text-[10px] text-neutral-400 font-mono mt-1">${cashSalesTotal.toFixed(2)} tender in drawer</p>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-blue-500" /> Card / Wallet</span>
                        <span className="font-mono">{(100 - cashPercentage).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-neutral-100 dark:bg-zinc-800 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${100 - cashPercentage}%` }}></div>
                      </div>
                      <p className="text-[10px] text-neutral-400 font-mono mt-1">${otherSalesTotal.toFixed(2)} processed online</p>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-zinc-800/20 p-4 rounded-2xl border border-neutral-100 dark:border-zinc-800/80 mt-6 text-xs text-neutral-500 text-center leading-relaxed">
                  Drawer reconciliations take place automatically when closing shift terminals. Report any discrepancies immediately.
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* POS Checkout Dialog Drawer */}
      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="rounded-3xl max-w-lg p-6 bg-white dark:bg-zinc-900 border border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-black uppercase tracking-tight text-slate-900 dark:text-white">POS Cashier Checkout</DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">Complete walk-in guest detail collection and process tender.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm text-slate-700 dark:text-neutral-200">
            
            {/* Loyalty Lookup / Verify */}
            <div className="p-4 bg-neutral-50 dark:bg-zinc-800/30 rounded-2xl border border-neutral-100 dark:border-zinc-800 space-y-3">
              <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">Client Registry (Loyalty Points & Referral Checks)</span>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter client email..."
                  value={customerEmailForLoyalty}
                  onChange={(e) => setCustomerEmailForLoyalty(e.target.value)}
                  className="bg-white"
                />
                <Button
                  onClick={handleLookupCustomer}
                  disabled={searchingCustomer}
                  className="bg-slate-900 text-white hover:bg-slate-800 font-extrabold text-xs px-4"
                >
                  {searchingCustomer ? "Verifying..." : "Verify Client"}
                </Button>
              </div>

              {customerProfile ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black block text-emerald-800 dark:text-emerald-400">{customerProfile.name}</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-mono">Loyalty Wallet: {customerProfile.loyaltyPoints} Points</span>
                  </div>
                  {customerProfile.loyaltyPoints >= 100 && (
                    <div className="flex items-center space-x-2">
                      <select
                        className="bg-white border rounded p-1 text-xs font-bold"
                        value={loyaltyPointsToRedeem}
                        onChange={(e) => setLoyaltyPointsToRedeem(Number(e.target.value))}
                      >
                        <option value={0}>Redeem (0)</option>
                        {customerProfile.loyaltyPoints >= 100 && <option value={100}>Redeem 100 (-$1)</option>}
                        {customerProfile.loyaltyPoints >= 200 && <option value={200}>Redeem 200 (-$2)</option>}
                        {customerProfile.loyaltyPoints >= 500 && <option value={500}>Redeem 500 (-$5)</option>}
                        {customerProfile.loyaltyPoints >= 1000 && <option value={1000}>Redeem 1000 (-$10)</option>}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] font-bold text-neutral-400 uppercase">Guest Name</Label>
                      <Input
                        placeholder="Guest name..."
                        value={checkoutGuestName}
                        onChange={(e) => setCheckoutGuestName(e.target.value)}
                        className="bg-white mt-1 h-9 rounded-lg"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-neutral-400 uppercase">Phone</Label>
                      <Input
                        placeholder="Phone..."
                        value={checkoutGuestPhone}
                        onChange={(e) => setCheckoutGuestPhone(e.target.value)}
                        className="bg-white mt-1 h-9 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Voucher input */}
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase">Voucher Promo Code</Label>
                <Input
                  placeholder="COUPON50, FIRSTDINE..."
                  value={checkoutPromoCode}
                  onChange={(e) => setCheckoutPromoCode(e.target.value)}
                  className="bg-white mt-1 h-9 rounded-lg"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleApplyPromo}
                className="font-bold h-9 rounded-lg"
              >
                Apply
              </Button>
            </div>

            {/* Order Type & Payment Method */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <Label className="text-[10px] font-bold text-neutral-400 uppercase">Order Type</Label>
                <div className="grid grid-cols-2 bg-neutral-100 rounded-lg p-1 mt-1 text-center font-bold text-xs">
                  <button
                    onClick={() => setCheckoutOrderType('takeout')}
                    className={`py-1.5 rounded-md ${checkoutOrderType === 'takeout' ? 'bg-white shadow-xs text-slate-900' : 'text-neutral-500'}`}
                  >
                    Takeout
                  </button>
                  <button
                    onClick={() => setCheckoutOrderType('dine-in')}
                    className={`py-1.5 rounded-md ${checkoutOrderType === 'dine-in' ? 'bg-white shadow-xs text-slate-900' : 'text-neutral-500'}`}
                  >
                    Dine-In
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-[10px] font-bold text-neutral-400 uppercase">Tender Method</Label>
                <div className="grid grid-cols-3 bg-neutral-100 rounded-lg p-1 mt-1 text-center font-bold text-[10px]">
                  <button
                    onClick={() => { setCheckoutPaymentMethod('cash'); setCashTendered(''); }}
                    className={`py-1.5 rounded-md ${checkoutPaymentMethod === 'cash' ? 'bg-white shadow-xs text-slate-900' : 'text-neutral-500'}`}
                  >
                    Cash
                  </button>
                  <button
                    onClick={() => setCheckoutPaymentMethod('card')}
                    className={`py-1.5 rounded-md ${checkoutPaymentMethod === 'card' ? 'bg-white shadow-xs text-slate-900' : 'text-neutral-500'}`}
                  >
                    Card
                  </button>
                  <button
                    onClick={() => setCheckoutPaymentMethod('wallet')}
                    className={`py-1.5 rounded-md ${checkoutPaymentMethod === 'wallet' ? 'bg-white shadow-xs text-slate-900' : 'text-neutral-500'}`}
                  >
                    Wallet
                  </button>
                </div>
              </div>
            </div>

            {/* Cash Calculator / Change drawer */}
            {checkoutPaymentMethod === 'cash' && (
              <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 space-y-3 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5 text-emerald-400" /> Cash Till Change Calculator
                  </span>
                  <span className="text-xs text-neutral-400">Due: <span className="font-mono text-white font-black">${posGrandTotal.toFixed(2)}</span></span>
                </div>
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-6 relative">
                    <span className="absolute left-3.5 top-2.5 font-bold text-sm text-slate-400">$</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="bg-slate-850 border-slate-700 text-white pl-7 h-10 font-mono font-bold"
                    />
                  </div>
                  <div className="col-span-6 text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Change Due</span>
                    <span className="text-lg font-mono font-black text-emerald-400">
                      ${calcChangeDue().toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Preset shortcuts */}
                <div className="grid grid-cols-5 gap-1 pt-1.5">
                  {[5, 10, 20, 50, 100].map(val => (
                    <button
                      key={val}
                      onClick={() => setCashTendered(String(val))}
                      className="bg-slate-800 hover:bg-slate-750 text-white font-mono font-bold text-xs py-1.5 rounded-lg border border-slate-700 transition-all"
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Ticket */}
            <div className="p-3 bg-neutral-50 rounded-xl border flex justify-between text-xs font-bold pt-3 mt-3">
              <span>Final Charge Amount</span>
              <span className="font-mono text-slate-900 text-sm">${posGrandTotal.toFixed(2)}</span>
            </div>

          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCheckoutModal(false)}
              className="font-bold h-11 px-5 rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePOSCheckout}
              className="bg-slate-950 text-white hover:bg-slate-850 font-black h-11 px-6 rounded-2xl flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Log Sale & Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retro Thermal Receipt Dialog Preview */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="rounded-3xl max-w-sm p-6 bg-white dark:bg-zinc-900 border border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-center font-serif font-black uppercase text-lg tracking-tight">Ecosystem Receipt</DialogTitle>
          </DialogHeader>

          {receiptOrder && (
            <div className="space-y-4 font-mono text-xs text-slate-800 dark:text-neutral-300">
              
              {/* Thermal receipt simulation paper container */}
              <div className="p-5 bg-neutral-50 dark:bg-zinc-800/50 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-zinc-700 space-y-4">
                
                {/* Store brand */}
                <div className="text-center space-y-1">
                  <h3 className="font-black text-sm uppercase tracking-wide">{currentRestaurant?.name || "GastroFast Terminal"}</h3>
                  <p className="text-[10px] text-neutral-400">{currentRestaurant?.address || "Registered branch outlet"}</p>
                  <p className="text-[9px] text-neutral-400 font-mono">TEL: {currentRestaurant?.phone || "+1 (555) 902-1244"}</p>
                </div>

                <div className="border-t border-dashed border-neutral-300 dark:border-zinc-700 pt-3 space-y-1 text-[10px] text-neutral-500">
                  <div className="flex justify-between">
                    <span>DATE & TIME</span>
                    <span>{new Date(receiptOrder.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TICKET ID</span>
                    <span className="uppercase">{receiptOrder.id.substring(0, 12)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CASHIER</span>
                    <span>Terminal #104</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CUSTOMER</span>
                    <span>{(receiptOrder as any).customerName || "Walk-In Guest"}</span>
                  </div>
                </div>

                {/* Items details breakdown */}
                <div className="border-t border-dashed border-neutral-300 dark:border-zinc-700 pt-3 space-y-2">
                  <div className="flex justify-between text-[9px] text-neutral-400 font-bold">
                    <span>QTY / ITEM</span>
                    <span>PRICE</span>
                  </div>
                  {receiptOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between font-medium">
                      <span>{item.quantity}x {item.name}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-dashed border-neutral-300 dark:border-zinc-700 pt-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span>SUBTOTAL</span>
                    <span>${receiptOrder.subtotal?.toFixed(2) || (receiptOrder.totalAmount * 0.9).toFixed(2)}</span>
                  </div>
                  {receiptOrder.discountAmount !== undefined && receiptOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-rose-500">
                      <span>DISCOUNT</span>
                      <span>-${receiptOrder.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {receiptOrder.tip !== undefined && receiptOrder.tip > 0 && (
                    <div className="flex justify-between">
                      <span>TIP</span>
                      <span>+${receiptOrder.tip.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white pt-2 border-t border-dashed border-neutral-300">
                    <span>GRAND TOTAL</span>
                    <span>${receiptOrder.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Footer terms */}
                <div className="text-center pt-3 text-[9px] text-neutral-400 border-t border-dashed border-neutral-300 space-y-1">
                  <p className="font-extrabold uppercase">Thank You for Your Visit!</p>
                  <p>Order processed via GastroFast Multi-Branch Platform. Secure transaction archived.</p>
                </div>

              </div>

            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReceiptModal(false)}
              className="font-bold h-11 px-5 rounded-2xl w-full"
            >
              Close Receipt Drawer
            </Button>
            <Button
              onClick={handlePrintReceipt}
              disabled={printingReceipt}
              className="bg-slate-950 text-white hover:bg-slate-850 font-black h-11 px-6 rounded-2xl flex items-center justify-center gap-1.5 w-full"
            >
              {printingReceipt ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Printing...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" /> Print Thermal Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
