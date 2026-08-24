import { createContext, useContext, useState, ReactNode } from 'react';
import { MenuItem, OrderItem } from '../types';

interface CartContextType {
  items: OrderItem[];
  addItem: (item: MenuItem, quantity?: number, customizations?: string[]) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  total: number;
  restaurantId: string | null;
  setRestaurantId: (id: string | null) => void;
  pointsToEarn: number;
  pointsToRedeem: number;
  setPointsToRedeem: (points: number) => void;
  loyaltyDiscount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  const addItem = (item: MenuItem, quantity = 1, customizations?: string[]) => {
    // If adding item from a different restaurant, clear cart first (standard delivery app logic)
    if (restaurantId && restaurantId !== item.restaurantId) {
      if (window.confirm('Clear current cart to add items from another restaurant?')) {
        setItems([{ id: item.id, name: item.name, price: item.price, quantity, customizations }]);
        setRestaurantId(item.restaurantId);
        setPointsToRedeem(0);
      }
      return;
    }

    setRestaurantId(item.restaurantId);
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id); // Simple check, could be more complex with customizations
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity, customizations }];
    });
  };

  const removeItem = (itemId: string) => {
    setItems(prev => {
      const newItems = prev.filter(i => i.id !== itemId);
      if (newItems.length === 0) {
        setRestaurantId(null);
        setPointsToRedeem(0);
      }
      return newItems;
    });
  };

  const clearCart = () => {
    setItems([]);
    setRestaurantId(null);
    setPointsToRedeem(0);
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const pointsToEarn = Math.floor(total);
  const loyaltyDiscount = pointsToRedeem / 100;

  return (
    <CartContext.Provider value={{ 
      items, 
      addItem, 
      removeItem, 
      clearCart, 
      total, 
      restaurantId, 
      setRestaurantId,
      pointsToEarn,
      pointsToRedeem,
      setPointsToRedeem,
      loyaltyDiscount
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
