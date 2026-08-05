import { createBrowserRouter } from "react-router";
import MainLayout from "../components/layout/MainLayout";
import AdminLayout from "../components/layout/AdminLayout";
import constRole from "./role";
import Auth from "./Auth";

import Login from "../pages/Login";
import Home from "../pages/Home";
import Search from "../pages/Search";
import Auction from "../pages/Auction";
import ProductDetail from "../pages/ProductDetail";
import ProductRegister from "../pages/ProductRegister";
import Chat from "../pages/Chat";
import Payment from "../pages/Payment";
import MyPage from "../pages/MyPage";
import EditProfilePage from "../pages/MyPage/EditProfilePage"
import AdminDashboard from "../pages/Admin/Dashboard";
import AdminUsers from "../pages/Admin/Users";
import AdminUserDetail from "../pages/Admin/UserDetail";
import AdminAuctions from "../pages/Admin/Auctions";
import AdminUsed from "../pages/Admin/Used";
import Signup from "../pages/Auth/Signup";
import NotFoundPage from "../pages/error/NotFoundPage";
import ErrorPage from "../pages/error/ErrorPage";
 
export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Auth role={constRole.PUBLIC}><Home /></Auth> },
      { path: "login", element: <Auth role={constRole.GUEST}><Login /></Auth> },
      { path: "signup", element: <Auth role={constRole.GUEST}><Signup /></Auth> },
      { path: "search", element: <Auth role={constRole.LOGIN}><Search /></Auth> },
      { path: "auction", element: <Auth role={constRole.LOGIN}><Auction /></Auth> },
      { path: "used/:id", element: <Auth role={constRole.LOGIN}><ProductDetail /></Auth> },
      { path: "used", element: <Auth role={constRole.LOGIN}><ProductRegister /></Auth> },
      { path: "chat", element: <Auth role={constRole.LOGIN}><Chat /></Auth> },
      { path: "payment/:id", element: <Auth role={constRole.LOGIN}><Payment /></Auth> },
      {
        path: "mypage/:id",
        element: <Auth role={constRole.LOGIN} />,
        children: [
          {
            index: true,
            element: <MyPage />,
          },

          {
            path: "editprofile",
            element: <EditProfilePage />,
          },

          {
            path: "edituser",
            element: <EditProfilePage />,
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    path: "admin",
    element: <Auth role={constRole.ADMIN}><AdminLayout /></Auth>,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "users", element: <AdminUsers /> },
      { path: "users/:userIdx", element: <AdminUserDetail /> },
      { path: "auctions", element: <AdminAuctions /> },
      { path: "used", element: <AdminUsed /> },
    ],
  },
])