import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Calendar, DollarSign, FileText, Download } from "lucide-react";

interface StaffingEntry {
  id: string;
  name: string;
  type: "contractor" | "temp" | "agency";
  startDate: string;
  endDate: string;
  rate: string;
  agency?: string;
  status: "active" | "ending-soon" | "inactive";
}

interface Invoice {
  id: string;
  date: string;
  amount: string;
  period: string;
  status: "paid" | "pending" | "upcoming";
}

export default function StaffingManagement() {
  const [selectedStaff, setSelectedStaff] = useState<StaffingEntry | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [staffing] = useState<StaffingEntry[]>([
    {
      id: "1",
      name: "Ahmed Hassan",
      type: "contractor",
      startDate: "2025-01-15",
      endDate: "2025-06-15",
      rate: "$85/hr",
      status: "active"
    },
    {
      id: "2",
      name: "John Park",
      type: "temp",
      startDate: "2025-02-01",
      endDate: "2025-04-30",
      rate: "$65/hr",
      status: "ending-soon"
    },
    {
      id: "3",
      name: "Lisa Martinez",
      type: "agency",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      rate: "$95/hr",
      agency: "TechStaff Pro",
      status: "active"
    },
    {
      id: "4",
      name: "David Chen",
      type: "contractor",
      startDate: "2024-09-01",
      endDate: "2025-03-01",
      rate: "$90/hr",
      status: "ending-soon"
    }
  ]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "contractor":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "temp":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "agency":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "ending-soon":
        return "bg-yellow-500";
      case "inactive":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  const activeCount = staffing.filter(s => s.status === "active").length;
  const endingSoon = staffing.filter(s => s.status === "ending-soon").length;
  const contractorCount = staffing.filter(s => s.type === "contractor").length;

  const getMockInvoices = (staffId: string): Invoice[] => {
    return [
      {
        id: `inv-${staffId}-1`,
        date: "2025-02-15",
        amount: "$13,600",
        period: "Feb 1-15, 2025",
        status: "paid"
      },
      {
        id: `inv-${staffId}-2`,
        date: "2025-01-31",
        amount: "$13,600",
        period: "Jan 16-31, 2025",
        status: "paid"
      },
      {
        id: `inv-${staffId}-3`,
        date: "2025-01-15",
        amount: "$13,600",
        period: "Jan 1-15, 2025",
        status: "paid"
      }
    ];
  };

  const getUpcomingInvoice = (staff: StaffingEntry): Invoice => {
    return {
      id: `inv-${staff.id}-upcoming`,
      date: "2025-03-15",
      amount: "$13,600",
      period: "Mar 1-15, 2025",
      status: "upcoming"
    };
  };

  const handleStaffClick = (staff: StaffingEntry) => {
    setSelectedStaff(staff);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Team</h1>
          <p className="text-muted-foreground mt-2">
            Manage contractors, temporary staff, and agency workers
          </p>
        </div>
        <Button className="emp-btn-inline">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="emp-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently working</p>
          </CardContent>
        </Card>

        <Card className="emp-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Ending Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{endingSoon}</div>
            <p className="text-xs text-muted-foreground mt-1">Contracts expiring</p>
          </CardContent>
        </Card>

        <Card className="emp-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contractors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{contractorCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Independent workers</p>
          </CardContent>
        </Card>

        <Card className="emp-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Avg Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$84</div>
            <p className="text-xs text-muted-foreground mt-1">Per hour</p>
          </CardContent>
        </Card>
      </div>

      <Card className="emp-card">
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
          <CardDescription>All contractors, temps, and agency workers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {staffing.map((staff) => (
              <div
                key={staff.id}
                className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                onClick={() => handleStaffClick(staff)}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{staff.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(staff.startDate).toLocaleDateString()} - {" "}
                    {new Date(staff.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`${getTypeColor(staff.type)} min-w-[96px] text-center px-3 py-1 text-xs capitalize`}>
                    {staff.type}
                  </Badge>
                  <span className="text-sm font-semibold">{staff.rate}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedStaff && (
        <Card className="emp-card mt-4">
          <CardHeader>
            <CardTitle className="text-2xl">{selectedStaff.name}</CardTitle>
            <CardDescription>Staff member details and invoicing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge className={`${getTypeColor(selectedStaff.type)} min-w-[96px] text-center px-3 py-1 text-xs capitalize`}>
                  {selectedStaff.type}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Start Date</span>
                <span className="font-medium">{new Date(selectedStaff.startDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">End Date</span>
                <span className="font-medium">{new Date(selectedStaff.endDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Rate</span>
                <span className="font-semibold text-lg">{selectedStaff.rate}</span>
              </div>
              {selectedStaff.agency && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Agency</span>
                  <span className="font-medium">{selectedStaff.agency}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedStaff.status)}`} />
                  <span className="capitalize">{selectedStaff.status.replace("-", " ")}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="emp-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Invoice
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const upcoming = getUpcomingInvoice(selectedStaff);
                    return (
                      <div className="p-4 border rounded-lg bg-muted/30">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-lg">{upcoming.amount}</p>
                            <p className="text-sm text-muted-foreground">{upcoming.period}</p>
                          </div>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Upcoming
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Expected: {new Date(upcoming.date).toLocaleDateString()}
                        </p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card className="emp-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Invoice History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getMockInvoices(selectedStaff.id).map((invoice) => (
                    <div key={invoice.id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{invoice.amount}</p>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Paid
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{invoice.period}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Paid on {new Date(invoice.date).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="emp-btn-inline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
