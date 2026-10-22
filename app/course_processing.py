"""Internal GPX processing for training#10; no persistence or public API contract.

Calculations describe the supplied geometry, not verified organizer race facts.
Segment breaks are preserved. Elevation totals are raw/unsmoothed and remain
unknown if any point lacks elevation. No XML links or archive paths are fetched.
"""

import argparse
import hashlib
import json
import math
import stat
import zipfile
import zlib
from dataclasses import asdict, dataclass
from io import BytesIO
from pathlib import Path, PurePosixPath
from xml.etree.ElementTree import Element, ParseError

from defusedxml import ElementTree as SafeXML  # type: ignore[import-untyped]
from defusedxml.common import DefusedXmlException  # type: ignore[import-untyped]

MAX_BYTES = 4 * 1024 * 1024
MAX_POINTS = 50_000
MAX_XML_NODES = 250_000
MAX_XML_DEPTH = 32
MAX_ZIP_ENTRIES = 16
EARTH_RADIUS_M = 6_371_008.8
CALCULATION_VERSION = "gpx-haversine-raw-elevation-v1"
_NAMESPACES = {
    "1.0": "http://www.topografix.com/GPX/1/0",
    "1.1": "http://www.topografix.com/GPX/1/1",
}


class CourseProcessingError(ValueError):
    """Stable internal error code without file names, XML or private metadata."""

    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


@dataclass(frozen=True)
class CoursePoint:
    latitude: float
    longitude: float
    elevation_m: float | None
    distance_m: float


@dataclass(frozen=True)
class CourseSegment:
    points: tuple[CoursePoint, ...]


@dataclass(frozen=True)
class ProcessedCourse:
    gpx_sha256: str
    calculation_version: str
    geometry_kind: str
    segments: tuple[CourseSegment, ...]
    distance_m: float
    ascent_m: float | None
    descent_m: float | None
    lowest_elevation_m: float | None
    highest_elevation_m: float | None
    warnings: tuple[str, ...]


def _fail(code: str) -> None:
    raise CourseProcessingError(code)


def extract_gpx(data: bytes) -> bytes:
    if not data or len(data) > MAX_BYTES:
        _fail("file_size_limit")
    if not data.startswith(b"PK"):
        return data
    try:
        with zipfile.ZipFile(BytesIO(data)) as archive:
            entries = archive.infolist()
            if len(entries) > MAX_ZIP_ENTRIES:
                _fail("archive_entry_limit")
            if sum(entry.file_size for entry in entries) > MAX_BYTES:
                _fail("archive_size_limit")
            candidates = []
            for entry in entries:
                path = PurePosixPath(entry.filename.replace("\\", "/"))
                mode = entry.external_attr >> 16
                if (
                    path.is_absolute()
                    or ".." in path.parts
                    or ":" in entry.filename
                    or stat.S_ISLNK(mode)
                    or entry.flag_bits & 1
                    or entry.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED)
                ):
                    _fail("unsafe_archive")
                if entry.is_dir():
                    continue
                if path.suffix.lower() == ".zip":
                    _fail("nested_archive")
                if path.suffix.lower() == ".gpx":
                    candidates.append(entry)
            if len(candidates) != 1:
                _fail("archive_requires_one_gpx")
            with archive.open(candidates[0]) as stream:
                gpx = stream.read(MAX_BYTES + 1)
            if not gpx or len(gpx) > MAX_BYTES:
                _fail("file_size_limit")
            return gpx
    except (zipfile.BadZipFile, RuntimeError, NotImplementedError, EOFError, OSError, zlib.error):
        raise CourseProcessingError("invalid_archive") from None


def _parse(data: bytes) -> Element:
    root: Element | None = None
    depth = nodes = 0
    try:
        for event, element in SafeXML.iterparse(
            BytesIO(data),
            events=("start", "end"),
            forbid_dtd=True,
            forbid_entities=True,
            forbid_external=True,
        ):
            if event == "start":
                depth += 1
                nodes += 1
                if depth > MAX_XML_DEPTH or nodes > MAX_XML_NODES:
                    _fail("xml_complexity_limit")
                if root is None:
                    root = element
            else:
                depth -= 1
    except (DefusedXmlException, ParseError, ValueError, LookupError) as error:
        if isinstance(error, CourseProcessingError):
            raise
        raise CourseProcessingError("invalid_xml") from None
    if root is None:
        _fail("invalid_xml")
    assert root is not None
    return root


def _number(value: str | None, code: str) -> float:
    try:
        result = float(value) if value is not None else math.nan
    except ValueError:
        raise CourseProcessingError(code) from None
    if not math.isfinite(result):
        _fail(code)
    return result


def _coordinate(point: Element, prefix: str) -> tuple[float, float, float | None]:
    lat = _number(point.get("lat"), "invalid_coordinate")
    lon = _number(point.get("lon"), "invalid_coordinate")
    if not -90 <= lat <= 90 or not -180 <= lon < 180:
        _fail("invalid_coordinate")
    elevations = point.findall(f"{prefix}ele")
    if len(elevations) > 1:
        _fail("invalid_elevation")
    elevation = _number(elevations[0].text, "invalid_elevation") if elevations else None
    # Finite but extreme decimal values can overflow subtraction/totals.
    if elevation is not None and abs(elevation) > 100_000:
        _fail("invalid_elevation")
    return lat, lon, elevation


