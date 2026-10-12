from typing import Dict
from app.execution.base_executor import BaseExecutor
from app.execution.c_executor import CExecutor
from app.execution.cpp_executor import CppExecutor
from app.execution.python_executor import PythonExecutor
from app.execution.java_executor import JavaExecutor
from app.execution.javascript_executor import JavaScriptExecutor

class ExecutorFactory:
    """
    Factory class that returns the appropriate language executor instance.
    """

    _executors: Dict[str, BaseExecutor] = {
        "c": CExecutor(),
        "cpp": CppExecutor(),
        "c++": CppExecutor(),
        "python": PythonExecutor(),
        "py": PythonExecutor(),
        "java": JavaExecutor(),
        "javascript": JavaScriptExecutor(),
        "js": JavaScriptExecutor()
    }

    @classmethod
    def get_executor(cls, language: str) -> BaseExecutor:
        normalized_lang = language.lower().strip()
        executor = cls._executors.get(normalized_lang)
        if not executor:
            supported = ", ".join(set(cls._executors.keys()))
            raise ValueError(f"Language '{language}' is not supported. Supported languages: {supported}")
        return executor
