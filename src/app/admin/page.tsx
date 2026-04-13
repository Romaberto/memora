import { requireAdminUserId } from "@/lib/admin";
import { AdminPanel } from "@/components/admin/admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminUserId();
  return <AdminPanel />;
}
