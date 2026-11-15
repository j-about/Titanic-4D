# Declarations for the part of the Blender Python API used by the asset pipeline.
#
# The ``bpy`` wheel ships no type information. Only the members the pipeline calls are declared.

from bpy import ops as ops
from bpy import types as types

context: types.Context
data: types.BlendData
