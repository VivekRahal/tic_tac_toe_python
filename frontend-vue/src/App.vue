<script setup>
import { nextTick, ref } from 'vue'
import AnalysisPanel from './components/AnalysisPanel.vue'
import HeroSection from './components/HeroSection.vue'
import SurveyForm from './components/SurveyForm.vue'

const ratingInfo = {
  high: {
    label: 'Condition Rating 3',
    description: 'Serious or urgent defects. Immediate investigation and remedial work is advised.'
  },
  moderate: {
    label: 'Condition Rating 2',
    description: 'Defects requiring repair or replacement but not considered urgent.'
  },
  low: {
    label: 'Condition Rating 1',
    description: 'No immediate action beyond normal maintenance identified.'
  }
}

const guidanceLibrary = [
  {
    id: 'structural',
    keywords: ['crack', 'cracking', 'structural', 'movement', 'subsidence', 'settlement', 'heave', 'distortion', 'fracture'],
    rating: 'high',
    tag: 'Structure',
    title: 'Structural Movement & Cracking',
    summary:
      'The description indicates cracking consistent with possible structural movement. RICS guidance requires this to be clearly flagged as a risk to the stability and value of the property.',
    actions: [
      'Advise the client that a Condition Rating 3 is appropriate until the cause of movement is confirmed.',
      'Recommend intrusive investigation by a Chartered Structural Engineer to confirm the mechanism and necessary repairs.',
      'Inform the client that mortgage providers typically require engineer certification before lending decisions are finalised.'
    ],
    investigations: [
      'Check for stepped cracking, distortion to openings, and misaligned roof lines during the site visit.',
      'Review historic monitoring information or request installation of tell-tales to track progressive movement.',
      'Assess drainage and ground conditions nearby which can contribute to differential settlement.'
    ],
    references: [
      'RICS Home Survey Standard (2021) 4.2: Communicate risks that impact structural integrity.',
      'RICS professional guidance: Subsidence of low rise buildings, 2nd edition.'
    ]
  },
  {
    id: 'damp',
    keywords: ['damp', 'moisture', 'mould', 'mold', 'condensation', 'penetrating', 'water ingress', 'stain'],
    rating: 'moderate',
    tag: 'Moisture',
    title: 'Dampness & Moisture Ingress',
    summary:
      'Reports of dampness require targeted advice on the likely source and recommended moisture management actions under the RICS standard.',
    actions: [
      'Provide moisture meter readings at representative points and note any limitations to testing.',
      'Recommend repair of defective flashings, pointing, or rainwater goods contributing to ingress.',
      'Suggest improving ventilation and insulation balance to control condensation risk.'
    ],
    investigations: [
      'Identify whether the pattern of staining is consistent with rising, penetrating, or condensation damp.',
      'Check sub-floor ventilation and suspended timber condition where accessible.',
      'Seek specialist damp contractor input if active moisture is suspected beyond surface staining.'
    ],
    references: [
      'RICS Home Survey Standard (2021) 4.4: Explain causes of dampness and implications to the client.',
      'RICS guidance note: Investigation of moisture and its effects on traditional buildings (2016).'
    ]
  },
  {
    id: 'roof',
    keywords: ['roof', 'tile', 'slate', 'chimney', 'flashing', 'ridge', 'valley', 'soffit', 'gutter', 'guttering'],
    rating: 'moderate',
    tag: 'Roof Coverings',
    title: 'Roof Coverings & Rainwater Goods',
    summary:
      'Roof defects can lead to rapid deterioration internally. Record condition and advise on targeted maintenance aligned with RICS reporting.',
    actions: [
      'Advise the client where elements are beyond economical repair and require planned replacement.',
      'Recommend clearing and aligning rainwater goods to avoid overflow and damp penetration.',
      'Highlight access limitations and suggest aerial inspection if visibility was restricted.'
    ],
    investigations: [
      'Inspect roof slopes, ridges, and valleys for slipped or fractured coverings.',
      'Check flashings around chimneys and abutments for gaps or failure.',
      'Confirm condition of soffits and fascias, noting any timber decay or asbestos cement.'
    ],
    references: [
      'RICS Home Survey Standard (2021) 4.6: Comment on roof coverings and associated risks.',
      'RICS guidance note: Surveying safely, emphasising safe access to roof areas.'
    ]
  },
  {
    id: 'timber',
    keywords: ['timber', 'rot', 'decay', 'joist', 'floorboard', 'woodworm', 'fungal'],
    rating: 'moderate',
    tag: 'Timber',
    title: 'Timber Decay & Infestation',
    summary:
      'Noted timber defects require commentary on structural adequacy and ongoing monitoring, especially within older UK housing stock.',
    actions: [
      'Identify affected structural members and advise temporary support where bearing capacity is questioned.',
      'Recommend treatment or replacement of affected timbers by a Property Care Association accredited contractor.',
      'Highlight ventilation improvements to reduce the risk of further decay.'
    ],
    investigations: [
      'Probe accessible timbers to confirm softness or decay and document moisture levels.',
      'Assess whether damp proofing or ventilation issues are contributing factors.',
      'Review concealed areas such as subfloors or lofts subject to accessibility and safety.'
    ],
    references: [
      'RICS guidance note: Timber frame housing (3rd edition) inspection advice.',
      'RICS Home Survey Standard (2021) 4.3: Explain implications where structural timbers are affected.'
    ]
  },
  {
    id: 'services',
    keywords: ['electrical', 'wiring', 'consumer unit', 'fuse', 'boiler', 'heating', 'plumbing', 'gas', 'pipework', 'services'],
    rating: 'moderate',
    tag: 'Services',
    title: 'Building Services & Compliance',
    summary:
      'Service installations outside current standards must be clearly communicated with advice for specialist testing.',
    actions: [
      'Inform the client that condition ratings for services are limited without up-to-date test certificates.',
      'Recommend NICEIC electrical testing and Gas Safe inspection for gas appliances as appropriate.',
      'Advise routine servicing schedules and document any safety concerns observed.'
    ],
    investigations: [
      'Record the age and type of consumer unit, boiler, and associated controls.',
      'Note visible pipework corrosion, leaks, or uninsulated sections.',
      'Confirm functionality of smoke detectors and carbon monoxide alarms where present.'
    ],
    references: [
      'RICS Home Survey Standard (2021) Appendix B: Services reporting expectations.',
      'RICS guidance: Electrical inspection condition reporting for residential property.'
    ]
  },
  {
    id: 'windows',
    keywords: ['window', 'door', 'frame', 'glazing', 'sash', 'casement', 'draught'],
    rating: 'low',
    tag: 'Openings',
    title: 'Windows, Doors & Joinery',
    summary:
      'General wear to joinery is usually Condition Rating 1 but must still be recorded with pragmatic maintenance advice.',
    actions: [
      'Recommend easing, adjusting, or overhauling stiff window sashes and door leaves.',
      'Highlight where double glazing seals have failed and are due for replacement.',
      'Suggest redecorating exposed joinery to maintain weather protection.'
    ],
    investigations: [
      'Check operation of escape windows and document any failures.',
      'Inspect external paintwork and seals for cracking or gaps.',
      'Confirm safety glazing is present in critical locations under Building Regulations.'
    ],
    references: [
      'RICS Home Survey Standard (2021) 4.5: Cover windows, doors and joinery with condition ratings.',
      'RICS guidance note: Residential property inspection – a guide for chartered surveyors.'
    ]
  },
  {
    id: 'asbestos',
    keywords: ['asbestos', 'artex', 'acm', 'cement board', 'ceilings'],
    rating: 'high',
    tag: 'Hazardous Materials',
    title: 'Potential Asbestos Containing Materials',
    summary:
      'Possible ACMs must be highlighted with clear advice to avoid disturbance and seek specialist testing in line with UK regulations.',
    actions: [
      'Advise the client to commission an asbestos refurbishment and demolition survey before intrusive works.',
      'State that suspected ACMs should not be drilled, sanded, or removed by unqualified persons.',
      'Ensure compliance with the Control of Asbestos Regulations 2012 is highlighted in the report.'
    ],
    investigations: [
      'Record the exact locations, material types, and condition of suspected ACMs.',
      'Check for labelling or historic survey documentation within the property records.',
      'Recommend air monitoring or encapsulation where materials are friable or damaged.'
    ],
    references: [
      'RICS guidance note: Asbestos – guidance for surveyors and valuers.',
      'Control of Asbestos Regulations 2012 – HSE Approved Code of Practice.'
    ]
  },
  {
    id: 'insulation',
    keywords: ['insulation', 'ventilation', 'loft', 'roof space', 'airflow'],
    rating: 'low',
    tag: 'Thermal Comfort',
    title: 'Insulation & Ventilation Balance',
    summary:
      'Thermal upgrades must be balanced with ventilation to maintain healthy indoor environments as required by RICS commentary.',
    actions: [
      'Advise upgrading loft insulation to current standards where practical.',
      'Recommend maintaining cross ventilation in roof spaces to avoid condensation build-up.',
      'Discuss potential retrofit measures, referencing PAS 2035 for whole-house retrofit principles.'
    ],
    investigations: [
      'Inspect existing insulation thickness and continuity.',
      'Check ventilation openings are clear and not blocked by insulation.',
      'Note any signs of condensation or mould growth in roof voids.'
    ],
    references: [
      'RICS guidance note: Retrofitting to improve energy efficiency of historic buildings (2nd edition).',
      'PAS 2035:2019 – Retrofitting dwellings for improved energy efficiency.'
    ]
  }
]

