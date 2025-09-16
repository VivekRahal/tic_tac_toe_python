<script setup>
const props = defineProps({
  analysis: {
    type: Object,
    default: null
  },
  defaultState: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <section class="panel panel--analysis card-3d" v-tilt aria-labelledby="analysis-title">
    <div class="panel__header">
      <h2 id="analysis-title">Narrative analysis</h2>
      <p>Condition ratings and recommended follow-up crafted in the language of RICS survey outputs.</p>
    </div>

    <div class="analysis-output" id="analysis-output" aria-live="polite">
      <template v-if="props.analysis">
        <div v-if="props.analysis.type === 'message'" class="analysis-output__empty">
          <h3>{{ props.analysis.title }}</h3>
          <p>{{ props.analysis.body }}</p>
        </div>
        <article v-else class="analysis-result">
          <header class="analysis-result__header">
            <div :class="['analysis-result__rating', `rating--${props.analysis.rating.level}`]">
              <span class="rating__label">{{ props.analysis.rating.label }}</span>
              <span class="rating__description">{{ props.analysis.rating.description }}</span>
            </div>
            <div class="analysis-result__meta">
              <div class="meta-block">
                <span class="meta-block__label">Confidence</span>
                <span class="meta-block__value">{{ props.analysis.confidence }}</span>
              </div>
              <div class="meta-block">
                <span class="meta-block__label">Inputs analysed</span>
                <span class="meta-block__value">{{ props.analysis.inputs }}</span>
              </div>
            </div>
          </header>

          <section class="analysis-result__question">
            <h3>Inspection note</h3>
            <p>{{ props.analysis.question || 'No description provided.' }}</p>
          </section>

          <section class="analysis-result__body">
            <article v-for="match in props.analysis.matches" :key="match.id" class="analysis-block">
              <span class="analysis-block__tag">{{ match.tag }}</span>
              <h3 class="analysis-block__title">{{ match.title }}</h3>
              <p class="analysis-block__summary">{{ match.summary }}</p>
              <div class="analysis-block__columns">
                <div>
                  <h4>Recommended actions</h4>
                  <ul class="analysis-block__list">
                    <li v-for="(action, index) in match.actions" :key="`action-${match.id}-${index}`">{{ action }}</li>
                  </ul>
                </div>
                <div>
                  <h4>Investigation focus</h4>
                  <ul class="analysis-block__list">
                    <li v-for="(investigation, index) in match.investigations" :key="`investigation-${match.id}-${index}`">
                      {{ investigation }}
                    </li>
                  </ul>
                </div>
              </div>
            </article>
          </section>

          <section class="analysis-result__references">
            <h4>RICS aligned references</h4>
            <ul>
              <li v-for="(reference, index) in props.analysis.references" :key="`reference-${index}`">{{ reference }}</li>
            </ul>
          </section>
        </article>
      </template>
      <template v-else>
        <div class="analysis-output__empty">
          <h3>{{ props.defaultState.title }}</h3>
          <p>{{ props.defaultState.message }}</p>
          <ul>
            <li v-for="(item, index) in props.defaultState.bullets" :key="`bullet-${index}`">{{ item }}</li>
          </ul>
        </div>
      </template>
    </div>
  </section>
</template>
