"""Analytic profiles isolate grade/section math from GPX coordinate parsing."""

import math
from collections.abc import Sequence
from dataclasses import replace

import pytest

from app import course_analysis as ca
from app.course_processing import (
    CALCULATION_VERSION,
    CoursePoint,
    CourseProcessingError,
    CourseSegment,
    ProcessedCourse,
    process_course,
)


def profile(*segments: Sequence[tuple[float, float | None]]) -> ProcessedCourse:
    """Supply normalized cumulative metres/elevation, as the parser does."""
    return ProcessedCourse(
        "test-hash",
        CALCULATION_VERSION,
        "track",
        tuple(
            CourseSegment(
                tuple(CoursePoint(0, 0, height, distance) for distance, height in segment)
            )
            for segment in segments
        ),
        segments[-1][-1][0],
        None,
        None,
        None,
        None,
        (),
    )


def test_climb_descent_sections_and_distance_weighted_bands() -> None:
    # 1 km at +10%, 1 km at -5%, then a flat 50 m tail.
    course = profile(
        [(i * 100, i * 10) for i in range(11)]
        + [(1000 + i * 100, 100 - i * 5) for i in range(1, 11)]
        + [(2050, 50)]
    )
    analysis = ca.analyze_course(course)
    assert len(analysis.sections) == 21
    assert [b.distance_m for b in analysis.grade_bands] == [0, 1000, 50, 0, 1000]
    assert analysis.unknown_grade_distance_m == 0
    climb, descent = analysis.sustained_runs
    assert (climb.direction, climb.start_distance_m, climb.end_distance_m) == ("ascent", 0, 1000)
    assert climb.net_elevation_change_m == 100
    assert climb.average_grade_percent == 10
    assert (descent.direction, descent.start_section_index, descent.end_section_index) == (
        "descent",
        10,
        19,
    )
    assert descent.net_elevation_change_m == -50
    assert descent.average_grade_percent == -5
    assert ca.analyze_course(course) == analysis


@pytest.mark.parametrize(("grade", "band"), [(-10, 1), (-3, 2), (3, 3), (10, 4), (0, 2)])
def test_exact_grade_band_boundaries(grade: float, band: int) -> None:
    analysis = ca.analyze_course(profile([(0, 0), (100, grade)]))
    assert analysis.grade_bands[band].distance_m == 100
    assert sum(b.distance_m for b in analysis.grade_bands) == 100


def test_irregular_samples_interpolate_only_within_observed_edges() -> None:
    analysis = ca.analyze_course(profile([(0, 0), (75, 7.5), (250, 25)]))
    assert [s.end_distance_m - s.start_distance_m for s in analysis.sections] == [100, 100, 50]
    assert [s.elevation_change_m for s in analysis.sections] == pytest.approx([10, 10, 5])
    assert [s.average_grade_percent for s in analysis.sections] == pytest.approx([10, 10, 10])


def test_missing_elevation_invalidates_affected_bins_only() -> None:
    analysis = ca.analyze_course(profile([(0, 0), (100, None), (200, 20), (300, 30)]))
    assert [s.average_grade_percent for s in analysis.sections] == [None, None, 10]
    assert analysis.unknown_grade_distance_m == 200
    assert sum(b.distance_m for b in analysis.grade_bands) == 100
    assert "incomplete_grade_coverage" in analysis.warnings


def test_sparse_edges_not_reported_as_reliable_gradients() -> None:
    analysis = ca.analyze_course(profile([(0, 0), (600, 60), (700, 70)]))
    assert analysis.unknown_grade_distance_m == 600
    assert analysis.sections[-1].average_grade_percent == 10
    assert analysis.sustained_runs == ()


def test_track_gaps_never_join_runs_and_sections_restart_at_segment_start() -> None:
    analysis = ca.analyze_course(
        profile(
            [(0, 0), (200, 40)],
            [(200, 1000), (550, 1070)],
        )
    )
    assert [(s.start_distance_m, s.end_distance_m) for s in analysis.sections] == [
        (0, 100),
        (100, 200),
        (200, 300),
        (300, 400),
        (400, 500),
        (500, 550),
    ]
    assert len(analysis.sustained_runs) == 1
    assert analysis.sustained_runs[0].segment_index == 1
    assert analysis.sustained_runs[0].net_elevation_change_m == 70


def test_zero_distance_elevation_jump_is_unknown_not_infinite_grade() -> None:
    analysis = ca.analyze_course(profile([(0, 0), (0, 100), (100, 110), (200, 120)]))
    assert analysis.sections[0].average_grade_percent is None
    assert analysis.sections[1].average_grade_percent == 10
    assert "zero_distance_elevation_jump" in analysis.warnings


def test_terminal_zero_distance_jump_is_warned_without_inventing_a_section() -> None:
    analysis = ca.analyze_course(profile([(0, 0), (100, 10), (100, 100)]))
    assert len(analysis.sections) == 1
    assert analysis.sections[0].average_grade_percent == 10
    assert "zero_distance_elevation_jump" in analysis.warnings


def test_unknown_and_rolling_sections_break_sustained_runs() -> None:
    analysis = ca.analyze_course(
        profile(
            [
                (0, 0),
                (100, 20),
                (200, 40),
                (300, 40),
                (400, 60),
                (500, 80),
                (600, None),
                (700, 120),
                (800, 140),
                (900, 160),
            ]
        )
    )
    assert analysis.sustained_runs == ()


def test_sustained_run_requires_both_distance_and_net_elevation() -> None:
    # 300 m at 5% passes distance but only rises 15 m.
    assert ca.analyze_course(profile([(0, 0), (300, 15)])).sustained_runs == ()
    # 200 m at 20% gains 40 m but is too short.
    assert ca.analyze_course(profile([(0, 0), (200, 40)])).sustained_runs == ()
    run = ca.analyze_course(profile([(0, 0), (300, 30)])).sustained_runs[0]
    assert run.end_distance_m == 300


def test_single_point_and_stationary_segments_do_not_create_empty_sections() -> None:
    analysis = ca.analyze_course(profile([(0, 1)], [(0, 1), (0, 1)], [(0, 0), (100, 1)]))
    assert len(analysis.sections) == 1
    assert analysis.sections[0].segment_index == 2


def test_analysis_output_is_bounded(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ca, "MAX_SECTIONS", 2)
    with pytest.raises(CourseProcessingError, match="analysis_section_limit"):
        ca.analyze_course(profile([(0, 0), (301, 30)]))


def test_full_gpx_processing_to_analysis_preserves_identity_and_coverage() -> None:
    data = b"""<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
    <trk><trkseg><trkpt lat="0" lon="0"><ele>0</ele></trkpt>
    <trkpt lat="0" lon="0.002"><ele>20</ele></trkpt></trkseg></trk></gpx>"""
    course = process_course(data)
    analysis = ca.analyze_course(course)
    assert analysis.gpx_sha256 == course.gpx_sha256
    assert analysis.calculation_version == course.calculation_version
    assert sum(b.distance_m for b in analysis.grade_bands) == pytest.approx(course.distance_m)
    assert analysis.sections[-1].end_distance_m == course.distance_m
    assert all(math.isfinite(s.average_grade_percent or 0) for s in analysis.sections)
    assert ca.analyze_course(replace(course, warnings=("source_warning",))).warnings == (
        "source_warning",
    )
