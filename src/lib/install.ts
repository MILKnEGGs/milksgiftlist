// Step-by-step install guide (route #/install). Illustrations are inline SVG drawn with the
// app's theme colors so they work offline and in dark mode. To use real screenshots instead,
// put images in public/install/ and swap the figure for <img src="install/step1.png">.

const W = 260;

let mockId = 0;

/** Phone screen frame; `body` is SVG drawn inside a 260×(h) viewBox, clipped to the rounded frame. */
function phone(h: number, body: string, label: string): string {
  const clip = `mk-clip-${mockId++}`;
  return `
    <svg class="mock" viewBox="0 0 ${W} ${h}" role="img" aria-label="${label}">
      <defs><clipPath id="${clip}"><rect x="1" y="1" width="${W - 2}" height="${h - 2}" rx="18" /></clipPath></defs>
      <rect x="1" y="1" width="${W - 2}" height="${h - 2}" rx="18" class="mk-frame" />
      <g clip-path="url(#${clip})">${body}</g>
      <rect x="1" y="1" width="${W - 2}" height="${h - 2}" rx="18" class="mk-frame-edge" />
    </svg>`;
}

/** Pulsing ring that marks where to tap. */
function tap(cx: number, cy: number, r = 22): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" class="mk-tap" /><circle cx="${cx}" cy="${cy}" r="${r}" class="mk-tap pulse" />`;
}

function pageLines(y: number, n: number): string {
  return Array.from({ length: n }, (_, i) => {
    const w = [180, 150, 200, 120, 170][i % 5];
    return `<rect x="24" y="${y + i * 18}" width="${w}" height="8" rx="4" class="mk-faint" />`;
  }).join('');
}

