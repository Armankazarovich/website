# ARAY Messenger UI Standard

Date: 2026-05-25

## Goal

ARAY Messenger must feel like one calm business phone, not a pile of widgets. The first screen answers four questions instantly:

- who am I talking to;
- where do I type;
- how do I call or start video;
- where is my AR Phone number.

## Product Shape

The ARAY surface has three states only:

- `AR Phone Home` - default hub with personal number, calls, video, invite, share and account.
- `Dialogs` - list of ARAY, clients, contacts and future groups.
- `Thread` - Telegram-like chat with ARAY/CRM help inside the same conversation.

No screen may show duplicate navigation for the same thing. If AR Phone is open, the bottom bridge strip is hidden.

## Chat Rules

- Manager messages are right-aligned, filled blue, readable and warm.
- Client and ARAY messages are left-aligned, calm dark bubbles.
- Technical routing controls are not shown as large segmented switches.
- The composer stays simple: ARAY icon, text field, tools, voice, send.
- ARAY routing remains smart in code, but the UI speaks in human words.
- Grammar/proofread appears only when it has something useful to show.

## AR Phone Rules

- The bottom ARAY button opens AR Phone Home by default.
- ARAY stays open across admin navigation unless explicitly closed.
- AR Phone card shows a clean public number without the `AR` prefix.
- Number, copy, share, dial, video and invite are always visually close.
- Provider-ready calls/video must not pretend to be native telephony until SDK/API is connected.

## Responsive Rules

- Cards stack on narrow widths.
- Action grid becomes 2 columns before it becomes cramped.
- Long labels truncate softly and never push buttons out of frame.
- Search/contact forms stay inside the dialog panel and scroll internally.

## Launch Boundary

Ready for demo:

- internal AR Phone identity;
- CRM/contact/team number display;
- internal dial resolution;
- Jitsi/provider meeting link flow;
- ARAY draft, grammar and next-step helper.

Needs provider before marketing as native calls:

- in-app VoIP signaling;
- real video SDK room lifecycle;
- incoming call screen;
- push call notifications.
