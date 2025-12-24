import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SupportTicket {
  id: string;
  title: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  userEmail: string;
  createdDate: string;
  assignedTo?: string;
}

export default function AdminSupport() {
  const [tickets] = useState<SupportTicket[]>([
    { id: "1", title: "Login issues with email verification", category: "Auth", priority: "high", status: "open", userEmail: "user@example.com", createdDate: "2024-12-02", assignedTo: undefined },
    { id: "2", title: "Prescription not showing in records", category: "Prescriptions", priority: "critical", status: "in_progress", userEmail: "patient@example.com", createdDate: "2024-12-01", assignedTo: "Support Team A" },
    { id: "3", title: "Payment failed during checkout", category: "Billing", priority: "high", status: "in_progress", userEmail: "buyer@example.com", createdDate: "2024-12-01", assignedTo: "Support Team B" },
    { id: "4", title: "Appointment scheduling question", category: "General", priority: "low", status: "resolved", userEmail: "user2@example.com", createdDate: "2024-11-30", assignedTo: "Support Team A" }
  ]);

  const stats = {
    openTickets: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    avgResolutionTime: "2.5 hours"
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Support Dashboard</h1>
          <p className="text-muted-foreground">Manage user support tickets and issues</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Open Tickets</p>
            <p className="text-3xl font-bold text-blue-600">{stats.openTickets}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-3xl font-bold text-purple-600">{stats.inProgress}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Resolved</p>
            <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Avg Resolution</p>
            <p className="text-3xl font-bold">{stats.avgResolutionTime}</p>
          </Card>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Tickets</TabsTrigger>
            <TabsTrigger value="open">Open ({stats.openTickets})</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress ({stats.inProgress})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Ticket ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Title</th>
                      <th className="px-4 py-3 text-left font-semibold">Category</th>
                      <th className="px-4 py-3 text-left font-semibold">Priority</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Assigned To</th>
                      <th className="px-4 py-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3 font-mono text-sm">#{ticket.id}</td>
                        <td className="px-4 py-3 font-medium">{ticket.title}</td>
                        <td className="px-4 py-3 text-sm">{ticket.category}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(ticket.priority)}`}>{ticket.priority.toUpperCase()}</span></td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}>{ticket.status.replace('_', ' ').toUpperCase()}</span></td>
                        <td className="px-4 py-3 text-sm">{ticket.assignedTo || "Unassigned"}</td>
                        <td className="px-4 py-3 flex gap-2">
                          <Button size="sm" variant="outline">View</Button>
                          <Button size="sm" variant="ghost"><Trash2 className="w-4 h-4" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="open">
            <Card className="p-4"><p className="text-muted-foreground">Open tickets: {stats.openTickets}</p></Card>
          </TabsContent>

          <TabsContent value="in_progress">
            <Card className="p-4"><p className="text-muted-foreground">In progress: {stats.inProgress}</p></Card>
          </TabsContent>

          <TabsContent value="resolved">
            <Card className="p-4"><p className="text-muted-foreground">Resolved: {stats.resolved}</p></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
