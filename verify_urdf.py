import os
import sys
from rerun.urdf import UrdfTree

def verify():
    urdf_path = "simulation/models/mars_robot.urdf"
    if not os.path.exists(urdf_path):
        print(f"Error: {urdf_path} does not exist.")
        return False
        
    try:
        # We need to be in the right directory for relative paths in the URDF to work
        # but UrdfTree might handle paths relative to the URDF file itself.
        tree = UrdfTree.from_file_path(urdf_path)
        print(f"Successfully loaded URDF: {tree.name}")
        print(f"Joints found: {[j.name for j in tree.joints()]}")
        print(f"Links found: {[l.name for l in [j.child_link for j in tree.joints()] + [tree.root_link().name]]}")
        return True
    except Exception as e:
        print(f"Error loading URDF: {e}")
        return False

if __name__ == "__main__":
    if verify():
        sys.exit(0)
    else:
        sys.exit(1)
