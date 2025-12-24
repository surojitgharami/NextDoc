import { useState, useCallback } from "react";
import { useDropzone, DropzoneOptions } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Pill, Search, Trash2, AlertCircle, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DetectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  confidence: number;
}

interface DetectionResult {
  success: boolean;
  detections: DetectionBox[];
  count: number;
  annotated_image_base64?: string;
  processing_time_ms: number;
}

export default function PillIdentifier() {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);

  const detectMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/scan/pills?include_annotated=true", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to detect pills");
      }
      
      return response.json() as Promise<DetectionResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Detection Complete",
        description: `Found ${data.count} pill(s) in the image`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Detection Failed",
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

  const handleDetect = () => {
    if (selectedImage) {
      detectMutation.mutate(selectedImage);
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.5) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto px-4 py-8 pb-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Pill className="w-8 h-8 text-primary" />
            Pill Identifier
          </h1>
          <p className="text-muted-foreground">
            Upload an image of pills to identify and detect medicines using AI
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Image
              </CardTitle>
              <CardDescription>
                Take a clear photo of pills on a plain background
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
                      alt="Selected pills"
                      className="max-h-48 mx-auto rounded-lg shadow-md"
                    />
                    <p className="text-sm text-muted-foreground">
                      {selectedImage?.name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Pill className="w-12 h-12 mx-auto text-muted-foreground" />
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
                  onClick={handleDetect}
                  disabled={!selectedImage || detectMutation.isPending}
                  className="flex-1"
                >
                  {detectMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Identify Pills
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
                <ImageIcon className="w-5 h-5" />
                Detection Results
              </CardTitle>
              {result && (
                <CardDescription>
                  Found {result.count} pill(s) in {result.processing_time_ms.toFixed(0)}ms
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {detectMutation.isPending ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Analyzing image...</p>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  {result.annotated_image_base64 && (
                    <div className="rounded-lg overflow-hidden border">
                      <img
                        src={`data:image/png;base64,${result.annotated_image_base64}`}
                        alt="Annotated result"
                        className="w-full"
                      />
                    </div>
                  )}

                  {result.detections.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="font-medium">Detected Pills</h4>
                      {result.detections.map((detection, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-3 h-3 rounded-full ${getConfidenceColor(
                                detection.confidence
                              )}`}
                            />
                            <span className="font-medium capitalize">
                              {detection.label}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {(detection.confidence * 100).toFixed(1)}% confidence
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <Pill className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No pills detected in the image</p>
                      <p className="text-sm mt-1">
                        Try uploading a clearer image with better lighting
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Search className="w-12 h-12 mb-4 opacity-50" />
                  <p>Upload an image to identify pills</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Medical Disclaimer</p>
                <p>
                  This tool provides AI-based identification for informational purposes only.
                  It is not a substitute for professional medical advice. Always consult a
                  pharmacist or healthcare provider for accurate medication identification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="pt-6">
            <h4 className="font-medium mb-3">Tips for Best Results</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">1.</span>
                Place pills on a plain white or light background
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">2.</span>
                Ensure good lighting with no shadows
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">3.</span>
                Keep the camera steady and focused
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">4.</span>
                Capture both sides of the pill if possible
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