const defaultReferences = [
  'RICS Home Survey Standard (2021) – ensure language reflects agreed condition ratings.',
  'RICS Global professional and ethical standards – always act with integrity and competence.'
]

const defaultState = {
  title: 'Awaiting your inspection details',
  message:
    'Submit an image and notes to generate a tailored commentary with indicative condition ratings, investigation advice, and client guidance.',
  bullets: [
    'Uses key phrases from the RICS Home Survey Standard for consistent reporting.',
    'Highlights areas requiring urgent attention versus routine maintenance.',
    'Captures limitations so expectations are clearly managed.'
  ]
}

const analysis = ref(null)
const analysisPanelRef = ref(null)

const determineOverallRating = (matches) => {
  if (!matches.length) {
    return 'moderate'
  }

  const ranking = { low: 1, moderate: 2, high: 3 }
  return matches.reduce((current, match) => {
    const currentScore = ranking[current]
    const matchScore = ranking[match.rating]
    return matchScore > currentScore ? match.rating : current
  }, 'low')
}

const buildMatches = (question) => {
  const normalised = question.toLowerCase()
  const matches = guidanceLibrary.filter((item) =>
    item.keywords.some((keyword) => normalised.includes(keyword))
  )

  if (!matches.length) {
    matches.push({
      id: 'general',
      rating: 'moderate',
      tag: 'General',
      title: 'General Condition Advice',
      summary:
        'No specific high-risk keywords were identified. Provide balanced commentary and confirm any limitations that prevented a full inspection.',
      actions: [
        'Clarify the inspection scope and any areas that were not accessible on the day.',
        'Advise routine maintenance and observation until the next scheduled survey.',
        'Encourage clients to share further photographs or concerns for targeted advice.'
      ],
      investigations: [
        'Discuss the client’s priorities to ensure advice aligns with their planned works.',
        'Review historic documentation, warranties, and previous reports for continuity.',
        'Consider whether a higher level (Level 3) survey is appropriate for complex properties.'
      ],
      references: [
        'RICS Home Survey Standard (2021) 3.5: Agree the level of service to suit client needs.',
        'RICS professional statement: Client care (2019 edition).'
      ]
    })
  }

  return matches.map((match) => ({
    id: match.id,
    rating: match.rating,
    tag: match.tag,
    title: match.title,
    summary: match.summary,
    actions: [...(match.actions || [])],
    investigations: [...(match.investigations || [])],
    references: [...(match.references || [])]
  }))
}

