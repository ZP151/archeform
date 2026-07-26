from __future__ import annotations

import base64
import copy
import hashlib
import json
import os
import socket
import subprocess
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

from apps.api.trust_contract import (
    TrustContractError,
    _ed25519_verify,
    _is_small_order_point,
    canonical_json_bytes,
    calculate_policy_digest,
    calculate_record_digest,
    validate_trust_policy,
    verify_trust_record,
)


PACKAGE_DIGEST = "sha256:" + "a" * 64
SOURCE_REVISION = "b" * 64
TEST_PRIVATE_KEY = bytes(range(1, 33))
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "trust"
SMALL_ORDER_ENCODINGS = tuple(bytes.fromhex(value) for value in (
    "00" * 32,
    "01" + "00" * 31,
    "ec" + "ff" * 30 + "7f",
    "ed" + "ff" * 30 + "7f",
    "26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05",
    "c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac037a",
    "00" + "00" * 30 + "80",
    "01" + "00" * 30 + "80",
))


# RFC 8032 arithmetic is intentionally test-only: the production module only
# verifies signatures and never contains or receives a private key.
_Q = 2**255 - 19
_L = 2**252 + 27742317777372353535851937790883648493
_D = -121665 * pow(121666, _Q - 2, _Q) % _Q
_I = pow(2, (_Q - 1) // 4, _Q)


def _xrecover(y: int) -> int:
    xx = (y * y - 1) * pow(_D * y * y + 1, _Q - 2, _Q) % _Q
    x = pow(xx, (_Q + 3) // 8, _Q)
    if (x * x - xx) % _Q:
        x = x * _I % _Q
    return x if x % 2 == 0 else _Q - x


_BY = 4 * pow(5, _Q - 2, _Q) % _Q
_BX = _xrecover(_BY)
_B = (_BX, _BY)


def _edwards_add(left: tuple[int, int], right: tuple[int, int]) -> tuple[int, int]:
    x1, y1 = left
    x2, y2 = right
    denominator = _D * x1 * x2 * y1 * y2 % _Q
    return (
        (x1 * y2 + x2 * y1) * pow(1 + denominator, _Q - 2, _Q) % _Q,
        (y1 * y2 + x1 * x2) * pow(1 - denominator, _Q - 2, _Q) % _Q,
    )


def _scalarmult(point: tuple[int, int], scalar: int) -> tuple[int, int]:
    result = (0, 1)
    while scalar:
        if scalar & 1:
            result = _edwards_add(result, point)
        point = _edwards_add(point, point)
        scalar >>= 1
    return result


def _encode_point(point: tuple[int, int]) -> bytes:
    x, y = point
    value = y | ((x & 1) << 255)
    return value.to_bytes(32, "little")


def _public_key(seed: bytes) -> bytes:
    digest = hashlib.sha512(seed).digest()
    scalar = int.from_bytes(bytes([digest[0] & 248]) + digest[1:31] + bytes([(digest[31] & 63) | 64]), "little")
    return _encode_point(_scalarmult(_B, scalar))


def _sign(seed: bytes, message: bytes) -> bytes:
    digest = hashlib.sha512(seed).digest()
    scalar_bytes = bytes([digest[0] & 248]) + digest[1:31] + bytes([(digest[31] & 63) | 64])
    scalar = int.from_bytes(scalar_bytes, "little")
    prefix = digest[32:]
    public_key = _encode_point(_scalarmult(_B, scalar))
    nonce = int.from_bytes(hashlib.sha512(prefix + message).digest(), "little") % _L
    encoded_nonce = _encode_point(_scalarmult(_B, nonce))
    challenge = int.from_bytes(hashlib.sha512(encoded_nonce + public_key + message).digest(), "little") % _L
    return encoded_nonce + ((nonce + challenge * scalar) % _L).to_bytes(32, "little")


def _canonical(value: object) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


class TrustContractTests(unittest.TestCase):
    def _policy(self, now: datetime) -> dict:
        public_key = _public_key(TEST_PRIVATE_KEY)
        fingerprint = "sha256:" + hashlib.sha256(public_key).hexdigest()
        policy = {
            "schema_version": "factory-trust-policy/v1",
            "policy_version": "1.0.0",
            "policy_digest": "",
            "issued_at": (now - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "spdx_license_list_version": "3.25",
            "allowed_spdx_expressions": ["Apache-2.0"],
            "prohibited_spdx_identifiers": ["GPL-3.0-only"],
            "exceptions": [],
            "authorized_signers": [{"fingerprint": fingerprint, "public_key": base64.b64encode(public_key).decode("ascii")}],
            "max_evidence_age_seconds": 86400,
            "required_evidence": ["spdx-3.0-json", "in-toto-statement-v1/slsa-v1.1", "dsse-v1"],
        }
        policy["policy_digest"] = calculate_policy_digest(policy)
        return policy

    def _record_and_evidence(self, policy: dict, now: datetime) -> tuple[dict, dict[str, dict]]:
        sbom = {
            "@context": "https://spdx.org/rdf/3.0.1/spdx-context.jsonld",
            "@graph": [
                {
                    "@id": "urn:factory:fixture:creation-info",
                    "created": "2026-07-26T00:00:00Z",
                    "createdBy": ["urn:factory:fixture:tool"],
                    "specVersion": "3.0.1",
                    "type": "CreationInfo",
                },
                {
                    "creationInfo": "urn:factory:fixture:creation-info",
                    "element": ["urn:factory:fixture:package"],
                    "rootElement": ["urn:factory:fixture:package"],
                    "spdxId": "urn:factory:fixture:document",
                    "type": "SpdxDocument",
                },
                {
                    "creationInfo": "urn:factory:fixture:creation-info",
                    "name": "ui.login-page",
                    "software_packageVersion": "1.0.0",
                    "spdxId": "urn:factory:fixture:package",
                    "type": "software_Package",
                    "verifiedUsing": ["urn:factory:fixture:sha256"],
                },
                {
                    "@id": "urn:factory:fixture:sha256",
                    "algorithm": "sha256",
                    "hashValue": "a" * 64,
                    "type": "Hash",
                },
            ],
        }
        provenance = {
            "_type": "https://in-toto.io/Statement/v1",
            "subject": [{"name": "ui.login-page", "digest": {"sha256": "a" * 64}}],
            "predicateType": "https://slsa.dev/provenance/v1",
            "predicate": {
                "buildDefinition": {
                    "buildType": "urn:factory:fixture:build:v1",
                    "externalParameters": {},
                    "internalParameters": {},
                    "resolvedDependencies": [{"digest": {"gitCommit": SOURCE_REVISION}, "uri": "urn:factory:fixture:repository"}],
                },
                "runDetails": {
                    "builder": {"builderDependencies": [], "id": "urn:factory:fixture:builder:v1", "version": {"factory": "1.0.0"}},
                    "byproducts": [],
                    "metadata": {"finishedOn": "2026-07-26T00:00:00Z", "invocationId": "urn:factory:fixture:invocation", "startedOn": "2026-07-26T00:00:00Z"},
                },
            },
        }
        evidence = {"sbom": sbom, "provenance": provenance}
        sbom_digest = "sha256:" + hashlib.sha256(_canonical(sbom)).hexdigest()
        provenance_digest = "sha256:" + hashlib.sha256(_canonical(provenance)).hexdigest()
        record = {
            "schema_version": "factory-trust-record/v1",
            "record_digest": "",
            "issued_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "subject": {"key": "ui.login-page", "version": "1.0.0", "digest": PACKAGE_DIGEST},
            "source": {"repository": "factory-pilot", "revision": SOURCE_REVISION},
            "license": {
                "expression": "Apache-2.0",
                "license_list_version": "3.25",
                "policy_version": "1.0.0",
                "dependency_result": "passed",
                "exceptions": [],
            },
            "sbom": {"type": "spdx-3.0-json", "digest": sbom_digest},
            "provenance": {"type": "in-toto-statement-v1/slsa-v1.1", "digest": provenance_digest},
            "signature": {
                "type": "dsse-v1",
                "digest": "",
                "record_payload_digest": "",
                "key_fingerprint": policy["authorized_signers"][0]["fingerprint"],
            },
            "verification": {
                "status": "verified",
                "policy_digest": policy["policy_digest"],
                "verified_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "verdict": "allow",
            },
        }
        unsigned_projection = {key: value for key, value in record.items() if key not in {"record_digest", "signature"}}
        payload_digest = "sha256:" + hashlib.sha256(b"factory-trust-payload/v1\0" + _canonical(unsigned_projection)).hexdigest()
        record["signature"]["record_payload_digest"] = payload_digest
        payload = {"record_payload_digest": payload_digest, "subject_digest": PACKAGE_DIGEST}
        payload_bytes = _canonical(payload)
        payload_type = b"application/vnd.factory.trust-record-payload.v1+json"
        pae = b"DSSEv1 " + str(len(payload_type)).encode("ascii") + b" " + payload_type + b" " + str(len(payload_bytes)).encode("ascii") + b" " + payload_bytes
        signature = _sign(TEST_PRIVATE_KEY, pae)
        envelope = {
            "payloadType": "application/vnd.factory.trust-record-payload.v1+json",
            "payload": base64.b64encode(payload_bytes).decode("ascii"),
            "signatures": [{"keyid": record["signature"]["key_fingerprint"], "sig": base64.b64encode(signature).decode("ascii")}],
        }
        signature_digest = "sha256:" + hashlib.sha256(_canonical(envelope)).hexdigest()
        record["signature"]["digest"] = signature_digest
        record["record_digest"] = calculate_record_digest(record)
        evidence["signature"] = envelope
        return record, evidence

    def _write_corpus(self, root: Path, policy: dict, record: dict, evidence: dict[str, dict]) -> tuple[Path, Path]:
        policy_path = root / "policies" / "1.0.0.json"
        evidence_root = root / "evidence" / "sha256"
        record_path = root / "records" / "ui.login-page" / "1.0.0" / ("a" * 64 + ".json")
        for path in (policy_path.parent, evidence_root, record_path.parent):
            path.mkdir(parents=True, exist_ok=True)
        policy_path.write_bytes(_canonical(policy) + b"\n")
        record_path.write_bytes(_canonical(record) + b"\n")
        for value in evidence.values():
            digest = hashlib.sha256(_canonical(value)).hexdigest()
            (evidence_root / f"{digest}.json").write_bytes(_canonical(value) + b"\n")
        return policy_path, record_path

    def _replace_evidence(self, root: Path, record_path: Path, record: dict, section: str, evidence: dict) -> None:
        digest = "sha256:" + hashlib.sha256(_canonical(evidence)).hexdigest()
        evidence_path = root / "evidence" / "sha256" / (digest.removeprefix("sha256:") + ".json")
        evidence_path.write_bytes(_canonical(evidence))
        record[section]["digest"] = digest
        record["record_digest"] = calculate_record_digest(record)
        record_path.write_bytes(_canonical(record))

    def _replace_evidence_and_resign(self, root: Path, record_path: Path, record: dict, policy: dict, section: str, evidence: dict) -> None:
        """Replace an evidence object while preserving a valid test-only DSSE signature."""
        digest = "sha256:" + hashlib.sha256(_canonical(evidence)).hexdigest()
        (root / "evidence" / "sha256" / (digest.removeprefix("sha256:") + ".json")).write_bytes(_canonical(evidence))
        record[section]["digest"] = digest
        unsigned_projection = {key: value for key, value in record.items() if key not in {"record_digest", "signature"}}
        payload_digest = "sha256:" + hashlib.sha256(b"factory-trust-payload/v1\0" + _canonical(unsigned_projection)).hexdigest()
        record["signature"]["record_payload_digest"] = payload_digest
        payload_bytes = _canonical({"record_payload_digest": payload_digest, "subject_digest": PACKAGE_DIGEST})
        payload_type = b"application/vnd.factory.trust-record-payload.v1+json"
        pae = b"DSSEv1 " + str(len(payload_type)).encode("ascii") + b" " + payload_type + b" " + str(len(payload_bytes)).encode("ascii") + b" " + payload_bytes
        envelope = {
            "payloadType": payload_type.decode("ascii"),
            "payload": base64.b64encode(payload_bytes).decode("ascii"),
            "signatures": [{"keyid": policy["authorized_signers"][0]["fingerprint"], "sig": base64.b64encode(_sign(TEST_PRIVATE_KEY, pae)).decode("ascii")}],
        }
        signature_digest = "sha256:" + hashlib.sha256(_canonical(envelope)).hexdigest()
        (root / "evidence" / "sha256" / (signature_digest.removeprefix("sha256:") + ".json")).write_bytes(_canonical(envelope))
        record["signature"]["digest"] = signature_digest
        record["record_digest"] = calculate_record_digest(record)
        record_path.write_bytes(_canonical(record))

    def _valid_corpus(self) -> tuple[tempfile.TemporaryDirectory[str], Path, Path, datetime]:
        temporary = tempfile.TemporaryDirectory()
        now = datetime(2026, 7, 26, tzinfo=timezone.utc)
        policy = self._policy(now)
        record, evidence = self._record_and_evidence(policy, now)
        policy_path, record_path = self._write_corpus(Path(temporary.name), policy, record, evidence)
        return temporary, policy_path, record_path, now

    def test_validates_canonical_record_and_policy_with_local_signed_evidence(self) -> None:
        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        result = verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)
        self.assertEqual(PACKAGE_DIGEST, result["subject"]["digest"])
        self.assertEqual("allow", result["verification"]["verdict"])

    def test_contained_checked_in_fixture_corpus_has_a_valid_record_and_hostile_duplicate_key_case(self) -> None:
        root = FIXTURES / "valid"
        result = verify_trust_record(
            root / "records" / "ui.login-page" / "1.0.0" / ("a" * 64 + ".json"),
            root / "policies" / "1.0.0.json",
            root,
            now=datetime(2026, 7, 26, tzinfo=timezone.utc),
        )
        self.assertEqual("ui.login-page", result["subject"]["key"])
        duplicate_path = FIXTURES / "invalid" / "duplicate-json-key.json"
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root_copy = Path(temporary.name)
        (root_copy / "records").mkdir()
        copied = root_copy / "records" / "duplicate.json"
        copied.write_bytes(duplicate_path.read_bytes())
        (root_copy / "policies").mkdir()
        (root_copy / "policies" / "1.0.0.json").write_bytes((root / "policies" / "1.0.0.json").read_bytes())
        with self.assertRaisesRegex(TrustContractError, "duplicate_json_key"):
            verify_trust_record(copied, root_copy / "policies" / "1.0.0.json", root_copy, now=datetime(2026, 7, 26, tzinfo=timezone.utc))

    def test_rejects_noncanonical_record_and_duplicate_evidence_reference(self) -> None:
        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        record = json.loads(record_path.read_text(encoding="utf-8"))
        record["record_digest"] = "sha256:" + "0" * 64
        record_path.write_bytes(_canonical(record))
        with self.assertRaisesRegex(TrustContractError, "noncanonical_record"):
            verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)

        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        record = json.loads(record_path.read_text(encoding="utf-8"))
        record["provenance"]["digest"] = record["sbom"]["digest"]
        record["record_digest"] = calculate_record_digest(record)
        record_path.write_bytes(_canonical(record))
        with self.assertRaisesRegex(TrustContractError, "duplicate_evidence_reference"):
            verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)

    def test_rejects_escape_duplicate_keys_and_wrong_subject_evidence(self) -> None:
        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        with self.assertRaisesRegex(TrustContractError, "path_escape"):
            verify_trust_record(record_path, policy_path, Path(temporary.name) / "missing", now=now)

        record_path.write_text('{"schema_version":"factory-trust-record/v1","schema_version":"factory-trust-record/v1"}', encoding="utf-8")
        with self.assertRaisesRegex(TrustContractError, "duplicate_json_key"):
            verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)

        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        record = json.loads(record_path.read_text(encoding="utf-8"))
        path = Path(temporary.name) / "evidence" / "sha256" / (record["sbom"]["digest"].removeprefix("sha256:") + ".json")
        sbom = json.loads(path.read_text(encoding="utf-8"))
        sbom["@graph"][3]["hashValue"] = "c" * 64
        path.write_bytes(_canonical(sbom))
        with self.assertRaisesRegex(TrustContractError, "evidence_digest_mismatch"):
            verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)

    def test_rejects_policy_license_exception_age_and_unsigned_evidence(self) -> None:
        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        policy = json.loads(policy_path.read_text(encoding="utf-8"))
        policy["allowed_spdx_expressions"] = ["MIT"]
        policy["policy_digest"] = calculate_policy_digest(policy)
        policy_path.write_bytes(_canonical(policy))
        record = json.loads(record_path.read_text(encoding="utf-8"))
        record["verification"]["policy_digest"] = policy["policy_digest"]
        record["record_digest"] = calculate_record_digest(record)
        record_path.write_bytes(_canonical(record))
        with self.assertRaisesRegex(TrustContractError, "spdx_policy_denied"):
            verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)

        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        record = json.loads(record_path.read_text(encoding="utf-8"))
        record["license"]["exceptions"] = ["unapproved"]
        record["record_digest"] = calculate_record_digest(record)
        record_path.write_bytes(_canonical(record))
        with self.assertRaisesRegex(TrustContractError, "unknown_policy_exception"):
            verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)

        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        with self.assertRaisesRegex(TrustContractError, "stale_evidence"):
            verify_trust_record(record_path, policy_path, Path(temporary.name), now=now + timedelta(days=2))

        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        record = json.loads(record_path.read_text(encoding="utf-8"))
        record["signature"]["digest"] = "sha256:" + "f" * 64
        record["record_digest"] = calculate_record_digest(record)
        record_path.write_bytes(_canonical(record))
        with self.assertRaisesRegex(TrustContractError, "unsigned_record"):
            verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)

    def test_rejects_provenance_revision_payload_type_and_untrusted_or_wrong_signature(self) -> None:
        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        record = json.loads(record_path.read_text(encoding="utf-8"))
        path = Path(temporary.name) / "evidence" / "sha256" / (record["provenance"]["digest"].removeprefix("sha256:") + ".json")
        provenance = json.loads(path.read_text(encoding="utf-8"))
        provenance["predicate"]["buildDefinition"]["resolvedDependencies"][0]["digest"]["gitCommit"] = "d" * 64
        path.write_bytes(_canonical(provenance))
        with self.assertRaisesRegex(TrustContractError, "evidence_digest_mismatch"):
            verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)

        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        record = json.loads(record_path.read_text(encoding="utf-8"))
        envelope_path = Path(temporary.name) / "evidence" / "sha256" / (record["signature"]["digest"].removeprefix("sha256:") + ".json")
        envelope = json.loads(envelope_path.read_text(encoding="utf-8"))
        envelope["payloadType"] = "text/plain"
        envelope_path.write_bytes(_canonical(envelope))
        with self.assertRaisesRegex(TrustContractError, "invalid_dsse_payload_type"):
            verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)

        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        record = json.loads(record_path.read_text(encoding="utf-8"))
        record["signature"]["key_fingerprint"] = "sha256:" + "1" * 64
        record["record_digest"] = calculate_record_digest(record)
        record_path.write_bytes(_canonical(record))
        with self.assertRaisesRegex(TrustContractError, "untrusted_signer"):
            verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)

    def test_rejects_an_evidence_subject_swap_and_signature_over_another_payload(self) -> None:
        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        record = json.loads(record_path.read_text(encoding="utf-8"))
        original_path = Path(temporary.name) / "evidence" / "sha256" / (record["sbom"]["digest"].removeprefix("sha256:") + ".json")
        swapped = json.loads(original_path.read_text(encoding="utf-8"))
        swapped["@graph"][3]["hashValue"] = "c" * 64
        swapped_digest = "sha256:" + hashlib.sha256(_canonical(swapped)).hexdigest()
        (original_path.parent / (swapped_digest.removeprefix("sha256:") + ".json")).write_bytes(_canonical(swapped))
        record["sbom"]["digest"] = swapped_digest
        record["record_digest"] = calculate_record_digest(record)
        record_path.write_bytes(_canonical(record))
        with self.assertRaisesRegex(TrustContractError, "evidence_subject_mismatch"):
            verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)

        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        record = json.loads(record_path.read_text(encoding="utf-8"))
        envelope_path = Path(temporary.name) / "evidence" / "sha256" / (record["signature"]["digest"].removeprefix("sha256:") + ".json")
        envelope = json.loads(envelope_path.read_text(encoding="utf-8"))
        payload = json.loads(base64.b64decode(envelope["payload"]).decode("utf-8"))
        payload["record_payload_digest"] = "sha256:" + "f" * 64
        payload_bytes = _canonical(payload)
        payload_type = envelope["payloadType"].encode("utf-8")
        pae = b"DSSEv1 " + str(len(payload_type)).encode("ascii") + b" " + payload_type + b" " + str(len(payload_bytes)).encode("ascii") + b" " + payload_bytes
        envelope["payload"] = base64.b64encode(payload_bytes).decode("ascii")
        envelope["signatures"][0]["sig"] = base64.b64encode(_sign(TEST_PRIVATE_KEY, pae)).decode("ascii")
        envelope_digest = "sha256:" + hashlib.sha256(_canonical(envelope)).hexdigest()
        (envelope_path.parent / (envelope_digest.removeprefix("sha256:") + ".json")).write_bytes(_canonical(envelope))
        record["signature"]["digest"] = envelope_digest
        record["record_digest"] = calculate_record_digest(record)
        record_path.write_bytes(_canonical(record))
        with self.assertRaisesRegex(TrustContractError, "signature_payload_mismatch"):
            verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)

    def test_rejects_a_symlinked_evidence_blob(self) -> None:
        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        record = json.loads(record_path.read_text(encoding="utf-8"))
        evidence_path = Path(temporary.name) / "evidence" / "sha256" / (record["sbom"]["digest"].removeprefix("sha256:") + ".json")
        outside = Path(temporary.name) / "outside.json"
        outside.write_bytes(evidence_path.read_bytes())
        evidence_path.unlink()
        try:
            evidence_path.symlink_to(outside)
        except OSError:
            original_is_symlink = Path.is_symlink
            with mock.patch.object(Path, "is_symlink", autospec=True, side_effect=lambda path: path == evidence_path or original_is_symlink(path)):
                with self.assertRaisesRegex(TrustContractError, "path_escape"):
                    verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)
        else:
            with self.assertRaisesRegex(TrustContractError, "path_escape"):
                verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)

    def test_rejects_identity_and_every_known_small_order_ed25519_encoding_before_equation_verification(self) -> None:
        forged_signature = (b"\x01" + b"\x00" * 31) + b"\x00" * 32
        for encoded_point in SMALL_ORDER_ENCODINGS:
            with self.subTest(encoded_point=encoded_point.hex()):
                # One standard blacklist encoding is non-canonical rather than
                # a decodable point; both forms must be rejected before use.
                if encoded_point != bytes.fromhex("ed" + "ff" * 30 + "7f"):
                    self.assertTrue(_is_small_order_point(encoded_point))
                self.assertFalse(_ed25519_verify(encoded_point, b"arbitrary-message", forged_signature))

    def test_rejects_an_identity_signer_and_identity_signature_when_verifying_a_record(self) -> None:
        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        policy = json.loads(policy_path.read_text(encoding="utf-8"))
        identity = b"\x01" + b"\x00" * 31
        fingerprint = "sha256:" + hashlib.sha256(identity).hexdigest()
        policy["authorized_signers"] = [{"fingerprint": fingerprint, "public_key": base64.b64encode(identity).decode("ascii")}]
        policy["policy_digest"] = calculate_policy_digest(policy)
        policy_path.write_bytes(_canonical(policy))
        record = json.loads(record_path.read_text(encoding="utf-8"))
        record["signature"]["key_fingerprint"] = fingerprint
        record["verification"]["policy_digest"] = policy["policy_digest"]
        signature_path = root / "evidence" / "sha256" / (record["signature"]["digest"].removeprefix("sha256:") + ".json")
        envelope = json.loads(signature_path.read_text(encoding="utf-8"))
        envelope["signatures"] = [{"keyid": fingerprint, "sig": base64.b64encode(identity + b"\x00" * 32).decode("ascii")}]
        self._replace_evidence(root, record_path, record, "signature", envelope)
        with self.assertRaisesRegex(TrustContractError, "small_order_public_key"):
            verify_trust_record(record_path, policy_path, root, now=now)

    def test_rejects_minimal_or_extended_spdx_and_provenance_fragments(self) -> None:
        for section, mutate, expected in (
            ("sbom", lambda evidence: evidence.__setitem__("spdxVersion", "SPDX-3.0"), "invalid_spdx"),
            ("sbom", lambda evidence: evidence.__setitem__("@context", "https://spdx.org/rdf/2.3/spdx-context.jsonld"), "invalid_spdx"),
            ("sbom", lambda evidence: evidence["@graph"].pop(1), "invalid_spdx"),
            ("sbom", lambda evidence: evidence["@graph"][3].__setitem__("hashValue", "c" * 64), "evidence_subject_mismatch"),
            ("provenance", lambda evidence: evidence.__setitem__("predicateType", "https://slsa.dev/provenance/v1.1"), "invalid_provenance"),
            ("provenance", lambda evidence: evidence["predicate"].pop("runDetails"), "invalid_provenance"),
            ("provenance", lambda evidence: evidence["predicate"]["buildDefinition"].__setitem__("extra", True), "invalid_provenance"),
            ("provenance", lambda evidence: evidence["subject"][0]["digest"].pop("sha256"), "invalid_provenance"),
        ):
            with self.subTest(section=section, expected=expected):
                temporary, policy_path, record_path, now = self._valid_corpus()
                self.addCleanup(temporary.cleanup)
                root = Path(temporary.name)
                record = json.loads(record_path.read_text(encoding="utf-8"))
                evidence_path = root / "evidence" / "sha256" / (record[section]["digest"].removeprefix("sha256:") + ".json")
                evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
                mutate(evidence)
                self._replace_evidence(root, record_path, record, section, evidence)
                with self.assertRaisesRegex(TrustContractError, expected):
                    verify_trust_record(record_path, policy_path, root, now=now)

    def test_rejects_the_previous_nonstandard_spdx_document_and_inline_hash_form(self) -> None:
        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        policy = json.loads(policy_path.read_text(encoding="utf-8"))
        record = json.loads(record_path.read_text(encoding="utf-8"))
        evidence_path = root / "evidence" / "sha256" / (record["sbom"]["digest"].removeprefix("sha256:") + ".json")
        sbom = json.loads(evidence_path.read_text(encoding="utf-8"))
        document = sbom["@graph"][1]
        package = sbom["@graph"][2]
        document["@id"] = document["spdxId"]
        package["@id"] = package["spdxId"]
        package["verifiedUsing"] = [{"algorithm": "SHA256", "hashValue": "a" * 64}]
        sbom["@graph"].pop(3)
        self._replace_evidence_and_resign(root, record_path, record, policy, "sbom", sbom)
        with self.assertRaisesRegex(TrustContractError, "invalid_spdx"):
            verify_trust_record(record_path, policy_path, root, now=now)

    def test_rejects_a_resigned_spdx_record_with_a_non_iri_created_by_reference(self) -> None:
        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        policy = json.loads(policy_path.read_text(encoding="utf-8"))
        record = json.loads(record_path.read_text(encoding="utf-8"))
        evidence_path = root / "evidence" / "sha256" / (record["sbom"]["digest"].removeprefix("sha256:") + ".json")
        sbom = json.loads(evidence_path.read_text(encoding="utf-8"))
        sbom["@graph"][0]["createdBy"] = ["not-an-iri"]
        self._replace_evidence_and_resign(root, record_path, record, policy, "sbom", sbom)
        with self.assertRaisesRegex(TrustContractError, "invalid_spdx"):
            verify_trust_record(record_path, policy_path, root, now=now)

    def test_valid_fixture_provenance_uses_local_urn_identifiers(self) -> None:
        record = json.loads((FIXTURES / "valid" / "records" / "ui.login-page" / "1.0.0" / ("a" * 64 + ".json")).read_text(encoding="utf-8"))
        provenance_path = FIXTURES / "valid" / "evidence" / "sha256" / (record["provenance"]["digest"].removeprefix("sha256:") + ".json")
        provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
        build_definition = provenance["predicate"]["buildDefinition"]
        self.assertTrue(build_definition["buildType"].startswith("urn:factory:fixture:"))
        self.assertTrue(build_definition["resolvedDependencies"][0]["uri"].startswith("urn:factory:fixture:"))
        self.assertTrue(provenance["predicate"]["runDetails"]["builder"]["id"].startswith("urn:factory:fixture:"))

    def test_rejects_label_only_proprietary_evidence_envelopes(self) -> None:
        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        record = json.loads(record_path.read_text(encoding="utf-8"))
        proprietary = {"spdxVersion": "SPDX-3.0", "name": "ui.login-page", "subject": {"digest": PACKAGE_DIGEST}}
        self._replace_evidence(root, record_path, record, "sbom", proprietary)
        with self.assertRaisesRegex(TrustContractError, "invalid_spdx"):
            verify_trust_record(record_path, policy_path, root, now=now)

    def test_rejects_standard_provenance_with_a_wrong_subject_or_resolved_revision(self) -> None:
        for mutate, expected in (
            (lambda evidence: evidence["subject"][0]["digest"].__setitem__("sha256", "c" * 64), "evidence_subject_mismatch"),
            (lambda evidence: evidence["predicate"]["buildDefinition"]["resolvedDependencies"][0]["digest"].__setitem__("gitCommit", "d" * 64), "provenance_revision_mismatch"),
        ):
            with self.subTest(expected=expected):
                temporary, policy_path, record_path, now = self._valid_corpus()
                self.addCleanup(temporary.cleanup)
                root = Path(temporary.name)
                record = json.loads(record_path.read_text(encoding="utf-8"))
                evidence_path = root / "evidence" / "sha256" / (record["provenance"]["digest"].removeprefix("sha256:") + ".json")
                provenance = json.loads(evidence_path.read_text(encoding="utf-8"))
                mutate(provenance)
                self._replace_evidence(root, record_path, record, "provenance", provenance)
                with self.assertRaisesRegex(TrustContractError, expected):
                    verify_trust_record(record_path, policy_path, root, now=now)

    def test_rejects_a_policy_exception_at_its_exact_expiry_time(self) -> None:
        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        policy = json.loads(policy_path.read_text(encoding="utf-8"))
        policy["exceptions"] = [{"id": "temporary", "expires_at": "2026-07-26T00:00:00Z"}]
        policy["policy_digest"] = calculate_policy_digest(policy)
        policy_path.write_bytes(_canonical(policy))
        record = json.loads(record_path.read_text(encoding="utf-8"))
        record["license"]["exceptions"] = ["temporary"]
        record["verification"]["policy_digest"] = policy["policy_digest"]
        record["record_digest"] = calculate_record_digest(record)
        record_path.write_bytes(_canonical(record))
        with self.assertRaisesRegex(TrustContractError, "expired_policy_exception"):
            verify_trust_record(record_path, policy_path, root, now=now)

    def test_rejects_policy_issued_after_the_record_verification_and_noncanonical_dsse_payload(self) -> None:
        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        policy = json.loads(policy_path.read_text(encoding="utf-8"))
        policy["issued_at"] = "2026-07-26T00:00:01Z"
        policy["policy_digest"] = calculate_policy_digest(policy)
        policy_path.write_bytes(_canonical(policy))
        record = json.loads(record_path.read_text(encoding="utf-8"))
        record["verification"]["policy_digest"] = policy["policy_digest"]
        record["record_digest"] = calculate_record_digest(record)
        record_path.write_bytes(_canonical(record))
        with self.assertRaisesRegex(TrustContractError, "policy_issued_after_verification"):
            verify_trust_record(record_path, policy_path, root, now=now + timedelta(seconds=2))

        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        record = json.loads(record_path.read_text(encoding="utf-8"))
        signature_path = root / "evidence" / "sha256" / (record["signature"]["digest"].removeprefix("sha256:") + ".json")
        envelope = json.loads(signature_path.read_text(encoding="utf-8"))
        payload = json.loads(base64.b64decode(envelope["payload"]).decode("utf-8"))
        payload_bytes = json.dumps(payload, indent=2).encode("utf-8")
        payload_type = envelope["payloadType"].encode("utf-8")
        pae = b"DSSEv1 " + str(len(payload_type)).encode("ascii") + b" " + payload_type + b" " + str(len(payload_bytes)).encode("ascii") + b" " + payload_bytes
        envelope["payload"] = base64.b64encode(payload_bytes).decode("ascii")
        envelope["signatures"][0]["sig"] = base64.b64encode(_sign(TEST_PRIVATE_KEY, pae)).decode("ascii")
        self._replace_evidence(root, record_path, record, "signature", envelope)
        with self.assertRaisesRegex(TrustContractError, "noncanonical_json"):
            verify_trust_record(record_path, policy_path, root, now=now)

    def test_rejects_an_evidence_file_replaced_between_containment_check_and_descriptor_open(self) -> None:
        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        record = json.loads(record_path.read_text(encoding="utf-8"))
        evidence_path = root / "evidence" / "sha256" / (record["sbom"]["digest"].removeprefix("sha256:") + ".json")
        replacement = root / "replacement.json"
        replacement.write_bytes(evidence_path.read_bytes())
        original_open = os.open

        def replace_before_open(path: str, flags: int, *args: object) -> int:
            if Path(path) == evidence_path and replacement.exists():
                os.replace(replacement, evidence_path)
            return original_open(path, flags, *args)

        with mock.patch("apps.api.trust_contract.os.open", side_effect=replace_before_open):
            with self.assertRaisesRegex(TrustContractError, "file_replaced"):
                verify_trust_record(record_path, policy_path, root, now=now)

    def test_never_uses_network_shell_or_url_opening(self) -> None:
        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        with (
            mock.patch.object(socket, "create_connection", side_effect=AssertionError("network forbidden")),
            mock.patch.object(subprocess, "run", side_effect=AssertionError("shell forbidden")),
            mock.patch("urllib.request.urlopen", side_effect=AssertionError("url opening forbidden")),
        ):
            result = verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)
        self.assertEqual("verified", result["verification"]["status"])

    def test_canonical_json_bytes_rejects_non_finite_values(self) -> None:
        with self.assertRaisesRegex(TrustContractError, "noncanonical_json"):
            canonical_json_bytes({"number": float("nan")})

    def test_rejects_a_noncanonical_on_disk_record_even_when_its_digest_matches(self) -> None:
        temporary, policy_path, record_path, now = self._valid_corpus()
        self.addCleanup(temporary.cleanup)
        record = json.loads(record_path.read_text(encoding="utf-8"))
        record_path.write_text(json.dumps(record, indent=2), encoding="utf-8")
        with self.assertRaisesRegex(TrustContractError, "noncanonical_json"):
            verify_trust_record(record_path, policy_path, Path(temporary.name), now=now)


if __name__ == "__main__":
    unittest.main()
