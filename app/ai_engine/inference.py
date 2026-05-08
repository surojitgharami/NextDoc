"""AI inference engine — Custom API endpoint (Lightning.AI / Colab Ngrok / HuggingFace)"""

import re
import httpx
import logging
from typing import List, Dict, Optional
from app.config import settings
from datetime import datetime

logger = logging.getLogger(__name__)


# ── Reasoning-token patterns to strip from ANY response ────────────────────
_THINK_PATTERNS = [
    re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE),
    re.compile(r"<thinking>.*?</thinking>", re.DOTALL | re.IGNORECASE),
    re.compile(r"<think>.*?$", re.DOTALL | re.IGNORECASE),
    re.compile(r"^.*?</think>", re.DOTALL | re.IGNORECASE),
    re.compile(r"Medical Reasoning Process:.*?(?=\n[A-Z]|$)", re.DOTALL),
    re.compile(r"Internal Reasoning:.*?(?=\n[A-Z]|$)", re.DOTALL),
    re.compile(r"Chain of Thought:.*?(?=\n[A-Z]|$)", re.DOTALL),
    re.compile(r"Step-by-step reasoning:.*?(?=\n[A-Z]|$)", re.DOTALL | re.IGNORECASE),
    re.compile(r"Let me think.*?(?=\n[A-Z]|$)", re.DOTALL | re.IGNORECASE),
]

_RESPONSE_HEADERS = [
    "Expert Medical Answer:",
    "Medical Answer:",
    "Answer:",
    "Doctor:",
    "Response:",
    "Final Answer:",
]

# ── Training-data promotional / platform-specific artifacts to strip ─────────
# These come from Ask-a-Doctor, ChatDoctor datasets and must never appear in output.
_PROMO_PATTERNS = [
    # URLs
    re.compile(r"https?://\S+", re.IGNORECASE),
    # "In future if you wish to contact me directly, you can use the below-mentioned link."
    re.compile(r"[Ii]n future if you wish to contact[^.\n]*\.", re.IGNORECASE),
    re.compile(r"you can use the below[- ]mentioned link[^.\n]*\.", re.IGNORECASE),
    # "Consultations are available 24/7. Click on 'Ask Question' for direct consultation."
    re.compile(r"[Cc]onsultations? are available[^.\n]*\.", re.IGNORECASE),
    re.compile(r"[Cc]lick on ['\"]?Ask [Qq]uestion['\"]?[^.\n]*\.", re.IGNORECASE),
    # "I am here to help you."  (standalone ad copy, not part of real advice)
    re.compile(r"^\s*I am here to help you\.\s*$", re.IGNORECASE | re.MULTILINE),
    # "Welcome for further clarifications."
    re.compile(r"[Ww]elcome for further clarifications?\.?", re.IGNORECASE),
    # Doctor specialty sign-offs: "S. General Surgery." / "Consulting Surgeon."
    re.compile(
        r"\b[A-Z]\.\s+(?:[A-Z][a-z]+\s+)*"
        r"(?:Surgery|Medicine|Physician|Surgeon|Consultant|Specialist|"
        r"Gynecology|Gynaecology|Cardiology|Neurology|Orthopedics|"
        r"Paediatrics|Pediatrics|Dermatology|Psychiatry|Urology|ENT)"
        r"[^.\n]*\.",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:Consulting|Senior|General|Clinical|Chief)\s+"
        r"(?:Surgeon|Physician|Consultant|Specialist|Doctor)[^.\n]*\.",
        re.IGNORECASE,
    ),
    # "Let me know if I can assist you further."  — ad-copy variation
    re.compile(r"[Ll]et me know if I can assist you further[^.\n]*\.", re.IGNORECASE),
    # "I will be happy to answer your queries."
    re.compile(r"I will be happy to answer your (?:queries|questions)[^.\n]*\.", re.IGNORECASE),
    # "If you have additional questions or follow-up queries then please do not hesitate..."
    re.compile(r"If you have additional questions or follow[- ]up queries[^.\n]*\.", re.IGNORECASE),
    # Standalone "Thank you." / "Thank you," at end of line (chatdoctor sign-off)
    re.compile(r"^\s*Thank you[.,]?\s*$", re.IGNORECASE | re.MULTILINE),
]