const buildAnalysis = (question, hasImage) => {
  const matches = buildMatches(question)
  const overallRating = determineOverallRating(matches)
  const references = new Set(defaultReferences)

  matches.forEach((match) => {
    match.references.forEach((reference) => references.add(reference))
  })

  return {
    type: 'result',
    rating: {
      level: overallRating,
      label: ratingInfo[overallRating].label,
      description: ratingInfo[overallRating].description
    },
    confidence: hasImage
      ? 'Moderate to high – supporting imagery provided for context.'
      : 'Indicative only – narrative assessment provided without image verification.',
    inputs: hasImage ? 'Image & narrative' : 'Narrative only',
    question,
    matches: matches.map((match) => ({
      id: match.id,
      tag: match.tag,
      title: match.title,
      summary: match.summary,
      actions: match.actions,
      investigations: match.investigations
    })),
    references: Array.from(references)
  }
}

const handleGenerate = ({ question, hasImage }) => {
  const trimmed = question.trim()

  if (!trimmed) {
    analysis.value = {
      type: 'message',
      title: 'We need a short description',
      body: 'Please describe the issue observed so the narrative can align with the RICS reporting structure.'
    }
  } else {
    analysis.value = buildAnalysis(trimmed, hasImage)
  }

  nextTick(() => {
    const panelComponent = analysisPanelRef.value
    const element = panelComponent?.$el ?? panelComponent
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

const handleReset = () => {
  analysis.value = null
}
</script>

<template>
  <div>
    <div class="background" aria-hidden="true">
      <span class="background__orb orb--one"></span>
      <span class="background__orb orb--two"></span>
      <span class="background__orb orb--three"></span>
    </div>

    <div class="app" role="application">
      <HeroSection />

      <main class="layout">
        <SurveyForm @generate="handleGenerate" @reset="handleReset" />
        <AnalysisPanel ref="analysisPanelRef" :analysis="analysis" :default-state="defaultState" />
      </main>

      <footer class="site-footer">
        <p>
          Built for UK residential surveyors. Always verify outcomes against your professional judgement and the latest RICS
          guidance before issuing client-facing material.
        </p>
      </footer>
    </div>
  </div>
</template>
