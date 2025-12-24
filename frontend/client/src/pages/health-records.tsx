import { useState } from "react";
import { Heart, TrendingUp, FileText, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HealthRecord {
  id: string;
  title: string;
  date: string;
  value: string;
}

export default function HealthRecords() {
  const [_records] = useState<HealthRecord[]>([]);

  const tabs = [
    { value: "vitals", label: "Vitals", icon: Heart },
    { value: "records", label: "Records", icon: FileText },
    { value: "conditions", label: "Conditions", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Health Records</h1>
          <p className="text-muted-foreground">Your complete health history</p>
        </div>

        <div className="flex justify-end">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Add Record
          </Button>
        </div>

        <Tabs defaultValue="vitals" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                  <Icon className="w-4 h-4" /> {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="vitals" className="space-y-4">
            {records.length === 0 ? (
              <Card className="p-8 text-center">
                <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No vitals recorded yet</p>
              </Card>
            ) : (
              records.map((record) => (
                <Card key={record.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{record.title}</p>
                      <p className="text-sm text-muted-foreground">{record.date}</p>
                    </div>
                    <p className="font-bold text-lg">{record.value}</p>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="records" className="space-y-4">
            <Card className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No records available</p>
            </Card>
          </TabsContent>

          <TabsContent value="conditions" className="space-y-4">
            <Card className="p-8 text-center">
              <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No conditions recorded</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
