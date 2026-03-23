import { Suspense } from "react";
import { Lock, Loader2 } from "lucide-react";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-3xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-brand-brown to-brand-brown/80 px-8 py-7">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display font-bold text-2xl text-white">Новый пароль</h1>
            <p className="text-white/60 text-sm mt-1">
              Придумайте надёжный пароль для вашего аккаунта
            </p>
          </div>

          <div className="px-8 py-7">
            <Suspense fallback={
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            }>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
