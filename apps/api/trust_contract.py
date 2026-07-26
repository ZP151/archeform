"""Pure offline validation for the ADR-004 sidecar trust contracts.

This module deliberately has no HTTP, subprocess, package-manager, Git, or
plugin integration.  It validates repository-contained JSON evidence only.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import stat
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, SchemaError


ROOT = Path(__file__).resolve().parents[2]
CONTRACTS = ROOT / "docs" / "contracts"
_DIGEST_PREFIX = "sha256:"
_DSSE_PAYLOAD_TYPE = "application/vnd.factory.trust-record-payload.v1+json"
_SPDX_IRI_PATTERN = re.compile(r"(?!_:).+:.+")
_SPDX_BLANK_NODE_PATTERN = re.compile(r"_:.+")
_Q = 2**255 - 19
_L = 2**252 + 27742317777372353535851937790883648493
_D = -121665 * pow(121666, _Q - 2, _Q) % _Q
_I = pow(2, (_Q - 1) // 4, _Q)


class TrustContractError(ValueError):
    """A stable, non-secret denial from offline trust validation."""

    def __init__(self, code: str, detail: str = "") -> None:
        self.code = code
        super().__init__(f"{code}: {detail}" if detail else code)


def _fail(code: str, detail: str = "") -> None:
    raise TrustContractError(code, detail)


def canonical_json_bytes(value: Any) -> bytes:
    """Return strict canonical UTF-8 JSON without allowing NaN or Infinity."""
    try:
        return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")
    except (TypeError, ValueError) as error:
        _fail("noncanonical_json", str(error))


def _without(value: dict[str, Any], *fields: str) -> dict[str, Any]:
    return {key: item for key, item in value.items() if key not in fields}


def _domain_digest(domain: bytes, value: Any) -> str:
    return _DIGEST_PREFIX + hashlib.sha256(domain + canonical_json_bytes(value)).hexdigest()


def calculate_policy_digest(policy: dict[str, Any]) -> str:
    return _domain_digest(b"factory-trust-policy/v1\0", _without(policy, "policy_digest"))


def calculate_record_digest(record: dict[str, Any]) -> str:
    return _domain_digest(b"factory-trust-record/v1\0", _without(record, "record_digest"))


def calculate_record_payload_digest(record: dict[str, Any]) -> str:
    """Bind the signed payload while avoiding the DSSE evidence digest cycle."""
    return _domain_digest(b"factory-trust-payload/v1\0", _without(record, "record_digest", "signature"))


def _digest_of_json(value: Any) -> str:
    return _DIGEST_PREFIX + hashlib.sha256(canonical_json_bytes(value)).hexdigest()


def _strict_pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            _fail("duplicate_json_key", key)
        result[key] = value
    return result


def _is_reparse_point(path: Path) -> bool:
    if path.is_symlink() or getattr(os.path, "isjunction", lambda _: False)(str(path)):
        return True
    try:
        attributes = path.stat(follow_symlinks=False).st_file_attributes
    except (AttributeError, OSError):
        return False
    return bool(attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT)


def _contained(root: Path, path: Path) -> Path:
    """Resolve a regular file below root without accepting an alias escape."""
    try:
        root_absolute = root.absolute()
        candidate_absolute = path.absolute()
        candidate_absolute.relative_to(root_absolute)
        if _is_reparse_point(root_absolute):
            _fail("path_escape", "trust root is a reparse point")
        current = root_absolute
        for part in candidate_absolute.relative_to(root_absolute).parts:
            current = current / part
            if _is_reparse_point(current):
                _fail("path_escape", "symlink or junction")
        resolved_root = root_absolute.resolve(strict=True)
        resolved_candidate = candidate_absolute.resolve(strict=True)
        resolved_candidate.relative_to(resolved_root)
        if not resolved_candidate.is_file():
            _fail("path_escape", "not a regular file")
        return resolved_candidate
    except TrustContractError:
        raise
    except (OSError, ValueError) as error:
        _fail("path_escape", str(error))


def _read_stable_bytes(path: Path, root: Path) -> bytes:
    """Read a contained regular file through one descriptor and revalidate it.

    Path containment alone is not sufficient: an attacker could replace a
    pathname after resolution.  The lstat/fstat identity checks bind the bytes
    to the checked entry and reject a replacement before JSON parsing.
    """
    try:
        before = os.lstat(path)
        if not stat.S_ISREG(before.st_mode):
            _fail("path_escape", "not a regular file")
        flags = os.O_RDONLY | getattr(os, "O_BINARY", 0) | getattr(os, "O_NOFOLLOW", 0)
        descriptor = os.open(str(path), flags)
    except TrustContractError:
        raise
    except OSError as error:
        _fail("path_escape", str(error))
    try:
        opened = os.fstat(descriptor)
        if not stat.S_ISREG(opened.st_mode):
            _fail("path_escape", "opened descriptor is not a regular file")
        if (opened.st_dev, opened.st_ino) != (before.st_dev, before.st_ino):
            _fail("file_replaced")
        chunks: list[bytes] = []
        while True:
            chunk = os.read(descriptor, 65536)
            if not chunk:
                break
            chunks.append(chunk)
    finally:
        os.close(descriptor)
    try:
        after = os.lstat(path)
        if (after.st_dev, after.st_ino) != (before.st_dev, before.st_ino):
            _fail("file_replaced")
        path.resolve(strict=True).relative_to(root.resolve(strict=True))
    except TrustContractError:
        raise
    except (OSError, ValueError) as error:
        _fail("path_escape", str(error))
    return b"".join(chunks)


def _read_json(path: Path, root: Path) -> dict[str, Any]:
    contained = _contained(root, path)
    try:
        raw = _read_stable_bytes(contained, root)
        value = json.loads(raw.decode("utf-8"), object_pairs_hook=_strict_pairs)
    except TrustContractError:
        raise
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        _fail("invalid_json", str(error))
    if not isinstance(value, dict):
        _fail("invalid_json", "JSON value must be an object")
    canonical = canonical_json_bytes(value)
    if raw not in {canonical, canonical + b"\n"}:
        _fail("noncanonical_json", "trust artifacts must use canonical JSON")
    return value


@lru_cache(maxsize=None)
def _schema(name: str) -> dict[str, Any]:
    try:
        return json.loads((CONTRACTS / name).read_text(encoding="utf-8"), object_pairs_hook=_strict_pairs)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, TrustContractError) as error:
        raise RuntimeError(f"trust contract schema {name} is unavailable or invalid") from error


@lru_cache(maxsize=None)
def _validator(name: str) -> Draft202012Validator:
    schema = _schema(name)
    try:
        Draft202012Validator.check_schema(schema)
    except SchemaError as error:
        raise RuntimeError(f"trust contract schema {name} is invalid") from error
    return Draft202012Validator(schema)


def _validate_schema(value: dict[str, Any], name: str) -> None:
    errors = sorted(_validator(name).iter_errors(value), key=lambda error: list(error.absolute_path))
    if errors:
        error = errors[0]
        location = ".".join(str(part) for part in error.absolute_path) or "document"
        _fail("schema_invalid", f"{location}: {error.message}")


def _parse_timestamp(value: str, code: str = "invalid_timestamp") -> datetime:
    try:
        parsed = datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except (TypeError, ValueError) as error:
        _fail(code, str(error))
    return parsed


def _digest_filename(digest: str) -> str:
    if not isinstance(digest, str) or not digest.startswith(_DIGEST_PREFIX) or len(digest) != 71:
        _fail("unsupported_algorithm", "only sha256 evidence references are supported")
    hex_value = digest.removeprefix(_DIGEST_PREFIX)
    if any(character not in "0123456789abcdef" for character in hex_value):
        _fail("unsupported_algorithm", "digest must be lower-case sha256")
    return hex_value + ".json"


def _decode_base64(value: str, code: str) -> bytes:
    try:
        return base64.b64decode(value, validate=True)
    except (TypeError, ValueError) as error:
        _fail(code, str(error))


def validate_trust_policy(policy: dict[str, Any], *, now: datetime | None = None) -> dict[str, Any]:
    """Validate a closed policy and its self-referential canonical digest."""
    _validate_schema(policy, "factory-trust-policy-v1.schema.json")
    if policy["policy_digest"] != calculate_policy_digest(policy):
        _fail("noncanonical_policy")
    signer_fingerprints: set[str] = set()
    for signer in policy["authorized_signers"]:
        fingerprint = signer["fingerprint"]
        if fingerprint in signer_fingerprints:
            _fail("duplicate_signer")
        signer_fingerprints.add(fingerprint)
        public_key = _decode_base64(signer["public_key"], "invalid_public_key")
        if len(public_key) != 32 or _DIGEST_PREFIX + hashlib.sha256(public_key).hexdigest() != fingerprint:
            _fail("invalid_public_key")
        if _is_small_order_point(public_key):
            _fail("small_order_public_key")
    exception_ids: set[str] = set()
    for exception in policy["exceptions"]:
        if exception["id"] in exception_ids:
            _fail("duplicate_policy_exception")
        exception_ids.add(exception["id"])
        _parse_timestamp(exception["expires_at"])
    _parse_timestamp(policy["issued_at"])
    if now is not None and _parse_timestamp(policy["issued_at"]) > now:
        _fail("invalid_timestamp", "policy is issued in the future")
    return policy


def _read_evidence(trust_root: Path, digest: str) -> dict[str, Any]:
    path = trust_root / "evidence" / "sha256" / _digest_filename(digest)
    value = _read_json(path, trust_root)
    if _digest_of_json(value) != digest:
        _fail("evidence_digest_mismatch")
    return value


def _point_xrecover(y: int) -> int | None:
    xx = (y * y - 1) * pow(_D * y * y + 1, _Q - 2, _Q) % _Q
    x = pow(xx, (_Q + 3) // 8, _Q)
    if (x * x - xx) % _Q:
        x = x * _I % _Q
    if (x * x - xx) % _Q:
        return None
    return x


def _decode_point(value: bytes) -> tuple[int, int] | None:
    if len(value) != 32:
        return None
    encoded = int.from_bytes(value, "little")
    sign = encoded >> 255
    y = encoded & ((1 << 255) - 1)
    if y >= _Q:
        return None
    x = _point_xrecover(y)
    if x is None:
        return None
    if x & 1 != sign:
        x = _Q - x
    if x == 0 and sign:
        return None
    return x, y


def _point_add(left: tuple[int, int], right: tuple[int, int]) -> tuple[int, int]:
    x1, y1 = left
    x2, y2 = right
    product = _D * x1 * x2 * y1 * y2 % _Q
    return (
        (x1 * y2 + x2 * y1) * pow(1 + product, _Q - 2, _Q) % _Q,
        (y1 * y2 + x1 * x2) * pow(1 - product, _Q - 2, _Q) % _Q,
    )


def _point_multiply(point: tuple[int, int], scalar: int) -> tuple[int, int]:
    result = (0, 1)
    while scalar:
        if scalar & 1:
            result = _point_add(result, point)
        point = _point_add(point, point)
        scalar >>= 1
    return result


def _encode_point(point: tuple[int, int]) -> bytes:
    x, y = point
    return (y | ((x & 1) << 255)).to_bytes(32, "little")


def _is_small_order_point(encoded: bytes) -> bool:
    """Return whether an encoded Edwards point has order dividing eight."""
    point = _decode_point(encoded)
    return point is not None and _encode_point(_point_multiply(point, 8)) == _encode_point((0, 1))


def _ed25519_verify(public_key: bytes, message: bytes, signature: bytes) -> bool:
    if len(signature) != 64:
        return False
    public_point = _decode_point(public_key)
    nonce_point = _decode_point(signature[:32])
    scalar = int.from_bytes(signature[32:], "little")
    if public_point is None or nonce_point is None or scalar >= _L:
        return False
    if _is_small_order_point(public_key) or _is_small_order_point(signature[:32]):
        return False
    base_y = 4 * pow(5, _Q - 2, _Q) % _Q
    base_x = _point_xrecover(base_y)
    if base_x is None:
        return False
    if base_x & 1:
        base_x = _Q - base_x
    base = (base_x, base_y)
    challenge = int.from_bytes(hashlib.sha512(signature[:32] + public_key + message).digest(), "little") % _L
    return _encode_point(_point_multiply(base, scalar)) == _encode_point(_point_add(nonce_point, _point_multiply(public_point, challenge)))


def _dsse_pae(payload_type: str, payload: bytes) -> bytes:
    encoded_type = payload_type.encode("utf-8")
    return b"DSSEv1 " + str(len(encoded_type)).encode("ascii") + b" " + encoded_type + b" " + str(len(payload)).encode("ascii") + b" " + payload


def _closed_object(value: Any, required: set[str], code: str) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != required:
        _fail(code)
    return value


def _is_spdx_iri(value: Any) -> bool:
    """Match the SPDX 3.0.1 JSON Schema IRI pattern for this closed subset."""
    return isinstance(value, str) and _SPDX_IRI_PATTERN.fullmatch(value) is not None


def _is_spdx_blank_node_or_iri(value: Any) -> bool:
    """Match SPDX 3.0.1 BlankNodeOrIRI without permitting arbitrary strings."""
    return _is_spdx_iri(value) or (isinstance(value, str) and _SPDX_BLANK_NODE_PATTERN.fullmatch(value) is not None)


def _validate_spdx(sbom: dict[str, Any], subject_digest: str) -> None:
    """Validate Factory Pilot's closed SPDX 3.0.1 JSON-LD subset.

    This is intentionally a strict local subset, not a claim to implement the
    complete SPDX semantic validator.  It uses the actual SPDX JSON-LD context,
    CreationInfo, SpdxDocument, software_Package, and Hash graph nodes.
    """
    _closed_object(sbom, {"@context", "@graph"}, "invalid_spdx")
    if sbom["@context"] != "https://spdx.org/rdf/3.0.1/spdx-context.jsonld" or not isinstance(sbom["@graph"], list):
        _fail("invalid_spdx")
    graph = sbom["@graph"]
    if len(graph) != 4 or any(not isinstance(item, dict) for item in graph):
        _fail("invalid_spdx")
    creation = next((item for item in graph if item.get("type") == "CreationInfo"), None)
    document = next((item for item in graph if item.get("type") == "SpdxDocument"), None)
    package = next((item for item in graph if item.get("type") == "software_Package"), None)
    checksum = next((item for item in graph if item.get("type") == "Hash"), None)
    if creation is None or document is None or package is None or checksum is None:
        _fail("invalid_spdx")
    if sum(item.get("type") == "CreationInfo" for item in graph) != 1 or sum(item.get("type") == "SpdxDocument" for item in graph) != 1 or sum(item.get("type") == "software_Package" for item in graph) != 1 or sum(item.get("type") == "Hash" for item in graph) != 1:
        _fail("invalid_spdx")
    _closed_object(creation, {"@id", "created", "createdBy", "specVersion", "type"}, "invalid_spdx")
    if not _is_spdx_blank_node_or_iri(creation["@id"]) or creation["specVersion"] != "3.0.1" or not isinstance(creation["createdBy"], list) or not creation["createdBy"] or any(not _is_spdx_blank_node_or_iri(item) for item in creation["createdBy"]):
        _fail("invalid_spdx")
    _parse_timestamp(creation["created"], "invalid_spdx")
    _closed_object(document, {"creationInfo", "element", "rootElement", "spdxId", "type"}, "invalid_spdx")
    if not _is_spdx_iri(document["spdxId"]) or not _is_spdx_blank_node_or_iri(document["creationInfo"]) or document["creationInfo"] != creation["@id"]:
        _fail("invalid_spdx")
    _closed_object(package, {"creationInfo", "name", "software_packageVersion", "spdxId", "type", "verifiedUsing"}, "invalid_spdx")
    if not _is_spdx_iri(package["spdxId"]) or not _is_spdx_blank_node_or_iri(package["creationInfo"]) or package["creationInfo"] != creation["@id"] or not isinstance(package["name"], str) or not package["name"] or not isinstance(package["software_packageVersion"], str) or not package["software_packageVersion"]:
        _fail("invalid_spdx")
    if document["element"] != [package["spdxId"]] or document["rootElement"] != [package["spdxId"]]:
        _fail("invalid_spdx")
    checksums = package["verifiedUsing"]
    _closed_object(checksum, {"@id", "algorithm", "hashValue", "type"}, "invalid_spdx")
    if not _is_spdx_blank_node_or_iri(checksum["@id"]) or len({creation["@id"], document["spdxId"], package["spdxId"], checksum["@id"]}) != 4:
        _fail("invalid_spdx")
    if not isinstance(checksums, list) or checksums != [checksum["@id"]]:
        _fail("invalid_spdx")
    if checksum["algorithm"] != "sha256" or checksum["hashValue"] != subject_digest.removeprefix(_DIGEST_PREFIX):
        _fail("evidence_subject_mismatch")


def _validate_provenance(provenance: dict[str, Any], record: dict[str, Any]) -> None:
    subject = record["subject"]
    expected_hex = subject["digest"].removeprefix(_DIGEST_PREFIX)
    _closed_object(provenance, {"_type", "subject", "predicateType", "predicate"}, "invalid_provenance")
    if provenance["_type"] != "https://in-toto.io/Statement/v1" or provenance["predicateType"] != "https://slsa.dev/provenance/v1":
        _fail("invalid_provenance")
    subjects = provenance["subject"]
    if not isinstance(subjects, list) or len(subjects) != 1:
        _fail("invalid_provenance")
    provenance_subject = _closed_object(subjects[0], {"name", "digest"}, "invalid_provenance")
    digest = _closed_object(provenance_subject["digest"], {"sha256"}, "invalid_provenance")
    if provenance_subject["name"] != subject["key"] or digest["sha256"] != expected_hex:
        _fail("evidence_subject_mismatch")
    predicate = _closed_object(provenance["predicate"], {"buildDefinition", "runDetails"}, "invalid_provenance")
    build_definition = _closed_object(predicate["buildDefinition"], {"buildType", "externalParameters", "internalParameters", "resolvedDependencies"}, "invalid_provenance")
    if not isinstance(build_definition["buildType"], str) or not build_definition["buildType"] or not isinstance(build_definition["externalParameters"], dict) or not isinstance(build_definition["internalParameters"], dict):
        _fail("invalid_provenance")
    dependencies = build_definition["resolvedDependencies"]
    if not isinstance(dependencies, list) or not dependencies:
        _fail("invalid_provenance")
    revisions: list[str] = []
    for dependency in dependencies:
        dependency_object = _closed_object(dependency, {"digest", "uri"}, "invalid_provenance")
        if not isinstance(dependency_object["uri"], str) or not dependency_object["uri"]:
            _fail("invalid_provenance")
        dependency_digest = _closed_object(dependency_object["digest"], {"gitCommit"}, "invalid_provenance")
        revision = dependency_digest["gitCommit"]
        if not isinstance(revision, str) or len(revision) != 64 or any(character not in "0123456789abcdef" for character in revision):
            _fail("invalid_provenance")
        revisions.append(revision)
    if any(revision != record["source"]["revision"] for revision in revisions):
        _fail("provenance_revision_mismatch")
    run_details = _closed_object(predicate["runDetails"], {"builder", "byproducts", "metadata"}, "invalid_provenance")
    builder = _closed_object(run_details["builder"], {"builderDependencies", "id", "version"}, "invalid_provenance")
    if not isinstance(builder["id"], str) or not builder["id"] or not isinstance(builder["builderDependencies"], list) or not isinstance(builder["version"], dict) or not builder["version"] or any(not isinstance(key, str) or not isinstance(value, str) for key, value in builder["version"].items()):
        _fail("invalid_provenance")
    if not isinstance(run_details["byproducts"], list):
        _fail("invalid_provenance")
    metadata = _closed_object(run_details["metadata"], {"finishedOn", "invocationId", "startedOn"}, "invalid_provenance")
    if not isinstance(metadata["invocationId"], str) or not metadata["invocationId"]:
        _fail("invalid_provenance")
    started_on = _parse_timestamp(metadata["startedOn"], "invalid_provenance")
    finished_on = _parse_timestamp(metadata["finishedOn"], "invalid_provenance")
    if finished_on < started_on:
        _fail("invalid_provenance")


def _validate_policy_decision(record: dict[str, Any], policy: dict[str, Any], now: datetime) -> None:
    if record["verification"]["policy_digest"] != policy["policy_digest"] or record["license"]["policy_version"] != policy["policy_version"]:
        _fail("policy_digest_mismatch")
    expression = record["license"]["expression"]
    if record["license"]["license_list_version"] != policy["spdx_license_list_version"]:
        _fail("spdx_list_version_mismatch")
    if expression not in policy["allowed_spdx_expressions"]:
        _fail("spdx_policy_denied")
    identifiers = set(expression.replace("(", " ").replace(")", " ").replace("AND", " ").replace("OR", " ").split())
    if identifiers.intersection(policy["prohibited_spdx_identifiers"]):
        _fail("spdx_policy_denied")
    allowed_exceptions = {item["id"]: _parse_timestamp(item["expires_at"]) for item in policy["exceptions"]}
    for exception in record["license"]["exceptions"]:
        expires_at = allowed_exceptions.get(exception)
        if expires_at is None:
            _fail("unknown_policy_exception")
        if expires_at <= now:
            _fail("expired_policy_exception")
    verified_at = _parse_timestamp(record["verification"]["verified_at"])
    issued_at = _parse_timestamp(record["issued_at"])
    if _parse_timestamp(policy["issued_at"]) > verified_at:
        _fail("policy_issued_after_verification")
    if verified_at < issued_at or now < verified_at or (now - verified_at).total_seconds() > policy["max_evidence_age_seconds"]:
        _fail("stale_evidence")


def _validate_signature(record: dict[str, Any], policy: dict[str, Any], envelope: dict[str, Any]) -> None:
    signature = record["signature"]
    signer = next((item for item in policy["authorized_signers"] if item["fingerprint"] == signature["key_fingerprint"]), None)
    if signer is None:
        _fail("untrusted_signer")
    if envelope.get("payloadType") != _DSSE_PAYLOAD_TYPE:
        _fail("invalid_dsse_payload_type")
    payload = _decode_base64(envelope.get("payload"), "invalid_dsse_payload")
    try:
        payload_value = json.loads(payload.decode("utf-8"), object_pairs_hook=_strict_pairs)
    except (UnicodeDecodeError, json.JSONDecodeError, TrustContractError) as error:
        if isinstance(error, TrustContractError):
            raise
        _fail("invalid_dsse_payload", str(error))
    if not isinstance(payload_value, dict) or payload_value != {"record_payload_digest": signature["record_payload_digest"], "subject_digest": record["subject"]["digest"]}:
        _fail("signature_payload_mismatch")
    if canonical_json_bytes(payload_value) != payload:
        _fail("noncanonical_json", "DSSE payload must use canonical JSON")
    if signature["record_payload_digest"] != calculate_record_payload_digest(record):
        _fail("signature_payload_mismatch")
    public_key = _decode_base64(signer["public_key"], "invalid_public_key")
    matches = [item for item in envelope.get("signatures", []) if isinstance(item, dict) and item.get("keyid") == signer["fingerprint"]]
    if len(matches) != 1:
        _fail("unsigned_record")
    signature_bytes = _decode_base64(matches[0].get("sig"), "invalid_signature")
    if not _ed25519_verify(public_key, _dsse_pae(_DSSE_PAYLOAD_TYPE, payload), signature_bytes):
        _fail("invalid_signature")


def verify_trust_record(record_path: Path, policy_path: Path, trust_root: Path, *, now: datetime | None = None) -> dict[str, Any]:
    """Verify one trust record and its local evidence, failing closed offline."""
    current_time = now or datetime.now(timezone.utc)
    if current_time.tzinfo is None:
        _fail("invalid_timestamp", "now must be timezone-aware")
    current_time = current_time.astimezone(timezone.utc)
    root = Path(trust_root)
    policy = _read_json(Path(policy_path), root)
    validate_trust_policy(policy, now=current_time)
    record = _read_json(Path(record_path), root)
    _validate_schema(record, "factory-trust-record-v1.schema.json")
    if record["record_digest"] != calculate_record_digest(record):
        _fail("noncanonical_record")
    _validate_policy_decision(record, policy, current_time)
    evidence_references = [record["sbom"]["digest"], record["provenance"]["digest"], record["signature"]["digest"]]
    if len(evidence_references) != len(set(evidence_references)):
        _fail("duplicate_evidence_reference")
    if {record["sbom"]["type"], record["provenance"]["type"], record["signature"]["type"]} != set(policy["required_evidence"]):
        _fail("required_evidence_mismatch")
    sbom = _read_evidence(root, record["sbom"]["digest"])
    provenance = _read_evidence(root, record["provenance"]["digest"])
    signature_path = root / "evidence" / "sha256" / _digest_filename(record["signature"]["digest"])
    try:
        envelope = _read_json(signature_path, root)
    except TrustContractError as error:
        if error.code == "path_escape":
            _fail("unsigned_record")
        raise
    # Check the format before digest equality so malformed envelopes receive a
    # stable format error instead of an opaque hash mismatch.
    if envelope.get("payloadType") != _DSSE_PAYLOAD_TYPE:
        _fail("invalid_dsse_payload_type")
    if _digest_of_json(envelope) != record["signature"]["digest"]:
        _fail("evidence_digest_mismatch")
    _validate_spdx(sbom, record["subject"]["digest"])
    _validate_provenance(provenance, record)
    _validate_signature(record, policy, envelope)
    return record
