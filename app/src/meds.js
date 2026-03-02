// meds.js — Medication/supplement typeahead search
// Curated list with brand + generic aliases for autocomplete

const MEDICATIONS = [
  // Statins
  { name: 'Atorvastatin', aliases: ['Lipitor'] },
  { name: 'Rosuvastatin', aliases: ['Crestor'] },
  { name: 'Simvastatin', aliases: ['Zocor'] },
  { name: 'Pravastatin', aliases: ['Pravachol'] },
  { name: 'Pitavastatin', aliases: ['Livalo'] },
  // Blood pressure
  { name: 'Lisinopril', aliases: ['Zestril', 'Prinivil'] },
  { name: 'Losartan', aliases: ['Cozaar'] },
  { name: 'Amlodipine', aliases: ['Norvasc'] },
  { name: 'Metoprolol', aliases: ['Lopressor', 'Toprol'] },
  { name: 'Hydrochlorothiazide', aliases: ['HCTZ', 'Microzide'] },
  { name: 'Valsartan', aliases: ['Diovan'] },
  { name: 'Olmesartan', aliases: ['Benicar'] },
  { name: 'Ramipril', aliases: ['Altace'] },
  { name: 'Enalapril', aliases: ['Vasotec'] },
  { name: 'Carvedilol', aliases: ['Coreg'] },
  { name: 'Propranolol', aliases: ['Inderal'] },
  // Diabetes / metabolic
  { name: 'Metformin', aliases: ['Glucophage'] },
  { name: 'Tirzepatide', aliases: ['Mounjaro', 'Zepbound'] },
  { name: 'Semaglutide', aliases: ['Ozempic', 'Wegovy', 'Rybelsus'] },
  { name: 'Liraglutide', aliases: ['Victoza', 'Saxenda'] },
  { name: 'Empagliflozin', aliases: ['Jardiance'] },
  { name: 'Dapagliflozin', aliases: ['Farxiga'] },
  { name: 'Glipizide', aliases: ['Glucotrol'] },
  { name: 'Pioglitazone', aliases: ['Actos'] },
  { name: 'Insulin Glargine', aliases: ['Lantus', 'Basaglar'] },
  { name: 'Berberine', aliases: [] },
  // Thyroid
  { name: 'Levothyroxine', aliases: ['Synthroid', 'Levoxyl', 'Tirosint'] },
  { name: 'Liothyronine', aliases: ['Cytomel', 'T3'] },
  { name: 'Armour Thyroid', aliases: ['Desiccated thyroid', 'NP Thyroid'] },
  // Heart / blood thinners
  { name: 'Aspirin', aliases: ['Baby aspirin', 'ASA'] },
  { name: 'Clopidogrel', aliases: ['Plavix'] },
  { name: 'Warfarin', aliases: ['Coumadin'] },
  { name: 'Apixaban', aliases: ['Eliquis'] },
  { name: 'Rivaroxaban', aliases: ['Xarelto'] },
  // Cholesterol (non-statin)
  { name: 'Ezetimibe', aliases: ['Zetia'] },
  { name: 'PCSK9 inhibitor', aliases: ['Repatha', 'Praluent', 'Evolocumab', 'Alirocumab'] },
  { name: 'Icosapent ethyl', aliases: ['Vascepa'] },
  { name: 'Bempedoic acid', aliases: ['Nexletol'] },
  // Mental health
  { name: 'Sertraline', aliases: ['Zoloft'] },
  { name: 'Escitalopram', aliases: ['Lexapro'] },
  { name: 'Fluoxetine', aliases: ['Prozac'] },
  { name: 'Bupropion', aliases: ['Wellbutrin'] },
  { name: 'Venlafaxine', aliases: ['Effexor'] },
  { name: 'Duloxetine', aliases: ['Cymbalta'] },
  { name: 'Trazodone', aliases: ['Desyrel'] },
  { name: 'Buspirone', aliases: ['Buspar'] },
  { name: 'Alprazolam', aliases: ['Xanax'] },
  // Sleep
  { name: 'Melatonin', aliases: [] },
  { name: 'Zolpidem', aliases: ['Ambien'] },
  { name: 'Gabapentin', aliases: ['Neurontin'] },
  // Pain / anti-inflammatory
  { name: 'Ibuprofen', aliases: ['Advil', 'Motrin'] },
  { name: 'Naproxen', aliases: ['Aleve'] },
  { name: 'Acetaminophen', aliases: ['Tylenol'] },
  { name: 'Celecoxib', aliases: ['Celebrex'] },
  // Acid reflux
  { name: 'Omeprazole', aliases: ['Prilosec'] },
  { name: 'Pantoprazole', aliases: ['Protonix'] },
  { name: 'Famotidine', aliases: ['Pepcid'] },
  // Hair
  { name: 'Finasteride', aliases: ['Propecia', 'Proscar'] },
  { name: 'Minoxidil', aliases: ['Rogaine'] },
  { name: 'Dutasteride', aliases: ['Avodart'] },
  // Hormones / TRT
  { name: 'Testosterone', aliases: ['TRT', 'Testosterone Cypionate', 'Testosterone Enanthate'] },
  { name: 'Estradiol', aliases: ['Estrogen'] },
  { name: 'Progesterone', aliases: [] },
  { name: 'DHEA', aliases: [] },
  { name: 'Anastrozole', aliases: ['Arimidex'] },
  { name: 'Enclomiphene', aliases: [] },
  // Peptides
  { name: 'BPC-157', aliases: [] },
  { name: 'TB-500', aliases: ['Thymosin Beta-4'] },
  { name: 'CJC-1295', aliases: [] },
  { name: 'Ipamorelin', aliases: [] },
  { name: 'GHK-Cu', aliases: [] },
  // Supplements — vitamins
  { name: 'Vitamin D3', aliases: ['Vitamin D', 'Cholecalciferol'] },
  { name: 'Vitamin K2', aliases: ['MK-7', 'Menaquinone'] },
  { name: 'Vitamin B12', aliases: ['Methylcobalamin', 'Cyanocobalamin'] },
  { name: 'Vitamin C', aliases: ['Ascorbic acid'] },
  { name: 'Vitamin A', aliases: ['Retinol'] },
  { name: 'Folate', aliases: ['Folic acid', 'Methylfolate', '5-MTHF'] },
  { name: 'Multivitamin', aliases: ['Multi'] },
  // Supplements — minerals
  { name: 'Magnesium', aliases: ['Mag glycinate', 'Magnesium glycinate', 'Mag threonate', 'Magnesium L-threonate'] },
  { name: 'Zinc', aliases: [] },
  { name: 'Iron', aliases: ['Ferrous sulfate'] },
  { name: 'Calcium', aliases: [] },
  { name: 'Potassium', aliases: [] },
  { name: 'Selenium', aliases: [] },
  { name: 'Iodine', aliases: [] },
  { name: 'Boron', aliases: [] },
  // Supplements — performance / health
  { name: 'Creatine', aliases: ['Creatine monohydrate'] },
  { name: 'Fish Oil', aliases: ['Omega-3', 'EPA/DHA', 'Omega 3'] },
  { name: 'CoQ10', aliases: ['Coenzyme Q10', 'Ubiquinol'] },
  { name: 'NAC', aliases: ['N-Acetyl Cysteine'] },
  { name: 'Alpha Lipoic Acid', aliases: ['ALA'] },
  { name: 'Ashwagandha', aliases: ['KSM-66'] },
  { name: 'Curcumin', aliases: ['Turmeric'] },
  { name: 'Probiotics', aliases: ['Probiotic'] },
  { name: 'Psyllium husk', aliases: ['Metamucil', 'Fiber'] },
  { name: 'Collagen', aliases: ['Collagen peptides'] },
  { name: 'Whey protein', aliases: ['Protein powder', 'Whey'] },
  { name: 'L-Theanine', aliases: ['Theanine'] },
  { name: 'Tongkat Ali', aliases: ['Longjack'] },
  { name: 'Taurine', aliases: [] },
  { name: 'Glycine', aliases: [] },
  { name: 'Quercetin', aliases: [] },
  { name: 'Resveratrol', aliases: [] },
  { name: 'NMN', aliases: ['Nicotinamide mononucleotide'] },
  { name: 'NR', aliases: ['Nicotinamide riboside', 'Tru Niagen'] },
  { name: 'Spirulina', aliases: [] },
  { name: 'Chlorella', aliases: [] },
  { name: 'Saw Palmetto', aliases: [] },
  { name: 'Electrolytes', aliases: ['LMNT', 'Liquid IV'] },
  // Allergy
  { name: 'Cetirizine', aliases: ['Zyrtec'] },
  { name: 'Loratadine', aliases: ['Claritin'] },
  { name: 'Montelukast', aliases: ['Singulair'] },
  // Other common Rx
  { name: 'Adderall', aliases: ['Amphetamine', 'Mixed amphetamine salts'] },
  { name: 'Modafinil', aliases: ['Provigil'] },
  { name: 'Sildenafil', aliases: ['Viagra'] },
  { name: 'Tadalafil', aliases: ['Cialis'] },
];

