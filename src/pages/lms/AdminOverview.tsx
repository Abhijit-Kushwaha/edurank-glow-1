import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, School, ClipboardCheck } from "lucide-react";

export default function AdminOverview() {
  const statCards = [
    { label: "Teachers", value: 0, icon: GraduationCap, color: "text-secondary" },
    { label: "Students", value: 0, icon: Users, color: "text-success" },
    { label: "Classrooms", value: 0, icon: School, color: "text-primary" },
    { label: "Pending Approvals", value: 0, icon: ClipboardCheck, color: "text-accent" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your department</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Getting Started</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Manage teachers, students, and classrooms within your department scope.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
