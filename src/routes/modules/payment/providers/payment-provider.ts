
export interface PaymentInitiationInput {
    paymentId: string;
    transactionUuid: string;
    amount: string;
    reservationId: string;
}

export interface PaymentProvider {
    initiatePayment(
        input: PaymentInitiationInput,
    ): Promise<PaymentInitiationResult>;
}

export interface PaymentInitiationResult {
    transactionUuid: string;
    redirectUrl: string;
    form: Record<string, string>;
}