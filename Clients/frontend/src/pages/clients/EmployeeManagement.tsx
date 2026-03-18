import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  roles: string[];
}

export default function EmployeeManagement() {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock employee data for demonstration
  const employees: Employee[] = [
    {
      id: "1",
      first_name: "Sarah",
      last_name: "Johnson",
      email: "sarah.johnson@company.com",
      created_at: "2024-01-15T10:00:00Z",
      roles: ["employee"]
    },
    {
      id: "2",
      first_name: "Michael",
      last_name: "Chen",
      email: "michael.chen@company.com",
      created_at: "2024-02-20T10:00:00Z",
      roles: ["employee", "admin"]
    },
    {
      id: "3",
      first_name: "Emily",
      last_name: "Rodriguez",
      email: "emily.rodriguez@company.com",
      created_at: "2024-03-10T10:00:00Z",
      roles: ["employee"]
    },
    {
      id: "4",
      first_name: "James",
      last_name: "Williams",
      email: "james.williams@company.com",
      created_at: "2024-04-05T10:00:00Z",
      roles: ["employee", "company"]
    },
    {
      id: "5",
      first_name: "Lisa",
      last_name: "Anderson",
      email: "lisa.anderson@company.com",
      created_at: "2024-05-12T10:00:00Z",
      roles: ["employee"]
    },
    {
      id: "6",
      first_name: "David",
      last_name: "Martinez",
      email: "david.martinez@company.com",
      created_at: "2024-06-08T10:00:00Z",
      roles: ["employee"]
    },
    {
      id: "7",
      first_name: "Jennifer",
      last_name: "Taylor",
      email: "jennifer.taylor@company.com",
      created_at: "2024-07-22T10:00:00Z",
      roles: ["employee"]
    },
    {
      id: "8",
      first_name: "Robert",
      last_name: "Brown",
      email: "robert.brown@company.com",
      created_at: "2024-08-30T10:00:00Z",
      roles: ["employee", "admin"]
    }
  ];

  const filteredEmployees = employees.filter(emp =>
    `${emp.first_name} ${emp.last_name} ${emp.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employee Management</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all employees in your organization
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardDescription>
            Total: {employees.length} employees
          </CardDescription>
          <div className="relative">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">
                    {employee.first_name} {employee.last_name}
                  </TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {employee.roles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(employee.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}