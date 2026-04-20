HealthEx
Technical Candidate Exercise
TSE / Software Developer Intern — Engineering Team
	

Time commitment
	2–4 hours total, completed asynchronously at your convenience
	Submission format
	GitHub repo (code) + PDF/Doc (written deliverables) — or a single shared folder
	Submission deadline
	Please return at least 48 hours before your scheduled in-person presentation
	Presentation slot
	60 minutes in-person with the HealthEx team on Thursday, Apr 23
	Questions?
	Email anand@healthex.io  — clarifying questions are encouraged
	

Context & What We’re Looking For
This is a hybrid role that sits at the intersection of software engineering and technical customer engagement. On any given week you might be building a FHIR integration, writing a demo script for a health plan prospect, debugging a customer’s MCP data pipeline, or explaining TEFCA data refresh patterns and CCDA -> FHIR normalization to a CTO who’s trying to make a decision between HealthEx and the competition. The exercise is designed to surface how you think and communicate across both of those worlds.


A note on expected knowledge and using AI
You are not expected to walk in with comprehensive clinical or healthcare industry knowledge. What we want to see is how quickly you get oriented in this domain based on existing knowledge and experience, how you reason through ambiguity, and how clearly you communicate what you do and don’t know. You are also free to use AI as you see fit, as long as you clearly identify where AI was used in your answers.
	

Exercise Overview
The exercise has two parts. Part 1 is a technical build (weighted ~70% of the evaluation); Part 2 is a customer-facing communication challenge (weighted ~30%). Both should be completed before your in-person presentation, where you will walk the team through your work and take questions.


Part 1 — Technical Build  (approx. 2 hrs for min requirements)
	

Background
HealthEx is a consumer-driven health data platform that helps patients access, control, and share their medical records across healthcare providers. A core part of what we do is connecting to national data exchanges and FHIR endpoints, fetching structured health data, and surfacing it in ways that are useful to patients and the downstream businesses and applications they authorize.
For this exercise, you will use the HealthEx FHIR APIs + a test patient (Allison Hackett) to build a functional tool that demonstrates your ability to work with our APIs + FHIR data in code, and in an AI context.


Public API endpoint
GET https://api.healthex.io/FHIR/R4/


Full documentation at https://docs.healthex.io/fhir-server, and https://docs.healthex.io/category/healthex-mcp-server 
	

The Task
1. Build a simple WebUI that displays a patient’s clinical history in an easy to understand manner. 
2. Build a Claude AI skill that uses the HealthEx MCP server to surface gaps in my immunization history and proposes a corrective schedule of actions to take


Required (must complete all three)
1. Fetch a Patient’s record from the HealthEx FHIR server. You may use your own records (starting from app.HealthEx.io), an existing test patient ID found in the documentation (suggest Allison Hackett), or create a synthetic patient of your own using a POST request.
2. Retrieve and display a structured health summary for that patient using at least two FHIR resource types from the following set: Observation (e.g. lab results, vitals), MedicationRequest, Condition, AllergyIntolerance, Immunization, or DocumentReference. The summary should be presented in a clean, readable format — not raw JSON.
3. Develop a Claude AI skill that sits on top of the HealthEx MCP connector, available today to all Claude Pro or Claude Max users (ask for a code if you have access to neither). The skill should check immunization history from all time, identify gaps relative to an accredited recommendation source (ex, CDC or European equivalent) and propose a plan for corrective actions to be taken by the user.
Optional stretch goal (not required, but appreciated if time permits)
* Surface at least one data quality or completeness issue you observed in the data and suggest how you would handle it in a production setting.
* Write a unit test or two for the most critical logic in your tool.
* Any other creative AI skill extensions or experiments
Submission
* Language / framework: Your choice. TypeScript is in active use at HealthEx, but we will also evaluate Python or Java or anything else you choose.
* Code quality: Treat this as you would a real PR — readable variable names, brief comments where the logic isn’t self-evident, and a short README explaining how to run it.
* GitHub: Push to a public or unlisted GitHub repo and include the link in your submission. Commit history is part of the signal.
* README: Include (1) setup/run instructions, (2) a short paragraph on any tradeoffs or decisions you made, and (3) what you would do differently with more time.


Part 2 — Customer Communication  (approx. 45 min–1 hr)
	

Background
A major part of the role is serving as the technical bridge between HealthEx’s platform and our customers — which include health systems, payers, AI labs, and digital health companies. You need to be able to explain complex interoperability concepts to audiences who may have zero familiarity with FHIR, translate customer confusion into actionable engineering tickets, and write the kind of clear, crisp documentation that makes customers feel confident they are in expert hands.


Task A — Technical Explainer  (one page max)
A regional hospital system has agreed to integrate with HealthEx’s platform. Their VP of IT — a smart, business-oriented leader with no FHIR background — has asked for a plain-English explanation of the following before their next steering committee meeting:


“Why can’t we just return a PDF of the patient’s chart to them, and why does all this FHIR stuff matter?”
	

Write a one-page (max) explainer that answers this question clearly. You are not writing a technical spec — you are writing something the VP will actually read and find useful. No bullet soup. Bonus points for a clean visual or analogy if it genuinely helps.
* Audience: non-technical executive, smart, time-pressed
* Format: one page, prose-first, any layout you like (Word, PDF — your choice)
* Length: hard cap at one page / ~500 words


Task B — Customer Objection Response  (short written reply)
You are on an async Slack-style thread with the lead engineer at a mid-sized digital health company that is evaluating HealthEx. They send you the following message:


From: Jordan S., Senior Engineer @ Acme Health Apps
Hey — quick question before we proceed. Our patients are primarily on Epic and a handful of smaller regional EHRs. We’ve looked at building our own SMART on FHIR integrations directly with each EHR. It’s more engineering work up front, but we’d own the relationship and the connection. Why would we go through HealthEx instead of just building it ourselves? What’s the actual moat here beyond convenience?
	

Write a reply that you would actually send in this situation. It should be honest, technically grounded, and not sound like a sales pitch. If there are scenarios where building direct would genuinely make more sense, you can acknowledge that — we would rather you be credible than evasive.
* Format: conversational async message (Slack / email register)
* Length: 150–300 words
* Tone: peer-to-peer, technically confident, not defensive


In-Person Presentation Guide
	

Format
Your presentation slot is 60 minutes total, approximately structured as follows:


Time
	Activity
	Who leads
	0–10 min
	Walk us through your code — share your screen. Explain what it does, decisions you made, and anything you’d do differently.
	You
	10–25 min
	Engineering Q&A on the build. Expect questions on code, error handling, FHIR data model choices.
	SWE peers + Anand
	25-30 min
	Present your Task A explainer and Task B reply. Walk us through your thinking.
	You
	30-45 min
	Customer communication Q&A. We may put you in a live scenario.
	Sales, CS, PM, Anand
	45-60 min
	Open conversation — your questions for us, culture, roadmap, role.
	Everyone
	  
What to Prepare
* Code walkthrough: You do not need slides for the code. Just be ready to share your screen and walk through it conversationally.
* For the written deliverables: A screen share or printed copy is fine. You don’t need a formal presentation deck.
* Questions for us: We expect you to come with genuine questions. This is also an evaluation of how you think about the role, the market, and the company.






HealthEx — Candidate Exercise BriefConfidentialPage