MEDICAL_DISCLAIMER = (
    "\n\n---\n"
    "*This information is for educational purposes only and does not replace professional "
    "medical advice. Please consult a qualified healthcare provider for diagnosis and treatment.*"
)

# ── Phrases that signal the end of a list and start of closing text ─────────
# Allow zero or more spaces between "." and the closing keyword
# so we catch both "item. I hope" and "item.I hope" (no space).
_LIST_CLOSERS = re.compile(
    r"\.[ \t]*(I hope|Please|Take care|Regards|If you|Consult|See a|Visit|Seek|Hope|"
    r"Feel free|Do not hesitate|It is important|Remember|Note that|"
    r"Good day|Good luck|Wish you|Wishing you|Thank you for|Thanks for)",
    re.IGNORECASE,
)


def _split_concatenated_items(blob: str) -> list:
    """
    Split a blob of concatenated list items into individual strings.

    Handles three common model output patterns:
      1. Items with parenthetical descriptions:
         'Polyuria (frequent urination)Polydipsia (thirst)Polyphagia (hunger)'
         → split on ')' followed immediately by a Capital letter

      2. Items merged as CamelCase (no space):
         'FatigueBlurred visionDepression'
         → split on lowercase→Capital transition (no space)

      3. Items merged with a space before a Capital:
         'Increased sweating Tingling sensation'
         → split on lowercase + space + Capital transition
    """
    # Connective words that should NOT trigger a split even when
    # they appear as 'lowercase + space + Capital'.
    # NOTE: no re.IGNORECASE — [A-Z] must stay case-sensitive so we only
    # preserve joins like "Skin tags or Darkening" NOT "sweat in hands".
    _NO_SPLIT = re.compile(
        r"\b(?:in|of|or|and|the|at|to|a|an|by|for|with|on|as|is|are|than|that|"
        r"due|per|via|vs|not|from|into|over|under|near|such|if|but|so|yet|nor)\s+[A-Z]"
    )

    result = []
    # Step 1 — split on ) + Capital
    paren_parts = re.split(r"\)\s*(?=[A-Z])", blob)

    for idx, part in enumerate(paren_parts):
        part = part.strip()
        if not part:
            continue

        # Restore closing paren when this part has an unmatched opening paren
        has_open = part.count("(") > part.count(")")
        if has_open and idx < len(paren_parts) - 1:
            part = part + ")"

        # Step 2 — within this part, split on camelCase boundary (no space)
        # e.g. 'FatigueBlurred vision' → ['Fatigue', 'Blurred vision']
        sub_parts = re.split(r"(?<=[a-z])(?=[A-Z])", part)

        for sp in sub_parts:
            sp = sp.strip()
            if not sp:
                continue

            # Step 3 — split on 'word SPACE Capital' when NOT a connective word
            # e.g. 'Increased sweating Tingling' → ['Increased sweating', 'Tingling']
            # We use a token-by-token scan to avoid splitting inside phrases.
            tokens = re.split(r"(?<=[a-z]) (?=[A-Z])", sp)
            if len(tokens) > 1:
                # Filter out splits that are actually connective phrases
                merged: list[str] = [tokens[0]]
                for tok in tokens[1:]:
                    # Check if the join point is a known connective
                    boundary = merged[-1] + " " + tok
                    if _NO_SPLIT.search(boundary):
                        merged[-1] = boundary  # keep joined
                    else:
                        merged.append(tok)
                result.extend(t.strip() for t in merged if t.strip())
            else:
                result.append(sp)

    return result


