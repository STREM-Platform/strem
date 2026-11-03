"""Synthetic fixtures exercise geometry accuracy and untrusted file boundaries."""

import hashlib
import math
import stat
import zipfile
from io import BytesIO

import pytest

from app import course_processing as cp


def gpx(content: str, *, version: str = "1.1") -> bytes:
    ns = version.replace(".", "/")
    return (
        f'<gpx xmlns="http://www.topografix.com/GPX/{ns}" '
        f'version="{version}" creator="STREM synthetic test">{content}</gpx>'
    ).encode()


def point(lon: str = "0", ele: str | None = "100", *, lat: str = "0") -> str:
    elevation = "" if ele is None else f"<ele>{ele}</ele>"
    return f'<trkpt lat="{lat}" lon="{lon}">{elevation}</trkpt>'


def track(points: str) -> bytes:
    return gpx(f"<trk><trkseg>{points}</trkseg></trk>")


def archive(*files: tuple[str, bytes]) -> bytes:
    output = BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zipped:
        for name, data in files:
            zipped.writestr(name, data)
    return output.getvalue()


def assert_error(data: bytes, code: str) -> None:
    with pytest.raises(cp.CourseProcessingError) as caught:
        cp.process_course(data)
    assert caught.value.code == code
    assert str(caught.value) == code


def test_distance_profile_elevation_and_fingerprint() -> None:
    data = track(point() + point("0.001", "120") + point("0.002", "105"))
    course = cp.process_course(data)
    # Two thousandths of an equatorial degree on the documented sphere.
    assert course.distance_m == pytest.approx(222.39016, abs=0.001)
    assert (course.ascent_m, course.descent_m) == (20, 15)
    assert (course.lowest_elevation_m, course.highest_elevation_m) == (100, 120)
    assert course.segments[0].points[-1].distance_m == course.distance_m
    assert course.gpx_sha256 == hashlib.sha256(data).hexdigest()
    assert cp.process_course(data) == course
    assert course.warnings == ("unsmoothed_elevation",)


def test_zip_and_raw_have_identical_geometry_and_gpx_hash() -> None:
    data = track(point() + point("0.001"))
    assert cp.process_course(archive(("course/UTH50.GPX", data))) == cp.process_course(data)


def test_segment_break_never_adds_distance_or_elevation_between_segments() -> None:
    first = point() + point("0.001", "110")
    second = point("10", "1000") + point("10.001", "990")
    course = cp.process_course(gpx(f"<trk><trkseg>{first}</trkseg><trkseg>{second}</trkseg></trk>"))
    assert len(course.segments) == 2
    assert course.distance_m == pytest.approx(222.39016, abs=0.001)
    assert course.segments[1].points[0].distance_m == course.segments[0].points[-1].distance_m
    assert (course.ascent_m, course.descent_m) == (10, 10)
    assert "discontinuous_track" in course.warnings


def test_partial_elevation_is_unknown_and_never_interpolated() -> None:
    course = cp.process_course(track(point() + point("0.001", None) + point("0.002", "90")))
    assert course.ascent_m is course.descent_m is None
    assert course.lowest_elevation_m is course.highest_elevation_m is None
    assert course.segments[0].points[1].elevation_m is None
    assert course.warnings == ("missing_elevation",)


@pytest.mark.parametrize("version", ["1.0", "1.1"])
def test_routes_are_supported_and_waypoints_extensions_are_not_geometry(version: str) -> None:
    data = gpx(
        '<wpt lat="80" lon="80"/><extensions><trkpt lat="90" lon="90"/></extensions>'
        '<rte><rtept lat="0" lon="0"/><rtept lat="0" lon="0.001"/></rte>',
        version=version,
    )
    course = cp.process_course(data)
    assert course.geometry_kind == "route"
    assert len(course.segments[0].points) == 2
    assert course.distance_m == pytest.approx(111.19508, abs=0.001)


def test_antimeridian_short_arc_and_sparse_warning() -> None:
    course = cp.process_course(track(point("179.99") + point("-179.99")))
    assert course.distance_m == pytest.approx(2223.9016, abs=0.01)
    assert "sparse_geometry" in course.warnings


def test_duplicate_points_do_not_add_horizontal_distance() -> None:
    course = cp.process_course(track(point() + point() + point("0.001")))
    assert course.distance_m == pytest.approx(111.19508, abs=0.001)
    assert math.isfinite(course.distance_m)


@pytest.mark.parametrize("value", ["nan", "inf", "-inf", "1e999", "", "hello"])
def test_nonfinite_or_invalid_values(value: str) -> None:
    assert_error(track(point(value) + point("0.001")), "invalid_coordinate")
    assert_error(track(point(ele=value) + point("0.001")), "invalid_elevation")


@pytest.mark.parametrize(("lat", "lon"), [("91", "0"), ("-91", "0"), ("0", "180")])
def test_coordinate_range(lat: str, lon: str) -> None:
    assert_error(track(point(lon, lat=lat) + point("0.001")), "invalid_coordinate")


