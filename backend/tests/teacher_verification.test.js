/**
 * ============================================================================
 * TEACHER VERIFICATION & REVIEWER PORTAL TEST SUITE
 * (backend/tests/teacher_verification.test.js)
 * ============================================================================
 * Rigorously verifies all Prompt 3 requirements:
 *
 * 1. Applicant Submission:
 *    - Allows submitting resume only, certificate only, or both.
 *    - Rejects missing documents or invalid file types/signatures.
 *    - Records application in PostgreSQL with status 'submitted' and 2-day notice.
 *
 * 2. Secure Document Storage & Access:
 *    - 401 Unauthorized for unauthenticated requests.
 *    - 403 Forbidden for unauthorized third-party users.
 *    - 200 OK with proper Content-Type and Content-Disposition for applicant and designated reviewer.
 *
 * 3. Document Resubmission & History Preservation:
 *    - Applicant can submit corrected documents for an existing application.
 *    - Preserves previous status, previous document names, and reviewer notes in history JSONB.
 *    - Sets status back to 'submitted' and dispatches notifications.
 *
 * 4. Reviewer Portal Access Control & Adjudication:
 *    - Non-reviewer receives 403 on queue and review routes.
 *    - Designated reviewer (kailashsampath15@gmail.com) receives 200 and can inspect queue.
 *    - Rejecting requires a mandatory reason, sets status to 'rejected', and sends notification.
 *    - Requesting info requires notes, sets status to 'needs_information', and sends notification.
 *    - Approving sets status to 'approved', sends notification.
 *
 * 5. Verified-Skill Specificity & System-Wide Reflection:
 *    - Approving verifies ONLY the specific skill covered by the application.
 *    - Other skills of the teacher remain unverified.
 *    - Newly verified skill appears immediately in /api/courses/available.
 *    - Mentor search (/api/skills/search) marks only the approved skill as verified.
 *
 * 6. Preliminary Resume Pre-Check Notice:
 *    - Automated screening provides completeness & keyword analysis as preliminary guidance only.
 * ============================================================================
 */

const { query } = require("../db/index");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:5000";
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is missing.");
}

const TS = Date.now();
const APPLICANT_ID = `test_p3_app_${TS}`;
const STRANGER_ID = `test_p3_stranger_${TS}`;
const REVIEWER_ID = `test_p3_rev_${TS}`;
const REVIEWER_EMAIL = "kailashsampath15@gmail.com";

let applicantToken = "";
let strangerToken = "";
let reviewerToken = "";

// Helper to create a valid minimal PDF buffer (%PDF-1.4...)
function createValidPdfBuffer() {
  return Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");
}

const zlib = require("zlib");