def _restructure_response(text: str) -> str:
    """
    Convert the model's concatenated list format into clean markdown.

    Detects patterns like:
      "...symptoms including- Polyuria (freq)Polydipsia (thirst)Fatigue..."
      "...signs include: FeverChillsNausea..."

    And converts them to:
      "...symptoms including:
       - Polyuria (freq)
       - Polydipsia (thirst)
       - Fatigue
       ..."

    Also adds paragraph breaks before common closing sentences.
    """

    # ── Force bullet conversion for comma-separated symptom lists ──
    def force_bullets(text: str) -> str:
        pattern = re.search(
            r"(symptoms?|signs?|includes?|including)(.*?)(\.)", text, re.IGNORECASE
        )
        if pattern:
            intro = pattern.group(1)
            blob = pattern.group(2)

            items = [i.strip() for i in blob.split(",") if len(i.strip()) > 3]

            if len(items) >= 3:
                bullets = "\n".join(f"- {i}" for i in items)
                return text.replace(pattern.group(0), f"{intro}:\n\n{bullets}\n")

        return text

    text = force_bullets(text)

    def expand_list(m: re.Match) -> str:
        intro = m.group(1).rstrip(" -:")
        blob = m.group(2)

        # Separate trailing closing text from the list blob.
        # _LIST_CLOSERS matches ".  <Word>" — keep the period with the blob,
        # strip only the whitespace + closing word onwards.
        closer_match = _LIST_CLOSERS.search(blob)
        if closer_match:
            split_at = closer_match.start() + 1  # position after the '.'
            closing = blob[split_at:].strip()  # "I hope this helps. ..."
            blob = blob[:split_at].rstrip()  # "...in hands and feet."
        else:
            closing = ""

        items = _split_concatenated_items(blob)

        if len(items) < 2:
            # Not enough items detected — return original
            return m.group(0)

        md = f"{intro}:\n\n" + "\n".join(f"- {item}" for item in items)
        if closing:
            md += f"\n\n{closing}"
        return md

    # Trigger pattern: intro containing a list anchor word + '-' or ':' + items blob
    # The blob must start with a Capital letter and span at least ~30 chars.
    text = re.sub(
        r"([^\n]*?(?:including|includes?|associated with|such as|are|following|"
        r"may include|can include|consist of|characterized by)[^\n]{0,60}?)[-:]\s*"
        r"([A-Z][^\n]{30,})",
        expand_list,
        text,
        flags=re.IGNORECASE,
    )

    # Add paragraph break before common sentence starters that appear
    # immediately after a period — handles both "text. Word" and "text.Word" forms.
    _PARA_STARTERS = (
        r"I hope|Please|Take care|Regards|If you|Consult|See a|Visit|Seek|Hope|"
        r"Feel free|Do not hesitate|It is important|Remember|Note that|"
        r"Good day|Good luck|Wish you|Wishing you|You should|You can|"
        r"Thank you for|Thanks for"
    )
    # Case 1: period + whitespace + starter word
    text = re.sub(
        rf"(?<=\.)\s+({_PARA_STARTERS})",
        lambda m: "\n\n" + m.group(1),
        text,
        flags=re.IGNORECASE,
    )
    # Case 2: period directly followed by Capital (no space at all, e.g. "Nausea.I")
    text = re.sub(
        r"\.(?=[A-Z])",
        ".\n\n",
        text,
    )

    # ── Fix concatenated closing words ─er�────────────────────────────────────
    # e.g. "RegardsJay" → "Regards, Jay"  /  "ThanksJohn" → "Thanks, John"
    text = re.sub(
        r"\b(Regards|Sincerely|Best regards|Yours truly|Best|Thanks|Warm regards)"
        r"([A-Z][a-z]+)",
        r"\1, \2",
        text,
    )

    # ── Strip ALL model training-data signature artifacts ───────────────────
    # Pattern: Capital-name + "/" + anything  e.g. "Ly/lfm.", "Jay/ChatDoctor."
    text = re.sub(r"\b[A-Z][a-z]{1,15}\s*/\s*\S+\.?", "", text)
    # Pattern: Capital-name + "In/in" + place  e.g. "Jay In Chat Doctor."
    text = re.sub(r"\b[A-Z][a-z]{1,15}\s+[Ii]n\s+[A-Z][A-Za-z\s]{2,20}\.?", "", text)
    # Strip trailing Regards / Sincerely lines (possibly with a name after)
    # Remove ALL signature variants completely
    text = re.sub(
        r"(Regards.*|Sincerely.*|Best regards.*|Thanks.*|ChatDoctor.*|Chat Doctor.*)",
        "",
        text,
        flags=re.IGNORECASE,
    )

    # ── Collapse repetitive / robotic closing sentences ─────────────────────
    # The model often appends multiple filler closes. Keep at most one, then
    # replace the whole closing block with a single professional sentence.
    _FILLER_CLOSE = re.compile(
        r"\n+[ \t]*(?:"
        r"I hope (?:this )?(?:helps|answers|is helpful)[^.\n]*\.|"
        r"Hope (?:this )?(?:helps|answers|is helpful)[^.\n]*\.|"
        r"Hope I have answered your (?:query|question)[^.\n]*\.|"
        r"I hope you feel better soon[^.\n]*\.|"
        r"Take care[.,!]?[ \t]*(?:and stay healthy)?\.?|"
        r"Good (?:day|luck|health)[.,!]?\.?|"
        r"Wish(?:ing)? you (?:good health|a speedy|a quick|well)[^.\n]*\.|"
        r"(?:Please )?(?:do not hesitate|feel free) to (?:ask|contact|write)[^.\n]*\.|"
        r"If you have (?:any |additional )?(?:further |more )?questions?[^.\n]*\.|"
        r"If you have additional questions or follow[- ]up queries[^.\n]*\.|"
        r"Thank you[.,]?\s*$"
        r")[ \t]*",  # ← only horizontal whitespace — do NOT consume \n
        re.IGNORECASE,
    )

    # Count how many filler closes exist
    filler_count = len(_FILLER_CLOSE.findall(text))

    if filler_count >= 2:
        # Strip ALL filler closes, then add exactly one clean line
        text = _FILLER_CLOSE.sub("", text).rstrip()
        text += "\n\nIf you have any further questions, feel free to ask."
    elif filler_count == 1:
        # Leave the single close as-is (paragraph breaks already added above)
        pass

    # ── Clean up stray punctuation / blank lines left by the above ──────────
    text = re.sub(r"[ \t]+\n", "\n", text)   # trailing whitespace on lines
    text = re.sub(r"\n{3,}", "\n\n", text)    # max two consecutive newlines
    text = text.strip()
    return text


