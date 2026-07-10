import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  increment,
  Timestamp 
} from 'firebase/firestore';
import { Promotion, OrderItem, Restaurant } from '../types';

export class PromotionService {
  static async getActivePromotions(restaurantId?: string) {
    const now = new Date().toISOString();
    let q = query(
      collection(db, 'promotions'),
      where('isActive', '==', true),
      where('endDate', '>=', now)
    );

    if (restaurantId) {
      // In Firestore we can't easily do (restaurantId == X OR restaurantId == null) in one query
      // without complex setup, so we fetch all active and filter in memory or do two queries.
      // For simplicity, we filter in memory for this demo.
    }

    const snap = await getDocs(q);
    const promos = snap.docs.map(d => ({ id: d.id, ...d.data() } as Promotion));
    
    return promos.filter(p => !p.restaurantId || p.restaurantId === restaurantId);
  }

  static calculateDiscount(items: OrderItem[], promotion: Promotion, subtotal: number): number {
    if (promotion.minOrderValue && subtotal < promotion.minOrderValue) return 0;

    switch (promotion.type) {
      case 'percentage':
        return (subtotal * promotion.value) / 100;
      case 'fixed':
        return Math.min(promotion.value, subtotal);
      case 'bogo':
        // Buy One Get One on specific items or lowest priced item
        if (promotion.itemIds && promotion.itemIds.length > 0) {
          const eligibleItems = items.filter(item => promotion.itemIds?.includes(item.id));
          if (eligibleItems.length >= 2) {
            // Find cheapest eligible item
            const cheapest = [...eligibleItems].sort((a, b) => a.price - b.price)[0];
            return cheapest.price;
          }
        }
        return 0;
      default:
        return 0;
    }
  }

  static async awardLoyaltyPoints(userId: string, orderAmount: number) {
    // Award 1 point for every $1 spent
    const pointsToAward = Math.floor(orderAmount);
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      loyaltyPoints: increment(pointsToAward),
      updatedAt: new Date().toISOString()
    });
    return pointsToAward;
  }

  static async redeemPoints(userId: string, pointsToRedeem: number) {
    // 100 points = $1 discount
    const discountValue = pointsToRedeem / 100;
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      loyaltyPoints: increment(-pointsToRedeem),
      updatedAt: new Date().toISOString()
    });
    return discountValue;
  }
}
