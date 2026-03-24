"""
substance_registry.py — Auto-discovers all substances in BioGears substances/ folder.

Builds SUBSTANCE_REGISTRY (name → route, unit, category) and ROUTE_GROUPS for the API.
Uses ElementTree to inspect each XML — no hardcoded lists except known route overrides.
"""

import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Any

from biogears_service.simulation.config import SUBSTANCES_DIR

# ── Known route overrides (cannot be detected from XML tag alone) ──────────
_COMPOUNDS = {
    "Blood_APositive", "Blood_ANegative", "Blood_BPositive", "Blood_BNegative",
    "Blood_ABPositive", "Blood_ABNegative", "Blood_OPositive", "Blood_ONegative",
    "Albuminar_25", "Albuminex", "Albuminex_4PCT", "Albuminex_5PCT",
    "PlasmaLyteA", "PlamsaLyteA", "RingersLactate", "Saline", "SalineSlowDrip",
    "PiperacillinTazobactam",
}
_ORAL  = {"Caffeine", "Caffine", "Acetaminophen", "Aspirin"}
_NASAL = {"Albuterol"}

# ── Category labels ────────────────────────────────────────────────────────
_CATEGORY_MAP = {
    "Blood_":           "Blood Product",
    "Albumin":          "Colloid",
    "Morphine":         "Analgesic",
    "Fentanyl":         "Analgesic",
    "Ketamine":         "Analgesic",
    "Acetaminophen":    "Analgesic / Antipyretic",
    "Naloxone":         "Reversal Agent",
    "Pralidoxime":      "Reversal Agent",
    "Epinephrine":      "Emergency / Cardiac",
    "Norepinephrine":   "Emergency / Cardiac",
    "Vasopressin":      "Emergency / Cardiac",
    "Atropine":         "Anticholinergic",
    "Caffeine":         "Stimulant",
    "Albuterol":        "Bronchodilator",
    "Propofol":         "Anesthetic",
    "Etomidate":        "Anesthetic",
    "Desflurane":       "Anesthetic",
    "Midazolam":        "Anesthetic",
    "Succinylcholine":  "Neuromuscular Blocker",
    "Rocuronium":       "Neuromuscular Blocker",
    "Furosemide":       "Diuretic",
    "Saline":           "IV Fluid",
    "PlasmaLyte":       "IV Fluid",
    "PlamsaLyte":       "IV Fluid",
    "RingersLactate":   "IV Fluid",
    "Prednisone":       "Corticosteroid",
    "Insulin":          "Hormone",
    "Glucose":          "Metabolic",
    "Piperacillin":     "Antibiotic",
    "Ertapenem":        "Antibiotic",
    "Moxifloxacin":     "Antibiotic",
    "TranexamicAcid":   "Hemostatic",
    "Ondansetron":      "Antiemetic",
    "Sarin":            "Chemical Agent",
    "CarbonMonoxide":   "Toxic Gas",
    "ForestFireParticulate": "Environmental Hazard",
}

_NS = {"bg": "uri:/mil/tatrc/physiology/datamodel"}


def _get_category(name: str) -> str:
    for prefix, cat in _CATEGORY_MAP.items():
        if name == prefix or name.startswith(prefix):
            return cat
    return "Other"


def _build_registry() -> Dict[str, Any]:
    if not SUBSTANCES_DIR.exists():
        return {}

    registry: Dict[str, Any] = {}

    for xml_file in sorted(SUBSTANCES_DIR.glob("*.xml")):
        try:
            root = ET.parse(str(xml_file)).getroot()
            tag  = root.tag.split("}")[-1]  # SubstanceCompound | Substance

            name_node = root.find(".//bg:Name", _NS)
            name = name_node.text.strip() if name_node is not None else xml_file.stem

            # ── Determine route ────────────────────────────────────────────
            if tag == "SubstanceCompound" or name in _COMPOUNDS:
                route, unit = "IV_COMPOUND", "mL/min"
            elif name in _ORAL:
                route, unit = "ORAL", "mg"
            elif name in _NASAL:
                route, unit = "NASAL", "ug"
            else:
                # Only include substances with pharmacokinetics/dynamics (they're drugs)
                has_pk = root.find(".//bg:Pharmacokinetics",  _NS) is not None
                has_pd = root.find(".//bg:Pharmacodynamics", _NS) is not None
                if not (has_pk or has_pd):
                    continue   # Skip metabolites / internal-only entries
                # Fentanyl is dosed in micrograms
                unit = "ug" if name == "Fentanyl" else "mL"
                route = "IV_BOLUS"

            registry[name] = {
                "route":    route,
                "unit":     unit,
                "category": _get_category(name),
                "file":     xml_file.name,
            }

        except Exception:
            continue   # Malformed / unexpected XML — skip silently

    return registry


# ── Singleton — built once at import time ──────────────────────────────────
SUBSTANCE_REGISTRY: Dict[str, Any] = _build_registry()

# Convenience grouped view for the GET /substances endpoint
ROUTE_GROUPS: Dict[str, list] = {
    "IV_COMPOUND": [],
    "ORAL":        [],
    "NASAL":       [],
    "IV_BOLUS":    [],
}
for _name, _info in SUBSTANCE_REGISTRY.items():
    ROUTE_GROUPS[_info["route"]].append({"name": _name, **_info})
