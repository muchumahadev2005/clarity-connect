export interface MailTemplate {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  subject: string;
  header: string;
  greeting: string;
  body: string;
  footer: string;
  tags: string[];
}

export interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const CATEGORIES: TemplateCategory[] = [
  {
    id: "anonymous",
    name: "Anonymous Message",
    icon: "📩",
    description: "General, secret, or feedback messages with complete privacy."
  },
  {
    id: "recruitment",
    name: "Recruitment",
    icon: "💼",
    description: "Professional recruitment and interview templates."
  },
  {
    id: "hr",
    name: "HR & Employment",
    icon: "👔",
    description: "Official documents and employment notifications."
  },
  {
    id: "business",
    name: "Business",
    icon: "🏢",
    description: "Corporate proposals, invoices, and payment reminders."
  },
  {
    id: "education",
    name: "Education",
    icon: "🎓",
    description: "Admission updates, schedules, and exam notifications."
  },
  {
    id: "legal",
    name: "Legal",
    icon: "⚖️",
    description: "Notices, privacy compliance, and policy updates."
  },
  {
    id: "personal",
    name: "Personal",
    icon: "🎉",
    description: "Greeting cards, event invitations, and personal notes."
  },
  {
    id: "custom",
    name: "Custom",
    icon: "✨",
    description: "Start from a blank slate with custom styling."
  }
];

