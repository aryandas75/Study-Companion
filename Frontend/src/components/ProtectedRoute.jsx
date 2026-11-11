import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const API_URL = "http://localhost:3000/api";

function ProtectedRoute({ children }) {
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        setAuthenticated(response.ok);
      } catch (error) {
        console.error("Authentication check failed:", error);
        setAuthenticated(false);
      }
    };

    checkAuthentication();
  }, []);

  if (authenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-400" />

          <p className="mt-4 text-sm text-slate-400">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;