const shareIcon = (x: number, y: number, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})" class="mk-icon">
    <path d="M-7 -2 H-10 V12 H10 V-2 H7" fill="none" />
    <path d="M0 -12 V5 M-5 -7 L0 -12 L5 -7" fill="none" />
  </g>`;

const plusSquare = (x: number, y: number) => `
  <g transform="translate(${x} ${y})" class="mk-icon">
    <rect x="-9" y="-9" width="18" height="18" rx="4" fill="none" />
    <path d="M0 -5 V5 M-5 0 H5" />
  </g>`;

// Step 1: Safari with the bottom toolbar; tap the ⋯ (or Share) button.
const safariToolbar = phone(
  210,
  `${pageLines(24, 5)}
   <rect x="0" y="130" width="${W}" height="80" class="mk-bar" />
   <text x="22" y="167" class="mk-text big">‹</text>
   <rect x="46" y="148" width="160" height="30" rx="15" class="mk-pill" />
   <text x="126" y="168" text-anchor="middle" class="mk-text">milkneggs.github.io</text>
   <text x="232" y="168" text-anchor="middle" class="mk-text big">⋯</text>
   ${tap(232, 162, 18)}`,
  'Safari toolbar with the More button highlighted',
);

// Step 2: the menu that opens from ⋯, with Share highlighted.
const moreMenu = phone(
  210,
  `${pageLines(24, 3)}
   <rect x="92" y="36" width="150" height="160" rx="14" class="mk-sheet" />
   <rect x="92" y="36" width="150" height="40" rx="14" class="mk-row-hl" />
   ${shareIcon(114, 56, 0.8)}
   <text x="132" y="61" class="mk-text strong">Share</text>
   <line x1="104" y1="76" x2="230" y2="76" class="mk-sep" />
   <text x="132" y="101" class="mk-muted">Add to Bookmarks</text>
   <line x1="104" y1="116" x2="230" y2="116" class="mk-sep" />
   <text x="132" y="141" class="mk-muted">New Tab</text>
   <line x1="104" y1="156" x2="230" y2="156" class="mk-sep" />
   <text x="132" y="181" class="mk-muted">Find on Page</text>
   ${tap(114, 56, 16)}`,
  'Menu with Share highlighted',
);

// Step 3: the share sheet; scroll down to Add to Home Screen.
const shareSheet = phone(
  230,
  `<rect x="1" y="20" width="${W - 2}" height="209" rx="18" class="mk-sheet" />
   <rect x="110" y="30" width="40" height="5" rx="2.5" class="mk-faint" />
   <rect x="18" y="48" width="36" height="36" rx="9" class="mk-appicon" />
   <text x="64" y="64" class="mk-text strong">Gift List</text>
   <text x="64" y="80" class="mk-muted small">milkneggs.github.io</text>
   <rect x="14" y="98" width="${W - 28}" height="120" rx="12" class="mk-group" />
   <text x="30" y="124" class="mk-muted">Copy</text>
   <line x1="30" y1="138" x2="${W - 30}" y2="138" class="mk-sep" />
   <text x="30" y="160" class="mk-muted">Add to Reading List</text>
   <line x1="30" y1="174" x2="${W - 30}" y2="174" class="mk-sep" />
   <rect x="14" y="176" width="${W - 28}" height="42" rx="12" class="mk-row-hl" />
   <text x="30" y="202" class="mk-text strong">Add to Home Screen</text>
   ${plusSquare(W - 40, 197)}
   ${tap(W - 40, 197, 17)}`,
  'Share sheet with Add to Home Screen highlighted',
);

// Step 4: the Add to Home Screen dialog: Open as Web App on, then Add.
const addDialog = phone(
  230,
  `<rect x="1" y="1" width="${W - 2}" height="228" rx="18" class="mk-sheet" />
   <text x="20" y="34" class="mk-link">Cancel</text>
   <text x="130" y="34" text-anchor="middle" class="mk-text strong small">Add to Home Screen</text>
   <text x="${W - 20}" y="34" text-anchor="end" class="mk-link strong">Add</text>
   ${tap(W - 34, 29, 20)}
   <rect x="14" y="54" width="${W - 28}" height="70" rx="12" class="mk-group" />
   <rect x="26" y="66" width="46" height="46" rx="11" class="mk-appicon" />
   <text x="86" y="86" class="mk-text strong">Gift List</text>
   <text x="86" y="104" class="mk-muted small">milkneggs.github.io</text>
   <rect x="14" y="140" width="${W - 28}" height="46" rx="12" class="mk-row-hl" />
   <text x="30" y="168" class="mk-text strong">Open as Web App</text>
   <rect x="${W - 76}" y="150" width="48" height="26" rx="13" class="mk-toggle-on" />
   <circle cx="${W - 41}" cy="163" r="11" class="mk-knob" />
   <text x="130" y="208" text-anchor="middle" class="mk-muted small">Leave this switched ON (green)</text>`,
  'Add to Home Screen dialog with Open as Web App switched on and the Add button highlighted',
);

// Step 5: the home screen; open Gift List from its icon.
const homeScreen = phone(
  210,
  `${[0, 1, 2, 3]
    .flatMap((col) =>
      [0, 1, 2].map((row) => {
        const x = 26 + col * 56;
        const y = 24 + row * 62;
        if (col === 1 && row === 1)
          return `<rect x="${x}" y="${y}" width="44" height="44" rx="11" class="mk-appicon" />
                  <text x="${x + 22}" y="${y + 58}" text-anchor="middle" class="mk-text tiny strong">Gift List</text>
                  ${tap(x + 22, y + 22, 27)}`;
        return `<rect x="${x}" y="${y}" width="44" height="44" rx="11" class="mk-faint" />`;
      }),
    )
    .join('')}`,
  'Home screen with the Gift List icon highlighted',
);

// Step 7: the app with the one-time "ready offline" message.
const readyBar = phone(
  150,
  `<rect x="1" y="1" width="${W - 2}" height="52" rx="18" class="mk-accent" />
   <rect x="1" y="30" width="${W - 2}" height="23" class="mk-accent" />
   <text x="18" y="35" class="mk-on-accent strong">Milk's Gift List</text>
   ${pageLines(70, 2)}
   <rect x="40" y="104" width="${W - 80}" height="32" rx="16" class="mk-toast" />
   <text x="${W / 2}" y="125" text-anchor="middle" class="mk-toast-text strong">✓ Ready to use offline</text>
   <rect x="36" y="100" width="${W - 72}" height="40" rx="20" class="mk-tap" />`,
  'App showing the Ready to use offline message',
);

interface Step {
  title: string;
  body: string;
  figure?: string;
}

const iphoneSteps = (siteUrl: string): Step[] => [
  {
    title: 'Open this page in Safari',
    body: `It has to be <strong>Safari</strong> (the blue compass app), not Chrome or another browser.
      Go to <strong>${siteUrl}</strong> while you have Wi-Fi or signal.`,
  },
  {
    title: 'Tap ⋯ at the bottom right',
    body: `At the bottom of the screen, tap the <strong>⋯</strong> button.
      <span class="aside">On older iPhones there's no ⋯. Tap the Share button
      (a square with an arrow pointing up) and skip to step 4.</span>`,
    figure: safariToolbar,
  },
  {
    title: 'Tap Share',
    body: 'In the menu that opens, tap <strong>Share</strong>.',
    figure: moreMenu,
  },
  {
    title: 'Tap "Add to Home Screen"',
    body: `Scroll down the list and tap <strong>Add to Home Screen</strong>.
      <span class="aside">Don't see it? Scroll to the bottom and tap <em>Edit Actions</em> or <em>More</em>.</span>`,
    figure: shareSheet,
  },
  {
    title: 'Keep "Open as Web App" on, then tap Add',
    body: `Make sure the <strong>Open as Web App</strong> switch is <strong>green</strong>, then tap
      <strong>Add</strong> in the top right. If the switch is off, the icon only opens Safari and
      the app <em>won't</em> work offline.`,
    figure: addDialog,
  },
  {
    title: 'Open Gift List from your Home Screen',
    body: `Go to your Home Screen and tap the new <strong>Gift List</strong> icon. Do this
      <strong>before</strong> you lose signal. This first launch saves the app to your phone.
      It should open full-screen, with <em>no</em> Safari address bar.`,
    figure: homeScreen,
  },
  {
    title: 'Wait for "✓ Ready to use offline"',
    body: `In a few seconds a <strong>✓ Ready to use offline</strong> message pops up. That's it:
      your lists now live on this phone and work with no internet. Always open it from the Home Screen icon.`,
    figure: readyBar,
  },
];

