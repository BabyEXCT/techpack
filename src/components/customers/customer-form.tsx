"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CustomerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Customer name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          companyName,
          phone,
          email,
          address,
          preferredPaymentMethod,
          deliveryNote,
          notes
        })
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(body?.error ?? `Request failed (${response.status})`);
        return;
      }

      router.push(`/customers/${body.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
      <label className="block space-y-2">
        <span className="text-sm font-medium">Customer name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-md border px-3 py-2"
          placeholder="Aida Sports"
          autoComplete="off"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Company name</span>
          <input
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="Aida Sportswear"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Phone</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="012-3332221"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="customer@email.com"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Preferred payment</span>
          <input
            value={preferredPaymentMethod}
            onChange={(event) => setPreferredPaymentMethod(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="Bank transfer"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Address</span>
        <textarea
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className="min-h-24 w-full rounded-md border px-3 py-2"
          placeholder="Customer address"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Delivery note</span>
        <textarea
          value={deliveryNote}
          onChange={(event) => setDeliveryNote(event.target.value)}
          className="min-h-24 w-full rounded-md border px-3 py-2"
          placeholder="Special delivery instruction"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Notes</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-24 w-full rounded-md border px-3 py-2"
          placeholder="Extra customer notes"
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-black px-4 py-3 text-white disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {isSubmitting ? "Saving..." : "Save customer"}
      </button>
    </form>
  );
}
