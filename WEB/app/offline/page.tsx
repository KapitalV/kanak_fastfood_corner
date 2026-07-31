import { LinkButton } from "@/components/ui";

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-xl rounded-lg bg-white p-6 text-center ring-1 ring-zinc-200">
      <h1 className="text-2xl font-bold">You are offline</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Kanak Foods can still keep your cart on this device. Reconnect to browse,
        checkout, or receive live order updates.
      </p>
      <LinkButton href="/cart" className="mt-5">
        Open cart
      </LinkButton>
    </div>
  );
}
