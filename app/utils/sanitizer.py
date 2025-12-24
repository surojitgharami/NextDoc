import re
from typing import Optional


def sanitize_user_input(text: str, max_length: int = 5000) -> str:
    if not text:
        return ""
    
    clean_text = text.strip()
    
    if len(clean_text) > max_length:
        clean_text = clean_text[:max_length]
    
    clean_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', clean_text)
    
    return clean_text
