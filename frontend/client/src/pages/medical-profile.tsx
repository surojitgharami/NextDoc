import { useState } from "react";
import { Heart, AlertCircle, Pill, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MedicalHistory {
  id: string;
  condition: string;
  diagnosedDate: string;
  notes: string;
}

interface CurrentCondition {
  id: string;
  name: string;
  status: string;
  ongoingTreatment: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
}

export default function MedicalProfile() {
  const [medicalHistory] = useState<MedicalHistory[]>([
    { id: "1", condition: "Hypertension", diagnosedDate: "2022-05-15", notes: "Controlled with medication" },
    { id: "2", condition: "Diabetes Type 2", diagnosedDate: "2021-03-10", notes: "Regular monitoring required" }
  ]);

  const [currentConditions] = useState<CurrentCondition[]>([
    { id: "1", name: "Hypertension", status: "Active", ongoingTreatment: "Medication + Lifestyle changes" },
    { id: "2", name: "Migraine", status: "Intermittent", ongoingTreatment: "Pain management" }
  ]);

  const [currentMedications] = useState<Medication[]>([
    { id: "1", name: "Lisinopril", dosage: "10mg", frequency: "Once daily" },
    { id: "2", name: "Metformin", dosage: "500mg", frequency: "Twice daily" },
    { id: "3", name: "Aspirin", dosage: "81mg", frequency: "Once daily" }
  ]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Medical Profile</h1>
          <p className="text-muted-foreground">Your complete medical history and current health information</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Heart className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Conditions</p>
                <p className="text-2xl font-bold">{currentConditions.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Pill className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Current Medications</p>
                <p className="text-2xl font-bold">{currentMedications.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Medical History</p>
                <p className="text-2xl font-bold">{medicalHistory.length}</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="conditions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="conditions">Current Conditions</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="history">Medical History</TabsTrigger>
          </TabsList>

          <TabsContent value="conditions" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button className="gap-2" variant="outline">
                <Plus className="w-4 h-4" /> Add Condition
              </Button>
            </div>
            {currentConditions.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No active conditions recorded</p>
              </Card>
            ) : (
              currentConditions.map((condition) => (
                <Card key={condition.id} className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg">{condition.name}</p>
                      <p className="text-sm text-muted-foreground">Status: {condition.status}</p>
                    </div>
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                      Active
                    </span>
                  </div>
                  <p className="text-sm"><strong>Ongoing Treatment:</strong> {condition.ongoingTreatment}</p>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="medications" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button className="gap-2" variant="outline">
                <Plus className="w-4 h-4" /> Add Medication
              </Button>
            </div>
            {currentMedications.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No medications recorded</p>
              </Card>
            ) : (
              currentMedications.map((med) => (
                <Card key={med.id} className="p-4">
                  <div className="space-y-2">
                    <p className="font-semibold text-lg">{med.name}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Dosage</p>
                        <p className="font-medium">{med.dosage}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Frequency</p>
                        <p className="font-medium">{med.frequency}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {medicalHistory.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No medical history recorded</p>
              </Card>
            ) : (
              medicalHistory.map((history) => (
                <Card key={history.id} className="p-4 space-y-2">
                  <p className="font-semibold text-lg">{history.condition}</p>
                  <p className="text-sm text-muted-foreground">Diagnosed: {history.diagnosedDate}</p>
                  <p className="text-sm"><strong>Notes:</strong> {history.notes}</p>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
