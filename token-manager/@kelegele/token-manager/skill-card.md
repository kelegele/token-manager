## Description:

Universal LLM Token Manager - Monitor usage and provide cost-saving recommendations for Kimi, OpenAI, Anthropic, Gemini, and local models. Features scheduled monitoring, cross-session tracking, and proactive alerts.

This skill is ready for commercial/non-commercial use.

## Publisher:

[kelegele](https://clawhub.ai/user/kelegele)

### License/Terms of Use:


## Use Case:

Developers and agents use Token Manager to monitor LLM token usage and costs, query supported provider balances, estimate spend, set scheduled balance alerts, and generate cross-session usage reports.

### Deployment Geography for Use:

Global

## Known Risks and Mitigations:

Risk: The security summary says API-key handling can expose credentials in ways users would not expect.

Mitigation: Use environment variables instead of command-line API key arguments, avoid running with unrelated provider keys in the environment, and rotate any key that may have appeared in shell history or logs.

Risk: The tool stores usage metadata and configuration locally under .data.

Mitigation: Review and remove .data/config.json, token history, alert state, and session data before sharing the workspace or using balance checks on another account.

Risk: Balance checks make provider API calls using available credentials.

Mitigation: Run only with the intended provider credentials and confirm the configured provider before enabling scheduled checks.

## Reference(s):

- [ClawHub skill page](https://clawhub.ai/kelegele/skills/token-manager)

## Skill Output:

**Output Type(s):** [text, markdown, shell commands, configuration, guidance]

**Output Format:** [Markdown guidance with shell commands and JSON command output]

**Output Parameters:** [1D]

**Other Properties Related to Output:** [Produces local usage, balance, alert, history, and recommendation data; command output is JSON where scripts are invoked directly.]

## Skill Version(s):

1.2.0 (source: ClawHub release metadata)

## Ethical Considerations:

Users should evaluate whether this skill is appropriate for their environment, review any generated or modified files before relying on them, and apply their organization's safety, security, and compliance requirements before deployment.
