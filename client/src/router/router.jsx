import { createBrowserRouter } from "react-router";
import MainLayout from "../components/layout/MainLayout";
import constRole from "./role";
import Auth from "./Auth";

import Login from "../pages/Login";
import Home from "../pages/Home";
import Search from "../pages/Search";
import Auction from "../pages/Auction";
import AuctionDetail from "../pages/Auction/AuctionDetail";
import AuctionForm from "../pages/Auction/AuctionForm";
import ProductDetail from "../pages/ProductDetail";
import ProductRegister from "../pages/ProductRegister";
import Chat from "../pages/Chat";
import Payment from "../pages/Payment";
import MyPage from "../pages/MyPage";
import EditProfilePage from "../pages/MyPage/EditProfilePage";
import Admin from "../pages/Admin";
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
      { path: "auction", element: <Auth role={constRole.PUBLIC}><Auction /></Auth> },
      { path: "auction/new", element: <Auth role={constRole.LOGIN}><AuctionForm /></Auth> },
      { path: "auction/:listingIdx", element: <Auth role={constRole.PUBLIC}><AuctionDetail /></Auth> },
      { path: "auction/:listingIdx/edit", element: <Auth role={constRole.LOGIN}><AuctionForm /></Auth> },
      { path: "products/:id", element: <Auth role={constRole.LOGIN}><ProductDetail /></Auth> },
      { path: "products/register", element: <Auth role={constRole.LOGIN}><ProductRegister /></Auth> },
      { path: "chat", element: <Auth role={constRole.LOGIN}><Chat /></Auth> },
      { path: "chat/:chatRoomIdx", element: <Auth role={constRole.LOGIN}><Chat /></Auth> },
      { path: "payment/:id", element: <Auth role={constRole.LOGIN}><Payment /></Auth> },
      {
        path: "mypage/:id",
        element: <Auth role={constRole.LOGIN} />,
        children: [
          { index: true, element: <MyPage /> },
          { path: "edit", element: <EditProfilePage /> },
        ],
      },
      {
        path: "admin",
        element: <Auth role={constRole.ADMIN} />,
        children: [
          { index: true, element: <Admin /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
