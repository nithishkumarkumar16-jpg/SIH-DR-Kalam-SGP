/**
 * scholarships.js — Unified Verified Scholarship Scheme Repository
 * Ported from Project B & integrated with SGP Master Knowledge Base
 * Total Verified Schemes: 25 (15 Project B static + 9 Project B imported + 1 SGP differently-abled)
 */


// Curated, verified Central and State government scholarships across India
// Each scholarship contains verified official portal URLs, issuing ministries, and exact statutory eligibility criteria.
const importedScholarships = [
  // 1. ALL-INDIA / CENTRAL SCHEMES
  {
    id: "nsp-pm-yasasvi",
    name: "PM-YASASVI Post-Matric Scholarship for OBC, EBC & DNT",
    category: "BC",
    state: "All-India",
    district: "All",
    course: "All",
    gender: "All",
    incomeLimit: 250000,
    amount: "Tuition Fee waiver + Annual Maintenance up to ₹20,000",
    documents: ["Aadhaar Card", "Income Certificate (< ₹2.5 LPA)", "OBC/EBC/DNT Caste Certificate", "Bonafide Certificate", "Previous Year Marksheet"],
    overview: "Implemented by the Ministry of Social Justice and Empowerment, Government of India, PM Young Achievers Scholarship Award Scheme for Vibrant India (YASASVI) supports Other Backward Classes, Economically Backward Classes, and De-Notified Nomadic Tribes for post-matric higher education.",
    eligibilityText: "Student must belong to OBC, EBC, or DNT category. Annual family income must not exceed ₹2,50,000. Must be enrolled in a recognized post-matric course (Class 11 to Post-Graduation).",
    lastDate: "December 31, 2026",
    officialPortal: "https://scholarships.gov.in",
    issuingAuthority: "Ministry of Social Justice & Empowerment, Govt of India",
    officialSource: "PM-YASASVI Official Guidelines No. 11014/01/2021",
    applicationMode: "Online (NSP Portal)",
    faq: [
      {
        question: "Is selection based on entrance test or merit?",
        answer: "From 2024 onwards, states utilize Class 10/12 merit scores on the National Scholarship Portal directly."
      },
      {
        question: "Can private college students apply?",
        answer: "Yes, provided the institution is listed in the AISHE code directory on NSP."
      }
    ]
  },
  {
    id: "nsp-aicte-saksham",
    name: "AICTE Saksham Scholarship Scheme for Specially-Abled Students",
    category: "All",
    state: "All-India",
    district: "All",
    course: "Engineering",
    gender: "All",
    incomeLimit: 800000,
    requiresDisability: true,
    amount: "₹50,000 / year towards tuition and living expenses",
    documents: ["Disability Certificate (minimum 40%)", "AICTE College Admission Proof", "Income Certificate", "Aadhaar Card", "Class 10 & 12 Marksheets"],
    overview: "An initiative by AICTE (Ministry of Education) to provide encouragement and support to differently-abled children to pursue technical degree and diploma education across AICTE approved colleges in India.",
    eligibilityText: "Student must have a verified permanent disability of not less than 40%. Admitted to 1st year of Degree/Diploma course in an AICTE approved college. Family income below ₹8,00,000/year.",
    lastDate: "November 30, 2026",
    officialPortal: "https://www.aicte-india.org",
    issuingAuthority: "All India Council for Technical Education (AICTE)",
    officialSource: "AICTE Saksham Scheme Notification F.No. 1-104/AICTE/Saksham",
    applicationMode: "Online (NSP Portal)",
    faq: [
      {
        question: "Does this scholarship need renewal every year?",
        answer: "Yes, renewal requires passing the annual/semester exams without pending backlogs."
      }
    ]
  },
  {
    id: "nsp-minority-postmatric",
    name: "Post-Matric Scholarship Scheme for Minorities",
    category: "Minority",
    state: "All-India",
    district: "All",
    course: "All",
    gender: "All",
    incomeLimit: 200000,
    amount: "Admission & Tuition fee up to ₹10,000/year + Maintenance Allowance",
    documents: ["Minority Community Self-Declaration", "Income Certificate", "Aadhaar Card", "College Fee Receipt", "Mark Sheet (min 50%)"],
    overview: "Administered by the Ministry of Minority Affairs, GoI, to empower students from notified minority communities (Muslims, Christians, Sikhs, Buddhists, Jains, and Parsis) to pursue higher collegiate education.",
    eligibilityText: "Must belong to a notified minority community. Scored at least 50% marks in the previous final exam. Annual family income must not exceed ₹2,00,000.",
    lastDate: "November 15, 2026",
    officialPortal: "https://scholarships.gov.in",
    issuingAuthority: "Ministry of Minority Affairs, Govt of India",
    officialSource: "MoMA Post-Matric Guidelines 2025-26",
    applicationMode: "Online (NSP Portal)",
    faq: [
      {
        question: "Is 30% seats earmarked for girl students?",
        answer: "Yes, 30% of the overall scholarship quota is earmarked for girl students from minority communities."
      }
    ]
  },
  {
    id: "nsp-nmms-central",
    name: "National Means-cum-Merit Scholarship Scheme (NMMSS)",
    category: "All",
    state: "All-India",
    district: "All",
    course: "School",
    gender: "All",
    incomeLimit: 350000,
    amount: "₹12,000 / year (₹1,000 per month from Class 9 to 12)",
    documents: ["Class 7 Marksheet", "Income Certificate (≤ ₹3.5 LPA)", "Aadhaar Card linked Bank Account", "NMMSS Selection Examination Result"],
    overview: "Centrally sponsored by the Department of School Education and Literacy, Ministry of Education, to award scholarships to meritorious students of economically weaker sections to prevent dropouts at Class 8.",
    eligibilityText: "Students studying in government, local body, or government-aided schools. Min 55% marks in Class 7 (50% for SC/ST). Parental annual income limit under ₹3,50,000.",
    lastDate: "October 31, 2026",
    officialPortal: "https://scholarships.gov.in",
    issuingAuthority: "Department of School Education & Literacy, MoE, GoI",
    officialSource: "NMMSS Central Guidelines 2025",
    applicationMode: "Online (NSP Portal)",
    faq: [
      {
        question: "Can private school students apply for NMMSS?",
        answer: "No, students of Kendriya Vidyalayas, Jawahar Navodaya Vidyalayas, and private un-aided schools are not eligible."
      }
    ]
  },

  // 2. ANDHRA PRADESH
  {
    id: "ap-jvd-vidya-deevena",
    name: "Jagananna Vidya Deevena (RTF) - Andhra Pradesh",
    category: "All",
    state: "Andhra Pradesh",
    district: "All",
    course: "All",
    gender: "All",
    incomeLimit: 250000,
    amount: "100% Full Fee Reimbursement credited directly to Mother's account",
    documents: ["Rice Card / Income Certificate", "Aadhaar of Student & Mother", "Integrated Caste Certificate", "College Bonafide"],
    overview: "Implemented by the Government of Andhra Pradesh via the Jnanabhumi portal. Reimburses complete tuition fees for ITI, Polytechnic, Degree, Engineering, and Pharmacy students from low-income households.",
    eligibilityText: "Student must be a resident of Andhra Pradesh. Family total annual income below ₹2,50,000. Minimum 75% biometric attendance mandatory in college.",
    lastDate: "December 31, 2026",
    officialPortal: "https://jnanabhumi.ap.gov.in",
    issuingAuthority: "Social Welfare Department, Government of Andhra Pradesh",
    officialSource: "G.O. Ms. No. 115 Social Welfare (SW.EDN.2) Dept",
    applicationMode: "Online (Jnanabhumi Portal)",
    faq: [
      {
        question: "Is attendance tracked for fee reimbursement?",
        answer: "Yes, at least 75% biometric attendance is strictly required every quarter to trigger DBT fee release."
      }
    ]
  },

  // 3. TELANGANA
  {
    id: "ts-epass-postmatric",
    name: "Telangana ePASS Post-Matric Fee Reimbursement (RTF & MTF)",
    category: "All",
    state: "Telangana",
    district: "All",
    course: "All",
    gender: "All",
    incomeLimit: 200000,
    amount: "Full Tuition Fee Reimbursement + Monthly Maintenance Charges",
    documents: ["Telangana ePASS Registration", "Aadhaar Card", "MeeSeva Caste & Income Certificate", "SSC Hall Ticket & Intermediate Marksheet"],
    overview: "The Telangana Electronic Payment and Application System of Scholarships (ePASS) reimburses tuition fees (RTF) and maintenance fees (MTF) for SC, ST, BC, EBC, and Minority collegiate students.",
    eligibilityText: "Domicile of Telangana. Family annual income limit: ₹2,00,000 for SC/ST and ₹1,50,000 for BC/EBC in rural (₹2,00,000 in urban).",
    lastDate: "January 15, 2026",
    officialPortal: "https://telanganaepass.cgg.gov.in",
    issuingAuthority: "Welfare Departments, Government of Telangana",
    officialSource: "Telangana ePASS Welfare Rules & Regulations",
    applicationMode: "Online (ePASS Portal)",
    faq: [
      {
        question: "Can distance education students apply on ePASS?",
        answer: "No, only regular, full-time students in recognized universities and colleges qualify for fee reimbursement."
      }
    ]
  },

  // 4. KERALA
  {
    id: "kerala-dce-postmatric",
    name: "Kerala DCE Post-Matric Scholarship for Minorities & OBC",
    category: "Minority",
    state: "Kerala",
    district: "All",
    course: "All",
    gender: "All",
    incomeLimit: 250000,
    amount: "₹3,000 to ₹10,000 / year + Hosteller allowance",
    documents: ["Kerala Nativity Certificate", "Income Certificate from Village Officer", "Community Certificate", "Bank Account seeded with Aadhaar"],
    overview: "Administered by the Directorate of Collegiate Education (DCE), Government of Kerala, through the collegiate scholarship portal to support underprivileged undergraduate and postgraduate learners.",
    eligibilityText: "Must be a native of Kerala. Enrolled in recognized regular Arts, Science, Commerce or Professional courses. Family income ≤ ₹2,50,000.",
    lastDate: "December 10, 2026",
    officialPortal: "https://dcescholarship.kerala.gov.in",
    issuingAuthority: "Directorate of Collegiate Education, Govt of Kerala",
    officialSource: "Kerala DCE Scheme Notification 2025-26",
    applicationMode: "Online (DCE Portal)",
    faq: [
      {
        question: "Is there any minimum mark percentage for DCE scholarships?",
        answer: "Yes, applicants must have secured at least 50% marks in the qualifying examination."
      }
    ]
  },

  // 5. GUJARAT
  {
    id: "guj-digital-postmatric",
    name: "Digital Gujarat Post-Matric Scholarship for SC/ST/SEBC",
    category: "BC",
    state: "Gujarat",
    district: "All",
    course: "All",
    gender: "All",
    incomeLimit: 250000,
    amount: "Tuition Fee assistance + Equipment & Maintenance allowances",
    documents: ["Digital Gujarat Portal ID", "Income Certificate", "Caste Certificate", "Fee Receipt", "Aadhaar Card"],
    overview: "Offered by the Social Justice and Empowerment Department, Government of Gujarat, through the Digital Gujarat unified portal for post-matric students.",
    eligibilityText: "Gujarat permanent resident. Belong to SC, ST, SEBC, or EWS categories. Annual household income below ₹2,50,000.",
    lastDate: "December 20, 2026",
    officialPortal: "https://www.digitalgujarat.gov.in",
    issuingAuthority: "Social Justice & Empowerment Dept, Govt of Gujarat",
    officialSource: "Digital Gujarat Welfare Resolutions 2025",
    applicationMode: "Online (Digital Gujarat Portal)",
    faq: [
      {
        question: "Is biometric KYC required on Digital Gujarat?",
        answer: "Yes, Aadhaar authentication via OTP or biometric device is mandatory during portal submission."
      }
    ]
  },

  // 6. DELHI
  {
    id: "delhi-edistrict-higher-edu",
    name: "Delhi Merit-cum-Means Financial Assistance for Higher Education",
    category: "General",
    state: "Delhi",
    district: "All",
    course: "All",
    gender: "All",
    incomeLimit: 600000,
    amount: "50% to 100% Fee Waiver (up to ₹1,00,000 / year)",
    documents: ["Delhi Ration Card (NFSA) / Income Certificate", "Aadhaar Card", "Admission Fee Receipt", "12th Mark Sheet with min 60%"],
    overview: "Implemented by the Higher Education Department, GNCTD, to support meritorious Delhi students from low and middle-income families pursuing degree programs in state universities (IPU, DTU, NSUT, AUD, DSEU).",
    eligibilityText: "Student must have completed schooling in Delhi. Enrolled in Delhi state universities. 100% waiver if family has NFSA card; 50% waiver if family income is ₹2.5 LPA - ₹6.0 LPA.",
    lastDate: "November 30, 2026",
    officialPortal: "https://edistrict.delhigovt.nic.in",
    issuingAuthority: "Department of Higher Education, Govt of NCT of Delhi",
    officialSource: "GNCTD Higher Education Trust Notification 2025",
    applicationMode: "Online (e-District Delhi)",
    faq: [
      {
        question: "Are private university students in Delhi eligible?",
        answer: "No, this scheme strictly covers Delhi State Universities established by the Legislative Assembly."
      }
    ]
  }
];



