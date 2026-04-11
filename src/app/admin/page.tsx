import { requireAdminUserId } from "@/lib/admin";
import { AdminHealthView } from "@/components/admin/admin-health-view";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminUserId();
  return <AdminHealthView />;
}
