import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { SEO } from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <SEO
        title="Page Not Found (404) | NearWork"
        description="The page you're looking for doesn't exist or has been moved. Head back to NearWork to find local freelancers and jobs."
        path={location.pathname}
        noindex
      />
      <div className="text-center max-w-md">
        <h1 className="mb-4 text-6xl font-extrabold text-primary">404</h1>
        <h2 className="mb-3 text-2xl font-semibold">Page not found</h2>
        <p className="mb-6 text-muted-foreground">
          The page you were looking for isn&apos;t here. It may have been moved or removed.
        </p>
        <nav aria-label="Helpful links" className="flex flex-wrap justify-center gap-3">
          <Link to="/" className="text-primary underline hover:text-primary/90">Home</Link>
          <Link to="/login" className="text-primary underline hover:text-primary/90">Sign in</Link>
        </nav>
      </div>
    </main>
  );
};

export default NotFound;
