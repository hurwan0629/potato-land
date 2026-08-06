import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./index.css";
import tokens from "./styles/Tokens.module.css";
import layout from "./styles/Layout.module.css";
import auth from "./styles/Auth.module.css";
import marketplace from "./styles/Marketplace.module.css";
import chat from "./styles/Chat.module.css";
import account from "./styles/Account.module.css";
import admin from "./styles/Admin.module.css";

const root = document.getElementById("root");
root.className = [tokens.moduleRoot, layout.moduleRoot, auth.moduleRoot, marketplace.moduleRoot, chat.moduleRoot, account.moduleRoot, admin.moduleRoot].join(" ");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
