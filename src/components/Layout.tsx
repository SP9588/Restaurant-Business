import { ReactNode } from 'react';
import { Navbar } from './Navbar';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <footer className="py-12 bg-neutral-50 dark:bg-neutral-900 border-t">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-neutral-500">© 2026 GastroFast Ecosystem. All rights reserved.</p>
          <div className="mt-4 flex justify-center space-x-6">
            <span className="text-xs text-neutral-400">Secure Payments via Stripe & PayPal</span>
            <span className="text-xs text-neutral-400">Global Delivery Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