_PROFESSIONAL_SIGN_OFF = "\n\n**Take care,**\n*AI Medical Assistant*"


def clean_response(raw_output: str, add_disclaimer: bool = True) -> str:
    """
    Strip all reasoning / think tokens, restructure concatenated lists into
    readable markdown, and append exactly one medical disclaimer.
    Returns a clean, professional doctor response.
    """
    text = raw_output

    # 1. Remove reasoning tokens
    for pattern in _THINK_PATTERNS:
        text = pattern.sub("", text)

    # 2. Strip known response headers
    for header in _RESPONSE_HEADERS:
        stripped = text.lstrip()
        if stripped.startswith(header):
            text = stripped[len(header) :]

    # 3. Strip all promotional / platform artifact text
    for pattern in _PROMO_PATTERNS:
        text = pattern.sub("", text)

    # 4. Collapse excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()

    # 5. Strip a bare leading greeting with no medical content on the same line
    #    e.g. "Hi,\n\n..." or "Hello,\n\n..." or "Dear Patient,\n\n..."
    text = re.sub(r"^(?:Hi|Hello|Hey|Dear\s+\w+)[,!.]?\s*\n\n?", "", text, flags=re.IGNORECASE)

    # 6. Strip "Thank you for consulting in Chat Doctor / our service." opener
    text = re.sub(
        r"^[Tt]hank(?:s| you) for (?:consulting|contacting|writing|reaching out)[^.\n]*\.\s*\n?",
        "",
        text,
    )

    text = text.strip()

    if not text:
        text = (
            "I was unable to generate a detailed response for your question. "
            "Please provide more details about your symptoms or consult a qualified healthcare provider."
        )

    # 7. Restructure concatenated list items into markdown
    text = _restructure_response(text)

    # 8. Strip any embedded disclaimer the model already appended
    _PHRASE = "This information is for educational purposes only"
    idx = text.lower().find(_PHRASE.lower())
    if idx != -1:
        text = text[:idx].rstrip(" \t\n\r*-")

    # 9. If the real content after cleaning is very thin the model gave a non-answer
    if len(text.strip()) < 60:
        text = (
            "I wasn't able to generate a detailed response for this query. "
            "Please describe your symptoms in more detail and I will do my best to help."
        )

    if add_disclaimer:
        text += _PROFESSIONAL_SIGN_OFF
        text += MEDICAL_DISCLAIMER

    return text


