import os
from pathlib import Path
import sys

# prepend current dir
sys.path.insert(0, os.getcwd())
from src.main import _read_gateway_info_from_local_config
print(_read_gateway_info_from_local_config())
