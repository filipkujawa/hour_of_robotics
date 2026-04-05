import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-10 sm:px-8">
        <Card className="p-8">
          <div className="text-sm uppercase tracking-[0.18em] text-primary">Settings</div>
          <h1 className="mt-3 font-display text-5xl tracking-tight text-text">Profile</h1>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-sm text-muted">Display name</div>
              <div className="mt-2 text-lg font-medium text-text">Demo Student</div>
            </div>
            <div>
              <div className="text-sm text-muted">Role</div>
              <div className="mt-2">
                <Badge className="border-primary/10 bg-tintSoft text-primary">student</Badge>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted">Email</div>
              <div className="mt-2 text-lg font-medium text-text">student@example.com</div>
            </div>
            <div>
              <div className="text-sm text-muted">Access</div>
              <div className="mt-2 text-lg font-medium text-text">Sequential unlocks enabled</div>
            </div>
          </div>
          <p className="mt-8 text-sm leading-7 text-muted">
            Teacher dashboards, class management, and richer profile editing land here later.
          </p>
          {/* TODO: Teacher dashboard links and classroom management surface plug in here later. */}
        </Card>
      </div>
    </AppShell>
  );
}
