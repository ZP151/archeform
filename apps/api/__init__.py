"""Dependency-free MVP control plane for a composable software factory."""

from .control_plane import ControlPlane, ControlPlaneError

__all__ = ["ControlPlane", "ControlPlaneError"]
