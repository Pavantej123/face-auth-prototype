# Face Authentication Prototype - Product Requirements Document

## Project Overview

Build a web-based face authentication prototype that allows users to:

1. Register using email and face.
2. Login using email and face verification.
3. Access a protected dashboard after successful verification.

This project is intended as a prototype for demonstration and learning purposes.

---

## Goal

Demonstrate a complete face verification workflow using modern web technologies and AI-assisted development.

---

## Target Users

* Internal users
* Demo users
* Internship project reviewers

---

## Functional Requirements

### Registration

User should be able to:

* Enter email address
* Capture face using webcam
* Submit registration request
* Store facial embedding

### Login

User should be able to:

* Enter email address
* Capture face using webcam
* Verify against stored embedding
* Receive success or failure response

### Dashboard

User should:

* View a welcome page after successful login

---

## Non-Functional Requirements

* Must run on CPU-only hardware
* Must run on 8GB RAM
* Must use free and open-source tools
* Must be simple enough to complete within 2 days

---

## Out Of Scope

The following features are excluded:

* OTP verification
* Multi-factor authentication
* Mobile applications
* Deepfake detection
* Advanced liveness detection
* Cloud deployment
* Social login
* Admin panel

---

## Success Criteria

A user can:

1. Register face successfully.
2. Login using face verification.
3. Access dashboard after successful verification.
