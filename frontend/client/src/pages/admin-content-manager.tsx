import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Save, Eye, EyeOff, Loader2 } from "lucide-react";

interface ContentData {
  content_type: string;
  title: string;
  content: string;
  updated_at: string;
}

export default function ContentManager() {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  
  const [termsData, setTermsData] = useState<ContentData>({
    content_type: "terms",
    title: "",
    content: "",
    updated_at: "",
  });
  
  const [privacyData, setPrivacyData] = useState<ContentData>({
    content_type: "privacy_policy",
    title: "",
    content: "",
    updated_at: "",
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    try {
      // Fetch Terms
      const termsRes = await fetch("/api/content/terms");
      if (termsRes.ok) {
        const termsJson = await termsRes.json();
        setTermsData(termsJson);
      }

      // Fetch Privacy Policy
      const privacyRes = await fetch("/api/content/privacy_policy");
      if (privacyRes.ok) {
        const privacyJson = await privacyRes.json();
        setPrivacyData(privacyJson);
      }
    } catch (error) {
      console.error("Failed to fetch content:", error);
      toast({
        title: "Error",
        description: "Failed to load content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (contentType: "terms" | "privacy_policy") => {
    setSaving(true);
    const data = contentType === "terms" ? termsData : privacyData;

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`/api/content/${contentType}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          title: data.title,
          content: data.content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to save content");
      }

      const updated = await response.json();
      
      if (contentType === "terms") {
        setTermsData(updated);
      } else {
        setPrivacyData(updated);
      }

      toast({
        title: "Success",
        description: `${data.title} has been updated successfully.`,
      });
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderEditor = (
    data: ContentData,
    setData: React.Dispatch<React.SetStateAction<ContentData>>,
    contentType: "terms" | "privacy_policy"
  ) => (
    <div className="space-y-6">
      {/* Title Input */}
      <div className="space-y-2">
        <Label htmlFor={`${contentType}-title`}>Title</Label>
        <Input
          id={`${contentType}-title`}
          value={data.title}
          onChange={(e) => setData({ ...data, title: e.target.value })}
          placeholder="Enter title..."
          className="text-lg font-semibold"
        />
      </div>

      {/* Content Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${contentType}-content`}>Content (Markdown)</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPreview(!preview)}
          >
            {preview ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Edit
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </>
            )}
          </Button>
        </div>

        {preview ? (
          <Card>
            <CardContent className="p-6">
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {data.content}
                </pre>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Textarea
            id={`${contentType}-content`}
            value={data.content}
            onChange={(e) => setData({ ...data, content: e.target.value })}
            placeholder="Enter content in Markdown format..."
            className="min-h-[400px] font-mono text-sm"
          />
        )}
      </div>

      {/* Last Updated */}
      {data.updated_at && (
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date(data.updated_at).toLocaleString()}
        </p>
      )}

      {/* Save Button */}
      <Button
        onClick={() => handleSave(contentType)}
        disabled={saving || !data.title || !data.content}
        className="w-full"
        size="lg"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Content Manager</h1>
        </div>
        <p className="text-muted-foreground">
          Manage Terms & Conditions and Privacy Policy content
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="terms" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="terms">Terms & Conditions</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
        </TabsList>

        {/* Terms & Conditions Tab */}
        <TabsContent value="terms">
          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
              <CardDescription>
                Update the terms and conditions that users must accept when signing up
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderEditor(termsData, setTermsData, "terms")}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Policy Tab */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Policy</CardTitle>
              <CardDescription>
                Update the privacy policy that explains how user data is handled
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderEditor(privacyData, setPrivacyData, "privacy_policy")}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
