export type UserRole = 'customer' | 'owner' | 'driver' | 'admin' | 'cashier';

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  currency?: string;
  profileImage?: string;
  loyaltyPoints: number;
  referralCode: string;
  referredBy?: string;
  isFirstOrderCompleted: boolean;
  createdAt: string;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  landmark?: string;
  phone: string;
  email: string;
  currency: string;
  logo?: string;
  rating: number;
  reviewCount: number;
  status: 'open' | 'closed';
  isVerified: boolean;
  location?: {
    lat: number;
    lng: number;
  };
  createdAt: string;
}

export interface MenuOption {
  id: string;
  name: string;
  price: number;
}

export interface CustomizationSection {
  id: string;
  name: string;
  required: boolean;
  allowMultiple: boolean;
  options: MenuOption[];
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
  sections?: CustomizationSection[];
}

export interface DriverProfile {
  userId: string;
  vehicleInfo: {
    type: 'bike' | 'car' | 'scooter';
    model: string;
    plateNumber: string;
  };
  currentLocation?: {
    lat: number;
    lng: number;
  };
  isOnline: boolean;
  totalEarnings: number;
  rating: number;
  completedOrders: number;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'accepted' | 'delivery_started' | 'picked_up' | 'en_route' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  customizations?: string[];
}

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  driverId?: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  subtotal: number;
  discountAmount?: number;
  promotionId?: string;
  loyaltyPointsUsed?: number;
  tip?: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  deliveryAddress: string;
  preferredDeliveryTime?: string;
  tracking?: {
    driverLat: number;
    driverLng: number;
    lastUpdated: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  code?: string;
  title: string;
  description: string;
  type: 'percentage' | 'fixed' | 'bogo';
  value: number;
  minOrderValue?: number;
  restaurantId?: string;
  itemIds?: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  restaurantId: string;
  driverId?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Earning {
  id: string;
  driverId: string;
  orderId: string;
  amount: number;
  tip: number;
  createdAt: string;
}
