import { RouterProvider } from "react-router"
import { router } from "./router/router"
import { AuthProvider } from "./context/AuthContext"
import { SocketProvider } from "./context/SocketContext"
import { NotificationProvider } from "./context/NotificationContext"

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <RouterProvider router={router} />
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  )
}
