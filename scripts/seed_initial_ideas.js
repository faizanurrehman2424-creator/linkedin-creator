const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    value = value.trim().replace(/^['"]|['"]$/g, '');
    env[match[1]] = value;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const baseIdeas = [
  // Industry Trends
  {
    pillar: 'industry_trends',
    headline: 'The Shift from Resume Matching to Skill Inference',
    hook_options: [
      'Resumes are becoming obsolete faster than companies realize.',
      'Why the best candidates in 2026 never update their LinkedIn resumes.',
      '92% of hiring managers we polled admit keyword filters filtered out their top hire.'
    ],
    caption_body: 'Every quarter, talent teams spend thousands on applicant tracking systems designed to scan resumes for exact keyword matches.\n\nHere is the dilemma:\nTop performers rarely optimize for ATS algorithms. They optimize for impact.\n\nModern recruitment engines are shifting toward skill inference: evaluating past project trajectories, technical depth, and velocity rather than job titles.\n\nIf your team is still rejecting applicants because their title does not match an internal spec from 2021, you are missing out on the strongest candidates.\n\nWhat is your team doing to modernize candidate assessment this year?',
    hashtags: ['#HiringTrends', '#TalentStrategy', '#ExecutiveSearch', '#FutureOfWork'],
    notes: 'Image Prompt: A sleek modern minimal infographic showing talent intelligence network nodes connecting skills to opportunities, blue and slate grey tones, professional lighting.'
  },
  {
    pillar: 'industry_trends',
    headline: 'Remote Compensation Discrepancies in Global Tech',
    hook_options: [
      'The era of location-discounted salaries is closing in high-demand roles.',
      'Companies offering 40% less for remote talent are losing the talent war.',
      'Here is what happened when a tier-one enterprise normalized compensation across borders.'
    ],
    caption_body: 'Three years ago, geographic tiering was the gold standard in remote compensation.\n\nToday, elite software architects and AI practitioners command global market rates regardless of their zip code.\n\nWhen a candidate produces 5x leverage, their geographic coordinates are irrelevant to their business value.\n\nOrganizations that understand this are attracting the top 1% of distributed engineers worldwide.\n\nAre you seeing geographic compensation parity in your industry?',
    hashtags: ['#GlobalHiring', '#TechTalent', '#Compensation', '#DistributedTeams'],
    notes: 'Image Prompt: A high-contrast conceptual visual of a global network with glowing nodes across a minimalist world map, corporate aesthetic.'
  },
  {
    pillar: 'industry_trends',
    headline: 'Why Retaining Senior Engineers Requires Rethinking Management Tracks',
    hook_options: [
      'Forcing top technical contributors into people management is an expensive mistake.',
      'Your principal engineer does not want to run 1-on-1s. They want to architect systems.',
      'The technical fellow track is no longer optional for tech companies.'
    ],
    caption_body: 'The most common way tech organizations lose senior talent is by creating a promotion ceiling that requires becoming an engineering manager.\n\nManagement and architecture require entirely different neurological skill sets.\n\nA dual-track engineering organization ensures that high-impact individual contributors are compensated and recognized at the VP level without abandoning technical depth.\n\nDoes your company have a true parallel technical track?',
    hashtags: ['#EngineeringLeadership', '#TechTalent', '#Retention', '#CTO'],
    notes: 'Image Prompt: Architectural blueprint style visualization of a dual career track climbing upwards, professional clean geometry.'
  },
  {
    pillar: 'industry_trends',
    headline: 'The Rise of Asynchronous Technical Interviewing',
    hook_options: [
      'Whiteboard coding interviews evaluate test anxiety, not engineering capability.',
      'Why take-home audits are replacing four-hour panel interrogations.',
      'Candidates judge your engineering culture by how you interview them.'
    ],
    caption_body: 'Great engineers build in asynchronous environments with documentation, Git review, and thoughtful deliberation.\n\nTesting candidates under high-pressure live coding environments measures their performance theater, not their architectural judgment.\n\nForward-thinking companies are replacing whiteboard sessions with paid architectural reviews and asynchronous PR reviews.\n\nThe result: 3x higher offer acceptance rates and lower onboarding turnover.',
    hashtags: ['#TechRecruitment', '#EngineeringCulture', '#Interviewing', '#HiringProcess'],
    notes: 'Image Prompt: Clean modern desk setup with terminal code review screen, glass morphism UI elements, calm executive ambiance.'
  },
  {
    pillar: 'industry_trends',
    headline: 'Internal Mobility is the Overlooked Recruiting Pipeline',
    hook_options: [
      'Before spending $30k on external search, look at your existing team.',
      'Why the highest ROI candidate is already on your payroll.',
      'Employees leave when the path forward requires an external job offer.'
    ],
    caption_body: 'The highest cost in recruitment is not the search fee. It is the three-month ramp-up time for an external hire.\n\nInternal mobility programs that allow cross-department transitions retain institutional knowledge and boost team morale.\n\nWhen talent knows they can pivot careers within your organization, they do not look elsewhere.\n\nWhen was the last time you mapped internal talent to open requisitions?',
    hashtags: ['#InternalMobility', '#EmployeeRetention', '#TalentStrategy', '#Culture'],
    notes: 'Image Prompt: Abstract corporate art showing upward dynamic arrows merging into a unified pathway, premium navy and gold.'
  },

  // Recruiter Storytelling
  {
    pillar: 'recruiter_storytelling',
    headline: 'The Candidate Who Counter-Offered with Equity Only',
    hook_options: [
      'A candidate turned down our $220k base salary offer last month. Here is why.',
      'Confidence in high-stakes negotiations looks very different from arrogance.',
      'The best talent does not negotiate for security. They negotiate for upside.'
    ],
    caption_body: 'Last month, a staff engineer declined our base salary offer of $220,000.\n\nInstead, they proposed reducing their base to $120,000 in exchange for triple the equity grant.\n\nThey had studied our pipeline, understood our unit economics, and believed they could accelerate our ARR by 40%.\n\nThat conversation proved more about their commercial acumen than any interview question could have.\n\nWe accepted the counter-offer. In 60 days, they shipped two core integrations ahead of schedule.\n\nNever underestimate a candidate who bets on their own execution.',
    hashtags: ['#RecruiterStories', '#Negotiation', '#StartupEquity', '#TalentAcquisition'],
    notes: 'Image Prompt: A minimalist executive boardroom with subtle reflections, warm architectural lighting, professional cinematic style.'
  },
  {
    pillar: 'recruiter_storytelling',
    headline: 'What a 15-Minute Rejection Call Taught Me About Candidate Experience',
    hook_options: [
      'I called a finalist to deliver bad news. 6 months later, they referred our top client.',
      'How you reject candidates defines your employer brand more than how you hire them.',
      'Automated rejection emails are the single biggest brand leak in corporate recruiting.'
    ],
    caption_body: 'It is easy to be courteous to candidates you are hiring.\n\nThe real test of your organization is how you treat the finalist who came in second place.\n\nInstead of an automated template, I scheduled a 15-minute call to share specific feedback and express our appreciation.\n\nSix months later, that candidate introduced us to their former CTO, resulting in our largest enterprise partnership this year.\n\nCandidate respect is not just etiquette. It is long-term business strategy.',
    hashtags: ['#CandidateExperience', '#EmployerBrand', '#RecruiterLife', '#Professionalism'],
    notes: 'Image Prompt: Subtle clean telephone handset on a marble desk with warm daylight, minimalist workspace photography.'
  },
  {
    pillar: 'recruiter_storytelling',
    headline: 'The 58-Year-Old Engineer Who Outperformed Three Senior Teams',
    hook_options: [
      'Ageism in tech hiring is not just unethical; it is commercially foolish.',
      'We hired an engineer who had not touched a startup in 15 years.',
      'The fastest way to eliminate architectural debt is decades of battle scars.'
    ],
    caption_body: 'A hiring manager once expressed hesitation over a candidate whose resume started in 1989.\n\n"Will they move fast enough for our sprint cycle?"\n\nWe advocated for the interview. During the architecture deep dive, this engineer identified three race conditions in our distributed queue that had puzzled our team for weeks.\n\nExperience does not mean slow. It means knowing which mistakes not to make in the first place.\n\nValue judgment over novelty.',
    hashtags: ['#ExperienceMatters', '#TechHiring', '#DiversityInTech', '#EngineeringCulture'],
    notes: 'Image Prompt: An experienced engineer analyzing architectural schematics in a modern technology lab, warm ambient lighting.'
  },
  {
    pillar: 'recruiter_storytelling',
    headline: 'The Best Hire We Made Had a 2-Year Resume Gap',
    hook_options: [
      'Resume gaps are not red flags. They are life chapters.',
      'We almost rejected a VP of Product because of a two-year hiatus.',
      'Here is what we learned when we asked about the story behind the gap.'
    ],
    caption_body: 'A candidate had a 24-month blank space on their CV.\n\nMany automated screeners would have disqualified them immediately.\n\nWhen we spoke, they explained they had stepped away to care for a terminally ill family member while managing a community foundation.\n\nThe empathy, crisis leadership, and perspective they developed during that period made them the most resilient product leader in our company.\n\nLook beyond the chronological resume. Hire the human.',
    hashtags: ['#Leadership', '#HumanFirst', '#RecruitmentInsights', '#CareerGaps'],
    notes: 'Image Prompt: A single pen and an open notebook with elegant typography on clean oak table, morning sunlight.'
  },
  {
    pillar: 'recruiter_storytelling',
    headline: 'Why I Tell Candidates to Interview Their Interviewer',
    hook_options: [
      'An interview is a two-way audition, not a cross-examination.',
      'The question that tells you everything about a company in under two minutes.',
      'If an employer gets uncomfortable when you ask about runway, do not join.'
    ],
    caption_body: 'Whenever I prep senior candidates, I tell them:\n\nIf you do not ask difficult questions during your final round, you are gambling with your career.\n\nAsk about their biggest churn factor.\nAsk how decisions are made when the founders disagree.\nAsk why the previous person in this seat transitioned out.\n\nHealthy companies celebrate candidates who perform rigorous due diligence.',
    hashtags: ['#CareerStrategy', '#JobInterview', '#ExecutiveCareers', '#HiringTips'],
    notes: 'Image Prompt: Two business professionals in thoughtful dialogue across a modern clean table, glass windows background.'
  },

  // Educational Frameworks
  {
    pillar: 'educational_frameworks',
    headline: 'The 3-Tier Scorecard for Assessing Executive Culture Fit',
    hook_options: [
      'Culture fit is subjective nonsense unless you measure it with a framework.',
      'Here is the exact scorecard top recruitment agencies use for leadership hires.',
      'Stop asking candidates where they see themselves in 5 years. Use this instead.'
    ],
    caption_body: 'To evaluate senior leaders objectively, we break culture assessment into three measurable pillars:\n\n1. Decision Architecture\nHow do they make decisions when only 60% of the data is available? Look for clear heuristics over paralysis.\n\n2. Conflict Resolution\nDo they challenge ideas in public and commit in private? Evaluate constructive disagreement patterns.\n\n3. Talent Magnetism\nWill tier-one contributors follow them from their previous company? A leader without follow-through followers is an administrator.\n\nImplement this in your next executive search to remove gut-feeling bias.',
    hashtags: ['#ExecutiveLeadership', '#ScorecardMethod', '#HiringFramework', '#Management'],
    notes: 'Image Prompt: A high quality diagrammatic chart showing three interlocking pillars of leadership, modern clean corporate design.'
  },
  {
    pillar: 'educational_frameworks',
    headline: 'The 30-60-90 Day Framework for Technical Onboarding',
    hook_options: [
      '90% of early employee departures happen because of poor onboarding.',
      'Here is the blueprint to take senior engineers from zero to shipping in 30 days.',
      'Onboarding is not HR paperwork; it is time-to-first-commit acceleration.'
    ],
    caption_body: 'A structured onboarding framework for technical talent:\n\nDays 1-30: Understand\n- Ship a low-risk documentation or bug fix on Day 2.\n- Shadow customer support to witness user pain points firsthand.\n\nDays 31-60: Contribute\n- Own an isolated component or service release.\n- Lead team architecture review discussions.\n\nDays 61-90: Lead\n- Propose improvements to deployment or testing pipelines.\n- Mentor an onboarding peer.\n\nClarity in the first 90 days prevents 12 months of misalignment.',
    hashtags: ['#Onboarding', '#EngineeringManagement', '#TalentSuccess', '#TechLeadership'],
    notes: 'Image Prompt: Visual timeline roadmap with milestones at 30, 60, and 90 days, crisp navy and sky blue color scheme.'
  },
  {
    pillar: 'educational_frameworks',
    headline: 'The STAR Method Adapted for Executive Problem Solving',
    hook_options: [
      'Most candidates fail STAR questions because they spend 80% on Situation.',
      'The executive inversion of the classic STAR interview technique.',
      'How top leaders structure answers to demonstrate commercial leverage.'
    ],
    caption_body: 'Traditional STAR format:\nSituation (40%) -> Task (20%) -> Action (30%) -> Result (10%)\n\nThe Executive STAR inversion:\nResult First (30%) -> Action (50%) -> Situation & Context (20%)\n\nStart with the commercial outcome:\n"We reduced candidate drop-off by 44% and shortened search time from 52 to 21 days."\n\nThen detail the strategic actions you spearheaded.\n\nAudiences pay attention when they know the bottom line up front.',
    hashtags: ['#ExecutivePresence', '#InterviewFramework', '#Communication', '#LeadershipSkills'],
    notes: 'Image Prompt: Clean visual breakdown of the inverted STAR formula showing percentages and steps in sleek infographic style.'
  },
  {
    pillar: 'educational_frameworks',
    headline: 'The Talent Velocity Matrix: When to Buy, Build, or Borrow',
    hook_options: [
      'Not every open seat requires an expensive full-time search.',
      'The 3-question matrix every VP of Engineering should review before opening a headcount.',
      'How elite technology leaders optimize team cost per delivery.'
    ],
    caption_body: 'Before opening an expensive full-time requisition, run through the Talent Velocity Matrix:\n\n1. Build\nIs this a core long-term competency where internal training pays dividends over 2+ years? Invest in upskilling.\n\n2. Buy\nIs this specialized expertise where speed-to-market is critical and domain knowledge is non-negotiable? Go to external market for top talent.\n\n3. Borrow\nIs this a 3-month burst requirement for an initial proof of concept? Use specialized fractional talent or agencies.\n\nOptimize for capability velocity, not raw headcount.',
    hashtags: ['#WorkforcePlanning', '#TechStrategy', '#HeadcountOptimization', '#TalentLeadership'],
    notes: 'Image Prompt: A 2x2 matrix diagram illustrating Buy, Build, and Borrow strategic talent quadrants with clean typography.'
  },
  {
    pillar: 'educational_frameworks',
    headline: 'The Compensation Philosophy Document Every Scaling Team Needs',
    hook_options: [
      'Salary negotiation without a documented philosophy leads to pay disparity.',
      'How to eliminate subjective compensation debates across your engineering team.',
      'Transparency in compensation bands increases candidate closing rates by 35%.'
    ],
    caption_body: 'A healthy compensation philosophy answers three foundational questions:\n\n1. Market Percentile Targeting\nDo you pay at the 50th, 75th, or 90th percentile of your peer market? Decide upfront and stick to it.\n\n2. Equity vs Cash Weighting\nHow do you balance liquid compensation with long-term ownership incentives across seniority levels?\n\n3. Promotion & Review Cadence\nAre compensation adjustments tied to business milestones or fixed calendar cycles?\n\nWhen candidates know the rules are consistent, trust increases and negotiations simplify.',
    hashtags: ['#CompensationStrategy', '#Transparency', '#PeopleOps', '#ScalingTeams'],
    notes: 'Image Prompt: Minimalist document layout with key strategic headers and polished corporate formatting on desk.'
  }
];

async function seed() {
  const { data: profiles } = await supabase.from('profiles').select('id, email');
  if (!profiles || profiles.length === 0) {
    console.error('No profiles found');
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  for (const user of profiles) {
    // Check if ideas exist for this user
    const { data: existing } = await supabase.from('content_ideas').select('id').eq('user_id', user.id);
    if (existing && existing.length > 0) {
      console.log(`User ${user.email} already has ${existing.length} ideas.`);
      continue;
    }

    console.log(`Seeding 15 ideas for ${user.email} (${user.id})...`);
    const records = baseIdeas.map((idea, idx) => ({
      user_id: user.id,
      target_date: today,
      pillar: idea.pillar,
      headline: idea.headline,
      hook_options: idea.hook_options,
      selected_hook_index: 0,
      caption_body: idea.caption_body,
      hashtags: idea.hashtags,
      notes: idea.notes,
      status: 'fresh'
    }));

    const { data: inserted, error } = await supabase.from('content_ideas').insert(records).select();
    if (error) {
      console.error(`Error inserting ideas for ${user.email}:`, error);
    } else {
      console.log(`Successfully seeded ${inserted.length} ideas for ${user.email}`);
    }
  }
}

seed();
