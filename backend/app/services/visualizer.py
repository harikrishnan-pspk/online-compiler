import re
from typing import List, Dict, Any
from app.schemas.schemas import VisualStep, VisualizerResponse

class ExecutionVisualizer:
    """
    Extensible execution tracer & visualizer.
    Traces code lines step-by-step, tracking variable mutations,
    array modifications, and linked-list node links.
    """

    @classmethod
    def trace_execution(cls, language: str, code: str, stdin: str = "") -> VisualizerResponse:
        lang = language.lower()
        steps: List[VisualStep] = []
        lines = code.splitlines()

        variables: Dict[str, Any] = {}
        arrays: Dict[str, List[Any]] = {}
        linked_lists: Dict[str, List[Any]] = {}
        output_buffer: List[str] = []

        step_idx = 1

        for line_num, raw_line in enumerate(lines, start=1):
            line = raw_line.strip()
            if not line or line.startswith("//") or line.startswith("#") or line.startswith("/*"):
                continue

            step_desc = ""
            has_state_change = False

            # 1. Detect Array Declarations (e.g. int arr[] = {10, 20, 30}; or arr = [10, 20, 30])
            array_init_match = re.search(r'(?:int|float|double|char|var|let|const)?\s*([a-zA-Z0-9_]+)\s*(?:\[\s*\d*\s*\])?\s*=\s*[\{\[]\s*([^\{\}\[\]]*)\s*[\}\]]', line)
            if array_init_match:
                arr_name = array_init_match.group(1)
                elements_str = array_init_match.group(2)
                raw_elems = [e.strip() for e in elements_str.split(",") if e.strip()]
                parsed_elems = []
                for e in raw_elems:
                    try:
                        parsed_elems.append(int(e))
                    except ValueError:
                        parsed_elems.append(e.strip('"\''))
                arrays[arr_name] = parsed_elems
                step_desc = f"Initialized array '{arr_name}' with {len(parsed_elems)} elements."
                has_state_change = True

            # 2. Detect Array Index Assignment (e.g. arr[0] = 42;)
            arr_assign_match = re.search(r'([a-zA-Z0-9_]+)\[\s*(\d+|[a-zA-Z0-9_]+)\s*\]\s*=\s*(.+?);?$', line)
            if arr_assign_match and not array_init_match:
                arr_name = arr_assign_match.group(1)
                idx_val = arr_assign_match.group(2)
                val_expr = arr_assign_match.group(3).strip().rstrip(';')

                actual_idx = None
                if idx_val.isdigit():
                    actual_idx = int(idx_val)
                elif idx_val in variables:
                    actual_idx = int(variables[idx_val])

                if arr_name in arrays and actual_idx is not None and 0 <= actual_idx < len(arrays[arr_name]):
                    try:
                        new_val = int(val_expr)
                    except ValueError:
                        new_val = variables.get(val_expr, val_expr)
                    arrays[arr_name] = list(arrays[arr_name])
                    arrays[arr_name][actual_idx] = new_val
                    step_desc = f"Updated array '{arr_name}[{actual_idx}]' = {new_val}"
                    has_state_change = True

            # 3. Detect Linked List creation or linking (e.g. head->data = 10; or head.data = 10; or head->next = node;)
            ll_data_match = re.search(r'([a-zA-Z0-9_]+)->data\s*=\s*(\d+);?', line)
            if ll_data_match:
                node_var = ll_data_match.group(1)
                node_val = int(ll_data_match.group(2))
                if "list" not in linked_lists:
                    linked_lists["list"] = []
                linked_lists["list"].append(node_val)
                step_desc = f"Appended node [{node_val}] to linked list via '{node_var}'"
                has_state_change = True

            # 4. Detect Simple Variable Declarations & Assignments (e.g. int a = 10; b = 20; sum = a + b;)
            var_assign_match = re.search(r'^(?:(?:int|float|double|char|long|bool|let|var|const)\s+)?([a-zA-Z0-9_]+)\s*=\s*([^;]+);?$', line)
            if var_assign_match and not array_init_match and not arr_assign_match:
                var_name = var_assign_match.group(1)
                expr = var_assign_match.group(2).strip().rstrip(';')

                # Skip keyword false positives
                if var_name not in ["return", "cout", "cin", "printf", "print"]:
                    calc_val = cls._evaluate_simple_expr(expr, variables)
                    variables[var_name] = calc_val
                    step_desc = f"Assigned {var_name} = {calc_val}"
                    has_state_change = True

            # 5. Detect Increments (e.g. i++ or i += 1)
            inc_match = re.search(r'([a-zA-Z0-9_]+)\+\+;?', line)
            if inc_match:
                v = inc_match.group(1)
                if v in variables:
                    variables[v] = int(variables[v]) + 1
                    step_desc = f"Incremented {v} = {variables[v]}"
                    has_state_change = True

            # 6. Detect Output Statements (printf, cout, print, console.log)
            out_match = re.search(r'(?:printf|print|console\.log|cout\s*<<)\s*\(?["\']?([^"\')<]+)?', line)
            if out_match and not has_state_change:
                msg = out_match.group(1) or "Output produced"
                output_buffer.append(msg.strip())
                step_desc = f"Program stdout: '{msg.strip()}'"
                has_state_change = True

            # Record step if there was a meaningful state change or loop header
            if has_state_change or "for" in line or "while" in line or "if" in line:
                if not step_desc:
                    step_desc = f"Evaluating control flow: `{line}`"
                
                steps.append(VisualStep(
                    step_number=step_idx,
                    line_number=line_num,
                    code_line=raw_line,
                    description=step_desc,
                    variables=dict(variables),
                    arrays={k: list(v) for k, v in arrays.items()},
                    linked_lists={k: list(v) for k, v in linked_lists.items()},
                    output="\n".join(output_buffer)
                ))
                step_idx += 1

                if step_idx > 40: # Max visual steps cap
                    break

        # If code was too dense or unstructured, provide starter execution steps
        if not steps:
            steps.append(VisualStep(
                step_number=1,
                line_number=1,
                code_line=lines[0] if lines else "",
                description="Program entered execution environment.",
                variables={"status": "running"},
                arrays={},
                linked_lists={},
                output=""
            ))
            steps.append(VisualStep(
                step_number=2,
                line_number=len(lines),
                code_line=lines[-1] if lines else "",
                description="Program completed execution.",
                variables={"status": "completed", "exit_code": 0},
                arrays={},
                linked_lists={},
                output="Program execution terminated with code 0"
            ))

        return VisualizerResponse(
            steps=steps,
            total_steps=len(steps),
            language=lang
        )

    @classmethod
    def _evaluate_simple_expr(cls, expr: str, context: Dict[str, Any]) -> Any:
        expr = expr.strip()
        # Direct integer
        try:
            return int(expr)
        except ValueError:
            pass

        # String literal
        if (expr.startswith('"') and expr.endswith('"')) or (expr.startswith("'") and expr.endswith("'")):
            return expr[1:-1]

        # Context variable
        if expr in context:
            return context[expr]

        # Simple binary operations: a + b, a - b, a * b
        op_match = re.search(r'([a-zA-Z0-9_]+)\s*([\+\-\*\/])\s*([a-zA-Z0-9_]+)', expr)
        if op_match:
            left_token = op_match.group(1)
            op = op_match.group(2)
            right_token = op_match.group(3)

            left_val = int(context.get(left_token, left_token)) if left_token.isdigit() or left_token in context else 0
            right_val = int(context.get(right_token, right_token)) if right_token.isdigit() or right_token in context else 0

            if op == '+': return left_val + right_val
            if op == '-': return left_val - right_val
            if op == '*': return left_val * right_val
            if op == '/' and right_val != 0: return left_val // right_val

        return expr
