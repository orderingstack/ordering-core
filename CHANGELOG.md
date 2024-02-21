# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2024-02-21
- Fix
  - WebSocket reconnect upon get token error (exponential backoff)
- Feature:
 - app insights WebSocket debug

## [1.3.1] - 2023-11-02
- Security
  - return websocket deactivate function
  - dependencies update

## [1.3.0] - 2023-10-12
- Feature:
  - steering commands

## [1.3.0] - 2023-10-12
- Feature:
  - steering commands

## [1.2.0] - 2023-09-13
- Feature:
  - use mutex to limit API calls when multiple authProvider() requests are made before 1st call is resolved

