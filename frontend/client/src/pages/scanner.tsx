import { useState } from "react";
import { useUser } from "@/context/auth-context";
import { ArrowLeft, Upload, Image as ImageIcon, FileText, Zap, Clock, Archive } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Scanner() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const [selectedTab, setSelectedTab] = useState("recent");

  const sampleScans = [
    { id: 1, type: "X-Ray", date: "2025-11-15", thumbnail: "/api/placeholder/100/100", color: "from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-900" },
    { id: 2, type: "MRI", date: "2025-11-10", thumbnail: "/api/placeholder/100/100", color: "from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-900" },
    { id: 3, type: "CT Scan", date: "2025-11-05", thumbnail: "/api/placeholder/100/100", color: "from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-900" },
  ];

  const tabIcons = {
    recent: Clock,
    all: Archive,
    favorite: Zap
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header className="sticky top-0 z-10 border-b bg-gradient-to-r from-background to-background/95 backdrop-blur-sm px-4 py-3 flex items-center gap-4 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/dashboard")}
          className="rounded-xl hover:bg-primary/10 transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold flex-1">Medical Reports</h1>
      </header>

      <div className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-8">
        {/* Upload Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/95 via-primary/90 to-primary/85 text-primary-foreground">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          </div>
          <div className="relative p-10 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-xl">
              <Upload className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Upload Medical Report</h2>
              <p className="text-base text-primary-foreground/90 max-w-md mx-auto leading-relaxed">
                Scan X-Rays, MRI, CT scans, or blood reports for AI-powered medical analysis
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button 
                size="lg"
                className="bg-white text-primary hover:bg-white/90 shadow-lg font-semibold"
                data-testid="button-take-photo"
              >
                <ImageIcon className="w-5 h-5 mr-2" />
                Take Photo
              </Button>
              <Button 
                size="lg"
                variant="outline" 
                className="border-2 border-white/50 text-white hover:bg-white/20 backdrop-blur-sm font-semibold"
                data-testid="button-upload-file"
              >
                <FileText className="w-5 h-5 mr-2" />
                Upload File
              </Button>
            </div>
          </div>
        </Card>

        {/* Scans Section */}
        <div className="space-y-4">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl h-12">
              {['recent', 'all', 'favorite'].map((tab) => {
                const IconComponent = tabIcons[tab as keyof typeof tabIcons];
                return (
                  <TabsTrigger 
                    key={tab}
                    value={tab}
                    className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 font-medium flex items-center gap-2"
                    data-testid={`tab-${tab}`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="capitalize">{tab}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={selectedTab} className="mt-6 space-y-4">
              {sampleScans.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">No scans uploaded yet</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Start by uploading your first medical report</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {sampleScans.map((scan) => (
                    <Card 
                      key={scan.id}
                      className={`p-4 cursor-pointer hover-elevate active-elevate-2 border-0 shadow-sm transition-all duration-300 bg-gradient-to-br ${scan.color} group`}
                      data-testid={`scan-${scan.id}`}
                    >
                      <div className="aspect-square bg-white/30 dark:bg-white/10 rounded-xl mb-3 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                        <FileText className="w-8 h-8 text-foreground/60" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-sm text-foreground truncate">{scan.type}</p>
                        <p className="text-xs text-foreground/60">{scan.date}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
