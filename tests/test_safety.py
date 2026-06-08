"""Tests for the safety filter (ai-architecture.md "Safety Rules")."""

from app.safety import detect_unsafe


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
