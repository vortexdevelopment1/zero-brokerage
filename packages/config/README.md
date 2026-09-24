# Config Package

## Purpose

Shared configuration contracts and utilities used across the Zero Brokerage monorepo.

## Scope

- Shared environment definitions
- Configuration contracts and typed access
- Safe default values
- Shared runtime constants
- Feature flag definitions and configuration utilities

## Responsibilities

This package defines configuration contracts.

Platform-specific configuration loading remains in the consuming application when the platform requires it. For example, the User Mobile App may adapt Expo's environment/configuration system to the shared configuration contracts defined here.

## Security

Secrets must not be exposed through client applications or public environment variables.

Client applications may consume configuration values that are intentionally public, such as an API base URL.

## Implementation Status

Initial shared configuration contracts are implemented. Platform-specific configuration adapters will be added by the consuming applications as required.
