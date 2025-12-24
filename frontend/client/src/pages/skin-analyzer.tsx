import { useState, useCallback } from "react";
import { useDropzone, DropzoneOptions } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, Scan, Trash2, AlertTriangle, CheckCircle2, Info, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SkinPrediction {
  label: string;
  confidence: number;
}

interface SkinAnalysisResult {
  success: boolean;
  prediction: string;
  confidence: number;
  all_predictions: SkinPrediction[];
  processing_time_ms: number;
  recommendation: string;
}

export default function SkinAnalyzer() {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<SkinAnalysisResult | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/scan/skin", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to analyze skin");
      }
      
      return response.json() as Promise<SkinAnalysisResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Analysis Complete",
        description: "Skin analysis has been completed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setResult(null);
    }
  }, []);

  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  };
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneOptions);

  const handleAnalyze = () => {
    if (selectedImage) {
      analyzeMutation.mutate(selectedImage);
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
  };

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.7) return { text: "High", color: "text-green-600", bg: "bg-green-500" };
    if (confidence >= 0.4) return { text: "Moderate", color: "text-yellow-600", bg: "bg-yellow-500" };
    return { text: "Low", color: "text-red-600", bg: "bg-red-500" };
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto px-4 py-8 pb-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Scan className="w-8 h-8 text-primary" />
            Skin Analyzer
          </h1>
          <p className="text-muted-foreground">
            Upload a photo of a skin concern for AI-powered preliminary analysis
          </p>
        </div>

        <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                  Important Medical Disclaimer
                </p>
                <p className="text-amber-700 dark:text-amber-300">
                  This tool provides AI-based analysis for informational purposes only.
                  It is NOT a medical diagnosis. Always consult a dermatologist or
                  healthcare provider for proper evaluation and treatment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Image
              </CardTitle>
              <CardDescription>
                Take a clear, well-lit photo of the affected area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Selected skin area"
                      className="max-h-48 mx-auto rounded-lg shadow-md"
                    />
                    <p className="text-sm text-muted-foreground">
                      {selectedImage?.name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Scan className="w-12 h-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {isDragActive
                          ? "Drop the image here"
                          : "Drag & drop or click to upload"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        JPEG, PNG, WebP up to 10MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleAnalyze}
                  disabled={!selectedImage || analyzeMutation.isPending}
                  className="flex-1"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Stethoscope className="w-4 h-4 mr-2" />
                      Analyze Skin
                    </>
                  )}
                </Button>
                {selectedImage && (
                  <Button variant="outline" onClick={handleClear}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                Analysis Results
              </CardTitle>
              {result && (
                <CardDescription>
                  Processed in {result.processing_time_ms.toFixed(0)}ms
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {analyzeMutation.isPending ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Analyzing image...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This may take a few moments
                  </p>
                </div>
              ) : result ? (
                <div className="space-y-6">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Primary Finding</p>
                    <p className="text-xl font-semibold">
                      {result.prediction || "No significant findings"}
                    </p>
                    {result.confidence > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className="text-sm">Confidence:</span>
                          <span
                            className={`text-sm font-medium ${
                              getConfidenceLevel(result.confidence).color
                            }`}
                          >
                            {getConfidenceLevel(result.confidence).text} (
                            {(result.confidence * 100).toFixed(0)}%)
                          </span>
                        </div>
                        <Progress
                          value={result.confidence * 100}
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>

                  {result.recommendation && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                            Recommendation
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            {result.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {result.all_predictions.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">All Detected Conditions</h4>
                      <div className="space-y-2">
                        {result.all_predictions.map((pred, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                          >
                            <span className="capitalize">{pred.label}</span>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={pred.confidence * 100}
                                className="w-24 h-2"
                              />
                              <span className="text-sm text-muted-foreground w-12 text-right">
                                {(pred.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Scan className="w-12 h-12 mb-4 opacity-50" />
                  <p>Upload an image to analyze</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardContent className="pt-6">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Tips for Accurate Analysis
            </h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  Use good, natural lighting
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  Keep the camera close and focused
                </li>
              </ul>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  Include only the affected area
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">4.</span>
                  Avoid shadows or reflections
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
