# Claude Relay Service (Fork)

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

**Fork of [Wei-Shaw/claude-relay-service](https://github.com/Wei-Shaw/claude-relay-service) with additional features**

</div>

---

## Credits

This project is forked from [Wei-Shaw/claude-relay-service](https://github.com/Wei-Shaw/claude-relay-service). All credit for the core functionality goes to the original author.

For full documentation, deployment guides, and usage instructions, please refer to the [upstream repository](https://github.com/Wei-Shaw/claude-relay-service).

---

## New Features in This Fork

### Request Logs
- Detailed request logging with cost breakdown
- View token usage, model, and account info per request
- Cost analysis with pricing details

### Account-Level Pricing Multiplier
- Set custom pricing multiplier per account
- Useful for cost tracking across different subscription tiers

### Account Summary
- Quick overview of all accounts status
- At-a-glance health monitoring

### Enhanced Failover
- Temporarily unavailable accounts are automatically skipped
- Improved reliability with smarter account rotation

### CI/CD Automation
- Automated upstream sync workflow
- Auto-build Docker images on push

---

## Docker Image

```bash
docker pull ghcr.io/jillvernus/claude-relay-service:dev
docker pull ghcr.io/jillvernus/claude-relay-service:1.1.224-jv-v1.13
```

---

## License

This project is licensed under the [MIT License](LICENSE), same as the upstream project.