export function installGuideHtml(context: { siteUrl: string; isStandalone: boolean }): string {
  const steps = iphoneSteps(context.siteUrl)
    .map(
      (s, i) => `
      <li class="step">
        <div class="step-text">
          <h3><span class="step-num">${i + 1}</span>${s.title}</h3>
          <p>${s.body}</p>
        </div>
        ${s.figure ? `<figure>${s.figure}</figure>` : ''}
      </li>`,
    )
    .join('');

  const installedNote = context.isStandalone
    ? `<div class="card ok">✓ You're using the installed app. You're all set! 🎉</div>`
    : '';

  return `
    <p class="muted" style="margin:0 2px">Takes about a minute. You only do this once per phone.</p>
    ${installedNote}

    <div class="card guide">
      <h3 class="guide-head">🍎 iPhone</h3>
      <ol class="steps">${steps}</ol>
    </div>

    <div class="card guide">
      <h3 class="guide-head">🤖 Android (Chrome)</h3>
      <ol class="plain">
        <li>Open <strong>${context.siteUrl}</strong> in Chrome.</li>
        <li>Tap the <strong>⋮</strong> menu at the top right.</li>
        <li>Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>), then <strong>Install</strong>.</li>
        <li>Open <strong>Gift List</strong> from your Home Screen once while you have signal.</li>
      </ol>
    </div>

    <div class="card guide">
      <h3 class="guide-head">Check that it works offline (optional)</h3>
      <ol class="plain">
        <li>Turn on <strong>Airplane Mode</strong>.</li>
        <li>Close the app (swipe it away).</li>
        <li>Open it again from the Home Screen icon. Your lists should all be there.</li>
      </ol>
    </div>

    <div class="card guide">
      <h3 class="guide-head">Something not working?</h3>
      <dl class="faq">
        <dt>"Safari can't open the page… not connected to the internet"</dt>
        <dd>That's Safari, not the installed app. Open Gift List from its <strong>Home Screen icon</strong>.
          If the icon opens with Safari's address bar, it was added with <em>Open as Web App</em> off.
          Press and hold the icon, choose <strong>Remove</strong>, and repeat steps 2–6.</dd>
        <dt>My lists are missing in the installed app</dt>
        <dd>On iPhone, the Home Screen app keeps its own data, separate from Safari. Lists you made or opened in a
          Safari tab stay in Safari. Use <strong>Settings → Export backup</strong> in Safari, then
          <strong>Import backup</strong> in the installed app.</dd>
        <dt>"A new version is ready"</dt>
        <dd>Tap <strong>Update</strong> to get the latest version. Your lists are kept. If you're busy,
          tap <strong>Later</strong>; the app keeps working either way.</dd>
      </dl>
    </div>`;
}
