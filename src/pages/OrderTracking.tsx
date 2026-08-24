import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  orderBy,
  increment,
} from "firebase/firestore";
import { Order, OrderStatus, Restaurant, Promotion, OrderItem } from "../types";
import {
  Package,
  ChefHat,
  Truck,
  Home,
  MapPin,
  Clock,
  Star,
  CheckCircle2,
  Calendar,
  CreditCard,
  ChevronRight,
  Receipt,
  Tag,
  Gift,
  Coins,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { PromotionService } from "../services/promotionService";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { APIProvider } from "@vis.gl/react-google-maps";
import AddressAutocomplete from "../components/AddressAutocomplete";

const MAPS_API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";

const OrderItemDetails = ({ items }: { items: OrderItem[] }) => (
  <div className="mt-4 space-y-3">
    <p className="text-[10px] uppercase font-black text-neutral-400 tracking-widest">
      Order Summary
    </p>
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div
          key={`${item.id}-${idx}`}
          className="flex justify-between items-start gap-4 p-3 bg-neutral-50 dark:bg-zinc-800/50 rounded-2xl border border-neutral-100 dark:border-zinc-800"
        >
          <div className="flex-grow">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center bg-clay/10 text-clay text-[10px] font-black rounded-lg">
                {item.quantity}x
              </span>
              <h4 className="text-sm font-bold">{item.name}</h4>
            </div>
            {item.customizations && item.customizations.length > 0 && (
              <div className="ml-7 mt-1.5 flex flex-wrap gap-1.5">
                {item.customizations.map((c, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-[9px] h-5 bg-white dark:bg-zinc-900 border-neutral-200 dark:border-zinc-700 text-neutral-500 font-medium px-2"
                  >
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <span className="text-sm font-black text-neutral-600 dark:text-neutral-400">
            ${(item.price * item.quantity).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default function OrderTracking() {
  const { user, profile } = useAuth();
  const {
    items,
    total,
    restaurantId,
    clearCart,
    pointsToEarn,
    pointsToRedeem,
    setPointsToRedeem,
    loyaltyDiscount,
  } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tip, setTip] = useState<number>(2); // Default $2 tip
  const [orderAddress, setOrderAddress] = useState<string>("");

  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const discountAmount = promoDiscount + loyaltyDiscount;

  useEffect(() => {
    if (profile?.address) {
      setOrderAddress(profile.address);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    // Listen for customer's orders
    const q = query(
      collection(db, "orders"),
      where("customerId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(
      q,
      (s) => {
        const ordersData = s.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Order,
        );
        setOrders(ordersData);

        const active = ordersData.find(
          (o) => o.status !== "delivered" && o.status !== "cancelled",
        );
        setActiveOrder(active || null);

        if (active) {
          getDoc(doc(db, "restaurants", active.restaurantId))
            .then((d) => {
              if (d.exists())
                setRestaurant({ id: d.id, ...d.data() } as Restaurant);
            })
            .catch((err) =>
              handleFirestoreError(
                err,
                OperationType.GET,
                `restaurants/${active.restaurantId}`,
              ),
            );
        }
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "orders");
      },
    );

    return () => unsub();
  }, [user]);

  const placeOrder = async () => {
    if (!user || !restaurantId || items.length === 0) return;
    if (!orderAddress || orderAddress.length < 5) {
      toast.error("Please provide a valid delivery address");
      return;
    }
    try {
      const finalTotal = Math.max(0, total + 2.5 + tip - discountAmount);

      const orderData = {
        customerId: user.uid,
        restaurantId,
        items,
        status: "pending" as OrderStatus,
        subtotal: total,
        discountAmount,
        promotionId: appliedPromo?.id || null,
        loyaltyPointsUsed: pointsToRedeem,
        totalAmount: finalTotal,
        tip,
        paymentStatus: "paid", // Simulate success for now
        deliveryAddress: orderAddress,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "orders"), orderData).catch((err) => {
        handleFirestoreError(err, OperationType.CREATE, "orders");
        throw err;
      });

      // Award points for the cash paid part
      await PromotionService.awardLoyaltyPoints(user.uid, finalTotal);

      // If points were used, subtract them
      if (pointsToRedeem > 0) {
        await updateDoc(doc(db, "users", user.uid), {
          loyaltyPoints: increment(-pointsToRedeem),
        });
      }

      clearCart();
      toast.success("System processed. Order established.");
    } catch (err) {
      toast.error("Failed to place order");
    }
  };

  const applyPromo = async () => {
    try {
      const allPromos = await PromotionService.getActivePromotions(
        restaurantId || undefined,
      );
      const promo = allPromos.find(
        (p) => p.code?.toUpperCase() === promoCode.toUpperCase(),
      );

      if (!promo) {
        toast.error("Promotion code rejected or expired");
        return;
      }

      const discount = PromotionService.calculateDiscount(items, promo, total);
      if (discount === 0) {
        toast.error("Requirements not met for this offer");
        return;
      }

      setAppliedPromo(promo);
      setPromoDiscount(discount);
      toast.success(`${promo.title} applied! Saved $${discount}`);
    } catch (err) {
      toast.error("Security check failed for promotion");
    }
  };

  const handleLoyaltyRedeem = () => {
    if (!profile?.loyaltyPoints) return;
    const maxRedeemable = Math.min(
      profile.loyaltyPoints,
      Math.floor((total + 2.5 + tip - promoDiscount) * 100),
    );

    if (maxRedeemable <= 0) {
      toast.error("No points to redeem or cart is already free");
      return;
    }

    setPointsToRedeem(maxRedeemable);
    toast.success(
      `Redeemed ${maxRedeemable} points for $${(maxRedeemable / 100).toFixed(2)} discount`,
    );
  };

  const statusSteps = [
    { id: "pending", label: "Order Received", icon: Receipt },
    { id: "preparing", label: "Preparing", icon: ChefHat },
    { id: "ready", label: "Ready", icon: Package },
    { id: "delivery_started", label: "Out for Delivery", icon: Truck },
    { id: "delivered", label: "Delivered", icon: Home },
  ];

  const getCurrentStepIndex = (status: string) => {
    return statusSteps.findIndex((s) => s.id === status);
  };

  const addTipAfterDelivery = async (
    orderId: string,
    amount: number,
    driverId?: string,
  ) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        tip: amount,
        totalAmount: increment(amount),
        updatedAt: new Date().toISOString(),
      });

      if (driverId) {
        await updateDoc(doc(db, "drivers", driverId), {
          totalEarnings: increment(amount),
        });
      }

      toast.success(`Tip of $${amount} added! Thank you.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  if (loading)
    return <div className="p-20 text-center">Locating your orders...</div>;

  return (
    <div className="bg-neutral-50 dark:bg-zinc-950 min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* If cart has items and no active order, show simplified checkout */}
        {items.length > 0 && !activeOrder && (
          <APIProvider apiKey={MAPS_API_KEY} version="weekly">
            <section className="mb-12">
              <h1 className="title-massive mb-8">
                Completing <br />
                <span className="text-clay italic">Transaction</span>
              </h1>
              <Card className="rounded-[40px] border-none shadow-2xl bg-white dark:bg-zinc-900 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-6">
                      Delivery Details
                    </h2>
                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">
                          Delivery Address
                        </p>
                        <AddressAutocomplete
                          onAddressSelect={(address) =>
                            setOrderAddress(address)
                          }
                          defaultValue={orderAddress}
                        />
                      </div>
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-3xl flex items-center gap-4">
                        <Clock className="text-blue-500 w-6 h-6" />
                        <div>
                          <p className="text-xs font-bold text-neutral-400">
                            Time
                          </p>
                          <p className="font-bold">ASAP (Approx 35 mins)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-6">
                      Promotions & Loyalty
                    </h2>
                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">
                          Promo Code
                        </p>
                        <div className="flex gap-2">
                          <Input
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            className="h-12 rounded-2xl bg-neutral-50 dark:bg-zinc-800 border-none font-mono"
                            placeholder="SUMMER50..."
                          />
                          <Button
                            onClick={applyPromo}
                            className="h-12 px-6 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black font-black text-[10px] uppercase"
                          >
                            Verify
                          </Button>
                        </div>
                      </div>

                      {profile?.loyaltyPoints &&
                        profile.loyaltyPoints > 0 &&
                        pointsToRedeem === 0 && (
                          <button
                            onClick={handleLoyaltyRedeem}
                            className="w-full p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-900 flex items-center justify-between group hover:bg-blue-100 transition-all"
                          >
                            <div className="flex items-center gap-4 text-left">
                              <Coins className="w-6 h-6 text-blue-500" />
                              <div>
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                  Loyalty Vault
                                </p>
                                <p className="font-bold text-sm">
                                  Redeem {profile.loyaltyPoints} points for $
                                  {(profile.loyaltyPoints / 100).toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-blue-300 group-hover:translate-x-1 transition-transform" />
                          </button>
                        )}

                      {pointsToRedeem > 0 && (
                        <div className="w-full p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-900 flex items-center justify-between">
                          <div className="flex items-center gap-4 text-left">
                            <Coins className="w-6 h-6 text-blue-500" />
                            <div>
                              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                Loyalty Vault Applied
                              </p>
                              <p className="font-bold text-sm">
                                Redeemed {pointsToRedeem} points for $
                                {(pointsToRedeem / 100).toFixed(2)} off
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            onClick={() => setPointsToRedeem(0)}
                            className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 rounded-lg px-3"
                          >
                            Remove
                          </Button>
                        </div>
                      )}

                      {discountAmount > 0 && (
                        <div className="flex items-center gap-3 p-4 bg-clay/10 rounded-2xl border border-clay/20">
                          <Tag className="w-4 h-4 text-clay" />
                          <p className="text-xs font-black text-clay uppercase">
                            Total Discount: -${discountAmount.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>

                    <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-6 mt-10">
                      Payment
                    </h2>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-zinc-950 text-white p-4 rounded-3xl">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-neutral-400" />
                          <span className="font-bold">**** 4242</span>
                        </div>
                        <span className="text-[10px] font-black opacity-50 bg-white/10 px-2 py-1 rounded-md uppercase">
                          STRIPE
                        </span>
                      </div>
                      <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <div className="mb-6">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                            Add a Tip for Driver
                          </p>
                          <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 5, 10].map((amount) => (
                              <Button
                                key={amount}
                                variant={tip === amount ? "default" : "outline"}
                                onClick={() => setTip(amount)}
                                className={`rounded-2xl h-12 font-black ${tip === amount ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" : "border-slate-100 hover:bg-slate-50 text-slate-600"}`}
                              >
                                ${amount}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold text-neutral-400 mb-2">
                          <span>SUBTOTAL</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold text-neutral-400 mb-2">
                          <span>DELIVERY</span>
                          <span>$2.50</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between items-center text-sm font-bold text-clay mb-2 italic">
                            <span>COUPON/OFFER</span>
                            <span>-${discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-2xl font-black mb-6">
                          <span>TOTAL</span>
                          <span className="text-clay">
                            $
                            {Math.max(
                              0,
                              total + 2.5 + tip - discountAmount,
                            ).toFixed(2)}
                          </span>
                        </div>
                        {pointsToEarn > 0 && (
                          <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/10 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/30 text-xs text-blue-600 dark:text-blue-300 mb-6">
                            <span className="flex items-center gap-1.5 font-bold">
                              <Coins className="w-4 h-4 text-blue-500 animate-pulse" />
                              Loyalty Points Earning:
                            </span>
                            <span className="font-mono font-black">+{pointsToEarn} PTS</span>
                          </div>
                        )}
                        <Button
                          onClick={placeOrder}
                          className="w-full h-14 rounded-full bg-clay text-white font-black text-lg shadow-xl shadow-clay/20"
                        >
                          CONFIRM & PAY
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </section>
          </APIProvider>
        )}

        {/* Active Order Tracking */}
        {activeOrder ? (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-8">
              <h1 className="title-massive">
                LIVE <br />
                <span className="text-clay italic">TRACKING</span>
              </h1>
              <div className="text-right pb-4">
                <Badge className="bg-clay/10 text-clay border-none font-black uppercase mb-1">
                  In Progress
                </Badge>
                <p className="text-xs font-mono text-neutral-400 italic">
                  Expected arrival:{" "}
                  {format(new Date(activeOrder.updatedAt), "hh:mm a")}
                </p>
              </div>
            </div>

            <Card className="rounded-[40px] border-none shadow-2xl bg-white dark:bg-zinc-900 p-8 overflow-hidden">
              {/* Progress Bar */}
              <div className="relative flex justify-between mb-12">
                <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-neutral-100 dark:bg-neutral-800 -translate-y-1/2 z-0" />
                <div
                  className="absolute top-1/2 left-0 h-[2px] bg-clay -translate-y-1/2 z-0 transition-all duration-1000"
                  style={{
                    width: `${(getCurrentStepIndex(activeOrder.status) / (statusSteps.length - 1)) * 100}%`,
                  }}
                />
                {statusSteps.map((step, i) => {
                  const isCompleted =
                    i <= getCurrentStepIndex(activeOrder.status);
                  const isCurrent =
                    i === getCurrentStepIndex(activeOrder.status);
                  const StepIcon = step.icon;
                  return (
                    <div
                      key={step.id}
                      className="relative z-10 flex flex-col items-center group"
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg ${
                          isCurrent
                            ? "bg-clay text-white scale-110"
                            : isCompleted
                              ? "bg-clay/20 text-clay"
                              : "bg-neutral-50 dark:bg-neutral-800 text-neutral-300"
                        }`}
                      >
                        <StepIcon className="w-6 h-6" />
                      </div>
                      <p
                        className={`text-[10px] uppercase tracking-widest font-black mt-4 ${isCompleted ? "text-clay" : "text-neutral-400"}`}
                      >
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-neutral-100 dark:border-neutral-800 pt-8">
                <div className="flex gap-6 items-center">
                  <div className="w-20 h-20 rounded-3xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0">
                    <img
                      src={
                        restaurant?.logo ||
                        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"
                      }
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black text-neutral-400 tracking-widest mb-1">
                      From Kitchen
                    </p>
                    <h3 className="text-xl font-bold">{restaurant?.name}</h3>
                    <p className="text-sm text-neutral-500 italic">
                      {restaurant?.address}
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 items-center justify-end">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black text-neutral-400 tracking-widest mb-1">
                      Your Courier
                    </p>
                    <h3 className="text-xl font-bold">
                      {activeOrder.driverId
                        ? "Marcus Delivery"
                        : "Waiting for Pilot..."}
                    </h3>
                    <div className="flex items-center justify-end text-sm text-blue-500 italic">
                      <Star className="w-3 h-3 fill-blue-500 mr-1" /> 4.9 Rating
                    </div>
                  </div>
                  <div className="w-20 h-20 rounded-full glass p-1 shadow-2xl">
                    <div className="w-full h-full bg-blue-500 rounded-full flex items-center justify-center text-white font-black text-2xl">
                      M
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-neutral-100 dark:border-neutral-800">
                <OrderItemDetails items={activeOrder.items} />
              </div>
            </Card>
          </section>
        ) : (
          !items.length && (
            <div className="text-center py-20 bg-neutral-100 dark:bg-zinc-900 rounded-[40px] border border-dashed mb-12">
              <Package className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500 font-medium italic">
                No active orders. Hungry?
              </p>
              <Button
                variant="link"
                className="text-clay font-bold mt-2"
                onClick={() => navigate("/")}
              >
                Browse Menus <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </div>
          )
        )}

        {/* Previous Orders */}
        <section>
          <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-6">
            Archive
          </h2>
          <div className="space-y-4">
            {orders
              .filter(
                (o) => o.status === "delivered" || o.status === "cancelled",
              )
              .map((order) => (
                <Card
                  key={order.id}
                  className="rounded-3xl border-none bg-white dark:bg-zinc-900 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h4 className="font-bold">
                        Order #{order.id.slice(-4).toUpperCase()}
                      </h4>
                      <div className="flex gap-4 items-center text-xs text-neutral-400 items-center">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />{" "}
                          {format(new Date(order.createdAt), "MMM d, yyyy")}
                        </span>
                        <span className="font-bold text-clay">
                          ${order.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="my-4 px-2">
                    <OrderItemDetails items={order.items} />
                  </div>

                  <div className="flex flex-col gap-2">
                    {!order.tip && order.status === "delivered" && (
                      <div className="flex gap-1">
                        {[1, 2, 5].map((amount) => (
                          <Button
                            key={amount}
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              addTipAfterDelivery(
                                order.id,
                                amount,
                                order.driverId,
                              )
                            }
                            className="rounded-lg border-blue-100 text-blue-600 hover:bg-blue-50 text-[10px] font-black h-8"
                          >
                            +${amount} TIP
                          </Button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        className="rounded-xl border-slate-100/10 text-xs font-bold h-10"
                      >
                        REORDER
                      </Button>
                      <Button
                        variant="ghost"
                        className="rounded-xl text-xs font-bold text-blue-600 h-10"
                      >
                        RATE EXPERIENCE
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