def _distance(a: CoursePoint, lat: float, lon: float) -> float:
    lat_a, lat_b = math.radians(a.latitude), math.radians(lat)
    delta_lat = lat_b - lat_a
    delta_lon = math.radians(lon - a.longitude)
    hav = math.sin(delta_lat / 2) ** 2 + (
        math.cos(lat_a) * math.cos(lat_b) * math.sin(delta_lon / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(min(1.0, max(0.0, hav))))


def process_course(data: bytes) -> ProcessedCourse:
    """Process GPX 1.0/1.1 or a ZIP containing exactly one GPX, in memory.

    Requires the matching official namespace/version and one direct track OR
    route. Waypoints and extension geometry are ignored; multiple alternatives
    are rejected. Distances are horizontal metres; no smoothing/interpolation.
    """
    gpx = extract_gpx(data)
    root = _parse(gpx)
    namespace = _NAMESPACES.get(root.get("version", ""))
    if namespace is None or root.tag != f"{{{namespace}}}gpx":
        _fail("unsupported_gpx")
    prefix = f"{{{namespace}}}"
    tracks = root.findall(f"{prefix}trk")
    routes = root.findall(f"{prefix}rte")
    if len(tracks) + len(routes) != 1:
        _fail("requires_one_track_or_route")
    geometry_kind = "track" if tracks else "route"
    groups = tracks[0].findall(f"{prefix}trkseg") if tracks else routes
    point_tag = f"{prefix}trkpt" if tracks else f"{prefix}rtept"
    segments: list[CourseSegment] = []
    warnings: set[str] = set()
    distance = ascent = descent = 0.0
    elevations: list[float] = []
    point_count = 0
    for group in groups:
        points: list[CoursePoint] = []
        for element in group.findall(point_tag):
            point_count += 1
            if point_count > MAX_POINTS:
                _fail("point_limit")
            lat, lon, elevation = _coordinate(element, prefix)
            if elevation is None:
                warnings.add("missing_elevation")
            else:
                elevations.append(elevation)
            if points:
                previous = points[-1]
                step = _distance(previous, lat, lon)
                distance += step
                if step > 500:
                    warnings.add("sparse_geometry")
                if elevation is not None and previous.elevation_m is not None:
                    change = elevation - previous.elevation_m
                    ascent += max(change, 0)
                    descent += max(-change, 0)
            points.append(CoursePoint(lat, lon, elevation, distance))
        if points:
            segments.append(CourseSegment(tuple(points)))
    if point_count < 2 or distance <= 0:
        _fail("insufficient_geometry")
    if len(segments) > 1:
        warnings.add("discontinuous_track")
    complete_elevation = "missing_elevation" not in warnings
    if complete_elevation:
        warnings.add("unsmoothed_elevation")
    return ProcessedCourse(
        gpx_sha256=hashlib.sha256(gpx).hexdigest(),
        calculation_version=CALCULATION_VERSION,
        geometry_kind=geometry_kind,
        segments=tuple(segments),
        distance_m=distance,
        ascent_m=ascent if complete_elevation else None,
        descent_m=descent if complete_elevation else None,
        lowest_elevation_m=min(elevations) if complete_elevation else None,
        highest_elevation_m=max(elevations) if complete_elevation else None,
        warnings=tuple(sorted(warnings)),
    )


def main() -> None:
    """Local review helper; prints summary only, never raw GPX or coordinates."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path, help="Local GPX or single-GPX ZIP")
    parser.add_argument("--analyze", action="store_true", help="Include grade and climb summary")
    args = parser.parse_args()
    try:
        with args.file.open("rb") as stream:
            course = process_course(stream.read(MAX_BYTES + 1))
        analysis_summary: dict[str, object] = {}
        if args.analyze:
            from app.course_analysis import analyze_course

            analysis = analyze_course(course)
            analysis_summary = {
                "analysis_version": analysis.analysis_version,
                "section_count": len(analysis.sections),
                "grade_bands": [asdict(band) for band in analysis.grade_bands],
                "unknown_grade_distance_m": analysis.unknown_grade_distance_m,
                "sustained_runs": [asdict(run) for run in analysis.sustained_runs],
                "analysis_warnings": analysis.warnings,
            }
    except (CourseProcessingError, OSError) as error:
        parser.exit(1, f"Course processing failed: {getattr(error, 'code', 'file_unreadable')}\n")
    print(
        json.dumps(
            {
                "gpx_sha256": course.gpx_sha256,
                "calculation_version": course.calculation_version,
                "geometry_kind": course.geometry_kind,
                "segment_count": len(course.segments),
                "point_count": sum(len(segment.points) for segment in course.segments),
                "distance_m": round(course.distance_m, 2),
                "raw_ascent_m": course.ascent_m,
                "raw_descent_m": course.descent_m,
                "lowest_elevation_m": course.lowest_elevation_m,
                "highest_elevation_m": course.highest_elevation_m,
                "warnings": course.warnings,
                **analysis_summary,
            },
            indent=2,
            allow_nan=False,
        )
    )


if __name__ == "__main__":
    main()
