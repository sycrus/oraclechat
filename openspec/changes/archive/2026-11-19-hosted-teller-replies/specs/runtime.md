## MODIFIED Requirements

### Requirement: Local model is the default

The application SHALL use the configured Ollama OpenAI-compatible endpoint by default. It SHALL NOT fall back to a hosted model when local inference fails, nor to the local model when a hosted call fails. A hosted model SHALL be used only for teller replies, and only when `HOSTED_BASE_URL`, `HOSTED_API_KEY` and `HOSTED_MODEL` are all configured; a partial configuration SHALL stop startup. Routing, memory extraction and embeddings SHALL always use the local endpoint.

#### Scenario: Local model call needs no paid API key

- GIVEN the local runtime is configured with an Ollama URL and model name
- AND no hosted provider is configured
- WHEN an agent run is made
- THEN the request is sent to the configured local endpoint
- AND no request is sent to a hosted endpoint

#### Scenario: Local inference failure does not call a hosted model

- GIVEN the local endpoint is unavailable
- WHEN an agent run is made in the default local profile
- THEN the run returns a local-provider error
- AND no hosted provider is used as fallback

## ADDED Requirements

### Requirement: Optional hosted teller replies

When a hosted provider is fully configured, teller replies SHALL stream from that OpenAI-compatible endpoint with its API key, without a local reasoning setting. A failed hosted reply SHALL end the turn with an error and SHALL NOT be retried locally. The API key SHALL NOT appear in API responses, logs or traces. Reply spans SHALL record whether the reply was hosted.

#### Scenario: Hosted replies, local routing
- **WHEN** a hosted provider is configured and the user sends a message
- **THEN** each teller reply is requested from the hosted endpoint with the configured key
- **AND** the routing call goes to the local endpoint

#### Scenario: Partial configuration
- **WHEN** only some hosted variables are set
- **THEN** the backend refuses to start and names the missing variables without showing the key

#### Scenario: Hosted failure
- **WHEN** a hosted reply fails
- **THEN** the turn ends with an error event
- **AND** no local reply is attempted

#### Scenario: Hosted replies are visible
- **WHEN** hosted replies are configured
- **THEN** the UI shows "Hosted model" instead of "Local models"
