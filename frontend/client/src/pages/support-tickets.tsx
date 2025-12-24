import { useState } from "react";
import { HelpCircle, Plus, Clock, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: string;
}

export default function SupportTickets() {
  const [tickets] = useState<SupportTicket[]>([]);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Support & Help</h1>
          <p className="text-muted-foreground">Track your support requests</p>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-4 h-4" /> New Ticket
          </Button>
        </div>

        {showForm && (
          <Card className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <input
                type="text"
                placeholder="Describe your issue"
                className="w-full p-2 border rounded mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                placeholder="Provide details..."
                className="w-full p-2 border rounded mt-1"
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <select className="w-full p-2 border rounded mt-1">
                <option>Login</option>
                <option>Prescription</option>
                <option>Billing</option>
                <option>Appointment</option>
                <option>Other</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button>Submit</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          {tickets.length === 0 ? (
            <Card className="p-8 text-center">
              <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No support tickets yet</p>
            </Card>
          ) : (
            tickets.map((ticket) => (
              <Card key={ticket.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold">{ticket.subject}</p>
                    <p className="text-sm text-muted-foreground">{ticket.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {ticket.status === "open" ? (
                      <Clock className="w-4 h-4 text-amber-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    <span className="text-sm font-medium">{ticket.status}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
