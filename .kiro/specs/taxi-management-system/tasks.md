# Implementation Plan: Taxi Management System

## Overview

This implementation plan breaks down the taxi management system into discrete coding tasks that build incrementally. The approach follows the microservices-inspired architecture with clear separation between the Telegram bot service, web API, and real-time synchronization layer. Each task builds on previous work and includes comprehensive testing to ensure correctness.

## Tasks

- [x] 1. Project Setup and Database Foundation
  - Create project structure with backend and frontend directories
  - Initialize Node.js backend with Express.js, SQLite3, and Sequelize
  - Set up React frontend with Vite, Material-UI, and Redux Toolkit
  - Configure environment variables and basic project configuration
  - _Requirements: Foundation for all system components_

- [x] 1.1 Database Models and Relationships
  - Create Sequelize models for Users, Branches, Passengers, Couriers, Shifts, and Assignments
  - Define model relationships and associations
  - Create database migrations and indexes for performance
  - Set up database connection and configuration
  - _Requirements: 1.6, 2.5, 2.7, 3.6_

- [ ]* 1.2 Write property tests for database models
  - **Property 3: User Data Persistence with Uniqueness**
  - **Property 5: Shift Data Persistence**
  - **Property 6: Daily Shift Record Maintenance**
  - **Validates: Requirements 1.6, 2.5, 2.7**

- [x] 2. Authentication and Security Foundation
  - Implement JWT token generation and validation
  - Create authentication middleware for API routes
  - Set up admin configuration system with hash keys
  - Implement input validation schemas using Joi
  - _Requirements: 1.4, 3.1, 8.1, 8.2_

- [ ]* 2.1 Write property tests for authentication
  - **Property 1: Admin Authorization Validation**
  - **Property 7: JWT Authentication Validation**
  - **Property 2: Input Validation Consistency**
  - **Validates: Requirements 1.4, 3.1, 8.1, 8.2**

- [x] 3. Telegram Bot Core Implementation
  - Set up node-telegram-bot-api with webhook configuration
  - Implement bot command handlers for /start and basic navigation
  - Create keyboard layouts for user interactions
  - Set up bot scene management for conversation flows
  - _Requirements: 1.1, 1.7, 2.3, 2.4, 2.6_

- [x] 3.1 User Registration System
  - Implement registration flows for Passenger, Courier, and Admin roles
  - Create data collection scenes for each user type
  - Add validation for registration data (phone, license plate, etc.)
  - Integrate with database to save user data
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ]* 3.2 Write property tests for registration system
  - **Property 1: Admin Authorization Validation**
  - **Property 2: Input Validation Consistency**
  - **Property 3: User Data Persistence with Uniqueness**
  - **Validates: Requirements 1.4, 1.5, 1.6**

- [x] 4. Shift Management System
  - Implement shift registration flow in Telegram bot
  - Add work schedule checking logic
  - Create address selection (standard vs new address)
  - Implement shift data persistence and retrieval
  - _Requirements: 2.1, 2.2, 2.5, 2.7, 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ]* 4.1 Write property tests for shift management
  - **Property 4: Work Schedule Validation**
  - **Property 5: Shift Data Persistence**
  - **Property 53: Standard Address Usage**
  - **Property 54: Standard Address Update**
  - **Validates: Requirements 2.1, 2.5, 14.2, 14.4**

- [x] 5. Checkpoint - Core Bot Functionality
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Web API Implementation
  - Create REST API endpoints for authentication, users, shifts, and assignments
  - Implement CORS configuration and security middleware
  - Add API route handlers with proper error handling
  - Set up request validation and response formatting
  - _Requirements: 3.1, 3.2, 8.2, 8.4, 9.4_

- [x] 6.1 Assignment Management API
  - Implement assignment CRUD operations
  - Add branch-based filtering for couriers and passengers
  - Create assignment validation logic (same branch, working today)
  - Implement multiple passenger assignment support
  - _Requirements: 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ]* 6.2 Write property tests for assignment API
  - **Property 8: Branch-Based Courier Filtering**
  - **Property 9: Branch-Based Passenger Filtering**
  - **Property 11: Multiple Passenger Assignment Support**
  - **Property 12: Cross-Branch Assignment Prevention**
  - **Validates: Requirements 3.4, 3.5, 3.7, 3.8**

- [x] 7. Real-time Synchronization with WebSocket
  - Set up Socket.io server integration with Express
  - Implement WebSocket authentication and room management
  - Create event broadcasting for assignment and shift changes
  - Add automatic reconnection and data sync logic
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ]* 7.1 Write property tests for real-time sync
  - **Property 21: Web-to-Bot Synchronization**
  - **Property 22: Bot-to-Web Synchronization**
  - **Property 23: User Data Change Broadcasting**
  - **Property 24: Data Consistency Across Interfaces**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.5**

- [x] 8. Notification System
  - Implement notification service for assignment changes
  - Create message formatting with emojis and structure
  - Add immediate notification delivery after assignment changes
  - Integrate change detection for post-assignment modifications
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 12.3, 12.4, 12.5, 12.6_

- [ ]* 8.1 Write property tests for notifications
  - **Property 13: Passenger Assignment Notifications**
  - **Property 14: Courier Assignment Notifications**
  - **Property 15: Assignment Change Detection and Admin Notification**
  - **Property 17: Notification Message Formatting**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.5**