const staticScholarships = [
  // -------------------------------------------------------------
  // 1. TAMIL NADU STATE SCHEMES (Flagship Welfare Programs)
  // -------------------------------------------------------------
  {
    id: "tn-post-matric-bc-mbc",
    name: "Tamil Nadu Post-Matric Scholarship for BC / MBC / DNC Students",
    category: "BC",
    state: "Tamil Nadu",
    district: "All",
    course: "All",
    gender: "All",
    incomeLimit: 250000,
    quota: "govt-only",
    requiresGovtQuota: true,
    amount: "Full Tuition Fee Waiver + Special Fees + Maintenance Allowance",
    documents: [
      "Community Certificate (BC/MBC/DNC from Tahsildar)",
      "Income Certificate (Current Year, parental income ≤ ₹2.5 LPA)",
      "Aadhaar Card",
      "College Admission Allotment Order / Bonafide",
      "Bank Passbook seeded with Aadhaar"
    ],
    overview: "Administered by the Backward Classes, Most Backward Classes and Minorities Welfare Department, Government of Tamil Nadu. Covers full tuition and non-refundable fees for post-matriculation collegiate studies in government, aided, and self-financing institutions under government quota.",
    eligibilityText: "Must belong to BC, MBC, or DNC communities of Tamil Nadu. Parental annual income must not exceed ₹2,50,000. Must be enrolled in a recognized degree, diploma, or professional course.",
    lastDate: "December 31, 2026",
    officialPortal: "https://bcmbcmw.tn.gov.in",
    issuingAuthority: "BC, MBC & Minorities Welfare Department, Govt of Tamil Nadu",
    officialSource: "G.O. Ms. No. 92, Backward Classes Welfare Department",
    applicationMode: "Institutional / UMIS Portal",
    faq: [
      {
        question: "Is this scholarship applied through college or online individually?",
        answer: "Applications are processed through the college scholarship nodal officer via the Tamil Nadu UMIS (University Management Information System) portal."
      },
      {
        question: "Are self-financing college students under government quota eligible?",
        answer: "Yes, students admitted through single-window counseling under government quota in self-financing institutions are fully eligible."
      }
    ]
  },
  {
    id: "tn-post-matric-sc-st",
    name: "Tamil Nadu SC / ST / SCC Post-Matric Scholarship Scheme",
    category: "SC",
    state: "Tamil Nadu",
    district: "All",
    course: "All",
    gender: "All",
    incomeLimit: 250000,
    amount: "Full Tuition Fee Waiver + Exam Fees + Maintenance up to ₹1,200/month",
    documents: [
      "SC/ST/SCC Community Certificate",
      "Parental Income Certificate (≤ ₹2.5 Lakh)",
      "Aadhaar Card copy",
      "Bonafide Student Certificate",
      "Bank Account Linked with Aadhaar (DBT active)"
    ],
    overview: "Operated by the Adi Dravidar and Tribal Welfare Department, Government of Tamil Nadu. Provides 100% compulsory fee reimbursement and monthly living stipend to Scheduled Caste, Scheduled Tribe, and Scheduled Caste Converted Christians (SCC) pursuing higher education.",
    eligibilityText: "Must belong to SC, ST, or SCC community with Tamil Nadu domicile. Annual family income must be under ₹2,50,000. Pursuing post-matric courses (Arts, Science, Engineering, Medical, Polytechnic).",
    lastDate: "December 31, 2026",
    officialPortal: "https://tnscholarships.gov.in",
    issuingAuthority: "Adi Dravidar and Tribal Welfare Department, Govt of Tamil Nadu",
    officialSource: "G.O. (Ms) No. 92 Adi Dravidar and Tribal Welfare (ADW-3) Dept",
    applicationMode: "Online (TN Scholarships Portal) & College Nodal Verification",
    faq: [
      {
        question: "Does it cover hostel fees?",
        answer: "Yes, hostellers receive higher maintenance allowances and hostel fee subsidies approved by the department."
      },
      {
        question: "Can SCC (Converted Christians) apply?",
        answer: "Yes, Scheduled Caste Converted Christians are entitled under the state budget allocation."
      }
    ]
  },
  {
    id: "tn-first-graduate",
    name: "Tamil Nadu First Graduate Tuition Fee Concession",
    category: "General",
    state: "Tamil Nadu",
    district: "All",
    course: "Engineering",
    gender: "All",
    incomeLimit: 99999999, // No income ceiling
    requiresFirstGraduate: true,
    amount: "Tuition Fee Waiver (₹25,000/year for Engineering, up to ₹50,000/year for Medical)",
    documents: [
      "First Graduate Certificate issued by Tahsildar / e-Sevai",
      "Joint Declaration Form signed by Parents & Student",
      "Community Certificate",
      "Single-Window Allotment Order (TNEA / TN Medical Counseling)",
      "Transfer Certificate"
    ],
    overview: "A flagship higher education initiative of the Government of Tamil Nadu. To encourage families with no college graduates to pursue professional careers, the state bears the entire tuition fee for the first graduate in the family.",
    eligibilityText: "No family income ceiling! Neither parents nor elder siblings must have graduated from any college. Must be admitted to professional courses (Engineering, MBBS, Agriculture, Law) through Single Window Government Counseling.",
    lastDate: "Ongoing / Counseling Admission Window",
    officialPortal: "https://tnscholarships.gov.in",
    issuingAuthority: "Directorate of Technical Education (DOTE) / Higher Education Dept, TN",
    officialSource: "G.O. Ms. No. 85, Higher Education (J2) Department",
    applicationMode: "Single-Window Counseling Allotment & College Verification",
    faq: [
      {
        question: "Is there any family income limit for First Graduate?",
        answer: "No! There is absolutely no income limit. Any family where no person has completed graduation qualifies."
      },
      {
        question: "Can management quota students receive this waiver?",
        answer: "No, candidates must be admitted through Single Window Counseling (such as TNEA for Engineering or TN Medical Counseling)."
      }
    ]
  },
  {
    id: "tn-pudhumaipenn",
    name: "Moovalur Ramamirtham Ammaiyar Pudhumaipenn Scheme (Higher Education Assurance)",
    category: "All",
    state: "Tamil Nadu",
    district: "All",
    course: "All",
    gender: "Girls",
    incomeLimit: 99999999, // No income limit
    requiresGovtSchool: true,
    amount: "₹1,000 / month (₹12,000/year credited directly via DBT until course completion)",
    documents: [
      "Government School Study Bonafide (Class 6th to 12th in TN Govt Schools)",
      "Student Aadhaar Card",
      "Active Bank Account Passbook (Aadhaar linked)",
      "College Admission Bonafide / ID Card",
      "EMIS School Number Verification"
    ],
    overview: "A pioneering scheme by the Social Welfare and Women Empowerment Department, Government of Tamil Nadu. Encourages female higher education enrollment and prevents early marriage by providing monthly financial aid to girl students who completed schooling in state government schools.",
    eligibilityText: "Strictly for girl students. Must have studied in Tamil Nadu Government schools continuously from Class 6 to Class 12. Must be enrolled in a recognized UG Degree, Polytechnic, or ITI course.",
    lastDate: "Open Monthly Enrollment via College",
    officialPortal: "https://www.pudhumaipenn.tn.gov.in",
    issuingAuthority: "Social Welfare & Women Empowerment Department, Govt of Tamil Nadu",
    officialSource: "G.O. Ms. No. 48 Social Welfare and Women Empowerment Department",
    applicationMode: "Online (Pudhumaipenn Portal through College Nodal Officer)",
    faq: [
      {
        question: "Can girl students in private engineering colleges receive Pudhumaipenn?",
        answer: "Yes! Regardless of whether your college is Government, Aided, or Private Self-Financing, as long as you studied Class 6 to 12 in a TN Government School, you will receive ₹1,000/month."
      },
      {
        question: "Can I receive this along with Post-Matric or First Graduate?",
        answer: "Yes! The Pudhumaipenn monthly allowance can be availed concurrently with tuition fee concessions."
      }
    ]
  },
  {
    id: "tn-tamil-pudhalvan",
    name: "Tamil Pudhalvan Scheme for Boy Students",
    category: "All",
    state: "Tamil Nadu",
    district: "All",
    course: "All",
    gender: "Boys",
    incomeLimit: 99999999, // No income ceiling
    requiresGovtSchool: true,
    amount: "₹1,000 / month (credited directly to student bank account)",
    documents: [
      "Government School Study Proof (Class 6 to 12 in Tamil Nadu Govt Schools)",
      "Student Aadhaar Card",
      "College Bonafide Certificate",
      "Bank Account Linked with Aadhaar (DBT active)"
    ],
    overview: "Launched by the Government of Tamil Nadu (2024-2026 budget) as the male counterpart to Pudhumaipenn. Supports young boys from government schools to pursue collegiate education and technical training without financial hurdles.",
    eligibilityText: "Strictly for boy students who studied Class 6 to 12 in Tamil Nadu Government Schools. Enrolled in higher education (Undergraduate, Diploma, or ITI courses).",
    lastDate: "Ongoing Institutional Registration",
    officialPortal: "https://www.tn.gov.in",
    issuingAuthority: "Higher Education Department, Government of Tamil Nadu",
    officialSource: "Tamil Nadu State Budget Policy Announcement 2024-25",
    applicationMode: "Institutional College Verification via UMIS",
    faq: [
      {
        question: "Are government-aided school students eligible?",
        answer: "Under the core mandate, students must have completed their education in pure Government schools (or Tamil medium aided schools as per latest amendment)."
      }
    ]
  },
  {
    id: "tn-govt-school-7-5-quota",
    name: "Tamil Nadu 7.5% Government School Quota Full Fee Concession",
    category: "All",
    state: "Tamil Nadu",
    district: "All",
    course: "Engineering",
    gender: "All",
    incomeLimit: 99999999, // No income ceiling
    requiresGovtSchool: true,
    amount: "100% Complete Fee Waiver: Tuition, Hostel, Mess, & Exam Fees Borne by State",
    documents: [
      "7.5% Government School Quota Counseling Allotment Order",
      "Class 6 to 12 Government School Study Certificate from DEO/CEO",
      "Aadhaar Card",
      "College Admission Slip"
    ],
    overview: "Under the historic 7.5% preferential reservation act for government school students, the Government of Tamil Nadu pays 100% of all educational expenses—including tuition fees, hostel room charges, mess fees, and university examination fees—directly to the college.",
    eligibilityText: "Must have secured admission in professional courses (Engineering, Medical, Agriculture, Veterinary, Law) under the 7.5% government school preferential quota through TNEA / TN Health counseling.",
    lastDate: "Counseling Admissions Phase",
    officialPortal: "https://tneaonline.org",
    issuingAuthority: "Higher Education & Health Departments, Govt of Tamil Nadu",
    officialSource: "Tamil Nadu Act No. 14 of 2021 & G.O. Ms. No. 167 Higher Education",
    applicationMode: "Direct Government Settlement upon Counseling Allotment",
    faq: [
      {
        question: "Do students have to pay hostel fees upfront?",
        answer: "No, colleges are strictly instructed not to collect any fees from 7.5% quota students. All dues are settled directly by the Tamil Nadu Government."
      }
    ]
  },
  {
    id: "tn-bc-mbc-free-education",
    name: "Tamil Nadu Free Education Scheme for BC / MBC / DNC 3-Year Degree & Polytechnic",
    category: "MBC",
    state: "Tamil Nadu",
    district: "All",
    course: "Arts",
    gender: "All",
    incomeLimit: 250000,
    amount: "Full Tuition Fee Exemption in Government & Aided Arts & Science Colleges",
    documents: [
      "Community Certificate (BC/MBC/DNC)",
      "Income Certificate (≤ ₹2.5 LPA)",
      "Marksheet of Higher Secondary (+2)",
      "College Bonafide"
    ],
    overview: "Implemented by the Directorate of Backward Classes and Most Backward Classes Welfare, Government of Tamil Nadu. Provides free collegiate education to BC, MBC, and DNC students pursuing general degree programs (B.A., B.Sc., B.Com.) and 3-year polytechnic diplomas.",
    eligibilityText: "Must belong to BC, MBC, or DNC communities in Tamil Nadu. Enrolled in 3-year Arts/Science undergraduate degree or polytechnic diploma. Family income under ₹2,50,000.",
    lastDate: "December 31, 2026",
    officialPortal: "https://bcmbcmw.tn.gov.in",
    issuingAuthority: "Directorate of Backward Classes Welfare, Government of Tamil Nadu",
    officialSource: "Citizen Charter, BC & MBC Welfare Dept",
    applicationMode: "College Nodal Submission",
    faq: [
      {
        question: "Does it apply to Science courses like B.Sc. Computer Science?",
        answer: "Yes, it applies across standard Arts, Science, and Commerce undergraduate disciplines."
      }
    ]
  },
  {
    id: "tn-salem-farmers",
    name: "Agricultural Laborers Children Special Educational Grant (Salem & Rural TN)",
    category: "All",
    state: "Tamil Nadu",
    district: "Salem",
    course: "All",
    gender: "All",
    incomeLimit: 150000,
    requiresAgriLabor: true,
    amount: "₹5,000 to ₹15,000 / year + Books and Skill Development Allowance",
    documents: [
      "Parent's Registered Agricultural Laborer Welfare Board Identity Card",
      "Tahsildar Income Certificate (≤ ₹1.5 LPA)",
      "Bonafide Student Certificate",
      "Aadhaar Card of Parent and Student",
      "Bank Account Passbook"
    ],
    overview: "Operated by the Tamil Nadu Agricultural Workers Welfare Board. Supports children of registered landless agricultural laborers and marginal farmers in Salem and surrounding agricultural belts pursuing collegiate and polytechnic studies.",
    eligibilityText: "Parents must hold an active membership card with the Tamil Nadu Agricultural Workers Welfare Board. Domiciled in Salem or adjacent rural blocks. Family income under ₹1,50,000.",
    lastDate: "December 15, 2026",
    officialPortal: "https://www.tn.gov.in/department/18",
    issuingAuthority: "Tamil Nadu Agricultural Workers Welfare Board & District Welfare Office Salem",
    officialSource: "Tamil Nadu Manual Workers Social Security Act",
    applicationMode: "District Labor Welfare Office Salem & e-Sevai Centers",
    faq: [
      {
        question: "Where can students in Salem submit their documents?",
        answer: "Applications can be submitted at the Salem District Collectorate Complex (Labor Welfare Wing) or through designated rural e-Sevai centers."
      }
    ]
  },

  // -------------------------------------------------------------
  // 2. NATIONAL / CENTRAL SCHEMES (NSP)
  // -------------------------------------------------------------
  {
    id: "nsp-central-sector",
    name: "Central Sector Scheme of Scholarship for College and University Students",
    category: "General",
    state: "All-India",
    district: "All",
    course: "All",
    gender: "All",
    incomeLimit: 450000,
    amount: "₹12,000 / year for Graduation (Years 1-3) & ₹20,000 / year for Post-Graduation",
    documents: [
      "Class XII Marksheet (>80th percentile)",
      "Income Certificate (≤ ₹4.5 LPA)",
      "Aadhaar Card Linked Bank Account (Active DBT)",
      "College Bonafide Student Certificate",
      "Institute AISHE Code Verification"
    ],
    overview: "Sponsored by the Department of Higher Education, Ministry of Education, Government of India. Awarded to meritorious students who scored above the 80th percentile in the Class 12 board examination to pursue regular undergraduate and postgraduate collegiate studies.",
    eligibilityText: "Must have scored above the 80th percentile of successful candidates in Class 12 from relevant State or Central board. Annual parental income must not exceed ₹4,50,000. Pursuing regular full-time degree course.",
    lastDate: "December 31, 2026",
    officialPortal: "https://scholarships.gov.in",
    issuingAuthority: "Department of Higher Education, Ministry of Education, Govt of India",
    officialSource: "Central Sector Scheme Official Guidelines 2025-26",
    applicationMode: "Online (National Scholarship Portal - scholarships.gov.in)",
    faq: [
      {
        question: "Can diploma or correspondence students apply?",
        answer: "No, this scheme is strictly for regular full-time degree and professional college courses."
      },
      {
        question: "What is the renewal criterion?",
        answer: "Students must maintain at least 50% marks in annual/semester examinations and minimum 75% attendance to renew on NSP."
      }
    ]
  },
  {
    id: "nsp-aicte-pragati",
    name: "AICTE Pragati Scholarship for Girl Students",
    category: "General",
    state: "All-India",
    district: "All",
    course: "Engineering",
    gender: "Girls",
    incomeLimit: 800000,
    amount: "₹50,000 / year (towards tuition, computer, books, and living expenses)",
    documents: [
      "AICTE Approved College Admission Letter",
      "Class 10 and 12 Marksheets",
      "Parental Income Certificate (≤ ₹8.0 LPA)",
      "Aadhaar Card",
      "Tuition Fee Receipt"
    ],
    overview: "Implemented by the All India Council for Technical Education (AICTE), Ministry of Education, GoI. Empowers meritorious girl students admitted to 1st year degree or diploma engineering programs in AICTE-approved institutions across India.",
    eligibilityText: "Must be a girl student admitted to the 1st year of Degree/Diploma in any AICTE approved institution (or 2nd year via lateral entry). Maximum 2 girls per family. Family income must be under ₹8,00,000/year.",
    lastDate: "November 30, 2026",
    officialPortal: "https://www.aicte-india.org",
    issuingAuthority: "All India Council for Technical Education (AICTE)",
    officialSource: "AICTE Pragati Guidelines F.No. 1-104/AICTE/Pragati",
    applicationMode: "Online (National Scholarship Portal - scholarships.gov.in)",
    faq: [
      {
        question: "Can girls in Tamil Nadu colleges apply for Pragati?",
        answer: "Yes! Pragati is a nationwide central scheme. Any girl studying in an AICTE-approved college in Tamil Nadu or any Indian state is eligible."
      },
      {
        question: "What expenses does the ₹50,000 cover?",
        answer: "It is a consolidated grant that can be used for college tuition, hostel charges, books, or purchasing a laptop/equipment."
      }
    ]
  },

  // -------------------------------------------------------------
  // 3. OTHER KEY STATE SCHEMES (Verified State Portals)
  // -------------------------------------------------------------
  {
    id: "maha-postmatric-obc",
    name: "MahaDBT Post-Matric Scholarship for OBC Students",
    category: "BC",
    state: "Maharashtra",
    district: "All",
    course: "All",
    gender: "All",
    incomeLimit: 150000,
    amount: "50% to 100% Tuition Fee Reimbursement + Monthly Maintenance Allowance",
    documents: [
      "Aadhaar Card with Biometric e-KYC",
      "Caste Certificate issued by Maharashtra Competent Authority",
      "State Domicile Certificate",
      "Income Certificate (≤ ₹1.5 LPA)",
      "CAP Allotment Letter"
    ],
    overview: "Implemented by the Other Backward Bahujan Welfare Department, Government of Maharashtra, through the MahaDBT unified portal to provide fee reimbursement for OBC collegiate students.",
    eligibilityText: "Resident of Maharashtra state. Domicile proof required. Annual family income under ₹1,50,000. Admitted via centralized admission process (CAP).",
    lastDate: "January 31, 2026",
    officialPortal: "https://mahadbt.maharashtra.gov.in",
    issuingAuthority: "Other Backward Bahujan Welfare Dept, Govt of Maharashtra",
    officialSource: "MahaDBT Post-Matric Rules GR No. 2018080112",
    applicationMode: "Online (MahaDBT Portal)",
    faq: [
      {
        question: "Is biometric e-KYC mandatory on MahaDBT?",
        answer: "Yes, you must complete Aadhaar biometric or OTP e-KYC on the MahaDBT portal before submitting."
      }
    ]
  },
  {
    id: "kar-ssp-postmatric",
    name: "Karnataka State Scholarship Portal (SSP) Post-Matric SC/ST Scheme",
    category: "SC",
    state: "Karnataka",
    district: "All",
    course: "All",
    gender: "All",
    incomeLimit: 250000,
    amount: "100% Full Fee Waiver + Annual Maintenance Stipend",
    documents: [
      "Karnataka Kutumba Family ID",
      "RD Caste Certificate Number",
      "RD Income Certificate Number",
      "Aadhaar e-Consent Form",
      "College Fee Details Receipt"
    ],
    overview: "The Karnataka State Scholarship Portal (SSP) integrates student records with the state revenue Kutumba database to disburse complete tuition fee waivers to Scheduled Caste and Scheduled Tribe students.",
    eligibilityText: "Must belong to SC or ST communities of Karnataka. Verified Kutumba Family ID required. Family income below ₹2,50,000 per annum.",
    lastDate: "December 15, 2026",
    officialPortal: "https://ssp.postmatric.karnataka.gov.in",
    issuingAuthority: "Social Welfare Department, Government of Karnataka",
    officialSource: "Karnataka SSP Operational Guidelines 2025",
    applicationMode: "Online (SSP Portal)",
    faq: [
      {
        question: "What is Kutumba ID in Karnataka?",
        answer: "Kutumba is Karnataka's unified citizen database. The portal fetches your family details, caste, and income automatically using this ID."
      }
    ]
  },
  {
    id: "up-saksham-scholarship",
    name: "Uttar Pradesh Saksham Post-Matric Scholarship",
    category: "BC",
    state: "Uttar Pradesh",
    district: "All",
    course: "All",
    gender: "All",
    incomeLimit: 200000,
    amount: "Complete Fee Reimbursement + Boarding Allowance up to ₹10,000/year",
    documents: [
      "UP Revenue Caste & Income Certificates",
      "Aadhaar Authentication Copy",
      "Institute Registration Number",
      "Previous Passing Marksheet"
    ],
    overview: "Managed by the Social Welfare and Backward Classes Welfare Departments of Uttar Pradesh. Reimburses non-refundable college fees directly to the student's bank account via DBT.",
    eligibilityText: "Permanent resident of Uttar Pradesh. Family income under ₹2,00,000 for OBC/General and under ₹2,50,000 for SC/ST students.",
    lastDate: "November 10, 2026",
    officialPortal: "https://scholarship.up.gov.in",
    issuingAuthority: "Social Welfare Department, Government of Uttar Pradesh",
    officialSource: "UP Scholarship Manual 2025-26",
    applicationMode: "Online (UP Saksham Portal)",
    faq: [
      {
        question: "Can UP students studying outside UP apply?",
        answer: "Yes, under the 'Out of State' category on the UP Saksham scholarship portal."
      }
    ]
  },
  {
    id: "wb-oasis-scholarship",
    name: "West Bengal OASIS Post-Matric Scholarship for SC / ST / OBC",
    category: "ST",
    state: "West Bengal",
    district: "All",
    course: "All",
    gender: "All",
    incomeLimit: 250000,
    amount: "₹5,000 to ₹18,000 / year + Full Tuition Reimbursement",
    documents: [
      "OASIS Online Registration",
      "Caste Certificate issued by WB Competent Authority",
      "Income Certificate from BDO / SDO",
      "Aadhaar Linked Bank Account"
    ],
    overview: "Governed by the Backward Classes Welfare Department, Government of West Bengal, the Online Application for Scholarship in Studies (OASIS) platform provides direct financial aid to backward community students.",
    eligibilityText: "Permanent resident of West Bengal. Annual family income limit: ₹2,00,000 for OBC and ₹2,50,000 for SC/ST students.",
    lastDate: "January 20, 2026",
    officialPortal: "https://oasis.gov.in",
    issuingAuthority: "Backward Classes Welfare Department, Govt of West Bengal",
    officialSource: "OASIS Welfare Guidelines 2025",
    applicationMode: "Online (OASIS Portal)",
    faq: [
      {
        question: "Is physical verification required after online submission?",
        answer: "Yes, students must submit the printed OASIS form and documents to the BDO / Municipality office for verification."
      }
    ]
  },
  {
    id: "bihar-pms-obc-ebc",
    name: "Bihar Post-Matric Scholarship (PMS) for BC and EBC Students",
    category: "BC",
    state: "Bihar",
    district: "All",
    course: "All",
    gender: "All",
    incomeLimit: 300000,
    amount: "Tuition Fee Reimbursement + Monthly Maintenance Stipend",
    documents: [
      "BC/EBC Caste Certificate from Circle Officer",
      "Residential Certificate of Bihar",
      "Current Income Certificate (≤ ₹3.0 LPA)",
      "Fee Receipt & Bonafide"
    ],
    overview: "Managed by the Education Department, Government of Bihar, via the decentralized PMS Bihar portal (pmsonline.bih.nic.in) to speed up collegiate fee reimbursements.",
    eligibilityText: "Permanent resident of Bihar. Belonging to BC or EBC category. Family annual income must not exceed ₹3,00,000.",
    lastDate: "December 31, 2026",
    officialPortal: "https://pmsonline.bih.nic.in",
    issuingAuthority: "Education Department, Government of Bihar",
    officialSource: "Bihar PMS Guidelines No. 1284/2025",
    applicationMode: "Online (PMS Bihar Portal)",
    faq: [
      {
        question: "Is Bihar PMS different from the National Scholarship Portal?",
        answer: "Yes, Bihar runs its own specialized portal (pmsonline.bih.nic.in) to eliminate delays in DBT fee transfers."
      }
    ]
  }
];




