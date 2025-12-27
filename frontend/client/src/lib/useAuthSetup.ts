import { useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { setGetTokenFn } from "./queryClient";

export function useAuthSetup() {
  const { getToken } = useAuth();

  useEffect(() => {
    setGetTokenFn(getToken);

    return () => {
      setGetTokenFn(null);
    };
  }, [getToken]);
}
