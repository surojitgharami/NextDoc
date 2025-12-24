import { useState } from "react";
import { Pill, RefreshCw, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Prescription {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  expiry: string;
  status: string;
}

export default function Prescriptions() {
  const [prescriptions] = useState<Prescription[]>([]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Prescriptions</h1>
          <p className="text-muted-foreground">View and manage your medications</p>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="refills">Refill Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {prescriptions.length === 0 ? (
              <Card className="p-8 text-center">
                <Pill className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active prescriptions</p>
              </Card>
            ) : (
              prescriptions.map((rx) => (
                <Card key={rx.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-lg">{rx.name}</p>
                      <p className="text-sm text-muted-foreground">{rx.dosage}</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      Active
                    </span>
                  </div>
                  <p className="text-sm"><strong>Frequency:</strong> {rx.frequency}</p>
                  <p className="text-sm"><strong>Expires:</strong> {rx.expiry}</p>
                  <Button variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Request Refill
                  </Button>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No prescription history</p>
            </Card>
          </TabsContent>

          <TabsContent value="refills" className="space-y-4">
            <Card className="p-8 text-center">
              <RefreshCw className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No pending refill requests</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
