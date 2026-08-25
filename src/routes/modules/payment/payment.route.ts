import { Router } from "express";
import { createPaymentController } from "./controller/payment.controller.js";


import {
    completeCashPaymentController,
} from "./controller/complete-cash-payment.controller.js";
import { esewaFailureController, esewaSuccessController } from "./controller/esewa.controller.js";

const router = Router();

router.post(
    "/reservations/:reservationId/payments",
    createPaymentController,
);


router.post(
    "/payments/:paymentId/complete",
    completeCashPaymentController,
);


router.get(
    "/payments/esewa/success",
    esewaSuccessController,
);

router.get(
    "/payments/esewa/failure",
    esewaFailureController,
);



export default router;