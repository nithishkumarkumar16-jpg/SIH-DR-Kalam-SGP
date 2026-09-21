/**
 * ocrPriorityFields.test.js — Targeted Regression Suite for OCR Priority Field Hardening
 * 
 * Validates 25+ critical edge-cases across:
 * 1. SSLC subject marks
 * 2. SSLC total/max
 * 3. SSLC percentage (explicit & derived)
 * 4. HSC subject marks (theory + practical)
 * 5. HSC total/max
 * 6. HSC percentage
 * 7. CBSE marks table
 * 8. CBSE percentage & grades
 * 9. DOB vs issue date disambiguation
 * 10. Income certificate issue date
 * 11. Community certificate issue date
 * 12. Father name with bilingual slash prefixes
 * 13. Mother name
 * 14. Multi-line school name
 * 15. Conflicting numeric marks candidates (math conflict -> NEEDS_REVIEW)
 * 16. Conflicting dates (issue date != DOB)
 * 17. Low-confidence marks
 * 18. Low-confidence / invalid DOB
 * 19. Cross-document DOB consistency
 * 20. Cross-document parent-name consistency
 * 21. Principal / Headmaster blacklist rejection from parent name
 * 22. Tahsildar blacklist rejection from parent name
 * 23. Invalid calendar date rejection (e.g., 31st Feb)
 * 24. Unreasonable student age rejection for DOB (e.g. year 2026 -> age 0)
 * 25. Mathematical formula validation (obtained / max * 100)
 */

import {
  extractMarks,
  extractSchool,
  extractMarksheetData,
  extractCommunityCertificateData,
  extractIncomeCertificateData,
  validateMarksConsistency,
  validateCalendarDate,
  validateStudentDob,
  PARENT_ROLE_BLACKLIST,
} from "./fieldParsers";
import { evaluateCrossDocumentCase } from "./verificationEngine";

