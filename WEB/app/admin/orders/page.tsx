import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDataPage } from "@/components/admin/data-page";
export default function AdminOrdersPage() { return <AdminShell><AdminDataPage config={{ table: "orders", title: "Orders", columns: ["id", "order_status", "payment_status", "total_amount", "created_at"] }} /></AdminShell>; }
