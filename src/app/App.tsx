import { useEffect, useRef, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { WizardPage } from '@/pages/WizardPage';
import { SubmissionPage } from '@/pages/SubmissionPage';
import { OfferDetailPage } from '@/pages/OfferDetailPage';
import { useOfferStore } from '@/store/offers';

function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useOfferStore((s) => s.isAuthenticated);
  const ensureSeed = useOfferStore((s) => s.ensureSeed);
  const location = useLocation();
  useEffect(() => {
    if (isAuthenticated) ensureSeed();
  }, [isAuthenticated, ensureSeed]);
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/** Legt eine neue Offerte an und öffnet sie im Wizard. */
function NewOfferRoute() {
  const navigate = useNavigate();
  const startNewOffer = useOfferStore((s) => s.startNewOffer);
  const done = useRef(false); // StrictMode ruft Effekte doppelt auf
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const id = startNewOffer();
    navigate(`/offerte/${id}/bearbeiten`, { replace: true });
  }, [startNewOffer, navigate]);
  return null;
}

/** Dupliziert eine Offerte und öffnet die Kopie im Wizard. */
function DuplicateRoute() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const duplicateOffer = useOfferStore((s) => s.duplicateOffer);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const copy = duplicateOffer(id);
    navigate(copy ? `/offerte/${copy}/bearbeiten` : '/', { replace: true });
  }, [id, duplicateOffer, navigate]);
  return null;
}

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/offerte/neu" element={<RequireAuth><NewOfferRoute /></RequireAuth>} />
        <Route path="/offerte/:id" element={<RequireAuth><OfferDetailPage /></RequireAuth>} />
        <Route path="/offerte/:id/bearbeiten" element={<RequireAuth><WizardPage /></RequireAuth>} />
        <Route path="/offerte/:id/duplizieren" element={<RequireAuth><DuplicateRoute /></RequireAuth>} />
        <Route path="/offerte/:id/uebermittlung" element={<RequireAuth><SubmissionPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