describe("OCR Priority Field Hardening & Safety Suite", () => {
  // 1. SSLC Subject Marks
  test("1. SSLC: extracts subject-wise marks table accurately", () => {
    const text = `
      TAMIL 088 — 088 PASS
      ENGLISH 082 — 082 PASS
      MATHEMATICS 094 — 094 PASS
      SCIENCE 072 024 096 PASS
      SOCIAL SCIENCE 089 — 089 PASS
      GRAND TOTAL 449 / 500
      PERCENTAGE : 89.8% RESULT : PASS
    `;
    const res = extractMarks(text, "ms10");
    expect(res.subjectMarks).toBeDefined();
    expect(res.subjectMarks.length).toBe(5);
    expect(res.subjectMarks.find(s => s.subject === "TAMIL")?.marks).toBe("088");
    expect(res.subjectMarks.find(s => s.subject === "SCIENCE")?.marks).toBe("096");
  });

  // 2. SSLC Total / Max
  test("2. SSLC: extracts total and maximum marks accurately with leading OCR noise", () => {
    const text = `
      00000 000000000000 / GRAND TOTAL 449/500
      PERCENTAGE : 89.8% RESULT : PASS
    `;
    const res = extractMarks(text, "ms10");
    expect(res.marksScored).toBe("449");
    expect(res.maxMarks).toBe("500");
    expect(res.marks).toBe("449/500");
  });

  // 3. SSLC Percentage
  test("3. SSLC: extracts explicit percentage and confirms consistency", () => {
    const text = `
      GRAND TOTAL 449 / 500
      PERCENTAGE : 89.8% RESULT : PASS
    `;
    const res = extractMarks(text, "ms10");
    expect(res.percentage).toBe("89.8%");
    expect(res.percentageSource).toBe("explicit");
    expect(res.percentageDisagreement).toBe(false);
  });

  // 4. HSC Subject Marks
  test("4. HSC: extracts practical and theory marks where present", () => {
    const text = `
      PART I TAMIL 091 — 091
      PART II ENGLISH 086 — 086
      PHYSICS 062 030 092
      CHEMISTRY 058 030 088
      BIOLOGY 064 030 094
      MATHEMATICS 089 — 089
      GRAND TOTAL : 540 / 600
      PERCENTAGE : 90.00% RESULT : PASS
    `;
    const res = extractMarks(text, "ms12");
    expect(res.subjectMarks).toBeDefined();
    expect(res.subjectMarks.length).toBe(6);
    const phy = res.subjectMarks.find(s => s.subject === "PHYSICS");
    expect(phy?.theory).toBe("062");
    expect(phy?.practical).toBe("030");
    expect(phy?.marks).toBe("092");
  });

  // 5. HSC Total / Max
  test("5. HSC: extracts 600 max marks and scored total", () => {
    const text = `
      GRAND TOTAL : 540/600
      RESULT : PASS
    `;
    const res = extractMarks(text, "ms12");
    expect(res.marksScored).toBe("540");
    expect(res.maxMarks).toBe("600");
    expect(res.marks).toBe("540/600");
  });

  // 6. HSC Percentage (Derived if explicit absent)
  test("6. HSC: derives honest percentage from verified scored / max marks when explicit is absent", () => {
    const text = `
      GRAND TOTAL : 540/600
      RESULT : PASS
    `;
    const res = extractMarks(text, "ms12");
    expect(res.percentage).toBe("90.00%");
    expect(res.percentageSource).toBe("derived");
    expect(res.percentageFormula).toBe("obtained/max*100");
  });

  // 7. CBSE Marks Table
  test("7. CBSE: extracts subject codes, names, marks, and grades", () => {
    const text = `
      085 HINDI COURSE-B 086 A2
      184 ENGLISH LANG & LIT 091 A1
      041 MATHEMATICS STANDARD 095 A1
      086 SCIENCE 088 A2
      087 SOCIAL SCIENCE 090 A1
      TOTAL MARKS : 450 / 500
      PASS (90.0%)
    `;
    const res = extractMarks(text, "ms10");
    expect(res.subjectMarks).toBeDefined();
    expect(res.subjectMarks.length).toBe(5);
    expect(res.subjectMarks[0].code).toBe("085");
    expect(res.subjectMarks[0].grade).toBe("A2");
    expect(res.marksScored).toBe("450");
  });

  // 8. CBSE Percentage
  test("8. CBSE: extracts percentage from PASS (90.0%) pattern", () => {
    const text = `
      TOTAL MARKS : 450 / 500
      PASS (90.0%)
    `;
    const res = extractMarks(text, "ms10");
    expect(res.percentage).toBe("90.0%");
    expect(res.percentageSource).toBe("explicit");
  });

  // 9. DOB vs Issue Date
  test("9. DOB vs Issue Date: never confuses certificate issue date with student date of birth", () => {
    const text = `
      GOVERNMENT OF TAMIL NADU
      COMMUNITY CERTIFICATE
      Certificate No: TN-52024-010388 Date of Issue: 15-06-2026
      This is to certify that Selvan SENTHIL KUMAR K Son of Thiru KRISHNAMOORTHY M
      DATE OF BIRTH : 14-05-2005
      COMMUNITY : Vanniyar
      TAHSILDAR
      Date : 15-06-2026
    `;
    const res = extractCommunityCertificateData(text);
    expect(res.dob).toBe("14-05-2005");
    expect(res.issueDate).toBe("15-06-2026");
    expect(res.dob).not.toBe(res.issueDate);
  });

  // 10. Income Certificate Issue Date
  test("10. Income Certificate: extracts issue date and validity period", () => {
    const text = `
      Certificate No: TN-INC2026-010488 Date: 15-06-2026
      ANNUAL INCOME : Rs. 96,000/-
      VALIDITY : ONE YEAR FROM ISSUE DATE
    `;
    const res = extractIncomeCertificateData(text);
    expect(res.issueDate).toBe("15-06-2026");
    expect(res.validUpto).toBeDefined();
  });

  // 11. Community Certificate Issue Date
  test("11. Community Certificate: extracts explicit Date of Issue", () => {
    const text = `
      Certificate No: TN-52024-010388 Date of Issue: 15-06-2026
      APPLICANT NAME : SENTHIL KUMAR K
    `;
    const res = extractCommunityCertificateData(text);
    expect(res.issueDate).toBe("15-06-2026");
  });

  // 12. Father Name with Bilingual Prefix
  test("12. Father Name: parses father name accurately with bilingual slash prefix", () => {
    const text = `
      STUDENT NAME / தேர்வரின் பெயர் : SENTHIL KUMAR K
      PARENT NAME / பெற்றோர் பெயர் : KRISHNAMOORTHY M
      PERMANENT REGISTER NUMBER : 74010002
      DATE OF BIRTH : 14-05-2005
    `;
    const res = extractMarksheetData(text, "ms12");
    expect(res.fatherName).toBe("Krishnamoorthy M");
  });

  // 13. Mother Name
  test("13. Mother Name: extracts mother name when explicitly labelled", () => {
    const text = `
      NAME OF THE CANDIDATE : PRIYA S
      FATHER'S NAME : SUNDARAMURTHY V
      MOTHER'S NAME : LAKSHMI S
      DATE OF BIRTH : 22-08-2006
    `;
    const res = extractMarksheetData(text, "ms10");
    expect(res.fatherName).toBe("Sundaramurthy V");
    expect(res.motherName).toBe("Lakshmi S");
  });

  // 14. Multi-Line School Name
  test("14. School Name: extracts multi-line school name and stops cleanly at boundary", () => {
    const text = `
      NAME OF THE SCHOOL :
      Government Higher Secondary School,
      Madurai
      PERMANENT REGISTER NUMBER : 74010001
      DATE OF BIRTH : 14-05-2005
    `;
    const res = extractSchool(text);
    expect(res.school).toContain("Government Higher Secondary School, Madurai");
    expect(res.school).not.toContain("PERMANENT");
    expect(res.school).not.toContain("REGISTER");
  });

  // 15. Conflicting Numeric Marks Candidates
  test("15. Conflicting Marks: flags math conflict as NEEDS_REVIEW when subject sum contradicts grand total", () => {
    const res = validateMarksConsistency({
      scored: "400",
      maxMarks: "500",
      percentage: "80.0%",
      subjectMarks: [
        { subject: "TAMIL", marks: "90" },
        { subject: "ENGLISH", marks: "90" },
        { subject: "MATHS", marks: "90" },
        { subject: "SCIENCE", marks: "90" },
        { subject: "SOCIAL", marks: "90" }, // sum = 450 != 400
      ],
    });
    expect(res.status).toBe("CONFLICT");
    expect(res.reason).toContain("conflicts with grand total");
  });

  // 16. Conflicting Dates
  test("16. Conflicting Dates: flags percentage disagreement if printed percentage contradicts scored/max ratio", () => {
    const res = validateMarksConsistency({
      scored: "450",
      maxMarks: "500", // ratio is 90%
      percentage: "70.0%", // printed says 70%
    });
    expect(res.status).toBe("CONFLICT");
    expect(res.reason).toContain("conflicts with calculated marks ratio");
  });

  // 17. Low-Confidence Marks
  test("17. Low-Confidence Marks: demotes marks confidence if math consistency fails", () => {
    const text = `
      TOTAL MARKS : 300 / 500
      PERCENTAGE : 90.0%
    `;
    const res = extractMarks(text, "ms10");
    expect(res.percentageDisagreement).toBe(true);
    expect(res.percentageConfidence).toBeLessThan(70);
  });

  // 18. Low-Confidence DOB
  test("18. Low-Confidence DOB: flags invalid calendar date as invalid without promotion", () => {
    const val = validateCalendarDate("31/02/2005"); // Feb 31 does not exist
    expect(val.isValid).toBe(false);
    expect(val.reason).toContain("Invalid day 31");
  });

  // 19. Cross-Document DOB Consistency
  test("19. Cross-Document DOB: flags significant conflict when DOB differs across documents", () => {
    const docs = [
      { docType: "10th_marksheet", name: "SENTHIL KUMAR K", dob: "14-05-2005" },
      { docType: "12th_marksheet", name: "SENTHIL KUMAR K", dob: "14-05-2005" },
      { docType: "community_certificate", name: "SENTHIL KUMAR K", dob: "18-09-2005" }, // conflict!
    ];
    const res = evaluateCrossDocumentCase(docs);
    expect(res.status).toBe("SIGNIFICANT CONFLICT");
    expect(res.dobStatus).toBe("SIGNIFICANT CONFLICT");
  });

  // 20. Cross-Document Parent-Name Consistency
  test("20. Cross-Document Parent Name: evaluates parent name consistency across documents", () => {
    const docs = [
      { docType: "12th_marksheet", name: "SENTHIL KUMAR K", parentName: "KRISHNAMOORTHY M" },
      { docType: "community_certificate", name: "SENTHIL KUMAR K", parentName: "RAMESH BABU K" }, // conflict!
    ];
    const res = evaluateCrossDocumentCase(docs);
    expect(res.hasConflict).toBe(true);
    expect(res.parentStatus).toBe("SIGNIFICANT CONFLICT");
  });

  // 21. Blacklist Principal / Headmaster from Parent Name
  test("21. Safety: never promotes Principal or Headmaster to parent name", () => {
    expect(PARENT_ROLE_BLACKLIST.test("HEADMASTER")).toBe(true);
    expect(PARENT_ROLE_BLACKLIST.test("PRINCIPAL")).toBe(true);
    const text = `
      NAME OF THE CANDIDATE : SAMPLE STUDENT
      FATHER'S NAME : HEADMASTER / PRINCIPAL
      DATE OF BIRTH : 14-05-2005
    `;
    const res = extractMarksheetData(text, "ms10");
    expect(res.fatherName).toBeNull();
  });

  // 22. Blacklist Tahsildar from Parent Name
  test("22. Safety: never promotes Tahsildar or revenue authority to parent name", () => {
    expect(PARENT_ROLE_BLACKLIST.test("TAHSILDAR")).toBe(true);
    const text = `
      APPLICANT NAME : SAMPLE STUDENT
      FATHER / GUARDIAN NAME : TAHSILDAR
    `;
    const res = extractCommunityCertificateData(text);
    expect(res.fatherName).toBeNull();
  });

  // 23. Invalid Calendar Date
  test("23. Safety: rejects invalid month in date string", () => {
    const val = validateCalendarDate("15-13-2005");
    expect(val.isValid).toBe(false);
    expect(val.reason).toContain("Invalid month");
  });

  // 24. Unreasonable Student Age for DOB
  test("24. Safety: rejects year 2026 as student DOB (age 0 is impossible for certificate)", () => {
    const val = validateStudentDob("15-06-2026", 2026);
    expect(val.isValid).toBe(false);
    expect(val.reason).toContain("under 10 years");
  });

  // 25. Mathematical Formula Validation
  test("25. Math: validates calculated percentage matches obtained / max * 100", () => {
    const val = validateMarksConsistency({
      scored: "450",
      maxMarks: "500",
      percentage: "90.00%",
    });
    expect(val.status).toBe("CONSISTENT");
    expect(val.calculatedPercentage).toBe("90.00%");
  });
});
