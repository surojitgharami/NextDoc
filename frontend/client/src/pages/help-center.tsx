import { useState } from "react";
import { ArrowLeft, Phone, Mail, MessageCircle, Send } from "lucide-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FaTwitter, FaInstagram, FaYoutube, FaFacebookF } from "react-icons/fa";

const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function HelpCenter() {
  const [, setLocation] = useLocation();
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      return await apiRequest('POST', '/api/contact/send', data);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "We'll respond to your inquiry within 24 hours.",
      });
      form.reset();
      setIsContactFormOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContactFormData) => {
    sendMessageMutation.mutate(data);
  };

  const socialLinks = [
    { icon: FaTwitter, url: "https://twitter.com", label: "Twitter", color: "bg-blue-400" },
    { icon: FaInstagram, url: "https://instagram.com", label: "Instagram", color: "bg-pink-500" },
    { icon: FaYoutube, url: "https://youtube.com", label: "YouTube", color: "bg-red-600" },
    { icon: FaFacebookF, url: "https://facebook.com", label: "Facebook", color: "bg-blue-600" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background border-b">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/profile")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">Help Center</h1>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* Header Card */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-2">Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any inquiries, get in touch with us. We'll be happy to help you.
            </p>
          </Card>

          {/* Phone Section */}
          <Card className="p-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Phone</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  You can call, text or Whatsapp us on below numbers. Charges will be applied as per your network providers.
                </p>
                <a
                  href="tel:+919008123"
                  className="text-primary font-medium hover:underline"
                  data-testid="link-phone"
                >
                  +91 9008123-10 (-11) (-12)
                </a>
              </div>
            </div>
          </Card>

          {/* Email Section */}
          <Card className="p-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">E-Mail</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  We respond to mails within 24 hours.
                </p>
                <button
                  onClick={() => setIsContactFormOpen(true)}
                  className="text-primary font-medium hover:underline"
                  data-testid="button-open-contact-form"
                >
                  support@NextDoc.com
                </button>
              </div>
            </div>
          </Card>

          {/* Socials Section */}
          <Card className="p-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Socials</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Follow us on our socials to get notified with updates and exciting offers.
                </p>
                <div className="flex gap-3">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-10 h-10 rounded-full ${social.color} flex items-center justify-center text-white hover:opacity-80 transition-opacity`}
                      data-testid={`link-social-${social.label.toLowerCase()}`}
                      aria-label={social.label}
                    >
                      <social.icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Contact Form Dialog */}
      <Dialog open={isContactFormOpen} onOpenChange={setIsContactFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Contact Us!</DialogTitle>
            <DialogDescription>
              We help brands and companies grow and gain a competitive advantage in the connected world
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NAME</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Your name"
                        data-testid="input-contact-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-MAIL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="your.email@example.com"
                        data-testid="input-contact-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PHONE</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="+62 821 1234 1234"
                        data-testid="input-contact-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MESSAGE</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Your message..."
                        className="min-h-[120px]"
                        data-testid="input-contact-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={sendMessageMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4 mr-2" />
                {sendMessageMutation.isPending ? "Sending..." : "SEND MESSAGE"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
