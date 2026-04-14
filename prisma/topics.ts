/**
 * 25 pre-made topic definitions.
 * Single source of truth — used by the seed script and optionally by the app.
 */
export type TopicDef = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string; // tailwind color hint (e.g. "emerald", "blue")
};

export const TOPICS: TopicDef[] = [
  { slug: "marketing",             name: "Marketing",             description: "Branding, growth strategies, consumer behavior, and digital marketing fundamentals.", icon: "\u{1F3AF}", color: "rose" },
  { slug: "psychology",            name: "Psychology",            description: "Cognitive biases, behavioral science, memory, and foundational psychological theories.", icon: "\u{1F9E0}", color: "purple" },
  { slug: "product-management",    name: "Product Management",    description: "Roadmaps, prioritization frameworks, user research, and product strategy.", icon: "\u{1F680}", color: "blue" },
  { slug: "economics",             name: "Economics",             description: "Micro and macroeconomics, market structures, fiscal policy, and trade.", icon: "\u{1F4C8}", color: "emerald" },
  { slug: "world-history",         name: "World History",         description: "Major civilizations, wars, revolutions, and turning points in human history.", icon: "\u{1F30D}", color: "amber" },
  { slug: "chemistry",             name: "Chemistry",             description: "Elements, reactions, organic chemistry, and atomic structure.", icon: "\u{1F9EA}", color: "teal" },
  { slug: "biology",               name: "Biology",               description: "Cell biology, genetics, evolution, ecosystems, and human anatomy.", icon: "\u{1F9EC}", color: "green" },
  { slug: "physics",               name: "Physics",               description: "Mechanics, thermodynamics, electromagnetism, and modern physics.", icon: "\u26A1",     color: "yellow" },
  { slug: "computer-science",      name: "Computer Science",      description: "Algorithms, data structures, networking, and systems design.", icon: "\u{1F4BB}", color: "slate" },
  { slug: "philosophy",            name: "Philosophy",            description: "Ethics, logic, metaphysics, and major philosophical movements.", icon: "\u{1F914}", color: "violet" },
  { slug: "nutrition-health",      name: "Nutrition & Health",    description: "Macronutrients, diet science, exercise physiology, and wellness.", icon: "\u{1F34E}", color: "lime" },
  { slug: "personal-finance",      name: "Personal Finance",      description: "Budgeting, investing, compound interest, and financial planning.", icon: "\u{1F4B0}", color: "emerald" },
  { slug: "sci-fi-literature",     name: "Sci-Fi Literature",     description: "Classic and modern science fiction — authors, themes, and iconic works.", icon: "\u{1F4DA}", color: "indigo" },
  { slug: "creative-writing",      name: "Creative Writing",      description: "Story structure, character development, prose style, and literary devices.", icon: "\u270D\uFE0F", color: "pink" },
  { slug: "data-science",          name: "Data Science",          description: "Statistics, machine learning, data visualization, and analytical thinking.", icon: "\u{1F4CA}", color: "cyan" },
  { slug: "leadership",            name: "Leadership",            description: "Management styles, team dynamics, decision-making, and influence.", icon: "\u2B50",     color: "amber" },
  { slug: "astronomy",             name: "Astronomy",             description: "Planets, stars, galaxies, cosmology, and space exploration.", icon: "\u{1F52D}", color: "sky" },
  { slug: "art-history",           name: "Art History",           description: "Movements, masterpieces, and the artists who shaped visual culture.", icon: "\u{1F3A8}", color: "orange" },
  { slug: "music-theory",          name: "Music Theory",          description: "Scales, harmony, rhythm, composition, and musical analysis.", icon: "\u{1F3B5}", color: "fuchsia" },
  { slug: "environmental-science", name: "Environmental Science", description: "Climate change, ecosystems, sustainability, and conservation.", icon: "\u{1F33F}", color: "green" },
  { slug: "statistics",            name: "Statistics",            description: "Probability, distributions, hypothesis testing, and regression.", icon: "\u{1F3B2}", color: "blue" },
  { slug: "ux-design",             name: "UX Design",             description: "Usability principles, wireframing, user research, and interaction patterns.", icon: "\u{1F58C}\uFE0F", color: "rose" },
  { slug: "ancient-civilizations", name: "Ancient Civilizations", description: "Egypt, Rome, Greece, Mesopotamia, and early human societies.", icon: "\u{1F3DB}\uFE0F", color: "stone" },
  { slug: "neuroscience",          name: "Neuroscience",          description: "Brain anatomy, neural pathways, cognition, and consciousness.", icon: "\u{1F52C}", color: "purple" },
  { slug: "public-speaking",       name: "Public Speaking",       description: "Rhetoric, persuasion, presentation skills, and overcoming stage fright.", icon: "\u{1F3A4}", color: "red" },
];
