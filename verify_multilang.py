import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:8000/api/execute"

tests = [
    {
        "name": "C - Hello World",
        "payload": {
            "language": "c",
            "code": "#include <stdio.h>\n\nint main() {\n    printf(\"Hello from C!\\n\");\n    return 0;\n}",
            "input": ""
        },
        "expected_output_substr": "Hello from C!",
        "expected_status": "Accepted"
    },
    {
        "name": "C++ - Hello World",
        "payload": {
            "language": "cpp",
            "code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello from C++!\" << endl;\n    return 0;\n}",
            "input": ""
        },
        "expected_output_substr": "Hello from C++!",
        "expected_status": "Accepted"
    },
    {
        "name": "Python - Hello World",
        "payload": {
            "language": "python",
            "code": "print('Hello from Python!')",
            "input": ""
        },
        "expected_output_substr": "Hello from Python!",
        "expected_status": "Accepted"
    },
    {
        "name": "Java - Hello World",
        "payload": {
            "language": "java",
            "code": "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello from Java!\");\n    }\n}",
            "input": ""
        },
        "expected_output_substr": "Hello from Java!",
        "expected_status": "Accepted"
    },
    {
        "name": "JavaScript - Hello World",
        "payload": {
            "language": "javascript",
            "code": "console.log('Hello from JavaScript!');",
            "input": ""
        },
        "expected_output_substr": "Hello from JavaScript!",
        "expected_status": "Accepted"
    },
    {
        "name": "C with Stdin",
        "payload": {
            "language": "c",
            "code": "#include <stdio.h>\n\nint main() {\n    int a, b;\n    if (scanf(\"%d %d\", &a, &b) == 2) {\n        printf(\"SUM: %d\\n\", a + b);\n    }\n    return 0;\n}",
            "input": "40 2"
        },
        "expected_output_substr": "SUM: 42",
        "expected_status": "Accepted"
    },
    {
        "name": "Python with Stdin",
        "payload": {
            "language": "python",
            "code": "name = input()\nage = input()\nprint(f'User: {name}, Age: {age}')",
            "input": "Hari\n20"
        },
        "expected_output_substr": "User: Hari, Age: 20",
        "expected_status": "Accepted"
    },
    {
        "name": "C++ Compilation Error",
        "payload": {
            "language": "cpp",
            "code": "#include <iostream>\nint main() {\n    cout << \"Missing semicolon\"\n    return 0;\n}",
            "input": ""
        },
        "expected_output_substr": "",
        "expected_status": "Compilation Error"
    },
    {
        "name": "Python Syntax Error",
        "payload": {
            "language": "python",
            "code": "def func(\n    print('broken syntax')",
            "input": ""
        },
        "expected_output_substr": "",
        "expected_status": "Compilation Error"
    },
    {
        "name": "JavaScript Runtime Error",
        "payload": {
            "language": "javascript",
            "code": "const obj = null;\nobj.nonExistentMethod();",
            "input": ""
        },
        "expected_output_substr": "",
        "expected_status": "Runtime Error"
    }
]

def run_tests():
    passed = 0
    failed = 0
    print("==================================================")
    print("Running Multi-Language Verification Suite")
    print("==================================================")
    
    for t in tests:
        name = t["name"]
        payload = json.dumps(t["payload"]).encode('utf-8')
        req = urllib.request.Request(
            BASE_URL,
            data=payload,
            headers={'Content-Type': 'application/json'}
        )
        try:
            start_t = time.time()
            with urllib.request.urlopen(req, timeout=30) as resp:
                elapsed = time.time() - start_t
                data = json.loads(resp.read().decode('utf-8'))
                
                status = data.get("status")
                out = data.get("output", "") or data.get("stdout", "")
                err = data.get("error", "") or data.get("stderr", "")
                
                status_ok = (status == t["expected_status"])
                output_ok = (t["expected_output_substr"] in out) if t["expected_output_substr"] else True
                
                if status_ok and output_ok:
                    print(f"PASS: {name} (Time: {elapsed:.2f}s, Status: {status})")
                    passed += 1
                else:
                    print(f"FAIL: {name}")
                    print(f"   Expected status: {t['expected_status']}, got: {status}")
                    print(f"   Expected out substr: '{t['expected_output_substr']}', got: '{out}'")
                    print(f"   Error detail: '{err}'")
                    failed += 1
        except Exception as e:
            print(f"ERROR: {name} - Exception: {e}")
            failed += 1

    print("==================================================")
    print(f"Total: {len(tests)}, Passed: {passed}, Failed: {failed}")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
