import { RouterProvider } from "react-router";

import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { SocketProvider } from "./context/SocketContext";
import { ToastProvider } from "./context/ToastContext";
import { router } from "./router/router";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <RouterProvider router={router} />
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
