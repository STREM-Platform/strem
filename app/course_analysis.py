"""Deterministic geometric sections for training#10, not coaching advice.

100 m sections use linear elevation changes within recorded edges <=500 m.
Missing elevation, sparse edges and zero-distance elevation jumps stay unknown.
Runs are geometric observations, not named/official climbs or difficulty ratings.
"""

import math
from dataclasses import dataclass
from itertools import pairwise

from app.course_processing import CourseProcessingError, ProcessedCourse

ANALYSIS_VERSION = "course-100m-net-grade-v1"
SECTION_LENGTH_M = 100.0
MAX_SECTIONS = 10_000
MAX_SUPPORTED_EDGE_M = 500.0
MIN_RUN_DISTANCE_M = 300.0
MIN_RUN_ELEVATION_M = 30.0


@dataclass(frozen=True)
class CourseSection:
    segment_index: int
    start_distance_m: float
    end_distance_m: float
    elevation_change_m: float | None
    average_grade_percent: float | None


@dataclass(frozen=True)
class GradeBand:
    lower_percent_inclusive: float | None
    upper_percent_exclusive: float | None
    distance_m: float


@dataclass(frozen=True)
class SustainedRun:
    direction: str
    segment_index: int
    start_section_index: int
    end_section_index: int
    start_distance_m: float
    end_distance_m: float
    net_elevation_change_m: float
    average_grade_percent: float


@dataclass(frozen=True)
class CourseAnalysis:
    gpx_sha256: str
    calculation_version: str
    analysis_version: str
    sections: tuple[CourseSection, ...]
    grade_bands: tuple[GradeBand, ...]
    unknown_grade_distance_m: float
    sustained_runs: tuple[SustainedRun, ...]
    warnings: tuple[str, ...]


def _sections(course: ProcessedCourse, warnings: set[str]) -> tuple[CourseSection, ...]:
    counts = [
        math.ceil((segment.points[-1].distance_m - segment.points[0].distance_m) / SECTION_LENGTH_M)
        for segment in course.segments
    ]
    if sum(counts) > MAX_SECTIONS:
        raise CourseProcessingError("analysis_section_limit")
    result: list[CourseSection] = []
    for segment_index, (segment, count) in enumerate(zip(course.segments, counts, strict=True)):
        points = segment.points
        edge_index = 0
        base = points[0].distance_m
        for index in range(count):
            start = base + index * SECTION_LENGTH_M
            end = min(base + (index + 1) * SECTION_LENGTH_M, points[-1].distance_m)
            change = 0.0
            known = True
            while edge_index < len(points) - 1:
                a, b = points[edge_index], points[edge_index + 1]
                if a.distance_m >= end:
                    break
                length = b.distance_m - a.distance_m
                if length == 0:
                    if a.elevation_m != b.elevation_m:
                        known = False
                        warnings.add("zero_distance_elevation_jump")
                    edge_index += 1
                    continue
                overlap = min(end, b.distance_m) - max(start, a.distance_m)
                if overlap > 0:
                    if (
                        a.elevation_m is None
                        or b.elevation_m is None
                        or length > MAX_SUPPORTED_EDGE_M
                    ):
                        known = False
                    else:
                        change += (b.elevation_m - a.elevation_m) * overlap / length
                if b.distance_m <= end:
                    edge_index += 1
                else:
                    break
            result.append(
                CourseSection(
                    segment_index,
                    start,
                    end,
                    change if known else None,
                    100 * change / (end - start) if known else None,
                )
            )
    return tuple(result)


def _runs(sections: tuple[CourseSection, ...]) -> tuple[SustainedRun, ...]:
    result: list[SustainedRun] = []
    start = 0
    while start < len(sections):
        first = sections[start]
        grade = first.average_grade_percent
        direction = (
            1
            if grade is not None and grade >= 3
            else (-1 if grade is not None and grade <= -3 else 0)
        )
        if not direction:
            start += 1
            continue
        end = start
        change = 0.0
        while end < len(sections):
            section = sections[end]
            grade = section.average_grade_percent
            if (
                section.segment_index != first.segment_index
                or grade is None
                or grade * direction < 3
            ):
                break
            assert section.elevation_change_m is not None
            change += section.elevation_change_m
            end += 1
        distance = sections[end - 1].end_distance_m - first.start_distance_m
        if distance >= MIN_RUN_DISTANCE_M and abs(change) >= MIN_RUN_ELEVATION_M:
            result.append(
                SustainedRun(
                    "ascent" if direction == 1 else "descent",
                    first.segment_index,
                    start,
                    end - 1,
                    first.start_distance_m,
                    sections[end - 1].end_distance_m,
                    change,
                    100 * change / distance,
                )
            )
        start = end
    return tuple(result)


def analyze_course(course: ProcessedCourse) -> CourseAnalysis:
    """Bounded O(points + sections) analysis of processor-produced geometry.

    Bands use section net grades: <-10, [-10,-3), [-3,3), [3,10), >=10%.
    Runs require consecutive same-direction sections >=3% absolute net grade,
    at least 300 m and at least 30 m net elevation. No merging across unknown,
    rolling, opposite-direction or segment boundaries. Final short bins count.
    """
    warnings = set(course.warnings)
    if any(
        a.distance_m == b.distance_m and a.elevation_m != b.elevation_m
        for segment in course.segments
        for a, b in pairwise(segment.points)
    ):
        warnings.add("zero_distance_elevation_jump")
    sections = _sections(course, warnings)
    boundaries = (-math.inf, -10.0, -3.0, 3.0, 10.0, math.inf)
    distances = [0.0] * 5
    unknown = 0.0
    for section in sections:
        distance = section.end_distance_m - section.start_distance_m
        grade = section.average_grade_percent
        if grade is None:
            unknown += distance
            continue
        for index in range(5):
            if boundaries[index] <= grade < boundaries[index + 1]:
                distances[index] += distance
                break
    if unknown:
        warnings.add("incomplete_grade_coverage")
    return CourseAnalysis(
        course.gpx_sha256,
        course.calculation_version,
        ANALYSIS_VERSION,
        sections,
        tuple(
            GradeBand(
                boundaries[i] if i else None,
                boundaries[i + 1] if i < 4 else None,
                distances[i],
            )
            for i in range(5)
        ),
        unknown,
        _runs(sections),
        tuple(sorted(warnings)),
    )
