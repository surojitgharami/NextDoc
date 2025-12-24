import { Brain } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ThinkingAnimationProps {
  thinkingContent?: string;
  steps?: string[];
}

export default function ThinkingAnimation({ thinkingContent, steps = [] }: ThinkingAnimationProps) {
  return (
    <Card className="p-4 bg-muted/50 border-primary/20 space-y-3" data-testid="thinking-animation">
      <div className="flex items-center gap-2 text-primary">
        <Brain className="w-4 h-4 animate-pulse" />
        <span className="text-sm font-medium">Thinking...</span>
      </div>
      
      {thinkingContent && (
        <div className="text-sm text-muted-foreground italic border-l-2 border-primary/40 pl-3">
          {thinkingContent}
        </div>
      )}
      
      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="flex items-start gap-2 text-sm animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">{index + 1}</span>
              </div>
              <p className="text-muted-foreground flex-1">{step}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
