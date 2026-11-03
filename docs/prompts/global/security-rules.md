# Security Rules

Use this prompt for security-sensitive work.

## Prompt

STREM handles identity, performance, location-adjacent activity, recovery, fueling, calendar availability, and health-adjacent data. Treat trust as a product feature.

Check:

- authentication
- authorization
- session handling
- secrets
- logging
- data minimization
- GDPR implications
- user deletion/export implications
- AI prompt injection
- AI unsafe advice
- dependency risk
- payment or marketplace risk later

Rules:

- never commit secrets
- never log tokens or passwords
- avoid logging sensitive health-adjacent content
- require explicit consent for sensitive data use
- use least privilege
- add audit trails for sensitive operations
- fail safely

AI-specific:

- avoid medical diagnosis
- avoid eating disorder reinforcement
- avoid unsafe training jumps
- recommend professional support for risk signals
- disclose uncertainty when context is limited