- [x] 9. Assignment Viewing and Confirmation
  - Implement "Who is driving me" and "Who am I driving" features
  - Add courier availability confirmation system
  - Create assignment status tracking and updates
  - Implement reminder system for unconfirmed assignments
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ]* 9.1 Write property tests for assignment viewing
  - **Property 19: Current Date Assignment Filtering**
  - **Property 20: Real-time Assignment Data Display**
  - **Property 50: Courier Confirmation Request**
  - **Property 51: Assignment Confirmation Processing**
  - **Validates: Requirements 5.4, 5.5, 13.1, 13.2, 13.3**

- [x] 10. Checkpoint - Backend Core Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. React Frontend Foundation
  - Set up React application with Material-UI theme
  - Create authentication components and login flow
  - Implement Redux store with auth, schedule, and employee slices
  - Set up React Router for navigation
  - _Requirements: 3.1, 11.1, 11.5_

- [x] 11.1 Web Interface Layout and Navigation
  - Create sidebar with branch list and expansion functionality
  - Implement courier and passenger selection with highlighting
  - Add header with navigation buttons and user info
  - Create responsive layout with collapsible sections
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [ ]* 11.2 Write unit tests for web interface components
  - Test sidebar branch expansion and selection
  - Test header navigation and button functionality
  - Test responsive layout behavior
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 12. AG-Grid Schedule Management
  - Set up AG-Grid with assignment data display
  - Implement cell editors for courier and passenger assignment
  - Add modal dialogs for assignment editing
  - Create real-time data updates via WebSocket
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ]* 12.1 Write property tests for schedule grid
  - **Property 8: Branch-Based Courier Filtering**
  - **Property 9: Branch-Based Passenger Filtering**
  - **Property 10: Assignment Database Update and Notification**
  - **Validates: Requirements 3.4, 3.5, 3.6**

- [x] 13. Employee Management Interface
  - Create employee list with filtering and search
  - Implement employee detail views and editing
  - Add user management functionality (create, update, delete)
  - Integrate with real-time updates for employee changes
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ]* 13.1 Write property tests for employee management
  - **Property 40: Profile Data Validation**
  - **Property 41: Profile Update with Confirmation**
  - **Property 42: Critical Field Protection**
  - **Property 43: Profile Change Audit Trail**
  - **Validates: Requirements 10.3, 10.4, 10.5, 10.6**

- [ ] 14. Route Optimization Service (Beta)
  - Integrate GraphHopper API for route calculation
  - Implement address collection and geocoding
  - Create route optimization algorithms
  - Add route file generation (GPX/KML format)
  - Mark feature as BETA in user interface
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ]* 14.1 Write property tests for route optimization
  - **Property 26: Route Address Collection**
  - **Property 27: Route Calculation via External API**
  - **Property 28: Route File Generation**
  - **Property 30: Geocoding Error Handling**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.5**

- [ ] 15. Error Handling and Logging System
  - Implement Winston logging with rotation and severity levels
  - Create error handling middleware for API and bot
  - Add critical error notifications to admin Telegram chat
  - Implement user-friendly error messages and system resilience
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ]* 15.1 Write property tests for error handling
  - **Property 35: Error Logging with Severity**
  - **Property 36: Critical Error Admin Notification**
  - **Property 37: User-Friendly Error Messages**
  - **Property 38: System Resilience to Non-Critical Errors**
  - **Validates: Requirements 9.1, 9.2, 9.4, 9.5**

- [ ] 16. Security Implementation
  - Implement SQL injection prevention with parameterized queries
  - Add API rate limiting and request sanitization
  - Set up security event logging and monitoring
  - Configure CORS, Helmet.js, and other security middleware
  - _Requirements: 8.3, 8.4, 8.5, 8.6_

- [ ]* 16.1 Write property tests for security features
  - **Property 31: SQL Injection Prevention**
  - **Property 32: API Rate Limiting**
  - **Property 33: Input Sanitization**
  - **Property 34: Security Event Logging**
  - **Validates: Requirements 8.3, 8.4, 8.5, 8.6**

- [ ] 17. Change Detection and Advanced Notifications
  - Implement shift change detection after assignments
  - Create detailed change notifications with old/new values
  - Add assignment impact analysis and route reassignment suggestions
  - Integrate with courier confirmation system
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ]* 17.1 Write property tests for change detection
  - **Property 44: Passenger Shift Change Detection**
  - **Property 45: Courier Shift Change Detection**
  - **Property 46: Change Detection Admin Notification**
  - **Property 47: Change Notification Content Completeness**
  - **Validates: Requirements 12.1, 12.2, 12.3, 12.4**

- [ ] 18. Final Integration and Testing
  - Integrate all components and test end-to-end workflows
  - Verify real-time synchronization across all interfaces
  - Test performance with concurrent users and large datasets
  - Validate all correctness properties with comprehensive test runs
  - _Requirements: All system requirements_

- [ ]* 18.1 Write integration tests
  - Test complete user registration and assignment workflows
  - Test real-time synchronization between bot and web
  - Test error recovery and system resilience
  - _Requirements: All system requirements_

- [ ] 19. Final Checkpoint - System Complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- The system uses fast-check library for property-based testing in Node.js
- All property tests must be tagged with format: **Feature: taxi-management-system, Property X: [Property Name]**