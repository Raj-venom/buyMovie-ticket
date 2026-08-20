import crypto from "node:crypto";

const SECRET_KEY =
    process.env.ESEWA_SECRET_KEY ??
    "8gBm/:&EnhH.1/q";


export function generateEsewaSignature(
    fields: Record<string, string>,
    signedFieldNames: string,
): string {

    const message = signedFieldNames
        .split(",")
        .map(
            (field) =>
                `${field}=${fields[field]}`,
        )
        .join(",");

    return crypto
        .createHmac(
            "sha256",
            SECRET_KEY,
        )
        .update(message)
        .digest("base64");
}