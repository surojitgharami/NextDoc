import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck, FileText, Download, Trash2 } from "lucide-react";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    setLocation("/profile");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold" data-testid="text-privacy-title">
            Privacy Policy
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Introduction */}
        <section>
          <p className="text-muted-foreground leading-relaxed">
            At CareBot, we take your privacy seriously. This Privacy Policy explains how we collect, use, 
            protect, and share your personal and health information when you use our healthcare services. 
            We are committed to maintaining the highest standards of data protection and transparency.
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            <strong>Last Updated:</strong> November 20, 2025
          </p>
        </section>

        {/* Data Security */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-3">Data Security & Encryption</h2>
              <p className="text-muted-foreground mb-4">
                Your health data is protected with industry-leading security measures:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span><strong>AES-256 Encryption:</strong> All data is encrypted at rest and in transit using military-grade encryption</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span><strong>HTTPS Connections:</strong> Secure SSL/TLS protocols for all communications</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span><strong>HIPAA Compliance:</strong> Our servers and infrastructure meet healthcare data protection standards</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span><strong>Regular Security Audits:</strong> Third-party penetration testing and vulnerability assessments</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span><strong>Access Controls:</strong> Multi-factor authentication and role-based access for our team</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Data Collection */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-3">What Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Personal Information</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Full name, email address, and phone number</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Date of birth, gender, and profile photo</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Account credentials (securely hashed passwords)</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Health Information</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Symptoms, health concerns, and chat conversations with our AI assistant</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Medical history, allergies, current medications, and chronic conditions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Physical measurements (height, weight, vital signs if provided)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Uploaded medical reports and documents</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Usage Information</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>App usage patterns, feature interactions, and session duration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Device information (type, operating system, browser)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>IP address and general location (city/region level only)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* How We Use Data */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Eye className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-3">How We Use Your Information</h2>
              <p className="text-muted-foreground mb-3">
                We use your information solely to provide and improve our healthcare services:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span><strong>Provide AI Health Assistance:</strong> To answer your health questions and perform symptom analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span><strong>Facilitate Appointments:</strong> To book and manage appointments with healthcare providers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span><strong>Personalize Your Experience:</strong> To remember your health profile and provide tailored recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span><strong>Improve Our Services:</strong> To analyze usage patterns and enhance AI accuracy (anonymized data only)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span><strong>Send Important Notifications:</strong> Appointment reminders, health tips, and account updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span><strong>Comply with Legal Requirements:</strong> When required by law or to protect rights and safety</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Data Sharing */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-3">Data Sharing & Third Parties</h2>
              <div className="space-y-3 text-muted-foreground">
                <p className="font-medium text-foreground">We do NOT sell your personal or health data. Period.</p>
                <p>We only share your information in these limited circumstances:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Healthcare Providers:</strong> With your consent, to facilitate appointments and consultations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Service Providers:</strong> Trusted partners who help operate our platform (cloud hosting, analytics) under strict confidentiality agreements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Legal Requirements:</strong> When required by law enforcement or to comply with legal processes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Emergency Situations:</strong> To protect the health and safety of you or others</span>
                  </li>
                </ul>
                <p className="text-sm pt-2">
                  All third-party partners are contractually required to maintain the same level of data protection 
                  and can only use your data for the specific purposes we authorize.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Your Rights */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-3">Your Privacy Rights</h2>
              <p className="text-muted-foreground mb-3">
                You have complete control over your personal and health information:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Eye className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium mb-1">Right to Access</h3>
                    <p className="text-sm text-muted-foreground">
                      View all personal and health data we have stored about you at any time through your profile settings.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium mb-1">Right to Update</h3>
                    <p className="text-sm text-muted-foreground">
                      Correct or update any inaccurate information in your profile whenever you need.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Download className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium mb-1">Right to Export</h3>
                    <p className="text-sm text-muted-foreground">
                      Download a complete copy of your data in a portable format (JSON or PDF).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium mb-1">Right to Delete</h3>
                    <p className="text-sm text-muted-foreground">
                      Request complete deletion of your account and all associated data. We will permanently remove 
                      your information within 30 days (except data required for legal compliance).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium mb-1">Right to Restrict</h3>
                    <p className="text-sm text-muted-foreground">
                      Limit how we use your data or withdraw consent for specific purposes (like marketing communications).
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                To exercise any of these rights, contact us at{" "}
                <a 
                  href="mailto:privacy@carebot.com" 
                  className="text-primary hover:underline"
                  data-testid="link-privacy-email"
                >
                  privacy@carebot.com
                </a>
              </p>
            </div>
          </div>
        </Card>

        {/* Data Retention */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Data Retention</h2>
          <p className="text-muted-foreground mb-3">
            We retain your information only as long as necessary to provide services and comply with legal obligations:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong>Active Accounts:</strong> Data is retained while your account is active</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong>Inactive Accounts:</strong> After 3 years of inactivity, we will contact you before deleting your data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong>Deleted Accounts:</strong> Most data is permanently deleted within 30 days of account closure</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong>Legal Requirements:</strong> Some records may be retained longer for compliance (e.g., financial records for 7 years)</span>
            </li>
          </ul>
        </Card>

        {/* Children's Privacy */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Children's Privacy</h2>
          <p className="text-muted-foreground">
            CareBot is not intended for children under 13 years of age. We do not knowingly collect personal 
            information from children under 13. If you believe a child has provided us with personal information, 
            please contact us immediately at{" "}
            <a 
              href="mailto:privacy@carebot.com" 
              className="text-primary hover:underline"
              data-testid="link-children-privacy-email"
            >
              privacy@carebot.com
            </a>
            , and we will delete it promptly.
          </p>
        </Card>

        {/* Changes to Policy */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Changes to This Policy</h2>
          <p className="text-muted-foreground">
            We may update this Privacy Policy from time to time to reflect changes in our practices or legal 
            requirements. We will notify you of any material changes by email and prominently posting a notice 
            in the app. Your continued use of CareBot after such changes constitutes acceptance of the updated policy.
          </p>
        </Card>

        {/* Contact */}
        <Card className="p-6 bg-primary/5">
          <h2 className="text-lg font-semibold mb-3">Questions or Concerns?</h2>
          <p className="text-muted-foreground mb-4">
            If you have any questions about this Privacy Policy or how we handle your data, we're here to help:
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Email:</strong>{" "}
              <a 
                href="mailto:privacy@carebot.com" 
                className="text-primary hover:underline"
                data-testid="link-contact-privacy-email"
              >
                privacy@carebot.com
              </a>
            </p>
            <p>
              <strong>Support:</strong>{" "}
              <a 
                href="mailto:support@carebot.com" 
                className="text-primary hover:underline"
                data-testid="link-contact-support-email"
              >
                support@carebot.com
              </a>
            </p>
            <p className="text-muted-foreground pt-2">
              We will respond to all privacy-related inquiries within 48 hours.
            </p>
          </div>
        </Card>

        {/* Back Button */}
        <div className="pt-4 pb-8">
          <Button
            onClick={handleBack}
            variant="outline"
            className="w-full"
            data-testid="button-back-to-profile"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