export const additionalScholarships = [
  {
    id: "tn-differently-abled",
    name: "Scholarship for Differently Abled Students (TN)",
    category: "All",
    state: "Tamil Nadu",
    district: "All",
    course: "All",
    gender: "All",
    incomeLimit: 99999999,
    amount: "₹1,000 – ₹7,000/year + reader allowance",
    requiresDisability: true,
    documents: [
      "Disability certificate (minimum 40% from District Medical Board)",
      "Bonafide student certificate",
      "Income Certificate",
      "Aadhaar Card copy",
      "Bank passbook copy"
    ],
    overview: "Special state welfare initiative of Tamil Nadu providing education grants and reader allowances for students with permanent benchmark disabilities.",
    eligibilityText: "Minimum 40% certified disability. Enrolled in recognized schools, colleges, ITIs, or polytechnics in Tamil Nadu.",
    lastDate: "October 31, 2026",
    officialPortal: "https://umis.tn.gov.in",
    issuingAuthority: "TN Differently Abled Welfare Department",
    officialSource: "TN Welfare of Differently Abled Persons Guidelines",
    applicationMode: "Online (UMIS Portal)",
    faq: [
      {
        question: "What is the minimum disability percentage required?",
        answer: "A minimum of 40% disability certified by the District Medical Board is mandatory."
      }
    ]
  }
];

export const scholarships = [
  ...staticScholarships,
  ...importedScholarships,
  ...additionalScholarships
];
