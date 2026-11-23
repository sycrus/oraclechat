"""Convert Mixamo FBX animations (downloaded "Without Skin") to VRM Animation (.vrma) for call body clips.

Needs Blender 5.1+ with the VRM add-on (Get Extensions > "VRM format"). Run headless:

    blender -b --python scripts/mixamo-to-vrma.py -- <out_dir> [name=]<file.fbx> ...

Each input becomes <out_dir>/<name>.vrma; without "name=", the FBX file name in kebab case is used.
Mixamo files may not be redistributed, so keep the inputs and outputs out of git (docs/operations.md).
"""
import os
import sys

import bpy

args = sys.argv[sys.argv.index("--") + 1:]
if len(args) < 2:
    sys.exit(__doc__)
out_dir, inputs = args[0], args[1:]
os.makedirs(out_dir, exist_ok=True)

# Mixamo bone (without the "mixamorig:" prefix) -> VRM 1.0 human bone (VRM add-on property name).
BODY = {"Hips": "hips", "Spine": "spine", "Spine1": "chest", "Spine2": "upper_chest", "Neck": "neck", "Head": "head"}
SIDE = {
    "Shoulder": "shoulder", "Arm": "upper_arm", "ForeArm": "lower_arm", "Hand": "hand",
    "UpLeg": "upper_leg", "Leg": "lower_leg", "Foot": "foot", "ToeBase": "toes",
    "HandThumb1": "thumb_metacarpal", "HandThumb2": "thumb_proximal", "HandThumb3": "thumb_distal",
}
for finger, vrm_finger in (("Index", "index"), ("Middle", "middle"), ("Ring", "ring"), ("Pinky", "little")):
    for number, part in ((1, "proximal"), (2, "intermediate"), (3, "distal")):
        SIDE[f"Hand{finger}{number}"] = f"{vrm_finger}_{part}"
MAPPING = dict(BODY)
for side, prefix in (("Left", "left_"), ("Right", "right_")):
    MAPPING |= {side + mixamo: prefix + vrm for mixamo, vrm in SIDE.items()}

failed = 0
for spec in inputs:
    name, _, src = spec.rpartition("=") if "=" in spec else ("", "", spec)
    name = name or os.path.splitext(os.path.basename(src))[0].lower().replace(" ", "-").replace("(", "").replace(")", "")
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    bpy.ops.import_scene.fbx(filepath=src)
    armature = next((obj for obj in bpy.data.objects if obj.type == "ARMATURE"), None)
    if not armature or not armature.animation_data or not armature.animation_data.action:
        print(f"SKIP {src}: no animated armature")
        failed += 1
        continue
    bones = {bone.name.split(":")[-1]: bone.name for bone in armature.data.bones}
    extension = armature.data.vrm_addon_extension
    extension.spec_version = "1.0"
    assigned = 0
    for mixamo, vrm in MAPPING.items():
        if mixamo in bones:
            getattr(extension.vrm1.humanoid.human_bones, vrm).node.bone_name = bones[mixamo]
            assigned += 1
    start, end = (int(frame) for frame in armature.animation_data.action.frame_range)
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = start, end
    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    out = os.path.join(out_dir, name + ".vrma")
    result = bpy.ops.export_scene.vrma(filepath=out, armature_object_name=armature.name)
    ok = result == {"FINISHED"} and os.path.exists(out)
    failed += 0 if ok else 1
    print(f"{'OK' if ok else 'FAIL'} {name}.vrma: {assigned}/{len(MAPPING)} bones, frames {start}-{end} at {scene.render.fps} fps")
sys.exit(1 if failed else 0)
