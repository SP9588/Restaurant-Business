import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  User, 
  LogOut, 
  ShoppingBag, 
  Utensils, 
  Truck, 
  ShieldCheck, 
  Wallet,
  Menu as MenuIcon,
  X,
  Moon,
  Sun
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { UserRole } from '../types';

export function Navbar() {
  const { user, profile, isAdmin, isOwner, isDriver, isCustomer, isCashier } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const changeRole = async (newRole: UserRole) => {
    if (user && profile) {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      window.location.reload(); // Hard reload to refresh role states
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 transition-colors shadow-lg shadow-slate-200">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-serif font-black tracking-tighter text-slate-900 uppercase italic">Gastro<span className="text-blue-600">Fast</span></span>
            </Link>
            
            <div className="hidden md:ml-12 md:flex md:space-x-10">
              {isCustomer && (
                <>
                  <Link to="/" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-600 transition-colors">Restaurants</Link>
                  <Link to="/orders" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-600 transition-colors">My Orders</Link>
                </>
              )}
              {isOwner && (
                <>
                  <Link to="/owner" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-600 transition-colors">Kitchen</Link>
                  <Link to="/owner/menu" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-600 transition-colors">Menu</Link>
                </>
              )}
              {isDriver && (
                <>
                  <Link to="/driver" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-600 transition-colors">Available Tasks</Link>
                </>
              )}
              {isCashier && (
                <>
                  <Link to="/cashier" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-600 transition-colors">Cashier Terminal</Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full" />
                  }
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || ''} alt={profile?.name} />
                    <AvatarFallback>{profile?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{profile?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
                        <Badge variant="outline" className="mt-1 w-fit capitalize">{profile?.role}</Badge>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  
                  {/* Dev Role Switcher */}
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Role (Dev)</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => changeRole('customer')}>Customer</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeRole('owner')}>Owner</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeRole('driver')}>Driver</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeRole('cashier')}>Cashier</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeRole('admin')}>Admin</DropdownMenuItem>
                  </DropdownMenuGroup>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate('/login')}>Sign In</Button>
            )}

            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden glass border-t animate-in slide-in-from-top duration-300">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link to="/" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800">Restaurants</Link>
            <Link to="/orders" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800">My Orders</Link>
            {isCashier && (
              <Link to="/cashier" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800">Cashier Terminal</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function Badge({ children, variant = 'default', className }: { children: React.ReactNode, variant?: any, className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variant === 'outline' ? 'text-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/80'} ${className}`}>
      {children}
    </span>
  );
}
