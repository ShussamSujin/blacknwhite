/**
 * SHU 블랙&화이트 — AI 부가 주소 분석 중계 서버 (Apps Script)
 *
 * ■ 설치 방법 (3분)
 * 1. script.google.com → 새 프로젝트 → 이 코드 전체 붙여넣기
 * 2. 왼쪽 ⚙️ 프로젝트 설정 → 스크립트 속성 → 속성 추가:
 *    키: ANTHROPIC_API_KEY / 값: (Claude API 키)
 * 3. 배포 → 새 배포 → 유형: 웹 앱
 *    - 실행 계정: 나
 *    - 액세스 권한: 모든 사용자
 *    → 배포 후 나오는 웹 앱 URL(https://script.google.com/macros/s/…/exec)을 복사
 * 4. 그 URL을 클로드에게 알려주면 사이트에 연결해 드립니다.
 */

const MODEL = 'claude-sonnet-5';

const SYSTEM_PROMPT = [
  '너는 학교 크롬북 화이트리스트(Chrome URLAllowlist) 전문가야.',
  '사용자가 에듀테크 도구 이름이나 사이트 주소를 주면, 그 서비스가 학생 크롬북에서 완전히 작동하기 위해',
  '허용 목록에 넣어야 하는 도메인 묶음을 알려줘.',
  '',
  '규칙:',
  '- Chrome 정책 패턴 "example.com"은 www 등 모든 하위 도메인을 자동 포함한다. 그러므로 루트 도메인 위주로, 뿌리가 다른 부가 도메인(CDN, 로그인, 미디어 서버 등)을 빠짐없이 담아라.',
  '- 광고·트래킹 도메인은 넣지 마라.',
  '- 학생에게 위험한 사이트(게임·SNS·성인)면 domains를 빈 배열로 하고 note에 이유를 적어라.',
  '- 반드시 아래 JSON 형식으로만 답하라. 다른 텍스트, 마크다운 코드펜스 금지.',
  '{"name":"서비스 이름","domains":["도메인1","도메인2"],"note":"한국어 한두 문장 설명(어떤 도메인이 왜 필요한지)"}'
].join('\n');

function doPost(e) {
  let out;
  try {
    const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
    if (!key) throw new Error('API 키가 설정되지 않았어요');
    const body = JSON.parse(e.postData.contents || '{}');
    const q = String(body.query || '').slice(0, 200).trim();
    if (!q) throw new Error('query가 비어 있어요');

    const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: q }]
      }),
      muteHttpExceptions: true
    });

    const data = JSON.parse(res.getContentText());
    if (data.error) throw new Error(data.error.message || 'API 오류');
    let text = (data.content && data.content[0] && data.content[0].text || '').trim();
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(text); // 형식 검증
    out = JSON.stringify(parsed);
  } catch (err) {
    out = JSON.stringify({ error: String(err && err.message || err) });
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

/** 배포 전 동작 테스트용 — 편집기에서 이 함수를 실행해보세요 */
function testProxy() {
  const e = { postData: { contents: JSON.stringify({ query: '북웍스' }) } };
  Logger.log(doPost(e).getContent());
}
