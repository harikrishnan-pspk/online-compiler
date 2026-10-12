import json
import time
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import Problem, ProblemSubmission, User
from app.schemas.schemas import ProblemDetail, ProblemListItem, ProblemSubmitResponse, TestCaseVerdict
from app.execution.sandbox import ExecutionSandbox

SAMPLE_PROBLEMS = [
    {
        "slug": "two-sum",
        "title": "Two Sum",
        "difficulty": "Easy",
        "category": "Arrays & Hashing",
        "description": "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`. You may assume that each input has exactly one solution, and you may not use the same element twice.",
        "input_format": "The first line contains N (number of elements). The second line contains N space-separated integers. The third line contains target.",
        "output_format": "Print the two 0-indexed positions separated by a space (e.g. `0 1`).",
        "constraints": "2 <= N <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9",
        "examples_json": json.dumps([
            {
                "input": "4\n2 7 11 15\n9",
                "output": "0 1",
                "explanation": "Because nums[0] + nums[1] == 2 + 7 == 9, we return 0 1."
            },
            {
                "input": "3\n3 2 4\n6",
                "output": "1 2",
                "explanation": "nums[1] + nums[2] == 2 + 4 == 6, so we return 1 2."
            }
        ]),
        "starter_templates_json": json.dumps({
            "c": "#include <stdio.h>\n\nint main() {\n    int n, target;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int nums[n];\n    for (int i = 0; i < n; i++) {\n        scanf(\"%d\", &nums[i]);\n    }\n    scanf(\"%d\", &target);\n\n    // Write your solution here\n    for (int i = 0; i < n; i++) {\n        for (int j = i + 1; j < n; j++) {\n            if (nums[i] + nums[j] == target) {\n                printf(\"%d %d\\n\", i, j);\n                return 0;\n            }\n        }\n    }\n    return 0;\n}\n",
            "cpp": "#include <iostream>\n#include <vector>\n#include <unordered_map>\n\nusing namespace std;\n\nint main() {\n    int n, target;\n    if (!(cin >> n)) return 0;\n    vector<int> nums(n);\n    for (int i = 0; i < n; i++) cin >> nums[i];\n    cin >> target;\n\n    unordered_map<int, int> seen;\n    for (int i = 0; i < n; i++) {\n        int comp = target - nums[i];\n        if (seen.count(comp)) {\n            cout << seen[comp] << \" \" << i << endl;\n            return 0;\n        }\n        seen[nums[i]] = i;\n    }\n    return 0;\n}\n",
            "python": "import sys\n\ndef solve():\n    lines = sys.stdin.read().split()\n    if not lines: return\n    n = int(lines[0])\n    nums = [int(x) for x in lines[1:n+1]]\n    target = int(lines[n+1])\n    \n    seen = {}\n    for i, num in enumerate(nums):\n        comp = target - num\n        if comp in seen:\n            print(f\"{seen[comp]} {i}\")\n            return\n        seen[num] = i\n\nif __name__ == '__main__':\n    solve()\n",
            "javascript": "const fs = require('fs');\n\nfunction solve() {\n    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (!tokens || tokens.length < 3) return;\n    const n = parseInt(tokens[0]);\n    const nums = tokens.slice(1, n + 1).map(Number);\n    const target = parseInt(tokens[n + 1]);\n    \n    const seen = new Map();\n    for (let i = 0; i < n; i++) {\n        const comp = target - nums[i];\n        if (seen.has(comp)) {\n            console.log(`${seen.get(comp)} ${i}`);\n            return;\n        }\n        seen.set(nums[i], i);\n    }\n}\n\nsolve();\n",
            "java": "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();\n        int target = sc.nextInt();\n        \n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < n; i++) {\n            int comp = target - nums[i];\n            if (map.containsKey(comp)) {\n                System.out.println(map.get(comp) + \" \" + i);\n                return;\n            }\n            map.put(nums[i], i);\n        }\n    }\n}\n"
        }),
        "test_cases_json": json.dumps([
            {"id": 1, "input": "4\n2 7 11 15\n9", "expected_output": "0 1", "is_hidden": False},
            {"id": 2, "input": "3\n3 2 4\n6", "expected_output": "1 2", "is_hidden": False},
            {"id": 3, "input": "2\n3 3\n6", "expected_output": "0 1", "is_hidden": True},
            {"id": 4, "input": "5\n-1 -2 -3 -4 -5\n-8", "expected_output": "2 4", "is_hidden": True}
        ])
    },
    {
        "slug": "reverse-string",
        "title": "Reverse String",
        "difficulty": "Easy",
        "category": "Strings",
        "description": "Write a function that reverses a string input in-place or returns the reversed sequence.",
        "input_format": "A single line containing the string S.",
        "output_format": "The reversed string printed to stdout.",
        "constraints": "1 <= |S| <= 10^5",
        "examples_json": json.dumps([
            {"input": "hello", "output": "olleh", "explanation": "'hello' reversed is 'olleh'"},
            {"input": "CodeForge", "output": "egroFedoC", "explanation": "Reversing uppercase and lowercase letters"}
        ]),
        "starter_templates_json": json.dumps({
            "c": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char str[1000];\n    if (scanf(\"%s\", str) == 1) {\n        int len = strlen(str);\n        for (int i = len - 1; i >= 0; i--) {\n            putchar(str[i]);\n        }\n        putchar('\\n');\n    }\n    return 0;\n}\n",
            "cpp": "#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    string s;\n    if (cin >> s) {\n        reverse(s.begin(), s.end());\n        cout << s << endl;\n    }\n    return 0;\n}\n",
            "python": "import sys\ns = sys.stdin.read().strip()\nprint(s[::-1])\n",
            "javascript": "const fs = require('fs');\nconst s = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(s.split('').reverse().join(''));\n",
            "java": "import java.util.Scanner;\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNext()) {\n            String s = sc.next();\n            System.out.println(new StringBuilder(s).reverse().toString());\n        }\n    }\n}\n"
        }),
        "test_cases_json": json.dumps([
            {"id": 1, "input": "hello", "expected_output": "olleh", "is_hidden": False},
            {"id": 2, "input": "CodeForge", "expected_output": "egroFedoC", "is_hidden": False},
            {"id": 3, "input": "racecar", "expected_output": "racecar", "is_hidden": True},
            {"id": 4, "input": "algorithms", "expected_output": "smhtirogla", "is_hidden": True}
        ])
    },
    {
        "slug": "palindrome-number",
        "title": "Palindrome Number",
        "difficulty": "Easy",
        "category": "Math",
        "description": "Given an integer `x`, print `true` if `x` is a palindrome, and `false` otherwise.",
        "input_format": "A single integer x.",
        "output_format": "Output 'true' or 'false'.",
        "constraints": "-2^31 <= x <= 2^31 - 1",
        "examples_json": json.dumps([
            {"input": "121", "output": "true", "explanation": "121 reads as 121 from left to right and from right to left."},
            {"input": "-121", "output": "false", "explanation": "From left to right it reads -121. From right to left it becomes 121-."}
        ]),
        "starter_templates_json": json.dumps({
            "c": "#include <stdio.h>\n\nint main() {\n    long long x;\n    if (scanf(\"%lld\", &x) == 1) {\n        if (x < 0) { printf(\"false\\n\"); return 0; }\n        long long rev = 0, orig = x;\n        while (x > 0) {\n            rev = rev * 10 + (x % 10);\n            x /= 10;\n        }\n        printf(rev == orig ? \"true\\n\" : \"false\\n\");\n    }\n    return 0;\n}\n",
            "cpp": "#include <iostream>\nusing namespace std;\nint main() {\n    long long x; if (cin >> x) {\n        if (x < 0) { cout << \"false\" << endl; return 0; }\n        long long rev = 0, orig = x;\n        while (x > 0) { rev = rev * 10 + (x % 10); x /= 10; }\n        cout << (rev == orig ? \"true\" : \"false\") << endl;\n    }\n    return 0;\n}\n",
            "python": "import sys\nx = sys.stdin.read().strip()\nif x.startswith('-'):\n    print('false')\nelse:\n    print('true' if x == x[::-1] else 'false')\n",
            "javascript": "const fs = require('fs');\nconst x = fs.readFileSync(0, 'utf-8').trim();\nif (x.startsWith('-')) console.log('false');\nelse console.log(x === x.split('').reverse().join('') ? 'true' : 'false');\n",
            "java": "import java.util.Scanner;\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLong()) {\n            long x = sc.nextLong();\n            if (x < 0) { System.out.println(\"false\"); return; }\n            long rev = 0, orig = x;\n            while (x > 0) { rev = rev * 10 + (x % 10); x /= 10; }\n            System.out.println(rev == orig ? \"true\" : \"false\");\n        }\n    }\n}\n"
        }),
        "test_cases_json": json.dumps([
            {"id": 1, "input": "121", "expected_output": "true", "is_hidden": False},
            {"id": 2, "input": "-121", "expected_output": "false", "is_hidden": False},
            {"id": 3, "input": "10", "expected_output": "false", "is_hidden": True},
            {"id": 4, "input": "12321", "expected_output": "true", "is_hidden": True}
        ])
    }
]

def seed_problems_if_empty(db: Session):
    count = db.query(Problem).count()
    if count == 0:
        for p in SAMPLE_PROBLEMS:
            problem = Problem(**p)
            db.add(problem)
        db.commit()

class PracticeService:
    @staticmethod
    def get_all_problems(db: Session) -> List[ProblemListItem]:
        seed_problems_if_empty(db)
        problems = db.query(Problem).all()
        return [
            ProblemListItem(
                id=p.id,
                slug=p.slug,
                title=p.title,
                difficulty=p.difficulty,
                category=p.category
            )
            for p in problems
        ]

    @staticmethod
    def get_problem_by_slug(db: Session, slug: str) -> Optional[ProblemDetail]:
        seed_problems_if_empty(db)
        p = db.query(Problem).filter(Problem.slug == slug).first()
        if not p:
            return None
        return ProblemDetail(
            id=p.id,
            slug=p.slug,
            title=p.title,
            difficulty=p.difficulty,
            category=p.category,
            description=p.description,
            input_format=p.input_format,
            output_format=p.output_format,
            constraints=p.constraints,
            examples=json.loads(p.examples_json),
            starter_templates=json.loads(p.starter_templates_json)
        )

    @staticmethod
    def evaluate_submission(
        db: Session,
        problem_id: int,
        language: str,
        code: str,
        user_id: Optional[int] = None
    ) -> ProblemSubmitResponse:
        p = db.query(Problem).filter(Problem.id == problem_id).first()
        if not p:
            raise ValueError("Problem not found")

        import concurrent.futures

        test_cases = json.loads(p.test_cases_json)

        def run_single_test_case(tc):
            tc_input = tc.get("input", "")
            expected = tc.get("expected_output", "").strip()
            is_hidden = tc.get("is_hidden", False)
            res = ExecutionSandbox.execute(language=language, code=code, stdin=tc_input)
            actual = res.stdout.strip()
            passed = (res.status == "Accepted" and actual == expected)
            verdict = TestCaseVerdict(
                id=tc["id"],
                is_hidden=is_hidden,
                input="[Hidden Test Case]" if is_hidden else tc_input,
                expected_output="[Hidden]" if is_hidden else expected,
                actual_output="[Hidden]" if is_hidden and not passed else actual,
                passed=passed,
                error=res.stderr if not is_hidden and res.stderr else None
            )
            return (verdict, res.status, res.execution_time)

        verdicts: List[TestCaseVerdict] = []
        passed_count = 0
        total_time = 0.0
        final_status = "Accepted"

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            results = list(executor.map(run_single_test_case, test_cases))

        for v, run_status, exec_time in results:
            verdicts.append(v)
            total_time += exec_time
            if v.passed:
                passed_count += 1
            else:
                if run_status != "Accepted" and final_status == "Accepted":
                    final_status = run_status
                elif final_status == "Accepted":
                    final_status = "Wrong Answer"

        # Record submission
        submission = ProblemSubmission(
            user_id=user_id,
            problem_id=problem_id,
            language=language,
            code=code,
            status=final_status,
            passed_count=passed_count,
            total_count=len(test_cases)
        )
        db.add(submission)

        if user_id and final_status == "Accepted":
            # Check if this user solved this problem for the first time
            prev_solved = db.query(ProblemSubmission).filter(
                ProblemSubmission.user_id == user_id,
                ProblemSubmission.problem_id == problem_id,
                ProblemSubmission.status == "Accepted",
                ProblemSubmission.id != submission.id
            ).first()
            if not prev_solved:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    user.problems_solved_count = (user.problems_solved_count or 0) + 1

        db.commit()

        return ProblemSubmitResponse(
            status=final_status,
            passed_count=passed_count,
            total_count=len(test_cases),
            test_cases=verdicts,
            execution_time=round(total_time, 3)
        )
