import { motion } from 'framer-motion';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BrandArc, Logo } from '@/app/AppShell';
import { Button } from '@/components/ui';
import { useOfferStore } from '@/store/offers';

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const login = useOfferStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      <div className="relative flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        <Logo className="h-12 w-auto self-start" />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-md py-16">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Kollektiv Personenversicherung</div>
          <h1 className="font-serif text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl">
            WebCalculator
            <br />
            <span className="text-ink-muted">UVG, UVGZ und KTG.</span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-soft">
            Offerten für Firmenkunden in sieben Schritten erfassen. Die Berechnung erfolgt im CDI, die Offerte erhalten Sie als PDF.
          </p>
          <div className="mt-10 space-y-3">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              loading={loading}
              icon={<KeyRound className="h-4 w-4" />}
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  login();
                  navigate(from, { replace: true });
                }, 900);
              }}
            >
              {loading ? 'Anmelden ...' : 'Mit SSO anmelden'}
            </Button>
            <p className="flex items-center gap-2 text-xs text-ink-muted">
              <ShieldCheck className="h-4 w-4" />
              Single Sign-On via Swiss Life Active Directory (Prototyp, keine echte Anmeldung)
            </p>
          </div>
        </motion.div>
        <div className="text-xs text-ink-muted">© Swiss Life · Interner Prototyp · Daten nur in dieser Browser-Session</div>
      </div>

      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <BrandArc className="absolute -right-10 bottom-0 h-[115%] w-auto" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="max-w-sm space-y-4">
            {[
              ['01', 'Kunde erfassen', 'Firmendaten direkt aus ZEFIX übernehmen.'],
              ['02', 'Deckung konfigurieren', 'Empfehlung übernehmen oder individuell anpassen.'],
              ['03', 'An CDI übermitteln', 'Prämie wird berechnet, Offerte als PDF.'],
            ].map(([n, t, d]) => (
              <div key={n} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                <div className="font-serif text-2xl text-white/50">{n}</div>
                <div>
                  <div className="font-medium">{t}</div>
                  <div className="text-sm text-white/65">{d}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
