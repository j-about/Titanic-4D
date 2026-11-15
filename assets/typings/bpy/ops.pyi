# Declarations of the Blender operators used by the asset pipeline.

class _Wm:
    def read_factory_settings(self, *, use_empty: bool = False) -> set[str]: ...

class _ExportScene:
    def gltf(
        self,
        *,
        filepath: str,
        export_format: str,
        export_yup: bool,
        export_apply: bool,
        export_texcoords: bool,
        export_normals: bool,
        export_tangents: bool,
        export_materials: str,
        export_vertex_color: str,
        export_cameras: bool,
        export_lights: bool,
        export_animations: bool,
        export_skins: bool,
        export_morph: bool,
        export_extras: bool,
        use_selection: bool,
    ) -> set[str]: ...

class _Render:
    def render(self, *, write_still: bool = False) -> set[str]: ...

wm: _Wm
export_scene: _ExportScene
render: _Render
