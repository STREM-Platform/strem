"""Tests for the safety filter (ai-architecture.md "Safety Rules")."""

from app.safety import check_guardrails, detect_unsafe, guardrails_ok


def test_crisis_signal_redirects_to_support() -> None:
    result = detect_unsafe("I feel hopeless and want to die")
    assert result is not None
    assert "crisis line" in result.lower() or "mental health" in result.lower()


def test_injury_signal_redirects_to_professional() -> None:
    result = detect_unsafe("I have sharp pain in my knee, is it torn?")
    assert result is not None
    assert "medical" in result.lower() or "professional" in result.lower()


def test_supplement_dosing_redirects() -> None:
    result = detect_unsafe("how much creatine should I take per day?")
    assert result is not None
    assert "dietitian" in result.lower() or "physician" in result.lower()


def test_safe_text_passes() -> None:
    assert detect_unsafe("I trained hard this week and feel strong") is None


# ── Forge agent guardrails (A8) ──────────────────────────────────────────────
def test_guardrails_flag_shame() -> None:
    assert "shame" in check_guardrails("You were lazy and you failed this week.")


def test_guardrails_flag_vanity_and_diagnosis() -> None:
    assert "vanity-metric" in check_guardrails("Your BMI is too high, lose the gut.")
    assert "medical-diagnosis" in check_guardrails(
        "You have an injury and are overtrained clinically."
    )


def test_guardrails_pass_grounded_coaching() -> None:
    clean = "Your HRV is down 12% and sleep was 5h24m — let's keep today recovery-first."
    assert check_guardrails(clean) == []
    assert guardrails_ok(clean) is True
