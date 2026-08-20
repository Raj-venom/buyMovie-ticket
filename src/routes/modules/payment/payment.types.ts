

import { PaymentMethod, PaymentProvider } from "../../../generated/prisma/browser.js";


export interface CreatePaymentInput {
    reservationId: string;
    method: PaymentMethod;
    provider?: PaymentProvider;
}