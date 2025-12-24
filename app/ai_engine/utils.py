"""AI engine utilities for prompt formatting"""

from typing import List, Dict


def format_medical_prompt(query: str, conversation_history: List[Dict[str, str]] = None) -> str:
    """
    Format user query into medical reasoning prompt for DeepSeek R1.
    Matches the training prompt style from the Colab notebook.
    """
    
    system_context = """You are a medical expert AI with advanced knowledge in clinical reasoning, diagnostics, and treatment planning.
Your role is to provide thoughtful, evidence-based medical guidance.

IMPORTANT GUIDELINES:
- Analyze symptoms and medical questions step-by-step
- Provide differential diagnoses when appropriate
- Suggest urgency levels (routine, urgent, emergency)
- Recommend when to seek professional medical care
- Never provide definitive diagnoses - always recommend consulting healthcare providers
- Be empathetic and clear in your explanations
"""
    
    # Build conversation context if history exists
    context = ""
    if conversation_history:
        context = "\n\nPrevious conversation:\n"
        for msg in conversation_history[-5:]:  # Last 5 messages for context
            role = msg.get("role", "user")
            content = msg.get("content", "")
            context += f"{role.upper()}: {content}\n"
    
    # Format with medical reasoning structure
    prompt = f"""{system_context}{context}

### Current Query:
{query}

### Response:
Please analyze this query step-by-step and provide a comprehensive medical response."""
    
    return prompt


def format_symptom_checker_prompt(symptoms: str) -> str:
    """Format prompt specifically for symptom checking and triage"""
    
    prompt = f"""You are an AI medical triage assistant. Analyze the following symptoms and provide:

1. **Possible Conditions**: List 3-5 potential causes (from most to least likely)
2. **Urgency Level**: Rate as ROUTINE, URGENT, or EMERGENCY
3. **Recommended Actions**: Clear next steps for the patient
4. **Red Flags**: Any warning signs that require immediate attention

### Symptoms:
{symptoms}

### Analysis:
Provide your systematic assessment below."""
    
    return prompt


def extract_thinking_and_response(ai_output: str) -> Dict[str, str]:
    """
    Extract reasoning (<think>) and final response from AI output.
    DeepSeek R1 uses <think></think> tags for chain-of-thought.
    """
    
    thinking = ""
    response = ai_output
    
    # Try to extract <think> tags
    if "<think>" in ai_output and "</think>" in ai_output:
        start_idx = ai_output.find("<think>") + 7
        end_idx = ai_output.find("</think>")
        thinking = ai_output[start_idx:end_idx].strip()
        response = ai_output[end_idx + 8:].strip()
    
    return {
        "thinking": thinking,
        "response": response
    }
