import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-20">
      <Card className="w-full text-center">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          The page you are looking for does not exist or you do not have access.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button type="button">Go home</Button>
        </Link>
      </Card>
    </div>
  );
}
