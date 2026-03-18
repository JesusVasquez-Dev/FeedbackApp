import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Manager {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string;
  companies: { name: string }[];
  employee_count: number;
}

export default function ManagerList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      setLoading(true);

      // Get all users with manager role
      const { data: managerRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "manager");

      if (rolesError) throw rolesError;

      const managerIds = managerRoles?.map((r) => r.user_id) || [];

      if (managerIds.length === 0) {
        setManagers([]);
        return;
      }

      // Get profiles for managers
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, created_at")
        .in("id", managerIds);

      if (profilesError) throw profilesError;

      // Get company assignments for each manager
      const managersWithDetails = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get companies this manager works with
          const { data: companyData } = await supabase
            .from("manager_employees")
            .select("company_id, companies(name)")
            .eq("manager_id", profile.id);

          // Get count of employees managed
          const { count } = await supabase
            .from("manager_employees")
            .select("*", { count: "exact", head: true })
            .eq("manager_id", profile.id);

          const uniqueCompanies = Array.from(
            new Map(
              (companyData || []).map((item: any) => [
                item.company_id,
                { name: item.companies?.name || "Unknown" },
              ])
            ).values()
          );

          return {
            ...profile,
            companies: uniqueCompanies,
            employee_count: count || 0,
          };
        })
      );

      setManagers(managersWithDetails);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredManagers = managers.filter(
    (manager) =>
      manager.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manager.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manager.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="emp-card p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Manager List</h2>
          <p className="text-muted-foreground">
            View and manage all managers in the system
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search managers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading managers...
          </div>
        ) : filteredManagers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No managers found
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4 font-semibold">Name</th>
                  <th className="text-left p-4 font-semibold">Email</th>
                  <th className="text-left p-4 font-semibold">Companies</th>
                  <th className="text-left p-4 font-semibold">Employees</th>
                  <th className="text-left p-4 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredManagers.map((manager) => (
                  <tr key={manager.id} className="hover:bg-muted/50">
                    <td className="p-4">
                      {manager.first_name} {manager.last_name}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {manager.email}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {manager.companies.length > 0 ? (
                          manager.companies.map((company, idx) => (
                            <Badge key={idx} variant="secondary">
                              {company.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No companies
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{manager.employee_count}</Badge>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(manager.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
