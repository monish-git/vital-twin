import os
import xml.etree.ElementTree as ET

class SubstanceManager:
    def __init__(self, substance_dir):
        self.substance_dir = substance_dir
        self.registry = {}
        self.ns = {'bg': 'uri:/mil/tatrc/physiology/datamodel'}
        self._index_substances()

    def _index_substances(self):
        """Scans the folder and identifies if a file is a Compound or a Substance."""
        for file in os.listdir(self.substance_dir):
            if file.endswith(".xml"):
                path = os.path.join(self.substance_dir, file)
                tree = ET.parse(path)
                root = tree.getroot()
                
                # Determine tag name without namespace
                tag = root.tag.split('}')[-1]
                
                # Find the internal BioGears Name
                name_node = root.find(".//bg:Name", self.ns)
                bg_name = name_node.text if name_node is not None else file[:-4]
                
                # Check State (Liquid/Gas/Solid)
                state_node = root.find(".//bg:State", self.ns)
                state = state_node.text if state_node is not None else "Liquid"

                self.registry[bg_name.lower()] = {
                    "name": bg_name,
                    "type": "Compound" if tag == "SubstanceCompound" else "Substance",
                    "state": state,
                    "file": file
                }

    def get_substance(self, name):
        return self.registry.get(name.lower())