let selectedMeds = [];
let highlightedIndex = -1;

export function initMedSearch() {
  const input = document.getElementById('med-search');
  const dropdown = document.getElementById('med-dropdown');
  const tagsEl = document.getElementById('med-tags');
  if (!input || !dropdown) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) {
      dropdown.classList.remove('open');
      dropdown.innerHTML = '';
      highlightedIndex = -1;
      return;
    }

    const matches = MEDICATIONS.filter(m => {
      if (selectedMeds.includes(m.name)) return false;
      if (m.name.toLowerCase().includes(q)) return true;
      return m.aliases.some(a => a.toLowerCase().includes(q));
    }).slice(0, 8);

    if (matches.length === 0) {
      dropdown.classList.remove('open');
      dropdown.innerHTML = '';
      highlightedIndex = -1;
      return;
    }

    highlightedIndex = 0;
    dropdown.innerHTML = matches.map((m, i) => {
      const aliasStr = m.aliases.length > 0 ? `<span class="med-alias">(${m.aliases[0]})</span>` : '';
      return `<div class="med-option${i === 0 ? ' highlighted' : ''}" data-name="${m.name}">${m.name} ${aliasStr}</div>`;
    }).join('');
    dropdown.classList.add('open');

    dropdown.querySelectorAll('.med-option').forEach(opt => {
      opt.addEventListener('mousedown', (e) => {
        e.preventDefault();
        addMedByName(opt.dataset.name);
        input.value = '';
        dropdown.classList.remove('open');
        dropdown.innerHTML = '';
        input.focus();
      });
    });
  });

  input.addEventListener('keydown', (e) => {
    const options = dropdown.querySelectorAll('.med-option');
    if (!options.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, options.length - 1);
      updateHighlight(options);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, 0);
      updateHighlight(options);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < options.length) {
        addMedByName(options[highlightedIndex].dataset.name);
        input.value = '';
        dropdown.classList.remove('open');
        dropdown.innerHTML = '';
      }
    } else if (e.key === 'Escape') {
      dropdown.classList.remove('open');
      dropdown.innerHTML = '';
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      dropdown.classList.remove('open');
      dropdown.innerHTML = '';
    }, 150);
  });
}

function updateHighlight(options) {
  options.forEach((o, i) => o.classList.toggle('highlighted', i === highlightedIndex));
}

export function addMedByName(name) {
  if (selectedMeds.includes(name)) return;
  selectedMeds.push(name);
  renderTags();
}

function removeMed(name) {
  selectedMeds = selectedMeds.filter(m => m !== name);
  renderTags();
}

function renderTags() {
  const tagsEl = document.getElementById('med-tags');
  if (!tagsEl) return;
  tagsEl.innerHTML = selectedMeds.map(m =>
    `<span class="med-tag">${m}<span class="med-tag-remove" onclick="removeMedTag('${m.replace(/'/g, "\\'")}')">&times;</span></span>`
  ).join('');
}

export function resetMeds() {
  selectedMeds = [];
  renderTags();
}

export function getSelectedMeds() {
  return [...selectedMeds];
}

// Exposed for onclick in rendered HTML
export function removeMedTag(name) {
  removeMed(name);
}
