# Hoop Match Legal and Safety Checklist

This is a product checklist, not legal advice. Before a public release, have a qualified Japanese lawyer review the actual app, terms, privacy policy, and operating flow.

## Privacy design

- Collect the minimum data required for matching.
- Avoid collecting player names, student IDs, school classes, addresses, phone numbers, health data, and face photos in the MVP.
- Store MVP data on the user's device only.
- Make export files user-controlled and warn that exported JSON may contain personal or team information.
- Publish a privacy policy before any hosted or shared service is launched.
- Define retention and deletion rules before cloud sync is added.
- Log access and admin actions if server-side moderation is introduced.

## Minor protection

- U12, U15, and U18 listings must be managed by an adult representative, coach, teacher, or guardian.
- Do not allow direct messages to minor players.
- Do not expose exact school names, home addresses, or personal contact details by default.
- Keep contact between team representatives.
- Add report, block, and emergency escalation flows before public matching.
- Provide terms that prohibit harassment, scouting pressure, sexual solicitation, commercial solicitation, violence, discriminatory conduct, and unauthorized photography.

## Commercial and platform review

- If charging fees, subscriptions, or commissions, review Specified Commercial Transactions Act display requirements.
- If payments are introduced, review payment service provider terms and cancellation/refund handling.
- If ads or sponsorships are introduced, review data use, targeting, and age-sensitive ad placement.
- If app stores are used, review Apple and Google policies for user-generated content, minors, privacy labels, and account deletion.

## Facility information

- Store official reservation URLs and user notes.
- Do not copy facility text, photos, or schedules without permission.
- Do not scrape reservation availability unless the relevant terms allow it.
- Add a "last checked" field for user-entered facility notes.
- Show that reservation rules, fees, and availability must be confirmed on the official site.

## Research sources to verify before launch

- Personal Information Protection Commission: https://www.ppc.go.jp/
- Personal Information Protection Act materials and guidelines: https://www.ppc.go.jp/personalinfo/legal/
- Consumer Affairs Agency transaction guidance: https://www.no-trouble.caa.go.jp/
- e-Gov laws search: https://elaws.e-gov.go.jp/
- JBA safety policy: https://www.japanbasketball.jp/jba/safety/
- JBA U15 category: https://u15.japanbasketball.jp/
- JBA U18 category: https://u18.japanbasketball.jp/

## Public launch blockers

- Lawyer-reviewed terms of service
- Lawyer-reviewed privacy policy
- Moderation policy
- Abuse report process
- Account deletion process
- Incident response plan
- Personal data breach response process
- Adult representative verification design for youth teams
