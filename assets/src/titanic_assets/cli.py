"""Command line of the asset pipeline: ``titanic-assets build`` and ``titanic-assets render``."""

import argparse
import hashlib
import logging
import shutil
import subprocess
import sys
import time
from pathlib import Path

from titanic_assets.model import build_model
from titanic_assets.offsets import load_offsets

_LOGGER = logging.getLogger("titanic_assets")

OFFSETS_TOOL = Path("tools/export-hull-offsets.ts")
OPTIMISER = Path("assets/optimise/optimise.ts")
VALIDATOR = Path("assets/optimise/validate.ts")
WORK_DIRECTORY = Path("assets/build")
MODEL = Path("public/models/ship-lod1.glb")
OFFSETS_NAME = "hull-offsets.json"
RAW_MODEL_NAME = "ship-lod1.raw.glb"


def repository_root() -> Path:
    """Return the root of the repository, found from the location of this package."""
    root = Path(__file__).resolve().parents[3]
    if not (root / OFFSETS_TOOL).is_file():
        message = f"{root} is not the root of the Titanic 4D repository."
        raise FileNotFoundError(message)
    return root


def _run_node(root: Path, script: Path, *arguments: str) -> None:
    """Run a TypeScript file of the repository with Node.js, from the root of the repository."""
    node = shutil.which("node")
    if node is None:
        message = "Node.js was not found on the PATH."
        raise FileNotFoundError(message)
    subprocess.run([node, str(root / script), *arguments], cwd=root, check=True)  # noqa: S603


def export_offsets(root: Path, work_directory: Path) -> Path:
    """Write the table of offsets with the Node.js tool and return its path."""
    path = work_directory / OFFSETS_NAME
    _run_node(root, OFFSETS_TOOL, "--out", str(path))
    return path


def build(root: Path, work_directory: Path, output: Path) -> None:
    """Build the model: offsets, geometry, Blender export, optimisation and validation."""
    # Blender is imported here so that the other commands and the geometry tests start quickly.
    from titanic_assets.blender import build_scene, export_glb  # noqa: PLC0415

    started = time.monotonic()
    work_directory.mkdir(parents=True, exist_ok=True)
    offsets = load_offsets(export_offsets(root, work_directory))
    nodes = build_model(offsets)
    raw_model = work_directory / RAW_MODEL_NAME
    build_scene(nodes)
    export_glb(raw_model)
    _run_node(root, VALIDATOR, str(raw_model))
    _run_node(root, OPTIMISER, str(raw_model), str(output))
    report = work_directory / f"{output.stem}.validation.json"
    _run_node(root, VALIDATOR, str(output), "--report", str(report))
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    _LOGGER.info(
        "Built %s: %d triangles, %d bytes, SHA-256 %s, in %.1f s",
        output,
        sum(node.triangle_count for node in nodes),
        output.stat().st_size,
        digest,
        time.monotonic() - started,
    )


def render(root: Path, work_directory: Path, directory: Path) -> None:
    """Render the review views of the model as PNG files."""
    from titanic_assets.blender import build_scene  # noqa: PLC0415
    from titanic_assets.render import render_views  # noqa: PLC0415

    work_directory.mkdir(parents=True, exist_ok=True)
    offsets = load_offsets(export_offsets(root, work_directory))
    build_scene(build_model(offsets))
    for path in render_views(directory):
        _LOGGER.info("Rendered %s", path)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="titanic-assets", description=__doc__)
    parser.add_argument(
        "--work-directory",
        type=Path,
        help=f"directory of the intermediate files (default: {WORK_DIRECTORY})",
    )
    commands = parser.add_subparsers(dest="command", required=True)
    build_command = commands.add_parser("build", help="build the level-of-detail 1 model")
    build_command.add_argument(
        "--output",
        type=Path,
        help=f"path of the model (default: {MODEL})",
    )
    render_command = commands.add_parser("render", help="render review images of the model")
    render_command.add_argument(
        "--output", type=Path, required=True, help="directory of the images"
    )
    return parser


def main() -> None:
    """Run the command line."""
    logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stderr)
    arguments = _parser().parse_args()
    root = repository_root()
    work_directory = (arguments.work_directory or root / WORK_DIRECTORY).resolve()
    if arguments.command == "build":
        build(root, work_directory, (arguments.output or root / MODEL).resolve())
    else:
        render(root, work_directory, arguments.output.resolve())
