# Spec Delta

## MODIFIED Requirements

### Requirement: Inline birth-details form
When an astrology reading needs birth details that are not saved, the application SHALL lay out an app-owned birth-details message from that teller, whose kind and payload never come from model output. In the chat the message SHALL show the teller's invitation and a card with an "Add birth details" button; once submitted, the card SHALL show "Submitted" and no button, and once set aside it SHALL say so. The button SHALL open the form full screen with date, time, place and consent fields and a "Read my chart" button that is disabled until all four are filled. Submitting it SHALL save the profile, close the form and produce the reading; a failed submission SHALL leave the form open with the error shown. Closing the form without submitting SHALL leave the message open.

#### Scenario: Form appears in the chat
- **GIVEN** no birth details are saved
- **WHEN** the owner asks Astra for a reading
- **THEN** a birth-details message from Astra appears with her invitation and an "Add birth details" button

#### Scenario: Opening and closing the form
- **WHEN** the owner presses "Add birth details" and then closes the form
- **THEN** the full-screen form opened and closed, and the message still offers "Add birth details"

#### Scenario: Submitting from the full-screen form
- **WHEN** the owner fills the date, time and place, ticks consent and presses "Read my chart"
- **THEN** the form closes, the card shows "Submitted" and Astra's reading follows

#### Scenario: Submitting twice
- **GIVEN** the form was already submitted and the reading given
- **WHEN** the same form is submitted again
- **THEN** it is rejected with a 409 and no second reading is made

#### Scenario: Form survives a reload
- **GIVEN** an unsubmitted form
- **WHEN** the page is reloaded
- **THEN** the message still offers "Add birth details"

#### Scenario: A newer request closes the form
- **GIVEN** an open form from Astra
- **WHEN** Astra lays out a new form
- **THEN** the earlier one is set aside, says so, and cannot be opened or submitted
