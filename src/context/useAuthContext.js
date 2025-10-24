import { useContext } from "react";

import AuthContext from "./AuthContextBase";

export function useAuthContext() {
  return useContext(AuthContext);
}