export const TEMPLATES: MailTemplate[] = [
  // --- ANONYMOUS MESSAGE ---
  {
    id: "anon-general",
    categoryId: "anonymous",
    title: "General Message",
    description: "Send a secure general-purpose anonymous message.",
    subject: "A Secure Message for You",
    header: "SecureSend General Delivery",
    greeting: "Hello,",
    body: "I am sending you this message anonymously. Please review the details below.",
    footer: "Sent securely via SecureSend Platform.",
    tags: ["Anonymous", "General"]
  },
  {
    id: "anon-secret",
    categoryId: "anonymous",
    title: "Secret Message",
    description: "Share sensitive secrets anonymously.",
    subject: "Strictly Confidential Message",
    header: "Confidentiality System",
    greeting: "Dear Recipient,",
    body: "This message contains confidential information that is intended for your eyes only. Please handle this information with discretion.",
    footer: "Decryption keys stay local. No logs stored.",
    tags: ["Confidential", "Secret", "Anonymous"]
  },
  {
    id: "anon-confession",
    categoryId: "anonymous",
    title: "Confession",
    description: "Confess something securely and anonymously.",
    subject: "An Anonymous Confession",
    header: "Personal Confessions Desk",
    greeting: "To whom it may concern,",
    body: "I wanted to confess something that I have kept to myself for a while. I hope writing this anonymously helps bring clarity to the situation.",
    footer: "Delivered privately via SecureSend Confessions.",
    tags: ["Confession", "Personal", "Confidential"]
  },
  {
    id: "anon-feedback",
    categoryId: "anonymous",
    title: "Anonymous Feedback",
    description: "Provide constructive feedback without revealing your identity.",
    subject: "Constructive Feedback on Recent Operations",
    header: "Anonymous Feedback Loop",
    greeting: "Hi Team,",
    body: "Here is some constructive feedback regarding recent work. I believe focusing on communication and workflow improvements will help the team scale faster.",
    footer: "Feedback submitted anonymously.",
    tags: ["Feedback", "Suggestion", "Anonymous"]
  },
  {
    id: "anon-complaint",
    categoryId: "anonymous",
    title: "Complaint",
    description: "Submit a professional, anonymous complaint.",
    subject: "Official Complaint Notification",
    header: "Quality & Compliance Desk",
    greeting: "Attention Management,",
    body: "I am writing to report an issue that requires immediate investigation. Please check the current compliance logs and operational activities.",
    footer: "Reported anonymously for quality assurance.",
    tags: ["Complaint", "Compliance", "Legal"]
  },
  {
    id: "anon-appreciation",
    categoryId: "anonymous",
    title: "Appreciation",
    description: "Praise someone anonymously to build motivation.",
    subject: "Thank you for your outstanding support!",
    header: "Kudos & Appreciation",
    greeting: "Dear Colleague,",
    body: "I wanted to take a moment to appreciate your hard work and help recently. Your support was invaluable to the team's success.",
    footer: "Sent anonymously by an appreciative colleague.",
    tags: ["Appreciation", "Kudos", "Personal"]
  },
  {
    id: "anon-suggestion",
    categoryId: "anonymous",
    title: "Suggestion",
    description: "Propose new ideas anonymously.",
    subject: "Product / Process Suggestion",
    header: "Innovation & Suggestions Box",
    greeting: "Hi Management,",
    body: "I have a suggestion for improving our product workflow. Introducing automated checks during code submission will reduce errors.",
    footer: "Submitted anonymously via Suggestion Channel.",
    tags: ["Suggestion", "Innovation"]
  },
  {
    id: "anon-warning",
    categoryId: "anonymous",
    title: "Warning",
    description: "Send an anonymous alert or security heads-up.",
    subject: "Important Warning: Security Alert",
    header: "System Security & Alert Center",
    greeting: "Attention,",
    body: "Please check your network access points. There is a potential misconfiguration that needs to be secured immediately.",
    footer: "Alert sent anonymously for defensive purposes.",
    tags: ["Warning", "Security", "Alert"]
  },
  {
    id: "anon-custom",
    categoryId: "anonymous",
    title: "Custom Blank Message",
    description: "A blank anonymous template.",
    subject: "Secure Email Notification",
    header: "Secure Delivery",
    greeting: "Dear Recipient,",
    body: "",
    footer: "Sent via SecureSend.",
    tags: ["Custom", "Blank"]
  },

  // --- RECRUITMENT ---
  {
    id: "rec-shortlisted",
    categoryId: "recruitment",
    title: "Shortlisted",
    description: "Congratulate a candidate on being shortlisted.",
    subject: "Congratulations! You have been shortlisted",
    header: "Talent Acquisition Team",
    greeting: "Dear Candidate,",
    body: "We are pleased to inform you that your application has been shortlisted for the next phase of our hiring process.",
    footer: "Sincerely, Talent Acquisition Department.",
    tags: ["Recruitment", "Shortlisted", "Interview"]
  },
  {
    id: "rec-invite",
    categoryId: "recruitment",
    title: "Interview Invitation",
    description: "Send a formal interview request.",
    subject: "Interview Invitation",
    header: "Human Resources Team",
    greeting: "Dear Candidate,",
    body: "We would like to invite you for an interview to discuss your experience and fit for this role. Please let us know your availability.",
    footer: "Kind regards, Human Resources Team.",
    tags: ["Recruitment", "Interview", "Invite"]
  },
  {
    id: "rec-assessment",
    categoryId: "recruitment",
    title: "Online Assessment",
    description: "Send assessment test details to a candidate.",
    subject: "Online Assessment Test Link",
    header: "Campus Hiring Team",
    greeting: "Dear Candidate,",
    body: "Please find the online technical assessment link attached. The test must be completed within the next 48 hours.",
    footer: "Best of luck, Technical Recruitment Team.",
    tags: ["Recruitment", "Assessment", "Test"]
  },
  {
    id: "rec-technical",
    categoryId: "recruitment",
    title: "Technical Round",
    description: "Invite candidate to a technical interview round.",
    subject: "Technical Interview Invitation",
    header: "Engineering Recruiting Team",
    greeting: "Dear Candidate,",
    body: "We invite you to the Technical Interview Round. This session will focus on coding, design patterns, and system architecture.",
    footer: "Best regards, Engineering Team.",
    tags: ["Recruitment", "Technical", "Interview"]
  },
  {
    id: "rec-hr",
    categoryId: "recruitment",
    title: "HR Round",
    description: "Invite candidate to the final HR interview round.",
    subject: "HR Discussion & Final Round",
    header: "Human Resources Department",
    greeting: "Dear Candidate,",
    body: "We would like to invite you to the final HR discussion round to align on benefits, culture, and joining policies.",
    footer: "Warm regards, People Operations Team.",
    tags: ["Recruitment", "HR", "Interview"]
  },
  {
    id: "rec-final",
    categoryId: "recruitment",
    title: "Final Interview",
    description: "Schedule final partner/manager round.",
    subject: "Final Managerial Interview Confirmation",
    header: "Management Recruitment Desk",
    greeting: "Dear Candidate,",
    body: "You have successfully cleared our technical hurdles. We invite you to the final managerial round with our executive partners.",
    footer: "Sincerely, Leadership Hiring Team.",
    tags: ["Recruitment", "Final", "Interview"]
  },
  {
    id: "rec-congrats",
    categoryId: "recruitment",
    title: "Congratulations",
    description: "Congratulate candidate on clearing the rounds.",
    subject: "Congratulations! Interview Rounds Cleared",
    header: "Talent Acquisition Team",
    greeting: "Dear Candidate,",
    body: "We have received positive feedback from all interview panels. We congratulations you on clearing all rounds successfully.",
    footer: "Best regards, Talent Acquisition Team.",
    tags: ["Recruitment", "Congrats", "Selected"]
  },
  {
    id: "rec-selected",
    categoryId: "recruitment",
    title: "Selected",
    description: "Notify candidate that they have been selected for the position.",
    subject: "Application Status Update: Selected",
    header: "HR Department",
    greeting: "Dear Candidate,",
    body: "We are thrilled to inform you that you have been selected for the position. We are excited about having you join our team.",
    footer: "Sincerely, HR Director.",
    tags: ["Recruitment", "Selected", "Offer"]
  },
  {
    id: "rec-rejected",
    categoryId: "recruitment",
    title: "Rejected",
    description: "Send a polite rejection email to a candidate.",
    subject: "Application Status Update: Recruitment Update",
    header: "Talent Acquisition Team",
    greeting: "Dear Candidate,",
    body: "Thank you for taking the time to interview with us. Unfortunately, we have decided to move forward with other candidates at this stage.",
    footer: "We wish you the very best in your search.",
    tags: ["Recruitment", "Rejected", "Status"]
  },
  {
    id: "rec-waiting",
    categoryId: "recruitment",
    title: "Waiting List",
    description: "Notify candidate they are on the waitlist.",
    subject: "Application Status: Waiting List Update",
    header: "Recruitment Team",
    greeting: "Dear Candidate,",
    body: "Your profile has been placed on our waiting list. We will reach out to you if a new position opens up.",
    footer: "Sincerely, Recruitment Team.",
    tags: ["Recruitment", "Waiting", "Status"]
  },
  {
    id: "rec-update",
    categoryId: "recruitment",
    title: "Recruitment Update",
    description: "Send general recruitment progress update.",
    subject: "Application Process Update",
    header: "Human Resources",
    greeting: "Dear Candidate,",
    body: "Our recruitment panels are reviewing your profiles. We will send you another update by early next week.",
    footer: "Thanks for your patience, Recruitment Operations.",
    tags: ["Recruitment", "Update"]
  },

  // --- HR & EMPLOYMENT ---
  {
    id: "hr-offer",
    categoryId: "hr",
    title: "Offer Letter",
    description: "Send a formal job offer letter.",
    subject: "Official Offer Letter & Welcome Package",
    header: "Human Resources Department",
    greeting: "Dear Future Employee,",
    body: "We are pleased to offer you employment with our organization. Please find the detailed salary breakdown and offer details enclosed.",
    footer: "Warm regards, Human Resources Director.",
    tags: ["HR", "Offer", "Employment"]
  },
  {
    id: "hr-appointment",
    categoryId: "hr",
    title: "Appointment Letter",
    description: "Send an official appointment letter.",
    subject: "Official Appointment Letter",
    header: "People Operations Team",
    greeting: "Dear Employee,",
    body: "This is to confirm your official appointment starting this month. Please submit the joining checklist documents.",
    footer: "Sincerely, People Operations Department.",
    tags: ["HR", "Appointment", "Onboarding"]
  },
  {
    id: "hr-joining",
    categoryId: "hr",
    title: "Joining Letter",
    description: "Send details about joining date and instructions.",
    subject: "Joining Instructions & First Day Details",
    header: "Onboarding Team",
    greeting: "Dear Colleague,",
    body: "Welcome to the organization! Please find the joining instructions, first day schedule, and office guidelines attached.",
    footer: "Warmly, Employee Relations Team.",
    tags: ["HR", "Joining", "Instructions"]
  },
  {
    id: "hr-promotion",
    categoryId: "hr",
    title: "Promotion Letter",
    description: "Notify employee of their promotion.",
    subject: "Promotion Notification & Role Change",
    header: "Human Resources",
    greeting: "Dear Colleague,",
    body: "We are delighted to promote you to your new role. Thank you for your continued dedication and leadership.",
    footer: "Congratulations! Sincerely, HR Department.",
    tags: ["HR", "Promotion", "Congratulations"]
  },
  {
    id: "hr-salary",
    categoryId: "hr",
    title: "Salary Revision",
    description: "Notify employee of a salary hike or revision.",
    subject: "Salary Revision Notice",
    header: "Compensation & Benefits Team",
    greeting: "Dear Colleague,",
    body: "This letter is to inform you that your compensation has been revised to reflect your contributions over the past year.",
    footer: "Best regards, Compensation Operations.",
    tags: ["HR", "Salary", "Revision"]
  },
  {
    id: "hr-confirmation",
    categoryId: "hr",
    title: "Confirmation Letter",
    description: "Confirm completion of probationary period.",
    subject: "Probation Clearance & Confirmation Letter",
    header: "People Operations",
    greeting: "Dear Colleague,",
    body: "We are pleased to confirm that you have successfully completed your probation period, and your employment is now confirmed.",
    footer: "Warmly, People Operations Team.",
    tags: ["HR", "Confirmation", "Employment"]
  },
  {
    id: "hr-experience",
    categoryId: "hr",
    title: "Experience Letter",
    description: "Send employment experience certificate.",
    subject: "Employment Experience Certificate",
    header: "Human Resources Department",
    greeting: "To Whom It May Concern,",
    body: "This is to certify that the employee was working as a valuable member of our team during their tenure.",
    footer: "Sincerely, HR Operations Manager.",
    tags: ["HR", "Experience", "Certificate"]
  },
  {
    id: "hr-relieving",
    categoryId: "hr",
    title: "Relieving Letter",
    description: "Send official relieving letter after resignation.",
    subject: "Official Relieving Letter",
    header: "Employee Relations Desk",
    greeting: "Dear Colleague,",
    body: "We confirm that you have been relieved from your duties. We thank you for your service and wish you the best in your career.",
    footer: "Sincerely, Employee Relations Team.",
    tags: ["HR", "Relieving", "Exit"]
  },
  {
    id: "hr-warning",
    categoryId: "hr",
    title: "Warning Letter",
    description: "Send formal disciplinary warning letter.",
    subject: "Important Notice: Warning Letter",
    header: "HR Compliance & Ethics Desk",
    greeting: "Dear Employee,",
    body: "This is a formal warning letter regarding your recent workplace behavior. Please review the company code of conduct policy immediately.",
    footer: "Sincerely, Human Resources Compliance.",
    tags: ["HR", "Warning", "Compliance"]
  },
  {
    id: "hr-appreciation",
    categoryId: "hr",
    title: "Appreciation Letter",
    description: "Send a formal HR appreciation letter.",
    subject: "Official Appreciation of Outstanding Performance",
    header: "Management Team",
    greeting: "Dear Colleague,",
    body: "Thank you for your excellent performance during our recent project. Your dedication has set a benchmark for the team.",
    footer: "Warm regards, Leadership Team.",
    tags: ["HR", "Appreciation", "Kudos"]
  },
  {
    id: "hr-performance",
    categoryId: "hr",
    title: "Performance Review",
    description: "Send feedback on performance review.",
    subject: "Performance Review Summary",
    header: "People Operations Team",
    greeting: "Dear Colleague,",
    body: "Please find the summary of your performance review. Let's schedule a 1-on-1 discussion to map out your career goals.",
    footer: "Sincerely, People Ops Manager.",
    tags: ["HR", "Performance", "Review"]
  },
  {
    id: "hr-transfer",
    categoryId: "hr",
    title: "Transfer Letter",
    description: "Notify employee of location/department transfer.",
    subject: "Official Transfer Notification",
    header: "Global Mobility Team",
    greeting: "Dear Colleague,",
    body: "This is to confirm your transfer to our other branch office starting next month. Please coordinate with relocation support.",
    footer: "Warm regards, HR Mobility Desk.",
    tags: ["HR", "Transfer", "Mobility"]
  },

  // --- BUSINESS ---
  {
    id: "bus-proposal",
    categoryId: "business",
    title: "Business Proposal",
    description: "Send a formal business development proposal.",
    subject: "Business Collaboration Proposal",
    header: "Business Development Desk",
    greeting: "Dear Partner,",
    body: "We are pleased to submit our formal business proposal. We look forward to collaborating and driving value together.",
    footer: "Best regards, Business Development Team.",
    tags: ["Business", "Proposal", "Partnership"]
  },
  {
    id: "bus-invoice",
    categoryId: "business",
    title: "Invoice",
    description: "Send a service or product invoice.",
    subject: "Invoice for Recent Services Rendered",
    header: "Finance & Accounts Department",
    greeting: "Dear Client,",
    body: "Please find the invoice for services rendered. The payment is due within 15 days according to our contract agreement.",
    footer: "Thank you for your business. Finance Department.",
    tags: ["Business", "Invoice", "Finance"]
  },
  {
    id: "bus-reminder",
    categoryId: "business",
    title: "Payment Reminder",
    description: "Send a friendly payment due reminder.",
    subject: "Friendly Payment Reminder: Invoice Due",
    header: "Accounts Receivable Desk",
    greeting: "Dear Customer,",
    body: "This is a friendly reminder that invoice payment is currently outstanding. Please process the payment at your earliest convenience.",
    footer: "Thanks, Accounts Team.",
    tags: ["Business", "Reminder", "Finance"]
  },
  {
    id: "bus-quotation",
    categoryId: "business",
    title: "Quotation",
    description: "Send a pricing quotation.",
    subject: "Pricing Quotation",
    header: "Sales Operations Team",
    greeting: "Dear Client,",
    body: "Please find the formal quotation for the products you requested. The prices listed are valid for the next 30 days.",
    footer: "Best regards, Sales Operations Team.",
    tags: ["Business", "Quotation", "Sales"]
  },
  {
    id: "bus-po",
    categoryId: "business",
    title: "Purchase Order",
    description: "Send an official purchase order.",
    subject: "Official Purchase Order (PO)",
    header: "Procurement Team",
    greeting: "Dear Supplier,",
    body: "Please find the purchase order attached. Kindly acknowledge receipt and confirm the estimated delivery dates.",
    footer: "Sincerely, Purchasing Operations Manager.",
    tags: ["Business", "Purchase Order", "Procurement"]
  },
  {
    id: "bus-contract",
    categoryId: "business",
    title: "Contract Draft",
    description: "Share a contract draft for review.",
    subject: "Contract Agreement Draft for Review",
    header: "Corporate Legal Desk",
    greeting: "Dear Client,",
    body: "Please find the initial contract agreement draft attached. Kindly review and send back with redlines.",
    footer: "Best regards, Legal Team.",
    tags: ["Business", "Contract", "Draft"]
  },
  {
    id: "bus-nda",
    categoryId: "business",
    title: "NDA Request",
    description: "Request Non-Disclosure Agreement signature.",
    subject: "Mutual Non-Disclosure Agreement (NDA) Request",
    header: "Corporate Partnerships Desk",
    greeting: "Dear Partner,",
    body: "Before we share confidential business files, please sign the mutual NDA attached via DocuSign link.",
    footer: "Best regards, Operations Desk.",
    tags: ["Business", "NDA", "Partnership"]
  },
  {
    id: "bus-update",
    categoryId: "business",
    title: "Project Update",
    description: "Send status reports to clients/management.",
    subject: "Weekly Project Progress Update",
    header: "Operations Team",
    greeting: "Dear Client,",
    body: "Here is the weekly update. The development phase is on schedule, and we are preparing for the testing round.",
    footer: "Warmly, Project Management Office.",
    tags: ["Business", "Update", "Project"]
  },
  {
    id: "bus-followup",
    categoryId: "business",
    title: "Client Follow-up",
    description: "Follow up with a potential business lead.",
    subject: "Follow up: Business Partnership Discussion",
    header: "Sales Team",
    greeting: "Dear Client,",
    body: "I wanted to follow up on our discussion last week. Let me know if you have any questions about our pricing.",
    footer: "Kind regards, Sales Representative.",
    tags: ["Business", "Follow-up", "Sales"]
  },
  {
    id: "bus-invite",
    categoryId: "business",
    title: "Meeting Invitation",
    description: "Invite to a corporate business meeting.",
    subject: "Meeting Agenda: Weekly Review",
    header: "Operations Team",
    greeting: "Hi Team,",
    body: "We invite you to the weekly operational meeting to review key performance metrics and align on goals.",
    footer: "Sincerely, Operations Lead.",
    tags: ["Business", "Meeting", "Invite"]
  },
  {
    id: "bus-partnership",
    categoryId: "business",
    title: "Partnership Request",
    description: "Propose a professional partnership.",
    subject: "Partnership Proposal Request",
    header: "Strategic Partnerships Desk",
    greeting: "Dear Partner,",
    body: "We propose a strategic partnership to combine our software solutions. Let's schedule an intro call.",
    footer: "Best regards, Strategic Alliances Director.",
    tags: ["Business", "Partnership", "Proposal"]
  },

  // --- EDUCATION ---
  {
    id: "edu-admission",
    categoryId: "education",
    title: "Admission Letter",
    description: "Offer admission to a student.",
    subject: "Official Admission Selection Letter",
    header: "Admissions Office",
    greeting: "Dear Applicant,",
    body: "We are pleased to inform you that you have been admitted to our university course for the upcoming academic term.",
    footer: "Sincerely, Admissions Director.",
    tags: ["Education", "Admission", "Selection"]
  },
  {
    id: "edu-scholarship",
    categoryId: "education",
    title: "Scholarship Notification",
    description: "Notify a student of scholarship selection.",
    subject: "Scholarship Selection Notification",
    header: "Academic Office",
    greeting: "Dear Student,",
    body: "We are thrilled to inform you that you have been selected for the academic scholarship based on your scores.",
    footer: "Congratulations! Sincerely, Scholarship Committee.",
    tags: ["Education", "Scholarship", "Congrats"]
  },
  {
    id: "edu-internship",
    categoryId: "education",
    title: "Internship Selection",
    description: "Notify student about internship selection.",
    subject: "Internship Program Selection",
    header: "Placement Cell",
    greeting: "Dear Student,",
    body: "We are pleased to confirm your selection for the upcoming summer internship program with our partners.",
    footer: "Best regards, Placement Officer.",
    tags: ["Education", "Internship", "Selection"]
  },
  {
    id: "edu-hallticket",
    categoryId: "education",
    title: "Hall Ticket",
    description: "Release examination hall ticket.",
    subject: "Examination Hall Ticket Release",
    header: "Academic Office",
    greeting: "Dear Student,",
    body: "Please download your examination hall ticket from the portal link. Please check your roll number and details.",
    footer: "Regards, Controller of Examinations.",
    tags: ["Education", "Hall Ticket", "Exam"]
  },
  {
    id: "edu-schedule",
    categoryId: "education",
    title: "Exam Schedule",
    description: "Notify students of exam schedules.",
    subject: "Semester Exam Schedule Notice",
    header: "Academic Office",
    greeting: "Dear Students,",
    body: "Please find the detailed schedule for the upcoming semester examinations. The exams start on Monday at 9:00 AM.",
    footer: "Sincerely, Academic Dean.",
    tags: ["Education", "Exam", "Schedule"]
  },
  {
    id: "edu-result",
    categoryId: "education",
    title: "Result Notification",
    description: "Notify student of examination results.",
    subject: "Academic Grade / Result Announcement",
    header: "Academic Office",
    greeting: "Dear Student,",
    body: "Your grades have been uploaded to the portal database. Please log in to check your performance metrics.",
    footer: "Regards, Academic Registry.",
    tags: ["Education", "Result", "Grades"]
  },
  {
    id: "edu-workshop",
    categoryId: "education",
    title: "Workshop Invitation",
    description: "Invite students to an educational workshop.",
    subject: "Technical Hands-on Workshop Invitation",
    header: "Training Department",
    greeting: "Dear Student,",
    body: "We invite you to attend the hands-on technical workshop on full-stack coding. Registration is free but mandatory.",
    footer: "Sincerely, Training Coordinator.",
    tags: ["Education", "Workshop", "Training"]
  },
  {
    id: "edu-seminar",
    categoryId: "education",
    title: "Seminar Invitation",
    description: "Invite students to an academic seminar.",
    subject: "Academic Guest Seminar Invitation",
    header: "Academic Office",
    greeting: "Dear Colleague,",
    body: "We invite you to the guest lecture seminar on machine learning concepts. The lecture will be held in the main auditorium.",
    footer: "Regards, Department Head.",
    tags: ["Education", "Seminar", "Invite"]
  },
  {
    id: "edu-certificate",
    categoryId: "education",
    title: "Certificate",
    description: "Send participation or completion certificate.",
    subject: "Participation Certificate Delivery",
    header: "Training Department",
    greeting: "Dear Participant,",
    body: "Thank you for completing the training program. Please find your digital completion certificate attached.",
    footer: "Sincerely, Program Registry.",
    tags: ["Education", "Certificate", "Congrats"]
  },
  {
    id: "edu-recommendation",
    categoryId: "education",
    title: "Recommendation Letter",
    description: "Provide a formal academic recommendation letter.",
    subject: "Letter of Recommendation",
    header: "Academic Office",
    greeting: "To Whom It May Concern,",
    body: "I am writing to highly recommend this student. They have shown outstanding dedication during their project work under my supervision.",
    footer: "Best regards, Academic Advisor.",
    tags: ["Education", "Recommendation", "Letter"]
  },

  // --- LEGAL ---
  {
    id: "leg-notice",
    categoryId: "legal",
    title: "Legal Notice",
    description: "Draft a formal anonymous legal warning notice.",
    subject: "Official Legal Notice: Breach of Policy",
    header: "Corporate Legal Desk",
    greeting: "Attention Recipient,",
    body: "This is a formal legal notice regarding your actions. Please take immediate corrective steps to avoid formal arbitration.",
    footer: "Sent via Secure Legal Notification Desk.",
    tags: ["Legal", "Notice", "Warning"]
  },
  {
    id: "leg-compliance",
    categoryId: "legal",
    title: "Compliance Notice",
    description: "Request compliance update from developers/staff.",
    subject: "Security Compliance Review Notice",
    header: "Compliance Office",
    greeting: "Attention Team,",
    body: "We require a compliance review on recent database operations to ensure absolute user data privacy.",
    footer: "Sincerely, Compliance Department Officer.",
    tags: ["Legal", "Compliance", "Security"]
  },
  {
    id: "leg-policy",
    categoryId: "legal",
    title: "Policy Update",
    description: "Notify users of policy revisions.",
    subject: "Important Policy Revisions & Updates",
    header: "Corporate Legal Desk",
    greeting: "Dear Users,",
    body: "Please review the updated corporate policies regarding data usage and security protocols.",
    footer: "Sincerely, Legal & Policy Department.",
    tags: ["Legal", "Policy", "Update"]
  },
  {
    id: "leg-privacy",
    categoryId: "legal",
    title: "Privacy Notice",
    description: "Notify users of GDPR/CCPA updates.",
    subject: "Notice: Privacy Policy Updates",
    header: "Compliance Office",
    greeting: "Dear User,",
    body: "We have revised our Privacy Notice to align with global standards. Please read the terms to understand how we secure your data.",
    footer: "Best regards, Data Privacy Committee.",
    tags: ["Legal", "Privacy", "Compliance"]
  },
  {
    id: "leg-nda",
    categoryId: "legal",
    title: "NDA",
    description: "Standard corporate Non-Disclosure Agreement draft.",
    subject: "Non-Disclosure Agreement (NDA)",
    header: "Corporate Legal",
    greeting: "Dear Partner,",
    body: "This mutual Non-Disclosure Agreement binds both parties to absolute confidentiality regarding proprietary designs.",
    footer: "Sincerely, Legal Department.",
    tags: ["Legal", "NDA", "Contract"]
  },
  {
    id: "leg-terms",
    categoryId: "legal",
    title: "Terms Update",
    description: "Notify users of Terms of Service updates.",
    subject: "Terms of Service Update Notice",
    header: "Corporate Legal Desk",
    greeting: "Dear User,",
    body: "We are writing to notify you that our terms of service agreement will be updated starting next month.",
    footer: "Sincerely, Terms Compliance Desk.",
    tags: ["Legal", "Terms", "Update"]
  },
  {
    id: "leg-contract-notice",
    categoryId: "legal",
    title: "Contract Notice",
    description: "Formally notify about contract termination or renewal.",
    subject: "Formal Contract Renewal Notice",
    header: "Corporate Legal",
    greeting: "Dear Partner,",
    body: "Please find the formal notice for renewal of our mutual services agreement starting this quarter.",
    footer: "Sincerely, Contract Administrator.",
    tags: ["Legal", "Contract", "Notice"]
  },
  {
    id: "leg-case",
    categoryId: "legal",
    title: "Case Update",
    description: "Notify about legal case updates.",
    subject: "Legal Case Update",
    header: "Corporate Legal Desk",
    greeting: "Dear Partner,",
    body: "This is to inform you that our filing has been accepted. We will share the hearings schedule soon.",
    footer: "Best regards, Legal Advisor.",
    tags: ["Legal", "Case", "Update"]
  },

  // --- PERSONAL ---
  {
    id: "pers-birthday",
    categoryId: "personal",
    title: "Birthday Wishes",
    description: "Send birthday greetings anonymously.",
    subject: "Wishing you a very Happy Birthday! 🎂",
    header: "Greeting Card",
    greeting: "Hi there,",
    body: "I wanted to wish you a very happy birthday filled with joy, laughter, and success. Have a wonderful day!",
    footer: "Sent with warm wishes.",
    tags: ["Personal", "Birthday", "Greeting"]
  },
  {
    id: "pers-wedding",
    categoryId: "personal",
    title: "Wedding Invitation",
    description: "Invite someone to a wedding.",
    subject: "Wedding Invitation: Save the Date!",
    header: "Invitation",
    greeting: "Dear Friends,",
    body: "We invite you to celebrate our wedding. Save the date and join us for this special occasion.",
    footer: "Sent with love, Save the Date.",
    tags: ["Personal", "Wedding", "Invitation"]
  },
  {
    id: "pers-congrats",
    categoryId: "personal",
    title: "Congratulations",
    description: "Congratulate a friend anonymously.",
    subject: "Big Congratulations on your success!",
    header: "Personal Note",
    greeting: "Hey,",
    body: "I just heard the awesome news! Huge congratulations on this major milestone. You worked hard and deserved it.",
    footer: "Cheers! Sent with high regard.",
    tags: ["Personal", "Congrats", "Celebration"]
  },
  {
    id: "pers-thanks",
    categoryId: "personal",
    title: "Thank You",
    description: "Send a sincere thank you note.",
    subject: "Thank You Note",
    header: "Personal Note",
    greeting: "Hi,",
    body: "I am writing this to say a huge thank you for your help. Your kindness made a huge difference to me.",
    footer: "With gratitude,",
    tags: ["Personal", "Thank You", "Appreciation"]
  },
  {
    id: "pers-farewell",
    categoryId: "personal",
    title: "Farewell",
    description: "Send a farewell goodbye message.",
    subject: "Wishing you the best: Farewell!",
    header: "Personal Note",
    greeting: "Dear Colleague,",
    body: "As you move on to your next adventure, I want to say it was an honor working with you. Keep in touch!",
    footer: "With warm wishes for your future.",
    tags: ["Personal", "Farewell", "Exit"]
  },
  {
    id: "pers-apology",
    categoryId: "personal",
    title: "Apology",
    description: "Send a sincere personal apology.",
    subject: "Sincere Apology",
    header: "Personal Note",
    greeting: "Hi,",
    body: "I wanted to apologize for the misunderstanding last week. I value our connection and hope we can clear the air.",
    footer: "Warm regards,",
    tags: ["Personal", "Apology"]
  },
  {
    id: "pers-sympathy",
    categoryId: "personal",
    title: "Sympathy Message",
    description: "Send standard condolences note.",
    subject: "Sincere Condolences & Sympathy",
    header: "Personal Note",
    greeting: "Dear Friend,",
    body: "I am deeply sorry for your loss. My thoughts and prayers are with you and your family during this difficult time.",
    footer: "With deepest sympathy,",
    tags: ["Personal", "Sympathy"]
  },
  {
    id: "pers-invite",
    categoryId: "personal",
    title: "Invitation",
    description: "Invite someone to a gathering.",
    subject: "Gathering Invitation",
    header: "Invitation",
    greeting: "Hi,",
    body: "We are hosting a small get-together this weekend and would love for you to join us. Let me know if you can make it.",
    footer: "Warmly,",
    tags: ["Personal", "Invitation"]
  },
  {
    id: "pers-celebration",
    categoryId: "personal",
    title: "Celebration",
    description: "Invite to a personal celebration event.",
    subject: "Celebration Event Details",
    header: "Invitation",
    greeting: "Hey,",
    body: "Let's celebrate the new project milestone! Join us this Friday evening for drinks and dinner.",
    footer: "Cheers! RSVP link attached.",
    tags: ["Personal", "Celebration", "Event"]
  },
  {
    id: "pers-greeting",
    categoryId: "personal",
    title: "Greeting",
    description: "Send friendly personal holiday greetings.",
    subject: "Warm Holiday Greetings!",
    header: "Greeting Card",
    greeting: "Hi there,",
    body: "Wishing you a warm and joyful holiday season. May the new year bring peace and happiness to you and your loved ones.",
    footer: "Warmest wishes,",
    tags: ["Personal", "Greeting"]
  },

  // --- CUSTOM ---
  {
    id: "custom-blank",
    categoryId: "custom",
    title: "Blank Professional Template",
    description: "A blank canvas. Write everything yourself.",
    subject: "Professional Email Notification",
    header: "Operations Team",
    greeting: "Dear [Name],",
    body: "",
    footer: "Regards, [Name/Department]",
    tags: ["Custom", "Blank", "Professional"]
  }
];
