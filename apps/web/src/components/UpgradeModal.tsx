import { useState } from 'react';
import { useDemo } from '@/lib/demo/DemoContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { Sparkles, CheckCircle2, ShieldCheck, Zap, X, Loader2 } from 'lucide-react';

export function UpgradeModal() {
  const { isUpgradeModalOpen, closeUpgradeModal, upgradeReason } = useDemo();
  const { user, isAuthenticated, signInWithGoogle } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isUpgradeModalOpen) return null;

  const triggerPaddleCheckout = (userEmail?: string | null, userId?: string | null) => {
    const paddleVendorId = import.meta.env.VITE_PADDLE_VENDOR_ID || '12345';
    const paddleProductId = import.meta.env.VITE_PADDLE_PRODUCT_ID || 'pro_tier';
    const checkoutUrl = `https://checkout.paddle.com/checkout/product/${paddleProductId}?vendor=${paddleVendorId}&email=${encodeURIComponent(userEmail || '')}&passthrough=${encodeURIComponent(userId || '')}`;

    if (window.Paddle?.Checkout) {
      window.Paddle.Checkout.open({
        product: paddleProductId,
        email: userEmail || undefined,
        passthrough: userId || undefined,
      });
    } else {
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleUpgradeClick = async () => {
    setIsProcessing(true);
    try {
      let activeUser = user;
      if (!isAuthenticated || !activeUser) {
        activeUser = await signInWithGoogle();
      }
      triggerPaddleCheckout(activeUser?.email, activeUser?.id);
    } catch (err) {
      console.error('Upgrade Google Auth error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAlreadyPurchasedSignIn = async () => {
    setIsProcessing(true);
    try {
      await signInWithGoogle();
      closeUpgradeModal();
    } catch (err) {
      console.error('Already purchased sign-in error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
        <button
          onClick={closeUpgradeModal}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">Unlock Stratemark Pro</h3>
            <p className="text-sm text-slate-400">One-time payment • Lifetime access across Web & Desktop</p>
          </div>
        </div>

        {upgradeReason && (
          <div className="mb-5 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-300 flex items-start gap-2">
            <Zap className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
            <span>{upgradeReason}</span>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong>Unlimited AI Research</strong> on any market or company</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong>Live Web Scraping</strong> & real-time competitor tracking</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong>Executive Report Exports</strong> (Markdown, PPTX, PDF)</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong>Cross-Device Sync</strong> (Web & Desktop via Google Auth)</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleUpgradeClick}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01] disabled:opacity-60"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
            <span>Upgrade with Paddle — $49 One-Time</span>
          </button>

          {!isAuthenticated && (
            <button
              onClick={handleAlreadyPurchasedSignIn}
              disabled={isProcessing}
              className="w-full py-1.5 text-xs text-center text-amber-400 hover:text-amber-300 transition-colors font-medium"
            >
              Already purchased? Sign in
            </button>
          )}

          <button
            onClick={closeUpgradeModal}
            className="w-full py-1.5 text-xs text-center text-slate-400 hover:text-slate-300 transition-colors"
          >
            Continue with Demo Mode
          </button>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    Paddle?: {
      Checkout?: {
        open: (options: { product: string | number; email?: string; passthrough?: string }) => void;
      };
    };
  }
}
