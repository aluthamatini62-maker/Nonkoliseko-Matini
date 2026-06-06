# Kwano Rides Security Specification

## Data Invariants
1. **Users**: `/users/{userId}` - Only the user themselves can read/write their own profile. `role` cannot be changed by the user once set (or requires admin). `isVerified` only by admin.
2. **Drivers**: `/drivers/{userId}` - Only the user themselves can read/write their own profile. `documentsApproved` and `activationFeePaid` only by admin.
3. **Rides**: `/rides/{rideId}`
   - Create: Any signed-in user (passenger). Must set themselves as `passengerId`.
   - Read: `passengerId` or `driverId` or `admin`.
   - Update: 
     - Passenger: Can cancel (if not started) or update some fields.
     - Driver: Can accept (if status is 'requested'), update status (arrived, started, completed).
     - Admin: Full access.
   - Transitions: `requested` -> `accepted` -> `arriving` -> `started` -> `completed`.

## The Dirty Dozen Payloads (Failures)
1. User A updates `/users/UserB`.
2. User A sets `role: 'admin'` in `/users/UserA`.
3. User A sets `isVerified: true` in `/users/UserA`.
4. Driver A sets `documentsApproved: true` in `/drivers/DriverA`.
5. User A creates ride with `passengerId: 'UserB'`.
6. Driver A updates ride status from `completed` to `accepted`.
7. Unauthenticated user reads any ride.
8. Driver A updates `price` of ride they accepted.
9. User A sets `vehicleModel` to 2MB string.
10. User A updates `createdAt` to a random date.
11. Driver A accepts ride where they are also the `passengerId`.
12. User A updates a ride status to `accepted` without being a verified driver.

## Test Runner (Logic)
- Ensure PERMISSION_DENIED for all Dirty Dozen.
- Ensure PERMISSION_ALLOWED for valid flows.
