import crypto from "node:crypto";

import {
    PaymentInitiationInput,
    PaymentInitiationResult,
    PaymentProvider,
} from "./payment-provider.js";

const ESEWA_FORM_URL =
    process.env.ESEWA_FORM_URL ??
    "https://rc-epay.esewa.com.np/api/epay/main/v2/form";

const ESEWA_PRODUCT_CODE =
    process.env.ESEWA_PRODUCT_CODE ?? "EPAYTEST";

const ESEWA_SECRET_KEY =
    process.env.ESEWA_SECRET_KEY ??
    "8gBm/:&EnhH.1/q";

const ESEWA_SUCCESS_URL =
    process.env.ESEWA_SUCCESS_URL ??
    "http://localhost:3000/api/v1/payments/esewa/success";

const ESEWA_FAILURE_URL =
    process.env.ESEWA_FAILURE_URL ??
    "http://localhost:3000/api/v1/payments/esewa/failure";


function generateSignature2(
    totalAmount: string,
    transactionUuid: string,
    productCode: string,
): string {

    const message =
        `total_amount=${totalAmount},` +
        `transaction_uuid=${transactionUuid},` +
        `product_code=${productCode}`;

    return crypto
        .createHmac("sha256", ESEWA_SECRET_KEY)
        .update(message)
        .digest("base64");
}


function generateSignature(
    totalAmount: string,
    transactionUuid: string,
    productCode: string,
): string {

    const message =
        `total_amount=${totalAmount},` +
        `transaction_uuid=${transactionUuid},` +
        `product_code=${productCode}`;

    console.log("eSewa signature message:", message);

    console.log(
        "eSewa secret key:",
        JSON.stringify(ESEWA_SECRET_KEY),
    );

    const signature = crypto
        .createHmac(
            "sha256",
            ESEWA_SECRET_KEY,
        )
        .update(message, "utf8")
        .digest("base64");

    console.log(
        "eSewa generated signature:",
        signature,
    );

    return signature;
}

export class EsewaProvider implements PaymentProvider {

    async initiatePayment(
        input: PaymentInitiationInput,
    ): Promise<PaymentInitiationResult> {

        const {
            transactionUuid,
            amount,
        } = input;

        const signature = generateSignature(
            amount,
            transactionUuid,
            ESEWA_PRODUCT_CODE,
        );

        return {
            transactionUuid,

            redirectUrl: ESEWA_FORM_URL,

            form: {
                amount,
                tax_amount: "0",
                total_amount: amount,

                transaction_uuid: transactionUuid,

                product_code: ESEWA_PRODUCT_CODE,

                product_service_charge: "0",
                product_delivery_charge: "0",

                success_url: ESEWA_SUCCESS_URL,
                failure_url: ESEWA_FAILURE_URL,

                signed_field_names:
                    "total_amount,transaction_uuid,product_code",

                signature,
            },
        };
    }
}


export function decodeEsewaResponse(
    data: string,
) {

    const decoded =
        Buffer.from(
            data,
            "base64",
        ).toString("utf8");

    return JSON.parse(decoded);
}