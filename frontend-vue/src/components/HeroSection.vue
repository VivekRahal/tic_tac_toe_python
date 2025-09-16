<template>
  <header class="hero">
    <div class="hero__content card-3d" v-tilt>
      <span class="badge">RICS Aligned Insights</span>
      <h1>UK House Survey Visual Advisor</h1>
      <p>
        Upload a photograph from your site visit, describe the issue, and receive a narrative aligned with the
        <strong>RICS Home Survey Standard (2021)</strong>. The assistant highlights potential risks, recommended actions, and
        follow-up requirements for Chartered Surveyors.
      </p>
      <ul class="hero__list" role="list">
        <li>Visual-first capture with contextual notes.</li>
        <li>Automated narrative structured around RICS condition ratings.</li>
        <li>Surveyor-ready output for Level 2 &amp; Level 3 reports.</li>
      </ul>
    </div>

    <div class="hero__visual">
      <div class="visual-card card-3d" v-tilt>
        <div class="visual-card__inner">
          <svg class="visual-card__icon" viewBox="0 0 220 220" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#91f4ff"></stop>
                <stop offset="100%" stop-color="#4776E6"></stop>
              </linearGradient>
              <linearGradient id="gradientRoof" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffd97a"></stop>
                <stop offset="100%" stop-color="#ff7eb3"></stop>
              </linearGradient>
            </defs>
            <rect x="35" y="90" width="150" height="90" rx="18" fill="url(#gradient)" opacity="0.9"></rect>
            <rect x="80" y="120" width="60" height="60" rx="12" fill="#ffffff" opacity="0.75"></rect>
            <path d="M40 100 L110 40 L180 100" fill="url(#gradientRoof)" />
            <path d="M105 60 L105 25 L125 25 L125 78" fill="#ffefc5" opacity="0.9" />
            <circle cx="60" cy="140" r="16" fill="#ffffff" opacity="0.8"></circle>
            <circle cx="160" cy="140" r="16" fill="#ffffff" opacity="0.8"></circle>
            <path d="M35 180 L185 180" stroke="rgba(255,255,255,0.45)" stroke-width="6" stroke-linecap="round" />
          </svg>
          <div class="visual-card__glow"></div>
        </div>
        <p class="visual-card__caption">Immersive 3D property insight canvas</p>
      </div>
    </div>
  </header>
</template>
