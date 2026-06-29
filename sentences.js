const TENSES_DATA = {
  "Simple Present": {
    formula: "Subject + Verb (s/es)",
    explanation: "Used for habits, general truths, and regular actions.",
    example: "He walks to school every day."
  },
  "Present Continuous": {
    formula: "Subject + am/is/are + Verb-ing",
    explanation: "Used for actions happening right now or temporary situations.",
    example: "She is studying for her exam."
  },
  "Present Perfect": {
    formula: "Subject + has/have + Verb-3 (Past Participle)",
    explanation: "Used for actions that happened at an unspecified time or started in the past and continue to the present.",
    example: "I have visited Tokyo twice."
  },
  "Present Perfect Continuous": {
    formula: "Subject + has/have + been + Verb-ing",
    explanation: "Used to show that an action started in the past and has continued up to the present moment, emphasizing duration.",
    example: "They have been playing football for two hours."
  },
  "Simple Past": {
    formula: "Subject + Verb-2 (Past Tense)",
    explanation: "Used for completed actions that happened in the past.",
    example: "We bought a new car yesterday."
  },
  "Past Continuous": {
    formula: "Subject + was/were + Verb-ing",
    explanation: "Used to describe an action that was in progress at a specific time in the past.",
    example: "She was cooking dinner when the phone rang."
  },
  "Past Perfect": {
    formula: "Subject + had + Verb-3 (Past Participle)",
    explanation: "Used to show that one action was completed before another action in the past.",
    example: "The train had left when we arrived."
  },
  "Past Perfect Continuous": {
    formula: "Subject + had + been + Verb-ing",
    explanation: "Used to show that an action started in the past and continued up until another time in the past, emphasizing duration.",
    example: "He had been working at the company for ten years before it closed."
  },
  "Simple Future": {
    formula: "Subject + will + Verb-1 / am/is/are + going to + Verb-1",
    explanation: "Used for actions that will happen in the future, predictions, or promises.",
    example: "I will call you tonight."
  },
  "Future Continuous": {
    formula: "Subject + will + be + Verb-ing",
    explanation: "Used to describe an action that will be in progress at a specific time in the future.",
    example: "This time tomorrow, I will be flying to Bali."
  },
  "Future Perfect": {
    formula: "Subject + will + have + Verb-3 (Past Participle)",
    explanation: "Used to show that an action will be completed before a specific point in the future.",
    example: "By next month, she will have graduated from university."
  },
  "Future Perfect Continuous": {
    formula: "Subject + will + have + been + Verb-ing",
    explanation: "Used to show that an action will continue up to a certain point in the future and emphasizes its duration.",
    example: "By next year, I will have been living here for five years."
  }
};

const ESSAY_PROMPTS = [
  "Describe what you do every morning after you wake up.",
  "Write about what you are doing right now (besides this game).",
  "Describe a place you have visited that amazed you.",
  "Explain what you have been working on lately.",
  "Tell a short story about what you did last weekend.",
  "Describe what you were doing when a sudden event occurred (e.g., rain, power outage).",
  "Write about something you had finished before you went to sleep last night.",
  "Explain what you had been doing before your friend called you yesterday.",
  "Describe your plan or prediction for what you will do next year.",
  "Write about what you will be doing at 8 PM tomorrow evening.",
  "State what you will have achieved by the end of this year.",
  "Predict what you will have been doing for several hours by this time tomorrow.",
  "Talk about your favorite hobby and how often you do it.",
  "Write about a movie you are currently watching or a book you are reading.",
  "Describe an achievement you have accomplished recently.",
  "Talk about how long you have been learning English.",
  "Describe your first day at school or at your current job.",
  "Describe a memory where you were laughing with friends.",
  "What had you learned before you started coding?",
  "What had you been studying before you took a break today?",
  "Write about where you think you will travel next.",
  "What will you be eating for lunch or dinner tomorrow?",
  "How many books will you have read by the end of this year?",
  "How long will you have been practicing your skills by next week?"
];

// Export to window object for ease of use in vanilla ES
window.TENSES_DATA = TENSES_DATA;
window.ESSAY_PROMPTS = ESSAY_PROMPTS;
