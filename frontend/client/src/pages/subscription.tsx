import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  AlertCircle, 
  Crown, 
  Zap, 
  Shield,
  MessageSquare,
  Activity,
  Bell,
  Loader2,
  CreditCard,
  X
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface Plan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  period: string;
  description: string;
  features: string[];
}

interface SubscriptionStatus {
  has_active_subscription: boolean;
  status: string;
  plan: string;
  end_date?: string;
  limits?: {
    ai_consultations_per_month: number;
    medicine_reminders: number;
    symptom_checks_per_day: number;
  };
}

interface UsageLimits {
  is_premium: boolean;
  plan: string;
  usage: {
    ai_consultations: number;
    symptom_checks_today: number;
    medicine_reminders: number;
  };
  limits?: {
    ai_consultations_per_month: number;
    medicine_reminders: number;
    symptom_checks_per_day: number;
  };
  remaining?: {
    ai_consultations: number;
    symptom_checks_today: number;
    medicine_reminders: number;
  };
}

export default function SubscriptionPage() {
  const { user, getToken } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const [plansRes, statusRes, limitsRes] = await Promise.all([
        fetch("/api/billing/plans"),
        fetch("/api/billing/subscription", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch("/api/billing/limits", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans.filter((p: Plan) => p.id !== "free"));
      }
      
      if (statusRes.ok) {
        setSubStatus(await statusRes.json());
      }
      
      if (limitsRes.ok) {
        setUsageLimits(await limitsRes.json());
      }
    } catch (err) {
      console.error("Failed to fetch subscription data:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubscribe = async (planType: string) => {
    if (!razorpayLoaded) {
      toast({
        title: "Loading",
        description: "Payment system is loading, please try again",
        variant: "destructive"
      });
      return;
    }

    setProcessingPlan(planType);
    
    try {
      const token = await getToken();
      const orderRes = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ plan_type: planType })
      });

      if (!orderRes.ok) {
        const error = await orderRes.json();
        throw new Error(error.detail || "Failed to create order");
      }

      const orderData = await orderRes.json();

      if (orderData.type === "free") {
        toast({
          title: "Success",
          description: "Free plan activated successfully!"
        });
        fetchData();
        return;
      }

      const options: RazorpayOptions = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: "AI Doctor",
        description: orderData.plan?.description || `${planType} Subscription`,
        handler: async (response: RazorpayResponse) => {
          try {
            const verifyRes = await fetch("/api/billing/verify-payment", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_type: planType
              })
            });

            if (verifyRes.ok) {
              toast({
                title: "Payment Successful!",
                description: `Your ${planType} subscription is now active`
              });
              fetchData();
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (err) {
            toast({
              title: "Verification Failed",
              description: "Payment received but verification failed. Contact support.",
              variant: "destructive"
            });
          }
        },
        prefill: {
          name: (user as any)?.full_name || (user as any)?.fullName || "",
          email: user?.email || ""
        },
        theme: {
          color: "#6366f1"
        },
        modal: {
          ondismiss: () => setProcessingPlan(null)
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to initiate payment",
        variant: "destructive"
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription?")) return;

    try {
      const token = await getToken();
      const res = await fetch("/api/billing/cancel-subscription", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast({
          title: "Subscription Cancelled",
          description: "Your subscription has been cancelled"
        });
        fetchData();
      } else {
        throw new Error("Failed to cancel subscription");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive"
      });
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount / 100);
  };

  const isPremium = subStatus?.plan && subStatus.plan !== "free" && subStatus.has_active_subscription;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-24">
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
            <Crown className="w-5 h-5" />
            <span className="font-semibold">Premium Plans</span>
          </div>
          <h1 className="text-4xl font-bold">Unlock Full AI Doctor Experience</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Get unlimited access to AI-powered healthcare consultations, advanced symptom analysis, and personalized health insights
          </p>
        </div>

        {subStatus && (
          <Card className={`p-6 ${
            isPremium
              ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-900 border-green-200 dark:border-green-800"
              : "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-900 border-blue-200 dark:border-blue-800"
          }`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3">
                {isPremium ? (
                  <Crown className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">
                      {isPremium ? `${subStatus.plan.charAt(0).toUpperCase() + subStatus.plan.slice(1)} Premium` : "Free Plan"}
                    </h3>
                    <Badge variant={isPremium ? "default" : "secondary"}>
                      {subStatus.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isPremium && subStatus.end_date
                      ? `Active until ${new Date(subStatus.end_date).toLocaleDateString("en-IN", { 
                          year: "numeric", 
                          month: "long", 
                          day: "numeric" 
                        })}`
                      : "Upgrade to unlock unlimited features"}
                  </p>
                </div>
              </div>
              
              {isPremium && (
                <Button variant="outline" onClick={handleCancelSubscription}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel Subscription
                </Button>
              )}
            </div>

            {usageLimits && !usageLimits.is_premium && usageLimits.remaining && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-sm font-medium mb-3">Your Free Tier Usage</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-background/50 rounded-lg">
                    <MessageSquare className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-2xl font-bold">{usageLimits.remaining.ai_consultations}</p>
                    <p className="text-xs text-muted-foreground">AI chats left</p>
                  </div>
                  <div className="text-center p-3 bg-background/50 rounded-lg">
                    <Activity className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-2xl font-bold">{usageLimits.remaining.symptom_checks_today}</p>
                    <p className="text-xs text-muted-foreground">Symptom checks today</p>
                  </div>
                  <div className="text-center p-3 bg-background/50 rounded-lg">
                    <Bell className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-2xl font-bold">{usageLimits.remaining.medicine_reminders}</p>
                    <p className="text-xs text-muted-foreground">Reminder slots</p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => {
            const isCurrentPlan = subStatus?.plan === plan.id && subStatus?.has_active_subscription;
            const isAnnual = plan.id === "annual";
            
            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-all ${
                  isAnnual
                    ? "border-primary shadow-xl ring-2 ring-primary/20"
                    : "hover:shadow-lg"
                }`}
              >
                {isAnnual && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold rounded-bl-lg">
                    Best Value
                  </div>
                )}
                
                <div className="p-8 space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      {plan.name}
                      {isAnnual && <Zap className="w-5 h-5 text-yellow-500" />}
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{formatPrice(plan.amount)}</span>
                    <span className="text-muted-foreground">/{plan.period === "monthly" ? "month" : "year"}</span>
                  </div>

                  {isAnnual && (
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-2 rounded-lg text-sm font-medium">
                      Save {formatPrice(29900 * 12 - 299900)} compared to monthly
                    </div>
                  )}

                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrentPlan || processingPlan !== null}
                    className={`w-full ${isAnnual ? "bg-primary hover:bg-primary/90" : ""}`}
                    size="lg"
                  >
                    {processingPlan === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Current Plan
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Subscribe Now
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold text-center">Why Go Premium?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { 
                icon: MessageSquare, 
                title: "Unlimited AI Consultations", 
                desc: "Get 24/7 health guidance without any limits" 
              },
              { 
                icon: Activity, 
                title: "Advanced Health Insights", 
                desc: "Detailed symptom analysis and health tracking" 
              },
              { 
                icon: Shield, 
                title: "Priority Support", 
                desc: "Get faster responses and dedicated assistance" 
              }
            ].map((feature) => (
              <Card key={feature.title} className="p-6 text-center space-y-3">
                <feature.icon className="w-10 h-10 mx-auto text-primary" />
                <h4 className="font-semibold">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>Secure payments powered by Razorpay</p>
          <p>Cancel anytime. No hidden fees.</p>
        </div>
      </div>
    </div>
  );
}