class CustomAPIEngine:
    """
    Inference engine that forwards requests to the Lightning.AI / Colab Ngrok
    custom endpoint.  All responses are cleaned of reasoning tokens before
    being returned to callers.
    """

    def __init__(self):
        self.api_url = settings.CUSTOM_API_URL
        self.timeout = 120

    # ── Internal helpers ───────────────────────────────────────────────────

    def _build_url(self) -> str:
        url = self.api_url
        if url and "/api/v1/chat/message" not in url:
            url = url.rstrip("/") + "/api/v1/chat/message"
        return url

    def _build_payload(
        self,
        query: str,
        previous_summary: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        max_tokens: int = 512,
        temperature: float = 0.6,
        mode: str = "medical",
    ) -> dict:
        return {
            "message": query,
            "previous_summary": previous_summary or "",
            "context": conversation_history or [],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "mode": mode,
        }

    # ── Public interface ───────────────────────────────────────────────────

    async def generate_medical_response(
        self,
        query: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        previous_summary: Optional[str] = None,
        max_tokens: int = 512,
        temperature: float = 0.6,
    ) -> Dict[str, str]:
        endpoint = self._build_url()
        payload = self._build_payload(
            query=query,
            previous_summary=previous_summary,
            conversation_history=conversation_history,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        headers = {"Content-Type": "application/json"}
        if settings.LIGHTNING_API_KEY:
            headers["Authorization"] = f"Bearer {settings.LIGHTNING_API_KEY}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(endpoint, json=payload, headers=headers)
                response.raise_for_status()

                data = response.json()
                raw_reply = data.get("reply", "")
                cleaned = clean_response(raw_reply)

                logger.info(f"✅ Medical response generated ({len(cleaned)} chars)")
                return {"thinking": "", "response": cleaned}

        except httpx.TimeoutException:
            logger.error("❌ AI inference timeout")
            return {
                "thinking": "",
                "response": (
                    "I apologize, but the AI service is taking longer than expected. "
                    "Please try again in a moment."
                ),
            }
        except httpx.HTTPError as e:
            logger.error(f"❌ AI inference HTTP error: {e}")
            return {
                "thinking": "",
                "response": (
                    "I apologize, but I am having trouble connecting to the AI service. "
                    "Please try again shortly."
                ),
            }
        except Exception as e:
            logger.error(f"❌ AI inference error: {e}")
            return {
                "thinking": "",
                "response": (
                    "I apologize, but I am unable to process your request right now. "
                    "Please try again or contact support if the issue persists."
                ),
            }

    async def analyze_symptoms(
        self,
        symptoms: str,
        max_tokens: int = 512,
        temperature: float = 0.5,
    ) -> Dict[str, str]:
        result = await self.generate_medical_response(
            query=symptoms,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        cleaned = result["response"]
        return {
            "raw_analysis": cleaned,
            "symptoms_provided": symptoms,
            "urgency": self._extract_urgency(cleaned),
            "reasoning": "",
            "recommendations": cleaned,
        }

    def _extract_urgency(self, text: str) -> str:
        text_upper = text.upper()
        if (
            "EMERGENCY" in text_upper
            or "911" in text_upper
            or "IMMEDIATELY" in text_upper
        ):
            return "EMERGENCY"
        elif "URGENT" in text_upper or "SOON AS POSSIBLE" in text_upper:
            return "URGENT"
        else:
            return "ROUTINE"


# Global singleton
deepseek_engine = CustomAPIEngine()
