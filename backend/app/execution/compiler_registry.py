import os
import sys
import shutil
import subprocess
from typing import Tuple, Optional

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

def get_jdk_toolchain() -> Tuple[Optional[str], Optional[str]]:
    """
    Resolves the Java compiler (javac) and runtime (java).
    Prioritizes project-bundled OpenJDK (Windows local dev), then JAVA_HOME, then system PATH.
    Returns (javac_path, java_path) or (None, None).
    """
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    local_javac = os.path.join(root_dir, "compilers", "jdk", "bin", "javac.exe" if os.name == "nt" else "javac")
    local_java = os.path.join(root_dir, "compilers", "jdk", "bin", "java.exe" if os.name == "nt" else "java")

    if os.path.isfile(local_javac) and os.path.isfile(local_java):
        return local_javac, local_java

    # Check JAVA_HOME
    java_home = os.getenv("JAVA_HOME")
    if java_home:
        jh_javac = os.path.join(java_home, "bin", "javac.exe" if os.name == "nt" else "javac")
        jh_java = os.path.join(java_home, "bin", "java.exe" if os.name == "nt" else "java")
        if os.path.isfile(jh_javac) and os.path.isfile(jh_java):
            return jh_javac, jh_java

    javac_sys = shutil.which("javac")
    java_sys = shutil.which("java")
    return javac_sys, java_sys

def get_gcc_toolchain(cpp: bool = False) -> Optional[str]:
    """
    Resolves GCC or G++ compiler.
    Prioritizes project-bundled modern w64devkit, then system PATH, then clang.
    """
    exe_name = "g++.exe" if cpp else "gcc.exe"
    if os.name != "nt":
        exe_name = "g++" if cpp else "gcc"
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    local_tool = os.path.join(root_dir, "compilers", "w64devkit", "bin", exe_name)
    if os.path.isfile(local_tool):
        return local_tool

    sys_tool = shutil.which("g++" if cpp else "gcc")
    if sys_tool:
        return sys_tool

    # Clang fallback if available
    clang_tool = shutil.which("clang++" if cpp else "clang")
    if clang_tool:
        return clang_tool

    return None

def get_node_binary() -> Optional[str]:
    """
    Resolves Node.js runtime executable.
    """
    return shutil.which("node") or shutil.which("nodejs")

def get_python_binary() -> str:
    """
    Resolves Python interpreter.
    """
    return sys.executable or shutil.which("python3") or shutil.which("python") or "python"
