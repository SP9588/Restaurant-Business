import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '../types';

export const REFERRAL_REWARD_POINTS = 500; // $5.00 equivalent

export async function processReferralReward(customerId: string) {
  try {
    const customerRef = doc(db, 'users', customerId);
    const customerSnap = await getDoc(customerRef);
    
    if (!customerSnap.exists()) return;
    
    const customer = customerSnap.data() as UserProfile;
    
    // Only reward if it's their first completed order and they were referred
    if (customer.isFirstOrderCompleted || !customer.referredBy) {
      if (!customer.isFirstOrderCompleted) {
        await updateDoc(customerRef, { isFirstOrderCompleted: true });
      }
      return;
    }

    // 1. Mark first order as completed
    await updateDoc(customerRef, { 
      isFirstOrderCompleted: true,
      loyaltyPoints: increment(REFERRAL_REWARD_POINTS)
    });

    // 2. Find the referrer
    const referrersQuery = query(
      collection(db, 'users'), 
      where('referralCode', '==', customer.referredBy)
    );
    const referrersSnap = await getDocs(referrersQuery);

    if (!referrersSnap.empty) {
      const referrerId = referrersSnap.docs[0].id;
      const referrerRef = doc(db, 'users', referrerId);
      
      // 3. Reward the referrer
      await updateDoc(referrerRef, {
        loyaltyPoints: increment(REFERRAL_REWARD_POINTS)
      });
      
      console.log(`Referral reward processed: ${customer.referredBy} invited ${customerId}`);
    }
  } catch (error) {
    console.error('Error processing referral reward:', error);
  }
}