@pytest.mark.parametrize(
    "body",
    [
        "<trk/>",
        "<wpt lat='0' lon='0'/>",
        "<trk/><rte/>",
        "<trk/><trk/>",
        "<rte/><rte/>",
    ],
)
def test_ambiguous_and_empty_courses(body: str) -> None:
    code = "insufficient_geometry" if body == "<trk/>" else "requires_one_track_or_route"
    assert_error(gpx(body), code)


def test_insufficient_geometry_and_duplicate_elevation() -> None:
    assert_error(track(point()), "insufficient_geometry")
    assert_error(track(point() + point()), "insufficient_geometry")
    assert_error(track(point().replace("</trkpt>", "<ele>1</ele></trkpt>")), "invalid_elevation")


@pytest.mark.parametrize(
    "data",
    [
        b"<gpx/>",
        b'<gpx version="1.1"/>',
        b'<gpx xmlns="http://www.topografix.com/GPX/1/0" version="1.1"/>',
    ],
)
def test_unsupported_gpx(data: bytes) -> None:
    assert_error(data, "unsupported_gpx")


@pytest.mark.parametrize("encoding", ["utf-8", "utf-16"])
def test_dtd_and_external_entity_rejected_even_in_utf16(encoding: str) -> None:
    xml = (
        f'<?xml version="1.0" encoding="{encoding}"?>'
        '<!DOCTYPE gpx [<!ENTITY secret SYSTEM "file:///private.txt">]>'
        "<gpx>&secret;</gpx>"
    )
    assert_error(xml.encode(encoding), "invalid_xml")
    assert_error("<!DOCTYPE gpx><gpx/>".encode(encoding), "invalid_xml")


def test_malformed_xml() -> None:
    assert_error(b"<gpx>", "invalid_xml")
    assert_error(b'<?xml version="1.0" encoding="unknown-encoding"?><gpx/>', "invalid_xml")


def test_processing_limits(monkeypatch: pytest.MonkeyPatch) -> None:
    data = track(point() + point("0.001"))
    monkeypatch.setattr(cp, "MAX_POINTS", 1)
    assert_error(data, "point_limit")
    monkeypatch.setattr(cp, "MAX_XML_NODES", 2)
    assert_error(data, "xml_complexity_limit")
    monkeypatch.setattr(cp, "MAX_XML_NODES", 100)
    monkeypatch.setattr(cp, "MAX_XML_DEPTH", 2)
    assert_error(data, "xml_complexity_limit")
    monkeypatch.setattr(cp, "MAX_BYTES", 2)
    assert_error(data, "file_size_limit")
    assert_error(b"", "file_size_limit")


@pytest.mark.parametrize("name", ["../route.gpx", "/route.gpx", "C:/route.gpx", r"..\route.gpx"])
def test_archive_unsafe_paths(name: str) -> None:
    assert_error(archive((name, b"<gpx/>")), "unsafe_archive")


def test_archive_ambiguity_corruption_nested_and_symlink() -> None:
    assert_error(archive(("a.gpx", b"a"), ("b.gpx", b"b")), "archive_requires_one_gpx")
    assert_error(archive(("readme.txt", b"a")), "archive_requires_one_gpx")
    assert_error(b"PK corrupt", "invalid_archive")
    assert_error(archive(("a.zip", b"a")), "nested_archive")
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w") as zipped:
        entry = zipfile.ZipInfo("route.gpx")
        entry.external_attr = (stat.S_IFLNK | 0o777) << 16
        zipped.writestr(entry, "target")
    assert_error(buffer.getvalue(), "unsafe_archive")


def test_archive_expansion_and_entry_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    # The compressed input fits; its declared uncompressed size exceeds the cap.
    data = archive(("large.gpx", b" " * 10_000))
    assert len(data) < 1000
    monkeypatch.setattr(cp, "MAX_BYTES", 1000)
    assert_error(data, "archive_size_limit")
    monkeypatch.setattr(cp, "MAX_ZIP_ENTRIES", 1)
    assert_error(archive(("a", b"a"), ("b", b"b")), "archive_entry_limit")


def test_archive_crc_failure_is_safe_error() -> None:
    buffer = BytesIO()
    data = track(point() + point("0.001"))
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_STORED) as zipped:
        zipped.writestr("route.gpx", data)
    damaged = buffer.getvalue().replace(data, b"X" + data[1:])
    assert_error(damaged, "invalid_archive")


@pytest.mark.parametrize("compression", [zipfile.ZIP_BZIP2, zipfile.ZIP_LZMA])
def test_archive_unapproved_compression(compression: int) -> None:
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", compression) as zipped:
        zipped.writestr("route.gpx", track(point() + point("0.001")))
    assert_error(buffer.getvalue(), "unsafe_archive")
