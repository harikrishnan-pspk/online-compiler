import os
import shutil
import subprocess
from typing import Tuple

def is_docker_available() -> bool:
    """
    Checks if Docker CLI and daemon are available and responsive.
    """
    docker_bin = shutil.which("docker")
    if not docker_bin:
        return False
    try:
        res = subprocess.run([docker_bin, "info"], capture_output=True, timeout=2)
        return res.returncode == 0
    except Exception:
        return False

def get_jdk_toolchain() -> Tuple[str, str]:
    """
    Resolves the Java compiler (javac) and runtime (java).
    Prioritizes project-bundled OpenJDK (zero host installation required),
    falling back to system PATH.
    """
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    local_javac = os.path.join(root_dir, "compilers", "jdk", "bin", "javac.exe" if os.name == "nt" else "javac")
    local_java = os.path.join(root_dir, "compilers", "jdk", "bin", "java.exe" if os.name == "nt" else "java")

    if os.path.exists(local_javac) and os.path.exists(local_java):
        return local_javac, local_java

    javac_sys = shutil.which("javac") or "javac"
    java_sys = shutil.which("java") or "java"
    return javac_sys, java_sys

def get_gcc_toolchain(cpp: bool = False) -> str:
    """
    Resolves GCC or G++ compiler.
    Prioritizes project-bundled modern w64devkit.
    """
    exe_name = "g++.exe" if cpp else "gcc.exe"
    if os.name != "nt":
        exe_name = "g++" if cpp else "gcc"
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    local_tool = os.path.join(root_dir, "compilers", "w64devkit", "bin", exe_name)
    if os.path.exists(local_tool):
        return local_tool
    return shutil.which("g++" if cpp else "gcc") or ("g++" if cpp else "gcc")
