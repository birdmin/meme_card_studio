# 카드 5-A — 템플릿 JSON 가져오기 3종 시험

Playwright로 `docs/scripts/check_json_import.js`를 실행해 실제 파일 입력을 통해 검증했습니다.
시험용 JSON 3개는 `docs/fixtures/`에 있습니다.

## 시험 결과

| # | 파일 | 내용 | 가져오기 전 개수 | 가져오기 후 개수 | 판정 |
|---|------|------|---|---|---|
| 1 | `fixtures/missing-required.json` | 문법은 정상이지만 `text.size` 등 필수 항목 누락 | 2 | **2 (변화 없음)** | PASS (T03-C24) |
| 2 | `fixtures/broken-syntax.json` | 중괄호 누락 등 문법 자체가 깨짐 | 2 | **2 (변화 없음)** | PASS (T03-C23) |
| 3 | `fixtures/valid-templates.json` | 필수 항목을 모두 갖춘 정상 JSON | 2 | **3 (정상 추가됨)** | PASS (T03-C22) |

- 실패한 두 건 모두 화면에 "가져오기 거부: (사유) — 기존 템플릿 N개는 그대로 유지됩니다" 라는
  구체적인 거부 사유가 표시되고, `localStorage`는 검증 통과 전까지 전혀 쓰지 않습니다
  (검증 함수 `validateTemplatePayload`가 순수 함수라 실패 시 아무 부작용이 없음).
- 성공한 건은 이름까지 정확히 반영되어 목록에 추가되는 것을 확인했습니다.
- 세 시나리오 모두 JS 에러(pageerror) 0건.

## 재현 방법
```bash
node docs/scripts/check_json_import.js
```
