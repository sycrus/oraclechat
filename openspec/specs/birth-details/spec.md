## Purpose

Lets the owner save their birth date, time and place once, with explicit consent, so the astrology teller can compute their chart. It covers how the details are captured, stored, looked up offline, viewed, changed and deleted.

## Requirements

### Requirement: One consented birth profile
The application SHALL store at most one birth profile, locally, containing a birth date, a birth time to the minute and a birth place chosen from the place list. A profile SHALL be saved only when the save request carries explicit consent to keep the details for astrology readings. Saving SHALL NOT require memory consent.

#### Scenario: Save with consent
- **WHEN** the owner submits a date, a time, a listed place and the consent checkbox
- **THEN** the profile is saved and survives a restart

#### Scenario: Save without consent
- **WHEN** a save request omits consent
- **THEN** it is rejected with a 400 and nothing is saved

#### Scenario: Memory consent is off
- **GIVEN** memory consent is off
- **WHEN** the owner saves birth details with consent
- **THEN** the profile is saved and no memory is created

### Requirement: Validated birth details
The application SHALL reject a birth date that is not a real calendar date, is in the future or is before 1800; a time outside 00:00 to 23:59; and a place that is not in the bundled place list. A rejected request SHALL leave any saved profile unchanged.

#### Scenario: Impossible date
- **WHEN** the owner submits 1990-02-30
- **THEN** it is rejected and the saved profile is unchanged

#### Scenario: Unlisted place
- **WHEN** a save request names a place that is not in the place list
- **THEN** it is rejected with a 400

### Requirement: Offline place lookup
The application SHALL offer a type-ahead search over a bundled list of cities, returning each match's name, region, country, latitude, longitude and time zone. The lookup SHALL make no network request, and the list's attribution SHALL be shown where places are chosen.

#### Scenario: Search a city
- **WHEN** the owner types "san fr"
- **THEN** San Francisco, California, United States is among the matches with its coordinates and the America/Los_Angeles time zone

#### Scenario: Same-named cities
- **WHEN** the owner types "springfield"
- **THEN** each match shows its region and country so the owner can tell them apart

#### Scenario: No network
- **GIVEN** the computer is offline
- **WHEN** the owner searches for a place
- **THEN** matches are returned

### Requirement: View, change and delete birth details
The profile panel SHALL show the saved date, time and place, let the owner change them and delete them. Changing them SHALL affect only later readings. Deleting them SHALL remove the profile; readings already given SHALL remain in their conversations.

#### Scenario: Change details
- **GIVEN** a saved profile and an earlier astrology reading
- **WHEN** the owner changes the birth time
- **THEN** the next reading uses the new time and the earlier reading is unchanged

#### Scenario: Delete details
- **WHEN** the owner deletes their birth details
- **THEN** no profile is saved and Astra's next reading request shows the birth-details form

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

### Requirement: Birth details stay private
Birth details SHALL NOT be sent to memory extraction, to any teller or hosted model, to web search, or into chat messages, and traces and logs SHALL NOT contain them. Only the computed chart reaches a teller, as the astrology spec limits it. Form submissions SHALL NOT become user messages.

#### Scenario: Form submission is not chat
- **WHEN** the owner submits the inline form
- **THEN** no user message is added and memory extraction does not run on it

#### Scenario: Traced without content
- **WHEN** a profile is saved or a chart is computed
- **THEN** the span records that it happened and no date, time, place or coordinate
