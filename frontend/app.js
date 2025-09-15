const tiltElements = document.querySelectorAll('[data-tilt]');
const form = document.getElementById('survey-form');
const imageInput = document.getElementById('image-input');
const questionInput = document.getElementById('question-input');
const analysisOutput = document.getElementById('analysis-output');
const imagePreview = document.getElementById('image-preview');
const resetButton = document.getElementById('reset-button');

const imagePlaceholder = '<span class="image-preview__placeholder">Your chosen image will be previewed here with subtle lighting.</span>';

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
};

const guidanceLibrary = [
    {
        id: 'structural',
        keywords: ['crack', 'cracking', 'structural', 'movement', 'subsidence', 'settlement', 'heave', 'distortion', 'fracture'],
        rating: 'high',
        tag: 'Structure',
        title: 'Structural Movement & Cracking',
        summary: 'The description indicates cracking consistent with possible structural movement. RICS guidance requires this to be clearly flagged as a risk to the stability and value of the property.',
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
        summary: 'Reports of dampness require targeted advice on the likely source and recommended moisture management actions under the RICS standard.',
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
        summary: 'Roof defects can lead to rapid deterioration internally. Record condition and advise on targeted maintenance aligned with RICS reporting.',
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
        summary: 'Noted timber defects require commentary on structural adequacy and ongoing monitoring, especially within older UK housing stock.',
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
        summary: 'Service installations outside current standards must be clearly communicated with advice for specialist testing.',
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
        summary: 'General wear to joinery is usually Condition Rating 1 but must still be recorded with pragmatic maintenance advice.',
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
        summary: 'Possible ACMs must be highlighted with clear advice to avoid disturbance and seek specialist testing in line with UK regulations.',
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
        summary: 'Thermal upgrades must be balanced with ventilation to maintain healthy indoor environments as required by RICS commentary.',
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
];

const defaultReferences = [
    'RICS Home Survey Standard (2021) – ensure language reflects agreed condition ratings.',
    'RICS Global professional and ethical standards – always act with integrity and competence.'
];

function initialiseTilt() {
    tiltElements.forEach((element) => {
        element.addEventListener('mousemove', (event) => applyTilt(event, element));
        element.addEventListener('mouseenter', () => element.classList.add('is-active'));
        element.addEventListener('mouseleave', () => resetTilt(element));
    });
}

function applyTilt(event, element) {
    const bounds = element.getBoundingClientRect();
    const offsetX = event.clientX - bounds.left;
    const offsetY = event.clientY - bounds.top;
    const rotateY = ((offsetX / bounds.width) - 0.5) * 16;
    const rotateX = ((offsetY / bounds.height) - 0.5) * -16;

    element.style.setProperty('--rotate-x', `${rotateX.toFixed(2)}deg`);
    element.style.setProperty('--rotate-y', `${rotateY.toFixed(2)}deg`);
}

function resetTilt(element) {
    element.classList.remove('is-active');
    element.style.setProperty('--rotate-x', '0deg');
    element.style.setProperty('--rotate-y', '0deg');
}

function handleImageChange(event) {
    const file = event.target.files[0];

    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
            imagePreview.innerHTML = `<img src="${reader.result}" alt="Selected property photograph" />`;
        };
        reader.readAsDataURL(file);
    } else {
        imagePreview.innerHTML = imagePlaceholder;
    }
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
}

function determineOverallRating(matches) {
    if (!matches.length) {
        return 'moderate';
    }
    const ranking = { low: 1, moderate: 2, high: 3 };
    return matches.reduce((current, match) => {
        const currentScore = ranking[current];
        const matchScore = ranking[match.rating];
        return matchScore > currentScore ? match.rating : current;
    }, 'low');
}

