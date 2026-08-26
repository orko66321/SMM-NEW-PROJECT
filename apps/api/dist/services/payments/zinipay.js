import axios from "axios";
function authHeaders(creds) {
    return {
        "Content-Type": "application/json",
        "zini-api-key": creds.apiKey,
    };
}
function parseInvoiceId(paymentUrl) {
    const segments = paymentUrl.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last)
        throw new Error(`Could not parse invoice id from ZiniPay payment_url: ${paymentUrl}`);
    return last;
}
export const zinipayGateway = {
    key: "ZINIPAY",
    async initiate(creds, params) {
        const redirectUrl = `${params.callbackUrl}?depositId=${encodeURIComponent(params.depositId)}`;
        const res = await axios.post(`${creds.baseUrl}/v1/payment/create`, {
            cus_name: params.payerName ?? "Customer",
            cus_email: params.payerEmail ?? "no-reply@allinonsr.com",
            amount: params.amount,
            // val_id is echoed back verbatim on verify — our own depositId, so
            // confirm()'s caller can cross-check it if ever needed. Not itself
            // used for the confirm() lookup (that's gatewayRef/invoiceId,
            // parsed from payment_url below), just extra correlation.
            val_id: params.depositId,
            metadata: { order_id: params.depositId, user_id: params.payerReference },
            redirect_url: redirectUrl,
            return_type: "GET",
            cancel_url: redirectUrl,
            webhook_url: params.webhookUrl,
        }, { headers: authHeaders(creds), timeout: 15_000 });
        if (!res.data.status) {
            throw new Error(`ZiniPay create invoice failed: ${res.data.message}`);
        }
        return { redirectUrl: res.data.payment_url, gatewayRef: parseInvoiceId(res.data.payment_url) };
    },
    async confirm(creds, gatewayRef) {
        const res = await axios.post(`${creds.baseUrl}/v1/payment/verify`, { invoiceId: gatewayRef }, { headers: authHeaders(creds), timeout: 15_000 });
        if (res.data.status === "COMPLETED")
            return { status: "PAID", amount: res.data.amount };
        if (res.data.status === "FAILED")
            return { status: "FAILED" };
        return { status: "PENDING" };
    },
};
