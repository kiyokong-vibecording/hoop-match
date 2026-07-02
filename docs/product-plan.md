# Hoop Match Product Plan

## Target users

- U12, U15, and U18 teams managed by adult representatives
- School and community teams
- University circles
- Adult amateur and casual basketball teams
- Pickup organizers

Professional teams and competitive club teams are outside the initial target.

## Core positioning

Hoop Match helps users find basketball opponents without being buried under ordinary member recruitment posts.

## MVP scope

1. Listing type filter
2. Opponent listing creation
3. Member listing creation
4. Prefecture to municipality location filtering
5. Basketball facility search
6. Facility source URL and last-checked date
7. JSON export/import
8. Safety checklist

## Listing types

- Opponent
- Member
- Helper
- Pickup
- Joint practice

Youth categories are split by gender:

- U12 boys
- U12 girls
- U15 boys
- U15 girls
- U18 boys
- U18 girls

## Facility information

The app provides a basketball facility search surface and stores user-managed notes for:

- Facility name
- Area
- Prefecture
- Municipality
- Reservation method
- Official reservation URL
- Last-checked date
- Court count
- Basket/ring condition
- Parking
- Changing rooms
- Air conditioning
- Floor condition
- Cost notes

Facility search filters:

- Prefecture
- Municipality, including municipalities with no registered facility data yet
- Reservation method
- Keyword across facility name and notes

The prototype bundles a static municipality master with 47 prefectures and 1,895 city/ward/town/village-level options so users can select areas before facility data exists. Before public release, verify the master against official local government code data and define an update process.

Do not scrape live availability until each facility or reservation site's terms have been checked.

Initial facility catalog sources:

- Setagaya Sports Foundation facility list: https://www.se-sports.or.jp/facility/
- Setagaya General Sports Ground Gymnasium: https://www.se-sports.or.jp/facilityinfo/sougou-gym/
- Oyamadai Community Gymnasium: https://www.se-sports.or.jp/facilityinfo/oyamadai-gym/
- Hachimanyama Elementary School Community Gymnasium: https://www.se-sports.or.jp/facilityinfo/hatimanyama-gym/
- Setagaya public facility reservation guidance: https://www.city.setagaya.lg.jp/mokuji/kusei/012/015/001/002/d00125065.html

Generated hero image prompt:

Create a polished, energetic basketball court scene for a Japanese amateur basketball matching app. Bright indoor gym, polished wood floor, clean court lines, basketball near the foreground, subtle motion, no identifiable faces, high-quality editorial sports photography, no logos, no text, no watermark.

## Later phases

- Team profile pages
- Adult representative verification
- Review and cancellation history
- One-time share links
- Optional cloud sync
- Moderator tools
- Payment collection only after legal review
