# Task B — Customer Objection Response

You are on an async Slack-style thread with the lead engineer at a mid-sized digital health company that is evaluating HealthEx. They send you the following message:

**From:** Jordan S., Senior Engineer @ Acme Health Apps

Hey — quick question before we proceed. Our patients are primarily on Epic and a handful of smaller regional EHRs. We’ve looked at building our own SMART on FHIR integrations directly with each EHR. It’s more engineering work up front, but we’d own the relationship and the connection. Why would we go through HealthEx instead of just building it ourselves? What’s the actual moat here beyond convenience?


*Write a reply that you would actually send in this situation. It should be honest, technically grounded, and not sound like a sales pitch. If there are scenarios where building direct would genuinely make more sense, you can acknowledge that — we would rather you be credible than evasive.*

**Format:** conversational async message (Slack / email register)  
**Length:** 150–300 words  
**Tone:** peer-to-peer, technically confident, not defensive

---

Hey Jordan — hope all is well. Great question, and thanks for reaching out. There are three main ways I would think about this.

First is scale. As you all grow, you inherently touch completely new consumer bases. These patient populations could have their health record in any number of different EHRs. Even if you build the integrations, they will take up a ton of your time. Scaling your product and user base comes with its own challenges. If you are spending all your time on integrations, you will not be able to serve your users at the product level. Let us deal with the grunt work; it will empower you all to build the important parts of your product.

Second, I am sure your team can build the integrations, but it will inherently introduce onboarding time for each new EHR. Users have to wait for you to finish the integration before they can start using the product. This limits the potential virality of your app. The set of patients who can potentially download and start using it is predefined. The value we introduce is uncapping your upside by allowing any patient in the world to start using you guys seamlessly.

Third is completeness. In our experience, no patient's entire history lives in a single record. While your current consumer base may be mostly Epic and smaller EHRs, what about their one-off visits while they traveled? What if they lived somewhere else previously? You run the risk of missing interactions they had that might prove very valuable for your application.

These are just the first things that popped into my head - let me know if you want to talk more or hop on a call. Happy to keep discussing tradeoffs. 