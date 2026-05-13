import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

/**
 * Reads the `?redirect=<path>` query produced by `public/404.html` when
 * GitHub Pages serves a deep link (e.g. /dashboard) that has no static
 * file. The stub redirects the browser to the SPA root with the original
 * path encoded in a query param; this component runs once on mount,
 * decodes that param, and navigates to the saved path so deep links
 * survive a hard reload.
 */
export default function SpaRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect");
    if (!redirect) return;

    // Strip the query param + navigate to the original path. `replace`
    // keeps the back button clean.
    navigate(redirect, { replace: true });
  }, [location.search, navigate]);

  return null;
}
