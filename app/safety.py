"""Safety boundaries for AI coaching (ai-architecture.md "Safety Rules").

The MVP coach must not provide medical or injury diagnosis, extreme-diet
prescription, supplement dosing, or crisis/mental-health counseling. When such a
signal is present, the response is replaced with a care-framed redirect to a
qualified professional — never framed as punishment.
"""

from __future__ import annotations

import re

CRISIS_REDIRECT = (
    "It sounds like you're going through something heavy. Please reach out to a "
    "mental health professional or a crisis line — you deserve real support. "
    "I'll be here when you're ready to train again."
)
MEDICAL_REDIRECT = (
    "I'm not able to give medical or injury advice — please consult a qualified "
    "professional. When you're cleared, we'll ease back in together."
)
NUTRITION_REDIRECT = (
    "I can't prescribe supplement doses or medical nutrition therapy — a "
    "registered dietitian or physician is the right call here."
)

_CRISIS = re.compile(
    r"\b(suicid|kill myself|want to die|end it all|hopeless|self.?harm|hurt myself)\b",
    re.IGNORECASE,
)
_MEDICAL = re.compile(
    r"\b(diagnos|is it broken|torn|fracture|sharp pain|can'?t walk|injur|prescrib\w*)\b",
    re.IGNORECASE,
)
_SUPPLEMENT = re.compile(
    r"\b(how much (creatine|protein|caffeine)|supplement dose|dosage|mg of)\b",
    re.IGNORECASE,
)


def detect_unsafe(text: str) -> str | None:
    """Return a care-framed redirect when the text contains a prohibited signal."""
    if _CRISIS.search(text):
        return CRISIS_REDIRECT
    if _MEDICAL.search(text):
        return MEDICAL_REDIRECT
    if _SUPPLEMENT.search(text):
        return NUTRITION_REDIRECT
    return None
