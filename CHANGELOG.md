# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.9.1] - 2025-02-14
- Fix:
  - Connected callback after all subscriptions are setup

## [1.9.0] - 2025-02-11
- Feat:
  - WebSocket connected callback

## [1.8.0] - 2024-12-17
- Feat:
  - get module config
  - `x-venue` in websocket subscriptions

## [1.7.1] - 2024-10-28
- Fix:
  - websocket connecting without access token
  - clear refresh_token only on 4XX with invalid_grant response
- Chore:
  - Update dependencies

## [1.7.0] - 2024-09-10
- Feat:
  - notify on refresh token expiry/invalid
  - support multiple, concurrent tenants

## [1.6.1] - 2024-06-20
- Chore:
  - update ws version (high vulnerability)

## [1.6.0] - 2024-06-14
- Feat
  - handle non JWT refresh_token (change in auth-oauth2)
- Chore:
  - pnpm
  - update deps

## [1.5.1] - 2024-03-27
- Fix
  - access token expiry checking
  - refresh token expiry checking
  - orders update callback on empty orders

## [1.5.0] - 2024-03-08
- Fix
  - Closed orders not removed from order store upon PULL
- Feature:
  - option to get not completed orders for user

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

