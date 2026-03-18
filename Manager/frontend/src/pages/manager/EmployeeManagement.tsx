import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/modules/auth/supabaseClient";

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

type TeamEmployee = {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  created_at?: string | null;
};

type ProfileRoleRow = {
  idProfile: string;
  idRol: number | string;
};

type RoleRow = {
  id: number | string;
  Role: string | null;
};

export default function EmployeeManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<TeamEmployee[]>([]);
  const [rolesByUserId, setRolesByUserId] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: auth } = await supabase.auth.getUser();
        const managerId = auth.user?.id;
        if (!managerId) {
          if (mounted) setEmployees([]);
          return;
        }

        let team: TeamEmployee[] = [];

        const rel = await supabase
          .schema(SCHEMA)
          .from("employee_manager_relations")
          .select("employee_id")
          .eq("manager_id", managerId)
          .eq("is_active", true);
        if (rel.error) throw rel.error;
        const ids = Array.from(new Set((rel.data || []).map((r: any) => r.employee_id).filter(Boolean)));
        if (ids.length === 0) {
          if (mounted) {
            setEmployees([]);
            setRolesByUserId({});
          }
          return;
        }

        const profWithCreatedAt = await supabase
          .schema(SCHEMA)
          .from("profiles")
          .select("user_id, first_name, last_name, email, created_at")
          .in("user_id", ids)
          .order("first_name", { ascending: true })
          .order("last_name", { ascending: true });

        if (profWithCreatedAt.error) {
          const msg = String((profWithCreatedAt.error as any)?.message || "");
          if (msg.toLowerCase().includes("created_at")) {
            const profNoCreatedAt = await supabase
              .schema(SCHEMA)
              .from("profiles")
              .select("user_id, first_name, last_name, email")
              .in("user_id", ids)
              .order("first_name", { ascending: true })
              .order("last_name", { ascending: true });
            if (profNoCreatedAt.error) throw profNoCreatedAt.error;
            team = (profNoCreatedAt.data || []) as TeamEmployee[];
          } else {
            throw profWithCreatedAt.error;
          }
        } else {
          team = (profWithCreatedAt.data || []) as TeamEmployee[];
        }

        if (!mounted) return;
        setEmployees(team);

        const profileIds = team.map((t) => t.user_id).filter(Boolean);
        if (profileIds.length === 0) {
          setRolesByUserId({});
          return;
        }

        const prRes = await supabase
          .schema(SCHEMA)
          .from("ProfileRoles")
          .select("idProfile, idRol")
          .in("idProfile", profileIds);

        if (!mounted) return;

        if (prRes.error) {
          setRolesByUserId({});
          return;
        }

        const profileRoles = (prRes.data || []) as ProfileRoleRow[];
        const roleIds = Array.from(new Set(profileRoles.map((r) => r.idRol).filter((v) => v !== null && v !== undefined)));
        if (roleIds.length === 0) {
          setRolesByUserId({});
          return;
        }

        const rolesRes = await supabase
          .schema(SCHEMA)
          .from("Roles")
          .select("id, Role")
          .in("id", roleIds as any);

        if (!mounted) return;

        if (rolesRes.error) {
          setRolesByUserId({});
          return;
        }

        const roleNameById = new Map<string, string>();
        (rolesRes.data as RoleRow[] | null | undefined)?.forEach((r) => {
          const id = r?.id;
          const name = (r?.Role || "").toString().trim();
          if (id === null || id === undefined || !name) return;
          roleNameById.set(String(id), name);
        });

        const map: Record<string, string[]> = {};
        profileRoles.forEach((pr) => {
          const uid = pr.idProfile;
          const roleName = roleNameById.get(String(pr.idRol));
          if (!uid || !roleName) return;
          map[uid] = map[uid] || [];
          if (!map[uid].includes(roleName)) map[uid].push(roleName);
        });
        setRolesByUserId(map);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load employees");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      const name = `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
      const hay = `${name} ${emp.email || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [employees, searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employee Management</h1>
        <p className="text-muted-foreground mt-2">View and manage all employees related to you</p>
      </div>

      <Card className="emp-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>All Employees</CardTitle>
            <CardDescription className="text-right">Total: {employees.length} employees</CardDescription>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading employees…</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-sm text-muted-foreground">No employees found.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 font-semibold">Name</th>
                    <th className="text-left p-4 font-semibold">Email</th>
                    <th className="text-left p-4 font-semibold">Roles</th>
                    <th className="text-left p-4 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredEmployees.map((employee) => {
                    const name = `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.email || employee.user_id;
                    const roles = rolesByUserId[employee.user_id] || [];

                    return (
                      <tr key={employee.user_id} className="hover:bg-muted/50">
                        <td className="p-4 font-medium">{name}</td>
                        <td className="p-4 text-muted-foreground">{employee.email || "—"}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {roles.length > 0 ? (
                              roles.map((role) => (
                                <Badge key={role} variant="outline">
                                  {role}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {employee.created_at ? new Date(employee.created_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
