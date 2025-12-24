import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { X, Search, Smartphone, Gift, Award, ChevronDown, Calendar, Ban } from "lucide-react";

export default function TermsAndConditions() {
  const [, setLocation] = useLocation();
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  const handleAccept = () => {
    setLocation("/profile");
  };

  const handleClose = () => {
    setLocation("/profile");
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    setShowScrollIndicator(!isNearBottom);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-terms-title">
              Terms & Conditions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              NextDoc Terms & Conditions for using our healthcare services.
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleClose}
            data-testid="button-close-terms"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 grid w-auto grid-cols-3 gap-2">
            <TabsTrigger value="general" data-testid="tab-general">
              General Terms
            </TabsTrigger>
            <TabsTrigger value="booking" data-testid="tab-booking">
              Booking Terms
            </TabsTrigger>
            <TabsTrigger value="cancellations" data-testid="tab-cancellations">
              Cancellations
            </TabsTrigger>
          </TabsList>

          {/* Scrollable Content */}
          <div 
            className="flex-1 overflow-y-auto px-6 py-4 relative"
            onScroll={handleScroll}
          >
            <TabsContent value="general" className="mt-0 space-y-6">
              <section>
                <h2 className="text-lg font-semibold mb-3">About NextDoc</h2>
                <p className="text-muted-foreground leading-relaxed">
                  At NextDoc, we believe healthcare should be accessible and personalized. That's why we've
                  created an AI-powered health assistant to provide you with reliable health information,
                  symptom checking, and appointment booking. Let us help you take control of your health
                  journey with confidence.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-4">Key Features NextDoc</h2>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Search className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">AI Health Assistant</h3>
                      <p className="text-sm text-muted-foreground">
                        Get instant answers to health questions with our advanced AI chatbot
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Symptom Checker</h3>
                      <p className="text-sm text-muted-foreground">
                        Access advanced symptom analysis with Chain-of-Thought reasoning
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Easy Appointments</h3>
                      <p className="text-sm text-muted-foreground">
                        Book appointments with healthcare providers seamlessly
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Award className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Health Records</h3>
                      <p className="text-sm text-muted-foreground">
                        Store and manage your medical reports securely in one place
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-semibold mb-2">Need Help?</h3>
                <p className="text-sm text-muted-foreground">
                  Contact our customer service team at{" "}
                  <a 
                    href="mailto:support@nextdoc.com" 
                    className="text-primary hover:underline"
                    data-testid="link-support-email-general"
                  >
                    support@nextdoc.com
                  </a>
                </p>
              </section>
            </TabsContent>

            <TabsContent value="booking" className="mt-0 space-y-6">
              <section>
                <h2 className="text-lg font-semibold mb-3">Appointment Booking Terms</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  When you book an appointment through NextDoc, you agree to the following terms and conditions.
                </p>
              </section>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" data-testid="accordion-booking-policy">
                  <AccordionTrigger className="text-left" data-testid="accordion-trigger-booking-confirmation">
                    What is the booking confirmation process?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Once you submit a booking request, you'll receive a confirmation email within 24 hours.
                    The healthcare provider will review your request and confirm the appointment time.
                    You'll be notified via email and SMS when your appointment is confirmed.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" data-testid="accordion-rescheduling">
                  <AccordionTrigger className="text-left" data-testid="accordion-trigger-reschedule">
                    Can I reschedule my appointment?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes, you can reschedule appointments up to 24 hours before the scheduled time without
                    any charges. To reschedule, visit your Appointments page and select the appointment
                    you wish to change. Late rescheduling may incur fees depending on the provider's policy.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" data-testid="accordion-no-show">
                  <AccordionTrigger className="text-left" data-testid="accordion-trigger-no-show">
                    What happens if I miss my appointment?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    If you miss an appointment without prior cancellation, it may be marked as a no-show.
                    Repeated no-shows may affect your ability to book future appointments. Please notify
                    us as soon as possible if you cannot attend your scheduled appointment.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" data-testid="accordion-payment">
                  <AccordionTrigger className="text-left" data-testid="accordion-trigger-payment">
                    When do I need to make payment?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Payment is typically required at the time of booking for most appointments. Some
                    healthcare providers may offer pay-at-visit options. You'll see all payment options
                    during the booking process. Accepted payment methods include credit/debit cards and
                    digital wallets.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            <TabsContent value="cancellations" className="mt-0 space-y-6">
              <section>
                <h2 className="text-lg font-semibold mb-3">Cancellation Policy</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We understand that plans change. Here's our cancellation policy for appointments.
                </p>
              </section>

              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium mb-1 text-green-600">Free Cancellation</h3>
                      <p className="text-sm text-muted-foreground">
                        Cancel up to <strong>24 hours</strong> before your appointment for a full refund.
                        No questions asked.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium mb-1 text-orange-600">Late Cancellation</h3>
                      <p className="text-sm text-muted-foreground">
                        Cancellations within <strong>24 hours</strong> may incur a 50% cancellation fee.
                        The fee helps cover the provider's reserved time slot.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <Ban className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium mb-1 text-red-600">No-Show Policy</h3>
                      <p className="text-sm text-muted-foreground">
                        Missing an appointment without notice results in forfeiture of the full booking
                        amount. Please contact us if you have an emergency.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              <section>
                <h3 className="font-semibold mb-2">How to Cancel</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Go to your Appointments page</li>
                  <li>Select the appointment you want to cancel</li>
                  <li>Click "Cancel Appointment" and confirm</li>
                  <li>You'll receive a cancellation confirmation via email</li>
                </ol>
              </section>

              <section className="pt-2">
                <p className="text-sm text-muted-foreground">
                  For urgent cancellations or special circumstances, please contact our support team
                  at{" "}
                  <a 
                    href="mailto:support@nextdoc.com" 
                    className="text-primary hover:underline"
                    data-testid="link-support-email-cancellations"
                  >
                    support@nextdoc.com
                  </a>
                  .
                </p>
              </section>
            </TabsContent>

            {/* Scroll Indicator */}
            {showScrollIndicator && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
                <ChevronDown className="w-5 h-5 text-primary" />
              </div>
            )}
          </div>
        </Tabs>

        {/* Footer Button */}
        <div className="p-6 pt-4 border-t flex justify-center">
          <Button
            onClick={handleAccept}
            className="min-w-[200px]"
            data-testid="button-accept-continue"
          >
            Accept & Continue
          </Button>
        </div>
      </Card>
    </div>
  );
}
