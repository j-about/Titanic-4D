"""Fixtures shared by the tests: the table of offsets, the model and two complete builds."""

import subprocess
import sys
from pathlib import Path

import pytest

from titanic_assets.cli import export_offsets, repository_root
from titanic_assets.model import Node, build_model
from titanic_assets.offsets import Offsets, load_offsets

MODEL_NAME = "ship-lod1.glb"


@pytest.fixture(scope="session")
def root() -> Path:
    """Root of the repository."""
    return repository_root()


@pytest.fixture(scope="session")
def offsets(root: Path, tmp_path_factory: pytest.TempPathFactory) -> Offsets:
    """Table of offsets exported from the dataset and the hull form of the application."""
    return load_offsets(export_offsets(root, tmp_path_factory.mktemp("offsets")))


@pytest.fixture(scope="session")
def nodes(offsets: Offsets) -> dict[str, Node]:
    """Nodes of the model, by name."""
    return {node.name: node for node in build_model(offsets)}


@pytest.fixture(scope="session")
def builds(tmp_path_factory: pytest.TempPathFactory) -> tuple[Path, Path]:
    """Directories of two builds run by the command line, one process each.

    Each directory holds the intermediate files and the model.
    """
    command = Path(sys.executable).with_name("titanic-assets")
    directories = (tmp_path_factory.mktemp("first"), tmp_path_factory.mktemp("second"))
    for directory in directories:
        arguments = ["--work-directory", str(directory), "build", "--output", str(directory / MODEL_NAME)]
        subprocess.run([str(command), *arguments], check=True, capture_output=True)  # noqa: S603
    return directories
