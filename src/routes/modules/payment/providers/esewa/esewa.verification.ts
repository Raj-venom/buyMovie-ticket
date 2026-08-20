interface EsewaStatusResponse {
    product_code: string;
    transaction_uuid: string;
    total_amount: number;
    status:
        | "PENDING"
        | "COMPLETE"
        | "FULL_REFUND"
        | "PARTIAL_REFUND"
        | "AMBIGUOUS"
        | "NOT_FOUND"
        | "CANCELED";
    ref_id: string | null;
}


const ESEWA_STATUS_URL =
    process.env.ESEWA_STATUS_URL ??
    "https://rc.esewa.com.np/api/epay/transaction/status/";


export async function verifyEsewaTransaction(
    transactionUuid: string,
    totalAmount: string,
): Promise<EsewaStatusResponse> {

    const url = new URL(
        ESEWA_STATUS_URL,
    );

    url.searchParams.set(
        "product_code",
        process.env.ESEWA_PRODUCT_CODE ??
            "EPAYTEST",
    );

    url.searchParams.set(
        "total_amount",
        totalAmount,
    );

    url.searchParams.set(
        "transaction_uuid",
        transactionUuid,
    );

    const response =
        await fetch(url);

    if (!response.ok) {
        throw new Error(
            "ESEWA_STATUS_CHECK_FAILED",
        );
    }

    return response.json();
}