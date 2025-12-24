import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Eye, EyeOff, Mail, Lock, User, ArrowLeft, Calendar, 
  Phone, CheckCircle2, X, AlertCircle, Sparkles, Activity,
  ShieldCheck, HeartPulse
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { PolicyModal } from "@/components/policy-modal";

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export default function CustomAuth() {
  const [, setLocation] = useLocation();
  const { login, register, isLoaded } = useAuth();
  const { toast } = useToast();
  const [currentPath] = useLocation();
  const isSignUp = currentPath === "/sign-up";
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validation states
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [phoneValid, setPhoneValid] = useState<boolean | null>(null);
  const [dobValid, setDobValid] = useState<boolean | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, label: '', color: '' });
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [dobTouched, setDobTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [modalType, setModalType] = useState<"terms" | "privacy_policy" | null>(null);

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone validation (Indian format)
  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    return phoneRegex.test(cleaned);
  };

  // DOB validation (must be at least 13 years old)
  const validateDOB = (dob: string): boolean => {
    if (!dob) return false;
    
    const dobDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
      return age - 1 >= 13;
    }
    
    return age >= 13;
  };

  // Password strength calculator
  const calculatePasswordStrength = (password: string): PasswordStrength => {
    if (!password) return { score: 0, label: '', color: '' };
    
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z\d]/.test(password)) score += 1;
    
    if (score <= 2) {
      return { score, label: 'Weak - Use a stronger password', color: 'text-red-500' };
    } else if (score <= 4) {
      return { score, label: 'Medium - Add more variety', color: 'text-yellow-500' };
    } else {
      return { score, label: 'Strong', color: 'text-green-500' };
    }
  };

  // Handle email change
  useEffect(() => {
    if (emailTouched && formData.email) {
      setEmailValid(validateEmail(formData.email));
    }
  }, [formData.email, emailTouched]);

  // Handle phone change
  useEffect(() => {
    if (phoneTouched && formData.phone) {
      setPhoneValid(validatePhone(formData.phone));
    }
  }, [formData.phone, phoneTouched]);

  // Handle DOB change
  useEffect(() => {
    if (dobTouched && formData.dob) {
      setDobValid(validateDOB(formData.dob));
    }
  }, [formData.dob, dobTouched]);

  // Handle password change
  useEffect(() => {
    if (passwordTouched && formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password));
    }
  }, [formData.password, passwordTouched]);

  // Format phone number with +91
  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length <= 12) {
      return '+' + cleaned;
    }
    if (cleaned.length > 0 && cleaned.length <= 10) {
      return '+91' + cleaned;
    }
    return text;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded) {
      toast({
        title: "Loading",
        description: "Please wait while we initialize...",
      });
      return;
    }

    // Validation for sign-up
    if (isSignUp) {
      if (!validateEmail(formData.email)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive"
        });
        return;
      }

      if (!validatePhone(formData.phone)) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid Indian phone number (10 digits).",
          variant: "destructive"
        });
        return;
      }

      if (!validateDOB(formData.dob)) {
        toast({
          title: "Invalid Date of Birth",
          description: "You must be at least 13 years old to create an account.",
          variant: "destructive"
        });
        return;
      }

      if (passwordStrength.score <= 2) {
        toast({
          title: "Weak Password",
          description: "Your password is too weak. Please use a stronger password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.",
          variant: "destructive"
        });
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Passwords Don't Match",
          description: "Please make sure both passwords are identical.",
          variant: "destructive"
        });
        return;
      }

      if (!termsAccepted) {
        toast({
          title: "Terms Not Accepted",
          description: "Please accept the Terms & Conditions and Privacy Policy to continue.",
          variant: "destructive"
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const cleanedPhone = formData.phone.replace(/[\s\-\(\)\+]/g, '');
        const registrationData = { 
          ...formData, 
          role: "user",
          phone_number: cleanedPhone,
          date_of_birth: formData.dob,
          is_doctor: false,
          terms_accepted: true,
        };

        await register(registrationData);
        
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account before signing in. The verification link will expire in 24 hours.",
          duration: 7000,
        });
        setLocation("/sign-in");
      } else {
        await login(formData.email, formData.password);
        
        toast({
          title: "Welcome back!",
          description: "Signed in successfully",
        });
        setLocation("/");
      }
    } catch (error: unknown) {
      console.error("Auth error:", error);
      const errorMessage = error instanceof Error ? error.message : "Authentication failed. Please try again.";
      
      // Handle email not verified
      if (errorMessage.toLowerCase().includes('email not verified') || errorMessage.toLowerCase().includes('not verified')) {
        toast({
          title: "Email Not Verified",
          description: "Please check your inbox for the verification link. Click below to resend if needed.",
          variant: "destructive",
          duration: 8000,
          action: (
            <Button variant="outline" size="sm" onClick={async () => {
              try {
                const response = await fetch('/api/auth/resend-verification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: formData.email }),
                  credentials: 'include'
                });
                if (response.ok) {
                  toast({
                    title: "Email Sent!",
                    description: "Please check your inbox for the verification link.",
                  });
                }
              } catch (e) {
                toast({
                  title: "Error",
                  description: "Failed to resend email. Please try again.",
                  variant: "destructive"
                });
              }
            }}>
              Resend Email
            </Button>
          ),
        });
        return;
      }
      
      // Handle duplicate email/phone
      if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('already')) {
        toast({
          title: "Email Already Registered",
          description: "This email address is already associated with an account. Please sign in or use a different email.",
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={() => setLocation("/sign-in")}>
              Sign In
            </Button>
          ),
        });
      } else if (errorMessage.toLowerCase().includes('phone') && errorMessage.toLowerCase().includes('already')) {
        toast({
          title: "Phone Number Already Registered",
          description: "This phone number is already associated with an account. Please sign in or use a different number.",
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={() => setLocation("/sign-in")}>
              Sign In
            </Button>
          ),
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getInputBorderClass = (isValid: boolean | null, isTouched: boolean) => {
    if (!isTouched) return '';
    if (isValid === null) return '';
    return isValid ? 'border-green-500 focus-visible:ring-green-500' : 'border-red-500 focus-visible:ring-red-500';
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background overflow-hidden">
      
      {/* Left Panel: Visual/Branding (Hidden on mobile) */}
      <div className="hidden lg:flex relative overflow-hidden bg-slate-900 items-center justify-center p-12">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-violet-600/20 via-slate-900 to-slate-950" />
        
        {/* Animated Shapes */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-[100px]"
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-violet-600/30 rounded-full blur-[100px]"
        />

        {/* Content */}
        <div className="relative z-10 text-center max-w-lg space-y-8">
           <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-6"
           >
             <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-xl border border-white/10 shadow-2xl">
                <Sparkles className="w-12 h-12 text-indigo-400" />
             </div>
           </motion.div>
           
           <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold tracking-tight text-white mb-4"
           >
             <button 
               onClick={() => setLocation("/welcome")}
               className="text-white hover:text-white/90 transition-opacity cursor-pointer"
             >
               NextDoc AI
             </button>
           </motion.h1>
           
           <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-base text-slate-300 leading-relaxed"
           >
             Experience the future of healthcare. Intelligent diagnostics, seamless care, and trusted professionals at your fingertips.
           </motion.p>

           <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-4 pt-8 border-t border-white/10"
           >
              {[
                { icon: Activity, label: "Smart Analysis" },
                { icon: ShieldCheck, label: "Secure Data" },
                { icon: HeartPulse, label: "24/7 Care" }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-2 text-slate-400">
                  <item.icon className="w-6 h-6 text-indigo-400" />
                  <span className="text-xs font-medium uppercase tracking-wider">{item.label}</span>
                </div>
              ))}
           </motion.div>
        </div>
      </div>

      {/* Right Panel: Form */}
      <div className="relative flex flex-col items-center justify-center p-6 lg:p-12 bg-white dark:bg-slate-950">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {isSignUp ? "Join NextDoc for intelligent healthcare" : "Sign in to your account to continue"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your full name"
                    className="pl-10 h-11"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="input-name"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className={`pl-10 pr-10 h-11 ${getInputBorderClass(emailValid, emailTouched)}`}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onBlur={() => setEmailTouched(true)}
                  required
                  data-testid="input-email"
                />
                {emailTouched && emailValid !== null && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {emailValid ? 
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                      <X className="w-4 h-4 text-red-500" />
                    }
                  </div>
                )}
              </div>
              {emailTouched && emailValid === false && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Please enter a valid email address
                </p>
              )}
            </div>

            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      className={`pl-10 pr-10 h-11 ${getInputBorderClass(phoneValid, phoneTouched)}`}
                      value={formData.phone}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        setFormData({ ...formData, phone: formatted });
                      }}
                      onBlur={() => setPhoneTouched(true)}
                      required
                      maxLength={13}
                      data-testid="input-phone"
                    />
                    {phoneTouched && phoneValid !== null && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {phoneValid ? 
                          <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                          <X className="w-4 h-4 text-red-500" />
                        }
                      </div>
                    )}
                  </div>
                  {phoneTouched && phoneValid === false && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Please enter a valid Indian phone number
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob" className="text-sm font-medium">Date of Birth</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="dob"
                      type="date"
                      className={`pl-10 pr-10 h-11 ${getInputBorderClass(dobValid, dobTouched)}`}
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      onBlur={() => setDobTouched(true)}
                      required
                      max={new Date().toISOString().split('T')[0]}
                      data-testid="input-dob"
                    />
                    {dobTouched && dobValid !== null && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {dobValid ? 
                          <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                          <X className="w-4 h-4 text-red-500" />
                        }
                      </div>
                    )}
                  </div>
                  {dobTouched && dobValid === false && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      You must be at least 13 years old
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  className="pl-10 pr-10 h-11"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onBlur={() => setPasswordTouched(true)}
                  required
                  minLength={8}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isSignUp && passwordTouched && passwordStrength.label && (
                <div className="space-y-2">
                  <Progress value={(passwordStrength.score / 6) * 100} className="h-1.5" />
                  <p className={`text-xs font-medium ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    className="pl-10 pr-10 h-11"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    minLength={8}
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {!isSignUp && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="rounded border-input w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">Remember me</span>
                </label>
                <button 
                  type="button" 
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium transition-colors"
                  onClick={() => setLocation("/forgot-password")}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {isSignUp && (
              <div className="flex items-start gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="terms-checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 rounded border-input w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="terms-checkbox" className="text-xs text-muted-foreground cursor-pointer">
                  I agree to the{" "}
                  <button 
                    type="button"
                    onClick={() => setModalType("terms")} 
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Terms & Conditions
                  </button>
                  {" "}and{" "}
                  <button 
                    type="button"
                    onClick={() => setModalType("privacy_policy")} 
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/25 dark:shadow-indigo-900/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || (isSignUp && !termsAccepted)}
              data-testid="button-submit"
            >
              {loading ? "Please wait..." : (isSignUp ? "Create Account" : "Sign In")}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
            </span>
            <button
              onClick={() => setLocation(isSignUp ? "/sign-in" : "/sign-up")}
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline transition-colors"
              data-testid="link-toggle-auth"
            >
              {isSignUp ? "Sign In" : "Create Account"}
            </button>
          </div>
        </div>
      </div>

      {/* Policy Modal */}
      <PolicyModal
        isOpen={!!modalType}
        type={modalType || "terms"}
        onClose={() => setModalType(null)}
      />
    </div>
  );
}