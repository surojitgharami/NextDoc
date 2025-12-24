import { useState } from "react";
import { useUser } from "@/context/auth-context";
import { Droplet, Heart, Zap, Flame, Clock, Footprints, Weight, Thermometer, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Metric {
  id: string;
  key: 'bloodPressure' | 'heartRate' | 'bloodGlucose' | 'caloriesBurned' | 'sleep' | 'steps' | 'bmi' | 'temperature';
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  value: string;
  unit: string;
  placeholder: string;
}

export default function HealthMonitoring() {
  const { user } = useUser();
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  const [metrics, setMetrics] = useState<Record<string, string>>({
    bloodPressure: '120/80',
    heartRate: '90',
    bloodGlucose: '146',
    caloriesBurned: '1200',
    sleep: '09:15:00',
    steps: '6000',
    bmi: '20',
    temperature: '97.7',
  });

  const metricsConfig: Metric[] = [
    {
      id: '1',
      key: 'bloodPressure',
      label: 'Blood Pressure',
      icon: <Droplet className="w-6 h-6" />,
      bgColor: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
      textColor: 'text-blue-500',
      value: metrics.bloodPressure,
      unit: 'mmHg',
      placeholder: '120/80',
    },
    {
      id: '2',
      key: 'heartRate',
      label: 'Heart Rate',
      icon: <Heart className="w-6 h-6" />,
      bgColor: 'from-red-50 to-red-100 dark:from-red-950 dark:to-red-900',
      textColor: 'text-red-500',
      value: metrics.heartRate,
      unit: 'BPM',
      placeholder: '90',
    },
    {
      id: '3',
      key: 'bloodGlucose',
      label: 'Blood Glucose',
      icon: <Zap className="w-6 h-6" />,
      bgColor: 'from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900',
      textColor: 'text-yellow-500',
      value: metrics.bloodGlucose,
      unit: 'mg/dL',
      placeholder: '146',
    },
    {
      id: '4',
      key: 'caloriesBurned',
      label: 'Calories (Burned)',
      icon: <Flame className="w-6 h-6" />,
      bgColor: 'from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900',
      textColor: 'text-orange-500',
      value: metrics.caloriesBurned,
      unit: 'cal',
      placeholder: '1200',
    },
    {
      id: '5',
      key: 'sleep',
      label: 'Sleep',
      icon: <Clock className="w-6 h-6" />,
      bgColor: 'from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900',
      textColor: 'text-purple-500',
      value: metrics.sleep,
      unit: 'HH:MM:SS',
      placeholder: '09:15:00',
    },
    {
      id: '6',
      key: 'steps',
      label: 'Steps',
      icon: <Footprints className="w-6 h-6" />,
      bgColor: 'from-green-50 to-green-100 dark:from-green-950 dark:to-green-900',
      textColor: 'text-green-500',
      value: metrics.steps,
      unit: 'steps',
      placeholder: '6000',
    },
    {
      id: '7',
      key: 'bmi',
      label: 'BMI',
      icon: <Weight className="w-6 h-6" />,
      bgColor: 'from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900',
      textColor: 'text-indigo-500',
      value: metrics.bmi,
      unit: 'kg/m²',
      placeholder: '20',
    },
    {
      id: '8',
      key: 'temperature',
      label: 'Temperature',
      icon: <Thermometer className="w-6 h-6" />,
      bgColor: 'from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900',
      textColor: 'text-cyan-500',
      value: metrics.temperature,
      unit: '°F',
      placeholder: '97.7',
    },
  ];

  const handleMetricEdit = (metric: Metric) => {
    setEditingMetric(metric.key);
    setEditValue(metric.value);
  };

  const handleMetricSave = () => {
    if (editingMetric && editValue) {
      setMetrics(prev => ({
        ...prev,
        [editingMetric]: editValue
      }));
      setEditingMetric(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Health Monitoring</h1>
          <p className="text-muted-foreground text-sm">Track and manage your vital health metrics</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metricsConfig.map((metric) => (
            <div
              key={metric.id}
              className={`bg-gradient-to-br ${metric.bgColor} rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => handleMetricEdit(metric)}
              data-testid={`card-metric-${metric.key}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={metric.textColor}>
                  {metric.icon}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMetricEdit(metric);
                  }}
                  className="p-1 opacity-0 hover:opacity-100 transition-opacity"
                  data-testid={`button-edit-${metric.key}`}
                >
                  <Edit2 className={`w-4 h-4 ${metric.textColor}`} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.unit}</p>
              </div>
            </div>
          ))}
        </div>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Overview</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Latest Update</p>
              <p className="font-medium">{new Date().toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium text-green-600">All metrics tracked</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Edit Metric Dialog */}
      <Dialog open={editingMetric !== null} onOpenChange={(open) => !open && setEditingMetric(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMetric && metricsConfig.find(m => m.key === editingMetric)?.label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metric-input">
                {editingMetric && metricsConfig.find(m => m.key === editingMetric)?.unit}
              </Label>
              <Input
                id="metric-input"
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={editingMetric ? metricsConfig.find(m => m.key === editingMetric)?.placeholder : ''}
                data-testid="input-metric-edit"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMetric(null)}>
              Cancel
            </Button>
            <Button onClick={handleMetricSave} data-testid="button-save-metric">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
