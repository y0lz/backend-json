# Requirements Document

## Introduction

A comprehensive taxi management system consisting of a Telegram bot and web interface for managing taxi assignments between couriers and passengers across different branches. The system enables daily shift registration, real-time assignment management, and automated notifications to ensure efficient coordination of transportation services.

## Glossary

- **System**: The complete taxi management platform including Telegram bot and web interface
- **Telegram_Bot**: The Telegram bot component for user interaction
- **Web_Interface**: The administrative web dashboard
- **User**: Any person registered in the system (passenger, courier, or admin)
- **Passenger**: A user who needs transportation services
- **Courier**: A user who provides transportation services with their vehicle
- **Admin**: A user with administrative privileges to manage assignments
- **Branch**: A physical location/office where users are assigned
- **Shift**: A daily work registration indicating availability and location
- **Assignment**: A pairing of courier with one or more passengers for transportation
- **Route**: An optimized path for courier to pick up assigned passengers

## Requirements

### Requirement 1: User Registration and Authentication

**User Story:** As a new user, I want to register through Telegram bot with my role and details, so that I can access the appropriate system features.

#### Acceptance Criteria

1. WHEN a new user sends /start command, THE Telegram_Bot SHALL offer role selection (Passenger/Courier/Admin)
2. WHEN a user selects Passenger role, THE Telegram_Bot SHALL collect full name, phone number, address, and branch selection
3. WHEN a user selects Courier role, THE Telegram_Bot SHALL collect full name, phone number, address, branch, car brand, car color, and license plate
4. WHEN a user selects Admin role, THE Telegram_Bot SHALL verify Telegram ID against admin configuration
5. WHEN user data is collected, THE System SHALL validate all inputs according to format requirements
6. WHEN validation passes, THE System SHALL save user data to database with unique Telegram ID
7. WHEN registration is complete, THE Telegram_Bot SHALL confirm registration and show appropriate main menu

### Requirement 2: Daily Shift Management

**User Story:** As a registered user, I want to register for daily shifts, so that I can indicate my availability and work location.

#### Acceptance Criteria

1. WHEN a user clicks "Register for Shift", THE Telegram_Bot SHALL check if user is scheduled to work today
2. IF user is not scheduled to work, THEN THE Telegram_Bot SHALL display "Good day off! No registration needed"
3. WHEN user is scheduled to work, THE Telegram_Bot SHALL request branch selection for today
4. WHEN branch is selected, THE Telegram_Bot SHALL offer address options (standard address or new address input)
5. WHEN address is provided, THE System SHALL save shift data with user ID, branch, date, and addresses
6. WHEN shift registration is complete, THE Telegram_Bot SHALL confirm registration with shift details
7. THE System SHALL maintain daily shift records for assignment purposes

### Requirement 3: Assignment Management via Web Interface

**User Story:** As an admin, I want to manage courier-passenger assignments through a web interface, so that I can efficiently coordinate transportation.

#### Acceptance Criteria

1. WHEN admin accesses web interface, THE System SHALL authenticate using JWT tokens
2. WHEN authenticated, THE Web_Interface SHALL display schedule grid with couriers and passengers by branch
3. WHEN admin clicks on assignment cell, THE Web_Interface SHALL open modal for editing assignments
4. WHEN selecting courier, THE System SHALL only show couriers working today in the same branch
5. WHEN selecting passengers, THE System SHALL only show passengers working today in the same branch
6. WHEN assignment is saved, THE System SHALL update database and trigger notifications
7. THE Web_Interface SHALL support multiple passengers assigned to one courier
8. THE System SHALL prevent assignments between users from different branches

### Requirement 4: Real-time Notifications

**User Story:** As a user, I want to receive notifications about my assignments, so that I know my transportation details.

#### Acceptance Criteria

1. WHEN a passenger is assigned to courier, THE Telegram_Bot SHALL notify passenger with courier details (name, car info, phone)
2. WHEN passengers are assigned to courier, THE Telegram_Bot SHALL notify courier with passenger list and addresses
3. WHEN assignment data changes after initial assignment, THE Telegram_Bot SHALL notify admin of the change
4. WHEN critical system errors occur, THE System SHALL send error notifications to admin chat
5. THE System SHALL format notification messages with clear structure and emojis
6. THE System SHALL deliver notifications immediately after assignment changes

### Requirement 5: Assignment Viewing

**User Story:** As a user, I want to view my current assignments, so that I can see my transportation arrangements.

#### Acceptance Criteria

1. WHEN passenger clicks "Who is driving me", THE Telegram_Bot SHALL display assigned courier information
2. WHEN courier clicks "Who am I driving", THE Telegram_Bot SHALL display list of assigned passengers with addresses
3. WHEN no assignment exists, THE Telegram_Bot SHALL display "No assignment for today"
4. THE Telegram_Bot SHALL show current date assignments only
5. THE System SHALL display real-time assignment data

### Requirement 6: Real-time Synchronization

**User Story:** As an admin, I want changes to sync between web interface and Telegram bot in real-time, so that all users have current information.

#### Acceptance Criteria

1. WHEN assignment is created via web interface, THE System SHALL immediately update bot data
2. WHEN shift data changes via bot, THE System SHALL immediately update web interface
3. WHEN user data is modified, THE System SHALL broadcast changes to all connected clients
4. THE System SHALL use WebSocket connections for real-time communication
5. THE System SHALL maintain data consistency across all interfaces
6. WHEN connection is lost, THE System SHALL automatically reconnect and sync data

### Requirement 7: Route Optimization (Beta Feature)

