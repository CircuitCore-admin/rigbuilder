import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Redirects newly-registered users who haven't completed onboarding.
 * Renders nothing — purely a side-effect component.
 */
export function OnboardingRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (
      user &&
      user.onboardingCompleted === false &&
      location.pathname !== '/onboarding' &&
      location.pathname !== '/verify-email'
    ) {
      navigate('/onboarding', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  return null;
}
