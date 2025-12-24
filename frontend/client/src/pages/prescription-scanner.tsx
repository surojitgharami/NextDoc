import { useState, useCallback } from "react";
import { useDropzone, DropzoneOptions } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText, Copy, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OCRLine {
  text: string;
  confidence: number;
  box?: {
    top_left: number[];
    top_right: number[];
    bottom_right: number[];
    bottom_left: number[];
  };
}

interface OCRResult {
  success: boolean;
  text: string;
  lines: OCRLine[];
  confidence: number;
  processing_time_ms: number;
}

export default function PrescriptionScanner() {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [copied, setCopied] = useState(false);

  const scanMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/scan/prescription", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to scan prescription");
      }
      
      return response.json() as Promise<OCRResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Scan Complete",
        description: `Extracted ${data.lines.length} lines of text`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Scan Failed",
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

  const handleScan = () => {
    if (selectedImage) {
      scanMutation.mutate(selectedImage);
    }
  };

  const handleCopyText = () => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied",
        description: "Text copied to clipboard",
      });
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto px-4 py-8 pb-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Prescription Scanner</h1>
          <p className="text-muted-foreground">
            Upload a prescription image to extract text using AI-powered OCR
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Image
              </CardTitle>
              <CardDescription>
                Supported formats: JPEG, PNG, WebP (max 10MB)
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
                      alt="Selected prescription"
                      className="max-h-64 mx-auto rounded-lg shadow-md"
                    />
                    <p className="text-sm text-muted-foreground">
                      {selectedImage?.name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {isDragActive
                          ? "Drop the image here"
                          : "Drag & drop or click to upload"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload a clear photo of your prescription
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleScan}
                  disabled={!selectedImage || scanMutation.isPending}
                  className="flex-1"
                >
                  {scanMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Scan Prescription
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
                <FileText className="w-5 h-5" />
                Extracted Text
              </CardTitle>
              {result && (
                <CardDescription className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                      result.confidence > 0.8
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : result.confidence > 0.5
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {result.confidence > 0.8 ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    {(result.confidence * 100).toFixed(0)}% confidence
                  </span>
                  <span className="text-xs">
                    {result.processing_time_ms.toFixed(0)}ms
                  </span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {scanMutation.isPending ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Processing image...</p>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {result.text || "No text detected"}
                    </pre>
                  </div>

                  {result.text && (
                    <Button
                      variant="outline"
                      onClick={handleCopyText}
                      className="w-full"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Text
                        </>
                      )}
                    </Button>
                  )}

                  {result.lines.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Line Details</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {result.lines.map((line, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-start text-sm p-2 bg-muted/30 rounded"
                          >
                            <span className="flex-1">{line.text}</span>
                            <span
                              className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                                line.confidence > 0.9
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {(line.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <FileText className="w-12 h-12 mb-4 opacity-50" />
                  <p>Upload and scan a prescription to see results</p>
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
                <p className="font-medium text-foreground mb-1">Important Notice</p>
                <p>
                  This tool is for convenience only. Always verify extracted text
                  with your original prescription and consult your healthcare
                  provider for any medical decisions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
