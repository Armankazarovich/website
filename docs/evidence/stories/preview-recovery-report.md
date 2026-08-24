# Stories Preview Recovery Report

Base URL: http://localhost:3111
Test path: /product/vagonka-lipa
Light test file: /aray/orb-v2.mp4
Heavy test file: /images/production/hero-video.mp4
HEAD-fail test file: /images/production/does-not-exist-preview-recovery-check.mp4

- OK Local server is available: http://localhost:3111/api/health must respond before the recovery check.
- OK Chrome or Edge executable exists: A Chromium browser is required.
- OK Stories widget present on test page: Expected [data-store-stories-card] on /product/vagonka-lipa
- OK Test fetch shim is active (no DB writes used): window.fetch was not patched before app scripts ran.
- OK Story A (light video) preview approved and mounted: Expected a <video> for the light story after its HEAD check.
- OK Story A received a real GET for its own file: GET count for /aray/orb-v2.mp4: 1
- OK Switching to heavy story B does not reuse A's approval: A <video> mounted for the heavy story immediately on switch, before any HEAD check could complete.
- OK Closed widget never issues GET/Range for the heavy story: GET/Range requests observed for /images/production/hero-video.mp4: []
- OK Heavy story stays on its poster in the closed widget: Heavy story's <video> mounted despite exceeding the 12MB preview threshold.
- OK Story A can be approved again after returning from story B: Expected story A to receive a fresh approval for its own media key.
- OK Preview error leaves the poster mounted (no auto re-mount): A <video> element re-appeared after a preview error without any story/media change.
- OK Preview error does not trigger a repeated GET: Expected 0 new GET for /aray/orb-v2.mp4 after the error, saw 0.
- OK A non-ok HEAD response never approves the preview: Video mounted after a 404 HEAD response.
- OK Only HEAD (no GET) was attempted against the failing URL: Unexpected requests: []
