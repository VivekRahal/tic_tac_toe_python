<script setup>
import { ref } from 'vue'

const emit = defineEmits(['generate', 'reset'])

const question = ref('')
const imagePreview = ref(null)
const hasImage = ref(false)
const fileInput = ref(null)

const handleImageChange = (event) => {
  const file = event.target.files?.[0]

  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      imagePreview.value = loadEvent.target?.result ?? null
      hasImage.value = Boolean(imagePreview.value)
    }
    reader.readAsDataURL(file)
  } else {
    imagePreview.value = null
    hasImage.value = false
  }
}

const handleSubmit = () => {
  emit('generate', {
    question: question.value,
    hasImage: hasImage.value
  })
}

const handleReset = () => {
  question.value = ''
  imagePreview.value = null
  hasImage.value = false

  if (fileInput.value) {
    fileInput.value.value = ''
  }

  emit('reset')
}
</script>

<template>
  <section class="panel panel--input card-3d" v-tilt aria-labelledby="survey-form-title">
    <div class="panel__header">
      <h2 id="survey-form-title">Capture your inspection insight</h2>
      <p>
        Combine imagery with structured commentary so the analysis can mirror the phrasing and prioritisation used in professional
        RICS reporting.
      </p>
    </div>
    <form @submit.prevent="handleSubmit" novalidate>
      <label class="field" for="image-input">
        <span class="field__label">Property image</span>
        <span class="field__hint">Supported formats: JPG, PNG. Clear daylight elevation shots work best.</span>
        <input ref="fileInput" type="file" id="image-input" accept="image/*" @change="handleImageChange" />
      </label>
      <div class="image-preview" id="image-preview" aria-live="polite">
        <template v-if="imagePreview">
          <img :src="imagePreview" alt="Selected property photograph" />
        </template>
        <span v-else class="image-preview__placeholder">
          Your chosen image will be previewed here with subtle lighting.
        </span>
      </div>

      <label class="field" for="question-input">
        <span class="field__label">What should we investigate?</span>
        <span class="field__hint">Describe observed defects, context, and any limitations on inspection.</span>
        <textarea
          id="question-input"
          v-model="question"
          rows="5"
          placeholder="Example: Cracking noted above the bay window at the front elevation."
        ></textarea>
      </label>
      
      <div class="form-actions">
        <button type="submit" class="btn-primary">Generate RICS-style narrative</button>
        <button type="button" class="btn-secondary" id="reset-button" @click="handleReset">Reset</button>
      </div>
    </form>
  </section>
</template>
