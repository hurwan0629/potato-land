import { createBrowserRouter, Navigate } from "react-router";

import {
  MainLayout,
  RequireAdmin,
  RequireAuth,
  RequireGuest,
} from "../app/components/AppShell";
import { AccountEditPage, MyPage } from "../app/pages/AccountPages";
import AdminPage from "../app/pages/AdminPage";
import { AuctionDetailPage, AuctionFormPage } from "../app/pages/AuctionPages";
import { LoginPage, SignupPage } from "../app/pages/AuthPages";
import { AuctionListPage, SearchPage } from "../app/pages/CatalogPages";
import ChatPage from "../app/pages/ChatPage";
import { NotFoundPage, RouteErrorPage } from "../app/pages/ErrorPages";
import HomePage from "../app/pages/HomePage";
import PaymentPage from "../app/pages/PaymentPage";
import { UsedDetailPage, UsedFormPage } from "../app/pages/UsedPages";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "search", element: <SearchPage /> },
      { path: "auction", element: <AuctionListPage /> },
      { path: "auction/:listingIdx", element: <AuctionDetailPage /> },
      { path: "products/:listingIdx", element: <UsedDetailPage /> },
      { path: "mypage/:userIdx", element: <MyPage /> },

      {
        element: <RequireGuest />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "signup", element: <SignupPage /> },
        ],
      },

      {
        element: <RequireAuth />,
        children: [
          { path: "products/register", element: <UsedFormPage /> },
          { path: "products/:listingIdx/edit", element: <UsedFormPage /> },
          { path: "auction/new", element: <AuctionFormPage /> },
          { path: "auction/:listingIdx/edit", element: <AuctionFormPage /> },
          { path: "chat", element: <ChatPage /> },
          { path: "chat/:chatRoomIdx", element: <ChatPage /> },
          { path: "payment/:transactionIdx", element: <PaymentPage /> },
          { path: "mypage/me/edit", element: <AccountEditPage /> },
          { path: "mypage/:userIdx/edit", element: <Navigate to="/mypage/me/edit" replace /> },
        ],
      },

      {
        element: <RequireAdmin />,
        children: [
          { path: "admin", element: <AdminPage /> },
        ],
      },

      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
