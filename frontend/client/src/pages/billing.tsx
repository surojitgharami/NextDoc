import { useState } from "react";
import { DollarSign, FileText, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Invoice {
  id: string;
  title: string;
  date: string;
  amount: number;
  status: string;
}

interface Insurance {
  provider: string;
  policyNumber: string;
}

export default function Billing() {
  const [_invoices] = useState<Invoice[]>([]);
  const [insurance] = useState<Insurance | null>(null);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Billing & Payments</h1>
          <p className="text-muted-foreground">Manage your payments and insurance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold">$0.00</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <FileText className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">$0.00</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <CreditCard className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Insurance</p>
                <p className="text-2xl font-bold">{insurance ? "Active" : "None"}</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-4">
            {invoices.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No invoices yet</p>
              </Card>
            ) : (
              invoices.map((invoice) => (
                <Card key={invoice.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{invoice.title}</p>
                      <p className="text-sm text-muted-foreground">{invoice.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${invoice.amount}</p>
                      <p className="text-sm text-muted-foreground">{invoice.status}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="insurance" className="space-y-4">
            <Card className="p-6 space-y-4">
              {insurance ? (
                <div>
                  <p><strong>Provider:</strong> {insurance.provider}</p>
                  <p><strong>Policy:</strong> {insurance.policyNumber}</p>
                  <p><strong>Status:</strong> Active</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">No insurance information added</p>
                  <Button>Add Insurance</Button>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
