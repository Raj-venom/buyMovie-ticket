import {
    generateEsewaSignature,
} from "./esewa.signature.js";


export interface EsewaCallback {
    transaction_code?: string;
    status: string;
    total_amount: string;
    transaction_uuid: string;
    product_code: string;
    signed_field_names: string;
    signature: string;
}


export function verifyEsewaCallback(
    payload: EsewaCallback,
): boolean {

    const expectedSignature =
        generateEsewaSignature(
            {
                transaction_code:
                    payload.transaction_code ?? "",

                status:
                    payload.status,

                total_amount:
                    payload.total_amount,

                transaction_uuid:
                    payload.transaction_uuid,

                product_code:
                    payload.product_code,

                signed_field_names:
                    payload.signed_field_names,
            },
            payload.signed_field_names,
        );

    return (
        expectedSignature ===
        payload.signature
    );
}