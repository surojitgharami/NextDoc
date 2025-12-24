import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Loader } from "lucide-react";

interface RazorpayCheckoutProps {
  amount: number;
  doctorId?: number;
  referenceId?: string;
  purpose?: string;
  onSuccess?: (paymentId: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function RazorpayCheckout({
  amount,
  doctorId,
  referenceId,
  purpose = "subscription",
  onSuccess,
  disabled = false
}: RazorpayCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth();
  const { toast } = useToast();

  const handlePayment = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      
      // Create order
      const orderRes = await fetch("/api/billing/payment/order", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount,
          doctor_id: doctorId,
          reference_id: referenceId,
          purpose,
          currency: "INR"
        })
      });

      if (!orderRes.ok) throw new Error("Failed to create order");
      const orderData = await orderRes.json();

      // Load Razorpay script
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: orderData.key_id,
          amount: orderData.amount * 100,
          currency: orderData.currency,
          order_id: orderData.razorpay_order_id,
          handler: async (response: any) => {
            try {
              const verifyRes = await fetch("/api/billing/payment/verify", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  doctor_id: doctorId,
                  reference_id: referenceId,
                  purpose
                })
              });

              if (!verifyRes.ok) throw new Error("Payment verification failed");
              
              toast({
                title: "Payment Successful",
                description: "Your payment has been processed"
              });
              onSuccess?.(response.razorpay_payment_id);
            } catch (err) {
              toast({
                title: "Error",
                description: "Payment verification failed",
                variant: "destructive"
              });
            }
            setLoading(false);
          },
          prefill: {
            contact: "",
            email: ""
          },
          theme: {
            color: "#3b82f6"
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      };
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Payment failed",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || loading}
      className="gap-2"
    >
      {loading ? (
        <>
          <Loader className="w-4 h-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4" />
          Pay ₹{amount}
        </>
      )}
    </Button>
  );
}