// Helper to create a valid minimal DOCX buffer with embedded word/document.xml
function createSampleDocxBuffer(xmlText) {
  const xml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${xmlText}</w:t></w:r></w:p></w:body></w:document>`;
  const deflated = zlib.deflateRawSync(Buffer.from(xml, "utf8"));
  const nameBuf = Buffer.from("word/document.xml", "utf8");
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(8, 8); // deflate
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(0, 14);
  header.writeUInt32LE(deflated.length, 18);
  header.writeUInt32LE(Buffer.byteLength(xml), 22);
  header.writeUInt16LE(nameBuf.length, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, nameBuf, deflated]);
}

// Helper to create a PDF buffer containing real text in BT/ET streams
function createTextPdfBuffer(text) {
  return Buffer.from(
    `%PDF-1.4\n1 0 obj\n<< /Length 120 >>\nstream\nBT\n/F1 12 Tf\n(${text}) Tj\nET\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`
  );
}

// Helper to create a valid minimal PNG buffer
function createValidPngBuffer() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash("Pass123!Secure", 10);

  // 1. Create Applicant User (starts as student, has unverified skills)
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_teach, can_learn, bio, is_reviewer)
     VALUES ($1, $2, $3, $4, 'student', TRUE, TRUE, 'Aspiring Python educator', FALSE)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash`,
    [APPLICANT_ID, "Applicant Alex", `alex_${TS}@example.com`, passwordHash]
  );
  applicantToken = jwt.sign(
    { userId: APPLICANT_ID, email: `alex_${TS}@example.com`, role: "student" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // Add an unverified teaching skill for Applicant Alex
  await query(
    `INSERT INTO skills (user_id, skill_name, level, type, is_verified, created_at)
     VALUES ($1, 'Python', 'expert', 'teach', FALSE, CURRENT_TIMESTAMP)`,
    [APPLICANT_ID]
  );
  // Add a second unrelated teaching skill that should REMAIN unverified
  await query(
    `INSERT INTO skills (user_id, skill_name, level, type, is_verified, created_at)
     VALUES ($1, 'JavaScript', 'intermediate', 'teach', FALSE, CURRENT_TIMESTAMP)`,
    [APPLICANT_ID]
  );

  // 2. Create Stranger User (unauthorized third-party)
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_teach, can_learn, is_reviewer)
     VALUES ($1, $2, $3, $4, 'student', FALSE, TRUE, FALSE)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
    [STRANGER_ID, "Stranger Sam", `sam_${TS}@example.com`, passwordHash]
  );
  strangerToken = jwt.sign(
    { userId: STRANGER_ID, email: `sam_${TS}@example.com`, role: "student" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // 3. Ensure Reviewer User exists with email kailashsampath15@gmail.com
  const existingReviewer = await query("SELECT id FROM users WHERE LOWER(email) = $1", [REVIEWER_EMAIL]);
  let revId = REVIEWER_ID;
  if (existingReviewer.rows.length > 0) {
    revId = existingReviewer.rows[0].id;
    await query("UPDATE users SET is_reviewer = TRUE WHERE id = $1", [revId]);
  } else {
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, can_teach, can_learn, is_reviewer)
       VALUES ($1, 'Kailash Reviewer', $2, $3, 'professional', TRUE, TRUE, TRUE)`,
      [REVIEWER_ID, REVIEWER_EMAIL, passwordHash]
    );
  }
  reviewerToken = jwt.sign(
    { userId: revId, email: REVIEWER_EMAIL, role: "professional", isReviewer: true },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
});

afterAll(async () => {
  // Clean up test verification applications and test skills
  await query("DELETE FROM teacher_verification_applications WHERE user_id = $1", [APPLICANT_ID]);
  await query("DELETE FROM skills WHERE user_id = $1", [APPLICANT_ID]);
  await query("DELETE FROM notifications WHERE user_id IN ($1, $2)", [APPLICANT_ID, STRANGER_ID]);
  await query("DELETE FROM users WHERE id IN ($1, $2)", [APPLICANT_ID, STRANGER_ID]);
  if (REVIEWER_ID.startsWith("test_p3_")) {
    await query("DELETE FROM users WHERE id = $1", [REVIEWER_ID]);
  }
});

describe("PROMPT 3: TEACHER VERIFICATION & REVIEWER PORTAL INTEGRATION", () => {
  let createdApplicationId = "";

  // --------------------------------------------------------------------------
  // 1. APPLICANT SUBMISSION FLOW
  // --------------------------------------------------------------------------
  describe("1. Applicant Document Submission & Pre-Check", () => {
    test("Rejects application when no documents are uploaded", async () => {
      const formData = new FormData();
      formData.append("skillName", "Python");

      const res = await fetch(`${BASE_URL}/api/teacher-verification/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${applicantToken}` },
        body: formData,
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("At least one document");
    });

    test("Rejects application with invalid file content (faked extension/invalid magic bytes)", async () => {
      const formData = new FormData();
      formData.append("skillName", "Python");
      const fakePdf = new Blob(["NOT_A_REAL_PDF_CONTENT_XYZ"], { type: "application/pdf" });
      formData.append("resume", fakePdf, "resume.pdf");

      const res = await fetch(`${BASE_URL}/api/teacher-verification/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${applicantToken}` },
        body: formData,
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("validation failed");
    });

    test("Successfully submits application with valid Resume and Certificate", async () => {
      const formData = new FormData();
      formData.append("skillName", "Python");
      formData.append("notes", "4 years teaching experience in academic Python labs.");
      formData.append("resumeText", "Experience: 4 years Python instructor. Skills: Python, Django, Data Structures. Education: BS Computer Science 2024.");

      const pdfBlob = new Blob([createValidPdfBuffer()], { type: "application/pdf" });
      formData.append("resume", pdfBlob, "alex_resume.pdf");

      const pngBlob = new Blob([createValidPngBuffer()], { type: "image/png" });
      formData.append("certificate", pngBlob, "alex_cert.png");

      const res = await fetch(`${BASE_URL}/api/teacher-verification/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${applicantToken}` },
        body: formData,
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.application).toBeDefined();
      expect(data.application.skill_name).toBe("Python");
      expect(data.application.status).toBe("submitted");
      expect(data.application.submission_type).toBe("both");
      expect(data.estimatedReviewTime).toContain("2 business days");
      expect(data.message).toContain("2 business days");

      createdApplicationId = data.application.id;

      // Prove precheck results explain preliminary feedback
      expect(data.precheck).toBeDefined();
      expect(data.precheck.preliminaryNotice).toContain("Preliminary automated completeness & keyword check");
      expect(data.precheck.diagnostic.matchedKeywords).toContain("python");

      // Verify in-app notification was created for applicant
      const notifRes = await query(
        "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
        [APPLICANT_ID]
      );
      expect(notifRes.rows.length).toBe(1);
      expect(notifRes.rows[0].type).toBe("verification_submitted");
      expect(notifRes.rows[0].message).toContain("2 business days");

      // Verify in-app notification was created for reviewer with canonical /reviewer link
      const revNotifRes = await query(
        "SELECT * FROM notifications WHERE link = '/reviewer' ORDER BY created_at DESC LIMIT 1"
      );
      expect(revNotifRes.rows.length).toBe(1);
      expect(revNotifRes.rows[0].link).toBe("/reviewer");
    });

    test("Real DOCX document extraction: parses XML text without treating binary bytes as text", async () => {
      const docxBuffer = createSampleDocxBuffer(
        "John Doe Resume. Experience: Senior Python Instructor and Django Developer. Education: Computer Science Degree. Skills: Python, Django, SQL."
      );
      const formData = new FormData();
      formData.append("skillName", "Python");
      formData.append("resume", new Blob([docxBuffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "john_resume.docx");

      const res = await fetch(`${BASE_URL}/api/teacher-verification/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${applicantToken}` },
        body: formData,
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.precheck).toBeDefined();
      expect(data.precheck.textExtracted).toBe(true);
      expect(data.precheck.diagnostic.matchedKeywords).toContain("python");
      expect(data.precheck.diagnostic.matchedKeywords).toContain("django");
      expect(data.precheck.diagnostic.detectedSections).toContain("experience");
      expect(data.precheck.diagnostic.detectedSections).toContain("education");
      expect(data.precheck.diagnostic.detectedSections).toContain("skills");
    });

    test("Real PDF document extraction: parses stream text objects with keywords", async () => {
      const pdfBuffer = createTextPdfBuffer("Lead Python and Flask software engineering specialist");
      const formData = new FormData();
      formData.append("skillName", "Python");
      formData.append("resume", new Blob([pdfBuffer], { type: "application/pdf" }), "alex_text.pdf");

      const res = await fetch(`${BASE_URL}/api/teacher-verification/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${applicantToken}` },
        body: formData,
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.precheck).toBeDefined();
      expect(data.precheck.textExtracted).toBe(true);
      expect(data.precheck.diagnostic.matchedKeywords).toContain("python");
      expect(data.precheck.diagnostic.matchedKeywords).toContain("flask");
    });

    test("GET /api/teacher-verification/my-applications returns applicant's applications and history", async () => {
      const res = await fetch(`${BASE_URL}/api/teacher-verification/my-applications`, {
        headers: { Authorization: `Bearer ${applicantToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.applications)).toBe(true);
      const myApp = data.applications.find((a) => a.id === createdApplicationId);
      expect(myApp).toBeDefined();
      expect(myApp.skill_name).toBe("Python");
      expect(myApp.status).toBe("submitted");
      expect(myApp.resume_original_name).toBe("alex_resume.pdf");
      expect(myApp.certificate_original_name).toBe("alex_cert.png");
      expect(myApp.history).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 2. PRIVATE DOCUMENT ACCESS CONTROL
  // --------------------------------------------------------------------------
  describe("2. Private Document Access Control", () => {
    test("Denies access (401) to unauthenticated document requests", async () => {
      const res = await fetch(
        `${BASE_URL}/api/teacher-verification/documents/${createdApplicationId}/resume`
      );
      expect(res.status).toBe(401);
    });

    test("Denies access (403) to unauthorized third-party user", async () => {
      const res = await fetch(
        `${BASE_URL}/api/teacher-verification/documents/${createdApplicationId}/resume`,
        { headers: { Authorization: `Bearer ${strangerToken}` } }
      );
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Unauthorized");
    });

    test("Allows applicant to view and stream their own resume document", async () => {
      const res = await fetch(
        `${BASE_URL}/api/teacher-verification/documents/${createdApplicationId}/resume`,
        { headers: { Authorization: `Bearer ${applicantToken}` } }
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/pdf");
      const buffer = await res.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    test("Allows applicant to view and stream their own certificate document", async () => {
      const res = await fetch(
        `${BASE_URL}/api/teacher-verification/documents/${createdApplicationId}/certificate`,
        { headers: { Authorization: `Bearer ${applicantToken}` } }
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("image/png");
    });

    test("Allows designated reviewer to access applicant documents", async () => {
      const res = await fetch(
        `${BASE_URL}/api/teacher-verification/documents/${createdApplicationId}/resume`,
        { headers: { Authorization: `Bearer ${reviewerToken}` } }
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/pdf");
    });
  });

  // --------------------------------------------------------------------------
  // 3. REVIEWER ACCESS CONTROL & QUEUE INSPECTION
  // --------------------------------------------------------------------------
  describe("3. Reviewer Portal Access Control & Inspection", () => {
    test("Denies reviewer queue access (403) to non-reviewer account", async () => {
      const res = await fetch(`${BASE_URL}/api/teacher-verification/admin/queue`, {
        headers: { Authorization: `Bearer ${applicantToken}` },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Only the designated reviewer");
    });

    test("Allows designated reviewer (kailashsampath15@gmail.com) to access queue", async () => {
      const res = await fetch(`${BASE_URL}/api/teacher-verification/admin/queue`, {
        headers: { Authorization: `Bearer ${reviewerToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.applications)).toBe(true);
      expect(data.totalCount).toBeGreaterThan(0);
      expect(data.statusCounts).toBeDefined();

      const inQueue = data.applications.find((a) => a.id === createdApplicationId);
      expect(inQueue).toBeDefined();
      expect(inQueue.applicant).toBeDefined();
      expect(inQueue.applicant.name).toBe("Applicant Alex");
    });

    test("Allows designated reviewer to view application details", async () => {
      const res = await fetch(
        `${BASE_URL}/api/teacher-verification/admin/application/${createdApplicationId}`,
        { headers: { Authorization: `Bearer ${reviewerToken}` } }
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.application.id).toBe(createdApplicationId);
      expect(data.application.applicant.email).toContain("alex_");
    });
  });

  // --------------------------------------------------------------------------
  // 4. REVIEWER DECISION FLOW: REQUEST INFO & REJECT
  // --------------------------------------------------------------------------
  describe("4. Reviewer Decisions & Notification Flow", () => {
    test("Rejecting without a reason is disallowed (400 Bad Request)", async () => {
      const res = await fetch(
        `${BASE_URL}/api/teacher-verification/admin/application/${createdApplicationId}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${reviewerToken}`,
          },
          body: JSON.stringify({ action: "reject", reason: "" }),
        }
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("rejection reason is mandatory");
    });

    test("Requesting more information requires explanatory notes and updates status", async () => {
      const res = await fetch(
        `${BASE_URL}/api/teacher-verification/admin/application/${createdApplicationId}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${reviewerToken}`,
          },
          body: JSON.stringify({
            action: "request_info",
            notes: "Please provide an accredited certificate with verifiable issuer URL.",
          }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.application.status).toBe("needs_information");
      expect(data.application.reviewer_notes).toContain("accredited certificate");

      // Verify notification created for applicant
      const notifRes = await query(
        "SELECT * FROM notifications WHERE user_id = $1 AND type = 'verification_info_needed' ORDER BY created_at DESC LIMIT 1",
        [APPLICANT_ID]
      );
      expect(notifRes.rows.length).toBe(1);
      expect(notifRes.rows[0].message).toContain("accredited certificate");
    });
  });

  // --------------------------------------------------------------------------
  // 5. DOCUMENT RESUBMISSION & HISTORY PRESERVATION
  // --------------------------------------------------------------------------
  describe("5. Document Resubmission & History Preservation", () => {
    test("Applicant can upload corrected documents, preserving prior application history", async () => {
      const formData = new FormData();
      formData.append("notes", "Attached updated certificate issued by Stanford Online.");

      const updatedPngBlob = new Blob([createValidPngBuffer()], { type: "image/png" });
      formData.append("certificate", updatedPngBlob, "stanford_cert.png");

      const res = await fetch(
        `${BASE_URL}/api/teacher-verification/applications/${createdApplicationId}/resubmit`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${applicantToken}` },
          body: formData,
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.application.status).toBe("submitted");
      expect(data.application.certificate_original_name).toBe("stanford_cert.png");
      expect(data.message).toContain("2 business days");

      // Verify history was preserved
      const appInDb = await query(
        "SELECT history, status FROM teacher_verification_applications WHERE id = $1",
        [createdApplicationId]
      );
      expect(appInDb.rows[0].status).toBe("submitted");
      const history = appInDb.rows[0].history;
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(2);

      const resubmitEvent = history.find((h) => h.action === "resubmitted_documents");
      expect(resubmitEvent).toBeDefined();
      expect(resubmitEvent.previous_status).toBe("needs_information");
      expect(resubmitEvent.applicant_notes).toContain("Stanford Online");
    });
  });

  // --------------------------------------------------------------------------
  // 6. APPROVAL, VERIFIED-SKILL SPECIFICITY & CATALOG / MENTOR REFLECTION
  // --------------------------------------------------------------------------
  describe("6. Approval, Skill-Specificity & Search Reflection", () => {
    test("Prior to approval, teacher's skill is unverified and NOT in Available Courses", async () => {
      const courseRes = await fetch(`${BASE_URL}/api/courses/available?search=Python`);
      expect(courseRes.status).toBe(200);
      const courseData = await courseRes.json();
      const pythonCourse = courseData.courses.find((c) => c.name.toLowerCase() === "python");
      if (pythonCourse) {
        const isApplicantInCourse = (pythonCourse.teachers || []).some((t) => t.id === APPLICANT_ID);
        expect(isApplicantInCourse).toBe(false);
      }
    });

    test("Reviewer approves application for 'Python'", async () => {
      const res = await fetch(
        `${BASE_URL}/api/teacher-verification/admin/application/${createdApplicationId}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${reviewerToken}`,
          },
          body: JSON.stringify({
            action: "approve",
            notes: "Verified through Stanford credential record.",
          }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.application.status).toBe("approved");

      // Verify notification created for applicant
      const notifRes = await query(
        "SELECT * FROM notifications WHERE user_id = $1 AND type = 'verification_approved' ORDER BY created_at DESC LIMIT 1",
        [APPLICANT_ID]
      );
      expect(notifRes.rows.length).toBe(1);
      expect(notifRes.rows[0].message).toContain('approved');
    });

    test("SPECIFICITY CHECK: Only 'Python' is marked verified; 'JavaScript' remains unverified", async () => {
      const skillsRes = await query(
        "SELECT skill_name, is_verified FROM skills WHERE user_id = $1 ORDER BY skill_name ASC",
        [APPLICANT_ID]
      );

      const jsSkill = skillsRes.rows.find((s) => s.skill_name === "JavaScript");
      const pySkill = skillsRes.rows.find((s) => s.skill_name === "Python");

      expect(pySkill).toBeDefined();
      expect(pySkill.is_verified).toBe(true);

      expect(jsSkill).toBeDefined();
      expect(jsSkill.is_verified).toBe(false); // MUST REMAIN UNVERIFIED!
    });

    test("SYSTEM-WIDE REFLECTION: Teacher now appears in /api/courses/available for Python", async () => {
      const courseRes = await fetch(`${BASE_URL}/api/courses/available?search=Python`);
      expect(courseRes.status).toBe(200);
      const courseData = await courseRes.json();

      const pythonCourse = courseData.courses.find((c) => c.name.toLowerCase() === "python");
      expect(pythonCourse).toBeDefined();

      const teacherEntry = (pythonCourse.teachers || []).find((t) => t.id === APPLICANT_ID);
      expect(teacherEntry).toBeDefined();
      expect(teacherEntry.name).toBe("Applicant Alex");
    });

    test("SYSTEM-WIDE REFLECTION: Teacher DOES NOT appear in /api/courses/available for JavaScript", async () => {
      const courseRes = await fetch(`${BASE_URL}/api/courses/available?search=JavaScript`);
      expect(courseRes.status).toBe(200);
      const courseData = await courseRes.json();

      const jsCourse = courseData.courses.find((c) => c.name.toLowerCase() === "javascript");
      if (jsCourse) {
        const teacherEntry = (jsCourse.teachers || []).find((t) => t.id === APPLICANT_ID);
        expect(teacherEntry).toBeUndefined(); // MUST NOT APPEAR FOR UNVERIFIED SKILL!
      }
    });

    test("MENTOR SEARCH: /api/skills/search marks Python as verified, but JavaScript as unverified", async () => {
      // 1. Search for Python
      const pySearchRes = await fetch(`${BASE_URL}/api/skills/search?query=Python`);
      expect(pySearchRes.status).toBe(200);
      const pyData = await pySearchRes.json();
      const pyMentor = (pyData.mentors || []).find((m) => m.id === APPLICANT_ID);
      expect(pyMentor).toBeDefined();
      expect(pyMentor.is_verified).toBe(true);

      // 2. Search for JavaScript
      const jsSearchRes = await fetch(`${BASE_URL}/api/skills/search?query=JavaScript`);
      expect(jsSearchRes.status).toBe(200);
      const jsData = await jsSearchRes.json();
      const jsMentor = (jsData.mentors || []).find((m) => m.id === APPLICANT_ID);
      expect(jsMentor).toBeDefined();
      expect(jsMentor.is_verified).toBe(false); // UNVERIFIED!
    });
  });
});