**User Story:** As an admin, I want to generate optimized routes for couriers, so that transportation is efficient.

#### Acceptance Criteria

1. WHEN admin clicks "Calculate Route" for assignment, THE System SHALL collect all passenger addresses
2. WHEN addresses are collected, THE System SHALL use external routing API to calculate optimal path
3. WHEN route is calculated, THE System SHALL generate downloadable route file (GPX/KML format)
4. THE System SHALL optimize route for shortest time or distance
5. THE System SHALL handle geocoding errors gracefully
6. THE System SHALL mark this feature as "BETA" in user interface

### Requirement 8: Data Validation and Security

**User Story:** As a system administrator, I want all data to be validated and secure, so that the system operates reliably.

#### Acceptance Criteria

1. WHEN user inputs data, THE System SHALL validate format according to defined schemas
2. WHEN API requests are made, THE System SHALL authenticate using JWT tokens
3. WHEN database operations occur, THE System SHALL use parameterized queries to prevent injection
4. THE System SHALL implement rate limiting on API endpoints
5. THE System SHALL sanitize all user inputs before processing
6. THE System SHALL log all security-relevant events

### Requirement 9: Error Handling and Logging

**User Story:** As a system administrator, I want comprehensive error handling and logging, so that I can monitor and maintain the system.

#### Acceptance Criteria

1. WHEN errors occur, THE System SHALL log them with appropriate severity levels
2. WHEN critical errors occur, THE System SHALL send notifications to admin Telegram chat
3. THE System SHALL rotate log files daily to manage disk space
4. WHEN user encounters error, THE System SHALL display user-friendly error messages
5. THE System SHALL continue operating despite non-critical errors
6. THE System SHALL provide detailed error context for debugging

### Requirement 10: User Profile Management

**User Story:** As a user, I want to view and edit my profile information, so that my data stays current.

#### Acceptance Criteria

1. WHEN user clicks "My Data", THE Telegram_Bot SHALL display current profile information
2. WHEN user clicks "Edit Profile", THE Telegram_Bot SHALL allow modification of changeable fields
3. WHEN profile changes are made, THE System SHALL validate new data
4. WHEN validation passes, THE System SHALL update database and confirm changes
5. THE System SHALL prevent modification of critical fields like Telegram ID
6. THE System SHALL maintain audit trail of profile changes

### Requirement 11: Web Interface Layout and Navigation

**User Story:** As an admin, I want an intuitive web interface layout, so that I can quickly access different branches and users.

#### Acceptance Criteria

1. WHEN admin logs in, THE Web_Interface SHALL display sidebar with branch list on the left
2. WHEN admin clicks on branch, THE System SHALL expand to show list of couriers for that branch
3. WHEN admin selects courier, THE System SHALL display passenger list on the right side
4. THE Web_Interface SHALL highlight currently selected branch/courier/passenger
5. THE Web_Interface SHALL provide "Schedule View" and "Employee List" buttons in header
6. WHEN admin clicks "Schedule View", THE System SHALL display AG-Grid table with assignments
7. THE Web_Interface SHALL allow collapsing/expanding branch sections

### Requirement 12: Change Detection and Notifications

**User Story:** As an admin, I want to be notified when assigned users change their data, so that I can update routes accordingly.

#### Acceptance Criteria

1. WHEN passenger changes shift data after assignment, THE System SHALL detect the change
2. WHEN courier changes shift data after assignment, THE System SHALL detect the change
3. WHEN data change is detected, THE System SHALL send notification to admin chat/account
4. THE notification SHALL include: user name, changed fields, old values, new values
5. THE notification SHALL indicate which assignments are affected
6. THE System SHALL suggest route reassignment in notification message

### Requirement 13: Courier Availability Confirmation

**User Story:** As a system, I want to confirm courier availability after assignment, so that transportation is reliable.

#### Acceptance Criteria

1. WHEN courier receives assignment notification, THE Telegram_Bot SHALL ask "Are you definitely working today?"
2. WHEN courier confirms, THE System SHALL mark assignment as confirmed
3. WHEN courier denies, THE System SHALL notify admin and mark assignment as needs_reassignment
4. THE System SHALL log courier confirmation responses
5. THE System SHALL allow courier 1 hour to respond before sending reminder

### Requirement 14: Standard Address Management

**User Story:** As a user, I want to use my standard address for shifts, so that I don't have to type it repeatedly.

#### Acceptance Criteria

1. WHEN user registers shift, THE Telegram_Bot SHALL show button "Use standard address"
2. WHEN user clicks standard address button, THE System SHALL use address from user profile
3. WHEN user enters new address, THE System SHALL ask "Save as new standard address?"
4. WHEN user confirms saving, THE System SHALL update profile with new standard address
5. THE System SHALL display current standard address in button text

## Non-Functional Requirements

### Performance
- THE System SHALL respond to user commands within 2 seconds
- THE Web_Interface SHALL load initial page within 3 seconds
- THE System SHALL support up to 1000 concurrent users

### Availability
- THE System SHALL maintain 99% uptime during business hours
- THE System SHALL automatically restart failed components

### Scalability
- THE System SHALL support at least 50 branches
- THE System SHALL handle 500 assignments per day

### Usability
- THE Telegram_Bot SHALL use clear, concise messages
- THE Web_Interface SHALL be intuitive without training

## Priority Matrix

### Must Have (P0)
- Requirements 1, 2, 3, 4, 5, 6, 8, 9

### Should Have (P1)
- Requirements 10, 11, 12, 13, 14

### Nice to Have (P2)
- Requirement 7 (Route Optimization)