import { Router } from "express";

import {
  cancelTransaction,
  completeTransaction,
  createPaymentRequest,
  getTransaction,
} from "./transactions.controller.js";

export const transactionsRouter = Router();

transactionsRouter.post("/payment-requests", createPaymentRequest);
transactionsRouter.get("/:transactionIdx", getTransaction);
transactionsRouter.patch("/:transactionIdx/complete", completeTransaction);
transactionsRouter.patch("/:transactionIdx/cancel", cancelTransaction);