function buildAnalysis(question, hasImage) {
    const normalised = question.toLowerCase();
    const matches = guidanceLibrary.filter((item) =>
        item.keywords.some((keyword) => normalised.includes(keyword))
    );

    if (!matches.length) {
        matches.push({
            id: 'general',
            rating: 'moderate',
            tag: 'General',
            title: 'General Condition Advice',
            summary: 'No specific high-risk keywords were identified. Provide balanced commentary and confirm any limitations that prevented a full inspection.',
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
        });
    }

    const overallRating = determineOverallRating(matches);
    const references = new Set(defaultReferences);
    matches.forEach((match) => {
        (match.references || []).forEach((ref) => references.add(ref));
    });

    const safeQuestion = escapeHtml(question);
    const confidenceMessage = hasImage
        ? 'Moderate to high – supporting imagery provided for context.'
        : 'Indicative only – narrative assessment provided without image verification.';

    const matchMarkup = matches
        .map((match) => {
            const actionsMarkup = (match.actions || [])
                .map((item) => `<li>${escapeHtml(item)}</li>`)
                .join('');
            const investigationsMarkup = (match.investigations || [])
                .map((item) => `<li>${escapeHtml(item)}</li>`)
                .join('');

            return `
                <article class="analysis-block">
                    <span class="analysis-block__tag">${escapeHtml(match.tag)}</span>
                    <h3 class="analysis-block__title">${escapeHtml(match.title)}</h3>
                    <p class="analysis-block__summary">${escapeHtml(match.summary)}</p>
                    <div class="analysis-block__columns">
                        <div>
                            <h4>Recommended actions</h4>
                            <ul class="analysis-block__list">${actionsMarkup}</ul>
                        </div>
                        <div>
                            <h4>Investigation focus</h4>
                            <ul class="analysis-block__list">${investigationsMarkup}</ul>
                        </div>
                    </div>
                </article>
            `;
        })
        .join('');

    const referencesMarkup = Array.from(references)
        .map((ref) => `<li>${escapeHtml(ref)}</li>`)
        .join('');

    return `
        <article class="analysis-result">
            <header class="analysis-result__header">
                <div class="analysis-result__rating rating--${overallRating}">
                    <span class="rating__label">${ratingInfo[overallRating].label}</span>
                    <span class="rating__description">${ratingInfo[overallRating].description}</span>
                </div>
                <div class="analysis-result__meta">
                    <div class="meta-block">
                        <span class="meta-block__label">Confidence</span>
                        <span class="meta-block__value">${escapeHtml(confidenceMessage)}</span>
                    </div>
                    <div class="meta-block">
                        <span class="meta-block__label">Inputs analysed</span>
                        <span class="meta-block__value">${hasImage ? 'Image &amp; narrative' : 'Narrative only'}</span>
                    </div>
                </div>
            </header>

            <section class="analysis-result__question">
                <h3>Inspection note</h3>
                <p>${safeQuestion || 'No description provided.'}</p>
            </section>

            <section class="analysis-result__body">
                ${matchMarkup}
            </section>

            <section class="analysis-result__references">
                <h4>RICS aligned references</h4>
                <ul>
                    ${referencesMarkup}
                </ul>
            </section>
        </article>
    `;
}

function handleFormSubmit(event) {
    event.preventDefault();
    const question = questionInput.value.trim();
    const hasImage = imageInput.files && imageInput.files.length > 0;

    if (!question) {
        analysisOutput.innerHTML = `
            <div class="analysis-output__empty">
                <h3>We need a short description</h3>
                <p>Please describe the issue observed so the narrative can align with the RICS reporting structure.</p>
            </div>
        `;
        return;
    }

    const analysisMarkup = buildAnalysis(question, hasImage);
    analysisOutput.innerHTML = analysisMarkup;
    analysisOutput.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetForm() {
    form.reset();
    imagePreview.innerHTML = imagePlaceholder;
    analysisOutput.innerHTML = `
        <div class="analysis-output__empty">
            <h3>Awaiting your inspection details</h3>
            <p>
                Submit an image and notes to generate a tailored commentary with indicative condition ratings, investigation advice,
                and client guidance.
            </p>
            <ul>
                <li>Uses key phrases from the RICS Home Survey Standard for consistent reporting.</li>
                <li>Highlights areas requiring urgent attention versus routine maintenance.</li>
                <li>Captures limitations so expectations are clearly managed.</li>
            </ul>
        </div>
    `;
}

initialiseTilt();
imageInput.addEventListener('change', handleImageChange);
form.addEventListener('submit', handleFormSubmit);
resetButton.addEventListener('click', resetForm);
