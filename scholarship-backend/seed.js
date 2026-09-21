const bcrypt = require("bcryptjs");
const { connectDB, mongoose } = require("./db");
const {
  User,
  College,
  Student,
  Scheme,
  SchemeRule,
  Application,
  DocumentVerification,
  EligibilityResult,
  Deficiency,
  StatusHistory,
  Payment,
  Notification,
  AuditLog,
} = require("./models");

async function seed(customUri) {
  try {
    await connectDB(customUri);
    console.log("Seeding database (non-destructive upsert)...");

    // 1. Seed Colleges
    const collegesData = [
      {
        collegeId: "COL-GCT-01",
        collegeName: "Government College of Technology (GCT)",
        institutionType: "Government Engineering College",
        address: "Thadagam Road, Coimbatore",
        district: "Coimbatore",
        state: "Tamil Nadu",
        contactEmail: "principal@gct.ac.in",
        contactPhone: "0422-2432221",
        status: "ACTIVE",
      },
      {
        collegeId: "COL-MIT-02",
        collegeName: "Madras Institute of Technology (MIT)",
        institutionType: "Autonomous University Campus",
        address: "Chromepet, Chennai",
        district: "Chennai",
        state: "Tamil Nadu",
        contactEmail: "dean@mitindia.edu",
        contactPhone: "044-22516002",
        status: "ACTIVE",
      },
      {
        collegeId: "COL-GAC-03",
        collegeName: "Government Arts College (Autonomous), Salem",
        institutionType: "Government Arts & Science",
        address: "Cherry Road, Salem",
        district: "Salem",
        state: "Tamil Nadu",
        contactEmail: "principal@gacsalem7.ac.in",
        contactPhone: "0427-2413273",
        status: "ACTIVE",
      },
      {
        collegeId: "COL-GCE-04",
        collegeName: "Government College of Engineering, Salem",
        institutionType: "Government Engineering College",
        address: "NH 44, Karuppur, Salem",
        district: "Salem",
        state: "Tamil Nadu",
        contactEmail: "principal@gcesalem.edu.in",
        contactPhone: "0427-2346157",
        status: "ACTIVE",
      },
    ];

    for (const c of collegesData) {
      await College.findOneAndUpdate({ collegeId: c.collegeId }, { $set: c }, { upsert: true });
    }
    console.log(`Colleges verified: ${collegesData.length}`);

    // 2. Seed Schemes
    const schemesData = [
      {
        schemeId: "SCHEME-NFST",
        schemeName: "National Fellowship and Scholarship for Higher Education of ST Students (NFST)",
        schemeType: "FELLOWSHIP",
        ministry: "Ministry of Tribal Affairs",
        description: "Merit-based fellowship and financial support for scheduled tribe students pursuing M.Phil and Ph.D. degrees in Indian institutions.",
        targetCategory: ["ST"],
        academicLevels: ["pg", "phd"],
        maxIncome: 600000,
        active: true,
        academicYear: "2026-2027",
      },
      {
        schemeId: "SCHEME-NOS",
        schemeName: "National Overseas Scholarship for Tribal Students (NOS)",
        schemeType: "FELLOWSHIP",
        ministry: "Ministry of Tribal Affairs",
        description: "Provides financial assistance to selected ST candidates pursuing Masters, Ph.D., and Post-Doctoral research abroad.",
        targetCategory: ["ST"],
        academicLevels: ["pg", "phd"],
        maxIncome: 800000,
        active: true,
        academicYear: "2026-2027",
      },
      {
        schemeId: "SCHEME-TOPCLASS",
        schemeName: "National Scholarship for Higher Education of ST Students (Top Class Education)",
        schemeType: "CENTRAL",
        ministry: "Ministry of Tribal Affairs",
        description: "Full tuition fee waiver, living expenses, books & computer allowance for ST students in notified top premier institutes (IITs, NITs, IIMs, AIIMS, etc.).",
        targetCategory: ["ST"],
        academicLevels: ["ug", "pg"],
        maxIncome: 600000,
        active: true,
        academicYear: "2026-2027",
      },
      {
        schemeId: "SCHEME-POSTMATRIC-ST",
        schemeName: "Post-Matric Scholarship for ST Students (PMS-ST)",
        schemeType: "CENTRAL",
        ministry: "Ministry of Tribal Affairs",
        description: "Comprehensive scholarship for scheduled tribe students studying at post-matriculation or post-secondary stages.",
        targetCategory: ["ST"],
        academicLevels: ["ug", "pg", "diploma", "iti"],
        maxIncome: 250000,
        active: true,
        academicYear: "2026-2027",
      },
      {
        schemeId: "SCHEME-PREMATRIC-ST",
        schemeName: "Pre-Matric Scholarship for ST Students (Class 9 & 10)",
        schemeType: "CENTRAL",
        ministry: "Ministry of Tribal Affairs",
        description: "Financial assistance to ST students in classes IX and X to minimize drop-out rates during transition from elementary to secondary education.",
        targetCategory: ["ST"],
        academicLevels: ["prematric"],
        maxIncome: 250000,
        active: true,
        academicYear: "2026-2027",
      },
      {
        schemeId: "SCHEME-CSSS",
        schemeName: "Central Sector Scheme of Scholarship for College and University Students (CSSS)",
        schemeType: "CENTRAL",
        ministry: "Department of Higher Education, Ministry of Education",
        description: "Merit-cum-means scholarship for top 20th percentile students scoring above 80% in Class 12 board examinations pursuing regular higher education.",
        targetCategory: ["ALL", "GEN", "OBC", "SC", "ST"],
        academicLevels: ["ug", "pg"],
        maxIncome: 450000,
        active: true,
        academicYear: "2026-2027",
      },
      {
        schemeId: "SCHEME-PRAGATI",
        schemeName: "AICTE Pragati Scholarship Scheme for Girl Students",
        schemeType: "AICTE",
        ministry: "Ministry of Education / AICTE",
        description: "₹50,000 per annum scholarship for girl students admitted to first year of Degree or Diploma level programs in AICTE approved institutions.",
        targetCategory: ["ALL"],
        academicLevels: ["ug", "diploma"],
        maxIncome: 800000,
        active: true,
        academicYear: "2026-2027",
      },
      {
        schemeId: "SCHEME-TNPMS-BC",
        schemeName: "Tamil Nadu Post-Matric Scholarship for BC / MBC / DNC Students",
        schemeType: "STATE",
        ministry: "BC, MBC & Minorities Welfare Department, Govt. of Tamil Nadu",
        description: "Tuition and examination fee concession plus maintenance allowance for BC, MBC, and DNC students pursuing higher education.",
        targetCategory: ["BC", "MBC", "DNC"],
        academicLevels: ["ug", "pg", "diploma"],
        maxIncome: 250000,
        active: true,
        academicYear: "2026-2027",
      },
      {
        schemeId: "SCHEME-TN-FIRSTGRAD",
        schemeName: "Tamil Nadu First Graduate Tuition Fee Concession",
        schemeType: "STATE",
        ministry: "Higher Education Department, Govt. of Tamil Nadu",
        description: "100% tuition fee waiver for students who are the first in their immediate family to pursue an undergraduate professional degree.",
        targetCategory: ["ALL"],
        academicLevels: ["ug"],
        maxIncome: 99999999, // No income ceiling
        active: true,
        academicYear: "2026-2027",
      },
    ];

    for (const s of schemesData) {
      await Scheme.findOneAndUpdate({ schemeId: s.schemeId }, { $set: s }, { upsert: true });

      // Create or update SchemeRule
      await SchemeRule.findOneAndUpdate(
        { schemeId: s.schemeId },
        {
          $set: {
            ruleVersion: "2026.1",
            eligibilityRules: {
              maxIncome: s.maxIncome,
              categories: s.targetCategory,
              academicLevels: s.academicLevels,
              genderRestriction: s.schemeId === "SCHEME-PRAGATI" ? "FEMALE_ONLY" : "ALL",
              minMarksPercentage: s.schemeId === "SCHEME-CSSS" ? 80 : 50,
            },
            requiredDocuments: ["ms10", "ms12", "community", "income"],
            deadlines: {
              applicationDeadline: new Date("2026-11-30"),
              collegeVerificationDeadline: new Date("2026-12-15"),
              ministryScrutinyDeadline: new Date("2026-12-31"),
            },
            budget: {
              allocatedBudget: s.schemeId === "SCHEME-NFST" ? 50000000 : 25000000,
              utilizedBudget: s.schemeId === "SCHEME-NFST" ? 14850000 : 7200000,
              financialYear: "2026-2027",
            },
            approvedBy: "Ministry Authority",
          },
        },
        { upsert: true }
      );
    }
    console.log(`Schemes & rules verified: ${schemesData.length}`);

    // 3. Seed Users & Demo Accounts
    const salt = await bcrypt.genSalt(10);
    const demoAccounts = [
      {
        userId: "USR-STU-1001",
        email: "student@sgp.gov.in",
        password: "Student@123",
        role: "STUDENT",
        collegeId: "COL-GCT-01",
        fullName: "Priya M",
        studentId: "STU-2026-001",
        category: "ST",
        course: "B.E. Computer Science and Engineering",
        department: "Computer Science",
        studyYear: "2nd Year",
        familyIncome: 180000,
        registerNumber: "710022104042",
      },
      {
        userId: "USR-STU-1002",
        email: "anand.student@sgp.gov.in",
        password: "Student@123",
        role: "STUDENT",
        collegeId: "COL-GCT-01",
        fullName: "Anand Kumar R",
        studentId: "STU-2026-002",
        category: "BC",
        course: "B.E. Mechanical Engineering",
        department: "Mechanical",
        studyYear: "3rd Year",
        familyIncome: 220000,
        registerNumber: "710021114018",
      },
      {
        userId: "USR-COL-2001",
        email: "college@sgp.gov.in",
        password: "College@123",
        role: "COLLEGE_ADMIN",
        collegeId: "COL-GCT-01",
      },
      {
        userId: "USR-COL-2002",
        email: "staff@sgp.gov.in",
        password: "Staff@123",
        role: "COLLEGE_STAFF",
        collegeId: "COL-GCT-01",
      },
      {
        userId: "USR-MIN-3001",
        email: "ministry@sgp.gov.in",
        password: "Ministry@123",
        role: "MINISTRY_ADMIN",
        collegeId: null,
      },
      {
        userId: "USR-MIN-3002",
        email: "reviewer@sgp.gov.in",
        password: "Reviewer@123",
        role: "MINISTRY_REVIEWER",
        collegeId: null,
      },
      {
        userId: "USR-MIN-3003",
        email: "approver@sgp.gov.in",
        password: "Approver@123",
        role: "MINISTRY_APPROVER",
        collegeId: null,
      },
    ];

    for (const acc of demoAccounts) {
      const passwordHash = await bcrypt.hash(acc.password, salt);
      await User.findOneAndUpdate(
        { email: acc.email },
        {
          $set: {
            userId: acc.userId,
            email: acc.email,
            passwordHash,
            role: acc.role,
            collegeId: acc.collegeId,
            accountStatus: "ACTIVE",
          },
        },
        { upsert: true }
      );

      // If student, upsert Student profile
      if (acc.role === "STUDENT") {
        await Student.findOneAndUpdate(
          { studentId: acc.studentId },
          {
            $set: {
              studentId: acc.studentId,
              userId: acc.userId,
              collegeId: acc.collegeId,
              fullName: acc.fullName,
              dateOfBirth: "2005-06-14",
              gender: acc.fullName.startsWith("Priya") ? "Female" : "Male",
              category: acc.category,
              state: "Tamil Nadu",
              district: "Coimbatore",
              course: acc.course,
              department: acc.department,
              studyYear: acc.studyYear,
              semester: acc.studyYear === "2nd Year" ? "4th Semester" : "6th Semester",
              registerNumber: acc.registerNumber,
              admissionYear: 2024,
              academicYear: "2026-2027",
              familyIncome: acc.familyIncome,
              firstGraduate: true,
              disabilityStatus: false,
              bankAccountType: "Single",
              bankSeededConfirmed: true,
            },
          },
          { upsert: true }
        );
      }
    }
    console.log(`Users & demo profiles verified: ${demoAccounts.length}`);

    // 4. Seed a Sample Application for the Student
    const sampleAppId = "APP-2026-0001";
    await Application.findOneAndUpdate(
      { applicationId: sampleAppId },
      {
        $set: {
          studentId: "STU-2026-001",
          collegeId: "COL-GCT-01",
          schemeId: "SCHEME-NFST",
          academicYear: "2026-2027",
          applicationYear: 2026,
          applicationStatus: "SUBMITTED",
          currentStage: "College Verification Stage",
          whoMustAct: "College Authority",
          nextAction: "College verification of student credentials and bonafide status",
          documentVerificationStatus: "VERIFIED",
          eligibilityStatus: "ELIGIBLE",
          externalApplicationId: "NSP-2026-TN-981240",
          externalPortalSource: "National Scholarship Portal (scholarships.gov.in)",
          externalStatus: "UNDER_VERIFICATION",
          externalEvidence: "Official application submitted on NSP portal; OTR confirmed.",
          externalLastChecked: new Date(),
          submittedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Document Verification Metadata (No raw files stored)
    const sampleDocs = [
      {
        verificationId: `VER-${sampleAppId}-ms10`,
        applicationId: sampleAppId,
        studentId: "STU-2026-001",
        documentType: "ms10",
        extractedFields: { name: "PRIYA M", dob: "14/06/2005", marksScored: 462, maxMarks: 500, percentage: "92.4%", board: "State Board of School Examinations, Tamil Nadu" },
        confidence: 94,
        verificationStatus: "VERIFIED",
        mismatch: false,
      },
      {
        verificationId: `VER-${sampleAppId}-ms12`,
        applicationId: sampleAppId,
        studentId: "STU-2026-001",
        documentType: "ms12",
        extractedFields: { name: "PRIYA M", dob: "14/06/2005", marksScored: 548, maxMarks: 600, percentage: "91.3%", stream: "Computer Science" },
        confidence: 92,
        verificationStatus: "VERIFIED",
        mismatch: false,
      },
      {
        verificationId: `VER-${sampleAppId}-community`,
        applicationId: sampleAppId,
        studentId: "STU-2026-001",
        documentType: "community",
        extractedFields: { name: "PRIYA M", community: "ST", communityCategory: "Malayali (Tribal)", certNumber: "TN-COM-2024-884102", district: "Salem" },
        confidence: 95,
        verificationStatus: "VERIFIED",
        mismatch: false,
      },
      {
        verificationId: `VER-${sampleAppId}-income`,
        applicationId: sampleAppId,
        studentId: "STU-2026-001",
        documentType: "income",
        extractedFields: { name: "PRIYA M", income: 180000, incomeWords: "One Lakh Eighty Thousand Only", certNumber: "TN-INC-2025-412093", issueDate: "12/08/2025" },
        confidence: 89,
        verificationStatus: "VERIFIED",
        mismatch: false,
      },
    ];

    for (const d of sampleDocs) {
      await DocumentVerification.findOneAndUpdate(
        { verificationId: d.verificationId },
        { $set: d },
        { upsert: true }
      );
    }

    // Eligibility Result
    await EligibilityResult.findOneAndUpdate(
      { resultId: `ELG-${sampleAppId}` },
      {
        $set: {
          applicationId: sampleAppId,
          studentId: "STU-2026-001",
          schemeId: "SCHEME-NFST",
          ruleVersion: "2026.1",
          evaluationResult: "ELIGIBLE",
          matchScore: 96,
          explanation: "Student satisfies ST category and annual income ceiling (₹1,80,000 ≤ ₹6,00,000).",
          criteriaBreakdown: {
            incomeCheck: "PASSED (₹1,80,000 <= ₹6,00,000)",
            categoryCheck: "PASSED (ST Category)",
            marksCheck: "PASSED (91.3% >= 50%)",
          },
        },
      },
      { upsert: true }
    );

    // Status History
    await StatusHistory.findOneAndUpdate(
      { historyId: `HIS-${sampleAppId}-1` },
      {
        $set: {
          applicationId: sampleAppId,
          previousStatus: "DRAFT",
          newStatus: "SUBMITTED",
          changedBy: "USR-STU-1001",
          changedByRole: "STUDENT",
          reason: "Initial student submission with verified document checklist",
          source: "SGP_PORTAL",
          timestamp: new Date(Date.now() - 3600000 * 24),
        },
      },
      { upsert: true }
    );

    // Initial Payment Record for Payment Tracking Demo
    await Payment.findOneAndUpdate(
      { paymentId: `PAY-${sampleAppId}-1` },
      {
        $set: {
          applicationId: sampleAppId,
          studentId: "STU-2026-001",
          collegeId: "COL-GCT-01",
          schemeId: "SCHEME-NFST",
          academicYear: "2026-2027",
          instalment: 1,
          component: "Tuition / Maintenance Fee DBT",
          sanctionedAmount: 54000,
          paidAmount: 0,
          paymentStatus: "PENDING",
          source: "MINISTRY_SANCTION",
          updatedBy: "USR-MIN-3001",
          checkedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // 5. Seed Advanced Analytics Cohort for SIH26239
    const oneDay = 86400 * 1000;
    const nowTime = Date.now();

    const cohortData = [
      {
        studentId: "STU-COH-001",
        fullName: "Kavitha S",
        collegeId: "COL-GCT-01",
        department: "Computer Science",
        course: "B.E. Computer Science",
        category: "ST",
        familyIncome: 190000,
        appId: "APP-COH-001",
        schemeId: "SCHEME-NFST",
        status: "SUBMITTED",
        daysAgoSubmitted: 2,
        assignedReviewerId: "USR-COL-2001",
        assignedReviewerName: "Dr. K. Arumugam",
      },
      {
        studentId: "STU-COH-002",
        fullName: "Manoj Kumar P",
        collegeId: "COL-GCT-01",
        department: "Mechanical",
        course: "B.E. Mechanical",
        category: "ST",
        familyIncome: 210000,
        appId: "APP-COH-002",
        schemeId: "SCHEME-NOS",
        status: "COLLEGE_REVIEW",
        daysAgoSubmitted: 3,
        assignedReviewerId: "USR-COL-2001",
        assignedReviewerName: "Dr. K. Arumugam",
      },
      {
        studentId: "STU-COH-003",
        fullName: "Deepa V",
        collegeId: "COL-GCT-01",
        department: "Electrical",
        course: "B.E. EEE",
        category: "ST",
        familyIncome: 160000,
        appId: "APP-COH-003",
        schemeId: "SCHEME-NFST",
        status: "COLLEGE_REVIEW",
        daysAgoSubmitted: 6,
        assignedReviewerId: "USR-COL-2001",
        assignedReviewerName: "Dr. K. Arumugam",
      },
      {
        studentId: "STU-COH-004",
        fullName: "Vignesh T",
        collegeId: "COL-GCT-01",
        department: "Civil",
        course: "B.E. Civil",
        category: "ST",
        familyIncome: 240000,
        appId: "APP-COH-004",
        schemeId: "SCHEME-NFST",
        status: "CORRECTION_REQUIRED",
        daysAgoSubmitted: 11,
        deficiencyType: "OCR_REVIEW",
        deficiencyDesc: "Community certificate issue date blurred, please re-upload clear scan",
        assignedReviewerId: "USR-COL-2001",
        assignedReviewerName: "Dr. K. Arumugam",
      },
      {
        studentId: "STU-COH-005",
        fullName: "Aarthi N",
        collegeId: "COL-GCT-01",
        department: "Computer Science",
        course: "B.E. Computer Science",
        category: "ST",
        familyIncome: 175000,
        appId: "APP-COH-005",
        schemeId: "SCHEME-NFST",
        status: "COLLEGE_REVIEW",
        daysAgoSubmitted: 19,
        assignedReviewerId: "USR-COL-2001",
        assignedReviewerName: "Dr. K. Arumugam",
      },
      {
        studentId: "STU-COH-006",
        fullName: "Suresh B",
        collegeId: "COL-GCT-01",
        department: "Computer Science",
        course: "B.E. Computer Science",
        category: "ST",
        familyIncome: 150000,
        appId: "APP-COH-006",
        schemeId: "SCHEME-NFST",
        status: "MINISTRY_SCRUTINY",
        daysAgoSubmitted: 25,
        daysAgoVerified: 21,
        assignedReviewerId: "USR-MIN-3001",
        assignedReviewerName: "Ministry Scrutiny Officer",
      },
      {
        studentId: "STU-COH-007",
        fullName: "Revathi M",
        collegeId: "COL-GCT-01",
        department: "Mechanical",
        course: "B.E. Mechanical",
        category: "ST",
        familyIncome: 180000,
        appId: "APP-COH-007",
        schemeId: "SCHEME-NFST",
        status: "SELECTED",
        daysAgoSubmitted: 30,
        daysAgoVerified: 26,
        daysAgoSelected: 20,
        assignedReviewerId: "USR-MIN-3001",
      },
      {
        studentId: "STU-COH-008",
        fullName: "Dinesh K",
        collegeId: "COL-GCT-01",
        department: "Civil",
        course: "B.E. Civil",
        category: "ST",
        familyIncome: 200000,
        appId: "APP-COH-008",
        schemeId: "SCHEME-NFST",
        status: "SANCTIONED",
        daysAgoSubmitted: 35,
        daysAgoVerified: 30,
        daysAgoSelected: 25,
        daysAgoSanctioned: 22,
        payment: {
          sanctionedAmount: 60000,
          paidAmount: 30000,
          isPartial: true,
          status: "CONFIRMED",
          recipientType: "DIRECT_STUDENT_DBT",
        },
      },
      {
        studentId: "STU-COH-009",
        fullName: "Bavani R",
        collegeId: "COL-GCT-01",
        department: "Electrical",
        course: "B.E. EEE",
        category: "ST",
        familyIncome: 140000,
        appId: "APP-COH-009",
        schemeId: "SCHEME-NFST",
        status: "PAID",
        daysAgoSubmitted: 45,
        daysAgoVerified: 40,
        daysAgoSelected: 32,
        daysAgoSanctioned: 28,
        daysAgoPaid: 20,
        payment: {
          sanctionedAmount: 75000,
          paidAmount: 75000,
          status: "CONFIRMED",
          recipientType: "DIRECT_STUDENT_DBT",
        },
      },
      {
        studentId: "STU-COH-010",
        fullName: "Gokul E",
        collegeId: "COL-GCT-01",
        department: "Computer Science",
        course: "B.E. Computer Science",
        category: "ST",
        familyIncome: 195000,
        appId: "APP-COH-010",
        schemeId: "SCHEME-NFST",
        status: "PAID",
        daysAgoSubmitted: 42,
        daysAgoVerified: 38,
        daysAgoSelected: 30,
        daysAgoSanctioned: 25,
        daysAgoPaid: 18,
        payment: {
          sanctionedAmount: 40000,
          paidAmount: 40000,
          status: "CONFIRMED",
          recipientType: "INSTITUTIONAL_FEE",
        },
      },
      {
        studentId: "STU-COH-011",
        fullName: "Nandhini G",
        collegeId: "COL-GCT-01",
        department: "Computer Science",
        course: "B.E. Computer Science",
        category: "ST",
        familyIncome: 215000,
        appId: "APP-COH-011",
        schemeId: "SCHEME-NFST",
        status: "SANCTIONED",
        daysAgoSubmitted: 40,
        daysAgoVerified: 36,
        daysAgoSelected: 28,
        payment: {
          sanctionedAmount: 50000,
          paidAmount: 50000,
          status: "REVERSED",
          reversalReason: "Bank beneficiary account dormant / closed",
          recipientType: "DIRECT_STUDENT_DBT",
        },
      },
      {
        studentId: "STU-COH-012",
        fullName: "Rajesh S",
        collegeId: "COL-GCT-01",
        department: "Mechanical",
        course: "B.E. Mechanical",
        category: "ST",
        familyIncome: 185000,
        appId: "APP-COH-012",
        schemeId: "SCHEME-NOS",
        status: "COLLEGE_REVIEW",
        daysAgoSubmitted: 7,
        possibleDuplicate: true,
        duplicateMatches: [
          {
            applicationId: "APP-COH-002",
            studentId: "STU-COH-002",
            matchReason: "Matching student Aadhaar reference across multiple scheme applications",
          },
        ],
      },
      {
        studentId: "STU-COH-013",
        fullName: "Karthik R",
        collegeId: "COL-MIT-02",
        department: "Mechanical",
        course: "B.Tech Aeronautical",
        category: "ST",
        familyIncome: 170000,
        appId: "APP-COH-013",
        schemeId: "SCHEME-NOS",
        status: "SELECTED",
        daysAgoSubmitted: 30,
        daysAgoVerified: 25,
        daysAgoSelected: 18,
        payment: {
          sanctionedAmount: 120000,
          paidAmount: 120000,
          status: "CONFIRMED",
          recipientType: "DIRECT_STUDENT_DBT",
        },
      },
      {
        studentId: "STU-COH-014",
        fullName: "Meena L",
        collegeId: "COL-MIT-02",
        department: "Computer Science",
        course: "B.Tech IT",
        category: "ST",
        familyIncome: 220000,
        appId: "APP-COH-014",
        schemeId: "SCHEME-NFST",
        status: "PAID",
        daysAgoSubmitted: 38,
        daysAgoVerified: 32,
        daysAgoSelected: 24,
        daysAgoPaid: 15,
        payment: {
          sanctionedAmount: 80000,
          paidAmount: 80000,
          status: "CONFIRMED",
          recipientType: "DIRECT_STUDENT_DBT",
        },
      },
      {
        studentId: "STU-COH-015",
        fullName: "Praveen K",
        collegeId: "COL-GAC-03",
        department: "Arts & Science",
        course: "B.Sc Mathematics",
        category: "ST",
        familyIncome: 130000,
        appId: "APP-COH-015",
        schemeId: "SCHEME-NFST",
        status: "SUBMITTED",
        daysAgoSubmitted: 16,
      },
      {
        studentId: "STU-COH-016",
        fullName: "Shalini M",
        collegeId: "COL-GAC-03",
        department: "Arts & Science",
        course: "B.A. English",
        category: "ST",
        familyIncome: 125000,
        appId: "APP-COH-016",
        schemeId: "SCHEME-NFST",
        status: "PAID",
        daysAgoSubmitted: 50,
        daysAgoVerified: 45,
        daysAgoSelected: 35,
        daysAgoPaid: 20,
        payment: {
          sanctionedAmount: 45000,
          paidAmount: 45000,
          status: "CONFIRMED",
          recipientType: "DIRECT_STUDENT_DBT",
        },
      },
      {
        studentId: "STU-COH-017",
        fullName: "Selvam P",
        collegeId: "COL-GCE-04",
        department: "Mechanical",
        course: "B.E. Mechanical",
        category: "ST",
        familyIncome: 165000,
        appId: "APP-COH-017",
        schemeId: "SCHEME-NFST",
        status: "COLLEGE_REVIEW",
        daysAgoSubmitted: 5,
      },
    ];

    for (const c of cohortData) {
      // Upsert Student
      await Student.findOneAndUpdate(
        { studentId: c.studentId },
        {
          $set: {
            studentId: c.studentId,
            userId: `USR-${c.studentId}`,
            collegeId: c.collegeId,
            fullName: c.fullName,
            category: c.category,
            department: c.department,
            course: c.course,
            familyIncome: c.familyIncome,
            academicYear: "2026-2027",
            registerNumber: `REG-${c.studentId}`,
            state: "Tamil Nadu",
          },
        },
        { upsert: true }
      );

      // Upsert User
      await User.findOneAndUpdate(
        { userId: `USR-${c.studentId}` },
        {
          $set: {
            userId: `USR-${c.studentId}`,
            email: `${c.studentId.toLowerCase()}@student.sgp.gov.in`,
            role: "STUDENT",
            collegeId: c.collegeId,
            accountStatus: "ACTIVE",
          },
        },
        { upsert: true }
      );

      // Upsert Application
      const subAt = new Date(nowTime - c.daysAgoSubmitted * oneDay);
      const colVerAt = c.daysAgoVerified ? new Date(nowTime - c.daysAgoVerified * oneDay) : null;
      const minScrutAt = c.daysAgoSelected ? new Date(nowTime - c.daysAgoSelected * oneDay) : null;
      const selAt = c.daysAgoSelected ? new Date(nowTime - c.daysAgoSelected * oneDay) : null;
      const sancAt = c.daysAgoSanctioned ? new Date(nowTime - c.daysAgoSanctioned * oneDay) : null;
      const paidAt = c.daysAgoPaid ? new Date(nowTime - c.daysAgoPaid * oneDay) : null;

      await Application.findOneAndUpdate(
        { applicationId: c.appId },
        {
          $set: {
            applicationId: c.appId,
            studentId: c.studentId,
            collegeId: c.collegeId,
            schemeId: c.schemeId,
            academicYear: "2026-2027",
            applicationStatus: c.status,
            submittedAt: subAt,
            collegeVerifiedAt: colVerAt,
            ministryScrutinizedAt: minScrutAt,
            selectedAt: selAt,
            sanctionedAt: sancAt,
            paidAt: paidAt,
            documentVerificationStatus: colVerAt ? "VERIFIED" : c.deficiencyType ? "FLAGGED" : "PENDING",
            eligibilityStatus: selAt ? "ELIGIBLE" : "PENDING",
            assignedReviewerId: c.assignedReviewerId,
            assignedReviewerName: c.assignedReviewerName,
            possibleDuplicate: c.possibleDuplicate || false,
            duplicateMatches: c.duplicateMatches || [],
          },
        },
        { upsert: true }
      );

      // Add Deficiency if specified
      if (c.deficiencyType) {
        await Deficiency.findOneAndUpdate(
          { applicationId: c.appId },
          {
            $set: {
              deficiencyId: `DEF-${c.appId}`,
              applicationId: c.appId,
              studentId: c.studentId,
              type: c.deficiencyType,
              description: c.deficiencyDesc || "Document requires verification",
              status: "OPEN",
              severity: "HIGH",
              createdBy: c.assignedReviewerId || "COLLEGE_STAFF",
              createdByRole: "COLLEGE_STAFF",
              assignedTo: c.studentId,
            },
          },
          { upsert: true }
        );
      }

      // Add Payment if specified
      if (c.payment) {
        await Payment.findOneAndUpdate(
          { applicationId: c.appId },
          {
            $set: {
              paymentId: `PAY-${c.appId}`,
              applicationId: c.appId,
              studentId: c.studentId,
              collegeId: c.collegeId,
              schemeId: c.schemeId,
              academicYear: "2026-2027",
              instalment: 1,
              sanctionedAmount: c.payment.sanctionedAmount,
              paidAmount: c.payment.paidAmount,
              paymentStatus: c.payment.status,
              recipientType: c.payment.recipientType || "DIRECT_STUDENT_DBT",
              isPartial: c.payment.isPartial || false,
              reversalReason: c.payment.reversalReason,
              reversalDate: c.payment.status === "REVERSED" ? new Date() : null,
              source: "DBT_CONFIRMED_MANUAL",
              updatedBy: "USR-MIN-3001",
              checkedAt: new Date(),
            },
          },
          { upsert: true }
        );
      }

      // Add Document Verification with Version History for comparison demo
      await DocumentVerification.findOneAndUpdate(
        { applicationId: c.appId, documentType: "income" },
        {
          $set: {
            verificationId: `VER-${c.appId}-income`,
            applicationId: c.appId,
            studentId: c.studentId,
            documentType: "income",
            version: 2,
            confidence: 94,
            verificationStatus: "VERIFIED",
            extractedFields: {
              name: c.fullName.toUpperCase(),
              income: c.familyIncome,
              certNumber: `TN-INC-2026-${Math.floor(100000 + Math.random() * 900000)}`,
              issueDate: "2026-04-10",
              validUpto: "2027-04-09",
            },
            versionHistory: [
              {
                version: 1,
                extractedFields: {
                  name: c.fullName.toUpperCase(),
                  income: c.familyIncome + 50000, // Previous mismatch
                  certNumber: "OLD-ERR-001",
                  issueDate: "2025-02-01",
                },
                confidence: 78,
                verificationStatus: "NEEDS_REVIEW",
                mismatch: true,
                mismatchDetails: "Annual income figure flagged by OCR review; corrected in v2",
                processedAt: new Date(nowTime - 20 * oneDay),
                reason: "Initial student upload with blurry certificate seal",
              },
            ],
          },
        },
        { upsert: true }
      );
    }
    console.log(`Analytics cohort seeded: ${cohortData.length} multi-stage records.`);

    console.log("Database successfully seeded with demo and statutory data!");
    if (require.main === module) {
      process.exit(0);
    }
    return true;
  } catch (err) {
    console.error("Seeding error:", err);
    if (require.main === module) {
      process.exit(1);
    }
    throw err;
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
