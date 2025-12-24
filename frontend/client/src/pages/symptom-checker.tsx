import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ChatWithHistory from "@/components/ChatWithHistory";
import ThinkingAnimation from "@/components/ThinkingAnimation";

export default function SymptomChecker() {
  const [inputValue, setInputValue] = useState("");

  const generateResponse = (userMessage: string) => {
    // In production, this will stream from FastAPI backend
    // The thinking animation simulates the Chain-of-Thought (CoT) process
    // The final response is designed to be compatible with token-by-token streaming
    const thinkingComponent = (
      <ThinkingAnimation 
        steps={[
          "Analyzing the reported symptoms and their severity",
          "Checking for potential related conditions",
          "Evaluating urgency level based on symptom description",
          "Formulating preliminary assessment and recommendations"
        ]} 
      />
    );

    // Response designed for streaming: flows naturally, sentence by sentence
    const response = `Based on the symptoms you've described, here are some general observations. ${
      userMessage.toLowerCase().includes('fever') 
        ? 'Fever can indicate various conditions, from viral infections to bacterial illnesses. ' 
        : ''
    }${
      userMessage.toLowerCase().includes('headache') 
        ? 'Headaches can have many causes including tension, dehydration, or other health factors. ' 
        : ''
    }I recommend monitoring your symptoms closely. Stay hydrated and get adequate rest. If your symptoms worsen or persist for more than a few days, please consult a healthcare professional. Remember, this is not a medical diagnosis - always seek professional medical advice for health concerns.`;

    return {
      content: response,
      thinkingComponent
    };
  };

  const quickSymptoms = (
    <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
      {['Headache', 'Fever', 'Cough', 'Fatigue'].map((symptom) => (
        <Badge
          key={symptom}
          variant="outline"
          className="cursor-pointer hover-elevate"
          onClick={() => setInputValue(`I have been experiencing ${symptom.toLowerCase()}`)}
          data-testid={`badge-${symptom.toLowerCase()}`}
        >
          {symptom}
        </Badge>
      ))}
    </div>
  );

  return (
    <ChatWithHistory
      title="Symptom Checker"
      icon={<Sparkles className="w-5 h-5 text-primary" />}
      placeholder="Describe your symptoms..."
      emptyStateTitle="AI Symptom Checker"
      emptyStateDescription="Describe your symptoms and I'll help you understand what might be causing them. Remember, this is not a medical diagnosis."
      emptyStateIcon={<Sparkles className="w-8 h-8 text-primary" />}
      emptyStateActions={quickSymptoms}
      generateResponse={generateResponse}
      externalInputValue={inputValue}
      onExternalInputChange={setInputValue}
      mode="symptom_checker"
    />
  );
}
