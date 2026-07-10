import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { ChefHat, ShoppingBag, Truck, ShieldCheck, Gift, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

export default function Login() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [loginError, setLoginError] = useState<string | null>(null);

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const [referralCode, setReferralCode] = useState('');
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<any>(null);

  const handleGoogleSignIn = async () => {
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        setPendingUserData({
          userId: result.user.uid,
          name: result.user.displayName || 'User',
          email: result.user.email || '',
          role: 'customer',
          loyaltyPoints: 0,
          referralCode: generateReferralCode(),
          isFirstOrderCompleted: false,
          createdAt: new Date().toISOString()
        });
        setShowReferralInput(true);
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      if (error.code === 'auth/network-request-failed') {
        setLoginError('Network error: Please ensure your browser allows popups and that you have added this domain to Authorized Domains in Firebase Console.');
      } else {
        setLoginError('Login failed. Please try again.');
      }
    }
  };

  const handleCompleteSignup = async () => {
    if (!pendingUserData) return;
    
    try {
      let referredBy = null;
      if (referralCode.trim()) {
        // Verify code
        const q = query(collection(db, 'users'), where('referralCode', '==', referralCode.trim().toUpperCase()));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          referredBy = referralCode.trim().toUpperCase();
        } else {
          toast.error('Invalid referral code. Proceeding without one.');
        }
      }

      const finalData = {
        ...pendingUserData,
        referredBy
      };

      await setDoc(doc(db, 'users', pendingUserData.userId), finalData);
      navigate('/');
    } catch (err) {
      toast.error('Failed to complete setup');
    }
  };

  useEffect(() => {
    if (user && profile) {
      navigate('/');
    }
  }, [user, profile, navigate]);

  if (user && profile) {
    return null;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-white" />
        <div className="absolute inset-0 bg-dot-pattern opacity-10" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <AnimatePresence mode="wait">
          {!showReferralInput ? (
            <motion.div 
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white rounded-[40px] p-10 text-center shadow-2xl shadow-slate-200 border border-slate-100"
            >
              <div className="w-20 h-20 bg-slate-900 rounded-[28px] mx-auto flex items-center justify-center mb-8 shadow-xl shadow-slate-200">
                <ShoppingBag className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-4xl font-serif font-black tracking-tighter mb-2 text-slate-900 uppercase italic">GASTRO<span className="text-blue-600">FAST</span></h1>
              <p className="text-slate-500 mb-10 italic leading-relaxed">The ultimate ecosystem for <br/> diners, chefs, and drivers.</p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center">
                  <ChefHat className="w-6 h-6 mb-2 text-slate-900" />
                  <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Kitchens</span>
                </div>
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center">
                  <Truck className="w-6 h-6 mb-2 text-blue-600" />
                  <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Delivery</span>
                </div>
              </div>

              {loginError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-medium">
                  {loginError}
                </div>
              )}

              <Button 
                onClick={handleGoogleSignIn}
                className="w-full h-16 rounded-[24px] bg-slate-900 text-white hover:bg-blue-600 text-lg font-black transition-all shadow-lg shadow-slate-200"
              >
                Continue with Google
              </Button>

              <div className="mt-10 flex items-center justify-center gap-2 text-slate-400">
                <ShieldCheck className="w-4 h-4" />
                <p className="text-[10px] uppercase font-black tracking-widest">Secure Military-Grade Gateway</p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="referral"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-[40px] p-10 text-center shadow-2xl shadow-slate-200 border border-slate-100"
            >
              <div className="w-20 h-20 bg-blue-600 rounded-[28px] mx-auto flex items-center justify-center mb-8 shadow-xl shadow-blue-200">
                <Gift className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-2xl font-serif font-black tracking-tighter mb-2 text-slate-900 uppercase italic">Welcome to the <span className="text-blue-600">Circle</span></h2>
              <p className="text-slate-500 mb-8 text-sm italic leading-relaxed">Joined via a friend? Enter their unique referral code below for an instant credit on your next order.</p>

              <div className="space-y-4 mb-8">
                <div className="relative">
                  <Input 
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="ENTER CODE (e.g. AX7B9R)"
                    className="h-16 rounded-2xl border-2 border-slate-100 focus:border-blue-600 transition-all text-center font-black placeholder:text-slate-300 tracking-widest"
                  />
                </div>
                <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 italic">Leave blank to skip</p>
              </div>

              <Button 
                onClick={handleCompleteSignup}
                className="w-full h-16 rounded-[24px] bg-blue-600 text-white hover:bg-slate-900 text-lg font-black transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                Finish Setup <ArrowRight className="w-6 h-6" />
              </Button>

              <button 
                onClick={() => handleCompleteSignup()}
                className="mt-6 text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
              >
                Skip Integration
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
