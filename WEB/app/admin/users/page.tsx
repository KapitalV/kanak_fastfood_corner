import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDataPage } from "@/components/admin/data-page";
export default function AdminUsersPage() { return <AdminShell><AdminDataPage config={{ table: "profiles", title: "Users", columns: ["name", "email", "role", "is_active", "created_at"] }} /></AdminShell>; }
