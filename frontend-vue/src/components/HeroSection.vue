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
          <img
            class="visual-card__photo"
            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1200&auto=format&fit=crop"
            alt="Modern UK residential house exterior"
            decoding="async"
            loading="lazy"
          />
        </div>
        <p class="visual-card__caption">Real property imagery for clearer context</p>
      </div>
    </div>
  </header>
</template>
