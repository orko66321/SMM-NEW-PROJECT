import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCategories, getServices, placeOrder } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

interface ServiceItem {
  id: string;
  name: string;
  categoryId: string;
  sellPricePer1000: string;
  minQuantity: number;
  maxQuantity: number;
  refillEnabled: boolean;
  cancelEnabled: boolean;
}

export default function NewOrder() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const [categoryId, setCategoryId] = useState<string>("");
  const { data: servicesData } = useQuery({
    queryKey: ["services", categoryId],
    queryFn: () => getServices({ page: 1, pageSize: 100, categoryId: categoryId || undefined }),
  });

  const services: ServiceItem[] = useMemo(() => servicesData?.items ?? [], [servicesData]);
  const [serviceId, setServiceId] = useState<string>(searchParams.get("serviceId") ?? "");
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const estimatedCharge = useMemo(() => {
    if (!selectedService || !quantity) return "0.00";
    return ((Number(selectedService.sellPricePer1000) * Number(quantity)) / 1000).toFixed(4);
  }, [selectedService, quantity]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedService || !quantity) return;
    if (quantity < selectedService.minQuantity || quantity > selectedService.maxQuantity) {
      setError(`Quantity must be between ${selectedService.minQuantity} and ${selectedService.maxQuantity}`);
      return;
    }
    setSubmitting(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      await placeOrder({ serviceId: selectedService.id, link, quantity: Number(quantity) }, idempotencyKey);
      toast.push("Order placed successfully!", "success");
      setLink("");
      setQuantity("");
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to place order"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <form onSubmit={onSubmit} className="card space-y-4 lg:col-span-2">
        <h1 className="text-xl font-bold">New Order</h1>
        {error && <p className="rounded-md bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}

        <div>
          <label className="label" htmlFor="category">Category</label>
          <select
            id="category"
            className="input-field"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setServiceId("");
            }}
          >
            <option value="">All categories</option>
            {categories?.map((c: { id: string; name: string; platform: string }) => (
              <option key={c.id} value={c.id}>{c.platform} — {c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="service">Service</label>
          <select id="service" className="input-field" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
            <option value="" disabled>Select a service…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — ${s.sellPricePer1000}/1000</option>
            ))}
          </select>
          {selectedService && (
            <div className="mt-2 flex gap-2">
              {selectedService.refillEnabled && <span className="badge bg-success/15 text-success">Refill</span>}
              {!selectedService.cancelEnabled && <span className="badge bg-outline-variant/40 text-on-surface-variant">No Cancel</span>}
            </div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="link">Link</label>
          <input
            id="link"
            className="input-field"
            placeholder="https://instagram.com/yourprofile"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="quantity">
            Quantity {selectedService && <span className="normal-case text-on-surface-variant">(Min: {selectedService.minQuantity} / Max: {selectedService.maxQuantity})</span>}
          </label>
          <input
            id="quantity"
            type="number"
            className="input-field"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : "")}
            min={selectedService?.minQuantity}
            max={selectedService?.maxQuantity}
            required
          />
        </div>

        <div className="flex items-center justify-between rounded-md bg-surface-container-high px-4 py-3">
          <span className="text-sm text-on-surface-variant">Estimated charge</span>
          <span className="font-mono text-lg font-semibold text-success">${estimatedCharge}</span>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting || !selectedService}>
          {submitting ? "Placing order…" : "Place Order"}
        </button>
      </form>

      <aside className="card space-y-3 text-sm text-on-surface-variant">
        <h2 className="font-semibold text-on-surface">Important</h2>
        <p>Prices are always calculated by the server at order time — the estimate above is indicative only.</p>
        <p><strong className="text-on-surface">Refill</strong>: eligible for a free refill if the count drops within the refill window.</p>
        <p><strong className="text-on-surface">No Cancel</strong>: once started, this order cannot be canceled for a refund.</p>
        <p>অর্ডার করার আগে লিংক ও কোয়ান্টিটি ভালোভাবে চেক করে নিন। ভুল লিংকে অর্ডার করলে রিফান্ড দেওয়া সম্ভব নয়।</p>
      </aside>
    </div>
  );
}
